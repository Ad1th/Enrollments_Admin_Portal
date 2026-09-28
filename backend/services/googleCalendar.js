import User from "../models/User.js";

// Plain REST instead of the googleapis SDK to keep the serverless bundle
// small. Uses the refresh token the candidate backend stored for the admin who
// connected Google Calendar.
const accessToken = async () => {
  const admin = await User.findOne({ admin: true, googleRefreshToken: { $ne: null } })
    .select("+googleRefreshToken googleRefreshToken")
    .lean();
  if (!admin?.googleRefreshToken || !process.env.GOOGLE_CLIENT_ID) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: admin.googleRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => ({}));
  return data.access_token || null;
};

// Replaces an event's attendee list and emails everyone about the change.
export const setEventAttendees = async (eventId, emails) => {
  if (!eventId) return { ok: false, reason: "no event" };
  const token = await accessToken();
  if (!token) return { ok: false, reason: "Google Calendar not connected for the admin backend" };
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ attendees: emails.map((email) => ({ email })) }),
    }
  );
  return res.ok ? { ok: true } : { ok: false, reason: `Google returned ${res.status}` };
};
