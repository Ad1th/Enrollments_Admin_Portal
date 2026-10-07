import Interviewer from "../models/Interviewer.js";
import PanelAssignment from "../models/PanelAssignment.js";
import Meet from "../models/Meet.js";

/**
 * assignPanels()
 *
 * Takes an array of candidates (each with a domain and a desired time slot)
 * and returns { assigned: [...], unmatched: [...] }.
 *
 * The algorithm is greedy:
 *   1. Group candidates by (domain + slot).
 *   2. For each group, find interviewers who are in that domain, active,
 *      not on their daily cap, and not busy/unavailable during the slot.
 *   3. Sort those interviewers by load (ascending) so the least-loaded
 *      ones get picked first.
 *   4. Try to reuse the same panel pair that just worked together in the
 *      previous slot, if both are still free — preserves panel continuity.
 *   5. Chunk the free interviewers into panels of `panelSize` (default 2)
 *      and assign one candidate per panel.
 *   6. Anyone who couldn't fit goes into `unmatched`.
 */

// ─── helpers ────────────────────────────────────────────────────────

// Check if an interviewer is blocked during the given slot
function isUnavailable(interviewer, slotStart, slotEnd) {
  if (!interviewer.unavailable || !interviewer.unavailable.length) return false;
  return interviewer.unavailable.some(
    (block) => block.start < slotEnd && block.end > slotStart
  );
}

// Count how many interviews an interviewer already has on a given day
function countForDay(assignments, email, date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return assignments.filter(
    (a) =>
      a.email === email &&
      a.startTime >= dayStart &&
      a.startTime <= dayEnd
  ).length;
}

// Group candidates by "domain|startTime" so we process one slot+domain at a time
function groupCandidates(candidates) {
  const groups = new Map();
  for (const c of candidates) {
    const key = `${c.domain}|${c.startTime.toISOString()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  return groups;
}

// ─── main algorithm ─────────────────────────────────────────────────

export async function assignPanels(candidates, panelSize = 2) {
  if (!candidates || candidates.length === 0) {
    return { assigned: [], unmatched: [] };
  }

  const assigned = [];
  const unmatched = [];

  // Pull all active interviewers once — small table, no need for per-slot queries
  const allInterviewers = await Interviewer.find({ active: true }).lean();

  // Pull ALL existing panel assignments so we can check for conflicts and
  // count daily loads without hitting the DB in a loop
  const existingAssignments = await PanelAssignment.find({}).lean();

  // Track assignments we make during this run so they don't double-book
  const newAssignments = [];

  // Track recent panels: "interviewerA|interviewerB" → last slot they worked
  // together, so we can try to reuse the pair (Rule #4: Panel continuity)
  const recentPanels = await buildRecentPanelMap();

  const groups = groupCandidates(candidates);

  for (const [key, group] of groups) {
    const [domain, slotISO] = key.split("|");
    const slotStart = new Date(slotISO);
    // Default 30-min slots — the caller can set endTime per candidate,
    // but we need a consistent window to check availability
    const slotEnd = group[0].endTime
      ? new Date(group[0].endTime)
      : new Date(slotStart.getTime() + 30 * 60 * 1000);

    // Step 1: filter to interviewers who can do this domain + slot
    const eligible = allInterviewers.filter((iv) => {
      // Must cover this domain
      if (!iv.domains.includes(domain)) return false;
      // Must not be unavailable
      if (isUnavailable(iv, slotStart, slotEnd)) return false;
      // Must not have hit their daily cap
      const dayLoad =
        countForDay(existingAssignments, iv.email, slotStart) +
        countForDay(newAssignments, iv.email, slotStart);
      if (dayLoad >= (iv.maxPerDay || 8)) return false;
      // Must not already be booked for this exact slot
      const busy =
        existingAssignments.some(
          (a) =>
            a.email === iv.email &&
            a.startTime < slotEnd &&
            a.endTime > slotStart
        ) ||
        newAssignments.some(
          (a) =>
            a.email === iv.email &&
            a.startTime < slotEnd &&
            a.endTime > slotStart
        );
      if (busy) return false;
      return true;
    });

    // Step 2: sort by load ascending (workload balance)
    const loadMap = buildLoadMap(existingAssignments, newAssignments);
    eligible.sort((a, b) => (loadMap[a.email] || 0) - (loadMap[b.email] || 0));

    // Step 3: try to form panels, reusing recent pairs when possible
    const panels = formPanels(eligible, panelSize, recentPanels, domain);

    // Step 4: assign one candidate per panel
    for (const candidate of group) {
      if (panels.length === 0) {
        unmatched.push({
          candidateId: candidate.candidateId,
          domain,
          slotStart,
          slotEnd,
          reason: "No available panel for this slot",
        });
        continue;
      }

      const panel = panels.shift();
      const panelEmails = panel.map((iv) => iv.email);

      // Record the assignment for each interviewer
      for (const email of panelEmails) {
        newAssignments.push({
          email,
          startTime: slotStart,
          endTime: slotEnd,
          user_id: candidate.candidateId,
          domain,
        });
      }

      assigned.push({
        candidateId: candidate.candidateId,
        domain,
        slotStart,
        slotEnd,
        panel: panel.map((iv) => ({
          id: iv._id,
          name: iv.name,
          email: iv.email,
        })),
      });
    }
  }

  return { assigned, unmatched, newAssignments };
}

// ─── panel formation ────────────────────────────────────────────────

/**
 * Try to reuse existing pairs first, then fill with least-loaded individuals.
 * Returns an array of panels, where each panel = array of interviewer docs.
 */
function formPanels(eligible, panelSize, recentPanels, domain) {
  if (eligible.length < panelSize) return [];

  const used = new Set();
  const panels = [];

  // Pass 1: look for pairs that recently worked together (panel continuity)
  if (panelSize === 2) {
    for (let i = 0; i < eligible.length; i++) {
      if (used.has(eligible[i].email)) continue;
      for (let j = i + 1; j < eligible.length; j++) {
        if (used.has(eligible[j].email)) continue;
        const pairKey = makePairKey(eligible[i].email, eligible[j].email);
        if (recentPanels.has(pairKey)) {
          used.add(eligible[i].email);
          used.add(eligible[j].email);
          panels.push([eligible[i], eligible[j]]);
          break; // move to next i
        }
      }
    }
  }

  // Pass 2: greedily pair up remaining eligible interviewers
  const remaining = eligible.filter((iv) => !used.has(iv.email));
  for (let i = 0; i + panelSize - 1 < remaining.length; i += panelSize) {
    const panel = remaining.slice(i, i + panelSize);
    panels.push(panel);
  }

  return panels;
}

// ─── load & pair tracking ───────────────────────────────────────────

function buildLoadMap(existingAssignments, newAssignments) {
  const map = {};
  for (const a of existingAssignments) {
    map[a.email] = (map[a.email] || 0) + 1;
  }
  for (const a of newAssignments) {
    map[a.email] = (map[a.email] || 0) + 1;
  }
  return map;
}

/**
 * Looks at recent completed/scheduled meetings to see which interviewers
 * were paired together. We key by sorted email pair so A|B === B|A.
 */
async function buildRecentPanelMap() {
  const map = new Map();
  try {
    // Only look at meetings from the last 7 days to preserve active pairings
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const meetings = await Meet.find({
      scheduledTime: { $gte: since },
      status: { $in: ["scheduled", "completed", "underway"] },
    })
      .select("intervieweremail scheduledTime")
      .lean();

    for (const m of meetings) {
      const emails = m.intervieweremail || [];
      if (emails.length < 2) continue;
      // For panels of 2, just track the pair
      for (let i = 0; i < emails.length; i++) {
        for (let j = i + 1; j < emails.length; j++) {
          const key = makePairKey(emails[i], emails[j]);
          const existing = map.get(key);
          // Keep the most recent pairing
          if (!existing || m.scheduledTime > existing) {
            map.set(key, m.scheduledTime);
          }
        }
      }
    }
  } catch (err) {
    // Non-critical — if we can't read recent pairs, just skip the optimization
    console.error("Could not build recent panel map:", err.message);
  }
  return map;
}

function makePairKey(emailA, emailB) {
  return [emailA.toLowerCase(), emailB.toLowerCase()].sort().join("|");
}
