const express = require("express");

const router = express.Router();

const Project = require("../models/Project");
const SatelliteAnalysis = require("../models/SatelliteAnalysis");

const protect = require("../middleware/authMiddleware");

const {
  getSatelliteNDVI,
  getSatelliteComparison,
    calculateSatelliteIndicators,

} = require("../services/satelliteService");


// ============================================================
// SAVE SATELLITE ANALYSIS
// POST /api/satellite/analysis
// ============================================================

router.post(
  "/analysis",
  protect,
  async (req, res) => {
    try {
      const {
        projectId,
        analysisType,
        ndvi,
        ndviClassification,
        satelliteDate,
        dateFrom,
        dateTo,
        source,
        cloudCoverage,
      } = req.body;

      if (
        !projectId ||
        ndvi === undefined ||
        ndvi === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project ID and NDVI are required.",
        });
      }

      const project =
        await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found.",
        });
      }

      const analysis =
        await SatelliteAnalysis.create({
          projectId,

          latitude:
            Number(project.latitude),

          longitude:
            Number(project.longitude),

          analysisType:
            analysisType || "MONITORING",

          ndvi:
            Number(ndvi),

          ndviClassification:
            ndviClassification || "",

          satelliteDate:
            satelliteDate || new Date(),

          dateFrom:
            dateFrom || null,

          dateTo:
            dateTo || null,

          source:
            source ||
            "Copernicus Sentinel-2 L2A",

          cloudCoverage:
            cloudCoverage !== undefined
              ? Number(cloudCoverage)
              : null,
        });

      return res.status(201).json({
        success: true,
        message:
          "Satellite analysis saved.",
        analysis,
      });

    } catch (error) {
      console.error(
        "Save satellite analysis error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to save satellite analysis.",
        error: error.message,
      });
    }
  }
);


// ============================================================
// SATELLITE HISTORY
// GET /api/satellite/project/:projectId/history
// ============================================================

router.get(
  "/project/:projectId/history",
  protect,
  async (req, res) => {
    try {
      const analyses =
        await SatelliteAnalysis
          .find({
            projectId:
              req.params.projectId,
          })
          .sort({
            satelliteDate: -1,
          });

      return res.status(200).json({
        success: true,
        count: analyses.length,
        analyses,
      });

    } catch (error) {
      console.error(
        "Satellite history error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch satellite history.",
        error: error.message,
      });
    }
  }
);


// ============================================================
// SAVED SATELLITE COMPARISON
// GET /api/satellite/project/:projectId/comparison
// ============================================================

router.get(
  "/project/:projectId/comparison",
  protect,
  async (req, res) => {
    try {
      const analyses =
        await SatelliteAnalysis
          .find({
            projectId: req.params.projectId,
          })
          .sort({
            createdAt: 1,
          });

      const before =
        analyses.find(
          (item) => item.analysisType === "BEFORE"
        );

      const after =
        [...analyses]
          .reverse()
          .find(
            (item) => item.analysisType === "AFTER"
          );

      if (!before || !after) {
        return res.status(200).json({
          success: true,
          message:
            "Satellite BEFORE and AFTER analysis are required.",
          before: null,
          after: null,
          comparison: null,
        });
      }
    const beforeNDVI = Number(before.ndvi);
const afterNDVI = Number(after.ndvi);
const beforeNDWI = Number(before.ndwi);
const afterNDWI = Number(after.ndwi);

const ndviChange = Number((afterNDVI - beforeNDVI).toFixed(4));
const ndwiChange =
  Number.isFinite(beforeNDWI) && Number.isFinite(afterNDWI)
    ? Number((afterNDWI - beforeNDWI).toFixed(4))
    : null;

const percentageChange =
  beforeNDVI === 0
    ? 0
    : Number(((ndviChange / Math.abs(beforeNDVI)) * 100).toFixed(2));

const beforeIndicators = calculateSatelliteIndicators({
  ndvi: beforeNDVI,
  ndwi: beforeNDWI,
});

const afterIndicators = calculateSatelliteIndicators({
  ndvi: afterNDVI,
  ndwi: afterNDWI,
});

const indicatorChange = (key) =>
  Number((afterIndicators[key] - beforeIndicators[key]).toFixed(2));

let performance = "No significant change";

if (ndviChange >= 0.10) {
  performance = "Strong vegetation improvement";
} else if (ndviChange >= 0.05) {
  performance = "Moderate vegetation improvement";
} else if (ndviChange > 0) {
  performance = "Slight vegetation improvement";
} else if (ndviChange <= -0.05) {
  performance = "Vegetation degradation detected";
}

      const formatEntry = (item) => ({
        id: item._id,
        ndvi: item.ndvi,
        classification: item.ndviClassification,
        ndwi: item.ndwi,
        ndwiClassification: item.ndwiClassification,
        imageUrl: item.satelliteImageUrl,
        thumbnailUrl: item.thumbnailUrl,
        selectedDate: item.satelliteDate,
        dateFrom: item.dateFrom,
        dateTo: item.dateTo,
        latitude: item.latitude,
        longitude: item.longitude,
        source: item.source,
      });

     return res.status(200).json({
  success: true,

  before: formatEntry(before),
  after: formatEntry(after),

  comparison: {
    ndviChange,
    ndwiChange,
    percentageChange,
    performance,

    satelliteIndicators: {
      before: beforeIndicators,
      after: afterIndicators,
      change: {
        vegetation: indicatorChange("vegetation"),
        waterAvailability: indicatorChange("waterAvailability"),
        waterRetention: indicatorChange("waterRetention"),
        structureCondition: indicatorChange("structureCondition"),
        maintenance: indicatorChange("maintenance"),
        overall: indicatorChange("overall"),
      },
    },
  },
});

    } catch (error) {
      console.error("Satellite comparison error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to compare satellite analyses.",
        error: error.message,
      });
    }
  }
);


// ============================================================
// ⭐ LIVE SATELLITE BEFORE / AFTER COMPARISON
//
// GET
// /api/satellite/project/:projectId/live-comparison
//
// Example:
//
// /api/satellite/project/PROJECT_ID/live-comparison
// ?beforeDate=2022-01-01
// &afterDate=2026-01-01
// ============================================================

router.get(
  "/project/:projectId/live-comparison",
  protect,
  async (req, res) => {

    console.log(
      "=========================================="
    );

    console.log(
      "LIVE SATELLITE COMPARISON ROUTE HIT"
    );

    console.log(
      "Project ID:",
      req.params.projectId
    );

    console.log(
      "Query:",
      req.query
    );

    console.log(
      "=========================================="
    );

    try {

      const {
        projectId,
      } = req.params;

      const {
        beforeDate,
        afterDate,
      } = req.query;


      // --------------------------------------------------------
      // VALIDATE PROJECT ID
      // --------------------------------------------------------

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message:
            "Project ID is required.",
        });
      }


      // --------------------------------------------------------
      // VALIDATE DATES
      // --------------------------------------------------------

      if (!beforeDate) {
        return res.status(400).json({
          success: false,
          message:
            "beforeDate is required.",

          example:
            "/api/satellite/project/PROJECT_ID/live-comparison?beforeDate=2022-01-01&afterDate=2026-01-01",
        });
      }


      if (!afterDate) {
        return res.status(400).json({
          success: false,
          message:
            "afterDate is required.",

          example:
            "/api/satellite/project/PROJECT_ID/live-comparison?beforeDate=2022-01-01&afterDate=2026-01-01",
        });
      }


      // --------------------------------------------------------
      // DATE FORMAT
      // --------------------------------------------------------

      const dateRegex =
        /^\d{4}-\d{2}-\d{2}$/;

      if (
        !dateRegex.test(beforeDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "beforeDate must be YYYY-MM-DD.",
        });
      }


      if (
        !dateRegex.test(afterDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "afterDate must be YYYY-MM-DD.",
        });
      }


      // --------------------------------------------------------
      // DATE ORDER
      // --------------------------------------------------------

      const before =
        new Date(
          `${beforeDate}T00:00:00Z`
        );

      const after =
        new Date(
          `${afterDate}T00:00:00Z`
        );


      if (
        Number.isNaN(
          before.getTime()
        ) ||
        Number.isNaN(
          after.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid satellite date.",
        });
      }


      if (before >= after) {
        return res.status(400).json({
          success: false,
          message:
            "beforeDate must be earlier than afterDate.",
        });
      }


      // --------------------------------------------------------
      // FIND PROJECT
      // --------------------------------------------------------

      const project =
        await Project.findById(
          projectId
        );


      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project not found.",
        });
      }


      // --------------------------------------------------------
      // PROJECT COORDINATES
      // --------------------------------------------------------

      const latitude =
        Number(
          project.latitude
        );

      const longitude =
        Number(
          project.longitude
        );


      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project latitude or longitude is invalid.",
        });
      }


      if (
        latitude < -90 ||
        latitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project latitude must be between -90 and 90.",
        });
      }


      if (
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project longitude must be between -180 and 180.",
        });
      }


      // --------------------------------------------------------
      // DEBUG
      // --------------------------------------------------------

      console.log(
        "=========================================="
      );

      console.log(
        "PROJECT FOUND"
      );

      console.log(
        "Project:",
        project.name
      );

      console.log(
        "Latitude:",
        latitude
      );

      console.log(
        "Longitude:",
        longitude
      );

      console.log(
        "Before Date:",
        beforeDate
      );

      console.log(
        "After Date:",
        afterDate
      );

      console.log(
        "Calling getSatelliteComparison..."
      );

      console.log(
        "=========================================="
      );


      // --------------------------------------------------------
      // CALL COPERNICUS SERVICE
      // --------------------------------------------------------

      const result =
        await getSatelliteComparison({
          latitude,
          longitude,
          beforeDate,
          afterDate,
        });


      // --------------------------------------------------------
      // VALIDATE RESULT
      // --------------------------------------------------------

      if (!result) {
        return res.status(500).json({
          success: false,
          message:
            "Satellite service returned no result.",
        });
      }


      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({

        success: true,

        project: {
          id:
            project._id,

          name:
            project.name,

          latitude,

          longitude,
        },

        comparison:
          result,

      });

    } catch (error) {

      console.error(
        "=========================================="
      );

      console.error(
        "LIVE SATELLITE COMPARISON ERROR"
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Stack:",
        error.stack
      );

      console.error(
        "=========================================="
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch live satellite comparison.",

        error:
          error.message,

      });
    }
  }
);


// ============================================================
// GET PROJECT SATELLITE DATA
//
// GET /api/satellite/project/:projectId
// ============================================================

router.get(
  "/project/:projectId",
  protect,
  async (req, res) => {

    try {

      const project =
        await Project.findById(
          req.params.projectId
        );

      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project not found.",
        });
      }


      const latitude =
        Number(project.latitude);

      const longitude =
        Number(project.longitude);


      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project latitude or longitude is invalid.",
        });
      }


      const result =
        await getSatelliteNDVI({
          latitude,
          longitude,
        });


      return res.status(200).json({

        success: true,

        project: {
          id:
            project._id,

          name:
            project.name,

          latitude,

          longitude,
        },

        satellite:
          result,

      });

    } catch (error) {

      console.error(
        "Project satellite error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch project satellite data.",
        error:
          error.message,
      });
    }
  }
);


// ============================================================
// DIRECT NDVI
// GET /api/satellite/ndvi
// ============================================================
// ============================================================
// SAVE SATELLITE COMPARISON
// ============================================================

router.post(
  "/project/:projectId/save-comparison",
  protect,
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const {
        latitude,
        longitude,
        bbox,

        before,
        after,

        comparison,
      } = req.body;

      console.log(
        "================================================"
      );
      console.log(
        "SAVE SATELLITE COMPARISON"
      );
      console.log(
        "Project ID:",
        projectId
      );
      console.log(
        "Latitude:",
        latitude
      );
      console.log(
        "Longitude:",
        longitude
      );
      console.log(
        "Before:",
        before
      );
      console.log(
        "After:",
        after
      );
      console.log(
        "Comparison:",
        comparison
      );
      console.log(
        "================================================"
      );

      // ======================================================
      // FIND PROJECT
      // ======================================================

      const project =
        await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // ======================================================
      // LOCATION
      // ======================================================

      const finalLatitude = Number(
        latitude ??
          project.latitude
      );

      const finalLongitude = Number(
        longitude ??
          project.longitude
      );

      if (
        !Number.isFinite(
          finalLatitude
        ) ||
        !Number.isFinite(
          finalLongitude
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid latitude and longitude are required.",
        });
      }

      // ======================================================
      // VALIDATE BEFORE / AFTER
      // ======================================================

      if (!before && !after) {
        return res.status(400).json({
          success: false,
          message:
            "At least BEFORE or AFTER satellite data is required.",
        });
      }

      // ======================================================
      // HELPER
      // ======================================================

      const normalizeDate = (
        value
      ) => {
        if (!value) {
          return null;
        }

        const date =
          new Date(value);

        return Number.isNaN(
          date.getTime()
        )
          ? null
          : date;
      };

      // ======================================================
      // BEFORE
      // ======================================================

      let beforeAnalysis = null;

      if (before) {
        beforeAnalysis =
          await SatelliteAnalysis.create(
            {
              projectId,

              latitude:
                finalLatitude,

              longitude:
                finalLongitude,

              bbox:
                Array.isArray(bbox)
                  ? bbox
                  : [],

              analysisType:
                "BEFORE",

              ndvi:
                before.ndvi ??
                null,

              ndviClassification:
                before.ndviClassification ||
                before.classification ||
                "",

              ndwi:
                before.ndwi ??
                null,

              ndwiClassification:
                before.ndwiClassification ||
                "",

              satelliteImageUrl:
                before.satelliteImageUrl ||
                before.imageUrl ||
                "",

              thumbnailUrl:
                before.thumbnailUrl ||
                "",

              satelliteDate:
                normalizeDate(
                  before.satelliteDate
                ),

              dateFrom:
                normalizeDate(
                  before.dateFrom
                ),

              dateTo:
                normalizeDate(
                  before.dateTo
                ),

              source:
                before.source ||
                "Copernicus Sentinel-2 L2A",

              cloudCoverage:
                before.cloudCoverage ??
                null,

              status:
                before.status ||
                "SUCCESS",

              errorMessage:
                before.errorMessage ||
                "",

              requestedBy:
                req.user?._id ||
                null,
            }
          );
      }

      // ======================================================
      // AFTER
      // ======================================================

      let afterAnalysis = null;

      if (after) {
        afterAnalysis =
          await SatelliteAnalysis.create(
            {
              projectId,

              latitude:
                finalLatitude,

              longitude:
                finalLongitude,

              bbox:
                Array.isArray(bbox)
                  ? bbox
                  : [],

              analysisType:
                "AFTER",

              ndvi:
                after.ndvi ??
                null,

              ndviClassification:
                after.ndviClassification ||
                after.classification ||
                "",

              ndwi:
                after.ndwi ??
                null,

              ndwiClassification:
                after.ndwiClassification ||
                "",

              satelliteImageUrl:
                after.satelliteImageUrl ||
                after.imageUrl ||
                "",

              thumbnailUrl:
                after.thumbnailUrl ||
                "",

              satelliteDate:
                normalizeDate(
                  after.satelliteDate
                ),

              dateFrom:
                normalizeDate(
                  after.dateFrom
                ),

              dateTo:
                normalizeDate(
                  after.dateTo
                ),

              source:
                after.source ||
                "Copernicus Sentinel-2 L2A",

              cloudCoverage:
                after.cloudCoverage ??
                null,

              status:
                after.status ||
                "SUCCESS",

              errorMessage:
                after.errorMessage ||
                "",

              requestedBy:
                req.user?._id ||
                null,
            }
          );
      }

      // ======================================================
      // CALCULATE DIFFERENCES
      // ======================================================

      let ndviChange = null;
      let ndwiChange = null;

      if (
        beforeAnalysis?.ndvi !== null &&
        beforeAnalysis?.ndvi !== undefined &&
        afterAnalysis?.ndvi !== null &&
        afterAnalysis?.ndvi !== undefined
      ) {
        ndviChange =
          Number(
            afterAnalysis.ndvi
          ) -
          Number(
            beforeAnalysis.ndvi
          );
      }

      if (
        beforeAnalysis?.ndwi !== null &&
        beforeAnalysis?.ndwi !== undefined &&
        afterAnalysis?.ndwi !== null &&
        afterAnalysis?.ndwi !== undefined
      ) {
        ndwiChange =
          Number(
            afterAnalysis.ndwi
          ) -
          Number(
            beforeAnalysis.ndwi
          );
      }

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(201).json({
        success: true,

        message:
          "Satellite comparison saved successfully.",

        data: {
          projectId,

          latitude:
            finalLatitude,

          longitude:
            finalLongitude,

          bbox:
            Array.isArray(bbox)
              ? bbox
              : [],

          before:
            beforeAnalysis,

          after:
            afterAnalysis,

          comparison: {
            ...(comparison || {}),

            ndviChange,

            ndwiChange,
          },
        },
      });

    } catch (error) {

      console.error(
        "Save satellite comparison error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to save satellite comparison.",

        error:
          error.message,

        details:
          error.errors || null,
      });
    }
  }
);
router.get(
  "/ndvi",
  protect,
  async (req, res) => {

    try {

      const {
        latitude,
        longitude,
        dateFrom,
        dateTo,
      } = req.query;


      if (
        latitude === undefined ||
        longitude === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "latitude and longitude are required.",
        });
      }


      const result =
        await getSatelliteNDVI({
          latitude:
            Number(latitude),

          longitude:
            Number(longitude),

          dateFrom,

          dateTo,
        });


      return res.status(200).json({

        success: true,

        satellite:
          result,

      });

    } catch (error) {

      console.error(
        "Direct NDVI error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch NDVI.",
        error:
          error.message,
      });
    }
  }
);


module.exports = router;