import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import api from "../services/api";


export default function AlertsScreen() {
  const [alerts, setAlerts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  const loadAlerts = async () => {
    try {
      setLoading(true);

      const response =
        await api.get("/alerts");

      setAlerts(
        response.data.alerts || []
      );
    } catch (error) {
      console.log(
        "Alerts error:",
        error.response?.data ||
          error.message
      );
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [])
  );


  const resolveAlert =
    async (id) => {
      try {
        await api.put(
          `/alerts/${id}/resolve`
        );

        Alert.alert(
          "Success",
          "Alert resolved."
        );

        loadAlerts();
      } catch (error) {
        Alert.alert(
          "Error",
          "Unable to resolve alert."
        );
      }
    };


  if (
    loading &&
    alerts.length === 0
  ) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text>
          Loading alerts...
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
          onRefresh={loadAlerts}
        />
      }
    >
      <Text style={styles.title}>
        Alerts
      </Text>

      <Text style={styles.subtitle}>
        Projects requiring attention
      </Text>


      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            ✅ No open alerts
          </Text>

          <Text>
            All monitored projects are
            currently within the configured
            alert thresholds.
          </Text>
        </View>
      ) : (
        alerts.map((alert) => (
          <View
            key={alert._id}
            style={styles.card}
          >
            <Text style={styles.severity}>
              {alert.severity ===
              "CRITICAL"
                ? "🔴"
                : alert.severity ===
                  "HIGH"
                ? "🟠"
                : "🟡"}{" "}
              {alert.severity}
            </Text>

            <Text style={styles.alertTitle}>
              {alert.title}
            </Text>

            <Text style={styles.message}>
              {alert.message}
            </Text>

            {alert.projectId && (
              <Text style={styles.project}>
                Project:{" "}
                {alert.projectId.name}
              </Text>
            )}

            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() =>
                resolveAlert(
                  alert._id
                )
              }
            >
              <Text
                style={
                  styles.resolveText
                }
              >
                ✓ Mark Resolved
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F5F7F5",
      padding: 16,
    },

    center: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    title: {
      fontSize: 28,
      fontWeight:
        "bold",
    },

    subtitle: {
      color: "#666",
      marginBottom: 18,
    },

    card: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      elevation: 3,
    },

    severity: {
      fontWeight:
        "bold",
      marginBottom: 8,
    },

    alertTitle: {
      fontSize: 18,
      fontWeight:
        "bold",
    },

    message: {
      marginTop: 8,
      color: "#555",
      lineHeight: 20,
    },

    project: {
      marginTop: 10,
      fontWeight:
        "600",
    },

    resolveButton: {
      marginTop: 14,
      padding: 12,
      borderRadius: 9,
      backgroundColor:
        "#E8F5E9",
      alignItems:
        "center",
    },

    resolveText: {
      fontWeight:
        "bold",
    },

    empty: {
      backgroundColor:
        "#FFFFFF",
      padding: 20,
      borderRadius: 14,
      elevation: 2,
    },

    emptyText: {
      fontSize: 18,
      fontWeight:
        "bold",
      marginBottom: 8,
    },
  });