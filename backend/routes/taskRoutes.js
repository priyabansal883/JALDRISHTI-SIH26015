const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const Project = require("../models/Project");
const Survey = require("../models/Survey");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const populateTask = (query) => {
  return query
    .populate(
      "projectId",
      "name village district state impactScore status latitude longitude"
    )
    .populate(
      "assignedBy",
      "name email role district"
    )
    .populate(
      "assignedTo",
      "name email role district"
    )
    .populate(
  "surveyId",
  `
    surveyType
    impactScore
    status
    createdAt
    updatedAt
    gpsAccuracy
    latitude
    longitude
    water
    retention
    vegetation
    structure
    maintenance
    notes
    photos
    satelliteNDVI
    satelliteNDVIClassification
  `
)
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ============================================================
// CREATE TASK
// POST /api/tasks/assign
// ADMIN / OFFICER
// ============================================================

router.post(
  "/assign",
  protect,
  authorizeRoles("admin", "officer"),
  async (req, res) => {
    try {
      const {
        projectId,
        assignedTo,
        surveyType,
        title,
        description,
        deadline,
        priority,
        officerNotes,
      } = req.body;

      // ------------------------------------------------------
      // VALIDATION
      // ------------------------------------------------------

      if (!projectId) {
        return res.status(400).json({
          message: "Project is required.",
        });
      }

      if (!isValidObjectId(projectId)) {
        return res.status(400).json({
          message: "Invalid project ID.",
        });
      }

      if (!assignedTo) {
        return res.status(400).json({
          message: "Field worker is required.",
        });
      }

      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          message: "Invalid field worker ID.",
        });
      }

      if (!title?.trim()) {
        return res.status(400).json({
          message: "Task title is required.",
        });
      }

      // ------------------------------------------------------
      // CHECK PROJECT
      // ------------------------------------------------------

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found.",
        });
      }

      // ------------------------------------------------------
      // CREATE TASK
      // ------------------------------------------------------

      const task = await Task.create({
        projectId,
        assignedBy: getUserId(req),
        assignedTo,
        surveyType: surveyType || "MONITORING",
        title: title.trim(),
        description: description || "",
        deadline: deadline || null,
        priority: priority || "MEDIUM",
        officerNotes: officerNotes || "",
        status: "PENDING",
      });

      const populatedTask = await populateTask(
        Task.findById(task._id)
      );

      res.status(201).json({
        message: "Task assigned successfully.",
        task: populatedTask,
      });
    } catch (error) {
      console.error("Create task error:", error);

      res.status(500).json({
        message: "Failed to create task.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET MY TASKS
// GET /api/tasks/my-tasks
//
// FIELD WORKER:
// assignedTo = current user
//
// OFFICER:
// assignedBy = current user
//
// ADMIN:
// all tasks
// ============================================================

router.get(
  "/my-tasks",
  protect,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      let filter = {};

      if (req.user.role === "field_worker") {
        filter.assignedTo = userId;
      } else if (req.user.role === "officer") {
        filter.assignedBy = userId;
      } else if (req.user.role === "admin") {
        filter = {};
      } else {
        return res.status(403).json({
          message: "Unauthorized.",
        });
      }

      const tasks = await populateTask(
        Task.find(filter).sort({
          createdAt: -1,
        })
      );

      res.json({
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      console.error("My tasks error:", error);

      res.status(500).json({
        message: "Failed to load tasks.",
      });
    }
  }
);

// ============================================================
// ADMIN - ALL TASKS
//
// GET /api/tasks/admin/all
//
// This is the main endpoint for Admin Task Management.
// ============================================================

router.get(
  "/admin/all",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const {
        status,
        priority,
        surveyType,
        assignedTo,
        assignedBy,
        projectId,
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (priority && priority !== "all") {
        filter.priority = priority;
      }

      if (surveyType && surveyType !== "all") {
        filter.surveyType = surveyType;
      }

      if (assignedTo && isValidObjectId(assignedTo)) {
        filter.assignedTo = assignedTo;
      }

      if (assignedBy && isValidObjectId(assignedBy)) {
        filter.assignedBy = assignedBy;
      }

      if (projectId && isValidObjectId(projectId)) {
        filter.projectId = projectId;
      }

      const tasks = await populateTask(
        Task.find(filter).sort({
          createdAt: -1,
        })
      );

      const now = new Date();

      // ------------------------------------------------------
      // TASK STATS
      // ------------------------------------------------------

      const stats = {
        total: tasks.length,

        pending: tasks.filter(
          (t) => t.status === "PENDING"
        ).length,

        accepted: tasks.filter(
          (t) => t.status === "ACCEPTED"
        ).length,

        inProgress: tasks.filter(
          (t) => t.status === "IN_PROGRESS"
        ).length,

        completed: tasks.filter(
          (t) => t.status === "COMPLETED"
        ).length,

        rejected: tasks.filter(
          (t) => t.status === "REJECTED"
        ).length,

        cancelled: tasks.filter(
          (t) => t.status === "CANCELLED"
        ).length,

        highPriority: tasks.filter(
          (t) =>
            t.priority === "HIGH" ||
            t.priority === "CRITICAL"
        ).length,

        overdue: tasks.filter(
          (t) =>
            t.deadline &&
            new Date(t.deadline) < now &&
            !["COMPLETED", "CANCELLED"].includes(
              t.status
            )
        ).length,
      };

      res.json({
        count: tasks.length,
        tasks,
        stats,
      });
    } catch (error) {
      console.error("Admin tasks error:", error);

      res.status(500).json({
        message: "Failed to load admin tasks.",
      });
    }
  }
);

// ============================================================
// ADMIN DASHBOARD SUMMARY
//
// GET /api/tasks/admin/summary
//
// Gives:
// - overall task stats
// - worker performance
// - officer performance
// - project performance
// - recent tasks
// - overdue tasks
// ============================================================
// ============================================================
// PROJECT TASKS
// GET /api/tasks/project/:projectId
//
// Shows all tasks belonging to one watershed project.
// Used by ProjectDetailsScreen.
// ============================================================

router.get(
  "/project/:projectId",
  protect,
  authorizeRoles("admin", "officer", "field_worker"),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      // --------------------------------------------------------
      // CHECK PROJECT
      // --------------------------------------------------------

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found.",
        });
      }

      // --------------------------------------------------------
      // GET PROJECT TASKS
      // --------------------------------------------------------

      const tasks = await populateTask(
        Task.find({
          projectId,
        }).sort({
          createdAt: -1,
        })
      );

      // --------------------------------------------------------
      // STATUS COUNTS
      // --------------------------------------------------------

      const stats = {
        total: tasks.length,

        pending: tasks.filter(
          (task) => task.status === "PENDING"
        ).length,

        active: tasks.filter(
          (task) =>
            task.status === "ACCEPTED" ||
            task.status === "IN_PROGRESS"
        ).length,

        accepted: tasks.filter(
          (task) => task.status === "ACCEPTED"
        ).length,

        inProgress: tasks.filter(
          (task) => task.status === "IN_PROGRESS"
        ).length,

        completed: tasks.filter(
          (task) => task.status === "COMPLETED"
        ).length,

        rejected: tasks.filter(
          (task) => task.status === "REJECTED"
        ).length,

        cancelled: tasks.filter(
          (task) => task.status === "CANCELLED"
        ).length,
      };

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      res.json({
        success: true,
        projectId,
        count: tasks.length,
        stats,
        tasks,
      });
    } catch (error) {
      console.error(
        "Project tasks error:",
        error
      );

      res.status(500).json({
        message: "Failed to load project tasks.",
        error: error.message,
      });
    }
  }
);
router.get(
  "/admin/summary",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const tasks = await Task.find({})
        .populate(
          "assignedTo",
          "name email role district"
        )
        .populate(
          "assignedBy",
          "name email role district"
        )
        .populate(
          "projectId",
          "name village district state impactScore status"
        )
        .populate(
          "surveyId",
          "surveyType impactScore status createdAt"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const now = new Date();

      // ======================================================
      // OVERALL SUMMARY
      // ======================================================

      const total = tasks.length;

      const pending = tasks.filter(
        (t) => t.status === "PENDING"
      ).length;

      const accepted = tasks.filter(
        (t) => t.status === "ACCEPTED"
      ).length;

      const inProgress = tasks.filter(
        (t) => t.status === "IN_PROGRESS"
      ).length;

      const completed = tasks.filter(
        (t) => t.status === "COMPLETED"
      ).length;

      const rejected = tasks.filter(
        (t) => t.status === "REJECTED"
      ).length;

      const cancelled = tasks.filter(
        (t) => t.status === "CANCELLED"
      ).length;

      const active = tasks.filter(
        (t) =>
          t.status === "ACCEPTED" ||
          t.status === "IN_PROGRESS"
      ).length;

      const overdueTasks = tasks.filter(
        (t) =>
          t.deadline &&
          new Date(t.deadline) < now &&
          !["COMPLETED", "CANCELLED"].includes(
            t.status
          )
      );

      // ======================================================
      // WORKER PERFORMANCE
      // ======================================================

      const workerMap = {};

      tasks.forEach((task) => {
        if (!task.assignedTo) return;

        const workerId =
          task.assignedTo._id.toString();

        if (!workerMap[workerId]) {
          workerMap[workerId] = {
            worker: task.assignedTo,

            totalTasks: 0,

            pending: 0,

            accepted: 0,

            inProgress: 0,

            completed: 0,

            rejected: 0,

            cancelled: 0,

            overdue: 0,
          };
        }

        const worker = workerMap[workerId];

        worker.totalTasks++;

        if (task.status === "PENDING") {
          worker.pending++;
        }

        if (task.status === "ACCEPTED") {
          worker.accepted++;
        }

        if (task.status === "IN_PROGRESS") {
          worker.inProgress++;
        }

        if (task.status === "COMPLETED") {
          worker.completed++;
        }

        if (task.status === "REJECTED") {
          worker.rejected++;
        }

        if (task.status === "CANCELLED") {
          worker.cancelled++;
        }

        if (
          task.deadline &&
          new Date(task.deadline) < now &&
          !["COMPLETED", "CANCELLED"].includes(
            task.status
          )
        ) {
          worker.overdue++;
        }
      });

      const workerPerformance =
        Object.values(workerMap).map((item) => ({
          ...item,

          completionRate:
            item.totalTasks > 0
              ? Number(
                  (
                    (item.completed /
                      item.totalTasks) *
                    100
                  ).toFixed(1)
                )
              : 0,
        }));

      workerPerformance.sort(
        (a, b) =>
          b.completionRate -
          a.completionRate
      );

      // ======================================================
      // OFFICER PERFORMANCE
      // ======================================================

      const officerMap = {};

      tasks.forEach((task) => {
        if (!task.assignedBy) return;

        const officerId =
          task.assignedBy._id.toString();

        if (!officerMap[officerId]) {
          officerMap[officerId] = {
            officer: task.assignedBy,

            totalTasksAssigned: 0,

            pending: 0,

            accepted: 0,

            inProgress: 0,

            completed: 0,

            rejected: 0,

            cancelled: 0,
          };
        }

        const officer =
          officerMap[officerId];

        officer.totalTasksAssigned++;

        if (task.status === "PENDING") {
          officer.pending++;
        }

        if (task.status === "ACCEPTED") {
          officer.accepted++;
        }

        if (task.status === "IN_PROGRESS") {
          officer.inProgress++;
        }

        if (task.status === "COMPLETED") {
          officer.completed++;
        }

        if (task.status === "REJECTED") {
          officer.rejected++;
        }

        if (task.status === "CANCELLED") {
          officer.cancelled++;
        }
      });

      const officerPerformance =
        Object.values(officerMap).map(
          (item) => ({
            ...item,

            completionRate:
              item.totalTasksAssigned > 0
                ? Number(
                    (
                      (item.completed /
                        item.totalTasksAssigned) *
                      100
                    ).toFixed(1)
                  )
                : 0,
          })
        );

      // ======================================================
      // PROJECT PERFORMANCE
      // ======================================================

      const projectMap = {};

      tasks.forEach((task) => {
        if (!task.projectId) return;

        const projectId =
          task.projectId._id.toString();

        if (!projectMap[projectId]) {
          projectMap[projectId] = {
            project: task.projectId,

            totalTasks: 0,

            pending: 0,

            accepted: 0,

            inProgress: 0,

            completed: 0,

            rejected: 0,

            cancelled: 0,

            overdue: 0,

            workers: {},
          };
        }

        const project =
          projectMap[projectId];

        project.totalTasks++;

        if (task.status === "PENDING") {
          project.pending++;
        }

        if (task.status === "ACCEPTED") {
          project.accepted++;
        }

        if (task.status === "IN_PROGRESS") {
          project.inProgress++;
        }

        if (task.status === "COMPLETED") {
          project.completed++;
        }

        if (task.status === "REJECTED") {
          project.rejected++;
        }

        if (task.status === "CANCELLED") {
          project.cancelled++;
        }

        if (
          task.deadline &&
          new Date(task.deadline) < now &&
          !["COMPLETED", "CANCELLED"].includes(
            task.status
          )
        ) {
          project.overdue++;
        }

        // ----------------------------------------------------
        // Worker assigned to this project
        // ----------------------------------------------------

        if (task.assignedTo) {
          const workerId =
            task.assignedTo._id.toString();

          if (!project.workers[workerId]) {
            project.workers[workerId] = {
              worker: task.assignedTo,
              tasks: 0,
              completed: 0,
              inProgress: 0,
              pending: 0,
            };
          }

          project.workers[workerId].tasks++;

          if (
            task.status === "COMPLETED"
          ) {
            project.workers[
              workerId
            ].completed++;
          }

          if (
            task.status === "IN_PROGRESS"
          ) {
            project.workers[
              workerId
            ].inProgress++;
          }

          if (
            task.status === "PENDING"
          ) {
            project.workers[
              workerId
            ].pending++;
          }
        }
      });

      const projectPerformance =
        Object.values(projectMap).map(
          (project) => ({
            ...project,

            workers: Object.values(
              project.workers
            ),

            completionRate:
              project.totalTasks > 0
                ? Number(
                    (
                      (project.completed /
                        project.totalTasks) *
                      100
                    ).toFixed(1)
                  )
                : 0,
          })
        );

      // ======================================================
      // RECENT TASKS
      // ======================================================

      const recentTasks = tasks
        .slice(0, 10)
        .map((task) => ({
          _id: task._id,

          title: task.title,

          description:
            task.description,

          status: task.status,

          priority: task.priority,

          surveyType:
            task.surveyType,

          deadline:
            task.deadline,

          createdAt:
            task.createdAt,

          project: task.projectId,

          assignedTo:
            task.assignedTo,

          assignedBy:
            task.assignedBy,

          survey:
            task.surveyId,
        }));

      // ======================================================
      // OVERDUE TASKS
      // ======================================================

      const overdueTasksData =
        overdueTasks
          .slice(0, 20)
          .map((task) => ({
            _id: task._id,

            title: task.title,

            priority: task.priority,

            status: task.status,

            deadline: task.deadline,

            project: task.projectId,

            assignedTo:
              task.assignedTo,

            assignedBy:
              task.assignedBy,
          }));

      // ======================================================
      // RESPONSE
      // ======================================================

      res.json({
        summary: {
          total,

          pending,

          accepted,

          active,

          inProgress,

          completed,

          rejected,

          cancelled,

          overdue: overdueTasks.length,

          completionRate:
            total > 0
              ? Number(
                  (
                    (completed / total) *
                    100
                  ).toFixed(1)
                )
              : 0,
        },

        workerPerformance,

        officerPerformance,

        projectPerformance,

        recentTasks,

        overdueTasks:
          overdueTasksData,
      });
    } catch (error) {
      console.error(
        "Task summary error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load task summary.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET SINGLE TASK
// GET /api/tasks/:id
// ============================================================

router.get(
  "/:id",
  protect,
  async (req, res) => {
    try {
      if (
        !isValidObjectId(req.params.id)
      ) {
        return res.status(400).json({
          message: "Invalid task ID.",
        });
      }

      const task =
        await populateTask(
          Task.findById(
            req.params.id
          )
        );

      if (!task) {
        return res.status(404).json({
          message: "Task not found.",
        });
      }

      res.json({
        task,
      });
    } catch (error) {
      console.error(
        "Get task error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load task.",
      });
    }
  }
);

// ============================================================
// ACCEPT TASK
// PATCH /api/tasks/:id/accept
// ============================================================

router.patch(
  "/:id/accept",
  protect,
  authorizeRoles("field_worker"),
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const task =
        await Task.findOne({
          _id: req.params.id,
          assignedTo: userId,
        });

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found or not assigned to you.",
        });
      }

      if (
        task.status !== "PENDING"
      ) {
        return res.status(400).json({
          message:
            `Task cannot be accepted from ${task.status} status.`,
        });
      }

      task.status = "ACCEPTED";
      task.acceptedAt =
        new Date();

      await task.save();

      const populated =
        await populateTask(
          Task.findById(
            task._id
          )
        );

      res.json({
        message:
          "Task accepted.",
        task: populated,
      });
    } catch (error) {
      console.error(
        "Accept task error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to accept task.",
      });
    }
  }
);

// ============================================================
// START TASK
// PATCH /api/tasks/:id/start
// ============================================================

router.patch(
  "/:id/start",
  protect,
  authorizeRoles("field_worker"),
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const task =
        await Task.findOne({
          _id: req.params.id,
          assignedTo: userId,
        });

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found.",
        });
      }

      if (
        task.status !== "ACCEPTED" &&
        task.status !== "PENDING"
      ) {
        return res.status(400).json({
          message:
            "Task cannot be started.",
        });
      }

      task.status =
        "IN_PROGRESS";

      task.startedAt =
        new Date();

      await task.save();

      const populated =
        await populateTask(
          Task.findById(
            task._id
          )
        );

      res.json({
        message:
          "Task started.",
        task: populated,
      });
    } catch (error) {
      console.error(
        "Start task error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to start task.",
      });
    }
  }
);

// ============================================================
// REJECT TASK
// PATCH /api/tasks/:id/reject
// ============================================================

router.patch(
  "/:id/reject",
  protect,
  authorizeRoles("field_worker"),
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const task =
        await Task.findOne({
          _id: req.params.id,
          assignedTo: userId,
        });

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found.",
        });
      }

      task.status =
        "REJECTED";

      if (
        req.body?.workerNotes
      ) {
        task.workerNotes =
          req.body.workerNotes;
      }

      await task.save();

      const populated =
        await populateTask(
          Task.findById(
            task._id
          )
        );

      res.json({
        message:
          "Task rejected.",
        task: populated,
      });
    } catch (error) {
      console.error(
        "Reject task error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to reject task.",
      });
    }
  }
);

// ============================================================
// COMPLETE TASK
// PATCH /api/tasks/:id/complete
// ============================================================

router.patch(
  "/:id/complete",
  protect,
  authorizeRoles("field_worker"),
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const task =
        await Task.findOne({
          _id: req.params.id,
          assignedTo: userId,
        });

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found.",
        });
      }

      if (
        task.status !==
          "IN_PROGRESS" &&
        task.status !==
          "ACCEPTED"
      ) {
        return res.status(400).json({
          message:
            "Only accepted or in-progress tasks can be completed.",
        });
      }

      // ------------------------------------------------------
      // OPTIONAL SURVEY
      // ------------------------------------------------------

      if (req.body?.surveyId) {
        if (
          !isValidObjectId(
            req.body.surveyId
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid survey ID.",
          });
        }

        const survey =
          await Survey.findById(
            req.body.surveyId
          );

        if (!survey) {
          return res.status(404).json({
            message:
              "Survey not found.",
          });
        }

        task.surveyId =
          req.body.surveyId;
      }

      // ------------------------------------------------------
      // COMPLETE
      // ------------------------------------------------------

      task.status =
        "COMPLETED";

      task.completedAt =
        new Date();

      if (
        req.body?.workerNotes !==
        undefined
      ) {
        task.workerNotes =
          req.body.workerNotes;
      }

      await task.save();

      const populated =
        await populateTask(
          Task.findById(
            task._id
          )
        );

      res.json({
        message:
          "Task completed successfully.",
        task: populated,
      });
    } catch (error) {
      console.error(
        "Complete task error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to complete task.",
      });
    }
  }
);

// ============================================================
// CANCEL TASK
// PATCH /api/tasks/:id/cancel
// ADMIN / OFFICER
// ============================================================

router.patch(
  "/:id/cancel",
  protect,
  authorizeRoles(
    "admin",
    "officer"
  ),
  async (req, res) => {
    try {
      const task =
        await Task.findById(
          req.params.id
        );

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found.",
        });
      }

      // Officer can cancel only
      // tasks assigned by himself

      if (
        req.user.role ===
        "officer"
      ) {
        const userId =
          getUserId(req);

        if (
          task.assignedBy.toString() !==
          userId.toString()
        ) {
          return res.status(403).json({
            message:
              "You can only cancel tasks assigned by you.",
          });
        }
      }

      if (
        task.status ===
        "COMPLETED"
      ) {
        return res.status(400).json({
          message:
            "Completed task cannot be cancelled.",
        });
      }

      task.status =
        "CANCELLED";

      await task.save();

      const populated =
        await populateTask(
          Task.findById(
            task._id
          )
        );

      res.json({
        message:
          "Task cancelled.",
        task: populated,
      });
    } catch (error) {
      console.error(
        "Cancel task error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to cancel task.",
      });
    }
  }
);

module.exports = router;