export const getNDVIStatus = (
  ndvi
) => {
  if (
    ndvi === null ||
    ndvi === undefined
  ) {
    return {
      label: "No Data",
      color: "#777777",
    };
  }

  if (ndvi < 0) {
    return {
      label: "Water / Non-Vegetated",
      color: "#1976D2",
    };
  }

  if (ndvi < 0.2) {
    return {
      label: "Very Low Vegetation",
      color: "#D32F2F",
    };
  }

  if (ndvi < 0.4) {
    return {
      label: "Low Vegetation",
      color: "#F57C00",
    };
  }

  if (ndvi < 0.6) {
    return {
      label: "Moderate Vegetation",
      color: "#FBC02D",
    };
  }

  return {
    label: "Dense Vegetation",
    color: "#388E3C",
  };
};