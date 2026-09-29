const express = require("express");

const router = express.Router();

const Alert = require("../models/Alert");
const Project = require("../models/Project");

const protect =
  require("../middleware/authMiddleware");

const authorizeRoles =
  require("../middleware/roleMiddleware");


// ======================================================
// GET ALERTS
// Officer → only alerts for their assigned projects
// Admin   → all alerts
// ======================================================

router.get(
  "/",
  protect,
  authorizeRoles(
    "officer",
    "admin"
  ),
  async (req, res) => {
    try {

      // ==================================================
      // ADMIN → SEE ALL OPEN ALERTS
      // ==================================================

      if (req.user.role === "admin") {

        const alerts =
          await Alert.find({
            status: "OPEN",
          })
            .populate(
              "projectId",
              "name village district impactScore status assignedOfficer assignedWorker"
            )
            .sort({
              createdAt: -1,
            });

        return res.status(200).json({
          success: true,
          count: alerts.length,
          alerts,
        });
      }


      // ==================================================
      // OFFICER → FIND ONLY THEIR PROJECTS
      // ==================================================

      const projects =
        await Project.find({
          assignedOfficer:
            req.user.id,
        }).select("_id");


      const projectIds =
        projects.map(
          (project) =>
            project._id
        );


      // ==================================================
      // GET ALERTS ONLY FOR THOSE PROJECTS
      // ==================================================

      const alerts =
        await Alert.find({
          status: "OPEN",

          projectId: {
            $in: projectIds,
          },
        })
          .populate(
            "projectId",
            "name village district impactScore status assignedOfficer assignedWorker"
          )
          .sort({
            createdAt: -1,
          });


      return res.status(200).json({
        success: true,
        count: alerts.length,
        alerts,
      });

    } catch (error) {

      console.error(
        "Fetch alerts error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch alerts.",
        error:
          error.message,
      });
    }
  }
);


// ======================================================
// RESOLVE ALERT
// Officer → only alerts from their projects
// Admin   → any alert
// ======================================================

router.put(
  "/:id/resolve",
  protect,
  authorizeRoles(
    "officer",
    "admin"
  ),
  async (req, res) => {

    try {

      // ==================================================
      // FIND ALERT
      // ==================================================

      const alert =
        await Alert.findById(
          req.params.id
        );

      if (!alert) {
        return res.status(404).json({
          success: false,
          message:
            "Alert not found.",
        });
      }


      // ==================================================
      // ADMIN → CAN RESOLVE ANY ALERT
      // ==================================================

      if (
        req.user.role === "admin"
      ) {

        alert.status =
          "RESOLVED";

        alert.resolvedAt =
          new Date();

        await alert.save();

        return res.status(200).json({
          success: true,
          message:
            "Alert resolved successfully.",
          alert,
        });
      }


      // ==================================================
      // OFFICER → CHECK PROJECT OWNERSHIP
      // ==================================================

      const project =
        await Project.findById(
          alert.projectId
        ).select(
          "assignedOfficer name"
        );


      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project associated with alert not found.",
        });
      }


      // ==================================================
      // SECURITY CHECK
      // ==================================================

      if (
        !project.assignedOfficer ||
        project.assignedOfficer.toString() !==
          req.user.id.toString()
      ) {

        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to resolve this alert.",
        });
      }


      // ==================================================
      // RESOLVE
      // ==================================================

      alert.status =
        "RESOLVED";

      alert.resolvedAt =
        new Date();

      await alert.save();


      return res.status(200).json({
        success: true,
        message:
          "Alert resolved successfully.",
        alert,
      });

    } catch (error) {

      console.error(
        "Resolve alert error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to resolve alert.",
        error:
          error.message,
      });
    }
  }
);


module.exports = router;