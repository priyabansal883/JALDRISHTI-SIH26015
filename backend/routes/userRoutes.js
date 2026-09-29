const express = require("express");

const User = require("../models/User");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// GET ALL USERS (ADMIN ONLY)
// ======================================================

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { role } = req.query;

      const filter = {};

      if (role) {
        filter.role = role;
      }

      const users = await User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error("Get users error:", error);

      res.status(500).json({
        message: "Failed to fetch users.",
        error: error.message,
      });
    }
  }
);

// ======================================================
// CREATE USER (ADMIN ONLY)
// ======================================================

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { name, email, password, role, district } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({
          message: "Name, email, password and role are required.",
        });
      }

      const validRoles = ["field_worker", "officer", "admin"];

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: "Invalid role.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must contain at least 6 characters.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        return res.status(400).json({
          message: "A user with this email already exists.",
        });
      }

      // IMPORTANT:
      // Pass the PLAIN password here.
      // The User model's pre("save") hook hashes it
      // automatically. Do NOT hash it manually here,
      // or the password will be double-hashed and
      // login will fail.

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
        district: district ? district.trim() : "",
      });

      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: "User created successfully.",
        user: userResponse,
      });
    } catch (error) {
      console.error("Create user error:", error);

      res.status(500).json({
        message: "Failed to create user.",
        error: error.message,
      });
    }
  }
);

// ======================================================
// UPDATE USER (ADMIN ONLY)
// ======================================================

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { name, email, role, district, password } = req.body;

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      if (name) user.name = name.trim();

      if (email) {
        const normalizedEmail = email.trim().toLowerCase();

        // Check if another user already has this email
        if (normalizedEmail !== user.email) {
          const existingUser = await User.findOne({
            email: normalizedEmail,
          });

          if (existingUser) {
            return res.status(400).json({
              message: "Another user already uses this email.",
            });
          }
        }

        user.email = normalizedEmail;
      }

      if (role) {
        const validRoles = ["field_worker", "officer", "admin"];

        if (!validRoles.includes(role)) {
          return res.status(400).json({
            message: "Invalid role.",
          });
        }

        user.role = role;
      }

      if (district !== undefined) {
        user.district = district.trim();
      }

      // IMPORTANT:
      // Only update password if a new one was provided.
      // Setting user.password triggers the pre("save")
      // hook to re-hash it automatically.

      if (password && password.trim()) {
        if (password.length < 6) {
          return res.status(400).json({
            message: "Password must contain at least 6 characters.",
          });
        }

        user.password = password;
      }

      await user.save();

      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(200).json({
        success: true,
        message: "User updated successfully.",
        user: userResponse,
      });
    } catch (error) {
      console.error("Update user error:", error);

      res.status(500).json({
        message: "Failed to update user.",
        error: error.message,
      });
    }
  }
);

// ======================================================
// DELETE USER (ADMIN ONLY)
// ======================================================

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({
          message: "You cannot delete your own account.",
        });
      }

      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "User deleted successfully.",
      });
    } catch (error) {
      console.error("Delete user error:", error);

      res.status(500).json({
        message: "Failed to delete user.",
        error: error.message,
      });
    }
  }
);

module.exports = router;