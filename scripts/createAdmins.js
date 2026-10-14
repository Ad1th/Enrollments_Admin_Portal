// Creates or updates admin-portal accounts from a CSV and writes the generated
// passwords to a separate CSV. Dry run unless --apply. Never prints passwords.
//
//   node scripts/createAdmins.js people.csv                 (dry run)
//   node scripts/createAdmins.js people.csv --apply --out creds.csv
//
// people.csv: role,name,email   (role = owner | full | viewer; no header row)
// Existing accounts keep their password unless --reset-passwords is given.
import fs from "fs";
import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../backend/models/User.js";

dotenv.config();
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--apply");
const reset = args.includes("--reset-passwords");
const outIdx = args.indexOf("--out");
const out = outIdx >= 0 ? args[outIdx + 1] : null;
if (!file || (apply && !out)) {
  console.error("usage: node scripts/createAdmins.js people.csv [--apply --out creds.csv] [--reset-passwords]");
  process.exit(1);
}

const ROLES = new Set(["owner", "full", "viewer"]);
const people = fs
  .readFileSync(file, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [role, name, email] = l.split(",").map((s) => s.trim());
    return { role, name, email: (email || "").toLowerCase() };
  });
const bad = people.filter((p) => !ROLES.has(p.role) || !p.name || !/^\S+@\S+\.\S+$/.test(p.email));
if (bad.length) {
  console.error("Bad rows:", bad);
  process.exit(1);
}
if (new Set(people.map((p) => p.email)).size !== people.length) {
  console.error("Duplicate emails in the CSV");
  process.exit(1);
}

// 16 chars, no look-alike characters.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const makePassword = () => Array.from(crypto.randomBytes(16), (b) => ALPHABET[b % ALPHABET.length]).join("");

await mongoose.connect(process.env.CONNECT_STRING);
const creds = [];
const tally = { created: 0, updated: 0 };
for (const p of people) {
  const existing = await User.findOne({ email: p.email }).select("_id password");
  const setPassword = !existing || !existing.password || reset;
  const password = setPassword ? makePassword() : null;
  existing ? tally.updated++ : tally.created++;
  console.log(`${apply ? "" : "[dry run] "}${existing ? "update" : "create"} ${p.role.padEnd(6)} ${p.email}${setPassword ? "" : " (password kept)"}`);
  if (!apply) continue;
  const fields = { admin: true, role: p.role };
  if (setPassword) fields.password = await bcrypt.hash(password, 10);
  await User.updateOne(
    { email: p.email },
    {
      $set: fields,
      $setOnInsert: { username: p.name, email: p.email, verified: true, isProfileDone: true, tech: 0, design: 0, management: 0, isCore: false },
    },
    { upsert: true }
  );
  if (password) creds.push(`${p.role},${p.name},${p.email},${password}`);
}
if (apply && creds.length) fs.writeFileSync(out, `role,name,email,password\n${creds.join("\n")}\n`, { mode: 0o600 });
console.log(`${apply ? "" : "[dry run] "}${tally.created} new, ${tally.updated} updated${apply && creds.length ? `; passwords written to ${out}` : ""}`);
await mongoose.disconnect();
