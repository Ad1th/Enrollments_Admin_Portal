import mongoose from "mongoose";
import Meet from "../models/Meet.js";
import PanelAssignment from "../models/PanelAssignment.js";
import User from "../models/User.js";
import InterviewSlot from "../models/InterviewSlot.js";
import { setEventAttendees } from "../services/googleCalendar.js";

const STATUSES = ["scheduled", "underway", "completed", "cancelled", "no-show"];

// GET /admin/meetings?from=&to= -> interviews with candidate and panel.
export const listMeetings = async (req, res) => {
  const range = {};
  if (req.query.from) range.$gte = new Date(req.query.from);
  if (req.query.to) range.$lt = new Date(req.query.to);
  const meetings = await Meet.find(Object.keys(range).length ? { scheduledTime: range } : {})
    .sort({ scheduledTime: 1 })
    .lean();
  const users = await User.find({ _id: { $in: meetings.map((m) => m.user_id) } })
    .select("username regno email domain tech design management")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({ success: true, data: meetings.map((m) => ({ ...m, candidate: byId.get(String(m.user_id)) || null })) });
};

// PATCH { status?, panel?: [emails] }. Panel changes keep PanelAssignment in
// sync (so auto-assignment knows who's busy) and update the Calendar invite.
export const updateMeeting = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  const meeting = await Meet.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });

  const { status, panel } = req.body || {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Unknown status" });
    meeting.status = status;
  }

  let calendar = null;
  if (Array.isArray(panel)) {
    const next = [...new Set(panel.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
    const prev = (meeting.intervieweremail || []).map((e) => e.toLowerCase());
    const added = next.filter((e) => !prev.includes(e));
    const removed = prev.filter((e) => !next.includes(e));

    for (const email of added) {
      try {
        await PanelAssignment.create({
          email,
          startTime: meeting.scheduledTime,
          endTime: meeting.endTime,
          user_id: meeting.user_id,
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        // Roll back what we added in this request before refusing.
        await PanelAssignment.deleteMany({
          email: { $in: added.slice(0, added.indexOf(email)) },
          startTime: meeting.scheduledTime,
          user_id: meeting.user_id,
        });
        return res.status(409).json({ message: `${email} is already on another panel at this time` });
      }
    }
    await PanelAssignment.deleteMany({ email: { $in: removed }, startTime: meeting.scheduledTime, user_id: meeting.user_id });
    meeting.intervieweremail = next;
    meeting.panelIncomplete = next.length === 0;

    const candidate = await User.findById(meeting.user_id).select("email").lean();
    calendar = await setEventAttendees(meeting.googleEventId, [candidate?.email, ...next].filter(Boolean));
  }

  await meeting.save();
  res.json({ success: true, data: meeting, calendar });
};

// GET /admin/interview-slots?date=
export const getInterviewSlots = async (req, res) => {
  const query = {};
  if (req.query.date) query.date = req.query.date;
  if (req.query.domain) query.domains = req.query.domain;
  
  const slots = await InterviewSlot.find(query).sort({ startTime: 1 }).lean();
  res.json({ success: true, data: slots });
};

// POST /admin/interview-slots
// Accepts: { startDate/date, endDate, startTime: "HH:mm", endTime: "HH:mm", durationMinutes: 30, domains: [...], maxCapacity: 1 }
export const createInterviewSlots = async (req, res) => {
  try {
    const {
      date,
      startDate = date,
      endDate,
      startTime,
      endTime,
      durationMinutes = 30,
      domains,
      maxCapacity = 1,
    } = req.body || {};

    const resolvedEndDate = endDate || startDate || date;

    if (!startDate || !startTime || !endTime) {
      return res.status(400).json({ message: "Start date, start time, and end time are required" });
    }

    const durationMs = (Number(durationMinutes) || 30) * 60 * 1000;
    if (durationMs <= 0) {
      return res.status(400).json({ message: "Duration must be greater than 0" });
    }

    // Validate startTime / endTime format (must be HH:mm)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return res.status(400).json({ message: "Times must be in HH:mm format" });
    }

    // Generate list of date strings (YYYY-MM-DD) between startDate and endDate
    const sDate = new Date(`${startDate}T00:00:00`);
    const eDate = new Date(`${resolvedEndDate}T00:00:00`);

    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || eDate < sDate) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const dateList = [];
    let currDate = new Date(sDate);
    while (currDate <= eDate) {
      dateList.push(currDate.toISOString().split("T")[0]);
      currDate.setDate(currDate.getDate() + 1);
    }

    const resolvedDomains = Array.isArray(domains) && domains.length
      ? domains
      : ["tech", "design", "management"];

    // Find the highest existing slotNumber so all new slots have unique sequential numbers
    const lastSlot = await InterviewSlot.findOne({ slotNumber: { $ne: null } })
      .sort({ slotNumber: -1 })
      .select("slotNumber")
      .lean();
    let nextSlotNumber = (lastSlot && typeof lastSlot.slotNumber === "number") ? lastSlot.slotNumber + 1 : 1;

    const createdSlots = [];

    for (const d of dateList) {
      let start = new Date(`${d}T${startTime}:00`);
      let end = new Date(`${d}T${endTime}:00`);

      // If end <= start, the session crosses midnight (e.g. 22:00 → 01:00 next day)
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        continue;
      }

      let current = new Date(start);
      while (current.getTime() + durationMs <= end.getTime()) {
        const slotEnd = new Date(current.getTime() + durationMs);
        createdSlots.push({
          slotNumber: nextSlotNumber++,
          date: d,
          startTime: new Date(current),
          endTime: slotEnd,
          durationMinutes: Number(durationMinutes) || 30,
          domains: resolvedDomains,
          maxCapacity: Number(maxCapacity) || 1,
          bookedCount: 0,
          isActive: true,
        });
        current = slotEnd;
      }
    }

    if (createdSlots.length === 0) {
      return res.status(400).json({ message: "No slots could be generated with the given duration and time range" });
    }

    const inserted = await InterviewSlot.insertMany(createdSlots);
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (err) {
    console.error("createInterviewSlots error:", err);
    res.status(500).json({ message: err.message || "Failed to create interview slots" });
  }
};


// DELETE /admin/interview-slots/:id
export const deleteInterviewSlot = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  const slot = await InterviewSlot.findById(req.params.id);
  if (!slot) return res.status(404).json({ message: "Slot not found" });

  if (slot.bookedCount > 0) {
    return res.status(400).json({ message: "Cannot delete slot that has bookings" });
  }

  await slot.deleteOne();
  res.json({ success: true, message: "Slot deleted" });
};

// POST /admin/meetings/schedule
// Manual direct scheduling for a candidate
export const scheduleInterview = async (req, res) => {
  const { user_id, scheduledTime, endTime, domains = [], intervieweremail = [], gmeetLink } = req.body || {};
  if (!user_id || !scheduledTime || !endTime) {
    return res.status(400).json({ message: "Candidate (user_id), start time, and end time are required" });
  }

  if (!mongoose.isValidObjectId(user_id)) {
    return res.status(400).json({ message: "Invalid user_id" });
  }

  const candidate = await User.findById(user_id);
  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  const meeting = await Meet.create({
    user_id,
    scheduledTime: new Date(scheduledTime),
    endTime: new Date(endTime),
    domains: Array.isArray(domains) && domains.length ? domains : candidate.domain || [],
    intervieweremail: Array.isArray(intervieweremail) ? intervieweremail : [],
    panelIncomplete: !intervieweremail || intervieweremail.length === 0,
    gmeetLink: gmeetLink || "https://meet.google.com/new",
    status: "scheduled",
  });

  // Check if there is a matching InterviewSlot to increment bookedCount
  await InterviewSlot.updateOne(
    {
      startTime: { $lte: new Date(scheduledTime) },
      endTime: { $gte: new Date(endTime) },
    },
    { $inc: { bookedCount: 1 } }
  );

  res.status(201).json({ success: true, data: meeting });
};

