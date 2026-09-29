const PDFDocument = require("pdfkit");
const axios = require("axios");

// ============================================================
// JALDRISHTI - COMPLETE WATERSHED IMPACT PDF REPORT
// ============================================================
//
// FIXES
// ------------------------------------------------------------
// 1. Proper BEFORE / AFTER survey normalization
// 2. Proper BEFORE / AFTER satellite normalization
// 3. Correct 60% Human + 40% Satellite calculation
// 4. No-data != Critical
// 5. Supports multiple field-photo formats
// 6. Supports multiple satellite-image URL formats
// 7. NDVI + NDWI comparison
// 8. Combined score comparison
// 9. Automatic recommendations
// 10. Professional landscape A4 report
// 11. Correct page numbering
// 12. Safer PDF generation
// 13. Better missing-data handling
// 14. Project deadline support
// 15. Satellite history
//
// ============================================================


// ============================================================
// DEPENDENCIES
// ============================================================

const PDFDocument = require("pdfkit");
const axios = require("axios");


// ============================================================
// PAGE CONSTANTS
// ============================================================

const PAGE = {
  width: 841.89,
  height: 595.28,

  left: 42,
  right: 42,
  top: 42,
  bottom: 42,
};

const CONTENT_WIDTH =
  PAGE.width -
  PAGE.left -
  PAGE.right;


// ============================================================
// COLORS
// ============================================================

const COLORS = {
  black: "#111827",
  dark: "#1F2937",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  border: "#D1D5DB",

  blue: "#2563EB",
  blueLight: "#EFF6FF",

  green: "#15803D",
  greenLight: "#F0FDF4",

  orange: "#D97706",
  orangeLight: "#FFFBEB",

  red: "#DC2626",
  redLight: "#FEF2F2",

  purple: "#7C3AED",
  purpleLight: "#F5F3FF",

  white: "#FFFFFF",
};


// ============================================================
// SCORE WEIGHTS
// ============================================================

const SCORE_WEIGHTS = {
  human: 0.60,
  satellite: 0.40,
};


// ============================================================
// SAFE HELPERS
// ============================================================

const hasValue = (value) => {
  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  );
};


const safeText = (
  value,
  fallback = "N/A"
) => {
  if (!hasValue(value)) {
    return fallback;
  }

  return String(value);
};


const safeNumber = (
  value,
  fallback = 0
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};


const isNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  return Number.isFinite(
    Number(value)
  );
};


const clamp = (
  value,
  min = 0,
  max = 100
) => {
  const number = safeNumber(value);

  return Math.min(
    max,
    Math.max(
      min,
      number
    )
  );
};


const formatDate = (value) => {
  if (!hasValue(value)) {
    return "N/A";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return safeText(value);
  }

  return date.toLocaleDateString(
    "en-IN"
  );
};


const formatDateTime = (value) => {
  if (!hasValue(value)) {
    return "N/A";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return safeText(value);
  }

  return date.toLocaleString(
    "en-IN"
  );
};


const getPercentageChange = (
  before,
  after
) => {
  if (
    !isNumber(before) ||
    !isNumber(after)
  ) {
    return null;
  }

  const b = Number(before);
  const a = Number(after);

  if (b === 0) {
    if (a === 0) {
      return 0;
    }

    return null;
  }

  return (
    ((a - b) /
      Math.abs(b)) *
    100
  );
};


// ============================================================
// IMPACT STATUS
// ============================================================

const getImpactStatus = (
  score
) => {
  if (
    score === null ||
    score === undefined ||
    !Number.isFinite(
      Number(score)
    )
  ) {
    return "Data Unavailable";
  }

  const value = Number(score);

  if (value >= 80) {
    return "Good";
  }

  if (value >= 60) {
    return "Moderate";
  }

  if (value >= 40) {
    return "Poor";
  }

  return "Critical";
};


const getStatusColor = (
  score
) => {
  if (
    score === null ||
    score === undefined
  ) {
    return COLORS.gray;
  }

  const value = Number(score);

  if (value >= 80) {
    return COLORS.green;
  }

  if (value >= 60) {
    return COLORS.orange;
  }

  return COLORS.red;
};


// ============================================================
// PAGE MANAGEMENT
// ============================================================

const addLandscapePage = (
  doc
) => {
  doc.addPage({
    size: "A4",
    layout: "landscape",
    margin: 42,
  });

  doc.x = PAGE.left;
  doc.y = PAGE.top;
};


const ensureSpace = (
  doc,
  requiredHeight
) => {
  const bottom =
    PAGE.height -
    PAGE.bottom -
    25;

  if (
    doc.y +
      requiredHeight >
    bottom
  ) {
    addLandscapePage(doc);
  }
};


// ============================================================
// PAGE TITLE
// ============================================================

const addPageTitle = (
  doc,
  title,
  subtitle = null
) => {
  ensureSpace(
    doc,
    70
  );

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(COLORS.dark)
    .text(
      safeText(title),
      PAGE.left,
      doc.y
    );

  if (subtitle) {
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLORS.gray)
      .text(
        safeText(subtitle),
        PAGE.left,
        doc.y + 23,
        {
          width: CONTENT_WIDTH,
        }
      );
  }

  doc.y += subtitle
    ? 48
    : 30;

  doc
    .moveTo(
      PAGE.left,
      doc.y
    )
    .lineTo(
      PAGE.width -
        PAGE.right,
      doc.y
    )
    .strokeColor(
      COLORS.border
    )
    .lineWidth(0.7)
    .stroke();

  doc.y += 12;
};


// ============================================================
// DIVIDER
// ============================================================

const drawDivider = (
  doc
) => {
  doc
    .moveTo(
      PAGE.left,
      doc.y
    )
    .lineTo(
      PAGE.width -
        PAGE.right,
      doc.y
    )
    .strokeColor(
      COLORS.border
    )
    .lineWidth(0.7)
    .stroke();

  doc.y += 12;
};


// ============================================================
// INFO BOX
// ============================================================

const drawInfoBox = (
  doc,
  x,
  y,
  width,
  height,
  title,
  rows = []
) => {
  doc
    .roundedRect(
      x,
      y,
      width,
      height,
      6
    )
    .fillAndStroke(
      "#F8FAFC",
      COLORS.border
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.blue)
    .text(
      safeText(title),
      x + 12,
      y + 10
    );

  let currentY =
    y + 34;

  rows.forEach(
    ([key, value]) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.dark)
        .text(
          `${safeText(key)}:`,
          x + 12,
          currentY,
          {
            width: 105,
          }
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.dark)
        .text(
          safeText(value),
          x + 120,
          currentY,
          {
            width:
              width - 132,
            height: 30,
          }
        );

      currentY += 22;
    }
  );
};


// ============================================================
// METRIC BOX
// ============================================================

const drawMetricBox = (
  doc,
  x,
  y,
  width,
  height,
  title,
  value,
  subtitle,
  accent
) => {
  doc
    .roundedRect(
      x,
      y,
      width,
      height,
      6
    )
    .fillAndStroke(
      "#F8FAFC",
      COLORS.border
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(accent)
    .text(
      safeText(title),
      x + 12,
      y + 10
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor(COLORS.dark)
    .text(
      safeText(value),
      x + 12,
      y + 28
    );

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(
      safeText(subtitle),
      x + 12,
      y + 58,
      {
        width:
          width - 24,
      }
    );
};


// ============================================================
// DATA NORMALIZATION
// ============================================================

const normalizeSurvey = (
  survey
) => {
  if (!survey) {
    return null;
  }

  return {
    ...survey,

    surveyType:
      survey.surveyType ||
      survey.type ||
      survey.assessmentType ||
      null,

    latitude:
      survey.latitude ??
      survey.lat ??
      survey.location?.latitude ??
      survey.location?.lat ??
      null,

    longitude:
      survey.longitude ??
      survey.lng ??
      survey.lon ??
      survey.location?.longitude ??
      survey.location?.lng ??
      null,

    gpsAccuracy:
      survey.gpsAccuracy ??
      survey.accuracy ??
      survey.location?.accuracy ??
      null,

    water:
      survey.water ??
      survey.waterScore ??
      null,

    retention:
      survey.retention ??
      survey.retentionScore ??
      null,

    vegetation:
      survey.vegetation ??
      survey.vegetationScore ??
      survey.fieldVegetationScore ??
      null,

    structure:
      survey.structure ??
      survey.structureScore ??
      null,

    maintenance:
      survey.maintenance ??
      survey.maintenanceScore ??
      null,

    impactScore:
      survey.impactScore ??
      survey.score ??
      null,

    createdAt:
      survey.createdAt ??
      survey.surveyDate ??
      survey.date ??
      null,

    notes:
      survey.notes ??
      survey.remark ??
      survey.remarks ??
      null,
  };
};


const normalizeSatellite = (
  satellite
) => {
  if (!satellite) {
    return null;
  }

  return {
    ...satellite,

    analysisType:
      satellite.analysisType ||
      satellite.type ||
      null,

    latitude:
      satellite.latitude ??
      satellite.lat ??
      satellite.location?.latitude ??
      null,

    longitude:
      satellite.longitude ??
      satellite.lng ??
      satellite.location?.longitude ??
      null,

    ndvi:
      satellite.ndvi ??
      satellite.NDVI ??
      satellite.metrics?.ndvi ??
      null,

    ndwi:
      satellite.ndwi ??
      satellite.NDWI ??
      satellite.metrics?.ndwi ??
      null,

    satelliteDate:
      satellite.satelliteDate ??
      satellite.date ??
      satellite.acquisitionDate ??
      null,

    dateFrom:
      satellite.dateFrom ??
      satellite.fromDate ??
      null,

    dateTo:
      satellite.dateTo ??
      satellite.toDate ??
      null,

    classification:
      satellite.classification ??
      satellite.vegetationClass ??
      null,

    cloudCoverage:
      satellite.cloudCoverage ??
      satellite.cloudPercentage ??
      satellite.cloudCover ??
      null,

    source:
      satellite.source ||
      "Copernicus Sentinel-2 L2A",

    satelliteVegetationScore:
      satellite.satelliteVegetationScore ??
      satellite.vegetationScore ??
      satellite.score ??
      null,
  };
};


// ============================================================
// HUMAN SCORE
// ============================================================

const getHumanSurveyScore = (
  survey
) => {
  const normalized =
    normalizeSurvey(
      survey
    );

  if (!normalized) {
    return null;
  }

  if (
    isNumber(
      normalized.impactScore
    )
  ) {
    return clamp(
      normalized.impactScore
    );
  }

  const values = [
    normalized.water,
    normalized.retention,
    normalized.vegetation,
    normalized.structure,
    normalized.maintenance,
  ];

  const available =
    values.filter(
      isNumber
    );

  if (
    available.length === 0
  ) {
    return null;
  }

  let total = 0;
  let count = 0;

  // Water
  if (
    isNumber(
      normalized.water
    )
  ) {
    total +=
      clamp(
        normalized.water,
        0,
        5
      ) / 5 * 100;

    count++;
  }

  // Retention
  if (
    isNumber(
      normalized.retention
    )
  ) {
    total +=
      clamp(
        normalized.retention,
        0,
        5
      ) / 5 * 100;

    count++;
  }

  // Vegetation
  if (
    isNumber(
      normalized.vegetation
    )
  ) {
    let vegetation =
      Number(
        normalized.vegetation
      );

    if (
      vegetation <= 5
    ) {
      vegetation =
        vegetation /
        5 *
        100;
    }

    total += clamp(
      vegetation,
      0,
      100
    );

    count++;
  }

  // Structure
  if (
    isNumber(
      normalized.structure
    )
  ) {
    total +=
      clamp(
        normalized.structure,
        0,
        5
      ) / 5 * 100;

    count++;
  }

  // Maintenance
  if (
    isNumber(
      normalized.maintenance
    )
  ) {
    total +=
      clamp(
        normalized.maintenance,
        0,
        5
      ) / 5 * 100;

    count++;
  }

  if (
    count === 0
  ) {
    return null;
  }

  return clamp(
    total / count
  );
};


// ============================================================
// SATELLITE SCORE
// ============================================================

const getSatelliteScore = (
  satellite
) => {
  const normalized =
    normalizeSatellite(
      satellite
    );

  if (!normalized) {
    return null;
  }

  if (
    isNumber(
      normalized.satelliteVegetationScore
    )
  ) {
    return clamp(
      normalized.satelliteVegetationScore
    );
  }

  if (
    isNumber(
      normalized.ndvi
    )
  ) {
    const ndvi =
      Number(
        normalized.ndvi
      );

    return clamp(
      ((ndvi + 1) /
        2) *
        100
    );
  }

  return null;
};


// ============================================================
// COMBINED SCORE
// ============================================================

const calculateCombinedImpact = (
  humanScore,
  satelliteScore
) => {
  const humanAvailable =
    isNumber(
      humanScore
    );

  const satelliteAvailable =
    isNumber(
      satelliteScore
    );

  if (
    humanAvailable &&
    satelliteAvailable
  ) {
    return {
      score: clamp(
        Number(
          humanScore
        ) *
          SCORE_WEIGHTS.human +
        Number(
          satelliteScore
        ) *
          SCORE_WEIGHTS.satellite
      ),

      humanWeight:
        SCORE_WEIGHTS.human,

      satelliteWeight:
        SCORE_WEIGHTS.satellite,

      method:
        "60% Human Survey + 40% Satellite Analysis",

      humanAvailable: true,

      satelliteAvailable: true,
    };
  }

  if (
    humanAvailable
  ) {
    return {
      score:
        Number(
          humanScore
        ),

      humanWeight: 1,

      satelliteWeight: 0,

      method:
        "Human Survey only - satellite data unavailable",

      humanAvailable: true,

      satelliteAvailable: false,
    };
  }

  if (
    satelliteAvailable
  ) {
    return {
      score:
        Number(
          satelliteScore
        ),

      humanWeight: 0,

      satelliteWeight: 1,

      method:
        "Satellite Analysis only - human survey unavailable",

      humanAvailable: false,

      satelliteAvailable: true,
    };
  }

  return {
    score: null,

    humanWeight: 0,

    satelliteWeight: 0,

    method:
      "No sufficient assessment data available",

    humanAvailable: false,

    satelliteAvailable: false,
  };
};


// ============================================================
// IMAGE URL EXTRACTION
// ============================================================

const extractUrl = (
  value
) => {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return (
      value.url ||
      value.imageUrl ||
      value.secure_url ||
      value.src ||
      value.path ||
      null
    );
  }

  return null;
};


const getSurveyPhotos = (
  survey
) => {
  if (!survey) {
    return [];
  }

  const sources = [
    survey.photos,
    survey.photoUrls,
    survey.images,
    survey.photo,
    survey.image,
  ];

  for (
    const source of sources
  ) {
    if (
      Array.isArray(
        source
      )
    ) {
      return source
        .map(
          extractUrl
        )
        .filter(Boolean);
    }

    const url =
      extractUrl(
        source
      );

    if (url) {
      return [url];
    }
  }

  return [];
};


const getSatelliteImageUrl = (
  satellite
) => {
  if (!satellite) {
    return null;
  }

  const candidates = [
    satellite.imageUrl,
    satellite.imageryUrl,
    satellite.previewUrl,
    satellite.thumbnailUrl,
    satellite.previewImageUrl,
    satellite.satelliteImageUrl,
    satellite.image,
    satellite.url,
    satellite.imagery,
    satellite.preview,
  ];

  for (
    const candidate of
      candidates
  ) {
    const url =
      extractUrl(
        candidate
      );

    if (url) {
      return url;
    }
  }

  return null;
};


// ============================================================
// FETCH IMAGE
// ============================================================

const fetchImageBuffer = async (
  url
) => {
  if (
    !url ||
    typeof url !==
      "string"
  ) {
    return null;
  }

  try {
    const response =
      await axios.get(
        url,
        {
          responseType:
            "arraybuffer",

          timeout: 20000,

          maxContentLength:
            15 * 1024 * 1024,

          headers: {
            "User-Agent":
              "JalDrishti-PDF-Generator/1.0",
          },
        }
      );

    return Buffer.from(
      response.data
    );
  } catch (error) {
    console.log(
      "PDF image download failed:",
      url,
      error.message
    );

    return null;
  }
};


// ============================================================
// PROJECT INFORMATION
// ============================================================

const addProjectInformation = (
  doc,
  project
) => {
  addPageTitle(
    doc,
    "1. Project Information",
    "Watershed project identification and location details"
  );

  const y =
    doc.y;

  const gap = 18;

  const width =
    (
      CONTENT_WIDTH -
      gap
    ) / 2;

  drawInfoBox(
    doc,
    PAGE.left,
    y,
    width,
    250,
    "Project Details",
    [
      [
        "Project Name",
        project?.name,
      ],

      [
        "Village",
        project?.village,
      ],

      [
        "Project Type",
        project?.type,
      ],

      [
        "Status",
        project?.status ||
          "Monitoring",
      ],

      [
        "Implementation",
        formatDate(
          project?.implementationDate
        ),
      ],

      [
        "Deadline",
        formatDate(
          project?.deadline ||
            project?.dueDate
        ),
      ],

      [
        "Created",
        formatDate(
          project?.createdAt
        ),
      ],
    ]
  );

  drawInfoBox(
    doc,
    PAGE.left +
      width +
      gap,
    y,
    width,
    250,
    "Location Details",
    [
      [
        "District",
        project?.district,
      ],

      [
        "State",
        project?.state,
      ],

      [
        "Latitude",
        project?.latitude,
      ],

      [
        "Longitude",
        project?.longitude,
      ],

      [
        "Project ID",
        project?._id,
      ],

      [
        "Stored Score",
        isNumber(
          project?.impactScore
        )
          ? `${Number(
              project.impactScore
            ).toFixed(1)}/100`
          : "Calculated below",
      ],
    ]
  );

  doc.y =
    y + 270;

  if (
    project?.description
  ) {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.dark)
      .text(
        "Project Description"
      );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.dark)
      .text(
        safeText(
          project.description
        ),
        {
          width:
            CONTENT_WIDTH,
        }
      );

    doc.y += 10;
  }
};


// ============================================================
// SURVEY DETAILS
// ============================================================

const addSurveyDetails = (
  doc,
  survey,
  label
) => {
  survey =
    normalizeSurvey(
      survey
    );

  if (!survey) {
    return;
  }

  ensureSpace(
    doc,
    300
  );

  const gap = 18;

  const width =
    (
      CONTENT_WIDTH -
      gap
    ) / 2;

  const y =
    doc.y;

  const humanScore =
    getHumanSurveyScore(
      survey
    );

  drawInfoBox(
    doc,
    PAGE.left,
    y,
    width,
    270,
    label,
    [
      [
        "Survey Type",
        survey.surveyType,
      ],

      [
        "Survey Date",
        formatDateTime(
          survey.createdAt
        ),
      ],

      [
        "Latitude",
        survey.latitude,
      ],

      [
        "Longitude",
        survey.longitude,
      ],

      [
        "GPS Accuracy",
        isNumber(
          survey.gpsAccuracy
        )
          ? `${Number(
              survey.gpsAccuracy
            ).toFixed(1)} m`
          : "N/A",
      ],

      [
        "Water",
        isNumber(
          survey.water
        )
          ? `${survey.water}/5`
          : "N/A",
      ],

      [
        "Retention",
        isNumber(
          survey.retention
        )
          ? `${survey.retention}/5`
          : "N/A",
      ],

      [
        "Vegetation",
        isNumber(
          survey.vegetation
        )
          ? `${survey.vegetation}/100`
          : "N/A",
      ],
    ]
  );

  drawInfoBox(
    doc,
    PAGE.left +
      width +
      gap,
    y,
    width,
    270,
    "Assessment Details",
    [
      [
        "Structure",
        isNumber(
          survey.structure
        )
          ? `${survey.structure}/5`
          : "N/A",
      ],

      [
        "Maintenance",
        isNumber(
          survey.maintenance
        )
          ? `${survey.maintenance}/5`
          : "N/A",
      ],

      [
        "Human Score",
        humanScore !== null
          ? `${humanScore.toFixed(2)}/100`
          : "N/A",
      ],

      [
        "Stored Impact",
        isNumber(
          survey.impactScore
        )
          ? `${Number(
              survey.impactScore
            ).toFixed(2)}/100`
          : "N/A",
      ],

      [
        "Status",
        survey.status ||
          getImpactStatus(
            humanScore
          ),
      ],

      [
        "Field Vegetation",
        survey.fieldVegetationScore,
      ],

      [
        "Satellite Vegetation",
        survey.satelliteVegetationScore,
      ],

      [
        "Score Version",
        survey.impactScoreVersion,
      ],
    ]
  );

  doc.y =
    y + 290;

  if (survey.notes) {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.dark)
      .text(
        "Survey Notes"
      );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.dark)
      .text(
        safeText(
          survey.notes
        ),
        {
          width:
            CONTENT_WIDTH,
        }
      );

    doc.y += 10;
  }
};


// ============================================================
// HUMAN COMPARISON TABLE
// ============================================================

const addHumanComparisonTable = (
  doc,
  beforeSurvey,
  afterSurvey
) => {
  beforeSurvey =
    normalizeSurvey(
      beforeSurvey
    );

  afterSurvey =
    normalizeSurvey(
      afterSurvey
    );

  addPageTitle(
    doc,
    "4. Human Survey Before vs After",
    "Comparison of field-observed watershed indicators"
  );

  const beforeScore =
    getHumanSurveyScore(
      beforeSurvey
    );

  const afterScore =
    getHumanSurveyScore(
      afterSurvey
    );

  const rows = [
    [
      "Human Impact Score",
      beforeScore !== null
        ? beforeScore.toFixed(1)
        : "N/A",
      afterScore !== null
        ? afterScore.toFixed(1)
        : "N/A",
      beforeScore !== null &&
      afterScore !== null
        ? (
            afterScore -
            beforeScore
          ).toFixed(1)
        : "N/A",
    ],

    [
      "Water",
      safeText(
        beforeSurvey?.water
      ),
      safeText(
        afterSurvey?.water
      ),
      isNumber(
        beforeSurvey?.water
      ) &&
      isNumber(
        afterSurvey?.water
      )
        ? (
            Number(
              afterSurvey.water
            ) -
            Number(
              beforeSurvey.water
            )
          ).toFixed(1)
        : "N/A",
    ],

    [
      "Retention",
      safeText(
        beforeSurvey?.retention
      ),
      safeText(
        afterSurvey?.retention
      ),
      isNumber(
        beforeSurvey?.retention
      ) &&
      isNumber(
        afterSurvey?.retention
      )
        ? (
            Number(
              afterSurvey.retention
            ) -
            Number(
              beforeSurvey.retention
            )
          ).toFixed(1)
        : "N/A",
    ],

    [
      "Vegetation",
      safeText(
        beforeSurvey?.vegetation
      ),
      safeText(
        afterSurvey?.vegetation
      ),
      isNumber(
        beforeSurvey?.vegetation
      ) &&
      isNumber(
        afterSurvey?.vegetation
      )
        ? (
            Number(
              afterSurvey.vegetation
            ) -
            Number(
              beforeSurvey.vegetation
            )
          ).toFixed(1)
        : "N/A",
    ],

    [
      "Structure",
      safeText(
        beforeSurvey?.structure
      ),
      safeText(
        afterSurvey?.structure
      ),
      isNumber(
        beforeSurvey?.structure
      ) &&
      isNumber(
        afterSurvey?.structure
      )
        ? (
            Number(
              afterSurvey.structure
            ) -
            Number(
              beforeSurvey.structure
            )
          ).toFixed(1)
        : "N/A",
    ],

    [
      "Maintenance",
      safeText(
        beforeSurvey?.maintenance
      ),
      safeText(
        afterSurvey?.maintenance
      ),
      isNumber(
        beforeSurvey?.maintenance
      ) &&
      isNumber(
        afterSurvey?.maintenance
      )
        ? (
            Number(
              afterSurvey.maintenance
            ) -
            Number(
              beforeSurvey.maintenance
            )
          ).toFixed(1)
        : "N/A",
    ],
  ];

  const widths = [
    220,
    170,
    170,
    170,
  ];

  let y =
    doc.y;

  const headers = [
    "Indicator",
    "Before",
    "After",
    "Change",
  ];

  let x =
    PAGE.left;

  headers.forEach(
    (
      header,
      index
    ) => {
      doc
        .rect(
          x,
          y,
          widths[index],
          28
        )
        .fillAndStroke(
          "#E5E7EB",
          COLORS.border
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.dark)
        .text(
          header,
          x + 6,
          y + 8
        );

      x +=
        widths[index];
    }
  );

  y += 28;

  rows.forEach(
    (row) => {
      x =
        PAGE.left;

      row.forEach(
        (
          value,
          index
        ) => {
          doc
            .rect(
              x,
              y,
              widths[index],
              34
            )
            .fillAndStroke(
              COLORS.white,
              COLORS.border
            );

          doc
            .font(
              index === 0
                ? "Helvetica-Bold"
                : "Helvetica"
            )
            .fontSize(8)
            .fillColor(COLORS.dark)
            .text(
              safeText(
                value
              ),
              x + 6,
              y + 10,
              {
                width:
                  widths[index] -
                  12,
              }
            );

          x +=
            widths[index];
        }
      );

      y += 34;
    }
  );

  doc.y =
    y + 20;
};


// ============================================================
// HUMAN PHOTOS
// ============================================================

const addHumanPhotoComparison =
  async (
    doc,
    beforeSurvey,
    afterSurvey
  ) => {
    const beforePhotos =
      getSurveyPhotos(
        beforeSurvey
      );

    const afterPhotos =
      getSurveyPhotos(
        afterSurvey
      );

    if (
      beforePhotos.length ===
        0 &&
      afterPhotos.length ===
        0
    ) {
      return;
    }

    const beforeImage =
      beforePhotos.length > 0
        ? await fetchImageBuffer(
            beforePhotos[0]
          )
        : null;

    const afterImage =
      afterPhotos.length > 0
        ? await fetchImageBuffer(
            afterPhotos[0]
          )
        : null;

    addLandscapePage(
      doc
    );

    addPageTitle(
      doc,
      "5. Human Survey Evidence",
      "Geo-tagged field photographs before and after intervention"
    );

    const gap = 25;

    const width =
      (
        CONTENT_WIDTH -
        gap
      ) / 2;

    const height =
      270;

    const y =
      doc.y;

    const drawPhoto = (
      image,
      x,
      title,
      survey
    ) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLORS.dark)
        .text(
          title,
          x,
          y
        );

      doc
        .roundedRect(
          x,
          y + 22,
          width,
          height,
          6
        )
        .fillAndStroke(
          "#F8FAFC",
          COLORS.border
        );

      if (image) {
        try {
          doc.image(
            image,
            x + 5,
            y + 27,
            {
              fit: [
                width - 10,
                height - 10,
              ],

              align:
                "center",

              valign:
                "center",
            }
          );
        } catch (
          error
        ) {
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(COLORS.gray)
            .text(
              "Unable to render photograph",
              x + 10,
              y + 130,
              {
                width:
                  width - 20,
                align:
                  "center",
              }
            );
        }
      } else {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLORS.gray)
          .text(
            "No field photo available",
            x + 10,
            y + 130,
            {
              width:
                width - 20,
              align:
                "center",
            }
          );
      }

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.gray)
        .text(
          `Date: ${formatDateTime(
            survey?.createdAt ||
              survey?.surveyDate
          )}`,
          x,
          y +
            height +
            32
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.gray)
        .text(
          `GPS: ${safeText(
            survey?.latitude
          )}, ${safeText(
            survey?.longitude
          )}`,
          x,
          y +
            height +
            47
        );
    };

    drawPhoto(
      beforeImage,
      PAGE.left,
      "BEFORE FIELD SURVEY",
      beforeSurvey
    );

    drawPhoto(
      afterImage,
      PAGE.left +
        width +
        gap,
      "AFTER FIELD SURVEY",
      afterSurvey
    );

    doc.y =
      y +
      height +
      80;
  };


// ============================================================
// SATELLITE DETAILS
// ============================================================

const addSatelliteDetails = (
  doc,
  satellite,
  label
) => {
  satellite =
    normalizeSatellite(
      satellite
    );

  if (!satellite) {
    return;
  }

  ensureSpace(
    doc,
    270
  );

  const y =
    doc.y;

  doc
    .roundedRect(
      PAGE.left,
      y,
      CONTENT_WIDTH,
      230,
      6
    )
    .fillAndStroke(
      "#F8FAFC",
      COLORS.border
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(COLORS.blue)
    .text(
      safeText(label),
      PAGE.left + 12,
      y + 12
    );

  const rows = [
    [
      "Analysis Type",
      satellite.analysisType,
    ],

    [
      "Satellite Date",
      formatDate(
        satellite.satelliteDate
      ),
    ],

    [
      "Date From",
      formatDate(
        satellite.dateFrom
      ),
    ],

    [
      "Date To",
      formatDate(
        satellite.dateTo
      ),
    ],

    [
      "Latitude",
      satellite.latitude,
    ],

    [
      "Longitude",
      satellite.longitude,
    ],

    [
      "NDVI",
      isNumber(
        satellite.ndvi
      )
        ? Number(
            satellite.ndvi
          ).toFixed(4)
        : "N/A",
    ],

    [
      "NDWI",
      isNumber(
        satellite.ndwi
      )
        ? Number(
            satellite.ndwi
          ).toFixed(4)
        : "N/A",
    ],

    [
      "Satellite Score",
      getSatelliteScore(
        satellite
      ) !== null
        ? `${getSatelliteScore(
            satellite
          ).toFixed(1)}/100`
        : "N/A",
    ],

    [
      "Classification",
      satellite.classification,
    ],

    [
      "Source",
      satellite.source,
    ],

    [
      "Cloud Coverage",
      isNumber(
        satellite.cloudCoverage
      )
        ? `${Number(
            satellite.cloudCoverage
          ).toFixed(2)}%`
        : "N/A",
    ],
  ];

  let currentY =
    y + 38;

  rows.forEach(
    ([key, value]) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(COLORS.dark)
        .text(
          `${key}:`,
          PAGE.left + 12,
          currentY,
          {
            width: 110,
          }
        );

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(COLORS.dark)
        .text(
          safeText(value),
          PAGE.left + 125,
          currentY,
          {
            width:
              CONTENT_WIDTH -
              140,
          }
        );

      currentY += 14;
    }
  );

  doc.y =
    y + 250;
};


// ============================================================
// SATELLITE IMAGE COMPARISON
// ============================================================

const addSatelliteImageComparison =
  async (
    doc,
    beforeSatellite,
    afterSatellite
  ) => {
    const beforeUrl =
      getSatelliteImageUrl(
        beforeSatellite
      );

    const afterUrl =
      getSatelliteImageUrl(
        afterSatellite
      );

    const beforeImage =
      await fetchImageBuffer(
        beforeUrl
      );

    const afterImage =
      await fetchImageBuffer(
        afterUrl
      );

    if (
      !beforeImage &&
      !afterImage
    ) {
      return;
    }

    addLandscapePage(
      doc
    );

    addPageTitle(
      doc,
      "7. Satellite Imagery Before vs After",
      "Visual remote-sensing evidence"
    );

    const gap = 22;

    const width =
      (
        CONTENT_WIDTH -
        gap
      ) / 2;

    const imageHeight =
      245;

    const y =
      doc.y;

    const drawSatellite =
      (
        image,
        x,
        title,
        satellite
      ) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(COLORS.dark)
          .text(
            title,
            x,
            y
          );

        doc
          .roundedRect(
            x,
            y + 22,
            width,
            imageHeight,
            6
          )
          .fillAndStroke(
            "#F8FAFC",
            COLORS.border
          );

        if (image) {
          try {
            doc.image(
              image,
              x + 5,
              y + 27,
              {
                fit: [
                  width - 10,
                  imageHeight - 10,
                ],

                align:
                  "center",

                valign:
                  "center",
              }
            );
          } catch (
            error
          ) {
            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor(COLORS.gray)
              .text(
                "Unable to render satellite image",
                x + 10,
                y + 120,
                {
                  width:
                    width - 20,
                  align:
                    "center",
                }
              );
          }
        } else {
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(COLORS.gray)
            .text(
              "Satellite image unavailable",
              x + 10,
              y + 120,
              {
                width:
                  width - 20,
                align:
                  "center",
              }
            );
        }

        const ndvi =
          isNumber(
            satellite?.ndvi
          )
            ? Number(
                satellite.ndvi
              ).toFixed(4)
            : "N/A";

        const ndwi =
          isNumber(
            satellite?.ndwi
          )
            ? Number(
                satellite.ndwi
              ).toFixed(4)
            : "N/A";

        const score =
          getSatelliteScore(
            satellite
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.green)
          .text(
            `NDVI: ${ndvi}`,
            x,
            y +
              imageHeight +
              34
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.blue)
          .text(
            `NDWI: ${ndwi}`,
            x + 105,
            y +
              imageHeight +
              34
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.purple)
          .text(
            `Score: ${
              score !== null
                ? score.toFixed(1)
                : "N/A"
            }/100`,
            x + 205,
            y +
              imageHeight +
              34
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(COLORS.gray)
          .text(
            `Date: ${formatDate(
              satellite?.satelliteDate
            )}`,
            x,
            y +
              imageHeight +
              51
          );
      };

    drawSatellite(
      beforeImage,
      PAGE.left,
      "BEFORE SATELLITE",
      beforeSatellite
    );

    drawSatellite(
      afterImage,
      PAGE.left +
        width +
        gap,
      "AFTER SATELLITE",
      afterSatellite
    );

    doc.y =
      y +
      imageHeight +
      80;
  };


// ============================================================
// SATELLITE HISTORY
// ============================================================

const addSatelliteHistoryTable = (
  doc,
  satelliteAnalyses
) => {
  if (
    !Array.isArray(
      satelliteAnalyses
    ) ||
    satelliteAnalyses.length ===
      0
  ) {
    return;
  }

  addPageTitle(
    doc,
    "9. Satellite Analysis History",
    "Historical Sentinel-2 / Copernicus observations"
  );

  const headers = [
    "Type",
    "Date",
    "NDVI",
    "NDWI",
    "Score",
    "Classification",
    "Source",
  ];

  const widths = [
    75,
    85,
    65,
    65,
    75,
    150,
    185,
  ];

  let y =
    doc.y;

  const drawHeader = () => {
    let x =
      PAGE.left;

    headers.forEach(
      (
        header,
        index
      ) => {
        doc
          .rect(
            x,
            y,
            widths[index],
            25
          )
          .fillAndStroke(
            "#E5E7EB",
            COLORS.border
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor(COLORS.dark)
          .text(
            header,
            x + 4,
            y + 8,
            {
              width:
                widths[index] -
                8,
            }
          );

        x +=
          widths[index];
      }
    );

    y += 25;
  };

  drawHeader();

  satelliteAnalyses.forEach(
    (rawSatellite) => {
      const satellite =
        normalizeSatellite(
          rawSatellite
        );

      if (
        y + 34 >
        PAGE.height -
          PAGE.bottom -
          20
      ) {
        addLandscapePage(
          doc
        );

        addPageTitle(
          doc,
          "9. Satellite Analysis History",
          "Continued"
        );

        y =
          doc.y;

        drawHeader();
      }

      const score =
        getSatelliteScore(
          satellite
        );

      const values = [
        safeText(
          satellite?.analysisType
        ),

        formatDate(
          satellite?.satelliteDate
        ),

        isNumber(
          satellite?.ndvi
        )
          ? Number(
              satellite.ndvi
            ).toFixed(4)
          : "N/A",

        isNumber(
          satellite?.ndwi
        )
          ? Number(
              satellite.ndwi
            ).toFixed(4)
          : "N/A",

        score !== null
          ? score.toFixed(1)
          : "N/A",

        safeText(
          satellite?.classification
        ),

        safeText(
          satellite?.source
        ),
      ];

      let x =
        PAGE.left;

      values.forEach(
        (
          value,
          index
        ) => {
          doc
            .rect(
              x,
              y,
              widths[index],
              34
            )
            .fillAndStroke(
              COLORS.white,
              COLORS.border
            );

          doc
            .font("Helvetica")
            .fontSize(6.7)
            .fillColor(COLORS.dark)
            .text(
              value,
              x + 4,
              y + 8,
              {
                width:
                  widths[index] -
                  8,
                height: 20,
                ellipsis:
                  true,
              }
            );

          x +=
            widths[index];
        }
      );

      y += 34;
    }
  );

  doc.y =
    y + 15;
};


// ============================================================
// IMPACT SUMMARY
// ============================================================

const addImpactSummary = (
  doc,
  beforeSurvey,
  afterSurvey,
  beforeSatellite,
  afterSatellite
) => {
  addPageTitle(
    doc,
    "10. Impact Summary",
    "Integrated interpretation of field and satellite evidence"
  );

  const humanBefore =
    getHumanSurveyScore(
      beforeSurvey
    );

  const humanAfter =
    getHumanSurveyScore(
      afterSurvey
    );

  const satelliteBefore =
    getSatelliteScore(
      beforeSatellite
    );

  const satelliteAfter =
    getSatelliteScore(
      afterSatellite
    );

  const combinedBefore =
    calculateCombinedImpact(
      humanBefore,
      satelliteBefore
    );

  const combinedAfter =
    calculateCombinedImpact(
      humanAfter,
      satelliteAfter
    );

  const combinedChange =
    combinedBefore.score !==
      null &&
    combinedAfter.score !==
      null
      ? combinedAfter.score -
        combinedBefore.score
      : null;

  const boxWidth =
    (
      CONTENT_WIDTH -
      54
    ) / 4;

  const boxHeight =
    92;

  const gap = 18;

  const y =
    doc.y;

  drawMetricBox(
    doc,
    PAGE.left,
    y,
    boxWidth,
    boxHeight,
    "Human Survey",
    humanAfter !== null
      ? `${humanAfter.toFixed(1)}/100`
      : "N/A",
    humanAfter !== null
      ? `Before: ${
          humanBefore !== null
            ? humanBefore.toFixed(1)
            : "N/A"
        }`
      : "No field score",
    COLORS.blue
  );

  drawMetricBox(
    doc,
    PAGE.left +
      boxWidth +
      gap,
    y,
    boxWidth,
    boxHeight,
    "Satellite Score",
    satelliteAfter !== null
      ? `${satelliteAfter.toFixed(1)}/100`
      : "N/A",
    satelliteAfter !== null
      ? `Before: ${
          satelliteBefore !== null
            ? satelliteBefore.toFixed(1)
            : "N/A"
        }`
      : "No satellite score",
    COLORS.green
  );

  drawMetricBox(
    doc,
    PAGE.left +
      (boxWidth + gap) *
        2,
    y,
    boxWidth,
    boxHeight,
    "Combined Impact",
    combinedAfter.score !==
      null
      ? `${combinedAfter.score.toFixed(
          1
        )}/100`
      : "N/A",
    combinedChange !==
      null
      ? `Change: ${
          combinedChange >=
          0
            ? "+"
            : ""
        }${combinedChange.toFixed(
          1
        )}`
      : "No comparison",
    COLORS.purple
  );

  drawMetricBox(
    doc,
    PAGE.left +
      (boxWidth + gap) *
        3,
    y,
    boxWidth,
    boxHeight,
    "Status",
    getImpactStatus(
      combinedAfter.score
    ),
    "Final assessment status",
    getStatusColor(
      combinedAfter.score
    )
  );

  doc.y =
    y +
    boxHeight +
    20;

  doc
    .roundedRect(
      PAGE.left,
      doc.y,
      CONTENT_WIDTH,
      90,
      6
    )
    .fillAndStroke(
      COLORS.purpleLight,
      COLORS.border
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.purple)
    .text(
      "Combined Impact Score Method",
      PAGE.left + 14,
      doc.y + 12
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.dark)
    .text(
      "Combined Score = (Human Survey × 60%) + (Satellite Score × 40%)",
      PAGE.left + 14,
      doc.y + 34
    );

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(
      combinedAfter.method,
      PAGE.left + 14,
      doc.y + 53
    );

  if (
    combinedAfter.score ===
    null
  ) {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.red)
      .text(
        "Assessment data is unavailable. No Critical status is assigned solely because data is missing.",
        PAGE.left + 14,
        doc.y + 70
      );
  }

  doc.y += 110;
};


// ============================================================
// COMBINED SCORE TABLE
// ============================================================

const addCombinedScoreTable = (
  doc,
  beforeSurvey,
  afterSurvey,
  beforeSatellite,
  afterSatellite
) => {
  addPageTitle(
    doc,
    "11. Combined Impact Score",
    "Human field evidence + satellite evidence"
  );

  const beforeHuman =
    getHumanSurveyScore(
      beforeSurvey
    );

  const afterHuman =
    getHumanSurveyScore(
      afterSurvey
    );

  const beforeSat =
    getSatelliteScore(
      beforeSatellite
    );

  const afterSat =
    getSatelliteScore(
      afterSatellite
    );

  const beforeCombined =
    calculateCombinedImpact(
      beforeHuman,
      beforeSat
    );

  const afterCombined =
    calculateCombinedImpact(
      afterHuman,
      afterSat
    );

  const change =
    beforeCombined.score !==
      null &&
    afterCombined.score !==
      null
      ? (
          afterCombined.score -
          beforeCombined.score
        ).toFixed(2)
      : "N/A";

  const rows = [
    [
      "Human Survey Score",
      beforeHuman !== null
        ? beforeHuman.toFixed(2)
        : "N/A",
      afterHuman !== null
        ? afterHuman.toFixed(2)
        : "N/A",
      beforeHuman !== null &&
      afterHuman !== null
        ? (
            afterHuman -
            beforeHuman
          ).toFixed(2)
        : "N/A",
      "60%",
    ],

    [
      "Satellite Score",
      beforeSat !== null
        ? beforeSat.toFixed(2)
        : "N/A",
      afterSat !== null
        ? afterSat.toFixed(2)
        : "N/A",
      beforeSat !== null &&
      afterSat !== null
        ? (
            afterSat -
            beforeSat
          ).toFixed(2)
        : "N/A",
      "40%",
    ],

    [
      "COMBINED IMPACT SCORE",
      beforeCombined.score !==
      null
        ? beforeCombined.score.toFixed(
            2
          )
        : "N/A",

      afterCombined.score !==
      null
        ? afterCombined.score.toFixed(
            2
          )
        : "N/A",

      change,
      "100%",
    ],
  ];

  const widths = [
    230,
    130,
    130,
    130,
    80,
  ];

  let y =
    doc.y;

  const headers = [
    "Component",
    "Before",
    "After",
    "Change",
    "Weight",
  ];

  let x =
    PAGE.left;

  headers.forEach(
    (
      header,
      index
    ) => {
      doc
        .rect(
          x,
          y,
          widths[index],
          28
        )
        .fillAndStroke(
          "#EDE9FE",
          COLORS.border
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.dark)
        .text(
          header,
          x + 6,
          y + 8
        );

      x +=
        widths[index];
    }
  );

  y += 28;

  rows.forEach(
    (
      row,
      rowIndex
    ) => {
      x =
        PAGE.left;

      row.forEach(
        (
          value,
          index
        ) => {
          doc
            .rect(
              x,
              y,
              widths[index],
              34
            )
            .fillAndStroke(
              rowIndex === 2
                ? COLORS.purpleLight
                : COLORS.white,
              COLORS.border
            );

          doc
            .font(
              rowIndex === 2 ||
              index === 0
                ? "Helvetica-Bold"
                : "Helvetica"
            )
            .fontSize(8)
            .fillColor(COLORS.dark)
            .text(
              safeText(value),
              x + 6,
              y + 10
            );

          x +=
            widths[index];
        }
      );

      y += 34;
    }
  );

  doc.y =
    y + 20;

  doc
    .roundedRect(
      PAGE.left,
      doc.y,
      CONTENT_WIDTH,
      85,
      6
    )
    .fillAndStroke(
      COLORS.purpleLight,
      COLORS.border
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.purple)
    .text(
      "Score Calculation",
      PAGE.left + 14,
      doc.y + 12
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.dark)
    .text(
      "Combined Impact = (Human Survey × 0.60) + (Satellite Analysis × 0.40)",
      PAGE.left + 14,
      doc.y + 34
    );

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(
      "If only one evidence source is available, that source is used at 100%. If neither source is available, the result is shown as N/A.",
      PAGE.left + 14,
      doc.y + 52,
      {
        width:
          CONTENT_WIDTH - 28,
      }
    );

  doc.y += 105;
};


// ============================================================
// RECOMMENDATIONS
// ============================================================

const generateAutomaticRecommendations = ({
  beforeSurvey,
  afterSurvey,
  beforeSatellite,
  afterSatellite,
}) => {
  const recommendations = [];

  const survey =
    normalizeSurvey(
      afterSurvey ||
        beforeSurvey
    );

  const humanScore =
    getHumanSurveyScore(
      afterSurvey
    );

  const satelliteScore =
    getSatelliteScore(
      afterSatellite
    );

  const ndviBefore =
    isNumber(
      beforeSatellite?.ndvi
    )
      ? Number(
          beforeSatellite.ndvi
        )
      : null;

  const ndviAfter =
    isNumber(
      afterSatellite?.ndvi
    )
      ? Number(
          afterSatellite.ndvi
        )
      : null;

  const ndwiBefore =
    isNumber(
      beforeSatellite?.ndwi
    )
      ? Number(
          beforeSatellite.ndwi
        )
      : null;

  const ndwiAfter =
    isNumber(
      afterSatellite?.ndwi
    )
      ? Number(
          afterSatellite.ndwi
        )
      : null;

  if (
    survey &&
    isNumber(
      survey.water
    ) &&
    Number(
      survey.water
    ) < 3
  ) {
    recommendations.push({
      title:
        "Improve Water Availability",

      severity:
        Number(
          survey.water
        ) <= 2
          ? "HIGH"
          : "MEDIUM",

      reason:
        `Human survey water score is ${Number(
          survey.water
        ).toFixed(1)}/5.`,

      action:
        "Inspect water-retention structures, improve recharge measures and monitor seasonal water availability.",
    });
  }

  if (
    survey &&
    isNumber(
      survey.retention
    ) &&
    Number(
      survey.retention
    ) < 3
  ) {
    recommendations.push({
      title:
        "Strengthen Water Retention Measures",

      severity:
        Number(
          survey.retention
        ) <= 2
          ? "HIGH"
          : "MEDIUM",

      reason:
        `Retention score is ${Number(
          survey.retention
        ).toFixed(1)}/5.`,

      action:
        "Inspect check dams, ponds, bunds and other retention structures and repair damaged or underperforming components.",
    });
  }

  if (
    survey &&
    isNumber(
      survey.vegetation
    ) &&
    Number(
      survey.vegetation
    ) < 60
  ) {
    recommendations.push({
      title:
        "Increase Vegetation Coverage",

      severity:
        Number(
          survey.vegetation
        ) < 40
          ? "HIGH"
          : "MEDIUM",

      reason:
        `Field vegetation score is ${Number(
          survey.vegetation
        ).toFixed(1)}/100.`,

      action:
        "Promote plantation, soil-moisture conservation and protection of regenerated vegetation.",
    });
  }

  if (
    survey &&
    isNumber(
      survey.structure
    ) &&
    Number(
      survey.structure
    ) < 3
  ) {
    recommendations.push({
      title:
        "Repair Watershed Structures",

      severity:
        Number(
          survey.structure
        ) <= 2
          ? "HIGH"
          : "MEDIUM",

      reason:
        `Structure condition score is ${Number(
          survey.structure
        ).toFixed(1)}/5.`,

      action:
        "Inspect physical watershed structures and prioritize repair or strengthening of damaged assets.",
    });
  }

  if (
    survey &&
    isNumber(
      survey.maintenance
    ) &&
    Number(
      survey.maintenance
    ) < 3
  ) {
    recommendations.push({
      title:
        "Improve Maintenance",

      severity:
        Number(
          survey.maintenance
        ) <= 2
          ? "HIGH"
          : "MEDIUM",

      reason:
        `Maintenance score is ${Number(
          survey.maintenance
        ).toFixed(1)}/5.`,

      action:
        "Schedule periodic inspection and maintenance of watershed assets and document activities using geo-tagged photographs.",
    });
  }

  if (
    ndviBefore !== null &&
    ndviAfter !== null
  ) {
    const change =
      ndviAfter -
      ndviBefore;

    if (
      change < -0.05
    ) {
      recommendations.push({
        title:
          "Investigate Vegetation Decline",

        severity:
          change < -0.10
            ? "HIGH"
            : "MEDIUM",

        reason:
          `Satellite NDVI decreased from ${ndviBefore.toFixed(
            4
          )} to ${ndviAfter.toFixed(
            4
          )}.`,

        action:
          "Inspect the affected watershed area for vegetation stress, land degradation, water shortage or land-use change.",
      });
    }

    if (
      change > 0.05
    ) {
      recommendations.push({
        title:
          "Continue Vegetation Protection",

        severity:
          "LOW",

        reason:
          `Satellite NDVI improved by ${change.toFixed(
            4
          )}.`,

        action:
          "Maintain current conservation measures and continue periodic satellite and field monitoring.",
      });
    }
  }

  if (
    ndwiBefore !== null &&
    ndwiAfter !== null
  ) {
    const change =
      ndwiAfter -
      ndwiBefore;

    if (
      change < -0.05
    ) {
      recommendations.push({
        title:
          "Monitor Water Stress",

        severity:
          change < -0.10
            ? "HIGH"
            : "MEDIUM",

        reason:
          `Satellite NDWI decreased by ${change.toFixed(
            4
          )}.`,

        action:
          "Inspect water availability, moisture retention and recharge structures and increase monitoring during dry periods.",
      });
    }

    if (
      change > 0.05
    ) {
      recommendations.push({
        title:
          "Continue Water Conservation",

        severity:
          "LOW",

        reason:
          `Satellite NDWI improved by ${change.toFixed(
            4
          )}.`,

        action:
          "Continue monitoring water bodies, moisture conditions and watershed retention structures.",
      });
    }
  }

  const combined =
    calculateCombinedImpact(
      humanScore,
      satelliteScore
    );

  if (
    combined.score !==
      null &&
    combined.score < 40
  ) {
    recommendations.push({
      title:
        "Priority Watershed Intervention",

      severity:
        "HIGH",

      reason:
        `Combined impact score is ${combined.score.toFixed(
          1
        )}/100.`,

      action:
        "Prepare a priority intervention plan covering water, vegetation, retention structures and maintenance, followed by a new geo-tagged assessment.",
    });
  } else if (
    combined.score !==
      null &&
    combined.score < 60
  ) {
    recommendations.push({
      title:
        "Targeted Improvement Required",

      severity:
        "MEDIUM",

      reason:
        `Combined impact score is ${combined.score.toFixed(
          1
        )}/100.`,

      action:
        "Identify weak indicators and conduct targeted improvement followed by periodic field and satellite monitoring.",
    });
  }

  if (
    combined.score !==
      null &&
    combined.score >= 80
  ) {
    recommendations.push({
      title:
        "Continue Successful Watershed Management",

      severity:
        "LOW",

      reason:
        `Combined impact score is ${combined.score.toFixed(
          1
        )}/100.`,

      action:
        "Maintain existing watershed measures and continue periodic satellite and field monitoring.",
    });
  }

  if (
    recommendations.length ===
    0
  ) {
    recommendations.push({
      title:
        "Continue Routine Monitoring",

      severity:
        "LOW",

      reason:
        combined.score === null
          ? "Insufficient assessment data is currently available for a risk-based recommendation."
          : "Available indicators do not show a major immediate issue.",

      action:
        "Continue periodic geo-tagged field surveys and satellite monitoring.",
    });
  }

  return recommendations;
};


const addRecommendations = (
  doc,
  recommendations
) => {
  addPageTitle(
    doc,
    "12. Recommendations",
    "Evidence-based recommended actions"
  );

  if (
    !Array.isArray(
      recommendations
    ) ||
    recommendations.length ===
      0
  ) {
    recommendations =
      generateAutomaticRecommendations(
        {}
      );
  }

  recommendations.forEach(
    (
      recommendation,
      index
    ) => {
      ensureSpace(
        doc,
        110
      );

      const severity =
        safeText(
          recommendation?.severity,
          "LOW"
        ).toUpperCase();

      const background =
        severity === "HIGH"
          ? COLORS.redLight
          : severity === "MEDIUM"
          ? COLORS.orangeLight
          : COLORS.greenLight;

      const accent =
        severity === "HIGH"
          ? COLORS.red
          : severity === "MEDIUM"
          ? COLORS.orange
          : COLORS.green;

      const y =
        doc.y;

      doc
        .roundedRect(
          PAGE.left,
          y,
          CONTENT_WIDTH,
          92,
          5
        )
        .fillAndStroke(
          background,
          COLORS.border
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLORS.dark)
        .text(
          `${index + 1}. ${safeText(
            recommendation?.title,
            "Recommendation"
          )}`,
          PAGE.left + 12,
          y + 10
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(accent)
        .text(
          `Severity: ${severity}`,
          PAGE.left + 12,
          y + 31
        );

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.dark)
        .text(
          `Reason: ${safeText(
            recommendation?.reason
          )}`,
          PAGE.left + 130,
          y + 31,
          {
            width:
              CONTENT_WIDTH - 145,
          }
        );

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.dark)
        .text(
          `Action: ${safeText(
            recommendation?.action
          )}`,
          PAGE.left + 12,
          y + 54,
          {
            width:
              CONTENT_WIDTH - 24,
          }
        );

      doc.y =
        y + 105;
    }
  );
};


// ============================================================
// FINAL OBSERVATION
// ============================================================

const addFinalObservation = (
  doc,
  project,
  afterSurvey,
  afterSatellite
) => {
  addPageTitle(
    doc,
    "13. Final Observation",
    "JalDrishti watershed monitoring conclusion"
  );

  const humanScore =
    getHumanSurveyScore(
      afterSurvey
    );

  const satelliteScore =
    getSatelliteScore(
      afterSatellite
    );

  const combined =
    calculateCombinedImpact(
      humanScore,
      satelliteScore
    );

  const score =
    combined.score;

  let conclusion;

  if (
    score === null
  ) {
    conclusion =
      "A final impact conclusion cannot be determined because sufficient field and satellite assessment data is not currently available.";
  } else if (
    score >= 80
  ) {
    conclusion =
      "The watershed project shows a strong overall condition based on the combined field and satellite evidence.";
  } else if (
    score >= 60
  ) {
    conclusion =
      "The watershed project shows a moderate-to-good condition. Continued monitoring is recommended.";
  } else if (
    score >= 40
  ) {
    conclusion =
      "The watershed project shows a poor-to-moderate condition. Targeted improvement and continued monitoring are recommended.";
  } else {
    conclusion =
      "The watershed project requires priority attention and targeted intervention based on the available field and satellite evidence.";
  }

  const y =
    doc.y;

  doc
    .roundedRect(
      PAGE.left,
      y,
      CONTENT_WIDTH,
      220,
      6
    )
    .fillAndStroke(
      "#F8FAFC",
      COLORS.border
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.blue)
    .text(
      "Final Combined Impact Score",
      PAGE.left + 15,
      y + 15
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(27)
    .fillColor(
      score === null
        ? COLORS.gray
        : COLORS.purple
    )
    .text(
      score !== null
        ? `${score.toFixed(1)}/100`
        : "N/A",
      PAGE.left + 15,
      y + 38
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(
      getStatusColor(
        score
      )
    )
    .text(
      `Status: ${getImpactStatus(
        score
      )}`,
      PAGE.left + 150,
      y + 51
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.dark)
    .text(
      conclusion,
      PAGE.left + 15,
      y + 85,
      {
        width:
          CONTENT_WIDTH - 30,
      }
    );

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.gray)
    .text(
      `Human Survey Contribution: ${
        humanScore !== null
          ? humanScore.toFixed(1)
          : "N/A"
      }/100 × ${
        combined.humanWeight *
        100
      }%`,
      PAGE.left + 15,
      y + 125
    );

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.gray)
    .text(
      `Satellite Contribution: ${
        satelliteScore !== null
          ? satelliteScore.toFixed(1)
          : "N/A"
      }/100 × ${
        combined.satelliteWeight *
        100
      }%`,
      PAGE.left + 15,
      y + 143
    );

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(
      "This report combines geo-tagged human survey evidence with remote-sensing indicators available in the JalDrishti system at the time of report generation.",
      PAGE.left + 15,
      y + 170,
      {
        width:
          CONTENT_WIDTH - 30,
      }
    );

  if (
    score === null
  ) {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.orange)
      .text(
        "Note: Missing data is reported as N/A and is not treated as a zero-impact condition.",
        PAGE.left + 15,
        y + 195
      );
  }
};


// ============================================================
// FOOTER
// ============================================================

const addFooterToPages = (
  doc,
  projectName
) => {
  const range =
    doc.bufferedPageRange();

  const start =
    range.start;

  const count =
    range.count;

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const pageIndex =
      start + index;

    doc.switchToPage(
      pageIndex
    );

    const footerY =
      PAGE.height -
      27;

    doc
      .save()
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.gray);

    doc
      .text(
        `JalDrishti | ${safeText(
          projectName,
          "Watershed Project"
        )}`,
        PAGE.left,
        footerY,
        {
          width: 350,
          align: "left",
        }
      );

    doc
      .text(
        `Page ${
          index + 1
        } of ${count}`,
        PAGE.width -
          PAGE.right -
          100,
        footerY,
        {
          width: 100,
          align: "right",
        }
      );

    doc.restore();
  }
};


// ============================================================
// MAIN GENERATOR
// ============================================================

const generateProjectReport =
  async ({
    project,
    beforeSurvey,
    afterSurvey,
    beforeSatellite,
    afterSatellite,
    satelliteAnalyses = [],
    recommendations = [],
    res,
  }) => {
    let doc = null;

    try {
      // --------------------------------------------------------
      // NORMALIZE ALL DATA
      // --------------------------------------------------------

      project =
        project || {};

      beforeSurvey =
        normalizeSurvey(
          beforeSurvey
        );

      afterSurvey =
        normalizeSurvey(
          afterSurvey
        );

      beforeSatellite =
        normalizeSatellite(
          beforeSatellite
        );

      afterSatellite =
        normalizeSatellite(
          afterSatellite
        );

      satelliteAnalyses =
        Array.isArray(
          satelliteAnalyses
        )
          ? satelliteAnalyses
          : [];

      // --------------------------------------------------------
      // DEBUG
      // --------------------------------------------------------

      console.log(
        "================================================"
      );

      console.log(
        "JALDRISHTI PDF DATA CHECK"
      );

      console.log(
        "Project:",
        project?.name
      );

      console.log(
        "Before Survey:",
        beforeSurvey
          ? "AVAILABLE"
          : "MISSING"
      );

      console.log(
        "After Survey:",
        afterSurvey
          ? "AVAILABLE"
          : "MISSING"
      );

      console.log(
        "Before Satellite:",
        beforeSatellite
          ? "AVAILABLE"
          : "MISSING"
      );

      console.log(
        "After Satellite:",
        afterSatellite
          ? "AVAILABLE"
          : "MISSING"
      );

      console.log(
        "Satellite History:",
        satelliteAnalyses.length
      );

      console.log(
        "Human Before Score:",
        getHumanSurveyScore(
          beforeSurvey
        )
      );

      console.log(
        "Human After Score:",
        getHumanSurveyScore(
          afterSurvey
        )
      );

      console.log(
        "Satellite Before Score:",
        getSatelliteScore(
          beforeSatellite
        )
      );

      console.log(
        "Satellite After Score:",
        getSatelliteScore(
          afterSatellite
        )
      );

      console.log(
        "================================================"
      );

      // --------------------------------------------------------
      // DOCUMENT
      // --------------------------------------------------------

      doc =
        new PDFDocument({
          size: "A4",

          layout:
            "landscape",

          margin: 42,

          bufferPages:
            true,

          info: {
            Title:
              "JalDrishti Watershed Impact Report",

            Author:
              "JalDrishti",

            Subject:
              "Watershed Impact Monitoring",

            Creator:
              "JalDrishti",
          },
        });

      // --------------------------------------------------------
      // PROJECT
      // --------------------------------------------------------

      const projectName =
        safeText(
          project?.name,
          "Watershed Project"
        );

      const projectId =
        safeText(
          project?._id,
          "N/A"
        );

      const filename =
        `JalDrishti_${projectName
          .replace(
            /[^a-z0-9]/gi,
            "_"
          )
          .replace(
            /_+/g,
            "_"
          )}_Report.pdf`;

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      if (
        !res
      ) {
        throw new Error(
          "Express response object is required"
        );
      }

      res.setHeader("Content-Type", "application/pdf");

res.setHeader(
  "Content-Disposition",
  `attachment; filename="${fileName}"`
);

res.setHeader("Cache-Control", "no-store");

doc.on("error", (err) => {
  console.error("========== PDFKIT ERROR ==========");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: "PDF generation failed",
      error: err.message,
    });
  } else if (!res.writableEnded) {
    res.end();
  }
});

doc.pipe(res);
      // ========================================================
      // COVER
      // ========================================================

      doc
        .font("Helvetica-Bold")
        .fontSize(27)
        .fillColor(COLORS.black)
        .text(
          "JALDRISHTI",
          PAGE.left,
          PAGE.top
        );

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor(COLORS.gray)
        .text(
          "Watershed Impact Monitoring & Decision Support System"
        );

      doc.moveDown(
        0.5
      );

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.gray)
        .text(
          `Generated: ${formatDateTime(
            new Date()
          )}`
        )
        .text(
          `Report ID: ${projectId}`
        )
        .text(
          `Project: ${projectName}`
        );

      doc.moveDown(
        0.8
      );

      drawDivider(
        doc
      );

      // ========================================================
      // PROJECT INFORMATION
      // ========================================================

      addProjectInformation(
        doc,
        project
      );

      // ========================================================
      // BEFORE SURVEY
      // ========================================================

      if (
        beforeSurvey
      ) {
        addLandscapePage(
          doc
        );

        addPageTitle(
          doc,
          "2. Before Field Assessment",
          "Baseline geo-tagged watershed field assessment"
        );

        addSurveyDetails(
          doc,
          beforeSurvey,
          "BEFORE SURVEY"
        );
      }

      // ========================================================
      // AFTER SURVEY
      // ========================================================

      if (
        afterSurvey
      ) {
        addLandscapePage(
          doc
        );

        addPageTitle(
          doc,
          "3. After Field Assessment",
          "Post-intervention geo-tagged watershed field assessment"
        );

        addSurveyDetails(
          doc,
          afterSurvey,
          "AFTER SURVEY"
        );
      }

      // ========================================================
      // HUMAN COMPARISON
      // ========================================================

      if (
        beforeSurvey &&
        afterSurvey
      ) {
        addLandscapePage(
          doc
        );

        addHumanComparisonTable(
          doc,
          beforeSurvey,
          afterSurvey
        );
      }

      // ========================================================
      // HUMAN PHOTOS
      // ========================================================

      if (
        beforeSurvey ||
        afterSurvey
      ) {
        await addHumanPhotoComparison(
          doc,
          beforeSurvey,
          afterSurvey
        );
      }

      // ========================================================
      // SATELLITE DETAILS
      // ========================================================

      if (
        beforeSatellite ||
        afterSatellite
      ) {
        addLandscapePage(
          doc
        );

        addPageTitle(
          doc,
          "6. Satellite Analysis",
          "Copernicus Sentinel-2 remote-sensing assessment"
        );

        if (
          beforeSatellite
        ) {
          addSatelliteDetails(
            doc,
            beforeSatellite,
            "BEFORE SATELLITE ANALYSIS"
          );
        }

        if (
          afterSatellite
        ) {
          addSatelliteDetails(
            doc,
            afterSatellite,
            "AFTER SATELLITE ANALYSIS"
          );
        }
      }

      // ========================================================
      // SATELLITE IMAGE COMPARISON
      // ========================================================

      if (
        beforeSatellite ||
        afterSatellite
      ) {
        await addSatelliteImageComparison(
          doc,
          beforeSatellite,
          afterSatellite
        );
      }

      // ========================================================
      // SATELLITE HISTORY
      // ========================================================

      if (
        satelliteAnalyses.length >
        0
      ) {
        addLandscapePage(
          doc
        );

        addSatelliteHistoryTable(
          doc,
          satelliteAnalyses
        );
      }

      // ========================================================
      // IMPACT SUMMARY
      // ========================================================

      addLandscapePage(
        doc
      );

      addImpactSummary(
        doc,
        beforeSurvey,
        afterSurvey,
        beforeSatellite,
        afterSatellite
      );

      // ========================================================
      // COMBINED SCORE
      // ========================================================

      addLandscapePage(
        doc
      );

      addCombinedScoreTable(
        doc,
        beforeSurvey,
        afterSurvey,
        beforeSatellite,
        afterSatellite
      );

      // ========================================================
      // RECOMMENDATIONS
      // ========================================================

      let finalRecommendations =
        Array.isArray(
          recommendations
        ) &&
        recommendations.length >
          0
          ? recommendations
          : generateAutomaticRecommendations(
              {
                beforeSurvey,
                afterSurvey,
                beforeSatellite,
                afterSatellite,
              }
            );

      addLandscapePage(
        doc
      );

      addRecommendations(
        doc,
        finalRecommendations
      );

      // ========================================================
      // FINAL OBSERVATION
      // ========================================================

      addLandscapePage(
        doc
      );

      addFinalObservation(
        doc,
        project,
        afterSurvey,
        afterSatellite
      );

      // ========================================================
      // FOOTER
      // ========================================================

      addFooterToPages(
        doc,
        projectName
      );

      // ========================================================
      // FINISH
      // ========================================================

      doc.end();

      console.log(
        "JALDRISHTI PDF REPORT GENERATED:"
      );

      console.log(
        "Project:",
        projectName
      );

      console.log(
        "Filename:",
        filename
      );

    } catch (error) {
      console.error(
        "================================================"
      );

      console.error(
        "JALDRISHTI PDF REPORT GENERATION ERROR"
      );

      console.error(
        error
      );

      console.error(
        "================================================"
      );

      if (
        res &&
        !res.headersSent
      ) {
        return res
          .status(500)
          .json({
            message:
              "Failed to generate project PDF report",

            error:
              error.message,
          });
      }

      if (
        res &&
        !res.writableEnded
      ) {
        try {
          res.end();
        } catch (_) {}
      }
    }
  };


// ============================================================
// EXPORT
// ============================================================

module.exports =
  generateProjectReport;