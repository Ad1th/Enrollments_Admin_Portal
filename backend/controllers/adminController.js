// Example: Segregate all tech, design, and management tasks by subdomain and submission status
import TechTask from "../models/TechTask.js";
import DesignTask from "../models/DesignTask.js";
import ManagementTask from "../models/ManagementTask.js";

export const getSubdomainSubmissionStatus = async (req, res) => {
  try {
    // Load all tasks
    const techtasks = await TechTask.find({}).lean();
    const designtasks = await DesignTask.find({}).lean();
    const managementtasks = await ManagementTask.find({}).lean();

    // Define question keys for each task type (from backend models)
    const techKeys = [
      "question1",
      "question2",
      "question3",
      "question4",
      "question5",
    ];
    const designKeys = [
      "question1",
      "question2",
      "question3",
      "question4",
      "question5",
      "question6",
      "question7",
      "question8",
      "question9",
      "question10",
      "question11",
      "question12",
      "question13",
    ];
    const managementKeys = [
      "question1",
      "question2",
      "question3",
      "question4",
      "question5",
      "question6",
      "question7",
      "question8",
      "question9",
      "question10",
      "question11",
      "question12",
      "question13",
      "question14",
      "question15",
      "question16",
      "question17",
    ];

    // Use the utility to segregate
    const techResult = segregateBySubdomain(techtasks, techKeys);
    const designResult = segregateBySubdomain(designtasks, designKeys);
    const managementResult = segregateBySubdomain(
      managementtasks,
      managementKeys,
      "management"
    );

    res.status(200).json({
      success: true,
      tech: techResult,
      design: designResult,
      management: managementResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error segregating submissions" });
  }
};
import User from "../models/User.js";

const inferSubdomain = (task, type = "management") => {
  if (type === "management") {
    // Editorial / Events check (Question 17 is unique to Editorial/Events)
    if (hasAnswer(task, "question17")) return ["editorial"];

    // Publicity check (Questions 12-16)
    const publicityQs = [
      "question12",
      "question13",
      "question14",
      "question15",
      "question16",
    ];
    if (publicityQs.some((q) => hasAnswer(task, q))) return ["publicity"];

    // Outreach check (Questions 7-11)
    const outreachQs = [
      "question7",
      "question8",
      "question9",
      "question10",
      "question11",
    ];
    if (outreachQs.some((q) => hasAnswer(task, q))) return ["outreach"];

    // General Operations check (Questions 2-6) - Fallback if no specific subdomain found
    const genOpsQs = [
      "question2",
      "question3",
      "question4",
      "question5",
      "question6",
    ];
    if (genOpsQs.some((q) => hasAnswer(task, q))) return ["generaloperations"];
  }
  return [];
};

const hasAnswer = (task, key) => {
  return (
    Array.isArray(task[key]) &&
    task[key].some((ans) => typeof ans === "string" && ans.trim().length > 0)
  );
};

function segregateBySubdomain(tasks, questionKeys, type = "management") {
  const result = {};
  for (const task of tasks) {
    let subdomains = task.subdomain;

    // Normalize or Infer
    if (!subdomains || (Array.isArray(subdomains) && subdomains.length === 0)) {
      subdomains = inferSubdomain(task, type);
    } else if (typeof subdomains === "string") {
      subdomains = subdomains.split(",").map((s) => s.trim().toLowerCase());
    } else if (Array.isArray(subdomains)) {
      subdomains = subdomains.map((s) => s.toLowerCase());
    }

    // Fix editorial/events mismatch if present in DB
    subdomains = subdomains.map((s) => (s === "events" ? "editorial" : s));

    const submitted = hasSubmission(task, questionKeys);
    if (subdomains.length === 0) {
      if (!result["unspecified"])
        result["unspecified"] = { submitted: [], notSubmitted: [] };
      if (submitted)
        result["unspecified"].submitted.push(
          task.user_id?.$oid || task.user_id
        );
      else
        result["unspecified"].notSubmitted.push(
          task.user_id?.$oid || task.user_id
        );
    } else {
      for (const sub of subdomains) {
        if (!result[sub]) result[sub] = { submitted: [], notSubmitted: [] };
        if (submitted)
          result[sub].submitted.push(task.user_id?.$oid || task.user_id);
        else result[sub].notSubmitted.push(task.user_id?.$oid || task.user_id);
      }
    }
  }
  return result;
}

export const getAllUsers = async (req, res) => {
  try {
    const { domain, subdomain } = req.query;
    let filter = {};

    // Simple regex search if query param provided (search term logic from old controller)
    // Here we implement basic filtering
    if (domain && domain !== "All") {
      filter.domain = domain;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    const users = await User.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "techtasks",
          localField: "_id",
          foreignField: "user_id",
          as: "techTasks",
        },
      },
      {
        $lookup: {
          from: "designtasks",
          localField: "_id",
          foreignField: "user_id",
          as: "designTasks",
        },
      },
      {
        $lookup: {
          from: "managementtasks",
          localField: "_id",
          foreignField: "user_id",
          as: "managementTasks",
        },
      },
      {
        $lookup: {
          from: "meetdetails",
          localField: "_id",
          foreignField: "user_id",
          as: "meetDetails",
        },
      },
      {
        $addFields: {
          meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] },
          meetStatus: { $arrayElemAt: ["$meetDetails.status", 0] },
          hasSubmitted: {
            $or: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$techTasks",
                        as: "task",
                        cond: {
                          $or: [
                            { $gt: [{ $size: "$$task.question1" }, 0] },
                            { $gt: [{ $size: "$$task.question2" }, 0] },
                            { $gt: [{ $size: "$$task.question3" }, 0] },
                            { $gt: [{ $size: "$$task.question4" }, 0] },
                            { $gt: [{ $size: "$$task.question5" }, 0] },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$designTasks",
                        as: "task",
                        cond: {
                          $or: [
                            { $gt: [{ $size: "$$task.question1" }, 0] },
                            { $gt: [{ $size: "$$task.question2" }, 0] },
                            { $gt: [{ $size: "$$task.question3" }, 0] },
                            { $gt: [{ $size: "$$task.question4" }, 0] },
                            { $gt: [{ $size: "$$task.question5" }, 0] },
                            { $gt: [{ $size: "$$task.question6" }, 0] },
                            { $gt: [{ $size: "$$task.question7" }, 0] },
                            { $gt: [{ $size: "$$task.question8" }, 0] },
                            { $gt: [{ $size: "$$task.question9" }, 0] },
                            { $gt: [{ $size: "$$task.question10" }, 0] },
                            { $gt: [{ $size: "$$task.question11" }, 0] },
                            { $gt: [{ $size: "$$task.question12" }, 0] },
                            { $gt: [{ $size: "$$task.question13" }, 0] },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$managementTasks",
                        as: "task",
                        cond: {
                          $or: [
                            { $gt: [{ $size: "$$task.question1" }, 0] },
                            { $gt: [{ $size: "$$task.question2" }, 0] },
                            { $gt: [{ $size: "$$task.question3" }, 0] },
                            { $gt: [{ $size: "$$task.question4" }, 0] },
                            { $gt: [{ $size: "$$task.question5" }, 0] },
                            { $gt: [{ $size: "$$task.question6" }, 0] },
                            { $gt: [{ $size: "$$task.question7" }, 0] },
                            { $gt: [{ $size: "$$task.question8" }, 0] },
                            { $gt: [{ $size: "$$task.question9" }, 0] },
                            { $gt: [{ $size: "$$task.question10" }, 0] },
                            { $gt: [{ $size: "$$task.question11" }, 0] },
                            { $gt: [{ $size: "$$task.question12" }, 0] },
                            { $gt: [{ $size: "$$task.question13" }, 0] },
                            { $gt: [{ $size: "$$task.question14" }, 0] },
                            { $gt: [{ $size: "$$task.question15" }, 0] },
                            { $gt: [{ $size: "$$task.question16" }, 0] },
                            { $gt: [{ $size: "$$task.question17" }, 0] },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
    ]);

    // Post-processing to infer subdomains for Management Tasks
    users.forEach((user) => {
      // Tech
      if (user.techTasks && user.techTasks.length > 0) {
        user.techTasks.forEach((task) => {
            // Logic for tech if needed, but mainly management requested
        });
      }
      // Management
      if (user.managementTasks && user.managementTasks.length > 0) {
        user.managementTasks.forEach((task) => {
          if (
            !task.subdomain ||
            (Array.isArray(task.subdomain) && task.subdomain.length === 0)
          ) {
            task.subdomain = inferSubdomain(task, "management");
          } else {
            // Ensure events -> editorial normalization exists here too
             let sub = task.subdomain;
             if (typeof sub === 'string') sub = sub.split(',').map(s=>s.trim());
             if (Array.isArray(sub)) {
                 task.subdomain = sub.map(s => s.toLowerCase() === 'events' ? 'editorial' : s);
             }
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const getTechUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      { $match: { domain: "tech" } },
      {
        $lookup: {
          from: "techtasks",
          localField: "_id",
          foreignField: "user_id",
          as: "techTasks",
        },
      },
      {
        $lookup: {
          from: "meetdetails",
          localField: "_id",
          foreignField: "user_id",
          as: "meetDetails",
        },
      },
      {
        $addFields: {
          meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] },
        },
      },
    ]);
    users.forEach((user) => {
        // Tech logic if needed
    });
    res.status(200).json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getDesignUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      { $match: { domain: "design" } },
      {
        $lookup: {
          from: "designtasks",
          localField: "_id",
          foreignField: "user_id",
          as: "designTasks",
        },
      },
      {
        $lookup: {
          from: "meetdetails",
          localField: "_id",
          foreignField: "user_id",
          as: "meetDetails",
        },
      },
      {
        $addFields: {
          meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] },
        },
      },
    ]);
    users.forEach((user) => {
        // Design logic if needed
    });
    res.status(200).json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getManagementUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      { $match: { domain: "management" } },
      {
        $lookup: {
          from: "managementtasks",
          localField: "_id",
          foreignField: "user_id",
          as: "managementTasks",
        },
      },
      {
        $lookup: {
          from: "meetdetails",
          localField: "_id",
          foreignField: "user_id",
          as: "meetDetails",
        },
      },
      {
        $addFields: {
          meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] },
        },
      },
    ]);
    users.forEach((user) => {
        if (user.managementTasks) {
            user.managementTasks.forEach(task => {
                if (!task.subdomain || (Array.isArray(task.subdomain) && task.subdomain.length === 0)) {
                    task.subdomain = inferSubdomain(task, "management");
                } else {
                     let sub = task.subdomain;
                     if (typeof sub === 'string') sub = sub.split(',').map(s=>s.trim());
                     if (Array.isArray(sub)) {
                         task.subdomain = sub.map(s => s.toLowerCase() === 'events' ? 'editorial' : s);
                     }
                }
            })
        }
    });
    res.status(200).json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { regno, tech, design, management, adminNotes } = req.body;

    if (!regno) return res.status(400).json({ message: "RegNo required" });

    const updateFields = {};
    if (tech !== undefined) updateFields.tech = tech;
    if (design !== undefined) updateFields.design = design;
    if (management !== undefined) updateFields.management = management;
    if (adminNotes !== undefined) updateFields.adminNotes = adminNotes;

    const user = await User.findOneAndUpdate(
      { regno: regno },
      { $set: updateFields },
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, message: "Status updated", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating status" });
  }
};
