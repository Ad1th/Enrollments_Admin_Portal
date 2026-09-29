import Submission from "../models/Submission.js";
import User from "../models/User.js";
import Question from "../models/Question.js";
import { similarPairs, clusters, sharedLinks } from "../services/similarity.js";

// GET /admin/similarity?domain=tech&minJaccard=0.45&minContainment=0.7
export const getSimilarity = async (req, res) => {
  try {
    const filter = { isDone: true };
    if (req.query.domain) filter.domain = req.query.domain;
    const minJaccard = Math.min(Math.max(Number(req.query.minJaccard) || 0.45, 0.1), 1);
    const minContainment = Math.min(Math.max(Number(req.query.minContainment) || 0.7, 0.1), 1);

    const submissions = await Submission.find(filter).select("user_id domain answers").lean();
    const byKey = new Map();
    for (const s of submissions) {
      for (const [key, text] of Object.entries(s.answers || {})) {
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push({ id: String(s.user_id), text });
      }
    }

    const pairs = [];
    for (const [key, docs] of byKey) {
      for (const p of similarPairs(docs, { minJaccard, minContainment })) pairs.push({ ...p, key });
    }
    const links = sharedLinks([...byKey.values()].flat());

    const ids = new Set([...pairs.flatMap((p) => [p.a, p.b]), ...links.flatMap((l) => l.ids)]);
    const users = await User.find({ _id: { $in: [...ids] } }).select("username regno").lean();
    const questions = await Question.find({ key: { $in: [...new Set(pairs.map((p) => p.key))] } })
      .select("key prompt subdomainLabel kind")
      .lean();

    res.json({
      success: true,
      data: {
        pairs,
        clusters: clusters(pairs),
        sharedLinks: links,
        users: Object.fromEntries(users.map((u) => [String(u._id), { name: u.username, regno: u.regno }])),
        questions: Object.fromEntries(questions.map((q) => [q.key, q])),
        scanned: { submissions: submissions.length, answers: [...byKey.values()].reduce((n, d) => n + d.length, 0) },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Similarity scan failed" });
  }
};
