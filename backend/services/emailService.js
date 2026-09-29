const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (email, subject, html) => {
  try {
    if (!email) {
      throw new Error("Recipient email is required");
    }

    if (!subject) {
      throw new Error("Email subject is required");
    }

    if (!html) {
      throw new Error("Email HTML content is required");
    }

    const mailOptions = {
      from: `"JalDrishti" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("OTP Email sent successfully:", info.messageId);

    return info;
  } catch (error) {
    console.error("Nodemailer Email Error:", error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};