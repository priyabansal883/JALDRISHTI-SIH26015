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

import { useAuth } from "../context/AuthContext";

import RoleHeader from "../components/RoleHeader";

import api from "../services/api";


export default function OfficerDashboardScreen({
  navigation,
}) {

  const { user, logout } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  const loadDashboard = async (isRefresh = false) => {

    try {

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log(
        "================================="
      );

      console.log(
        "OFFICER DASHBOARD REQUEST"
      );

      console.log(
        "USER:",
        user
      );

      const response = await api.get(
        "/projects/analytics/dashboard"
      );

      console.log(
        "DASHBOARD RESPONSE:",
        response.data
      );

      setData(response.data);

    } catch (error) {

      console.log(
        "================================="
      );

      console.log(
        "OFFICER DASHBOARD ERROR"
      );

      console.log(
        "STATUS:",
        error.response?.status
      );

      console.log(
        "DATA:",
        error.response?.data
      );

      console.log(
        "MESSAGE:",
        error.message
      );

      // Do not destroy existing dashboard data
      // if refresh/API temporarily fails.

      if (!data) {
        Alert.alert(
          "Dashboard Error",
          error.response?.data?.message ||
            error.response?.data?.error ||
            "Unable to load officer dashboard."
        );
      }

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  };


  // =========================================================
  // LOAD WHEN SCREEN OPENS
  // =========================================================

  useFocusEffect(
    useCallback(() => {

      loadDashboard(false);

    }, [])
  );


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Logout",
          style: "destructive",

          onPress: async () => {

            await logout();

          },
        },
      ]
    );
  };


  // =========================================================
  // LOADING
  // =========================================================

  if (loading && !data) {

    return (
      <View style={styles.center}>

        <ActivityIndicator
          size="large"
          color="#2E7D32"
        />

        <Text style={styles.loadingText}>
          Loading Officer Dashboard...
        </Text>

      </View>
    );
  }


  // =========================================================
  // SAFE DATA
  // =========================================================

  const summary =
    data?.summary || {};


  const priorityProjects =
    Array.isArray(data?.priorityProjects)
      ? data.priorityProjects
      : [];


  const totalProjects =
    summary.totalProjects ??
    summary.projects ??
    0;


  const averageImpact =
    summary.averageImpactScore ??
    summary.averageImpact ??
    0;


  const good =
    summary.good ??
    0;


  const moderate =
    summary.moderate ??
    0;


  const poor =
    summary.poor ??
    0;


  const critical =
    summary.critical ??
    0;


  // =========================================================
  // UI
  // =========================================================

  return (

    <ScrollView
      style={styles.container}

      contentContainerStyle={
        styles.contentContainer
      }

      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() =>
            loadDashboard(true)
          }
        />
      }
    >

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <RoleHeader
        title="Officer Dashboard"
      />


      <View style={styles.welcomeBox}>

        <Text style={styles.title}>
          JalDrishti
        </Text>

        <Text style={styles.subtitle}>
          Watershed Impact Monitoring
        </Text>

        <Text style={styles.welcomeText}>
          Welcome, {user?.name || "Officer"}
        </Text>

        <Text style={styles.roleText}>
          Officer • {user?.district || "All Districts"}
        </Text>

      </View>


      {/* ================================================= */}
      {/* SUMMARY */}
      {/* ================================================= */}

      <Text style={styles.sectionHeading}>
        Project Overview
      </Text>


      <View style={styles.grid}>

        <StatCard
          title="Projects"
          value={totalProjects}
          icon="📍"
        />

        <StatCard
          title="Avg Impact"
          value={`${Number(
            averageImpact
          ).toFixed(1)}/100`}
          icon="📊"
        />

        <StatCard
          title="Good"
          value={good}
          icon="🟢"
        />

        <StatCard
          title="Moderate"
          value={moderate}
          icon="🟡"
        />

        <StatCard
          title="Poor"
          value={poor}
          icon="🟠"
        />

        <StatCard
          title="Critical"
          value={critical}
          icon="🔴"
        />

      </View>


      {/* ================================================= */}
      {/* PRIORITY PROJECTS */}
      {/* ================================================= */}

      <View style={styles.section}>

        <Text style={styles.sectionTitle}>
          ⚠️ Priority Projects
        </Text>

        <Text style={styles.sectionDescription}>
          Projects with low impact scores
          require closer inspection.
        </Text>


        {priorityProjects.length === 0 ? (

          <View style={styles.successBox}>

            <Text style={styles.successText}>
              ✅ No high-priority projects
              detected.
            </Text>

          </View>

        ) : (

          priorityProjects.map(
            (project, index) => {

              const projectId =
                project?._id ||
                project?.id ||
                index.toString();


              const score =
                project?.impactScore ??
                project?.score ??
                0;


              return (

                <TouchableOpacity
                  key={projectId}
                  style={styles.priorityCard}

                  activeOpacity={0.8}

                  onPress={() => {

                    navigation.navigate(
                      "ProjectDetails",
                      {
                        project: project,
                      }
                    );

                  }}
                >

                  <View
                    style={styles.priorityInfo}
                  >

                    <Text
                      style={styles.projectName}
                    >
                      {project?.name ||
                        project?.projectName ||
                        "Unnamed Project"}
                    </Text>


                    <Text
                      style={styles.projectLocation}
                    >
                      📍{" "}
                      {project?.village ||
                        "Unknown Village"}
                      {project?.district
                        ? `, ${project.district}`
                        : ""}
                    </Text>


                    <Text
                      style={styles.projectType}
                    >
                      Type:{" "}
                      {project?.type ||
                        "Watershed Project"}
                    </Text>

                  </View>


                  <View
                    style={styles.scoreContainer}
                  >

                    <Text
                      style={styles.score}
                    >
                      {score}
                    </Text>

                    <Text
                      style={styles.scoreLabel}
                    >
                      Impact
                    </Text>

                    <Text
                      style={styles.statusText}
                    >
                      {project?.status ||
                        "Unknown"}
                    </Text>

                  </View>

                </TouchableOpacity>

              );

            }
          )

        )}

      </View>


      {/* ================================================= */}
      {/* QUICK ACTIONS */}
      {/* ================================================= */}

      <View style={styles.section}>

        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>


        <ActionButton
          icon="➕"
          text="Create New Project"
          onPress={() =>
            navigation.navigate(
              "CreateProject"
            )
          }
        />


        <ActionButton
          icon="📍"
          text="View All Projects"
          onPress={() =>
            navigation.navigate(
              "Projects"
            )
          }
        />


        <ActionButton
          icon="🗺️"
          text="Impact Map"
          onPress={() =>
            navigation.navigate(
              "Map"
            )
          }
        />


        <ActionButton
          icon="📊"
          text="District Analytics"
          onPress={() =>
            navigation.navigate(
              "DistrictAnalytics"
            )
          }
        />


        <ActionButton
          icon="📋"
          text="Survey History"
          onPress={() =>
            navigation.navigate(
              "SurveyHistory"
            )
          }
        />


        <ActionButton
          icon="🔔"
          text="Alerts & Follow-up"
          onPress={() =>
            navigation.navigate(
              "Alerts"
            )
          }
        />

      </View>


      {/* ================================================= */}
      {/* OFFICER INFORMATION */}
      {/* ================================================= */}

      <View style={styles.section}>

        <Text style={styles.sectionTitle}>
          Officer Information
        </Text>


        <InfoRow
          label="Name"
          value={
            user?.name || "Not available"
          }
        />


        <InfoRow
          label="Email"
          value={
            user?.email || "Not available"
          }
        />


        <InfoRow
          label="Role"
          value={
            user?.role || "Officer"
          }
        />


        <InfoRow
          label="District"
          value={
            user?.district ||
            "All Districts"
          }
        />

      </View>


      {/* ================================================= */}
      {/* PROFILE */}
      {/* ================================================= */}

      <TouchableOpacity
        style={styles.profileButton}
        onPress={() =>
          navigation.navigate(
            "Profile"
          )
        }
      >

        <Text style={styles.profileText}>
          👤 View Profile
        </Text>

      </TouchableOpacity>


      {/* ================================================= */}
      {/* LOGOUT */}
      {/* ================================================= */}

      <TouchableOpacity
        style={styles.logoutButton}
        activeOpacity={0.8}
        onPress={handleLogout}
      >

        <Text style={styles.logoutText}>
          🚪 Logout
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}


// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  title,
  value,
  icon,
}) {

  return (

    <View style={styles.statCard}>

      <Text style={styles.statIcon}>
        {icon}
      </Text>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statTitle}>
        {title}
      </Text>

    </View>
  );
}


// =========================================================
// ACTION BUTTON
// =========================================================

function ActionButton({
  icon,
  text,
  onPress,
}) {

  return (

    <TouchableOpacity
      style={styles.actionButton}
      activeOpacity={0.75}
      onPress={onPress}
    >

      <Text style={styles.actionIcon}>
        {icon}
      </Text>

      <Text style={styles.actionText}>
        {text}
      </Text>

      <Text style={styles.arrow}>
        ›
      </Text>

    </TouchableOpacity>
  );
}


// =========================================================
// INFO ROW
// =========================================================

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
        {value}
      </Text>

    </View>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7F5",
  },

  loadingText: {
    marginTop: 12,
    color: "#555",
    fontSize: 15,
  },

  welcomeBox: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 20,
    elevation: 3,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2E7D32",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 3,
  },

  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    color: "#222",
  },

  roleText: {
    color: "#666",
    marginTop: 4,
  },

  sectionHeading: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 10,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statCard: {
    width: "31%",
    minHeight: 105,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
  },

  statIcon: {
    fontSize: 22,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
    color: "#222",
  },

  statTitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
    textAlign: "center",
  },

  section: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 16,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },

  sectionDescription: {
    color: "#666",
    marginTop: 5,
    marginBottom: 12,
    lineHeight: 20,
  },

  priorityCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 13,
    marginTop: 10,
    backgroundColor: "#FAFAFA",
  },

  priorityInfo: {
    flex: 1,
    paddingRight: 8,
  },

  projectName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 5,
  },

  projectLocation: {
    color: "#555",
    marginBottom: 4,
  },

  projectType: {
    color: "#777",
    fontSize: 13,
  },

  scoreContainer: {
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  score: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#D32F2F",
  },

  scoreLabel: {
    fontSize: 11,
    color: "#777",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 3,
    color: "#D32F2F",
  },

  successBox: {
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },

  successText: {
    fontWeight: "bold",
    color: "#2E7D32",
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 11,
    marginTop: 10,
  },

  actionIcon: {
    fontSize: 20,
    width: 35,
  },

  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },

  arrow: {
    fontSize: 28,
    color: "#2E7D32",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  infoLabel: {
    color: "#777",
    fontWeight: "600",
  },

  infoValue: {
    color: "#222",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },

  profileButton: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 11,
    marginBottom: 10,
    elevation: 2,
  },

  profileText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },

  logoutButton: {
    backgroundColor: "#D32F2F",
    padding: 15,
    borderRadius: 11,
    marginBottom: 20,
    elevation: 3,
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },

});