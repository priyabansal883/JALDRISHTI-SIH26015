require("dotenv").config();

const nodemailer = require("nodemailer");

console.log("====================================");
console.log("JalDrishti Email Test");
console.log("====================================");

console.log("EMAIL_USER:", process.env.EMAIL_USER);

console.log(
  "EMAIL_PASSWORD:",
  process.env.EMAIL_PASSWORD
    ? "LOADED"
    : "MISSING"
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function testEmail() {
  try {
    console.log("\nChecking Gmail connection...");

    await transporter.verify();

    console.log("✅ Gmail connection successful");

    console.log("\nSending test email...");

  

    console.log("\n✅ TEST EMAIL SENT");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);

  } catch (error) {
    console.log("\n❌ EMAIL TEST FAILED");

    console.log("Error code:", error.code);
    console.log("Error command:", error.command);
    console.log("Error response:", error.response);
    console.log("Error message:", error.message);

    console.log("\nFull error:");
    console.log(error);
  }
}

testEmail();