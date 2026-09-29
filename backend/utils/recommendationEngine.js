// ============================================================
// JALDRISHTI - RECOMMENDATION ENGINE
// ============================================================
//
// Generates actionable watershed recommendations using:
//
// 1. BEFORE field survey
// 2. AFTER field survey
// 3. BEFORE vs AFTER changes
// 4. Satellite NDVI
// 5. Satellite NDVI change
// 6. Satellite NDWI
// 7. Satellite NDWI change
// 8. Water condition
// 9. Retention condition
// 10. Vegetation condition
// 11. Structure condition
// 12. Maintenance condition
// 13. Overall impact score
//
// IMPORTANT:
// - Missing values are handled safely.
// - Changes can be calculated automatically.
// - Satellite data can independently generate recommendations.
// - Satellite imagery does NOT verify physical structures.
// - The engine supports multiple possible API/report data shapes.
// ============================================================


// ============================================================
// HELPER FUNCTIONS
// ============================================================

const isNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  const number = Number(value);

  return Number.isFinite(number);
};


const numberOrNull = (value) => {
  return isNumber(value)
    ? Number(value)
    : null;
};


const firstNumber = (...values) => {
  for (const value of values) {
    if (isNumber(value)) {
      return Number(value);
    }
  }

  return null;
};


const firstValue = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
};


const safeNumber = (value, fallback = null) => {
  return isNumber(value)
    ? Number(value)
    : fallback;
};


// ============================================================
// GET NESTED VALUE
// ============================================================

const getNestedValue = (object, paths = []) => {

  if (
    !object ||
    typeof object !== "object"
  ) {
    return null;
  }

  for (const path of paths) {

    const parts = path.split(".");

    let current = object;

    let found = true;

    for (const part of parts) {

      if (
        current === null ||
        current === undefined ||
        typeof current !== "object" ||
        !(part in current)
      ) {
        found = false;
        break;
      }

      current = current[part];
    }

    if (
      found &&
      current !== undefined &&
      current !== null
    ) {
      return current;
    }
  }

  return null;
};


// ============================================================
// GET NUMBER FROM MANY POSSIBLE FIELD NAMES
// ============================================================

const getNumberFromObject = (
  object,
  possiblePaths = []
) => {

  if (
    !object ||
    typeof object !== "object"
  ) {
    return null;
  }

  for (const path of possiblePaths) {

    const value =
      getNestedValue(object, [path]);

    if (isNumber(value)) {
      return Number(value);
    }
  }

  return null;
};


// ============================================================
// NORMALIZE FIELD DATA
// ============================================================

const normalizeFieldData = (data = {}) => {

  if (
    !data ||
    typeof data !== "object"
  ) {
    return {};
  }

  const metrics =
    data.metrics || {};

  const indicators =
    data.indicators || {};

  const survey =
    data.survey || {};

  const assessment =
    data.assessment || {};

  const result =
    data.result || {};

  return {

    water: firstNumber(

      data.water,

      data.waterAvailability,

      data.waterScore,

      data.waterCondition,

      metrics.water,

      metrics.waterAvailability,

      metrics.waterScore,

      indicators.water,

      indicators.waterAvailability,

      survey.water,

      survey.waterAvailability,

      assessment.water,

      assessment.waterAvailability,

      result.water,

      result.waterAvailability
    ),


    retention: firstNumber(

      data.retention,

      data.waterRetention,

      data.retentionScore,

      data.retentionCondition,

      metrics.retention,

      metrics.waterRetention,

      metrics.retentionScore,

      indicators.retention,

      indicators.waterRetention,

      survey.retention,

      survey.waterRetention,

      assessment.retention,

      assessment.waterRetention,

      result.retention,

      result.waterRetention
    ),


    vegetation: firstNumber(

      data.vegetation,

      data.vegetationScore,

      data.vegetationCoverage,

      data.vegetationPercentage,

      data.greenCover,

      data.greenCoverage,

      metrics.vegetation,

      metrics.vegetationScore,

      metrics.vegetationCoverage,

      indicators.vegetation,

      indicators.vegetationScore,

      survey.vegetation,

      survey.vegetationScore,

      assessment.vegetation,

      assessment.vegetationScore,

      result.vegetation,

      result.vegetationScore
    ),


    structure: firstNumber(

      data.structure,

      data.structureScore,

      data.structureCondition,

      data.structureConditionScore,

      metrics.structure,

      metrics.structureScore,

      indicators.structure,

      indicators.structureScore,

      survey.structure,

      survey.structureScore,

      assessment.structure,

      assessment.structureScore,

      result.structure,

      result.structureScore
    ),


    maintenance: firstNumber(

      data.maintenance,

      data.maintenanceScore,

      data.maintenanceCondition,

      data.maintenanceConditionScore,

      metrics.maintenance,

      metrics.maintenanceScore,

      indicators.maintenance,

      indicators.maintenanceScore,

      survey.maintenance,

      survey.maintenanceScore,

      assessment.maintenance,

      assessment.maintenanceScore,

      result.maintenance,

      result.maintenanceScore
    ),


    impactScore: firstNumber(

      data.impactScore,

      data.impact,

      data.overallImpactScore,

      data.overallScore,

      data.score,

      metrics.impactScore,

      metrics.impact,

      indicators.impactScore,

      survey.impactScore,

      assessment.impactScore,

      result.impactScore
    ),
  };
};


// ============================================================
// NORMALIZE SATELLITE DATA
// ============================================================

const normalizeSatelliteData = (
  satellite = {},
  satelliteComparison = null
) => {

  let ndvi = null;

  let ndviChange = null;

  let ndviPercentageChange = null;

  let ndwi = null;

  let ndwiChange = null;

  let beforeNDVI = null;

  let afterNDVI = null;

  let beforeNDWI = null;

  let afterNDWI = null;


  // ----------------------------------------------------------
  // DIRECT SATELLITE OBJECT
  // ----------------------------------------------------------

  if (
    satellite &&
    typeof satellite === "object"
  ) {

    ndvi = firstNumber(

      satellite.ndvi,

      satellite.NDVI,

      satellite.ndviValue,

      satellite.afterNDVI,

      satellite.after?.ndvi,

      satellite.after?.NDVI
    );


    ndviChange = firstNumber(

      satellite.ndviChange,

      satellite.NDVIChange,

      satellite.change?.ndviChange,

      satellite.change?.NDVIChange
    );


    ndviPercentageChange = firstNumber(

      satellite.ndviPercentageChange,

      satellite.percentageChange,

      satellite.NDVIPercentageChange,

      satellite.change?.percentageChange,

      satellite.change?.ndviPercentageChange
    );


    ndwi = firstNumber(

      satellite.ndwi,

      satellite.NDWI,

      satellite.ndwiValue,

      satellite.afterNDWI,

      satellite.after?.ndwi,

      satellite.after?.NDWI
    );


    ndwiChange = firstNumber(

      satellite.ndwiChange,

      satellite.NDWIChange,

      satellite.change?.ndwiChange,

      satellite.change?.NDWIChange
    );


    beforeNDVI = firstNumber(

      satellite.beforeNDVI,

      satellite.before?.ndvi,

      satellite.before?.NDVI
    );


    afterNDVI = firstNumber(

      satellite.afterNDVI,

      satellite.after?.ndvi,

      satellite.after?.NDVI,

      ndvi
    );


    beforeNDWI = firstNumber(

      satellite.beforeNDWI,

      satellite.before?.ndwi,

      satellite.before?.NDWI
    );


    afterNDWI = firstNumber(

      satellite.afterNDWI,

      satellite.after?.ndwi,

      satellite.after?.NDWI,

      ndwi
    );
  }


  // ----------------------------------------------------------
  // SATELLITE COMPARISON
  // ----------------------------------------------------------

  if (
    satelliteComparison &&
    typeof satelliteComparison === "object"
  ) {

    beforeNDVI = firstNumber(

      beforeNDVI,

      satelliteComparison.beforeNDVI,

      satelliteComparison.before?.ndvi,

      satelliteComparison.before?.NDVI,

      satelliteComparison.beforeData?.ndvi,

      satelliteComparison.beforeData?.NDVI
    );


    afterNDVI = firstNumber(

      afterNDVI,

      satelliteComparison.afterNDVI,

      satelliteComparison.after?.ndvi,

      satelliteComparison.after?.NDVI,

      satelliteComparison.afterData?.ndvi,

      satelliteComparison.afterData?.NDVI
    );


    beforeNDWI = firstNumber(

      beforeNDWI,

      satelliteComparison.beforeNDWI,

      satelliteComparison.before?.ndwi,

      satelliteComparison.before?.NDWI,

      satelliteComparison.beforeData?.ndwi,

      satelliteComparison.beforeData?.NDWI
    );


    afterNDWI = firstNumber(

      afterNDWI,

      satelliteComparison.afterNDWI,

      satelliteComparison.after?.ndwi,

      satelliteComparison.after?.NDWI,

      satelliteComparison.afterData?.ndwi,

      satelliteComparison.afterData?.NDWI
    );


    ndviChange = firstNumber(

      ndviChange,

      satelliteComparison.ndviChange,

      satelliteComparison.NDVIChange,

      satelliteComparison.change?.ndviChange,

      satelliteComparison.change?.NDVIChange,

      satelliteComparison.changes?.ndviChange,

      satelliteComparison.changes?.NDVIChange
    );


    ndviPercentageChange = firstNumber(

      ndviPercentageChange,

      satelliteComparison.ndviPercentageChange,

      satelliteComparison.percentageChange,

      satelliteComparison.change?.percentageChange,

      satelliteComparison.change?.ndviPercentageChange
    );


    ndwiChange = firstNumber(

      ndwiChange,

      satelliteComparison.ndwiChange,

      satelliteComparison.NDWIChange,

      satelliteComparison.change?.ndwiChange,

      satelliteComparison.change?.NDWIChange,

      satelliteComparison.changes?.ndwiChange,

      satelliteComparison.changes?.NDWIChange
    );
  }


  // ----------------------------------------------------------
  // CALCULATE SATELLITE CHANGES IF MISSING
  // ----------------------------------------------------------

  if (
    !isNumber(ndviChange) &&
    isNumber(beforeNDVI) &&
    isNumber(afterNDVI)
  ) {

    ndviChange =
      afterNDVI - beforeNDVI;
  }


  if (
    !isNumber(ndwiChange) &&
    isNumber(beforeNDWI) &&
    isNumber(afterNDWI)
  ) {

    ndwiChange =
      afterNDWI - beforeNDWI;
  }


  // ----------------------------------------------------------
  // CALCULATE PERCENTAGE CHANGE IF MISSING
  // ----------------------------------------------------------

  if (
    !isNumber(ndviPercentageChange) &&
    isNumber(beforeNDVI) &&
    beforeNDVI !== 0 &&
    isNumber(afterNDVI)
  ) {

    ndviPercentageChange =
      ((afterNDVI - beforeNDVI) /
        Math.abs(beforeNDVI)) *
      100;
  }


  return {

    ndvi,

    ndviChange,

    ndviPercentageChange,

    ndwi,

    ndwiChange,

    beforeNDVI,

    afterNDVI,

    beforeNDWI,

    afterNDWI,
  };
};


// ============================================================
// NORMALIZE CHANGES
// ============================================================

const normalizeChanges = (
  changes = {},
  before = {},
  after = {}
) => {

  const normalizedBefore =
    normalizeFieldData(before);

  const normalizedAfter =
    normalizeFieldData(after);

  const getFieldChange = (
    field,
    aliases = []
  ) => {

    const directValues = [
      changes?.[`${field}Change`],
      changes?.[field],
    ];

    for (const value of directValues) {

      if (isNumber(value)) {
        return Number(value);
      }
    }


    for (const alias of aliases) {

      if (
        isNumber(
          changes?.[`${alias}Change`]
        )
      ) {
        return Number(
          changes[`${alias}Change`]
        );
      }

      if (
        isNumber(changes?.[alias])
      ) {
        return Number(
          changes[alias]
        );
      }
    }


    // --------------------------------------------------------
    // AUTOMATICALLY CALCULATE FROM BEFORE / AFTER
    // --------------------------------------------------------

    if (
      isNumber(normalizedBefore[field]) &&
      isNumber(normalizedAfter[field])
    ) {

      return (
        normalizedAfter[field] -
        normalizedBefore[field]
      );
    }


    return null;
  };


  return {

    waterChange:
      getFieldChange(
        "water",
        [
          "waterAvailability",
          "waterScore",
        ]
      ),


    retentionChange:
      getFieldChange(
        "retention",
        [
          "waterRetention",
          "retentionScore",
        ]
      ),


    vegetationChange:
      getFieldChange(
        "vegetation",
        [
          "vegetationScore",
          "vegetationCoverage",
        ]
      ),


    structureChange:
      getFieldChange(
        "structure",
        [
          "structureScore",
          "structureCondition",
        ]
      ),


    maintenanceChange:
      getFieldChange(
        "maintenance",
        [
          "maintenanceScore",
          "maintenanceCondition",
        ]
      ),


    impactChange:
      getFieldChange(
        "impactScore",
        [
          "impact",
          "overallImpactScore",
          "overallScore",
        ]
      ),
  };
};


// ============================================================
// CALCULATE IMPACT SCORE IF MISSING
// ============================================================

const calculateImpactScore = (fieldData) => {

  const values = [];


  // Water: 1-5 → 0-100
  if (isNumber(fieldData.water)) {

    values.push(
      Math.max(
        0,
        Math.min(
          100,
          (fieldData.water / 5) * 100
        )
      )
    );
  }


  // Retention: 1-5 → 0-100
  if (isNumber(fieldData.retention)) {

    values.push(
      Math.max(
        0,
        Math.min(
          100,
          (fieldData.retention / 5) * 100
        )
      )
    );
  }


  // Structure: 1-5 → 0-100
  if (isNumber(fieldData.structure)) {

    values.push(
      Math.max(
        0,
        Math.min(
          100,
          (fieldData.structure / 5) * 100
        )
      )
    );
  }


  // Maintenance: 1-5 → 0-100
  if (isNumber(fieldData.maintenance)) {

    values.push(
      Math.max(
        0,
        Math.min(
          100,
          (fieldData.maintenance / 5) * 100
        )
      )
    );
  }


  // Vegetation is already 0-100
  if (isNumber(fieldData.vegetation)) {

    values.push(
      Math.max(
        0,
        Math.min(
          100,
          fieldData.vegetation
        )
      )
    );
  }


  if (!values.length) {
    return null;
  }


  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    );


  return Number(
    (total / values.length).toFixed(1)
  );
};


// ============================================================
// ADD RECOMMENDATION
// ============================================================

const addRecommendation = (
  recommendations,
  recommendation
) => {

  if (
    !recommendation ||
    !recommendation.title
  ) {
    return;
  }

  recommendations.push(
    recommendation
  );
};


// ============================================================
// MAIN FUNCTION
// ============================================================

const generateRecommendations = ({
  after = {},
  before = {},
  changes = {},
  satellite = {},
  satelliteComparison = null,

  // Support alternate names
  afterSurvey = {},
  beforeSurvey = {},
  fieldData = {},
  satelliteData = {},
} = {}) => {

  const recommendations = [];


  // ==========================================================
  // NORMALIZE FIELD DATA
  // ==========================================================

  const rawAfter =
    Object.keys(after || {}).length
      ? after
      : Object.keys(afterSurvey || {}).length
      ? afterSurvey
      : fieldData.after || fieldData.afterSurvey || {};


  const rawBefore =
    Object.keys(before || {}).length
      ? before
      : Object.keys(beforeSurvey || {}).length
      ? beforeSurvey
      : fieldData.before || fieldData.beforeSurvey || {};


  const afterData =
    normalizeFieldData(rawAfter);


  const beforeData =
    normalizeFieldData(rawBefore);


  // ==========================================================
  // NORMALIZE CHANGES
  // ==========================================================

  const fieldChanges =
    normalizeChanges(
      changes || {},
      rawBefore,
      rawAfter
    );


  const waterChange =
    fieldChanges.waterChange;


  const retentionChange =
    fieldChanges.retentionChange;


  const vegetationChange =
    fieldChanges.vegetationChange;


  const structureChange =
    fieldChanges.structureChange;


  const maintenanceChange =
    fieldChanges.maintenanceChange;


  const impactChange =
    fieldChanges.impactChange;


  // ==========================================================
  // IMPACT SCORE
  // ==========================================================

  let impactScore =
    afterData.impactScore;


  // If impactScore is not provided,
  // calculate it from field indicators.
  if (
    !isNumber(impactScore)
  ) {

    impactScore =
      calculateImpactScore(
        afterData
      );
  }


  // ==========================================================
  // SATELLITE NORMALIZATION
  // ==========================================================

  const satelliteSource =
    Object.keys(satellite || {}).length
      ? satellite
      : satelliteData;


  const satelliteDataNormalized =
    normalizeSatelliteData(
      satelliteSource,
      satelliteComparison
    );


  const satelliteNDVI =
    satelliteDataNormalized.ndvi;


  const satelliteNDVIChange =
    satelliteDataNormalized.ndviChange;


  const satelliteNDVIPercentageChange =
    satelliteDataNormalized.ndviPercentageChange;


  const satelliteNDWI =
    satelliteDataNormalized.ndwi;


  const satelliteNDWIChange =
    satelliteDataNormalized.ndwiChange;


  const beforeNDVI =
    satelliteDataNormalized.beforeNDVI;


  const afterNDVI =
    satelliteDataNormalized.afterNDVI;


  const beforeNDWI =
    satelliteDataNormalized.beforeNDWI;


  const afterNDWI =
    satelliteDataNormalized.afterNDWI;


  // ==========================================================
  // DETERMINE WHETHER ANY REAL DATA EXISTS
  // ==========================================================

  const hasFieldData =
    isNumber(afterData.water) ||
    isNumber(afterData.retention) ||
    isNumber(afterData.vegetation) ||
    isNumber(afterData.structure) ||
    isNumber(afterData.maintenance) ||
    isNumber(impactScore);


  const hasSatelliteData =
    isNumber(satelliteNDVI) ||
    isNumber(satelliteNDVIChange) ||
    isNumber(satelliteNDWI) ||
    isNumber(satelliteNDWIChange) ||
    isNumber(beforeNDVI) ||
    isNumber(afterNDVI) ||
    isNumber(beforeNDWI) ||
    isNumber(afterNDWI);


  // ==========================================================
  // 1. CRITICAL / LOW IMPACT
  // ==========================================================

  if (
    isNumber(impactScore) &&
    impactScore < 50
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "HIGH",

        title:
          "Immediate Field Inspection",

        reason:
          `The current watershed impact score is ${impactScore}/100, indicating poor overall performance.`,

        action:
          "Conduct a detailed field inspection to identify the main causes of poor performance and prioritize corrective measures.",

        category:
          "OVERALL_PERFORMANCE",
      }
    );
  }


  // ==========================================================
  // 2. MODERATE IMPACT
  // ==========================================================

  if (
    isNumber(impactScore) &&
    impactScore >= 50 &&
    impactScore < 75
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Targeted Watershed Improvement",

        reason:
          `The current impact score is ${impactScore}/100, indicating moderate watershed performance.`,

        action:
          "Identify weak parameters and implement targeted improvements while continuing periodic monitoring.",

        category:
          "OVERALL_PERFORMANCE",
      }
    );
  }


  // ==========================================================
  // 3. STRUCTURE CONDITION
  // ==========================================================

  if (
    isNumber(afterData.structure) &&
    afterData.structure <= 2
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "HIGH",

        title:
          "Repair Watershed Structure",

        reason:
          `The current structure condition score is ${afterData.structure}/5.`,

        action:
          "Inspect the watershed structure for cracks, erosion, leakage, damage or structural instability and schedule repair work.",

        category:
          "STRUCTURE",
      }
    );
  }


  // ==========================================================
  // 4. STRUCTURE NOT IMPROVING
  // ==========================================================

  if (
    isNumber(structureChange) &&
    structureChange <= 0 &&
    isNumber(afterData.structure) &&
    afterData.structure <= 3
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Monitor Structural Improvement",

        reason:
          "The watershed structure condition has not improved compared with the previous survey.",

        action:
          "Verify whether planned construction, repair or strengthening activities have been completed.",

        category:
          "STRUCTURE",
      }
    );
  }


  // ==========================================================
  // 5. WATER AVAILABILITY
  // ==========================================================

  if (
    isNumber(afterData.water) &&
    afterData.water <= 2
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "HIGH",

        title:
          "Improve Water Availability",

        reason:
          `The current water availability score is ${afterData.water}/5.`,

        action:
          "Inspect water sources, storage capacity, drainage paths and water-retention measures. Identify leakage, overflow or inadequate storage.",

        category:
          "WATER",
      }
    );
  }


  // ==========================================================
  // 6. WATER NOT IMPROVING
  // ==========================================================

  if (
    isNumber(waterChange) &&
    waterChange <= 0 &&
    isNumber(afterData.water) &&
    afterData.water <= 3
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "HIGH",

        title:
          "Investigate Water Performance",

        reason:
          "Water availability has not improved compared with the previous survey.",

        action:
          "Inspect water-retention measures, storage structures and drainage conditions and identify the cause of limited improvement.",

        category:
          "WATER",
      }
    );
  }


  // ==========================================================
  // 7. RETENTION
  // ==========================================================

  if (
    isNumber(afterData.retention) &&
    afterData.retention <= 2
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Improve Water Retention Capacity",

        reason:
          `The current water retention score is ${afterData.retention}/5.`,

        action:
          "Check silt accumulation, bund condition, drainage paths and storage capacity. Consider desilting or strengthening where required.",

        category:
          "RETENTION",
      }
    );
  }


  // ==========================================================
  // 8. RETENTION NOT IMPROVING
  // ==========================================================

  if (
    isNumber(retentionChange) &&
    retentionChange <= 0 &&
    isNumber(afterData.retention) &&
    afterData.retention <= 3
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Strengthen Retention Measures",

        reason:
          "Water retention performance has not improved compared with the previous survey.",

        action:
          "Inspect bunds, check dams, ponds and drainage pathways for damage, sedimentation or leakage.",

        category:
          "RETENTION",
      }
    );
  }


  // ==========================================================
  // 9. FIELD VEGETATION
  // ==========================================================

  if (
    isNumber(afterData.vegetation) &&
    afterData.vegetation < 30
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Increase Vegetation Coverage",

        reason:
          `The current field vegetation score is ${afterData.vegetation}/100.`,

        action:
          "Consider plantation, natural regeneration, soil-moisture conservation and protection of existing vegetation.",

        category:
          "VEGETATION",
      }
    );
  }


  // ==========================================================
  // 10. FIELD VEGETATION NOT IMPROVING
  // ==========================================================

  if (
    isNumber(vegetationChange) &&
    vegetationChange < 10 &&
    isNumber(afterData.vegetation) &&
    afterData.vegetation < 70
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Strengthen Vegetation Restoration",

        reason:
          `Field vegetation improvement is only ${vegetationChange} points.`,

        action:
          "Increase plantation and soil-moisture conservation activities and protect restored vegetation from degradation.",

        category:
          "VEGETATION",
      }
    );
  }


  // ==========================================================
  // 11. SATELLITE NDVI - LOW VEGETATION
  // ==========================================================

  if (
    isNumber(satelliteNDVI) &&
    satelliteNDVI < 0.20
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Satellite Indicates Low Vegetation",

        reason:
          `The latest satellite NDVI is ${satelliteNDVI.toFixed(4)}, indicating low vegetation activity in the monitored area.`,

        action:
          "Verify vegetation conditions through field inspection and consider plantation, soil-moisture conservation and protection measures.",

        category:
          "SATELLITE_VEGETATION",
      }
    );
  }


  // ==========================================================
  // 12. SATELLITE NDVI - NEGATIVE CHANGE
  // ==========================================================

  if (
    isNumber(satelliteNDVIChange) &&
    satelliteNDVIChange <= -0.05
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "HIGH",

        title:
          "Satellite Indicates Vegetation Degradation",

        reason:
          `Satellite NDVI decreased by ${Math.abs(satelliteNDVIChange).toFixed(4)} between the selected periods.`,

        action:
          "Conduct field verification to identify possible vegetation loss, land degradation, water stress or other causes.",

        category:
          "SATELLITE_VEGETATION",
      }
    );
  }


  // ==========================================================
  // 13. SATELLITE NDVI - SMALL IMPROVEMENT
  // ==========================================================

  if (
    isNumber(satelliteNDVIChange) &&
    satelliteNDVIChange > 0 &&
    satelliteNDVIChange < 0.05
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "LOW",

        title:
          "Continue Vegetation Improvement",

        reason:
          `Satellite NDVI increased by ${satelliteNDVIChange.toFixed(4)}, showing a small vegetation improvement.`,

        action:
          "Continue existing vegetation restoration and soil-moisture conservation measures and monitor the area periodically.",

        category:
          "SATELLITE_VEGETATION",
      }
    );
  }


  // ==========================================================
  // 14. STRONG SATELLITE IMPROVEMENT
  // ==========================================================

  if (
    isNumber(satelliteNDVIChange) &&
    satelliteNDVIChange >= 0.10
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "LOW",

        title:
          "Maintain Vegetation Gains",

        reason:
          `Satellite NDVI increased by ${satelliteNDVIChange.toFixed(4)}, indicating strong vegetation improvement.`,

        action:
          "Continue protection and maintenance activities to preserve the observed vegetation improvement.",

        category:
          "SATELLITE_VEGETATION",
      }
    );
  }


  // ==========================================================
  // 15. SATELLITE NDWI - WATER STRESS
  // ==========================================================

  if (
    isNumber(satelliteNDWI) &&
    satelliteNDWI < 0
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Investigate Water Stress",

        reason:
          `The latest satellite NDWI is ${satelliteNDWI.toFixed(4)}.`,

        action:
          "Verify field water conditions, storage levels and moisture availability. Check whether water-retention measures require maintenance.",

        category:
          "SATELLITE_WATER",
      }
    );
  }


  // ==========================================================
  // 16. SATELLITE NDWI DECREASE
  // ==========================================================

  if (
    isNumber(satelliteNDWIChange) &&
    satelliteNDWIChange <= -0.05
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Investigate Declining Water Conditions",

        reason:
          `Satellite NDWI decreased by ${Math.abs(satelliteNDWIChange).toFixed(4)}.`,

        action:
          "Conduct field verification of water availability, soil moisture and retention structures.",

        category:
          "SATELLITE_WATER",
      }
    );
  }


  // ==========================================================
  // 17. MAINTENANCE
  // ==========================================================

  if (
    isNumber(afterData.maintenance) &&
    afterData.maintenance <= 2
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Schedule Maintenance",

        reason:
          `The current maintenance condition score is ${afterData.maintenance}/5.`,

        action:
          "Schedule a maintenance visit and verify whether regular maintenance activities are being performed.",

        category:
          "MAINTENANCE",
      }
    );
  }


  // ==========================================================
  // 18. MAINTENANCE NOT IMPROVING
  // ==========================================================

  if (
    isNumber(maintenanceChange) &&
    maintenanceChange <= 0 &&
    isNumber(afterData.maintenance) &&
    afterData.maintenance <= 3
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "MEDIUM",

        title:
          "Review Maintenance Activities",

        reason:
          "Maintenance condition has not improved compared with the previous survey.",

        action:
          "Review the maintenance schedule and ensure watershed structures and vegetation-restoration measures are regularly maintained.",

        category:
          "MAINTENANCE",
      }
    );
  }


  // ==========================================================
  // 19. OVERALL IMPACT DECREASING
  // ==========================================================

  if (
    isNumber(impactChange) &&
    impactChange < -5
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "HIGH",

        title:
          "Investigate Declining Project Performance",

        reason:
          `The overall impact score decreased by ${Math.abs(impactChange).toFixed(1)} points.`,

        action:
          "Review field observations, satellite indicators and project interventions to identify the cause of declining performance.",

        category:
          "OVERALL_PERFORMANCE",
      }
    );
  }


  // ==========================================================
  // 20. GOOD PROJECT
  // ==========================================================

  if (
    isNumber(impactScore) &&
    impactScore >= 75 &&
    recommendations.length === 0
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "LOW",

        title:
          "Continue Routine Monitoring",

        reason:
          `The project is performing satisfactorily with an impact score of ${impactScore}/100.`,

        action:
          "Continue periodic field and satellite monitoring and maintain existing watershed structures and vegetation.",

        category:
          "OVERALL_PERFORMANCE",
      }
    );
  }


  // ==========================================================
  // 21. DATA COLLECTION
  // ==========================================================
  //
  // IMPORTANT:
  // Do NOT generate "Collect Additional Monitoring Data"
  // if satellite or field data exists.
  //
  // This fixes the issue visible in your PDF.
  // ==========================================================

  if (
    recommendations.length === 0 &&
    !hasFieldData &&
    !hasSatelliteData
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "LOW",

        title:
          "Collect Additional Monitoring Data",

        reason:
          "There is insufficient assessment data to generate a specific intervention recommendation.",

        action:
          "Conduct a field survey and collect GPS, water, retention, vegetation, structure and maintenance observations.",

        category:
          "DATA_COLLECTION",
      }
    );
  }


  // ==========================================================
  // 22. MONITORING RECOMMENDATION
  // ==========================================================
  //
  // If there is meaningful data but none of the thresholds
  // were triggered, give a useful monitoring recommendation
  // instead of saying there is no data.
  // ==========================================================

  if (
    recommendations.length === 0 &&
    (
      hasFieldData ||
      hasSatelliteData
    )
  ) {

    addRecommendation(
      recommendations,
      {
        severity: "LOW",

        title:
          "Continue Watershed Monitoring",

        reason:
          "Available field and/or satellite indicators do not currently show a condition requiring a specific corrective intervention.",

        action:
          "Continue periodic field surveys and satellite monitoring to track changes in vegetation, water conditions, retention and watershed structures.",

        category:
          "MONITORING",
      }
    );
  }


  // ==========================================================
  // REMOVE DUPLICATES
  // ==========================================================

  const uniqueRecommendations = [];

  const seen = new Set();


  for (
    const recommendation of recommendations
  ) {

    const key =
      `${recommendation.title}-${recommendation.category}`;


    if (
      !seen.has(key)
    ) {

      seen.add(key);

      uniqueRecommendations.push(
        recommendation
      );
    }
  }


  // ==========================================================
  // SORT BY SEVERITY
  // ==========================================================

  const severityOrder = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    MODERATE: 2,
    LOW: 3,
    GENERAL: 4,
  };


  uniqueRecommendations.sort(
    (a, b) => {

      return (
        (severityOrder[a.severity] ?? 99) -
        (severityOrder[b.severity] ?? 99)
      );
    }
  );


  // ==========================================================
  // DEBUG INFORMATION
  // ==========================================================
  //
  // This is extremely useful while testing the PDF.
  // ==========================================================

  console.log(
    "\n============================================================"
  );

  console.log(
    "JALDRISHTI RECOMMENDATION ENGINE"
  );

  console.log(
    "============================================================"
  );

  console.log(
    "Field Data:",
    {
      water: afterData.water,
      retention: afterData.retention,
      vegetation: afterData.vegetation,
      structure: afterData.structure,
      maintenance: afterData.maintenance,
      impactScore,
    }
  );

  console.log(
    "Field Changes:",
    {
      waterChange,
      retentionChange,
      vegetationChange,
      structureChange,
      maintenanceChange,
      impactChange,
    }
  );

  console.log(
    "Satellite Data:",
    {
      beforeNDVI,
      afterNDVI,
      ndvi: satelliteNDVI,
      ndviChange: satelliteNDVIChange,
      ndviPercentageChange:
        satelliteNDVIPercentageChange,

      beforeNDWI,
      afterNDWI,
      ndwi: satelliteNDWI,
      ndwiChange: satelliteNDWIChange,
    }
  );

  console.log(
    "Has Field Data:",
    hasFieldData
  );

  console.log(
    "Has Satellite Data:",
    hasSatelliteData
  );

  console.log(
    "Recommendations Generated:",
    uniqueRecommendations.length
  );

  console.log(
    "Recommendations:",
    uniqueRecommendations
  );

  console.log(
    "============================================================\n"
  );


  // ==========================================================
  // RETURN
  // ==========================================================

  return uniqueRecommendations;
};


// ============================================================
// EXPORT
// ============================================================

module.exports =
  generateRecommendations;