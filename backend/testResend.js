require("dotenv").config();

const { Resend } = require("resend");

const resend = new Resend(
  process.env.RESEND_API_KEY
);
console.log(
  "RESEND API KEY:",
  process.env.RESEND_API_KEY
    ? "LOADED"
    : "MISSING"
);
async function testEmail() {
  console.log("====================================");
  console.log("JalDrishti Resend Email Test");
  console.log("====================================");

  console.log(
    "API KEY:",
    process.env.RESEND_API_KEY
      ? "LOADED"
      : "MISSING"
  );

  console.log(
    "FROM:",
    process.env.RESEND_FROM
  );

  const { data, error } =
    await resend.emails.send({
      from:
        process.env.RESEND_FROM ||
        "JalDrishti <onboarding@resend.dev>",

      to: [
        "YOUR_EMAIL@gmail.com"
      ],

      subject:
        "JalDrishti Resend Test",

      html: `
        <h2>JalDrishti Email Test</h2>

        <p>
          If you received this email,
          Resend is working correctly.
        </p>
      `,
    });

  if (error) {
    console.error(
      "❌ RESEND ERROR:"
    );

    console.error(error);

    return;
  }

  console.log(
    "===================================="
  );

  console.log(
    "✅ EMAIL SENT"
  );

  console.log(
    "RESEND ID:",
    data?.id
  );

  console.log(
    "===================================="
  );
}

testEmail();