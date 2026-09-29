import api from "./api";

export const saveSatelliteAnalysis = async ({
  projectId,
  ndvi,
  classification,
  analysisType,
}) => {
  try {
    const response = await api.post(
      "/satellite/analysis",
      {
        projectId,
        ndvi,
        ndviClassification: classification,
        analysisType: analysisType || "MONITORING",
        satelliteDate: new Date().toISOString(),
        source: "Copernicus Sentinel-2 L2A",
      }
    );

    console.log("Satellite analysis saved");

    return response.data.analysis;
  } catch (error) {
    console.log(
      "Save satellite analysis error:",
      error.response?.data || error.message
    );

    throw error;
  }
};