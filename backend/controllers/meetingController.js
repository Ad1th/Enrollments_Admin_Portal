import mongoose from "mongoose";
import Meet from "../models/Meet.js";
import PanelAssignment from "../models/PanelAssignment.js";
import User from "../models/User.js";
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
