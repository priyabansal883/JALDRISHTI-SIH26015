const cloudinary = require("../config/cloudinary");

const uploadSatelliteImage = (buffer, publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "jaldrishti/satellite",
        public_id: publicId,
        resource_type: "image",
        format: "png",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
};

module.exports = uploadSatelliteImage;