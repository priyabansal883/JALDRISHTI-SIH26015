const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    village: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      default: "Uttar Pradesh",
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "Check Dam",
        "Farm Pond",
        "Recharge Structure",
        "Contour Bund",
        "Plantation",
        "Percolation Tank",
        "Other",
      ],
      required: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    implementationDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Good",
        "Moderate",
        "Poor",
        "Critical",
      ],
      default: "Moderate",
    },

    impactScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    description: {
      type: String,
      default: "",
    },

    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deadline: {
  type: Date,
  default: null,
},
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model("Project", projectSchema);