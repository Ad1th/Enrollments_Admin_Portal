import User from "../models/User.js";

export const getAllUsers = async (req, res) => {
  try {
    const { domain, subdomain } = req.query;
    let filter = {};
    
    // Simple regex search if query param provided (search term logic from old controller)
    // Here we implement basic filtering
    if (domain && domain !== 'All') {
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
          from: "meetdetails",
          localField: "_id",
          foreignField: "user_id",
          as: "meetDetails",
        },
      },
      {
        $addFields: {
          meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] },
          meetStatus: { $arrayElemAt: ["$meetDetails.status", 0] }
        }
      },
    ]);

    res.status(200).json({
      success: true,
      data: users
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
              meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] }
            }
          }
        ]);
        res.status(200).json({ success: true, data: users });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}

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
                  meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] }
                }
            }
          ]);
        res.status(200).json({ success: true, data: users });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}

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
                  meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] }
                }
            }
          ]);
        res.status(200).json({ success: true, data: users });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}

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
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, message: "Status updated", user });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating status" });
  }
};
