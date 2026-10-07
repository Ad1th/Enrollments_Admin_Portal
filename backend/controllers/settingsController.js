import Setting from "../models/Setting.js";
import Offer from "../models/Offer.js";
import mongoose from "mongoose";

const LINK_KEYS = ["whatsapp", "discord", "notion", "calendar", "other"];
const GROUPS = ["all", "tech", "design", "management"];

// Onboarding links shown to candidates after they accept an offer.
// Shape: { all: { whatsapp, ... }, tech: { discord, ... }, ... }; per-domain
// values override "all".
export const getOnboarding = async (req, res) => {
  const setting = await Setting.findOne({ key: "onboarding" }).lean();
  res.json({ success: true, data: setting?.value || {} });
};

export const saveOnboarding = async (req, res) => {
  const value = {};
  for (const group of GROUPS) {
    const groupData = req.body?.[group] || {};
    value[group] = {};
    for (const key of LINK_KEYS) {
      const url = String(groupData[key] || "").trim();
      if (!url) continue;
      if (!/^https?:\/\//.test(url)) return res.status(400).json({ message: `${group}.${key} must be a valid http/https link` });
      value[group][key] = url;
    }
    // Support custom links: array of { label: string, url: string }
    if (Array.isArray(groupData.custom)) {
      value[group].custom = groupData.custom
        .filter((c) => c && typeof c === "object" && c.label && c.url)
        .map((c) => ({
          label: String(c.label).trim().slice(0, 50),
          url: String(c.url).trim(),
        }))
        .filter((c) => /^https?:\/\//.test(c.url));
    }
  }
  await Setting.updateOne({ key: "onboarding" }, { $set: { value } }, { upsert: true });
  res.json({ success: true, data: value });
};


// GET /admin/offers?userId= (or all), for the modal and the stats page.
export const listOffers = async (req, res) => {
  const filter = {};
  if (req.query.userId) {
    if (!mongoose.isValidObjectId(req.query.userId)) return res.status(400).json({ message: "Invalid userId" });
    filter.user_id = req.query.userId;
  }
  const offers = await Offer.find(filter).sort({ sentAt: -1 }).lean();
  res.json({ success: true, data: offers });
};
