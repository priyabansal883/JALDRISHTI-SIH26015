const express = require("express");
const multer = require("multer");

const router = express.Router();
const {
  upload,
  uploadToCloudinary,
} = require("../middleware/uploadMiddleware");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.post(
  "/upload",

  protect,

  // ==========================================
  // AUTH DEBUG
  // ==========================================
  (req, res, next) => {
    console.log("=================================");
    console.log("PHOTO AUTH PASSED");
    console.log("USER:", req.user);
    console.log("=================================");

    next();
  },

  authorizeRoles(
    "field_worker",
    "officer",
    "admin"
  ),

  // ==========================================
  // MULTER + CLOUDINARY
  // ==========================================
  upload.single("photo"),
uploadToCloudinary,
  // ==========================================
  // RESULT
  // ==========================================
  async (req, res) => {
    try {
      console.log("=================================");
      console.log("PHOTO UPLOAD REQUEST");
      console.log(
        "CONTENT TYPE:",
        req.headers["content-type"]
      );

      console.log("BODY:");
      console.log(req.body);

      console.log("FILE:");
      console.log(req.file);

      console.log("=================================");

      if (!req.file) {
        return res.status(400).json({
          message: "No photo uploaded",
          contentType:
            req.headers["content-type"] || null,
        });
      }

      console.log("CLOUDINARY UPLOAD SUCCESS");
      console.log("URL:", req.file.path);
      console.log("PUBLIC ID:", req.file.filename);

      return res.status(200).json({
        message: "Photo uploaded successfully",

        photo: {
          url: req.file.path,
          publicId: req.file.filename,
        },
      });

    } catch (error) {
      console.error("=================================");
      console.error("PHOTO ROUTE ERROR");
      console.error("NAME:", error?.name);
      console.error("MESSAGE:", error?.message);
      console.error("HTTP CODE:", error?.http_code);
      console.error("STACK:", error?.stack);
      console.error("FULL ERROR:", error);
      console.error("=================================");

      return res.status(500).json({
        message: "Photo upload failed",
        error:
          error?.message ||
          String(error),
      });
    }
  }
);

// ==========================================
// MULTER ERROR HANDLER
// IMPORTANT: catches errors from upload.single()
// ==========================================
router.use((error, req, res, next) => {

  console.error("=================================");
  console.error("MULTER / CLOUDINARY ERROR");
  console.error("NAME:", error?.name);
  console.error("MESSAGE:", error?.message);
  console.error("CODE:", error?.code);
  console.error("HTTP CODE:", error?.http_code);
  console.error("STACK:", error?.stack);
  console.error("FULL ERROR:", error);
  console.error("=================================");

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: "Multer upload error",
      error: error.message,
      code: error.code,
    });
  }

  return res.status(500).json({
    message: "Photo upload middleware failed",
    error:
      error?.message ||
      String(error),
  });
});

module.exports = router;