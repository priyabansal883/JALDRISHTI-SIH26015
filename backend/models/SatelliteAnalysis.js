const mongoose = require("mongoose");

const satelliteAnalysisSchema = new mongoose.Schema(
  {
    // ======================================================
    // PROJECT
    // ======================================================

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // ======================================================
    // LOCATION
    // ======================================================

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    bbox: {
      type: [Number],
      default: [],
    },

    // ======================================================
    // ANALYSIS TYPE
    // ======================================================

    analysisType: {
      type: String,
      enum: [
        "BEFORE",
        "AFTER",
        "MONITORING",
      ],
      required: true,
      index: true,
    },

    // ======================================================
    // NDVI
    // ======================================================

    ndvi: {
      type: Number,
      min: -1,
      max: 1,
      default: null,
    },

    ndviClassification: {
      type: String,
      trim: true,
      default: "",
    },

    // ======================================================
    // NDWI
    // ======================================================

    ndwi: {
      type: Number,
      min: -1,
      max: 1,
      default: null,
    },

    ndwiClassification: {
      type: String,
      trim: true,
      default: "",
    },

    // ======================================================
    // SATELLITE IMAGE
    // ======================================================

    satelliteImageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // ======================================================
    // SATELLITE INFORMATION
    // ======================================================

    satelliteDate: {
      type: Date,
      default: null,
    },

    dateFrom: {
      type: Date,
      default: null,
    },

    dateTo: {
      type: Date,
      default: null,
    },

    source: {
      type: String,
      default: "Copernicus Sentinel-2 L2A",
      trim: true,
    },

    cloudCoverage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ======================================================
    // PROCESSING
    // ======================================================

    status: {
      type: String,
      enum: [
        "PENDING",
        "SUCCESS",
        "FAILED",
      ],
      default: "SUCCESS",
      index: true,
    },

    errorMessage: {
      type: String,
      trim: true,
      default: "",
    },
  imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    // ======================================================
    // METADATA
    // ======================================================
 satelliteDate: {
      type: Date,
      default: null,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

  },
  {
    timestamps: true,
  }
);

// ======================================================
// INDEXES
// ======================================================

satelliteAnalysisSchema.index({
  projectId: 1,
  analysisType: 1,
  createdAt: -1,
});

satelliteAnalysisSchema.index({
  projectId: 1,
  satelliteDate: -1,
});

module.exports = mongoose.model(
  "SatelliteAnalysis",
  satelliteAnalysisSchema
);