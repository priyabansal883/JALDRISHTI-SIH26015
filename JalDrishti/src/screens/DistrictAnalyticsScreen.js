import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import api from "../services/api";

export default function DistrictAnalyticsScreen() {
  const [districts, setDistricts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const response =
        await api.get(
          "/projects/analytics/district"
        );

      setDistricts(
        response.data.districts || []
      );
    } catch (error) {
      console.log(
        "District analytics error:",
        error.response?.data ||
          error.message
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text>
          Loading district analytics...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadAnalytics}
        />
      }
    >
      <Text style={styles.title}>
        District Analytics
      </Text>

      {districts.map((district) => (
        <View
          key={district.district}
          style={styles.card}
        >
          <Text style={styles.districtName}>
            {district.district}
          </Text>

          <Text>
            Projects:{" "}
            {district.totalProjects}
          </Text>

          <Text>
            Average Impact:{" "}
            {district.averageImpactScore}/100
          </Text>

          <View style={styles.statusBox}>
            <Text>
              🟢 Good: {district.good}
            </Text>

            <Text>
              🟡 Moderate:{" "}
              {district.moderate}
            </Text>

            <Text>
              🟠 Poor: {district.poor}
            </Text>

            <Text>
              🔴 Critical:{" "}
              {district.critical}
            </Text>
          </View>

          {(district.poor > 0 ||
            district.critical > 0) && (
            <Text style={styles.warning}>
              ⚠️ Intervention required
            </Text>
          )}
        </View>
      ))}

      {districts.length === 0 && (
        <Text style={styles.empty}>
          No district data available.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F5",
    padding: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 3,
  },

  districtName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },

  statusBox: {
    marginTop: 12,
    gap: 5,
  },

  warning: {
    marginTop: 12,
    fontWeight: "bold",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
});