const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "CRITICAL_IMPACT",
        "LOW_IMPACT",
        "NDVI_DECLINE",
        "STRUCTURE_DAMAGE",
        "MAINTENANCE",
        "FOLLOW_UP",
      ],
      required: true,
    },

    severity: {
      type: String,
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
      ],
      default: "MEDIUM",
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "OPEN",
        "RESOLVED",
      ],
      default: "OPEN",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
    followUpDate: {
  type: Date,
  default: null,
},

assignedWorker: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},
  }
);

module.exports =
  mongoose.model("Alert", alertSchema);