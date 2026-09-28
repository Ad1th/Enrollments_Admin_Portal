import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let configured = null;
const ready = () => {
  if (configured !== null) return configured;
  configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  if (configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:mfc@example.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
  return configured;
};

// Same behaviour as the candidate backend's notifyUser: fan out to every
// browser the candidate subscribed from, drop endpoints that are gone.
export const notifyUser = async (userId, payload) => {
  if (!ready()) return 0;
  const subs = await PushSubscription.find({ user_id: userId }).lean();
  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 86400 });
        delivered++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id });
      }
    })
  );
  return delivered;
};
