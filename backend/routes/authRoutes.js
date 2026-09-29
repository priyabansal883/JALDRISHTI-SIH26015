
const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../services/emailService");
const generateOTP = require("../utils/generateOTP");
const router = express.Router();

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
/*
====================================================
GENERATE JWT
====================================================
*/
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "100d",
    }
  );
};

/*
====================================================
REGISTER
POST /auth/register
====================================================

Used by:
- Officer
- Field Worker

Frontend sends:

{
  name,
  email,
  password,
  district,
  role
}

role can be:
- officer
- field_worker

If role is not provided,
field_worker is used as default.
====================================================
*/

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      district,
      role,
    } = req.body;

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // -----------------------------------------------
    // PASSWORD VALIDATION
    // -----------------------------------------------

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    // -----------------------------------------------
    // NORMALIZE EMAIL
    // -----------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------------------------
    // CHECK EXISTING USER
    // -----------------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // -----------------------------------------------
    // VALIDATE ROLE
    // -----------------------------------------------

    const allowedRoles = [
      "officer",
      "field_worker",
    ];

    const selectedRole = role || "field_worker";

    if (!allowedRoles.includes(selectedRole)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    // -----------------------------------------------
    // CREATE USER
    // -----------------------------------------------

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      district: district || "",
      role: selectedRole,
    });

    // -----------------------------------------------
    // GENERATE TOKEN
    // -----------------------------------------------

    const token = generateToken(user);

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    res.status(201).json({
      message: "Registration successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
      },
    });

  } catch (error) {
    console.error("REGISTRATION ERROR:", error);

    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

/*
====================================================
CREATE OFFICER
POST /auth/create-officer
====================================================

Only:
- Admin

can create an Officer.

Frontend/Admin sends:

{
  name,
  email,
  password,
  district
}
====================================================
*/

router.post(
  "/create-officer",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        district,
      } = req.body;

      // ---------------------------------------------
      // VALIDATION
      // ---------------------------------------------

      if (
        !name ||
        !email ||
        !password ||
        !district
      ) {
        return res.status(400).json({
          message: "All fields are required",
        });
      }

      // ---------------------------------------------
      // PASSWORD VALIDATION
      // ---------------------------------------------

      if (password.length < 6) {
        return res.status(400).json({
          message:
            "Password must contain at least 6 characters",
        });
      }

      // ---------------------------------------------
      // NORMALIZE EMAIL
      // ---------------------------------------------

      const normalizedEmail =
        email.trim().toLowerCase();

      // ---------------------------------------------
      // CHECK EXISTING USER
      // ---------------------------------------------

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        return res.status(400).json({
          message: "User already exists",
        });
      }

      // ---------------------------------------------
      // CREATE OFFICER
      // ---------------------------------------------

      const officer = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: "officer",
        district: district.trim(),
      });

      // ---------------------------------------------
      // RESPONSE
      // ---------------------------------------------

      res.status(201).json({
        message: "Officer created successfully",

        officer: {
          id: officer._id,
          name: officer.name,
          email: officer.email,
          role: officer.role,
          district: officer.district,
        },
      });

    } catch (error) {
      console.error(
        "CREATE OFFICER ERROR:",
        error
      );

      res.status(500).json({
        message: "Failed to create officer",
        error: error.message,
      });
    }
  }
);

/*
====================================================
GET FIELD WORKERS
GET /auth/field-workers
====================================================

Allowed:
- Officer
- Admin
====================================================
*/

router.get(
  "/field-workers",
  protect,
  authorizeRoles("officer", "admin"),
  async (req, res) => {
    try {

      const workers = await User.find({
        role: "field_worker",
      })
        .select(
          "name email district"
        )
        .sort({
          name: 1,
        });

      res.status(200).json({
        workers,
      });

    } catch (error) {
      console.error(
        "GET FIELD WORKERS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch field workers.",
        error: error.message,
      });
    }
  }
);

/*
====================================================
LOGIN
POST /auth/login
====================================================

Frontend sends:

{
  email,
  password
}

Response:

{
  token,
  user
}
====================================================
*/

router.post("/login", async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;

    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    // ---------------------------------------------
    // NORMALIZE EMAIL
    // ---------------------------------------------

    const normalizedEmail =
      email.trim().toLowerCase();

    // ---------------------------------------------
    // FIND USER
    // ---------------------------------------------

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // ---------------------------------------------
    // CHECK PASSWORD
    // ---------------------------------------------

    const isMatch =
      await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // ---------------------------------------------
    // GENERATE TOKEN
    // ---------------------------------------------

    const token = generateToken(user);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    res.status(200).json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
      },
    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});


// ===============================
// FORGOT PASSWORD - SEND OTP
// ===============================
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        // Find user
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Generate OTP
        const otp = generateOTP();

        // Save OTP and expiry
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        // Send email
        await sendEmail(
            user.email,
            "Password Reset OTP",
            `
            <div style="font-family: Arial, sans-serif;">
                <h2>Password Reset</h2>

                <p>Your password reset OTP is:</p>

                <h1 style="letter-spacing: 5px;">
                    ${otp}
                </h1>

                <p>
                    This OTP is valid for <strong>10 minutes</strong>.
                </p>

                <p>
                    If you did not request a password reset,
                    please ignore this email.
                </p>
            </div>
            `
        );

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// ===============================
// VERIFY OTP
// ===============================
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        // Find user
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check OTP exists
        if (!user.otp) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Please request a new OTP.",
            });
        }

        // Check OTP
        if (user.otp !== otp.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Check expiry
        if (!user.otpExpires || user.otpExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired",
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// ===============================
// RESET PASSWORD
// ===============================
router.post("/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Validate input
        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP and new password are required",
            });
        }

        // Validate password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        // Find user
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check OTP exists
        if (!user.otp) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Please request a new OTP.",
            });
        }

        // Check OTP
        if (user.otp !== otp.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Check OTP expiry
        if (!user.otpExpires || user.otpExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired",
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        user.password = hashedPassword;

        // Clear OTP after successful reset
        user.otp = null;
        user.otpExpires = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });

    } catch (error) {
        console.error("Reset Password Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});



// ===============================
// RESEND OTP
// ===============================
router.post("/resend-otp", async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Find user
        const user = await User.findOne({
            email: cleanEmail,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Generate new OTP
        const otp = generateOTP();

        // Save OTP and expiry
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        // Send new OTP
        await sendEmail(
            user.email,
            "New OTP - JalDrishti",
            `
            <div style="font-family: Arial, sans-serif;">
                <h2>Password Reset OTP</h2>

                <p>Your new OTP is:</p>

                <h1 style="letter-spacing: 5px;">
                    ${otp}
                </h1>

                <p>
                    This OTP is valid for <strong>10 minutes</strong>.
                </p>

                <p>
                    If you did not request this OTP, please ignore this email.
                </p>
            </div>
            `
        );

        return res.status(200).json({
            success: true,
            message: "OTP resent successfully",
        });

    } catch (error) {
        console.error("Resend OTP Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});


module.exports = router;