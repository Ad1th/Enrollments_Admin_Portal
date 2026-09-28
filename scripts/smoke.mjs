// Admin backend smoke test. Needs a LOCAL Mongo holding a migrated copy of the
// data (see the candidate backend: seedQuestions.js + migrateSubmissions.js).
//   SMOKE_MONGO=mongodb://127.0.0.1:27099/mfc_migrate node scripts/smoke.mjs
process.env.CONNECT_STRING = process.env.SMOKE_MONGO || "mongodb://127.0.0.1:27099/mfc_migrate";
if (!/127\.0\.0\.1|localhost/.test(process.env.CONNECT_STRING)) throw new Error("smoke test only runs against a local Mongo");
process.env.ACCESS_TOKEN_SECERT = "smoke-secret";
process.env.VERCEL = "1"; // don't listen, we mount the app ourselves
// Fake OpenAI-compatible LLM so the AI reviewer can be tested offline.
const http = await import("node:http");
let lastPrompt = "";
const fakeLlm = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    lastPrompt = JSON.parse(body).messages[1].content;
    const reply = { overall: 42, confidence: "sure", summary: "x".repeat(900), flags: ["prompt_injection", "made_up_flag"], perQuestion: [{ key: "not-a-question", score: 9 }], strengths: ["clear"], concerns: [] };
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: "```json\n" + JSON.stringify(reply) + "\n```" } }] }));
  });
}).listen(5097);
process.env.LLM_BASE_URL = "http://127.0.0.1:5097";
process.env.LLM_API_KEY = "test";
const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const { default: app } = await import(root + "/backend/server.js");
const mongoose = (await import(root + "/node_modules/mongoose/index.js")).default;
const bcrypt = (await import(root + "/node_modules/bcrypt/bcrypt.js")).default;
const server = app.listen(5098);
const U = "http://127.0.0.1:5098";
let fails = 0;
const expect = (n, c, x) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`, c ? "" : JSON.stringify(x)?.slice(0, 300)); if (!c) fails++; };
const call = async (m, p, { token, body } = {}) => { const r = await fetch(U + p, { method: m, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); let d = null; try { d = await r.json(); } catch {} return { status: r.status, data: d }; };
await call("GET", "/health");
const Users = mongoose.connection.db.collection("users");
await Users.deleteMany({ email: { $in: ["admin@smoke.in", "cand@smoke.in"] } });
await Users.insertOne({ username: "Smoke Admin", email: "admin@smoke.in", regno: "ADMSMOKE", password: await bcrypt.hash("pw", 4), admin: true, verified: true, tech: 0, design: 0, management: 0, isCore: false, isProfileDone: true });
await Users.insertOne({ username: "Smoke Cand", email: "cand@smoke.in", regno: "CANDSMOKE", password: await bcrypt.hash("pw", 4), admin: false, verified: true, tech: 0, design: 0, management: 0, isCore: false, isProfileDone: true });
let r = await call("POST", "/auth/login", { body: { email: "cand@smoke.in", password: "pw" } });
expect("non-admin cannot log in", r.status === 401 && r.data.message === "Invalid credentials", r);
r = await call("POST", "/auth/login", { body: { email: "nobody@smoke.in", password: "pw" } });
expect("unknown email gives same error", r.status === 401 && r.data.message === "Invalid credentials", r);
r = await call("POST", "/auth/login", { body: { email: "admin@smoke.in", password: "pw" } });
expect("admin login", r.status === 200 && r.data.accessToken, r);
const tok = r.data.accessToken;
r = await call("GET", "/admin/users/x");
expect("users needs auth", r.status === 401);
r = await call("GET", "/admin/users/x", { token: tok });
const withTasks = r.data.data.filter((u) => u.techTasks.length || u.designTasks.length || u.managementTasks.length);
expect("lists candidates with submissions", r.status === 200 && withTasks.length > 0, { n: withTasks.length });
expect("no password hashes leak", r.data.data.every((u) => !u.password && !u.refreshToken));
expect("admins excluded from list", !r.data.data.some((u) => u.admin));
const sample = withTasks.find((u) => u.managementTasks[0]?.isDone);
expect("answers are keyed objects", sample && Object.keys(sample.managementTasks[0].answers).every((k) => k.startsWith("management-")), sample?.managementTasks[0]);
r = await call("GET", "/admin/usersmanagement/x", { token: tok });
expect("domain list filters", r.data.data.every((u) => u.domain.includes("management")));
r = await call("GET", "/admin/subdomain-status", { token: tok });
expect("subdomain status", r.status === 200 && Object.keys(r.data.management).length > 0, r.data);
r = await call("PUT", "/admin/updatestatus/update", { token: tok, body: { regno: "CANDSMOKE", tech: 1, note: "good" } });
expect("status update logs event", r.status === 200 && r.data.events.length === 1 && r.data.events[0].actor === "admin@smoke.in", r.data);
r = await call("PUT", "/admin/updatestatus/update", { token: tok, body: { regno: "CANDSMOKE", tech: 9 } });
expect("bad round rejected", r.status === 400);
const cand = await Users.findOne({ email: "cand@smoke.in" });
r = await call("GET", `/admin/history/${cand._id}`, { token: tok });
expect("history returns events", r.data.data.length === 1 && r.data.data[0].to === 1, r.data);
r = await call("GET", "/admin/questions", { token: tok });
expect("questions include rubric field and inactive ones", r.data.data.length === 64 && "rubric" in r.data.data[0], r.data.data.length);
r = await call("PATCH", "/admin/questions/tech-ml-1", { token: tok, body: { rubric: "Mentions labelled vs unlabelled data", prompt: "hacked" } });
expect("rubric editable, prompt not", r.data.data.rubric.startsWith("Mentions") && r.data.data.prompt !== "hacked", r.data);
// review tools
const withAnswers = await mongoose.connection.db.collection("submissions").findOne({ domain: "tech", isDone: true });
r = await call("POST", "/admin/ai-review", { token: tok, body: { userId: String(withAnswers.user_id), domain: "tech" } });
expect("AI review normalises model output", r.status === 200 && r.data.data.overall === 10 && r.data.data.confidence === "low" && r.data.data.summary.length === 500 && r.data.data.flags.join() === "prompt_injection" && r.data.data.perQuestion.length === 0, r.data);
expect("answers sent as delimited untrusted data", lastPrompt.includes("<answer>") && lastPrompt.includes("Rubric:"), lastPrompt.slice(0, 200));
r = await call("POST", "/admin/ai-review", { token: tok, body: { userId: String(withAnswers.user_id), domain: "tech" } });
expect("AI review cached while answers unchanged", r.data.cached === true, r.data.cached);
r = await call("GET", "/admin/similarity?domain=tech", { token: tok });
expect("similarity scan runs", r.status === 200 && r.data.data.scanned.answers > 0, r.data?.data?.scanned);
r = await call("PUT", "/admin/reviews", { token: tok, body: { userId: String(cand._id), domain: "tech", score: 4 } });
expect("reviewer score saved under the admin's email", r.status === 200 && r.data.data.reviewer === "admin@smoke.in" && r.data.data.score === 4, r.data);
r = await call("PUT", "/admin/reviews", { token: tok, body: { userId: String(cand._id), domain: "tech", score: 9 } });
expect("score must be 1-5", r.status === 400);
r = await call("GET", "/admin/reviews", { token: tok });
expect("review means listed", r.data.data.some((x) => String(x.user_id) === String(cand._id) && x.mean === 4), r.data);
r = await call("GET", "/admin/repo-report?url=https://example.com/nope", { token: tok });
expect("repo report rejects non-GitHub urls", r.status === 400);
await mongoose.connection.db.collection("reviews").deleteMany({ user_id: cand._id });
await mongoose.connection.db.collection("aireviews").deleteMany({ user_id: withAnswers.user_id });
fakeLlm.close();

// ops: interviewers
const db = mongoose.connection.db;
await db.collection("interviewers").deleteMany({ email: /@smoke\.in$/ });
r = await call("POST", "/admin/interviewers/import", { token: tok, body: { text: "Iv One, iv1@smoke.in, tech design, frontend\nbad line\nIv Two, iv2@smoke.in, management" } });
expect("interviewer bulk import", r.data.data.added === 2 && r.data.data.skipped.length === 1, r.data);
r = await call("POST", "/admin/interviewers", { token: tok, body: { name: "Dup", email: "iv1@smoke.in" } });
expect("duplicate interviewer refused", r.status === 409, r.status);
r = await call("GET", "/admin/interviewers", { token: tok });
const iv1 = r.data.data.find((i) => i.email === "iv1@smoke.in");
expect("interviewers listed with load", iv1 && iv1.domains.join() === "tech,design" && iv1.load.total === 0, iv1);

// ops: meetings + panel edit
const start = new Date(Date.now() + 3 * 864e5);
const meet = await db.collection("meetdetails").insertOne({ user_id: cand._id, scheduledTime: start, endTime: new Date(+start + 12e5), intervieweremail: [], status: "scheduled" });
await db.collection("panelassignments").insertOne({ email: "iv2@smoke.in", startTime: start, endTime: new Date(+start + 12e5), user_id: new mongoose.Types.ObjectId() });
r = await call("PATCH", `/admin/meetings/${meet.insertedId}`, { token: tok, body: { panel: ["iv1@smoke.in", "iv2@smoke.in"] } });
expect("panel edit refuses a busy interviewer and rolls back", r.status === 409 && (await db.collection("panelassignments").countDocuments({ email: "iv1@smoke.in", startTime: start })) === 0, r.data);
r = await call("PATCH", `/admin/meetings/${meet.insertedId}`, { token: tok, body: { panel: ["iv1@smoke.in"], status: "no-show" } });
expect("panel edit + no-show", r.status === 200 && r.data.data.status === "no-show" && (await db.collection("panelassignments").countDocuments({ email: "iv1@smoke.in", startTime: start })) === 1, r.data);
r = await call("GET", "/admin/meetings", { token: tok });
expect("meetings list joins candidate", r.data.data.some((m) => m.candidate?.regno === "CANDSMOKE"), r.status);

// ops: onboarding + offers
r = await call("PUT", "/admin/settings/onboarding", { token: tok, body: { all: { whatsapp: "http://insecure" } } });
expect("onboarding links must be https", r.status === 400);
r = await call("PUT", "/admin/settings/onboarding", { token: tok, body: { all: { whatsapp: "https://chat.whatsapp.com/abc" }, tech: { discord: "https://discord.gg/x" } } });
expect("onboarding links saved", r.data.data.tech.discord === "https://discord.gg/x", r.data);
await Users.updateOne({ _id: cand._id }, { $set: { domain: ["tech"] } });
r = await call("PUT", "/admin/updatestatus/update", { token: tok, body: { regno: "CANDSMOKE", tech: 2 } });
let offer = await db.collection("offers").findOne({ user_id: cand._id, domain: "tech" });
expect("selecting creates a pending offer", offer?.status === "pending", offer);
r = await call("PUT", "/admin/updatestatus/update", { token: tok, body: { regno: "CANDSMOKE", tech: 1 } });
offer = await db.collection("offers").findOne({ user_id: cand._id, domain: "tech" });
expect("demoting revokes the pending offer", offer?.status === "revoked", offer);
r = await call("PUT", "/admin/updatestatus/update", { token: tok, body: { regno: "CANDSMOKE", tech: 2 } });
offer = await db.collection("offers").findOne({ user_id: cand._id, domain: "tech" });
expect("re-selecting re-opens it", offer?.status === "pending", offer);

// ops: comms
r = await call("POST", "/admin/comms/audience", { token: tok, body: { filter: { domain: "tech", rounds: [2] }, subject: "Hi {{firstName}}", body: "Welcome {{name}} ({{regno}})" } });
expect("audience filter by round", r.data.data.count >= 1 && r.data.data.sample.some((u) => u.regno === "CANDSMOKE"), r.data);
r = await call("POST", "/admin/comms/audience", { token: tok, body: { filter: { domain: "tech", offer: "pending" } } });
expect("audience filter by offer", r.data.data.sample.some((u) => u.regno === "CANDSMOKE"), r.data);
r = await call("POST", "/admin/comms/templates", { token: tok, body: { name: "Welcome", subject: "Hi {{firstName}}", body: "Welcome {{name}}" } });
expect("template saved", r.data.data.name === "Welcome", r.data);
const tplId = r.data.data._id;
r = await call("POST", "/admin/comms/campaigns", { token: tok, body: { name: "Smoke", subject: "Hi", body: "Hello {{name}}", filter: { domain: "tech", rounds: [2] } } });
expect("campaign freezes recipients", r.status === 201 && r.data.data.total >= 1, r.data);
const campId = r.data.data._id;
const logsQueued = await db.collection("emaillogs").countDocuments({ campaign_id: new mongoose.Types.ObjectId(campId), status: "queued" });
expect("one queued log per recipient", logsQueued === r.data.data.total, logsQueued);
const log = await db.collection("emaillogs").findOne({ campaign_id: new mongoose.Types.ObjectId(campId) });
const pixel = await fetch(`${U}/t/${log._id}.gif`);
expect("tracking pixel is public and a gif", pixel.status === 200 && pixel.headers.get("content-type") === "image/gif");
expect("open recorded", (await db.collection("emaillogs").findOne({ _id: log._id })).openedAt !== null);
r = await call("GET", "/admin/comms/campaigns", { token: tok });
expect("campaign stats count opens", r.data.data.find((c) => c._id === campId)?.stats.opened === 1, r.data.data[0]?.stats);
r = await call("GET", "/admin/stats", { token: tok });
expect("stats endpoint", r.status === 200 && r.data.data.funnel.length === 3 && r.data.data.totals.registered > 0, r.data);
await db.collection("campaigns").deleteOne({ _id: new mongoose.Types.ObjectId(campId) });
await db.collection("emaillogs").deleteMany({ campaign_id: new mongoose.Types.ObjectId(campId) });
await db.collection("emailtemplates").deleteOne({ _id: new mongoose.Types.ObjectId(tplId) });
await db.collection("offers").deleteMany({ user_id: cand._id });
await db.collection("meetdetails").deleteOne({ _id: meet.insertedId });
await db.collection("panelassignments").deleteMany({ startTime: start });
await db.collection("interviewers").deleteMany({ email: /@smoke\.in$/ });
await db.collection("settings").deleteOne({ key: "onboarding" });

await Users.updateOne({ email: "admin@smoke.in" }, { $set: { admin: false } });
r = await call("GET", "/admin/users/x", { token: tok });
expect("revoked admin locked out immediately", r.status === 403, r.status);
await Users.deleteMany({ email: { $in: ["admin@smoke.in", "cand@smoke.in"] } });
await mongoose.connection.db.collection("statusevents").deleteMany({ user_id: cand._id });
console.log(fails ? `${fails} FAILED` : "ALL PASS");
server.close(); await mongoose.disconnect(); process.exit(fails ? 1 : 0);
