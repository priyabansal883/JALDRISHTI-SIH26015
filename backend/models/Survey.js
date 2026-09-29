const mongoose = require("mongoose");

const surveyPhotoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "BEFORE",
        "AFTER",
        "MAINTENANCE",
        "DURING",
        "MONITORING",
      ],
      default: "MONITORING",
    },

    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },

    accuracy: {
      type: Number,
      min: 0,
      default: null,
    },

    timestamp: {
      type: String,
      default: "",
    },
  },
  {
    _id: true,
  }
);

const surveySchema = new mongoose.Schema(
  {
    // ======================================================
    // PROJECT / USER
    // ======================================================

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ======================================================
    // GPS
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

    gpsAccuracy: {
      type: Number,
      min: 0,
      default: null,
    },

    // ======================================================
    // SURVEY TYPE
    // ======================================================

    surveyType: {
      type: String,
      enum: [
        "BEFORE",
        "AFTER",
        "MONITORING",
      ],
      default: "MONITORING",
      index: true,
    },

    // ======================================================
    // FIELD PARAMETERS
    // ======================================================

    water: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    retention: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    // Field vegetation.
    // Stored as 0 - 100.
    vegetation: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    structure: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    maintenance: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },

    // ======================================================
    // IMPACT SCORE
    // ======================================================

    impactScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    impactScoreVersion: {
      type: String,
      default: "v2",
      trim: true,
    },

    // ======================================================
    // SATELLITE NDVI
    // ======================================================

    satelliteNDVI: {
      type: Number,
      min: -1,
      max: 1,
      default: null,
    },

    satelliteNDVIClassification: {
      type: String,
      trim: true,
      default: "",
    },

    // ======================================================
    // SATELLITE NDWI
    // ======================================================

    satelliteNDWI: {
      type: Number,
      min: -1,
      max: 1,
      default: null,
    },

    satelliteNDWIClassification: {
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

    satelliteTrueColorImageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    satelliteDate: {
      type: Date,
      default: null,
    },

    satelliteSource: {
      type: String,
      trim: true,
      default: "",
    },

    satelliteCloudCoverage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ======================================================
    // VEGETATION SCORING
    // ======================================================

    vegetationFieldScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    vegetationSatelliteScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    combinedVegetationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    vegetationEvidence: {
      type: String,
      enum: [
        "FIELD_ONLY",
        "SATELLITE_ONLY",
        "FIELD_AND_SATELLITE",
      ],
      default: "FIELD_ONLY",
    },

    // ======================================================
    // PHOTOS
    // ======================================================

    photos: {
      type: [surveyPhotoSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// INDEXES
// ======================================================

surveySchema.index({
  projectId: 1,
  surveyType: 1,
});

surveySchema.index({
  projectId: 1,
  createdAt: -1,
});

surveySchema.index({
  userId: 1,
  createdAt: -1,
});

surveySchema.index({
  projectId: 1,
  surveyType: 1,
  createdAt: -1,
});

// ======================================================
// EXPORT
// ======================================================

module.exports = mongoose.model(
  "Survey",
  surveySchema
);