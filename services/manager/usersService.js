const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const { getUserAnalytics } = require("./analyticsService");

async function getUsers(req, res) {
  try {
    const users = await User.find({}, "name email role suspended");
    const formatted = users.map((user) => ({
      ...user.toObject(),
      status: user.suspended ? "Suspended" : "Active",
      joined: "2024-01-15",
    }));
    res.render("manager/users", { users: formatted });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Database error");
  }
}

async function suspendUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.role === "admin" && req.session.user?.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admins cannot be suspended" });
    }
    user.suspended = true;
    await user.save();
    res.json({ success: true, message: "User suspended successfully" });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function restoreUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.role === "admin" && req.session.user?.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admins cannot be restored" });
    }
    user.suspended = false;
    await user.save();
    res.json({ success: true, message: "User restored successfully" });
  } catch (error) {
    console.error("Error restoring user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function createManager(req, res) {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "name, email, password required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters",
        });
    }

    if (phone && !/^\d{10}$/.test(String(phone).trim())) {
      return res
        .status(400)
        .json({ success: false, message: "Phone must be 10 digits" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "manager",
    });
    await newUser.save();

    return res.json({
      success: true,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        suspended: newUser.suspended,
      },
    });
  } catch (error) {
    console.error("Create manager error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error creating manager" });
  }
}

function getUsersHtml(req, res) {
  res.sendFile(
    path.join(__dirname, "..", "..", "public", "manager", "users.html"),
  );
}

module.exports = {
  getUsers,
  suspendUser,
  restoreUser,
  createManager,
  getUserAnalytics,
  getUsersHtml,
};
