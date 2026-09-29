export const getImpactColor = (score) => {
  if (
    score === null ||
    score === undefined
  ) {
    return "#777777";
  }

  if (score >= 75) {
    return "#2E7D32";
  }

  if (score >= 50) {
    return "#F9A825";
  }

  if (score >= 25) {
    return "#EF6C00";
  }

  return "#C62828";
};


export const getImpactLabel = (score) => {
  if (
    score === null ||
    score === undefined
  ) {
    return "No Data";
  }

  if (score >= 75) {
    return "Good";
  }

  if (score >= 50) {
    return "Moderate";
  }

  if (score >= 25) {
    return "Poor";
  }

  return "Critical";
};