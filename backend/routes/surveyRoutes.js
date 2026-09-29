const express = require("express");

const Survey = require("../models/Survey");
const Project = require("../models/Project");

const authorizeRoles =
  require("../middleware/roleMiddleware");

const protect =
  require("../middleware/authMiddleware");

const {
  generateProjectAlerts,
} = require("../utils/alertEngine");

const {
  calculateCombinedImpactScore,
  getImpactStatus,
} = require("../utils/impactScore");

const router = express.Router();


// ======================================================
// HELPERS
// ======================================================

const roundNumber = (value, decimals = 2) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Number(number.toFixed(decimals));
};


// ======================================================
// SAFE NUMBER
// ======================================================

const safeNumber = (
  value,
  defaultValue = null
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return defaultValue;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : defaultValue;
};


// ======================================================
// PERCENTAGE CHANGE
// ======================================================

const calculatePercentageChange = (
  before,
  after
) => {
  if (
    before === null ||
    before === undefined ||
    after === null ||
    after === undefined
  ) {
    return null;
  }

  const beforeNumber =
    Number(before);

  const afterNumber =
    Number(after);

  if (
    !Number.isFinite(beforeNumber) ||
    !Number.isFinite(afterNumber)
  ) {
    return null;
  }

  if (beforeNumber === 0) {
    return null;
  }

  return Number(
    (
      ((afterNumber - beforeNumber) /
        Math.abs(beforeNumber)) *
      100
    ).toFixed(1)
  );
};


// ======================================================
// GPS DISTANCE
// ======================================================

const calculateDistance = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined
  ) {
    return null;
  }

  const R = 6371e3;

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const dLat = toRadians(
    lat2 - lat1
  );

  const dLon = toRadians(
    lon2 - lon1
  );

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};


// ======================================================
// PROJECT ACCESS
// ======================================================

const canAccessProject = (
  project,
  user
) => {
  if (!project || !user) {
    return false;
  }

  // ADMIN
  if (
    user.role === "admin"
  ) {
    return true;
  }

  const userId =
    user.id
      ? user.id.toString()
      : null;

  // OFFICER
  if (
    user.role === "officer"
  ) {
    const assignedOfficer =
      project.assignedOfficer
        ? project.assignedOfficer.toString()
        : null;

    return (
      assignedOfficer === userId
    );
  }

  // FIELD WORKER
  if (
    user.role === "field_worker"
  ) {
    const assignedWorker =
      project.assignedWorker
        ? project.assignedWorker.toString()
        : null;

    return (
      assignedWorker === userId
    );
  }

  return false;
};


// ======================================================
// FIND BEFORE / CURRENT SURVEY
// ======================================================

const findComparisonSurveys = (
  surveys
) => {
  if (!Array.isArray(surveys)) {
    return {
      before: null,
      current: null,
      comparisonType: "NONE",
    };
  }

  const sorted = [
    ...surveys,
  ].sort(
    (a, b) =>
      new Date(a.createdAt) -
      new Date(b.createdAt)
  );

  // --------------------------------------------------
  // BEFORE = FIRST BEFORE SURVEY
  // --------------------------------------------------

  const before =
    sorted.find(
      (survey) =>
        survey.surveyType ===
        "BEFORE"
    ) || null;

  // --------------------------------------------------
  // CURRENT = MOST RECENT AFTER
  // --------------------------------------------------

  const afterCandidates =
    sorted.filter(
      (survey) =>
        survey.surveyType ===
        "AFTER"
    );

  const monitoringCandidates =
    sorted.filter(
      (survey) =>
        survey.surveyType ===
          "MONITORING" ||
        survey.surveyType ===
          "DURING"
    );

  const latestAfter =
    afterCandidates.length > 0
      ? afterCandidates[
          afterCandidates.length - 1
        ]
      : null;

  const latestMonitoring =
    monitoringCandidates.length > 0
      ? monitoringCandidates[
          monitoringCandidates.length - 1
        ]
      : null;

  // --------------------------------------------------
  // CHOOSE MOST RECENT CURRENT SURVEY
  // --------------------------------------------------

  let current = null;

  if (
    latestAfter &&
    latestMonitoring
  ) {
    current =
      new Date(
        latestAfter.createdAt
      ) >
      new Date(
        latestMonitoring.createdAt
      )
        ? latestAfter
        : latestMonitoring;
  } else {
    current =
      latestAfter ||
      latestMonitoring ||
      null;
  }

  // --------------------------------------------------
  // COMPARISON TYPE
  // --------------------------------------------------

  if (
    before &&
    current
  ) {
    return {
      before,
      current,
      comparisonType:
        current.surveyType ===
        "AFTER"
          ? "BEFORE_AFTER"
          : "BEFORE_MONITORING",
    };
  }

  if (
    !before &&
    current
  ) {
    return {
      before: null,
      current,
      comparisonType:
        current.surveyType ===
        "AFTER"
          ? "CURRENT_ONLY"
          : "MONITORING_ONLY",
    };
  }

  return {
    before: null,
    current: null,
    comparisonType: "NONE",
  };
};


// ======================================================
// RECOMMENDATIONS
// ======================================================

const generateRecommendations = ({
  before,
  after,
  changes,
}) => {
  const recommendations = [];

  if (!after) {
    return [
      "No current survey is available. Conduct a field monitoring survey.",
    ];
  }

  // ==================================================
  // WATER
  // ==================================================

  if (
    changes.water !== null &&
    changes.water < 0
  ) {
    recommendations.push(
      "Water availability has decreased. Inspect water harvesting, storage and recharge structures."
    );
  }

  if (
    changes.water !== null &&
    changes.water > 0
  ) {
    recommendations.push(
      "Water availability has improved. Continue monitoring water sources and harvesting structures."
    );
  }


  // ==================================================
  // RETENTION
  // ==================================================

  if (
    changes.retention !== null &&
    changes.retention < 0
  ) {
    recommendations.push(
      "Water retention has decreased. Inspect drainage, soil moisture and recharge structures."
    );
  }

  if (
    changes.retention !== null &&
    changes.retention > 0
  ) {
    recommendations.push(
      "Water retention has improved. Continue maintaining recharge and retention structures."
    );
  }


  // ==================================================
  // VEGETATION
  // ==================================================

  if (
    changes.vegetation !== null &&
    changes.vegetation < 0
  ) {
    recommendations.push(
      "Field vegetation has declined. Consider plantation, soil conservation and erosion-control measures."
    );
  }

  if (
    changes.vegetation !== null &&
    changes.vegetation > 0
  ) {
    recommendations.push(
      "Field vegetation has improved. Continue plantation and vegetation conservation activities."
    );
  }


  // ==================================================
  // STRUCTURE
  // ==================================================

  if (
    changes.structure !== null &&
    changes.structure < 0
  ) {
    recommendations.push(
      "Watershed structure condition has declined. Schedule inspection and maintenance."
    );
  }

  if (
    changes.structure !== null &&
    changes.structure > 0
  ) {
    recommendations.push(
      "Watershed structure condition has improved. Continue regular inspection."
    );
  }


  // ==================================================
  // MAINTENANCE
  // ==================================================

  if (
    changes.maintenance !== null &&
    changes.maintenance < 0
  ) {
    recommendations.push(
      "Maintenance performance has decreased. Increase regular inspection and maintenance activities."
    );
  }

  if (
    changes.maintenance !== null &&
    changes.maintenance > 0
  ) {
    recommendations.push(
      "Maintenance performance has improved. Continue regular maintenance."
    );
  }


  // ==================================================
  // SATELLITE NDVI
  // ==================================================

  if (
    changes.satelliteNDVI !== null &&
    changes.satelliteNDVI < 0
  ) {
    recommendations.push(
      "Satellite NDVI indicates vegetation decline. Verify vegetation conditions in the field and consider plantation or soil-moisture conservation measures."
    );
  }

  if (
    changes.satelliteNDVI !== null &&
    changes.satelliteNDVI > 0
  ) {
    recommendations.push(
      "Satellite NDVI indicates vegetation improvement. Continue vegetation and watershed conservation activities."
    );
  }


  // ==================================================
  // SATELLITE NDWI
  // ==================================================

  if (
    changes.satelliteNDWI !== null &&
    changes.satelliteNDWI < 0
  ) {
    recommendations.push(
      "Satellite water-index analysis indicates reduced water or moisture conditions. Inspect water harvesting and recharge structures."
    );
  }

  if (
    changes.satelliteNDWI !== null &&
    changes.satelliteNDWI > 0
  ) {
    recommendations.push(
      "Satellite water-index analysis indicates improved water or moisture conditions."
    );
  }


  // ==================================================
  // FIELD + SATELLITE AGREEMENT
  // ==================================================

  if (
    changes.vegetation !== null &&
    changes.satelliteNDVI !== null
  ) {
    const fieldDirection =
      Math.sign(
        changes.vegetation
      );

    const satelliteDirection =
      Math.sign(
        changes.satelliteNDVI
      );

    if (
      fieldDirection ===
        satelliteDirection &&
      fieldDirection !== 0
    ) {
      recommendations.push(
        "Field survey and satellite vegetation indicators show the same trend, providing stronger evidence for the observed vegetation change."
      );
    } else if (
      fieldDirection !==
      satelliteDirection
    ) {
      recommendations.push(
        "Field and satellite vegetation indicators show different trends. A verification survey is recommended."
      );
    }
  }


  // ==================================================
  // IMPACT SCORE
  // ==================================================

  const impactScore =
    safeNumber(
      after.impactScore,
      0
    );

  if (
    impactScore < 50
  ) {
    recommendations.push(
      "Overall project impact is low. A detailed field assessment is recommended."
    );
  } else if (
    impactScore < 75
  ) {
    recommendations.push(
      "Overall project impact is moderate. Continue monitoring and address weak indicators."
    );
  } else {
    recommendations.push(
      "Overall project impact is strong. Continue regular monitoring and maintenance."
    );
  }


  // ==================================================
  // DEFAULT
  // ==================================================

  if (
    recommendations.length === 0
  ) {
    recommendations.push(
      "The watershed project is showing stable or positive indicators. Continue regular monitoring."
    );
  }


  return [
    ...new Set(
      recommendations
    ),
  ];
};


// ======================================================
// SATELLITE RESPONSE
// ======================================================

const formatSatelliteData = (
  survey
) => {
  if (!survey) {
    return null;
  }

  const hasNDVI =
    survey.satelliteNDVI !== null &&
    survey.satelliteNDVI !== undefined;

  const hasNDWI =
    survey.satelliteNDWI !== null &&
    survey.satelliteNDWI !== undefined;

  const hasImage =
    !!survey.satelliteImageUrl ||
    !!survey.satelliteTrueColorImageUrl;

  return {
    available:
      hasNDVI ||
      hasNDWI ||
      hasImage,

    ndvi:
      survey.satelliteNDVI ??
      null,

    ndviClassification:
      survey.satelliteNDVIClassification ||
      "",

    ndwi:
      survey.satelliteNDWI ??
      null,

    ndwiClassification:
      survey.satelliteNDWIClassification ||
      "",

    imageUrl:
      survey.satelliteImageUrl ||
      "",

    trueColorImageUrl:
      survey.satelliteTrueColorImageUrl ||
      "",

    date:
      survey.satelliteDate ||
      null,

    source:
      survey.satelliteSource ||
      "",

    cloudCoverage:
      survey.satelliteCloudCoverage ??
      null,
  };
};


// ======================================================
// CREATE SURVEY
// ======================================================

router.post(
  "/",
  protect,
  authorizeRoles(
    "field_worker",
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {
      console.log(
        "\n===================================="
      );

      console.log(
        "CREATE SURVEY REQUEST"
      );

      console.log(
        "USER:",
        req.user
      );

      console.log(
        "BODY:",
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      console.log(
        "===================================="
      );


      const {
        projectId,

        latitude,
        longitude,
        gpsAccuracy,

        surveyType,

        water,
        retention,
        vegetation,
        structure,
        maintenance,

        notes,
        photos,

        satelliteNDVI,
        satelliteNDVIClassification,

        satelliteNDWI,
        satelliteNDWIClassification,

        satelliteDate,
        satelliteImageUrl,
        satelliteTrueColorImageUrl,
        satelliteSource,
        satelliteCloudCoverage,
      } = req.body;


      // ==================================================
      // REQUIRED VALIDATION
      // ==================================================

      if (
        !projectId ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return res.status(400).json({
          message:
            "Project and GPS location are required.",
        });
      }


      const finalLatitude =
        safeNumber(latitude);

      const finalLongitude =
        safeNumber(longitude);

      if (
        finalLatitude === null ||
        finalLongitude === null
      ) {
        return res.status(400).json({
          message:
            "Valid latitude and longitude are required.",
        });
      }


      if (
        finalLatitude < -90 ||
        finalLatitude > 90 ||
        finalLongitude < -180 ||
        finalLongitude > 180
      ) {
        return res.status(400).json({
          message:
            "Invalid GPS coordinates.",
        });
      }


      // ==================================================
      // SURVEY TYPE
      // ==================================================

      const validSurveyTypes = [
        "BEFORE",
        "AFTER",
        "MONITORING",
      ];

      const finalSurveyType =
        surveyType ||
        "MONITORING";

      if (
        !validSurveyTypes.includes(
          finalSurveyType
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid survey type. Allowed values: BEFORE, AFTER, MONITORING.",
        });
      }


      // ==================================================
      // FIELD SCORE VALIDATION
      // ==================================================

      const fieldValues = {
        water,
        retention,
        vegetation,
        structure,
        maintenance,
      };

      for (
        const [
          key,
          value,
        ] of Object.entries(
          fieldValues
        )
      ) {
        const number =
          safeNumber(value);

        if (
          number === null
        ) {
          return res.status(400).json({
            message:
              `${key} is required and must be a valid number.`,
          });
        }

        if (
          number < 0 ||
          number > 100
        ) {
          return res.status(400).json({
            message:
              `${key} must be between 0 and 100.`,
          });
        }
      }


      // ==================================================
      // GPS ACCURACY
      // ==================================================

      const finalGpsAccuracy =
        safeNumber(
          gpsAccuracy
        );

      if (
        finalGpsAccuracy !== null &&
        finalGpsAccuracy < 0
      ) {
        return res.status(400).json({
          message:
            "GPS accuracy cannot be negative.",
        });
      }


      // ==================================================
      // FIND PROJECT
      // ==================================================

      const project =
        await Project.findById(
          projectId
        );

      if (!project) {
        return res.status(404).json({
          message:
            "Project not found.",
        });
      }


      // ==================================================
      // PROJECT ACCESS
      // ==================================================

      if (
        !canAccessProject(
          project,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to submit a survey for this project.",
        });
      }


      // ==================================================
      // CALCULATE IMPACT SCORE
      // ==================================================

      const scoreResult =
        calculateCombinedImpactScore({
          water:
            safeNumber(
              water,
              0
            ),

          retention:
            safeNumber(
              retention,
              0
            ),

          vegetation:
            safeNumber(
              vegetation,
              0
            ),

          structure:
            safeNumber(
              structure,
              0
            ),

          maintenance:
            safeNumber(
              maintenance,
              0
            ),

          satelliteNDVI:
            safeNumber(
              satelliteNDVI
            ),
        });


      const impactScore =
        Math.max(
          0,
          Math.min(
            100,
            roundNumber(
              scoreResult?.impactScore,
              2
            ) ?? 0
          )
        );


      const impactStatus =
        getImpactStatus(
          impactScore
        );


      console.log(
        "CALCULATED IMPACT SCORE:",
        impactScore
      );

      console.log(
        "IMPACT STATUS:",
        impactStatus
      );

      console.log(
        "SCORE RESULT:",
        scoreResult
      );


      // ==================================================
      // SATELLITE VALUES
      // ==================================================

      const finalSatelliteNDVI =
        safeNumber(
          satelliteNDVI
        );

      const finalSatelliteNDWI =
        safeNumber(
          satelliteNDWI
        );

      const finalCloudCoverage =
        safeNumber(
          satelliteCloudCoverage
        );


      // ==================================================
      // CREATE SURVEY
      // ==================================================

      const survey =
        await Survey.create({
          projectId,

          userId:
            req.user.id,

          latitude:
            finalLatitude,

          longitude:
            finalLongitude,

          gpsAccuracy:
            finalGpsAccuracy,

          surveyType:
            finalSurveyType,

          water:
            safeNumber(
              water,
              0
            ),

          retention:
            safeNumber(
              retention,
              0
            ),

          vegetation:
            safeNumber(
              vegetation,
              0
            ),

          structure:
            safeNumber(
              structure,
              0
            ),

          maintenance:
            safeNumber(
              maintenance,
              0
            ),

          notes:
            notes || "",

          photos:
            Array.isArray(photos)
              ? photos
              : [],

          // ==============================================
          // IMPACT SCORE
          // ==============================================

          impactScore,

          impactScoreVersion:
            "v2",

          // ==============================================
          // SATELLITE
          // ==============================================

          satelliteNDVI:
            finalSatelliteNDVI,

          satelliteNDVIClassification:
            satelliteNDVIClassification ||
            "",

          satelliteNDWI:
            finalSatelliteNDWI,

          satelliteNDWIClassification:
            satelliteNDWIClassification ||
            "",

          satelliteDate:
            satelliteDate ||
            null,

          satelliteImageUrl:
            satelliteImageUrl ||
            "",

          satelliteTrueColorImageUrl:
            satelliteTrueColorImageUrl ||
            "",

          satelliteSource:
            satelliteSource ||
            "",

          satelliteCloudCoverage:
            finalCloudCoverage,

          // ==============================================
          // VEGETATION SCORE DETAILS
          // ==============================================

          vegetationFieldScore:
            scoreResult
              ?.vegetation
              ?.fieldScore ??
            null,

          vegetationSatelliteScore:
            scoreResult
              ?.vegetation
              ?.satelliteScore ??
            null,

          combinedVegetationScore:
            scoreResult
              ?.vegetation
              ?.combinedScore ??
            null,

          vegetationEvidence:
            scoreResult
              ?.vegetation
              ?.evidence ||
            "FIELD_ONLY",
        });


      // ==================================================
      // PREVIOUS SURVEY
      // ==================================================

      const previousSurvey =
        await Survey.findOne({
          projectId,

          _id: {
            $ne:
              survey._id,
          },
        }).sort({
          createdAt: -1,
        });


      // ==================================================
      // ALERT GENERATION
      // ==================================================

      try {
        await generateProjectAlerts({
          project,
          survey,
          previousSurvey,
        });
      } catch (
        alertError
      ) {
        console.error(
          "Alert generation error:",
          alertError
        );
      }


      // ==================================================
      // UPDATE PROJECT IMPACT SCORE
      // ==================================================

      project.impactScore =
        impactScore;

      project.status =
        impactStatus;

      await project.save();


      // ==================================================
      // RESPONSE
      // ==================================================

      return res.status(201).json({
        message:
          "Survey submitted successfully.",

        survey,

        score: {
          impactScore,

          status:
            impactStatus,

          vegetation:
            scoreResult
              ?.vegetation ||
            null,

          version:
            "v2",
        },
      });

    } catch (error) {
      console.error(
        "Create survey error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to submit survey.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// GET ALL SURVEYS
// ======================================================

router.get(
  "/",
  protect,
  async (req, res) => {
    try {
      let projectFilter = {};

      // ADMIN = ALL PROJECTS
      if (
        req.user.role ===
        "admin"
      ) {
        projectFilter = {};
      }

      // OFFICER
      if (
        req.user.role ===
        "officer"
      ) {
        projectFilter = {
          assignedOfficer:
            req.user.id,
        };
      }

      // FIELD WORKER
      if (
        req.user.role ===
        "field_worker"
      ) {
        projectFilter = {
          assignedWorker:
            req.user.id,
        };
      }

      const projects =
        await Project.find(
          projectFilter
        ).select("_id");

      const projectIds =
        projects.map(
          (project) =>
            project._id
        );

      const surveys =
        await Survey.find({
          projectId: {
            $in:
              projectIds,
          },
        })
          .populate(
            "projectId",
            "name village district type assignedOfficer assignedWorker"
          )
          .populate(
            "userId",
            "name email"
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        count:
          surveys.length,

        surveys,
      });

    } catch (error) {
      console.error(
        "Get surveys error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch surveys.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// GET PROJECT SURVEYS
// ======================================================

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
          message:
            "Project not found.",
        });
      }

      if (
        !canAccessProject(
          project,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to access surveys for this project.",
        });
      }

      const surveys =
        await Survey.find({
          projectId:
            req.params.projectId,
        })
          .populate(
            "userId",
            "name email"
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        count:
          surveys.length,

        surveys,
      });

    } catch (error) {
      console.error(
        "Project surveys error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch project surveys.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// BEFORE / AFTER COMPARISON
// ======================================================

router.get(
  "/comparison/:projectId",
  protect,
  async (req, res) => {
    try {
      const {
        projectId,
      } = req.params;

      const project =
        await Project.findById(
          projectId
        );

      if (!project) {
        return res.status(404).json({
          message:
            "Project not found.",
        });
      }

      if (
        !canAccessProject(
          project,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to compare this project.",
        });
      }


      const surveys =
        await Survey.find({
          projectId,
        }).sort({
          createdAt: 1,
        });


      const {
        before,
        current,
        comparisonType,
      } =
        findComparisonSurveys(
          surveys
        );


      // ==================================================
      // NO DATA
      // ==================================================

      if (
        !before &&
        !current
      ) {
        return res.status(200).json({
          available: false,

          projectId,

          comparisonType:
            "NONE",

          message:
            "No surveys are available for comparison.",

          beforeAvailable: false,

          currentAvailable: false,

          recommendations: [
            "Conduct a BEFORE survey to establish baseline conditions.",
          ],
        });
      }


      // ==================================================
      // INCOMPLETE COMPARISON
      // ==================================================

      if (
        !before ||
        !current
      ) {
        return res.status(200).json({
          available: false,

          projectId,

          comparisonType,

          message:
            "A complete comparison is not available yet.",

          beforeAvailable:
            !!before,

          currentAvailable:
            !!current,

          baseline:
            before
              ? {
                  id:
                    before._id,

                  date:
                    before.createdAt,

                  surveyType:
                    before.surveyType,

                  impactScore:
                    before.impactScore,

                  photos:
                    before.photos ||
                    [],

                  satellite:
                    formatSatelliteData(
                      before
                    ),
                }
              : null,

          current:
            current
              ? {
                  id:
                    current._id,

                  date:
                    current.createdAt,

                  surveyType:
                    current.surveyType,

                  impactScore:
                    current.impactScore,

                  photos:
                    current.photos ||
                    [],

                  satellite:
                    formatSatelliteData(
                      current
                    ),
                }
              : null,

          recommendations: [
            before
              ? "Baseline survey is available. Submit an AFTER or MONITORING survey for comparison."
              : "Current survey is available. A BEFORE survey is recommended for measuring project improvement.",
          ],
        });
      }


      // ==================================================
      // FIELD CHANGES
      // ==================================================

      const waterChange =
        safeNumber(
          current.water,
          0
        ) -
        safeNumber(
          before.water,
          0
        );

      const retentionChange =
        safeNumber(
          current.retention,
          0
        ) -
        safeNumber(
          before.retention,
          0
        );

      const vegetationChange =
        safeNumber(
          current.vegetation,
          0
        ) -
        safeNumber(
          before.vegetation,
          0
        );

      const structureChange =
        safeNumber(
          current.structure,
          0
        ) -
        safeNumber(
          before.structure,
          0
        );

      const maintenanceChange =
        safeNumber(
          current.maintenance,
          0
        ) -
        safeNumber(
          before.maintenance,
          0
        );

      const scoreChange =
        safeNumber(
          current.impactScore,
          0
        ) -
        safeNumber(
          before.impactScore,
          0
        );


      // ==================================================
      // SATELLITE CHANGES
      // ==================================================

      const satelliteNDVIChange =
        before.satelliteNDVI != null &&
        current.satelliteNDVI != null
          ? roundNumber(
              current.satelliteNDVI -
                before.satelliteNDVI,
              3
            )
          : null;

      const satelliteNDWIChange =
        before.satelliteNDWI != null &&
        current.satelliteNDWI != null
          ? roundNumber(
              current.satelliteNDWI -
                before.satelliteNDWI,
              3
            )
          : null;


      const changes = {
        water:
          waterChange,

        retention:
          retentionChange,

        vegetation:
          vegetationChange,

        structure:
          structureChange,

        maintenance:
          maintenanceChange,

        impactScore:
          scoreChange,

        satelliteNDVI:
          satelliteNDVIChange,

        satelliteNDWI:
          satelliteNDWIChange,
      };


      // ==================================================
      // PERFORMANCE
      // ==================================================

      const fieldChanges = [
        waterChange,
        retentionChange,
        vegetationChange,
        structureChange,
        maintenanceChange,
      ];

      const positiveIndicators =
        fieldChanges.filter(
          (value) =>
            value > 0
        ).length;

      const negativeIndicators =
        fieldChanges.filter(
          (value) =>
            value < 0
        ).length;

      let performance =
        "No Improvement";

      if (
        positiveIndicators >= 4
      ) {
        performance =
          "Strong Improvement";
      } else if (
        positiveIndicators >= 3
      ) {
        performance =
          "Good Improvement";
      } else if (
        positiveIndicators >= 1
      ) {
        performance =
          "Limited Improvement";
      }

      if (
        negativeIndicators >= 4
      ) {
        performance =
          "Significant Decline";
      }


      // ==================================================
      // EVIDENCE
      // ==================================================

      const humanEvidenceAvailable =
        !!before.photos?.length ||
        !!current.photos?.length;

      const satelliteEvidenceAvailable =
        before.satelliteNDVI != null ||
        current.satelliteNDVI != null ||
        before.satelliteNDWI != null ||
        current.satelliteNDWI != null ||
        !!before.satelliteImageUrl ||
        !!current.satelliteImageUrl ||
        !!before.satelliteTrueColorImageUrl ||
        !!current.satelliteTrueColorImageUrl;


      // ==================================================
      // RECOMMENDATIONS
      // ==================================================

      const recommendations =
        generateRecommendations({
          before,
          after:
            current,
          changes,
        });


      // ==================================================
      // RESPONSE
      // ==================================================

      return res.status(200).json({
        available: true,

        projectId,

        comparisonType,

        before: {
          id:
            before._id,

          date:
            before.createdAt,

          surveyType:
            before.surveyType,

          impactScore:
            before.impactScore,

          water:
            before.water,

          retention:
            before.retention,

          vegetation:
            before.vegetation,

          structure:
            before.structure,

          maintenance:
            before.maintenance,

          photos:
            before.photos ||
            [],

          satellite:
            formatSatelliteData(
              before
            ),
        },

        after: {
          id:
            current._id,

          date:
            current.createdAt,

          surveyType:
            current.surveyType,

          impactScore:
            current.impactScore,

          water:
            current.water,

          retention:
            current.retention,

          vegetation:
            current.vegetation,

          structure:
            current.structure,

          maintenance:
            current.maintenance,

          photos:
            current.photos ||
            [],

          satellite:
            formatSatelliteData(
              current
            ),
        },

        // Frontend compatibility
        beforeSurvey:
          before,

        afterSurvey:
          current,

        changes,

        comparison: {
          water: {
            before:
              before.water,

            after:
              current.water,

            change:
              waterChange,

            percentage:
              calculatePercentageChange(
                before.water,
                current.water
              ),
          },

          retention: {
            before:
              before.retention,

            after:
              current.retention,

            change:
              retentionChange,

            percentage:
              calculatePercentageChange(
                before.retention,
                current.retention
              ),
          },

          vegetation: {
            before:
              before.vegetation,

            after:
              current.vegetation,

            change:
              vegetationChange,

            percentage:
              calculatePercentageChange(
                before.vegetation,
                current.vegetation
              ),
          },

          structure: {
            before:
              before.structure,

            after:
              current.structure,

            change:
              structureChange,

            percentage:
              calculatePercentageChange(
                before.structure,
                current.structure
              ),
          },

          maintenance: {
            before:
              before.maintenance,

            after:
              current.maintenance,

            change:
              maintenanceChange,

            percentage:
              calculatePercentageChange(
                before.maintenance,
                current.maintenance
              ),
          },

          impactScore: {
            before:
              before.impactScore,

            after:
              current.impactScore,

            change:
              scoreChange,

            percentage:
              calculatePercentageChange(
                before.impactScore,
                current.impactScore
              ),
          },

          satelliteNDVI: {
            before:
              before.satelliteNDVI ??
              null,

            after:
              current.satelliteNDVI ??
              null,

            change:
              satelliteNDVIChange,
          },

          satelliteNDWI: {
            before:
              before.satelliteNDWI ??
              null,

            after:
              current.satelliteNDWI ??
              null,

            change:
              satelliteNDWIChange,
          },
        },

        evidence: {
          humanSurvey:
            humanEvidenceAvailable,

          satellite:
            satelliteEvidenceAvailable,

          combined:
            humanEvidenceAvailable &&
            satelliteEvidenceAvailable,
        },

        positiveIndicators,

        negativeIndicators,

        performance,

        recommendations,
      });

    } catch (error) {
      console.error(
        "Comparison error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to generate comparison.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// ANALYTICS SUMMARY
// ======================================================

router.get(
  "/analytics/summary",
  protect,
  authorizeRoles(
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {
      let projectFilter = {};

      if (
        req.user.role ===
        "officer"
      ) {
        projectFilter = {
          assignedOfficer:
            req.user.id,
        };
      }

      const projects =
        await Project.find(
          projectFilter
        ).select("_id");

      const projectIds =
        projects.map(
          (project) =>
            project._id
        );

      const surveys =
        await Survey.find({
          projectId: {
            $in:
              projectIds,
          },
        });

      const totalSurveys =
        surveys.length;

      if (
        totalSurveys === 0
      ) {
        return res.status(200).json({
          totalSurveys: 0,

          averages: {
            water: 0,
            retention: 0,
            vegetation: 0,
            structure: 0,
            maintenance: 0,
            impactScore: 0,
          },
        });
      }

      const totals =
        surveys.reduce(
          (acc, survey) => {
            acc.water +=
              safeNumber(
                survey.water,
                0
              );

            acc.retention +=
              safeNumber(
                survey.retention,
                0
              );

            acc.vegetation +=
              safeNumber(
                survey.vegetation,
                0
              );

            acc.structure +=
              safeNumber(
                survey.structure,
                0
              );

            acc.maintenance +=
              safeNumber(
                survey.maintenance,
                0
              );

            acc.impactScore +=
              safeNumber(
                survey.impactScore,
                0
              );

            return acc;
          },
          {
            water: 0,
            retention: 0,
            vegetation: 0,
            structure: 0,
            maintenance: 0,
            impactScore: 0,
          }
        );

      return res.status(200).json({
        totalSurveys,

        averages: {
          water:
            roundNumber(
              totals.water /
                totalSurveys,
              1
            ),

          retention:
            roundNumber(
              totals.retention /
                totalSurveys,
              1
            ),

          vegetation:
            roundNumber(
              totals.vegetation /
                totalSurveys,
              1
            ),

          structure:
            roundNumber(
              totals.structure /
                totalSurveys,
              1
            ),

          maintenance:
            roundNumber(
              totals.maintenance /
                totalSurveys,
              1
            ),

          impactScore:
            roundNumber(
              totals.impactScore /
                totalSurveys,
              1
            ),
        },
      });

    } catch (error) {
      console.error(
        "Survey analytics error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load survey analytics.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// PROJECT ANALYTICS
// ======================================================

router.get(
  "/analytics/project/:projectId",
  protect,
  authorizeRoles(
    "field_worker",
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {
      const {
        projectId,
      } = req.params;

      const project =
        await Project.findById(
          projectId
        );

      if (!project) {
        return res.status(404).json({
          message:
            "Project not found.",
        });
      }

      if (
        !canAccessProject(
          project,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to access this project analytics.",
        });
      }

      const surveys =
        await Survey.find({
          projectId,
        }).sort({
          createdAt: 1,
        });

      const {
        before,
        current,
        comparisonType,
      } =
        findComparisonSurveys(
          surveys
        );


      // ==================================================
      // NO COMPLETE COMPARISON
      // ==================================================

      if (
        !before ||
        !current
      ) {
        return res.status(200).json({
          available: false,

          projectId,

          comparisonType,

          message:
            "A complete before/current comparison is not available.",

          beforeSurvey:
            before
              ? {
                  id:
                    before._id,

                  date:
                    before.createdAt,

                  surveyType:
                    before.surveyType,

                  impactScore:
                    before.impactScore,

                  satelliteNDVI:
                    before.satelliteNDVI ??
                    null,

                  satelliteNDWI:
                    before.satelliteNDWI ??
                    null,

                  photos:
                    before.photos ||
                    [],

                  satellite:
                    formatSatelliteData(
                      before
                    ),
                }
              : null,

          afterSurvey:
            current
              ? {
                  id:
                    current._id,

                  date:
                    current.createdAt,

                  surveyType:
                    current.surveyType,

                  impactScore:
                    current.impactScore,

                  satelliteNDVI:
                    current.satelliteNDVI ??
                    null,

                  satelliteNDWI:
                    current.satelliteNDWI ??
                    null,

                  photos:
                    current.photos ||
                    [],

                  satellite:
                    formatSatelliteData(
                      current
                    ),
                }
              : null,
        });
      }


      // ==================================================
      // COMPARISON
      // ==================================================

      const comparison = {
        water: {
          before:
            before.water,

          after:
            current.water,

          change:
            current.water -
            before.water,

          percentage:
            calculatePercentageChange(
              before.water,
              current.water
            ),
        },

        retention: {
          before:
            before.retention,

          after:
            current.retention,

          change:
            current.retention -
            before.retention,

          percentage:
            calculatePercentageChange(
              before.retention,
              current.retention
            ),
        },

        vegetation: {
          before:
            before.vegetation,

          after:
            current.vegetation,

          change:
            current.vegetation -
            before.vegetation,

          percentage:
            calculatePercentageChange(
              before.vegetation,
              current.vegetation
            ),
        },

        structure: {
          before:
            before.structure,

          after:
            current.structure,

          change:
            current.structure -
            before.structure,

          percentage:
            calculatePercentageChange(
              before.structure,
              current.structure
            ),
        },

        maintenance: {
          before:
            before.maintenance,

          after:
            current.maintenance,

          change:
            current.maintenance -
            before.maintenance,

          percentage:
            calculatePercentageChange(
              before.maintenance,
              current.maintenance
            ),
        },

        impactScore: {
          before:
            before.impactScore,

          after:
            current.impactScore,

          change:
            current.impactScore -
            before.impactScore,

          percentage:
            calculatePercentageChange(
              before.impactScore,
              current.impactScore
            ),
        },

        satelliteNDVI: {
          before:
            before.satelliteNDVI ??
            null,

          after:
            current.satelliteNDVI ??
            null,

          change:
            before.satelliteNDVI !=
              null &&
            current.satelliteNDVI !=
              null
              ? roundNumber(
                  current.satelliteNDVI -
                    before.satelliteNDVI,
                  3
                )
              : null,
        },

        satelliteNDWI: {
          before:
            before.satelliteNDWI ??
            null,

          after:
            current.satelliteNDWI ??
            null,

          change:
            before.satelliteNDWI !=
              null &&
            current.satelliteNDWI !=
              null
              ? roundNumber(
                  current.satelliteNDWI -
                    before.satelliteNDWI,
                  3
                )
              : null,
        },
      };


      // ==================================================
      // PERFORMANCE
      // ==================================================

      const improvements = [
        comparison.water.change,
        comparison.retention.change,
        comparison.vegetation.change,
        comparison.structure.change,
        comparison.maintenance.change,
      ];

      const positiveIndicators =
        improvements.filter(
          (value) =>
            value > 0
        ).length;

      const negativeIndicators =
        improvements.filter(
          (value) =>
            value < 0
        ).length;

      let performance =
        "No Improvement";

      if (
        positiveIndicators >= 4
      ) {
        performance =
          "Strong Improvement";
      } else if (
        positiveIndicators >= 3
      ) {
        performance =
          "Good Improvement";
      } else if (
        positiveIndicators >= 1
      ) {
        performance =
          "Limited Improvement";
      }

      if (
        negativeIndicators >= 4
      ) {
        performance =
          "Significant Decline";
      }


      // ==================================================
      // RECOMMENDATIONS
      // ==================================================

      const recommendations =
        generateRecommendations({
          before,
          after:
            current,

          changes: {
            water:
              comparison.water.change,

            retention:
              comparison.retention.change,

            vegetation:
              comparison.vegetation.change,

            structure:
              comparison.structure.change,

            maintenance:
              comparison.maintenance.change,

            impactScore:
              comparison.impactScore.change,

            satelliteNDVI:
              comparison
                .satelliteNDVI
                .change,

            satelliteNDWI:
              comparison
                .satelliteNDWI
                .change,
          },
        });


      // ==================================================
      // EVIDENCE
      // ==================================================

      const humanEvidence =
        !!before.photos?.length ||
        !!current.photos?.length;

      const satelliteEvidence =
        before.satelliteNDVI != null ||
        current.satelliteNDVI != null ||
        before.satelliteNDWI != null ||
        current.satelliteNDWI != null ||
        !!before.satelliteImageUrl ||
        !!current.satelliteImageUrl ||
        !!before.satelliteTrueColorImageUrl ||
        !!current.satelliteTrueColorImageUrl;


      // ==================================================
      // RESPONSE
      // ==================================================

      return res.status(200).json({
        available: true,

        projectId,

        comparisonType,

        beforeSurvey: {
          id:
            before._id,

          date:
            before.createdAt,

          surveyType:
            before.surveyType,

          impactScore:
            before.impactScore,

          water:
            before.water,

          retention:
            before.retention,

          vegetation:
            before.vegetation,

          structure:
            before.structure,

          maintenance:
            before.maintenance,

          photos:
            before.photos ||
            [],

          satelliteNDVI:
            before.satelliteNDVI ??
            null,

          satelliteNDWI:
            before.satelliteNDWI ??
            null,

          satellite:
            formatSatelliteData(
              before
            ),
        },

        afterSurvey: {
          id:
            current._id,

          date:
            current.createdAt,

          surveyType:
            current.surveyType,

          impactScore:
            current.impactScore,

          water:
            current.water,

          retention:
            current.retention,

          vegetation:
            current.vegetation,

          structure:
            current.structure,

          maintenance:
            current.maintenance,

          photos:
            current.photos ||
            [],

          satelliteNDVI:
            current.satelliteNDVI ??
            null,

          satelliteNDWI:
            current.satelliteNDWI ??
            null,

          satellite:
            formatSatelliteData(
              current
            ),
        },

        // Frontend compatibility
        before:
          before,

        after:
          current,

        comparison,

        positiveIndicators,

        negativeIndicators,

        performance,

        evidence: {
          humanSurvey:
            humanEvidence,

          satellite:
            satelliteEvidence,

          combined:
            humanEvidence &&
            satelliteEvidence,
        },

        recommendations,
      });

    } catch (error) {
      console.error(
        "Project comparison analytics error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to calculate project improvement.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// OVERALL IMPROVEMENT ANALYTICS
// ======================================================

router.get(
  "/analytics/improvement",
  protect,
  authorizeRoles(
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {
      let projectFilter = {};

      if (
        req.user.role ===
        "officer"
      ) {
        projectFilter = {
          assignedOfficer:
            req.user.id,
        };
      }

      const projects =
        await Project.find(
          projectFilter
        ).select("_id");

      const projectIds =
        projects.map(
          (project) =>
            project._id
        );

      const surveys =
        await Survey.find({
          projectId: {
            $in:
              projectIds,
          },
        }).sort({
          createdAt: 1,
        });

      const results = [];

      const projectIdStrings =
        [
          ...new Set(
            surveys.map(
              (survey) =>
                survey.projectId.toString()
            )
          ),
        ];

      for (
        const projectId
        of projectIdStrings
      ) {
        const projectSurveys =
          surveys.filter(
            (survey) =>
              survey.projectId.toString() ===
              projectId
          );

        const {
          before,
          current,
          comparisonType,
        } =
          findComparisonSurveys(
            projectSurveys
          );

        if (
          !before ||
          !current
        ) {
          continue;
        }

        results.push({
          projectId,

          comparisonType,

          beforeImpact:
            before.impactScore,

          afterImpact:
            current.impactScore,

          impactChange:
            current.impactScore -
            before.impactScore,

          waterChange:
            current.water -
            before.water,

          retentionChange:
            current.retention -
            before.retention,

          vegetationChange:
            current.vegetation -
            before.vegetation,

          structureChange:
            current.structure -
            before.structure,

          maintenanceChange:
            current.maintenance -
            before.maintenance,

          satelliteNDVIChange:
            before.satelliteNDVI !=
              null &&
            current.satelliteNDVI !=
              null
              ? roundNumber(
                  current.satelliteNDVI -
                    before.satelliteNDVI,
                  3
                )
              : null,

          satelliteNDWIChange:
            before.satelliteNDWI !=
              null &&
            current.satelliteNDWI !=
              null
              ? roundNumber(
                  current.satelliteNDWI -
                    before.satelliteNDWI,
                  3
                )
              : null,
        });
      }


      // ==================================================
      // NO RESULTS
      // ==================================================

      if (
        results.length === 0
      ) {
        return res.status(200).json({
          projectsCompared: 0,

          averages: {
            impactChange: 0,
            waterChange: 0,
            retentionChange: 0,
            vegetationChange: 0,
            structureChange: 0,
            maintenanceChange: 0,
            satelliteNDVIChange: 0,
            satelliteNDWIChange: 0,
          },

          projects: [],
        });
      }


      // ==================================================
      // TOTALS
      // ==================================================

      const totals =
        results.reduce(
          (acc, item) => {
            acc.impactChange +=
              safeNumber(
                item.impactChange,
                0
              );

            acc.waterChange +=
              safeNumber(
                item.waterChange,
                0
              );

            acc.retentionChange +=
              safeNumber(
                item.retentionChange,
                0
              );

            acc.vegetationChange +=
              safeNumber(
                item.vegetationChange,
                0
              );

            acc.structureChange +=
              safeNumber(
                item.structureChange,
                0
              );

            acc.maintenanceChange +=
              safeNumber(
                item.maintenanceChange,
                0
              );

            if (
              item.satelliteNDVIChange !==
              null
            ) {
              acc.satelliteNDVIChange +=
                item.satelliteNDVIChange;

              acc.satelliteNDVICount++;
            }

            if (
              item.satelliteNDWIChange !==
              null
            ) {
              acc.satelliteNDWIChange +=
                item.satelliteNDWIChange;

              acc.satelliteNDWICount++;
            }

            return acc;
          },
          {
            impactChange: 0,
            waterChange: 0,
            retentionChange: 0,
            vegetationChange: 0,
            structureChange: 0,
            maintenanceChange: 0,

            satelliteNDVIChange: 0,
            satelliteNDVICount: 0,

            satelliteNDWIChange: 0,
            satelliteNDWICount: 0,
          }
        );


      const count =
        results.length;


      // ==================================================
      // RESPONSE
      // ==================================================

      return res.status(200).json({
        projectsCompared:
          count,

        averages: {
          impactChange:
            roundNumber(
              totals.impactChange /
                count,
              1
            ),

          waterChange:
            roundNumber(
              totals.waterChange /
                count,
              1
            ),

          retentionChange:
            roundNumber(
              totals.retentionChange /
                count,
              1
            ),

          vegetationChange:
            roundNumber(
              totals.vegetationChange /
                count,
              1
            ),

          structureChange:
            roundNumber(
              totals.structureChange /
                count,
              1
            ),

          maintenanceChange:
            roundNumber(
              totals.maintenanceChange /
                count,
              1
            ),

          satelliteNDVIChange:
            totals.satelliteNDVICount >
            0
              ? roundNumber(
                  totals.satelliteNDVIChange /
                    totals.satelliteNDVICount,
                  3
                )
              : 0,

          satelliteNDWIChange:
            totals.satelliteNDWICount >
            0
              ? roundNumber(
                  totals.satelliteNDWIChange /
                    totals.satelliteNDWICount,
                  3
                )
              : 0,
        },

        projects:
          results,
      });

    } catch (error) {
      console.error(
        "Overall improvement error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to calculate overall improvement.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// GET ONE SURVEY
// ======================================================

router.get(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const survey =
        await Survey.findById(
          req.params.id
        )
          .populate(
            "projectId"
          )
          .populate(
            "userId",
            "name email"
          );

      if (!survey) {
        return res.status(404).json({
          message:
            "Survey not found.",
        });
      }

      if (
        !canAccessProject(
          survey.projectId,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to access this survey.",
        });
      }

      return res.json({
        survey,
      });

    } catch (error) {
      console.error(
        "Get survey error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch survey.",

        error:
          error.message,
      });
    }
  }
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;