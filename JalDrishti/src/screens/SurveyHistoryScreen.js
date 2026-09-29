import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import api from "../services/api";

export default function SurveyHistoryScreen() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadSurveys();
    }, [])
  );

  const loadSurveys = async () => {
    try {
      setError("");

      const response = await api.get("/surveys");

      setSurveys(response.data.surveys || []);
    } catch (err) {
      console.log("Survey history error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load survey history."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSurveys();
  };

  const getScoreStatus = (score) => {
    if (score >= 75) {
      return {
        label: "Good",
        style: styles.good,
      };
    }

    if (score >= 50) {
      return {
        label: "Moderate",
        style: styles.moderate,
      };
    }

    if (score >= 25) {
      return {
        label: "Poor",
        style: styles.poor,
      };
    }

    return {
      label: "Critical",
      style: styles.critical,
    };
  };

  const formatDate = (date) => {
    if (!date) return "Unknown date";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading survey history...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      <Text style={styles.title}>
        Survey History
      </Text>

      <Text style={styles.subtitle}>
        Field surveys submitted by monitoring teams
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      {!error && surveys.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            No Surveys Yet
          </Text>

          <Text style={styles.emptyText}>
            Completed field surveys will appear here.
          </Text>
        </View>
      ) : null}

      {surveys.map((survey) => {
        const scoreStatus = getScoreStatus(
          survey.impactScore
        );

        return (
          <View
            key={survey._id}
            style={styles.card}
          >
            {/* HEADER */}

            <View style={styles.headerRow}>
              <View style={styles.projectContainer}>
                <Text style={styles.projectName}>
                  {survey.projectId?.name ||
                    "Unknown Project"}
                </Text>

                <Text style={styles.projectLocation}>
                  {survey.projectId?.village ||
                    "Unknown Village"}
                  {survey.projectId?.district
                    ? `, ${survey.projectId.district}`
                    : ""}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  scoreStatus.style,
                ]}
              >
                <Text style={styles.statusText}>
                  {scoreStatus.label}
                </Text>
              </View>
            </View>

            {/* SURVEY TYPE */}

            <View style={styles.typeRow}>
              <Text style={styles.typeLabel}>
                Survey Type
              </Text>

              <Text style={styles.typeValue}>
                {survey.surveyType}
              </Text>
            </View>

            {/* SCORE */}

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>
                Impact Score
              </Text>

              <Text style={styles.score}>
                {survey.impactScore}/100
              </Text>
            </View>

            {/* INDICATORS */}

            <View style={styles.indicators}>
              <Indicator
                label="Water"
                value={`${survey.water}/5`}
              />

              <Indicator
                label="Retention"
                value={`${survey.retention}/5`}
              />

              <Indicator
                label="Vegetation"
                value={`${survey.vegetation}%`}
              />

              <Indicator
                label="Structure"
                value={`${survey.structure}/5`}
              />

              <Indicator
                label="Maintenance"
                value={`${survey.maintenance}/5`}
              />
            </View>

            {/* GPS */}

            <View style={styles.gpsBox}>
              <Text style={styles.gpsTitle}>
                📍 GPS Location
              </Text>

              <Text style={styles.gpsText}>
                {survey.latitude?.toFixed(6)},{" "}
                {survey.longitude?.toFixed(6)}
              </Text>

              {survey.gpsAccuracy != null ? (
                <Text style={styles.accuracyText}>
                  Accuracy:{" "}
                  {Math.round(survey.gpsAccuracy)} m
                </Text>
              ) : null}
            </View>

            {/* NOTES */}

            {survey.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>
                  Notes
                </Text>

                <Text style={styles.notesText}>
                  {survey.notes}
                </Text>
              </View>
            ) : null}

            {/* PHOTO COUNT */}

            {survey.photos?.length > 0 ? (
              <Text style={styles.photoText}>
                📷 {survey.photos.length} photo
                {survey.photos.length > 1 ? "s" : ""}
                {" • "}
                {survey.photos[0].type}
              </Text>
            ) : null}

            {/* DATE */}

            <Text style={styles.date}>
              Survey Date:{" "}
              {formatDate(survey.createdAt)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}


/* INDICATOR */

function Indicator({ label, value }) {
  return (
    <View style={styles.indicator}>
      <Text style={styles.indicatorLabel}>
        {label}
      </Text>

      <Text style={styles.indicatorValue}>
        {value}
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#6B7280",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 5,
    marginBottom: 20,
    color: "#6B7280",
    fontSize: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  projectContainer: {
    flex: 1,
    paddingRight: 10,
  },

  projectName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  projectLocation: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    backgroundColor: "#FED7AA",
  },

  critical: {
    backgroundColor: "#FEE2E2",
  },

  typeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  typeLabel: {
    color: "#6B7280",
  },

  typeValue: {
    fontWeight: "700",
    color: "#374151",
  },

  scoreContainer: {
    alignItems: "center",
    paddingVertical: 15,
  },

  scoreLabel: {
    color: "#6B7280",
    fontSize: 13,
  },

  score: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 3,
  },

  indicators: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  indicator: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },

  indicatorLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  indicatorValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  gpsBox: {
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
  },

  gpsTitle: {
    fontWeight: "700",
    color: "#1E40AF",
  },

  gpsText: {
    marginTop: 5,
    color: "#374151",
  },

  accuracyText: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },

  notesBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
  },

  notesTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },

  notesText: {
    color: "#4B5563",
    lineHeight: 20,
  },

  photoText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  date: {
    marginTop: 12,
    fontSize: 12,
    color: "#9CA3AF",
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },

  errorText: {
    color: "#B91C1C",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 8,
    color: "#6B7280",
    textAlign: "center",
  },
});