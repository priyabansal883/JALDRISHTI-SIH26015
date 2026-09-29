const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadToCloudinary = (req, res, next) => {
  if (!req.file) return next();

  const stream = cloudinary.uploader.upload_stream(
    { folder: "jaldrishti" },
    (error, result) => {
      if (error) {
        console.error("=================================");
        console.error("RAW CLOUDINARY UPLOAD ERROR");
        console.error(JSON.stringify(error, null, 2));
        console.error("=================================");
        return next(error);
      }
      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      next();
    }
  );

  stream.end(req.file.buffer);
};

module.exports = { upload, uploadToCloudinary };