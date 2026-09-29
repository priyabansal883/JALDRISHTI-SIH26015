const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
otp: {
  type: String,
  default: null,
},

otpExpires: {
  type: Date,
  default: null,
},
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["field_worker", "officer", "admin"],
      default: "field_worker",
    },

    district: {
      type: String,
      default: "",
    },
    resetPasswordToken: {
  type: String,
  default: null,
},

resetPasswordExpire: {
  type: Date,
  default: null,
},
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving

// Encrypt password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
// Compare password during login
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);