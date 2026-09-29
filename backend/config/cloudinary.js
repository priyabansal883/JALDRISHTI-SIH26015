const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("=================================");
console.log("CLOUDINARY CONFIG CHECK");
console.log(
  "Cloud name:",
  process.env.CLOUDINARY_CLOUD_NAME
);
console.log(
  "API key exists:",
  !!process.env.CLOUDINARY_API_KEY
);
console.log(
  "API secret exists:",
  !!process.env.CLOUDINARY_API_SECRET
);
console.log("=================================");


// TEST CLOUDINARY CONNECTION
cloudinary.api.ping()
  .then((result) => {
    console.log("=================================");
    console.log("CLOUDINARY PING SUCCESS ✅");
    console.log(result);
    console.log("=================================");
  })
  .catch((error) => {
    console.log("=================================");
    console.log("CLOUDINARY PING FAILED ❌");
    console.log("MESSAGE:", error.message);
    console.log("HTTP CODE:", error.http_code);
    console.log("FULL ERROR:", error);
    console.log("=================================");
  });


module.exports = cloudinary;