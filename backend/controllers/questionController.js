import Question from "../models/Question.js";

export const listQuestions = async (req, res) => {
  try {
    const filter = req.query.domain ? { domain: req.query.domain } : {};
    const questions = await Question.find(filter).sort({ domain: 1, order: 1 }).lean();
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ message: "Error fetching questions" });
  }
};

// Only reviewer-facing fields are editable here; question wording and keys are
// seeded from the candidate backend so existing answers never lose their prompt.
const EDITABLE = ["rubric", "active", "maxWords"];

export const updateQuestion = async (req, res) => {
  try {
    const update = {};
    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const question = await Question.findOneAndUpdate(
      { key: req.params.key },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ message: "Error updating question" });
  }
};
