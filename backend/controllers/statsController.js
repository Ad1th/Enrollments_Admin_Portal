import User from "../models/User.js";
import Submission from "../models/Submission.js";
import Offer from "../models/Offer.js";
import PanelAssignment from "../models/PanelAssignment.js";
import AiReview from "../models/AiReview.js";
import Meet from "../models/Meet.js";

const DOMAINS = ["tech", "design", "management"];
const IST = "+05:30";

// Everything the Stats page draws, computed in Mongo in one round of queries.
export const getStats = async (req, res) => {
  try {
    const candidate = { admin: { $ne: true } };
    const [
      totals,
      perDomain,
      submitted,
      subdomains,
      heatmap,
      signups,
      offers,
      load,
      aiVsOutcome,
      meetings,
    ] = await Promise.all([
      User.aggregate([
        { $match: candidate },
        {
          $group: {
            _id: null,
            registered: { $sum: 1 },
            verified: { $sum: { $cond: ["$verified", 1, 0] } },
            profileDone: { $sum: { $cond: ["$isProfileDone", 1, 0] } },
            juniors: { $sum: { $cond: ["$isJC", 1, 0] } },
            seniors: { $sum: { $cond: ["$isSC", 1, 0] } },
          },
        },
      ]),
      Promise.all(
        DOMAINS.map((d) =>
          User.aggregate([
            { $match: { ...candidate, domain: d } },
            {
              $group: {
                _id: d,
                applied: { $sum: 1 },
                shortlisted: { $sum: { $cond: [{ $gte: [`$${d}`, 1] }, 1, 0] } },
                selected: { $sum: { $cond: [{ $gte: [`$${d}`, 2] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: [`$${d}`, -1] }, 1, 0] } },
              },
            },
          ])
        )
      ),
      Submission.aggregate([{ $match: { isDone: true } }, { $group: { _id: "$domain", n: { $sum: 1 } } }]),
      // Subdomain popularity and how many of those applicants got selected.
      Submission.aggregate([
        { $match: { isDone: true } },
        { $unwind: "$subdomain" },
        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "u" } },
        { $unwind: "$u" },
        {
          $group: {
            _id: { domain: "$domain", subdomain: "$subdomain" },
            applicants: { $sum: 1 },
            selected: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      { $switch: { branches: DOMAINS.map((d) => ({ case: { $eq: ["$domain", d] }, then: `$u.${d}` })), default: 0 } },
                      2,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { applicants: -1 } },
      ]),
      // When people hit submit: weekday (1 = Sunday) x hour, in IST.
      Submission.aggregate([
        { $match: { isDone: true, submittedAt: { $ne: null } } },
        {
          $group: {
            _id: {
              day: { $dayOfWeek: { date: "$submittedAt", timezone: IST } },
              hour: { $hour: { date: "$submittedAt", timezone: IST } },
            },
            n: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        { $match: candidate },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: IST } }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Offer.aggregate([{ $group: { _id: { domain: "$domain", status: "$status" }, n: { $sum: 1 } } }]),
      PanelAssignment.aggregate([{ $group: { _id: "$email", n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
      // Does the AI's score line up with human decisions?
      AiReview.aggregate([
        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "u" } },
        { $unwind: "$u" },
        {
          $project: {
            overall: 1,
            round: { $switch: { branches: DOMAINS.map((d) => ({ case: { $eq: ["$domain", d] }, then: `$u.${d}` })), default: 0 } },
          },
        },
        {
          $group: {
            _id: { $cond: [{ $gte: ["$round", 2] }, "selected", { $cond: [{ $eq: ["$round", -1] }, "rejected", "pending"] }] },
            avg: { $avg: "$overall" },
            n: { $sum: 1 },
          },
        },
      ]),
      Meet.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);

    const submittedBy = Object.fromEntries(submitted.map((s) => [s._id, s.n]));
    const offersBy = {};
    for (const o of offers) (offersBy[o._id.domain] ||= {})[o._id.status] = o.n;

    res.json({
      success: true,
      data: {
        totals: totals[0] || { registered: 0, verified: 0, profileDone: 0, juniors: 0, seniors: 0 },
        funnel: perDomain.map((rows, i) => {
          const r = rows[0] || { applied: 0, shortlisted: 0, selected: 0, rejected: 0 };
          const d = DOMAINS[i];
          return {
            domain: d,
            applied: r.applied,
            submitted: submittedBy[d] || 0,
            shortlisted: r.shortlisted,
            selected: r.selected,
            accepted: offersBy[d]?.accepted || 0,
            rejected: r.rejected,
          };
        }),
        subdomains: subdomains.map((s) => ({ domain: s._id.domain, subdomain: s._id.subdomain, applicants: s.applicants, selected: s.selected })),
        heatmap: heatmap.map((h) => ({ day: h._id.day, hour: h._id.hour, n: h.n })),
        signups: signups.map((s) => ({ date: s._id, n: s.n })),
        offers: offersBy,
        interviewerLoad: load.map((l) => ({ email: l._id, n: l.n })),
        aiVsOutcome: aiVsOutcome.map((a) => ({ outcome: a._id, avg: +a.avg.toFixed(2), n: a.n })),
        meetings: Object.fromEntries(meetings.map((m) => [m._id, m.n])),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not compute stats" });
  }
};
