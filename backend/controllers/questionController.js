import Question from "../models/Question.js";
import Submission from "../models/Submission.js";

const VALID_DOMAINS = ["tech", "design", "management"];
const VALID_AUDIENCES = ["all", "junior", "senior"];
const VALID_KINDS = ["long", "portfolio"];

// All fields an admin may set when creating or updating a task.
const EDITABLE = [
  "title",
  "prompt",
  "helper",
  "resources",
  "subdomain",
  "subdomainLabel",
  "audience",
  "kind",
  "order",
  "maxWords",
  "rubric",
  "active",
];

// Build a slug key from domain + subdomain + title, e.g. "tech-frontend-my-task".
const makeKey = (domain, subdomain, title) => {
  const base = [domain, subdomain, title]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base;
};

// List all questions. Supports ?domain= filter. Returns rubrics (admin-only).
export const listQuestions = async (req, res) => {
  try {
    const filter = req.query.domain ? { domain: req.query.domain } : {};
    const questions = await Question.find(filter)
      .sort({ domain: 1, order: 1, audience: 1 })
      .lean();
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching questions" });
  }
};

// Create a new question/task. Generates a stable key from domain+subdomain+title.
export const createQuestion = async (req, res) => {
  try {
    const { domain, prompt, title } = req.body;

    if (!domain) return res.status(400).json({ message: "domain is required" });
    if (!VALID_DOMAINS.includes(domain))
      return res.status(400).json({ message: `domain must be one of: ${VALID_DOMAINS.join(", ")}` });
    if (!prompt || !prompt.trim())
      return res.status(400).json({ message: "prompt is required" });

    const audience = req.body.audience || "all";
    if (!VALID_AUDIENCES.includes(audience))
      return res.status(400).json({ message: `audience must be one of: ${VALID_AUDIENCES.join(", ")}` });

    const kind = req.body.kind || "long";
    if (!VALID_KINDS.includes(kind))
      return res.status(400).json({ message: `kind must be one of: ${VALID_KINDS.join(", ")}` });

    // Generate a key; if it collides append a suffix.
    let key = makeKey(domain, req.body.subdomain, title || prompt);
    const collision = await Question.exists({ key });
    if (collision) {
      key = `${key}-${Date.now()}`;
    }

    const doc = new Question({
      key,
      domain,
      subdomain: req.body.subdomain || null,
      subdomainLabel: req.body.subdomainLabel || null,
      audience,
      kind,
      title: title || "",
      prompt: prompt.trim(),
      helper: req.body.helper || "",
      resources: Array.isArray(req.body.resources) ? req.body.resources.filter(Boolean) : [],
      order: req.body.order ?? 0,
      maxWords: req.body.maxWords ?? 2000,
      rubric: req.body.rubric || "",
      active: req.body.active !== false,
    });

    await doc.save();
    res.status(201).json({ success: true, data: doc.toObject() });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "A question with this key already exists" });
    }
    res.status(500).json({ message: "Error creating question" });
  }
};

// Update a question. All task fields (not just rubric) are editable by admins.
// The key and domain are stable identifiers and cannot be changed here.
export const updateQuestion = async (req, res) => {
  try {
    const update = {};
    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    // Validate enum fields if provided.
    if (update.audience && !VALID_AUDIENCES.includes(update.audience)) {
      return res.status(400).json({ message: `audience must be one of: ${VALID_AUDIENCES.join(", ")}` });
    }
    if (update.kind && !VALID_KINDS.includes(update.kind)) {
      return res.status(400).json({ message: `kind must be one of: ${VALID_KINDS.join(", ")}` });
    }

    const question = await Question.findOneAndUpdate(
      { key: req.params.key },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!question) return res.status(404).json({ message: "Question not found" });
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating question" });
  }
};

// Delete a question. Checks whether any submissions reference this key first.
// If submissions exist the delete is blocked to protect historical data.
export const deleteQuestion = async (req, res) => {
  try {
    const { key } = req.params;

    const question = await Question.findOne({ key }).lean();
    if (!question) return res.status(404).json({ message: "Question not found" });

    // Count submissions that contain an answer for this question key.
    const submissionCount = await Submission.countDocuments({
      [`answers.${key}`]: { $exists: true },
    });

    if (submissionCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${submissionCount} submission(s) contain answers for this task. Deactivate it instead.`,
        submissionCount,
        suggestion: "Set active: false to hide it from candidates without losing historical data.",
      });
    }

    await Question.deleteOne({ key });
    res.status(200).json({ success: true, message: "Question deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting question" });
  }
};
