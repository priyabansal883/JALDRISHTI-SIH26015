const Alert = require("../models/Alert");

const createAlert = async ({
  projectId,
  type,
  severity,
  title,
  message,
}) => {
  try {
    // Avoid duplicate open alerts
    const existing =
      await Alert.findOne({
        projectId,
        type,
        status: "OPEN",
      });

    if (existing) {
      return existing;
    }

    return await Alert.create({
      projectId,
      type,
      severity,
      title,
      message,
    });
  } catch (error) {
    console.error(
      "Create alert error:",
      error
    );

    return null;
  }
};


const generateProjectAlerts = async ({
  project,
  survey,
  previousSurvey,
}) => {
  const alerts = [];

  const score =
    Number(
      survey?.impactScore ||
      project?.impactScore ||
      0
    );

  // Critical impact
  if (score < 25) {
    const alert =
      await createAlert({
        projectId: project._id,
        type: "CRITICAL_IMPACT",
        severity: "CRITICAL",
        title:
          "Critical Watershed Impact",
        message:
          `Impact score is ${score}/100. Immediate field inspection is required.`,
      });

    if (alert) {
      alerts.push(alert);
    }
  }

  // Low impact
  else if (score < 50) {
    const alert =
      await createAlert({
        projectId: project._id,
        type: "LOW_IMPACT",
        severity: "HIGH",
        title:
          "Low Watershed Performance",
        message:
          `Impact score is ${score}/100. Field intervention is recommended.`,
      });

    if (alert) {
      alerts.push(alert);
    }
  }

  // Poor structure
  if (
    Number(survey?.structure || 0) <= 2
  ) {
    const alert =
      await createAlert({
        projectId: project._id,
        type: "STRUCTURE_DAMAGE",
        severity: "HIGH",
        title:
          "Structure Condition Alert",
        message:
          "Watershed structure condition is poor. Inspection or repair is recommended.",
      });

    if (alert) {
      alerts.push(alert);
    }
  }

  // Poor maintenance
  if (
    Number(survey?.maintenance || 0) <= 2
  ) {
    const alert =
      await createAlert({
        projectId: project._id,
        type: "MAINTENANCE",
        severity: "MEDIUM",
        title:
          "Maintenance Required",
        message:
          "The latest survey indicates poor maintenance condition.",
      });

    if (alert) {
      alerts.push(alert);
    }
  }

  // NDVI decline
  if (
    previousSurvey?.satelliteNDVI !== null &&
    previousSurvey?.satelliteNDVI !== undefined &&
    survey?.satelliteNDVI !== null &&
    survey?.satelliteNDVI !== undefined
  ) {
    const previousNDVI =
      Number(
        previousSurvey.satelliteNDVI
      );

    const currentNDVI =
      Number(
        survey.satelliteNDVI
      );

    const decline =
      previousNDVI - currentNDVI;

    if (decline >= 0.05) {
      const alert =
        await createAlert({
          projectId: project._id,
          type: "NDVI_DECLINE",
          severity: "HIGH",
          title:
            "Vegetation Decline Detected",
          message:
            `Satellite NDVI decreased from ${previousNDVI.toFixed(
              2
            )} to ${currentNDVI.toFixed(
              2
            )}. Follow-up monitoring is recommended.`,
        });

      if (alert) {
        alerts.push(alert);
      }
    }
  }

  return alerts;
};


module.exports = {
  createAlert,
  generateProjectAlerts,
};