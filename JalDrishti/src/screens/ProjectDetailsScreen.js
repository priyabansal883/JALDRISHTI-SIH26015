import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  documentDirectory,
  EncodingType,
  writeAsStringAsync,
} from "../services/fileSystem";
import * as Sharing from "expo-sharing";
export default function ProjectDetailsScreen({
  route,
  navigation,
}) {
  const { project } = route.params;
  const { user } = useAuth();

  const [surveys, setSurveys] = useState([]);
  const [satelliteHistory, setSatelliteHistory] = useState([]);
  const [impactComparison, setImpactComparison] = useState(null);
const [reportLoading, setReportLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
  ====================================================
  LOAD ALL PROJECT DATA
  ====================================================
  */
const latestSatelliteEntries = React.useMemo(() => {
  if (!satelliteHistory.length) return [];

  const sorted = [...satelliteHistory].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const latestBefore = sorted.find(
    (item) => item.analysisType === "BEFORE"
  );

  const latestAfter = sorted.find(
    (item) => item.analysisType === "AFTER"
  );

  const latestMonitoring = sorted.filter(
    (item) => item.analysisType === "MONITORING"
  );

  return [latestBefore, latestAfter, ...latestMonitoring].filter(Boolean);
}, [satelliteHistory]);
  useEffect(() => {
    loadProjectData();
  }, []);

  const loadProjectData = async () => {
    await Promise.all([
      loadSurveys(),
      loadSatelliteHistory(),
    ]);
  };

  /*
  ====================================================
  LOAD SATELLITE HISTORY
  ====================================================
  */

  const loadSatelliteHistory = async () => {
    try {
      const response = await api.get(
        `/satellite/project/${project._id}/history`
      );

      setSatelliteHistory(
        response.data?.analyses || []
      );
    } catch (error) {
      console.log(
        "Satellite history error:",
        error.response?.data || error.message
      );

      setSatelliteHistory([]);
    }
  };

  /*
  ====================================================
  LOAD SURVEYS + IMPACT ANALYTICS
  ====================================================
  */

  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError("");

      // Load surveys
      const response = await api.get(
        `/surveys/project/${project._id}`
      );

      setSurveys(
        response.data?.surveys || []
      );

      // Load impact comparison analytics
      const comparisonResponse =
        await api.get(
          `/surveys/analytics/project/${project._id}`
        );

      setImpactComparison(
        comparisonResponse.data
      );
    } catch (err) {
      console.log(
        "Project details error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Unable to load survey data."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  ====================================================
  LATEST SURVEY
  ====================================================
  */

  const latestSurvey = surveys[0];

  /*
  ====================================================
  CURRENT IMPACT SCORE
  ====================================================
  */

  const score =
    latestSurvey?.impactScore ??
    project.impactScore ??
    0;

  /*
  ====================================================
  STATUS
  ====================================================
  */

  const getStatus = (value) => {
    if (value >= 75) return "Good";
    if (value >= 50) return "Moderate";
    if (value >= 25) return "Poor";

    return "Critical";
  };

  const status = getStatus(score);

  const getStatusStyle = () => {
    if (score >= 75) return styles.good;
    if (score >= 50) return styles.moderate;
    if (score >= 25) return styles.poor;

    return styles.critical;
  };

  /*
  ====================================================
  GENERATE REPORT
  ====================================================
  */


const generateReport = async () => {
  try {
    setReportLoading(true);

    console.log("=================================");
    console.log("GENERATING PDF REPORT");
    console.log("=================================");

    const response = await api.get(
      `/projects/${project._id}/report`,
      {
        responseType: "arraybuffer",
      }
    );

    const base64 = arrayBufferToBase64(
      response.data
    );

    const safeName = project.name.replace(
      /[^a-z0-9]/gi,
      "_"
    );

    const fileName =
      `JalDrishti_${safeName}_Report.pdf`;

    const fileUri =
      documentDirectory + fileName;

    await writeAsStringAsync(
      fileUri,
      base64,
      {
        encoding: EncodingType.Base64,
      }
    );

    console.log(
      "PDF saved at:",
      fileUri
    );

    const isAvailable =
      await Sharing.isAvailableAsync();

    if (isAvailable) {
      await Sharing.shareAsync(
        fileUri,
        {
          mimeType: "application/pdf",
          dialogTitle:
            "Watershed Impact Report",
          UTI: "com.adobe.pdf",
        }
      );
    } else {
      Alert.alert(
        "Report Generated",
        `Report saved at:\n${fileUri}`
      );
    }

  } catch (error) {
    console.log(
      "Report generation error:",
      error.response?.data ||
        error.message
    );

    Alert.alert(
      "Report Error",
      "Unable to generate the report. Please try again."
    );
  } finally {
    setReportLoading(false);
  }
};
// Helper: convert arraybuffer to base64
const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return global.btoa(binary);
};
  /*
  ====================================================
  OPEN SATELLITE COMPARISON
  ====================================================
  */

  const openSatelliteComparison = () => {
    if (
      project.latitude === undefined ||
      project.longitude === undefined
    ) {
      Alert.alert(
        "Location Missing",
        "This project does not have valid latitude and longitude coordinates."
      );

      return;
    }

    navigation.navigate(
      "Comparison",
      {
        project,
      }
    );
  };

  /*
  ====================================================
  OPEN FIELD SURVEY COMPARISON
  ====================================================
  */

  const openFieldComparison = () => {
    navigation.navigate(
      "Comparison",
      {
        project,
      }
    );
  };

  /*
  ====================================================
  RENDER
  ====================================================
  */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >

      {/* ==================================================
          PROJECT HEADER
      ================================================== */}

      <View style={styles.header}>
        <Text style={styles.title}>
          {project.name}
        </Text>

        <View
          style={[
            styles.statusBadge,
            getStatusStyle(),
          ]}
        >
          <Text style={styles.statusText}>
            {status}
          </Text>
        </View>
      </View>

      <Text style={styles.location}>
        📍 {project.village},{" "}
        {project.district},{" "}
        {project.state}
      </Text>

      {/* ==================================================
          PROJECT INFORMATION
      ================================================== */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Project Information
        </Text>

        <InfoRow
          label="Project Type"
          value={project.type}
        />

        <InfoRow
          label="Latitude"
          value={
            project.latitude !== undefined
              ? Number(project.latitude).toFixed(6)
              : "Not available"
          }
        />

        <InfoRow
          label="Longitude"
          value={
            project.longitude !== undefined
              ? Number(project.longitude).toFixed(6)
              : "Not available"
          }
        />

        <InfoRow
          label="Surveys"
          value={`${surveys.length}`}
        />

        <InfoRow
          label="Implementation"
          value={
            project.implementationDate
              ? new Date(
                  project.implementationDate
                ).toLocaleDateString("en-IN")
              : "Not available"
          }
        />
      </View>

      {/* ==================================================
          SATELLITE HISTORY
      ================================================== */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          🛰️ Satellite NDVI History
        </Text>

      {latestSatelliteEntries.length === 0 ? (
  <View style={styles.emptySatellite}>
    <Text style={styles.emptySatelliteText}>
      No saved satellite analysis available.
    </Text>

    <Text style={styles.smallText}>
      Use Satellite Comparison to fetch
      live Sentinel-2 data.
    </Text>
  </View>
) : (
  latestSatelliteEntries.map((item) => (
    <View
      key={item._id}
      style={styles.historyCard}
    >
      <View style={styles.historyHeader}>
        <Text style={styles.historyType}>
          {item.analysisType}
        </Text>

        <Text style={styles.historySource}>
          {item.source ||
            "Copernicus Sentinel-2"}
        </Text>
      </View>

      <Text style={styles.historyNDVI}>
        NDVI:{" "}
        {typeof item.ndvi === "number"
          ? item.ndvi.toFixed(3)
          : item.ndvi}
      </Text>

      <Text style={styles.historyClassification}>
        🌿{" "}
        {item.ndviClassification ||
          "Classification unavailable"}
      </Text>

      {item.satelliteDate && (
        <Text style={styles.historyDate}>
          📅{" "}
          {new Date(
            item.satelliteDate
          ).toLocaleDateString("en-IN")}
        </Text>
      )}
    </View>
  ))
)}
      </View>

      {/* ==================================================
          LATEST EVIDENCE
      ================================================== */}

      {latestSurvey?.photos?.length > 0 && (
        <View style={styles.evidenceCard}>
          <Text style={styles.sectionTitle}>
            📸 Latest Evidence
          </Text>

          {latestSurvey.photos.map(
            (photo, index) => (
              <View
                key={`${photo.url}-${index}`}
                style={styles.photoContainer}
              >
                <Image
                  source={{
                    uri: photo.url,
                  }}
                  style={styles.evidenceImage}
                />

                <View style={styles.photoInfo}>
                  <Text style={styles.photoType}>
                    {photo.type ||
                      "MONITORING"}
                  </Text>

                  {photo.latitude != null &&
                    photo.longitude != null && (
                      <Text
                        style={styles.photoMeta}
                      >
                        📍{" "}
                        {Number(
                          photo.latitude
                        ).toFixed(5)}
                        ,{" "}
                        {Number(
                          photo.longitude
                        ).toFixed(5)}
                      </Text>
                    )}

                  {photo.accuracy !== null &&
                    photo.accuracy !== undefined && (
                      <Text
                        style={styles.photoMeta}
                      >
                        GPS Accuracy:{" "}
                        {Math.round(
                          photo.accuracy
                        )}
                        m
                      </Text>
                    )}

                  {photo.timestamp && (
                    <Text
                      style={styles.photoMeta}
                    >
                      🕒{" "}
                      {new Date(
                        photo.timestamp
                      ).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            )
          )}
        </View>
      )}

      {/* ==================================================
          IMPACT SCORE BREAKDOWN
      ================================================== */}

      {latestSurvey && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Impact Score Breakdown
          </Text>

          <Text style={styles.breakdownText}>
            💧 Water:{" "}
            {latestSurvey.water}/5
          </Text>

          <Text style={styles.breakdownText}>
            🌱 Field Vegetation:{" "}
            {latestSurvey.vegetation}/100
          </Text>

          {latestSurvey.satelliteNDVI !==
            null &&
            latestSurvey.satelliteNDVI !==
              undefined && (
              <>
                <Text
                  style={styles.breakdownText}
                >
                  🛰️ Satellite NDVI:{" "}
                  {latestSurvey.satelliteNDVI}
                </Text>

                <Text
                  style={styles.breakdownText}
                >
                  🌿 Satellite Classification:{" "}
                  {
                    latestSurvey.satelliteNDVIClassification
                  }
                </Text>
              </>
            )}

          <Text style={styles.breakdownText}>
            🌱 Combined Vegetation:{" "}
            {latestSurvey.combinedVegetationScore ??
              latestSurvey.vegetation}
            /100
          </Text>

          <Text style={styles.breakdownText}>
            🏗️ Structure:{" "}
            {latestSurvey.structure}/5
          </Text>

          <Text style={styles.breakdownText}>
            🌊 Retention:{" "}
            {latestSurvey.retention}/5
          </Text>

          <Text style={styles.breakdownText}>
            🔧 Maintenance:{" "}
            {latestSurvey.maintenance}/5
          </Text>

          <Text style={styles.scoreText}>
            Impact Score:{" "}
            {latestSurvey.impactScore}/100
          </Text>
        </View>
      )}

      {/* ==================================================
          CURRENT IMPACT SCORE
      ================================================== */}

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>
          Current Impact Score
        </Text>

        <Text style={styles.score}>
          {score}
        </Text>

        <Text style={styles.outOf}>
          / 100
        </Text>

        <Text style={styles.scoreDescription}>
          Based on water, vegetation,
          structure, retention and
          maintenance indicators.
        </Text>
      </View>

      {/* ==================================================
          PROJECT IMPROVEMENT
      ================================================== */}

      {impactComparison?.available && (
        <View style={styles.evidenceCard}>
          <Text style={styles.sectionTitle}>
            📈 Project Improvement
          </Text>

          <Text
            style={styles.performanceText}
          >
            {impactComparison.performance}
          </Text>

          <View
            style={styles.comparisonRow}
          >
            <Text>
              Impact Score
            </Text>

            <Text
              style={styles.changePositive}
            >
              {
                impactComparison
                  .comparison
                  .impactScore
                  .before
              }
              {" → "}
              {
                impactComparison
                  .comparison
                  .impactScore
                  .after
              }
              {"  "}
              {impactComparison
                .comparison
                .impactScore
                .change > 0
                ? "+"
                : ""}
              {
                impactComparison
                  .comparison
                  .impactScore
                  .change
              }
            </Text>
          </View>

          <View
            style={styles.comparisonRow}
          >
            <Text>Water</Text>

            <Text>
              {
                impactComparison
                  .comparison
                  .water
                  .before
              }
              {" → "}
              {
                impactComparison
                  .comparison
                  .water
                  .after
              }
            </Text>
          </View>

          <View
            style={styles.comparisonRow}
          >
            <Text>Retention</Text>

            <Text>
              {
                impactComparison
                  .comparison
                  .retention
                  .before
              }
              {" → "}
              {
                impactComparison
                  .comparison
                  .retention
                  .after
              }
            </Text>
          </View>

          <View
            style={styles.comparisonRow}
          >
            <Text>Vegetation</Text>

            <Text>
              {
                impactComparison
                  .comparison
                  .vegetation
                  .before
              }
              {"% → "}
              {
                impactComparison
                  .comparison
                  .vegetation
                  .after
              }
              {"%"}
            </Text>
          </View>

          <View
            style={styles.comparisonRow}
          >
            <Text>Structure</Text>

            <Text>
              {
                impactComparison
                  .comparison
                  .structure
                  .before
              }
              {" → "}
              {
                impactComparison
                  .comparison
                  .structure
                  .after
              }
            </Text>
          </View>
        </View>
      )}

      {/* ==================================================
          LATEST SURVEY
      ================================================== */}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="small"
          />

          <Text
            style={styles.loadingText}
          >
            Loading latest survey...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>
        </View>
      ) : latestSurvey ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Latest Survey
          </Text>

          <View style={styles.surveyType}>
            <Text
              style={styles.surveyTypeLabel}
            >
              Survey Type
            </Text>

            <Text
              style={styles.surveyTypeValue}
            >
              {latestSurvey.surveyType}
            </Text>
          </View>

          <Indicator
            title="Water Availability"
            value={`${latestSurvey.water}/5`}
          />

          <Indicator
            title="Water Retention"
            value={`${latestSurvey.retention}/5`}
          />

          <Indicator
            title="Vegetation Coverage"
            value={`${latestSurvey.vegetation}%`}
          />

          <Indicator
            title="Structure Condition"
            value={`${latestSurvey.structure}/5`}
          />

          <Indicator
            title="Maintenance"
            value={`${latestSurvey.maintenance}/5`}
          />

          <View style={styles.gpsBox}>
            <Text style={styles.gpsTitle}>
              📍 Survey Location
            </Text>

            <Text style={styles.gpsText}>
              {latestSurvey.latitude?.toFixed(
                6
              )}
              ,{" "}
              {latestSurvey.longitude?.toFixed(
                6
              )}
            </Text>

            {latestSurvey.gpsAccuracy !=
              null && (
              <Text style={styles.accuracy}>
                GPS Accuracy:{" "}
                {Math.round(
                  latestSurvey.gpsAccuracy
                )}{" "}
                m
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            No Survey Data
          </Text>

          <Text style={styles.emptyText}>
            Start a field survey to measure
            the project's current impact.
          </Text>
        </View>
      )}

      {/* ==================================================
          DESCRIPTION
      ================================================== */}

      {project.description ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Description
          </Text>

          <Text style={styles.description}>
            {project.description}
          </Text>
        </View>
      ) : null}

      {/* ==================================================
          SATELLITE COMPARISON BUTTON
      ================================================== */}

      <TouchableOpacity
        style={styles.satelliteButton}
        onPress={
          openSatelliteComparison
        }
      >
        <Text style={styles.buttonText}>
          🛰️ Satellite Comparison
        </Text>

        <Text style={styles.buttonSubText}>
          Compare Sentinel-2 Before & After
        </Text>
      </TouchableOpacity>

      {/* ==================================================
          FIELD BEFORE / AFTER COMPARISON
      ================================================== */}

      <TouchableOpacity
        style={styles.compareButton}
        onPress={
          openFieldComparison
        }
      >
        <Text style={styles.buttonText}>
          📊 Compare Field Surveys
        </Text>
      </TouchableOpacity>

      {/* ==================================================
          REPORT
      ================================================== */}

     <TouchableOpacity
  style={styles.reportButton}
  onPress={generateReport}
  disabled={reportLoading}
>
  {reportLoading ? (
    <ActivityIndicator color="#FFFFFF" />
  ) : (
    <Text style={styles.reportButtonText}>
      📄 Generate Impact Report
    </Text>
  )}
</TouchableOpacity>

      {/* ==================================================
          ASSIGN FIELD WORKER
      ================================================== */}

      {(user?.role === "officer" ||
        user?.role === "admin") && (
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() =>
            navigation.navigate(
              "AssignProject",
              {
                project,
              }
            )
          }
        >
          <Text style={styles.assignText}>
            👷 Assign Field Worker
          </Text>
        </TouchableOpacity>
      )}

      {/* ==================================================
          START SURVEY
      ================================================== */}

      <TouchableOpacity
        style={styles.surveyButton}
        onPress={() =>
          navigation.navigate(
            "Survey",
            {
              project,
            }
          )
        }
      >
        <Text style={styles.buttonText}>
          📍 Start Field Survey
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/*
====================================================
INFO ROW
====================================================
*/

function InfoRow({
  label,
  value,
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value || "Not available"}
      </Text>
    </View>
  );
}

/*
====================================================
INDICATOR
====================================================
*/

function Indicator({
  title,
  value,
}) {
  return (
    <View style={styles.indicator}>
      <Text
        style={styles.indicatorTitle}
      >
        {title}
      </Text>

      <Text
        style={styles.indicatorValue}
      >
        {value}
      </Text>
    </View>
  );
}

/*
====================================================
STYLES
====================================================
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  title: {
    flex: 1,
    fontSize: 25,
    fontWeight: "700",
    color: "#111827",
    paddingRight: 10,
  },

  location: {
    marginTop: 7,
    marginBottom: 18,
    color: "#6B7280",
    fontSize: 14,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  good: {
    backgroundColor: "#DCFCE7",
  },

  moderate: {
    backgroundColor: "#FEF3C7",
  },

  poor: {
    backgroundColor: "#FFEDD5",
  },

  critical: {
    backgroundColor: "#FEE2E2",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 17,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  infoLabel: {
    color: "#6B7280",
    fontSize: 14,
  },

  infoValue: {
    maxWidth: "55%",
    textAlign: "right",
    fontWeight: "600",
    color: "#374151",
  },

  /* SATELLITE HISTORY */

  emptySatellite: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 10,
  },

  emptySatelliteText: {
    color: "#4B5563",
    fontWeight: "600",
  },

  smallText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 5,
  },

  historyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },

  historyType: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },

  historySource: {
    fontSize: 10,
    color: "#6B7280",
  },

  historyNDVI: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  historyClassification: {
    marginTop: 5,
    color: "#374151",
  },

  historyDate: {
    marginTop: 5,
    fontSize: 12,
    color: "#6B7280",
  },

  /* EVIDENCE */

  evidenceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 16,
    elevation: 2,
  },

  photoContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },

  evidenceImage: {
    width: "100%",
    height: 220,
  },

  photoInfo: {
    padding: 12,
  },

  photoType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B5E20",
    marginBottom: 6,
  },

  photoMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },

  /* IMPACT */

  breakdownText: {
    marginBottom: 8,
    color: "#374151",
  },

  scoreText: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },

  scoreLabel: {
    color: "#6B7280",
    fontSize: 14,
  },

  score: {
    fontSize: 50,
    fontWeight: "800",
    marginTop: 5,
    color: "#111827",
  },

  outOf: {
    color: "#6B7280",
    marginTop: -8,
  },

  scoreDescription: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 10,
    lineHeight: 19,
  },

  /* PERFORMANCE */

  performanceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 12,
  },

  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  changePositive: {
    color: "#15803D",
    fontWeight: "bold",
  },

  /* SURVEY */

  loadingBox: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 16,
  },

  loadingText: {
    marginTop: 8,
    color: "#6B7280",
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    padding: 15,
    borderRadius: 12,
    marginBottom: 16,
  },

  errorText: {
    color: "#B91C1C",
  },

  surveyType: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  surveyTypeLabel: {
    color: "#6B7280",
  },

  surveyTypeValue: {
    fontWeight: "700",
  },

  indicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  indicatorTitle: {
    color: "#4B5563",
  },

  indicatorValue: {
    fontWeight: "700",
    color: "#111827",
  },

  gpsBox: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },

  gpsTitle: {
    fontWeight: "700",
    color: "#1E40AF",
  },

  gpsText: {
    marginTop: 5,
    color: "#374151",
  },

  accuracy: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 20,
  },

  description: {
    color: "#4B5563",
    lineHeight: 21,
  },

  /* BUTTONS */

  satelliteButton: {
    backgroundColor: "#166534",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  compareButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  buttonSubText: {
    color: "#DCFCE7",
    fontSize: 12,
    marginTop: 4,
  },

  reportButton: {
    backgroundColor: "#1565C0",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
  },

  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  assignButton: {
    backgroundColor: "#1565C0",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  assignText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  surveyButton: {
    backgroundColor: "#7C3AED",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
});