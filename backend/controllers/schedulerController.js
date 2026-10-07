import mongoose from "mongoose";
import User from "../models/User.js";
import Meet from "../models/Meet.js";
import PanelAssignment from "../models/PanelAssignment.js";
import { assignPanels } from "../services/panelScheduler.js";

const VALID_DOMAINS = ["tech", "design", "management"];

/**
 * POST /admin/schedule-panels
 *
 * Body:
 * {
 *   domain: "tech" | "design" | "management"  (required)
 *   slots: [                                   (required, at least one)
 *     { startTime: "2025-01-15T10:00:00Z", endTime: "2025-01-15T10:30:00Z" }
 *   ],
 *   panelSize: 2,      (optional, defaults to 2)
 *   dryRun: false       (optional — if true, returns plan without saving)
 * }
 *
 * How it works:
 *   1. Find all candidates in the given domain who are at round 1 (cleared
 *      round 0, not yet interviewed) and don't already have a meeting booked.
 *   2. Spread them across the provided time slots.
 *   3. Run the panel assignment algorithm.
 *   4. Save the results (Meet + PanelAssignment docs) unless dryRun is true.
 *   5. Return the assigned panels and unmatched candidates.
 */
export const schedulePanels = async (req, res) => {
  try {
    const { domain, slots, panelSize = 2, dryRun = false } = req.body || {};

    // ── validation ──────────────────────────────────────────────────
    if (!domain || !VALID_DOMAINS.includes(domain)) {
      return res.status(400).json({
        message: `domain must be one of: ${VALID_DOMAINS.join(", ")}`,
      });
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        message: "slots array is required and cannot be empty",
      });
    }

    // Parse and validate each slot
    const parsedSlots = [];
    for (let i = 0; i < slots.length; i++) {
      const start = new Date(slots[i].startTime);
      const end = slots[i].endTime
        ? new Date(slots[i].endTime)
        : new Date(start.getTime() + 30 * 60 * 1000); // default 30-min slot

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          message: `Invalid date in slot ${i}: startTime or endTime is not a valid date`,
        });
      }
      if (end <= start) {
        return res.status(400).json({
          message: `Slot ${i}: endTime must be after startTime`,
        });
      }
      parsedSlots.push({ startTime: start, endTime: end });
    }

    // ── find eligible candidates ────────────────────────────────────
    // Round 1 in the domain means they passed task review, ready for interview.
    // We skip anyone who already has a meeting booked.
    const roundField = domain; // "tech", "design", or "management" — the User field
    const eligibleCandidates = await User.find({
      admin: { $ne: true },
      [roundField]: 1, // passed round 0, at round 1, waiting for interview
      domain: domain,
    })
      .select("_id email username regno domain")
      .lean();

    if (eligibleCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No candidates found at round 1 for this domain",
        assigned: [],
        unmatched: [],
        stats: { candidates: 0, slots: parsedSlots.length },
      });
    }

    // Filter out candidates who already have a scheduled/underway meeting
    const existingMeetings = await Meet.find({
      user_id: { $in: eligibleCandidates.map((c) => c._id) },
      status: { $in: ["scheduled", "underway"] },
    })
      .select("user_id")
      .lean();
    const bookedIds = new Set(existingMeetings.map((m) => String(m.user_id)));
    const unbookedCandidates = eligibleCandidates.filter(
      (c) => !bookedIds.has(String(c._id))
    );

    if (unbookedCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All eligible candidates already have interviews scheduled",
        assigned: [],
        unmatched: [],
        stats: {
          candidates: eligibleCandidates.length,
          alreadyBooked: bookedIds.size,
        },
      });
    }

    // ── distribute candidates across slots ──────────────────────────
    // Simple round-robin: spread them evenly across the available slots
    const candidatesForAlgo = unbookedCandidates.map((c, i) => {
      const slot = parsedSlots[i % parsedSlots.length];
      return {
        candidateId: c._id,
        domain,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };
    });

    // ── run the algorithm ───────────────────────────────────────────
    const result = await assignPanels(candidatesForAlgo, panelSize);

    // ── persist if not a dry run ────────────────────────────────────
    if (!dryRun && result.assigned.length > 0) {
      const meetDocs = [];
      const panelDocs = [];

      for (const a of result.assigned) {
        const panelEmails = a.panel.map((p) => p.email);

        meetDocs.push({
          user_id: a.candidateId,
          intervieweremail: panelEmails,
          domains: [a.domain],
          scheduledTime: a.slotStart,
          endTime: a.slotEnd,
          status: "scheduled",
          panelIncomplete: panelEmails.length < panelSize,
        });

        for (const p of a.panel) {
          panelDocs.push({
            email: p.email,
            startTime: a.slotStart,
            endTime: a.slotEnd,
            user_id: a.candidateId,
            domain: a.domain,
          });
        }
      }

      // Bulk insert — if any PanelAssignment collides (unique index),
      // ordered:false lets the rest still go through
      try {
        await Meet.insertMany(meetDocs);
      } catch (err) {
        console.error("Error saving meetings:", err.message);
        return res.status(500).json({
          message: "Failed to save some meetings. Check for duplicates.",
          error: err.message,
        });
      }

      try {
        await PanelAssignment.insertMany(panelDocs, { ordered: false });
      } catch (err) {
        // Duplicate key errors are expected if an interviewer was manually
        // assigned between dry-run and actual run — not fatal.
        if (err.code !== 11000) {
          console.error("Error saving panel assignments:", err.message);
        }
      }
    }

    // ── build a readable response ───────────────────────────────────
    // Enrich assigned results with candidate info for the admin dashboard
    const candidateMap = new Map(
      unbookedCandidates.map((c) => [String(c._id), c])
    );
    const enrichedAssigned = result.assigned.map((a) => {
      const candidate = candidateMap.get(String(a.candidateId));
      return {
        candidate: candidate
          ? {
              id: candidate._id,
              name: candidate.username,
              email: candidate.email,
              regno: candidate.regno,
            }
          : { id: a.candidateId },
        domain: a.domain,
        slotStart: a.slotStart,
        slotEnd: a.slotEnd,
        panel: a.panel,
      };
    });

    const enrichedUnmatched = result.unmatched.map((u) => {
      const candidate = candidateMap.get(String(u.candidateId));
      return {
        candidate: candidate
          ? {
              id: candidate._id,
              name: candidate.username,
              email: candidate.email,
              regno: candidate.regno,
            }
          : { id: u.candidateId },
        domain: u.domain,
        slotStart: u.slotStart,
        slotEnd: u.slotEnd,
        reason: u.reason,
      };
    });

    res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? "Dry run — nothing saved. Review and re-send with dryRun: false to confirm."
        : `Scheduled ${result.assigned.length} interview(s)`,
      stats: {
        totalEligible: eligibleCandidates.length,
        alreadyBooked: bookedIds.size,
        toSchedule: unbookedCandidates.length,
        assigned: result.assigned.length,
        unmatched: result.unmatched.length,
        slotsProvided: parsedSlots.length,
      },
      assigned: enrichedAssigned,
      unmatched: enrichedUnmatched,
    });
  } catch (error) {
    console.error("schedulePanels error:", error);
    res.status(500).json({ message: "Internal error during panel scheduling" });
  }
};
