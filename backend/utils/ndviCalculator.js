// ======================================================
// NDVI CALCULATOR
// ======================================================

const calculateNDVI = (nir, red) => {
  if (
    nir === null ||
    nir === undefined ||
    red === null ||
    red === undefined
  ) {
    return null;
  }

  const nirValue = Number(nir);
  const redValue = Number(red);

  if (
    !Number.isFinite(nirValue) ||
    !Number.isFinite(redValue)
  ) {
    return null;
  }

  const denominator =
    nirValue + redValue;

  if (denominator === 0) {
    return null;
  }

  const ndvi =
    (nirValue - redValue) /
    denominator;

  return Number(
    Math.max(-1, Math.min(1, ndvi)).toFixed(4)
  );
};


// ======================================================
// NDVI CLASSIFICATION
// ======================================================

const classifyNDVI = (ndvi) => {
  if (
    ndvi === null ||
    ndvi === undefined ||
    !Number.isFinite(Number(ndvi))
  ) {
    return "Unavailable";
  }

  const value = Number(ndvi);

  if (value < 0) {
    return "Water / Non-Vegetated";
  }

  if (value < 0.2) {
    return "Very Low Vegetation";
  }

  if (value < 0.4) {
    return "Low Vegetation";
  }

  if (value < 0.6) {
    return "Moderate Vegetation";
  }

  if (value < 0.8) {
    return "High Vegetation";
  }

  return "Very High Vegetation";
};


// ======================================================
// NDVI → 0-100 SCORE
// ======================================================

const ndviToScore = (ndvi) => {
  if (
    ndvi === null ||
    ndvi === undefined ||
    !Number.isFinite(Number(ndvi))
  ) {
    return null;
  }

  const value = Number(ndvi);

  const normalized =
    ((value + 1) / 2) * 100;

  return Number(
    Math.max(
      0,
      Math.min(100, normalized)
    ).toFixed(1)
  );
};


// ======================================================
// NDVI CHANGE
// ======================================================

const calculateNDVIChange = (
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

  return Number(
    (
      Number(after) -
      Number(before)
    ).toFixed(4)
  );
};


// ======================================================
// NDVI PERCENTAGE CHANGE
// ======================================================

const calculateNDVIPercentageChange = (
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

  const beforeValue =
    Number(before);

  const afterValue =
    Number(after);

  if (beforeValue === 0) {
    return afterValue > 0
      ? 100
      : 0;
  }

  return Number(
    (
      ((afterValue - beforeValue) /
        Math.abs(beforeValue)) *
      100
    ).toFixed(1)
  );
};


// ======================================================
// NDVI IMPROVEMENT STATUS
// ======================================================

const getNDVIStatus = (
  before,
  after
) => {
  if (
    before === null ||
    before === undefined ||
    after === null ||
    after === undefined
  ) {
    return "Insufficient Data";
  }

  const change =
    Number(after) -
    Number(before);

  if (change >= 0.15) {
    return "Strong Improvement";
  }

  if (change >= 0.05) {
    return "Improvement";
  }

  if (change > -0.05) {
    return "Stable";
  }

  if (change > -0.15) {
    return "Decline";
  }

  return "Significant Decline";
};


module.exports = {
  calculateNDVI,
  classifyNDVI,
  ndviToScore,
  calculateNDVIChange,
  calculateNDVIPercentageChange,
  getNDVIStatus,
};