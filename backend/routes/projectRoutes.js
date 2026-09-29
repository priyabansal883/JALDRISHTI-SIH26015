const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const Survey = require("../models/Survey");
const SatelliteAnalysis = require("../models/SatelliteAnalysis");

const generateRecommendations =
  require("../utils/recommendationEngine");

const generateProjectAlerts =
  require("../utils/alertEngine");

const generateProjectReport =
  require("../utils/generateProjectReport");

const authorizeRoles =
  require("../middleware/roleMiddleware");

const protect =
  require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// HELPERS
// ======================================================

const canAccessProject = (project, user) => {
  if (!project || !user) {
    return false;
  }

  // ADMIN
  if (user.role === "admin") {
    return true;
  }

  // OFFICER
  if (user.role === "officer") {
    return (
      project.assignedOfficer &&
      project.assignedOfficer.toString() ===
        user.id.toString()
    );
  }

  // FIELD WORKER
  if (user.role === "field_worker") {
    return (
      project.assignedWorker &&
      project.assignedWorker.toString() ===
        user.id.toString()
    );
  }

  return false;
};

// ======================================================
// HELPER: VALIDATE DATE
// ======================================================

const isValidDate = (value) => {
  if (!value) {
    return true;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

// ======================================================
// HELPER: DEADLINE STATUS
// ======================================================

const getDeadlineStatus = (deadline) => {
  if (!deadline) {
    return "NO_DEADLINE";
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();

  if (Number.isNaN(deadlineDate.getTime())) {
    return "NO_DEADLINE";
  }

  if (deadlineDate < now) {
    return "OVERDUE";
  }

  const diff =
    deadlineDate.getTime() - now.getTime();

  const daysRemaining =
    Math.ceil(
      diff /
        (1000 * 60 * 60 * 24)
    );

  if (daysRemaining <= 7) {
    return "DUE_SOON";
  }

  return "ON_TRACK";
};

// ======================================================
// HELPER: BUILD PROJECT RESPONSE
// ======================================================

const buildProjectResponse = (project) => {
  const projectObject =
    project.toObject
      ? project.toObject()
      : project;

  return {
    ...projectObject,

    deadlineStatus:
      getDeadlineStatus(
        projectObject.deadline
      ),
  };
};

// ======================================================
// CREATE PROJECT
// ======================================================

router.post(
  "/",
  protect,
  authorizeRoles("admin", "officer"),
  async (req, res) => {
    try {
      const {
        name,
        village,
        district,
        state,
        type,
        latitude,
        longitude,
        implementationDate,
        deadline,
        description,
        assignedOfficer,
        assignedWorker,
      } = req.body;

      // ==================================================
      // REQUIRED FIELDS
      // ==================================================

      if (!name || !name.trim()) {
        return res.status(400).json({
          message:
            "Project name is required.",
        });
      }

      if (!village || !village.trim()) {
        return res.status(400).json({
          message:
            "Village is required.",
        });
      }

      if (!district || !district.trim()) {
        return res.status(400).json({
          message:
            "District is required.",
        });
      }

      if (!type || !type.trim()) {
        return res.status(400).json({
          message:
            "Project type is required.",
        });
      }

      // ==================================================
      // DATE VALIDATION
      // ==================================================

      if (
        implementationDate &&
        !isValidDate(
          implementationDate
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid implementation date.",
        });
      }

      if (
        deadline &&
        !isValidDate(deadline)
      ) {
        return res.status(400).json({
          message:
            "Invalid deadline date.",
        });
      }

      if (
        implementationDate &&
        deadline
      ) {
        const implementation =
          new Date(
            implementationDate
          );

        const deadlineDate =
          new Date(deadline);

        if (
          deadlineDate <
          implementation
        ) {
          return res.status(400).json({
            message:
              "Deadline cannot be before implementation date.",
          });
        }
      }

      // ==================================================
      // LOCATION VALIDATION
      // ==================================================

      if (
        latitude !== undefined &&
        latitude !== null &&
        latitude !== ""
      ) {
        const lat =
          Number(latitude);

        if (
          Number.isNaN(lat) ||
          lat < -90 ||
          lat > 90
        ) {
          return res.status(400).json({
            message:
              "Invalid latitude.",
          });
        }
      }

      if (
        longitude !== undefined &&
        longitude !== null &&
        longitude !== ""
      ) {
        const lng =
          Number(longitude);

        if (
          Number.isNaN(lng) ||
          lng < -180 ||
          lng > 180
        ) {
          return res.status(400).json({
            message:
              "Invalid longitude.",
          });
        }
      }

      // ==================================================
      // DETERMINE OFFICER
      // ==================================================

      let finalAssignedOfficer =
        assignedOfficer || null;

      if (
        req.user.role ===
        "officer"
      ) {
        finalAssignedOfficer =
          req.user.id;
      }

      // ==================================================
      // VALIDATE OFFICER
      // ==================================================

      if (finalAssignedOfficer) {
        const officer =
          await User.findById(
            finalAssignedOfficer
          );

        if (!officer) {
          return res.status(404).json({
            message:
              "Assigned officer not found.",
          });
        }

        if (
          officer.role !==
          "officer"
        ) {
          return res.status(400).json({
            message:
              "Selected user is not an officer.",
          });
        }
      }

      // ==================================================
      // VALIDATE FIELD WORKER
      // ==================================================

      if (assignedWorker) {
        const worker =
          await User.findById(
            assignedWorker
          );

        if (!worker) {
          return res.status(404).json({
            message:
              "Assigned field worker not found.",
          });
        }

        if (
          worker.role !==
          "field_worker"
        ) {
          return res.status(400).json({
            message:
              "Selected user is not a field worker.",
          });
        }
      }

      // ==================================================
      // CREATE PROJECT
      // ==================================================

      const project =
        await Project.create({
          name: name.trim(),

          village:
            village.trim(),

          district:
            district.trim(),

          state:
            state?.trim() ||
            "Uttar Pradesh",

          type: type.trim(),

          latitude:
            latitude !== undefined &&
            latitude !== ""
              ? Number(latitude)
              : null,

          longitude:
            longitude !== undefined &&
            longitude !== ""
              ? Number(longitude)
              : null,

          implementationDate:
            implementationDate
              ? new Date(
                  implementationDate
                )
              : null,

          deadline:
            deadline
              ? new Date(deadline)
              : null,

          description:
            description?.trim() || "",

          assignedOfficer:
            finalAssignedOfficer,

          assignedWorker:
            assignedWorker || null,
        });

      // ==================================================
      // POPULATE
      // ==================================================

      const populatedProject =
        await Project.findById(
          project._id
        )
          .populate(
            "assignedOfficer",
            "name email district"
          )
          .populate(
            "assignedWorker",
            "name email district"
          );

      // ==================================================
      // RESPONSE
      // ==================================================

      return res.status(201).json({
        success: true,

        message:
          "Project created successfully",

        project:
          buildProjectResponse(
            populatedProject
          ),
      });
    } catch (error) {
      console.error(
        "Create project error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to create project.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GET ALL PROJECTS
// ======================================================

router.get(
  "/",
  protect,
  async (req, res) => {
    try {
      let filter = {};

      if (
        req.user.role ===
        "officer"
      ) {
        filter.assignedOfficer =
          req.user.id;
      }

      if (
        req.user.role ===
        "field_worker"
      ) {
        filter.assignedWorker =
          req.user.id;
      }

      const projects =
        await Project.find(
          filter
        )
          .populate(
            "assignedOfficer",
            "name email district"
          )
          .populate(
            "assignedWorker",
            "name email district"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,

        count:
          projects.length,

        projects:
          projects.map(
            buildProjectResponse
          ),
      });
    } catch (error) {
      console.error(
        "Get projects error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch projects.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GET MY ASSIGNED PROJECTS
// ======================================================

router.get(
  "/assigned/me",
  protect,
  async (req, res) => {
    try {
      let filter = {};

      if (
        req.user.role ===
        "officer"
      ) {
        filter.assignedOfficer =
          req.user.id;
      } else if (
        req.user.role ===
        "field_worker"
      ) {
        filter.assignedWorker =
          req.user.id;
      } else if (
        req.user.role ===
        "admin"
      ) {
        filter = {};
      }

      const projects =
        await Project.find(
          filter
        )
          .populate(
            "assignedOfficer",
            "name email district"
          )
          .populate(
            "assignedWorker",
            "name email district"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,

        count:
          projects.length,

        projects:
          projects.map(
            buildProjectResponse
          ),
      });
    } catch (error) {
      console.error(
        "Assigned projects error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch assigned projects.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// ASSIGN FIELD WORKER
// ======================================================

router.put(
  "/:id/assign",
  protect,
  authorizeRoles(
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {
      const {
        workerId,
      } = req.body;

      if (!workerId) {
        return res.status(400).json({
          message:
            "Worker ID is required.",
        });
      }

      const worker =
        await User.findById(
          workerId
        );

      if (!worker) {
        return res.status(404).json({
          message:
            "Field worker not found.",
        });
      }

      if (
        worker.role !==
        "field_worker"
      ) {
        return res.status(400).json({
          message:
            "Selected user is not a field worker.",
        });
      }

      const project = await Project.findById(req.params.id)
  .populate("assignedOfficer", "name email district")
  .populate("assignedWorker", "name email district");

      if (!project) {
        return res.status(404).json({
          message:
            "Project not found.",
        });
      }

      // OFFICER SECURITY
      if (
        req.user.role ===
        "officer"
      ) {
        if (
          !project.assignedOfficer ||
          project.assignedOfficer.toString() !==
            req.user.id.toString()
        ) {
          return res.status(403).json({
            message:
              "You can only assign workers to your own projects.",
          });
        }
      }

      project.assignedWorker =
        workerId;

      await project.save();

      const populatedProject =
        await Project.findById(
          project._id
        )
          .populate(
            "assignedOfficer",
            "name email district"
          )
          .populate(
            "assignedWorker",
            "name email district"
          );

      return res.status(200).json({
        success: true,

        message:
          "Project assigned successfully.",

        project:
          buildProjectResponse(
            populatedProject
          ),
      });
    } catch (error) {
      console.error(
        "Assign worker error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to assign project.",

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
      let filter = {};

      if (
        req.user.role ===
        "officer"
      ) {
        filter.assignedOfficer =
          req.user.id;
      }

      const projects =
        await Project.find(
          filter
        );

      const totalProjects =
        projects.length;

      const goodProjects =
        projects.filter(
          (p) =>
            Number(
              p.impactScore || 0
            ) >= 75
        ).length;

      const moderateProjects =
        projects.filter(
          (p) => {
            const score =
              Number(
                p.impactScore || 0
              );

            return (
              score >= 50 &&
              score < 75
            );
          }
        ).length;

      const poorProjects =
        projects.filter(
          (p) => {
            const score =
              Number(
                p.impactScore || 0
              );

            return (
              score >= 25 &&
              score < 50
            );
          }
        ).length;

      const criticalProjects =
        projects.filter(
          (p) =>
            Number(
              p.impactScore || 0
            ) < 25
        ).length;

      const totalImpact =
        projects.reduce(
          (sum, project) =>
            sum +
            Number(
              project.impactScore ||
                0
            ),
          0
        );

      const averageImpact =
        totalProjects > 0
          ? totalImpact /
            totalProjects
          : 0;

      const overdueProjects =
        projects.filter(
          (project) =>
            getDeadlineStatus(
              project.deadline
            ) ===
            "OVERDUE"
        ).length;

      const dueSoonProjects =
        projects.filter(
          (project) =>
            getDeadlineStatus(
              project.deadline
            ) ===
            "DUE_SOON"
        ).length;

      return res.status(200).json({
        success: true,

        totalProjects,

        averageImpact:
          Number(
            averageImpact.toFixed(1)
          ),

        statusDistribution: {
          good:
            goodProjects,

          moderate:
            moderateProjects,

          poor:
            poorProjects,

          critical:
            criticalProjects,
        },

        deadlineSummary: {
          overdue:
            overdueProjects,

          dueSoon:
            dueSoonProjects,
        },
      });
    } catch (error) {
      console.error(
        "Analytics error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load analytics.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// DISTRICT ANALYTICS
// ======================================================

router.get(
  "/analytics/district",
  protect,
  authorizeRoles(
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {
      let filter = {};

      if (
        req.user.role ===
        "officer"
      ) {
        filter.assignedOfficer =
          req.user.id;
      }

      const projects =
        await Project.find(
          filter
        );

      const districtMap = {};

      projects.forEach(
        (project) => {
          const district =
            project.district ||
            "Unknown";

          if (
            !districtMap[
              district
            ]
          ) {
            districtMap[
              district
            ] = {
              district,

              totalProjects: 0,

              good: 0,

              moderate: 0,

              poor: 0,

              critical: 0,

              totalImpactScore: 0,

              overdue: 0,

              dueSoon: 0,
            };
          }

          const item =
            districtMap[district];

          item.totalProjects +=
            1;

          item.totalImpactScore +=
            Number(
              project.impactScore ||
                0
            );

          const score =
            Number(
              project.impactScore ||
                0
            );

          if (
            score >= 75
          ) {
            item.good++;
          } else if (
            score >= 50
          ) {
            item.moderate++;
          } else if (
            score >= 25
          ) {
            item.poor++;
          } else {
            item.critical++;
          }

          const deadlineStatus =
            getDeadlineStatus(
              project.deadline
            );

          if (
            deadlineStatus ===
            "OVERDUE"
          ) {
            item.overdue++;
          }

          if (
            deadlineStatus ===
            "DUE_SOON"
          ) {
            item.dueSoon++;
          }
        }
      );

      const districts =
        Object.values(
          districtMap
        ).map((item) => ({
          ...item,

          averageImpactScore:
            item.totalProjects >
            0
              ? Number(
                  (
                    item.totalImpactScore /
                    item.totalProjects
                  ).toFixed(1)
                )
              : 0,
        }));

      return res.status(200).json({
        success: true,

        districts,
      });
    } catch (error) {
      console.error(
        "District analytics error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch district analytics.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// DASHBOARD ANALYTICS
// ======================================================

router.get(
  "/analytics/dashboard",
  protect,
  authorizeRoles(
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {
      let filter = {};

      if (
        req.user.role ===
        "officer"
      ) {
        filter.assignedOfficer =
          req.user.id;
      }

      const projects =
        await Project.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .lean();

      const totalProjects =
        projects.length;

      let good = 0;
      let moderate = 0;
      let poor = 0;
      let critical = 0;

      let totalImpact = 0;

      let overdue = 0;
      let dueSoon = 0;

      projects.forEach(
        (project) => {
          const score =
            Number(
              project.impactScore ||
                0
            );

          totalImpact += score;

          if (
            score >= 75
          ) {
            good++;
          } else if (
            score >= 50
          ) {
            moderate++;
          } else if (
            score >= 25
          ) {
            poor++;
          } else {
            critical++;
          }

          const deadlineStatus =
            getDeadlineStatus(
              project.deadline
            );

          if (
            deadlineStatus ===
            "OVERDUE"
          ) {
            overdue++;
          }

          if (
            deadlineStatus ===
            "DUE_SOON"
          ) {
            dueSoon++;
          }
        }
      );

      const averageImpactScore =
        totalProjects > 0
          ? Number(
              (
                totalImpact /
                totalProjects
              ).toFixed(1)
            )
          : 0;

      const priorityProjects =
        projects
          .filter(
            (project) =>
              Number(
                project.impactScore ||
                  0
              ) < 50
          )
          .sort(
            (a, b) =>
              Number(
                a.impactScore ||
                  0
              ) -
              Number(
                b.impactScore ||
                  0
              )
          )
          .slice(0, 10)
          .map(
            buildProjectResponse
          );

      return res.status(200).json({
        success: true,

        summary: {
          totalProjects,

          averageImpactScore,

          good,

          moderate,

          poor,

          critical,

          priorityCount:
            priorityProjects.length,

          overdue,

          dueSoon,
        },

        priorityProjects,
      });
    } catch (error) {
      console.error(
        "Dashboard analytics error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load dashboard analytics.",
      });
    }
  }
);

// ============================================================
// PROJECT-WISE WATERSHED INDICATORS
// ============================================================

router.get(
  "/analytics/watershed-indicators",
  protect,
  authorizeRoles(
    "admin",
    "officer"
  ),
  async (req, res) => {
    try {
      let projectFilter = {};

      // Officer → only own projects
      if (
        req.user.role ===
        "officer"
      ) {
        projectFilter.assignedOfficer =
          req.user.id;
      }

      const projects =
        await Project.find(
          projectFilter
        )
          .populate(
            "assignedOfficer",
            "name email district"
          )
          .populate(
            "assignedWorker",
            "name email district"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      if (!projects.length) {
        return res.status(200).json({
          success: true,

          count: 0,

          projects: [],
        });
      }

      // ==================================================
      // GET ALL SURVEYS
      // ==================================================

      const projectIds =
        projects.map(
          (project) =>
            project._id
        );

      const surveys =
        await Survey.find({
          projectId: {
            $in: projectIds,
          },
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      // ==================================================
      // SURVEY MAP
      // ==================================================

      const surveyMap = {};

      surveys.forEach(
        (survey) => {
          const projectId =
            String(
              survey.projectId
            );

          if (
            !surveyMap[
              projectId
            ]
          ) {
            surveyMap[
              projectId
            ] = [];
          }

          surveyMap[
            projectId
          ].push(survey);
        }
      );

      // ==================================================
      // BUILD RESULT
      // ==================================================

      const result =
        projects.map(
          (project) => {
            const projectId =
              String(
                project._id
              );

            const projectSurveys =
              surveyMap[
                projectId
              ] || [];

            const latestSurvey =
              projectSurveys[0] ||
              null;

            const beforeSurvey =
              projectSurveys.find(
                (survey) =>
                  String(
                    survey.surveyType ||
                      ""
                  )
                    .trim()
                    .toUpperCase() ===
                  "BEFORE"
              ) || null;

            const afterSurvey =
              projectSurveys.find(
                (survey) =>
                  String(
                    survey.surveyType ||
                      ""
                  )
                    .trim()
                    .toUpperCase() ===
                  "AFTER"
              ) || null;

            // =================================================
            // NO SURVEY
            // =================================================

            if (!latestSurvey) {
              return {
                projectId:
                  project._id,

                projectName:
                  project.name,

                village:
                  project.village ||
                  "",

                district:
                  project.district ||
                  "",

                state:
                  project.state ||
                  "",

                latitude:
                  project.latitude ||
                  null,

                longitude:
                  project.longitude ||
                  null,

                implementationDate:
                  project.implementationDate ||
                  null,

                deadline:
                  project.deadline ||
                  null,

                deadlineStatus:
                  getDeadlineStatus(
                    project.deadline
                  ),

                impactScore:
                  Number(
                    project.impactScore ||
                      0
                  ),

                status:
                  project.status ||
                  "NO SURVEY",

                indicators: {
                  waterAvailability: 0,

                  waterRetention: 0,

                  vegetation: 0,

                  structureCondition: 0,

                  maintenance: 0,
                },

                before: null,

                after: null,

                surveyType: null,

                surveyDate: null,

                surveyCount:
                  projectSurveys.length,

                assignedOfficer:
                  project.assignedOfficer
                    ?.name ||
                  "Not assigned",

                assignedWorker:
                  project.assignedWorker
                    ?.name ||
                  "Not assigned",
              };
            }

            // =================================================
            // CURRENT INDICATORS
            // =================================================

            const indicators = {
              waterAvailability:
                Number(
                  latestSurvey.water ||
                    0
                ),

              waterRetention:
                Number(
                  latestSurvey.retention ||
                    0
                ),

              vegetation:
                Number(
                  latestSurvey.vegetation ||
                    0
                ),

              structureCondition:
                Number(
                  latestSurvey.structure ||
                    0
                ),

              maintenance:
                Number(
                  latestSurvey.maintenance ||
                    0
                ),
            };

            // =================================================
            // BEFORE
            // =================================================

            const before =
              beforeSurvey
                ? {
                    waterAvailability:
                      Number(
                        beforeSurvey.water ||
                          0
                      ),

                    waterRetention:
                      Number(
                        beforeSurvey.retention ||
                          0
                      ),

                    vegetation:
                      Number(
                        beforeSurvey.vegetation ||
                          0
                      ),

                    structureCondition:
                      Number(
                        beforeSurvey.structure ||
                          0
                      ),

                    maintenance:
                      Number(
                        beforeSurvey.maintenance ||
                          0
                      ),

                    impactScore:
                      Number(
                        beforeSurvey.impactScore ||
                          0
                      ),

                    date:
                      beforeSurvey.createdAt ||
                      null,
                  }
                : null;

            // =================================================
            // AFTER
            // =================================================

            const after =
              afterSurvey
                ? {
                    waterAvailability:
                      Number(
                        afterSurvey.water ||
                          0
                      ),

                    waterRetention:
                      Number(
                        afterSurvey.retention ||
                          0
                      ),

                    vegetation:
                      Number(
                        afterSurvey.vegetation ||
                          0
                      ),

                    structureCondition:
                      Number(
                        afterSurvey.structure ||
                          0
                      ),

                    maintenance:
                      Number(
                        afterSurvey.maintenance ||
                          0
                      ),

                    impactScore:
                      Number(
                        afterSurvey.impactScore ||
                          0
                      ),

                    date:
                      afterSurvey.createdAt ||
                      null,
                  }
                : null;

            // =================================================
            // IMPACT SCORE
            // =================================================

            const impactScore =
              Number(
                project.impactScore ??
                  latestSurvey.impactScore ??
                  0
              );

            // =================================================
            // STATUS
            // =================================================

            let status =
              project.status;

            if (!status) {
              if (
                impactScore >=
                75
              ) {
                status = "Good";
              } else if (
                impactScore >=
                50
              ) {
                status =
                  "Moderate";
              } else if (
                impactScore >=
                25
              ) {
                status = "Poor";
              } else {
                status =
                  "Critical";
              }
            }

            // =================================================
            // RETURN
            // =================================================

            return {
              projectId:
                project._id,

              projectName:
                project.name,

              village:
                project.village ||
                "",

              district:
                project.district ||
                "",

              state:
                project.state ||
                "",

              latitude:
                project.latitude ||
                null,

              longitude:
                project.longitude ||
                null,

              implementationDate:
                project.implementationDate ||
                null,

              deadline:
                project.deadline ||
                null,

              deadlineStatus:
                getDeadlineStatus(
                  project.deadline
                ),

              impactScore,

              status,

              indicators,

              before,

              after,

              surveyType:
                latestSurvey.surveyType ||
                "MONITORING",

              surveyDate:
                latestSurvey.createdAt ||
                null,

              surveyCount:
                projectSurveys.length,

              assignedOfficer:
                project.assignedOfficer
                  ?.name ||
                "Not assigned",

              assignedWorker:
                project.assignedWorker
                  ?.name ||
                "Not assigned",
            };
          }
        );

      return res.status(200).json({
        success: true,

        count:
          result.length,

        projects:
          result,
      });
    } catch (error) {
      console.error(
        "Project-wise watershed indicators error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load watershed indicators.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GENERATE PROJECT PDF REPORT
// ======================================================

// ======================================================
// GENERATE PROJECT PDF REPORT
// ======================================================

router.get("/:id/report", protect, async (req, res) => {
  try {
    console.log("=================================");
    console.log("GENERATING PROJECT REPORT");
    console.log("Project ID:", req.params.id);
    console.log("=================================");

    // ==================================================
    // GET PROJECT
    // ==================================================

    const project = await Project.findById(req.params.id)
      .populate("assignedOfficer", "name email district")
      .populate("assignedWorker", "name email district");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    console.log("Project found:", project.name);

    // ==================================================
    // GET FIELD SURVEYS
    // ==================================================
    //
    // IMPORTANT:
    // Your other routes use `projectId`, so use projectId here
    // as well.
    //

    const surveys = await Survey.find({
      projectId: project._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log("Total surveys:", surveys.length);

    const beforeSurvey =
      surveys.find(
        (survey) =>
          String(survey.surveyType || "")
            .trim()
            .toUpperCase() === "BEFORE"
      ) || null;

    const afterSurvey =
      surveys.find(
        (survey) =>
          String(survey.surveyType || "")
            .trim()
            .toUpperCase() === "AFTER"
      ) || null;

    console.log("Before survey:", !!beforeSurvey);
    console.log("After survey:", !!afterSurvey);

    // ==================================================
    // GET SATELLITE ANALYSES
    // ==================================================

    const satelliteAnalyses =
      await SatelliteAnalysis.find({
        projectId: project._id,
      })
        .sort({ satelliteDate: 1 })
        .lean();

    console.log(
      "Satellite analyses:",
      satelliteAnalyses.length
    );

    const beforeSatellite =
      satelliteAnalyses.find(
        (satellite) =>
          String(satellite.analysisType || "")
            .trim()
            .toUpperCase() === "BEFORE"
      ) || null;

    const afterSatellite =
      satelliteAnalyses.find(
        (satellite) =>
          String(satellite.analysisType || "")
            .trim()
            .toUpperCase() === "AFTER"
      ) || null;

    console.log(
      "Before satellite:",
      !!beforeSatellite
    );

    console.log(
      "After satellite:",
      !!afterSatellite
    );
// ============================================================
// SATELLITE DATE HELPERS
// ============================================================

const getSatelliteDate = (satellite) => {
  if (!satellite) return null;

  // Try all commonly used satellite date fields
  const rawDate =
    satellite.satelliteDate ||
    satellite.analysisDate ||
    satellite.acquisitionDate ||
    satellite.date ||
    satellite.imageDate ||
    satellite.captureDate ||
    satellite.createdAt ||
    null;

  if (!rawDate) return null;

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return String(rawDate);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const beforeSatelliteDate =
  getSatelliteDate(beforeSatellite);

const afterSatelliteDate =
  getSatelliteDate(afterSatellite);
    // ==================================================
    // GENERATE RECOMMENDATIONS
    // ==================================================

    let recommendations = [];

    if (
      typeof generateRecommendations ===
      "function"
    ) {
      recommendations =
        generateRecommendations({
          project,
          beforeSurvey,
          afterSurvey,
          beforeSatellite,
          afterSatellite,
        });
    }

    // In case recommendationEngine returns a Promise
    if (
      recommendations &&
      typeof recommendations.then ===
        "function"
    ) {
      recommendations =
        await recommendations;
    }

    console.log(
      "Recommendations generated:",
      Array.isArray(recommendations)
        ? recommendations.length
        : "object"
    );

    // ==================================================
    // GENERATE PDF REPORT
    // ==================================================

    await generateProjectReport({
      project,
      beforeSurvey,
      afterSurvey,
      beforeSatellite,
      afterSatellite,
      satelliteAnalyses,
      recommendations,
      res,
    });

    console.log(
      "PROJECT REPORT GENERATED SUCCESSFULLY"
    );
  } catch (error) {
    console.error("=================================");
    console.error("REPORT GENERATION FAILED");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("=================================");

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to generate project report",
        error: error.message,
      });
    }

    if (!res.writableEnded) {
      res.end();
    }
  }
});

// ======================================================
// GET SINGLE PROJECT
// ======================================================

router.get(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const project =
        await Project.findById(
          req.params.id
        )
          .populate(
            "assignedOfficer",
            "name email district"
          )
          .populate(
            "assignedWorker",
            "name email district"
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
            "You are not allowed to access this project.",
        });
      }

      // ==================================================
      // GET SURVEY COUNT
      // ==================================================

      const surveyCount =
        await Survey.countDocuments({
          projectId:
            project._id,
        });

      return res.json({
        success: true,

        project:
          buildProjectResponse(
            project
          ),

        surveyCount,
      });
    } catch (error) {
      console.error(
        "Get project error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch project.",
      });
    }
  }
);

// ======================================================
// UPDATE PROJECT
// ======================================================

router.put(
  "/:id",
  protect,
  authorizeRoles(
    "admin",
    "officer"
  ),
  async (req, res) => {
    try {
      const project =
        await Project.findById(
          req.params.id
        );

      if (!project) {
        return res.status(404).json({
          message:
            "Project not found.",
        });
      }

      // ==================================================
      // OFFICER SECURITY
      // ==================================================

      if (
        req.user.role ===
        "officer"
      ) {
        if (
          !project.assignedOfficer ||
          project.assignedOfficer.toString() !==
            req.user.id.toString()
        ) {
          return res.status(403).json({
            message:
              "You can only update your own projects.",
          });
        }
      }

      // ==================================================
      // CREATE SAFE UPDATE OBJECT
      // ==================================================

      const allowedFields = [
        "name",
        "village",
        "district",
        "state",
        "type",
        "latitude",
        "longitude",
        "implementationDate",
        "deadline",
        "description",
        "assignedWorker",
      ];

      // Admin can change officer
      if (
        req.user.role ===
        "admin"
      ) {
        allowedFields.push(
          "assignedOfficer"
        );
      }

      const updateData = {};

      allowedFields.forEach(
        (field) => {
          if (
            req.body[field] !==
            undefined
          ) {
            updateData[field] =
              req.body[field];
          }
        }
      );

      // ==================================================
      // BASIC VALIDATION
      // ==================================================

      if (
        updateData.name !==
          undefined &&
        !String(
          updateData.name
        ).trim()
      ) {
        return res.status(400).json({
          message:
            "Project name cannot be empty.",
        });
      }

      if (
        updateData.implementationDate !==
          undefined &&
        updateData.implementationDate &&
        !isValidDate(
          updateData.implementationDate
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid implementation date.",
        });
      }

      if (
        updateData.deadline !==
          undefined &&
        updateData.deadline &&
        !isValidDate(
          updateData.deadline
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid deadline date.",
        });
      }

      // ==================================================
      // DEADLINE VALIDATION
      // ==================================================

      const finalImplementationDate =
        updateData.implementationDate !==
        undefined
          ? updateData.implementationDate
          : project.implementationDate;

      const finalDeadline =
        updateData.deadline !==
        undefined
          ? updateData.deadline
          : project.deadline;

      if (
        finalImplementationDate &&
        finalDeadline
      ) {
        const implementation =
          new Date(
            finalImplementationDate
          );

        const deadline =
          new Date(
            finalDeadline
          );

        if (
          deadline <
          implementation
        ) {
          return res.status(400).json({
            message:
              "Deadline cannot be before implementation date.",
          });
        }
      }

      // ==================================================
      // LOCATION VALIDATION
      // ==================================================

      if (
        updateData.latitude !==
          undefined &&
        updateData.latitude !==
          null &&
        updateData.latitude !==
          ""
      ) {
        const lat =
          Number(
            updateData.latitude
          );

        if (
          Number.isNaN(lat) ||
          lat < -90 ||
          lat > 90
        ) {
          return res.status(400).json({
            message:
              "Invalid latitude.",
          });
        }

        updateData.latitude =
          lat;
      }

      if (
        updateData.longitude !==
          undefined &&
        updateData.longitude !==
          null &&
        updateData.longitude !==
          ""
      ) {
        const lng =
          Number(
            updateData.longitude
          );

        if (
          Number.isNaN(lng) ||
          lng < -180 ||
          lng > 180
        ) {
          return res.status(400).json({
            message:
              "Invalid longitude.",
          });
        }

        updateData.longitude =
          lng;
      }

      // ==================================================
      // DATE CONVERSION
      // ==================================================

      if (
        updateData.implementationDate
      ) {
        updateData.implementationDate =
          new Date(
            updateData.implementationDate
          );
      }

      if (
        updateData.deadline
      ) {
        updateData.deadline =
          new Date(
            updateData.deadline
          );
      }

      // ==================================================
      // VALIDATE ASSIGNED WORKER
      // ==================================================

      if (
        updateData.assignedWorker !==
          undefined &&
        updateData.assignedWorker
      ) {
        const worker =
          await User.findById(
            updateData.assignedWorker
          );

        if (!worker) {
          return res.status(404).json({
            message:
              "Assigned field worker not found.",
          });
        }

        if (
          worker.role !==
          "field_worker"
        ) {
          return res.status(400).json({
            message:
              "Assigned user must be a field worker.",
          });
        }
      }

      // ==================================================
      // VALIDATE ASSIGNED OFFICER
      // ==================================================

      if (
        updateData.assignedOfficer !==
          undefined &&
        updateData.assignedOfficer
      ) {
        const officer =
          await User.findById(
            updateData.assignedOfficer
          );

        if (!officer) {
          return res.status(404).json({
            message:
              "Assigned officer not found.",
          });
        }

        if (
          officer.role !==
          "officer"
        ) {
          return res.status(400).json({
            message:
              "Assigned user must be an officer.",
          });
        }
      }

      // ==================================================
      // TRIM STRINGS
      // ==================================================

      [
        "name",
        "village",
        "district",
        "state",
        "type",
        "description",
      ].forEach((field) => {
        if (
          updateData[field] !==
          undefined
        ) {
          updateData[field] =
            String(
              updateData[field]
            ).trim();
        }
      });

      // ==================================================
      // UPDATE
      // ==================================================

      const updatedProject =
        await Project.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            "assignedOfficer",
            "name email district"
          )
          .populate(
            "assignedWorker",
            "name email district"
          );

      return res.json({
        success: true,

        message:
          "Project updated successfully",

        project:
          buildProjectResponse(
            updatedProject
          ),
      });
    } catch (error) {
      console.error(
        "Update project error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update project.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// DELETE PROJECT
// ======================================================

router.delete(
  "/:id",
  protect,
  authorizeRoles(
    "admin",
    "officer"
  ),
  async (req, res) => {
    try {
      const project =
        await Project.findById(
          req.params.id
        );

      if (!project) {
        return res.status(404).json({
          message:
            "Project not found.",
        });
      }

      // ==================================================
      // OFFICER SECURITY
      // ==================================================

      if (
        req.user.role ===
        "officer"
      ) {
        if (
          !project.assignedOfficer ||
          project.assignedOfficer.toString() !==
            req.user.id.toString()
        ) {
          return res.status(403).json({
            message:
              "You can only delete your own projects.",
          });
        }
      }

      // ==================================================
      // DELETE RELATED SURVEYS
      // ==================================================

      await Survey.deleteMany({
        projectId:
          project._id,
      });

      // ==================================================
      // DELETE RELATED SATELLITE RECORDS
      // ==================================================

      await SatelliteAnalysis.deleteMany(
        {
          projectId:
            project._id,
        }
      );

      // ==================================================
      // DELETE PROJECT
      // ==================================================

      await Project.findByIdAndDelete(
        req.params.id
      );

      return res.json({
        success: true,

        message:
          "Project and related records deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete project error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to delete project.",

        error:
          error.message,
      });
    }
  }
);

module.exports = router;