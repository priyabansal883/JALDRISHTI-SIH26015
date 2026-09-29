import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  syncOfflineSurveys,
} from "../services/syncService";

import {
  getOfflineSurveyCount,
} from "../services/offlineStorage";
import api from "../services/api";
import RoleHeader from "../components/RoleHeader";
import { useAuth } from "../context/AuthContext";

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
 useEffect(() => {
    if (
      user?.role === "officer" ||
      user?.role === "admin"
    ) {
      navigation.replace("OfficerDashboard");
    }
  }, [user, navigation]);

 
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalSurveys: 0,
    averageImpact: 0,
    attentionProjects: 0,
  });

  const [assignedProjects, setAssignedProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const loadOfflineCount = async () => {
  try {
    const count = await getOfflineSurveyCount();
    setOfflineCount(count);
  } catch (error) {
    console.log(
      "Offline count error:",
      error.message
    );
  }
};
const handleSync = async () => {
  try {
    setLoading(true);

    const result = await syncOfflineSurveys();

    await loadOfflineCount();

    Alert.alert(
      "Sync Result",
      result?.message ||
        "Offline surveys synced successfully."
    );
  } catch (error) {
    console.log("Sync error:", error);

    Alert.alert(
      "Sync Error",
      "Unable to sync surveys."
    );
  } finally {
    setLoading(false);
  }
};
  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [projectsResponse, surveysResponse] =
        await Promise.all([
          api.get("/projects"),
          api.get("/surveys"),
        ]);

      const projects =
        projectsResponse.data.projects || [];

      const surveys =
        surveysResponse.data.surveys || [];

      const scores = projects
        .map((project) =>
          Number(project.impactScore || 0)
        )
        .filter((score) => score > 0);

      const averageImpact =
        scores.length > 0
          ? Math.round(
              scores.reduce(
                (sum, score) => sum + score,
                0
              ) / scores.length
            )
          : 0;

      const attentionProjects = projects.filter(
        (project) =>
          project.status === "Poor" ||
          project.status === "Critical"
      ).length;

      setStats({
        totalProjects: projects.length,
        totalSurveys: surveys.length,
        averageImpact,
        attentionProjects,
      });

      // Field worker gets only assigned projects
      if (user?.role === "field_worker") {
        const assignedResponse =
          await api.get("/projects/assigned/me");

        setAssignedProjects(
          assignedResponse.data.projects || []
        );
      } else {
        setAssignedProjects(projects.slice(0, 5));
      }
    } catch (error) {
      console.log(
        "Dashboard error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      loadOfflineCount();
    }, [user])
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case "Good":
        return styles.good;

      case "Moderate":
        return styles.moderate;

      case "Poor":
        return styles.poor;

      case "Critical":
        return styles.critical;

      default:
        return styles.moderate;
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
        <RoleHeader title="JalDrishti" />
      {/* Header */}

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>
            🌱 JalDrishti
          </Text>

          <Text style={styles.welcome}>
            Welcome, {user?.name || "Field Worker"}
          </Text>

          <Text style={styles.role}>
            {user?.role === "field_worker"
              ? "Field Worker"
              : user?.role === "officer"
              ? "Watershed Officer"
              : "System Administrator"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
{offlineCount > 0 && (
  <View style={styles.offlineCard}>
    <Text style={styles.offlineTitle}>
      📡 Offline Surveys
    </Text>

    <Text style={styles.offlineText}>
      {offlineCount} survey
      {offlineCount > 1
        ? "s"
        : ""}{" "}
      waiting to sync
    </Text>
  </View>
)}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator
            size="large"
            color="#2E7D32"
          />

          <Text style={styles.loadingText}>
            Loading dashboard...
          </Text>
        </View>
      ) : (
        <>
          {/* Statistics */}

          <Text style={styles.sectionTitle}>
            Monitoring Overview
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.card}>
              <Text style={styles.cardIcon}>
                🌊
              </Text>

              <Text style={styles.cardNumber}>
                {stats.totalProjects}
              </Text>

              <Text style={styles.cardTitle}>
                {user?.role === "field_worker"
                  ? "My Projects"
                  : "Total Projects"}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardIcon}>
                📋
              </Text>

              <Text style={styles.cardNumber}>
                {stats.totalSurveys}
              </Text>

              <Text style={styles.cardTitle}>
                Surveys
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardIcon}>
                📈
              </Text>

              <Text style={styles.cardNumber}>
                {stats.averageImpact}
              </Text>

              <Text style={styles.cardTitle}>
                Avg Impact
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardIcon}>
                🚨
              </Text>

              <Text style={styles.cardNumber}>
                {stats.attentionProjects}
              </Text>

              <Text style={styles.cardTitle}>
                Need Attention
              </Text>
            </View>
          </View>
<TouchableOpacity
  style={styles.syncButton}
  onPress={handleSync}
  disabled={loading}
>
  <Text style={styles.syncButtonText}>
    🔄 Sync Offline Surveys
  </Text>
</TouchableOpacity>

{/* Assigned Projects */}
          {/* Assigned Projects */}

          {user?.role === "field_worker" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  My Assigned Projects
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Projects")
                  }
                >
                  <Text style={styles.viewAll}>
                    View All
                  </Text>
                </TouchableOpacity>
              </View>

              {assignedProjects.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>
                    📭
                  </Text>

                  <Text style={styles.emptyTitle}>
                    No Projects Assigned
                  </Text>

                  <Text style={styles.emptyText}>
                    Your officer has not assigned
                    any watershed projects yet.
                  </Text>
                </View>
              ) : (
                assignedProjects
                  .slice(0, 5)
                  .map((project) => (
                    <TouchableOpacity
                      key={project._id}
                      style={styles.projectCard}
                      onPress={() =>
                        navigation.navigate(
                          "ProjectDetails",
                          { project }
                        )
                      }
                    >
                      <View style={styles.projectTop}>
                        <Text
                          style={styles.projectName}
                          numberOfLines={1}
                        >
                          {project.name}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            getStatusStyle(
                              project.status
                            ),
                          ]}
                        >
                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {project.status ||
                              "Moderate"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={styles.projectLocation}
                      >
                        📍 {project.village},{" "}
                        {project.district}
                      </Text>

                      <Text style={styles.projectType}>
                        🌊 {project.type}
                      </Text>

                      <View
                        style={styles.projectBottom}
                      >
                        <Text
                          style={styles.impactText}
                        >
                          Impact Score:{" "}
                          {project.impactScore || 0}
                          /100
                        </Text>

                        <Text
                          style={styles.openText}
                        >
                          Open →
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
              )}
            </>
          )}

          {/* Quick Actions */}

          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>

          {(user?.role === "officer" ||
            user?.role === "admin") && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate(
                  "CreateProject"
                )
              }
            >
              <Text style={styles.actionIcon}>
                ➕
              </Text>

              <View>
                <Text style={styles.actionTitle}>
                  Create Project
                </Text>

                <Text
                  style={styles.actionSubtitle}
                >
                  Register a new watershed project
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("Projects")
            }
          >
            <Text style={styles.actionIcon}>
              🌊
            </Text>

            <View>
              <Text style={styles.actionTitle}>
                View Projects
              </Text>

              <Text style={styles.actionSubtitle}>
                Monitor watershed projects
              </Text>
            </View>
          </TouchableOpacity>
<TouchableOpacity
  style={styles.actionButton}
  onPress={() =>
    navigation.navigate("Analytics")
  }
>
  <Text style={styles.actionButtonText}>
    📊 Analytics
  </Text>
</TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("Map")
            }
          >
            <Text style={styles.actionIcon}>
              🗺️
            </Text>

            <View>
              <Text style={styles.actionTitle}>
                Project Map
              </Text>

              <Text style={styles.actionSubtitle}>
                View projects using GPS
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate(
                "SurveyHistory"
              )
            }
          >
            <Text style={styles.actionIcon}>
              📊
            </Text>

            <View>
              <Text style={styles.actionTitle}>
                Survey History
              </Text>

              <Text style={styles.actionSubtitle}>
                View previous field surveys
              </Text>
            </View>
          </TouchableOpacity>
<TouchableOpacity
  onPress={() =>
    navigation.navigate(
      "DistrictAnalytics"
    )
  }
>
  <Text>
    🗺️ District Analytics
  </Text>
</TouchableOpacity>
          {/* Information */}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              🌱 JalDrishti Monitoring
            </Text>

            <Text style={styles.infoText}>
              Capture geo-tagged evidence, monitor
              watershed conditions and measure the
              impact of implemented projects.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9F5",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25,
  },

  appName: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#1B5E20",
  },

  welcome: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
  },

  role: {
    color: "#777",
    marginTop: 3,
    textTransform: "capitalize",
  },

  logoutButton: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },

  logoutText: {
    color: "#C62828",
    fontWeight: "bold",
  },
offlineCard: {
  marginHorizontal: 15,
  marginBottom: 10,
  padding: 15,
  borderRadius: 12,
  backgroundColor: "#FFF7ED",
  borderWidth: 1,
  borderColor: "#FDBA74",
},

offlineTitle: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#9A3412",
},

offlineText: {
  marginTop: 5,
  color: "#7C2D12",
},
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 14,
    marginTop: 5,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  viewAll: {
    color: "#2E7D32",
    fontWeight: "bold",
    marginBottom: 14,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 17,
    marginBottom: 14,
    elevation: 3,
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },

  cardIcon: {
    fontSize: 27,
  },

  cardNumber: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#2E7D32",
    marginTop: 7,
  },

  cardTitle: {
    color: "#666",
    marginTop: 4,
    fontSize: 13,
  },

  projectCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },

  projectTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  projectName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginRight: 10,
  },

  projectLocation: {
    color: "#666",
    marginTop: 8,
  },

  projectType: {
    color: "#777",
    marginTop: 5,
  },
syncButton: {
  marginHorizontal: 15,
  marginBottom: 10,
  padding: 14,
  borderRadius: 10,
  backgroundColor: "#166534",
  alignItems: "center",
},

syncButtonText: {
  color: "#fff",
  fontWeight: "bold",
},
  projectBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  impactText: {
    color: "#2E7D32",
    fontWeight: "600",
  },

  openText: {
    color: "#1565C0",
    fontWeight: "bold",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 15,
  },

  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  good: {
    backgroundColor: "#2E7D32",
  },

  moderate: {
    backgroundColor: "#F9A825",
  },

  poor: {
    backgroundColor: "#EF6C00",
  },

  critical: {
    backgroundColor: "#C62828",
  },

  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 25,
    alignItems: "center",
    marginBottom: 22,
  },

  emptyIcon: {
    fontSize: 35,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 8,
    color: "#333",
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 5,
    lineHeight: 20,
  },

  actionButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 17,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  actionIcon: {
    fontSize: 30,
    marginRight: 15,
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
  },

  actionSubtitle: {
    color: "#777",
    marginTop: 4,
  },

  infoBox: {
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 18,
    marginTop: 10,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1B5E20",
    marginBottom: 8,
  },

  infoText: {
    color: "#555",
    lineHeight: 21,
  },

  loader: {
    alignItems: "center",
    marginTop: 80,
  },

  loadingText: {
    marginTop: 10,
    color: "#666",
  },
});