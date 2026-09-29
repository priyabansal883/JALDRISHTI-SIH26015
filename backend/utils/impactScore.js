// ============================================================
// JALDRISHTI
// IMPACT SCORE ENGINE
//
// Human Field Survey + Satellite NDVI
//
// IMPORTANT:
// This file is impactScore.js
// Do NOT rename it to impactEngine.js
// ============================================================


// ============================================================
// BASIC UTILITIES
// ============================================================

const clamp = (value, min = 0, max = 100) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    Math.max(number, min),
    max
  );
};


// ============================================================
// ROUND
// ============================================================

const round = (value, decimals = 2) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Number(
    number.toFixed(decimals)
  );
};


// ============================================================
// 1. HUMAN SURVEY 1-5 -> 0-100
// ============================================================

const fiveToHundred = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return round(
    clamp(
      ((number - 1) / 4) * 100,
      0,
      100
    )
  );
};


// ============================================================
// 2. SATELLITE NDVI -1 TO +1 -> 0-100
// ============================================================

const ndviToScore = (ndvi) => {
  const number = Number(ndvi);

  if (!Number.isFinite(number)) {
    return null;
  }

  return round(
    clamp(
      ((number + 1) / 2) * 100,
      0,
      100
    )
  );
};


// ============================================================
// 3. NDVI CLASSIFICATION
// ============================================================

const classifyNDVI = (ndvi) => {
  const number = Number(ndvi);

  if (!Number.isFinite(number)) {
    return "No Satellite Data";
  }

  if (number < 0) {
    return "Water / Bare Surface";
  }

  if (number < 0.2) {
    return "Sparse Vegetation";
  }

  if (number < 0.4) {
    return "Moderate Vegetation";
  }

  if (number < 0.6) {
    return "Healthy Vegetation";
  }

  return "Dense Vegetation";
};


// ============================================================
// 4. IMPACT STATUS
// ============================================================

const getImpactStatus = (score) => {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    return "Unknown";
  }

  if (value >= 80) {
    return "Excellent";
  }

  if (value >= 65) {
    return "Good";
  }

  if (value >= 50) {
    return "Moderate";
  }

  if (value >= 30) {
    return "Poor";
  }

  return "Critical";
};


// ============================================================
// 5. NORMALIZE HUMAN VEGETATION
//
// Your survey currently uses vegetation as percentage.
// Example:
// 80 => 80
//
// But if someone sends 1-5, convert it.
// ============================================================

const normalizeFieldVegetation = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  // 1-5 rating
  if (
    number >= 1 &&
    number <= 5
  ) {
    return fiveToHundred(number);
  }

  // percentage
  return round(
    clamp(number, 0, 100)
  );
};


// ============================================================
// 6. CALCULATE COMPONENTS
// ============================================================

const createComponents = ({
  water,
  retention,
  vegetation,
  structure,
  maintenance,
  satelliteNDVI,
}) => {

  const waterScore =
    fiveToHundred(water);

  const retentionScore =
    fiveToHundred(retention);

  const fieldVegetationScore =
    normalizeFieldVegetation(
      vegetation
    );

  const structureScore =
    fiveToHundred(structure);

  const maintenanceScore =
    fiveToHundred(maintenance);

  const satelliteScore =
    ndviToScore(
      satelliteNDVI
    );

  return {
    waterScore,
    retentionScore,
    fieldVegetationScore,
    structureScore,
    maintenanceScore,
    satelliteScore,
  };
};


// ============================================================
// 7. MAIN IMPACT SCORE
//
// BASE WEIGHTS:
//
// Water                 20%
// Retention             15%
// Field Vegetation      15%
// Satellite Vegetation 20%
// Structure             15%
// Maintenance           15%
//
// TOTAL                  100%
// ============================================================

const calculateCombinedImpactScore = ({
  water,
  retention,
  vegetation,
  structure,
  maintenance,
  satelliteNDVI,
}) => {

  const {
    waterScore,
    retentionScore,
    fieldVegetationScore,
    structureScore,
    maintenanceScore,
    satelliteScore,
  } = createComponents({
    water,
    retention,
    vegetation,
    structure,
    maintenance,
    satelliteNDVI,
  });


  // ==========================================================
  // BASE WEIGHTS
  // ==========================================================

  const weights = {
    water: 20,
    retention: 15,
    fieldVegetation: 15,
    satelliteVegetation: 20,
    structure: 15,
    maintenance: 15,
  };


  // ==========================================================
  // AVAILABLE COMPONENTS
  // ==========================================================

  const components = [];


  if (
    waterScore !== null
  ) {
    components.push({
      name: "water",
      score: waterScore,
      weight: weights.water,
      source: "HUMAN_SURVEY",
    });
  }


  if (
    retentionScore !== null
  ) {
    components.push({
      name: "retention",
      score: retentionScore,
      weight: weights.retention,
      source: "HUMAN_SURVEY",
    });
  }


  if (
    fieldVegetationScore !== null
  ) {
    components.push({
      name: "fieldVegetation",
      score: fieldVegetationScore,
      weight: weights.fieldVegetation,
      source: "HUMAN_SURVEY",
    });
  }


  if (
    satelliteScore !== null
  ) {
    components.push({
      name: "satelliteVegetation",
      score: satelliteScore,
      weight: weights.satelliteVegetation,
      source: "SATELLITE_NDVI",
    });
  }


  if (
    structureScore !== null
  ) {
    components.push({
      name: "structure",
      score: structureScore,
      weight: weights.structure,
      source: "HUMAN_SURVEY",
    });
  }


  if (
    maintenanceScore !== null
  ) {
    components.push({
      name: "maintenance",
      score: maintenanceScore,
      weight: weights.maintenance,
      source: "HUMAN_SURVEY",
    });
  }


  // ==========================================================
  // NO DATA
  // ==========================================================

  if (
    components.length === 0
  ) {
    return {
      impactScore: 0,

      status: "Unknown",

      scoreAvailable: false,

      humanSurveyAvailable: false,

      satelliteAvailable: false,

      vegetation: {
        fieldScore:
          fieldVegetationScore,

        satelliteScore:
          satelliteScore,

        combinedScore: null,

        evidence: "NO_DATA",
      },

      satellite: {
        ndvi:
          satelliteNDVI ?? null,

        score:
          satelliteScore,

        classification:
          classifyNDVI(
            satelliteNDVI
          ),
      },

      components: {},

      weightsUsed: {},

      methodology:
        "No human survey or satellite data is available.",
    };
  }


  // ==========================================================
  // NORMALIZE AVAILABLE WEIGHTS
  //
  // If satellite is unavailable:
  // its 20% is redistributed among
  // the available components.
  // ==========================================================

  const totalAvailableWeight =
    components.reduce(
      (
        total,
        component
      ) =>
        total +
        component.weight,
      0
    );


  // ==========================================================
  // WEIGHTED SCORE
  // ==========================================================

  let weightedScore = 0;

  const componentResults = {};


  components.forEach(
    (component) => {

      const effectiveWeight =
        (
          component.weight /
          totalAvailableWeight
        ) * 100;


      const contribution =
        component.score *
        (
          component.weight /
          totalAvailableWeight
        );


      weightedScore +=
        contribution;


      componentResults[
        component.name
      ] = {

        score:
          round(
            component.score
          ),

        originalWeight:
          component.weight,

        effectiveWeight:
          round(
            effectiveWeight
          ),

        contribution:
          round(
            contribution
          ),

        source:
          component.source,
      };
    }
  );


  // ==========================================================
  // FINAL IMPACT SCORE
  // ==========================================================

  const impactScore =
    round(
      clamp(
        weightedScore,
        0,
        100
      ),
      1
    );


  // ==========================================================
  // VEGETATION COMBINATION
  //
  // HUMAN + SATELLITE
  //
  // 50% human
  // 50% satellite
  // ==========================================================

  let combinedVegetationScore =
    null;


  if (
    fieldVegetationScore !== null &&
    satelliteScore !== null
  ) {

    combinedVegetationScore =
      round(
        (
          fieldVegetationScore +
          satelliteScore
        ) / 2
      );

  } else if (
    fieldVegetationScore !== null
  ) {

    combinedVegetationScore =
      fieldVegetationScore;

  } else if (
    satelliteScore !== null
  ) {

    combinedVegetationScore =
      satelliteScore;
  }


  // ==========================================================
  // EVIDENCE TYPE
  // ==========================================================

  let evidence =
    "FIELD_ONLY";


  if (
    fieldVegetationScore !== null &&
    satelliteScore !== null
  ) {
    evidence =
      "FIELD_AND_SATELLITE";

  } else if (
    satelliteScore !== null
  ) {
    evidence =
      "SATELLITE_ONLY";
  }


  // ==========================================================
  // HUMAN SURVEY SCORE
  //
  // This is useful for UI comparison.
  // ==========================================================

  const humanComponents = [];

  if (waterScore !== null) {
    humanComponents.push(
      waterScore
    );
  }

  if (retentionScore !== null) {
    humanComponents.push(
      retentionScore
    );
  }

  if (fieldVegetationScore !== null) {
    humanComponents.push(
      fieldVegetationScore
    );
  }

  if (structureScore !== null) {
    humanComponents.push(
      structureScore
    );
  }

  if (maintenanceScore !== null) {
    humanComponents.push(
      maintenanceScore
    );
  }


  let humanSurveyScore =
    null;


  if (
    humanComponents.length > 0
  ) {

    humanSurveyScore =
      round(
        humanComponents.reduce(
          (
            sum,
            value
          ) =>
            sum + value,
          0
        ) /
        humanComponents.length
      );
  }


  // ==========================================================
  // SATELLITE SCORE
  // ==========================================================

  const satelliteEvidenceScore =
    satelliteScore;


  // ==========================================================
  // FINAL RESULT
  // ==========================================================

  return {

    // Main score
    impactScore,

    status:
      getImpactStatus(
        impactScore
      ),

    scoreAvailable: true,

    // Evidence availability
    humanSurveyAvailable:
      humanComponents.length > 0,

    satelliteAvailable:
      satelliteScore !== null,


    // ========================================================
    // HUMAN SURVEY
    // ========================================================

    humanSurvey: {

      score:
        humanSurveyScore,

      available:
        humanComponents.length > 0,

      source:
        "Geo-tagged field survey",
    },


    // ========================================================
    // VEGETATION
    // ========================================================

    vegetation: {

      fieldScore:
        fieldVegetationScore,

      satelliteScore:
        satelliteScore,

      combinedScore:
        combinedVegetationScore,

      evidence,
    },


    // ========================================================
    // SATELLITE
    // ========================================================

    satellite: {

      ndvi:
        satelliteNDVI ?? null,

      score:
        satelliteScore,

      classification:
        classifyNDVI(
          satelliteNDVI
        ),

      source:
        satelliteScore !== null
          ? "Copernicus Sentinel-2 L2A"
          : null,
    },


    // ========================================================
    // COMPONENTS
    // ========================================================

    components:
      componentResults,


    // ========================================================
    // WEIGHTS
    // ========================================================

    weightsUsed:
      Object.fromEntries(
        components.map(
          (
            component
          ) => [
            component.name,

            round(
              (
                component.weight /
                totalAvailableWeight
              ) * 100
            ),
          ]
        )
      ),


    // ========================================================
    // METHODOLOGY
    // ========================================================

    methodology:
      satelliteScore !== null
        ? "Impact score combines geo-tagged human field survey observations with Sentinel-2 NDVI satellite evidence. Human vegetation and satellite vegetation are also compared as independent evidence."
        : "Impact score is calculated from available geo-tagged human field survey observations. Satellite weight is redistributed because satellite data is unavailable.",
  };
};


// ============================================================
// 8. BEFORE / AFTER IMPACT COMPARISON
// ============================================================

const calculateImpactComparison = ({
  before,
  after,
}) => {

  const beforeScore =
    Number(
      before?.impactScore
    );

  const afterScore =
    Number(
      after?.impactScore
    );


  const validBefore =
    Number.isFinite(
      beforeScore
    );

  const validAfter =
    Number.isFinite(
      afterScore
    );


  let scoreChange =
    null;

  let percentageChange =
    null;


  if (
    validBefore &&
    validAfter
  ) {

    scoreChange =
      round(
        afterScore -
        beforeScore,
        1
      );


    if (
      beforeScore !== 0
    ) {

      percentageChange =
        round(
          (
            scoreChange /
            Math.abs(
              beforeScore
            )
          ) * 100,
          2
        );
    }
  }


  let direction =
    "No comparable data";


  if (
    scoreChange !== null
  ) {

    if (
      scoreChange > 2
    ) {

      direction =
        "Impact improved";

    } else if (
      scoreChange < -2
    ) {

      direction =
        "Impact decreased";

    } else {

      direction =
        "No significant change";
    }
  }


  return {

    before:
      validBefore
        ? round(
            beforeScore,
            1
          )
        : null,

    after:
      validAfter
        ? round(
            afterScore,
            1
          )
        : null,

    change:
      scoreChange,

    percentageChange,

    direction,

    beforeStatus:
      validBefore
        ? getImpactStatus(
            beforeScore
          )
        : "No Data",

    afterStatus:
      validAfter
        ? getImpactStatus(
            afterScore
          )
        : "No Data",
  };
};


// ============================================================
// 9. RECOMMENDATION ENGINE
// ============================================================

const generateImpactRecommendations = ({
  impactScore,
  status,
  water,
  retention,
  vegetation,
  structure,
  maintenance,
  satelliteNDVI,
  ndviChange,
}) => {

  const recommendations = [];


  const waterScore =
    fiveToHundred(water);

  const retentionScore =
    fiveToHundred(retention);

  const vegetationScore =
    normalizeFieldVegetation(
      vegetation
    );

  const structureScore =
    fiveToHundred(structure);

  const maintenanceScore =
    fiveToHundred(maintenance);


  // ==========================================================
  // WATER
  // ==========================================================

  if (
    waterScore !== null &&
    waterScore < 50
  ) {

    recommendations.push({
      priority: "HIGH",
      area: "Water Availability",

      recommendation:
        "Improve water availability through water harvesting, recharge structures and restoration of local water sources.",

      reason:
        `Human survey water score is ${waterScore}/100.`,
    });
  }


  // ==========================================================
  // RETENTION
  // ==========================================================

  if (
    retentionScore !== null &&
    retentionScore < 50
  ) {

    recommendations.push({
      priority: "HIGH",
      area: "Water Retention",

      recommendation:
        "Strengthen soil and water conservation measures such as check dams, contour trenches, bunds and retention structures.",

      reason:
        `Human survey retention score is ${retentionScore}/100.`,
    });
  }


  // ==========================================================
  // VEGETATION
  // ==========================================================

  if (
    vegetationScore !== null &&
    vegetationScore < 50
  ) {

    recommendations.push({
      priority: "HIGH",
      area: "Vegetation",

      recommendation:
        "Increase plantation and vegetation restoration activities and protect regenerated vegetation.",

      reason:
        `Field vegetation score is ${vegetationScore}/100.`,
    });
  }


  // ==========================================================
  // SATELLITE VEGETATION
  // ==========================================================

  if (
    satelliteNDVI !== null &&
    satelliteNDVI !== undefined &&
    Number.isFinite(
      Number(satelliteNDVI)
    )
  ) {

    const satelliteScore =
      ndviToScore(
        satelliteNDVI
      );


    if (
      satelliteScore < 40
    ) {

      recommendations.push({
        priority: "HIGH",
        area: "Satellite Vegetation",

        recommendation:
          "Satellite imagery indicates low vegetation. Verify field conditions and consider vegetation restoration or plantation measures.",

        reason:
          `Sentinel-2 NDVI is ${Number(
            satelliteNDVI
          ).toFixed(3)}.`,
      });
    }
  }


  // ==========================================================
  // STRUCTURE
  // ==========================================================

  if (
    structureScore !== null &&
    structureScore < 50
  ) {

    recommendations.push({
      priority: "HIGH",
      area: "Watershed Structures",

      recommendation:
        "Inspect watershed structures and repair damaged or degraded structures.",

      reason:
        `Field structure score is ${structureScore}/100.`,
    });
  }


  // ==========================================================
  // MAINTENANCE
  // ==========================================================

  if (
    maintenanceScore !== null &&
    maintenanceScore < 50
  ) {

    recommendations.push({
      priority: "MEDIUM",
      area: "Maintenance",

      recommendation:
        "Schedule regular maintenance inspections and repair activities.",

      reason:
        `Maintenance score is ${maintenanceScore}/100.`,
    });
  }


  // ==========================================================
  // NDVI CHANGE
  // ==========================================================

  if (
    ndviChange !== null &&
    ndviChange !== undefined &&
    Number.isFinite(
      Number(ndviChange)
    )
  ) {

    const change =
      Number(
        ndviChange
      );


    if (
      change < -0.05
    ) {

      recommendations.push({
        priority: "HIGH",
        area: "Vegetation Change",

        recommendation:
          "Satellite vegetation has decreased significantly. Conduct a field inspection to identify possible vegetation loss, water stress or land degradation.",

        reason:
          `NDVI decreased by ${change.toFixed(
            3
          )}.`,
      });

    } else if (
      change > 0.05
    ) {

      recommendations.push({
        priority: "LOW",
        area: "Vegetation Improvement",

        recommendation:
          "Vegetation has improved according to satellite evidence. Continue current watershed interventions and protection measures.",

        reason:
          `NDVI increased by ${change.toFixed(
            3
          )}.`,
      });
    }
  }


  // ==========================================================
  // OVERALL SCORE
  // ==========================================================

  if (
    Number.isFinite(
      Number(impactScore)
    )
  ) {

    const score =
      Number(
        impactScore
      );


    if (
      score >= 80
    ) {

      recommendations.push({
        priority: "LOW",
        area: "Overall Performance",

        recommendation:
          "Project performance is strong. Continue monitoring and maintain existing watershed interventions.",

        reason:
          `Overall impact score is ${score}/100.`,
      });

    } else if (
      score < 30
    ) {

      recommendations.push({
        priority: "CRITICAL",
        area: "Overall Performance",

        recommendation:
          "Immediate field inspection and corrective action are recommended because the overall impact score is critically low.",

        reason:
          `Overall impact score is ${score}/100.`,
      });
    }
  }


  // ==========================================================
  // NO RECOMMENDATION
  // ==========================================================

  if (
    recommendations.length === 0
  ) {

    recommendations.push({
      priority: "LOW",
      area: "Overall Performance",

      recommendation:
        "Continue regular monitoring and maintain current watershed development measures.",

      reason:
        "No major deficiency was detected from the available evidence.",
    });
  }


  return recommendations;
};


// ============================================================
// 10. EXPORTS
// ============================================================

module.exports = {

  calculateCombinedImpactScore,

  calculateImpactComparison,

  generateImpactRecommendations,

  getImpactStatus,

  fiveToHundred,

  ndviToScore,

  classifyNDVI,

  normalizeFieldVegetation,
};