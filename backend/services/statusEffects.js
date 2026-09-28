import Offer from "../models/Offer.js";
import { notifyUser } from "./push.js";

const DOMAIN_NAME = { tech: "Tech", design: "Design", management: "Management" };

const MESSAGE = {
  1: (d) => ({ title: `Shortlisted for the ${d} interview!`, body: "Book your interview slot in the portal." , url: "/meeting" }),
  2: (d) => ({ title: `Your ${d} result is in 🦊`, body: "Open the portal to see it.", url: "/dashboard" }),
  3: (d) => ({ title: `${d}: you've been made core`, body: "Open the portal for details.", url: "/dashboard" }),
  "-1": (d) => ({ title: `Your ${d} result is in`, body: "Open the portal to see it.", url: "/dashboard" }),
};

// Side effects of round changes: selection creates (or re-opens) an offer,
// moving off "selected" revokes a pending one, and the candidate gets a push.
// Results are deliberately vague in the notification; the portal reveals them.
export const applyStatusEffects = async (events) => {
  for (const e of events) {
    if (e.to === 2) {
      await Offer.updateOne(
        { user_id: e.user_id, domain: e.domain, status: { $in: ["revoked"] } },
        { $set: { status: "pending", sentAt: new Date(), respondedAt: null } }
      );
      await Offer.updateOne(
        { user_id: e.user_id, domain: e.domain },
        { $setOnInsert: { status: "pending", sentAt: new Date() } },
        { upsert: true }
      );
    } else if (e.from === 2) {
      await Offer.updateOne({ user_id: e.user_id, domain: e.domain, status: "pending" }, { $set: { status: "revoked" } });
    }

    const message = MESSAGE[String(e.to)];
    if (message) await notifyUser(e.user_id, message(DOMAIN_NAME[e.domain])).catch(() => 0);
  }
};
