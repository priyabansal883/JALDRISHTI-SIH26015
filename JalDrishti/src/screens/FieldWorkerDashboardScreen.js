import React, { useCallback, useMemo, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  AppState,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import NetInfo from "@react-native-community/netinfo";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function FieldWorkerDashboardScreen({
  navigation,
}) {
  const { user, logout } = useAuth();

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [isOnline, setIsOnline] = useState(true);

  const [offlineSurveyCount, setOfflineSurveyCount] =
    useState(0);

  // =====================================================
  // FETCH MY TASKS
  // =====================================================

  const fetchTasks = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await api.get("/tasks/my-tasks");

      console.log("================================");
      console.log("MY TASKS RESPONSE");
      console.log("STATUS:", response.status);
      console.log("DATA:", response.data);
      console.log("TASKS:", response.data?.tasks);
      console.log(
        "TASK COUNT:",
        response.data?.tasks?.length
      );
      console.log("================================");

      setTasks(response.data?.tasks || []);
    } catch (error) {
      console.log("================================");
      console.log("MY TASKS ERROR");
      console.log("MESSAGE:", error.message);
      console.log("STATUS:", error.response?.status);
      console.log("DATA:", error.response?.data);
      console.log("================================");

      if (error.response?.status === 401) {
        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "OK",
              onPress: logout,
            },
          ]
        );
      } else if (!refreshing) {
        Alert.alert(
          "Error",
          error.response?.data?.message ||
            "Unable to load assigned tasks."
        );
      }

      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // CHECK NETWORK
  // =====================================================

  const checkNetwork = async () => {
    try {
      const state = await NetInfo.fetch();

      const online =
        state.isConnected === true &&
        state.isInternetReachable !== false;

      setIsOnline(online);
    } catch (error) {
      console.log(
        "Network check error:",
        error.message
      );
    }
  };

  // =====================================================
  // OFFLINE SURVEY COUNT
  // =====================================================

  const loadOfflineSurveyCount = async () => {
    try {
      /*
       * Your project already uses AsyncStorage for
       * offline surveys.
       *
       * We check the commonly used keys without
       * breaking the dashboard if one does not exist.
       */

      const possibleKeys = [
        "offlineSurveys",
        "offline_survey_queue",
        "offlineSurveyQueue",
        "pendingSurveys",
      ];

      let foundCount = 0;

      for (const key of possibleKeys) {
        const value =
          await AsyncStorage.getItem(key);

        if (value) {
          try {
            const parsed = JSON.parse(value);

            if (Array.isArray(parsed)) {
              foundCount = parsed.length;

              if (foundCount > 0) {
                break;
              }
            }
          } catch {
            // Ignore invalid storage values
          }
        }
      }

      setOfflineSurveyCount(foundCount);
    } catch (error) {
      console.log(
        "Offline survey count error:",
        error.message
      );

      setOfflineSurveyCount(0);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        if (!mounted) return;

        await checkNetwork();

        await loadOfflineSurveyCount();

        await fetchTasks(true);
      };

      load();

      return () => {
        mounted = false;
      };
    }, [])
  );

  // =====================================================
  // NETWORK LISTENER
  // =====================================================

  React.useEffect(() => {
    const unsubscribe =
      NetInfo.addEventListener((state) => {
        const online =
          state.isConnected === true &&
          state.isInternetReachable !== false;

        setIsOnline(online);
      });

    return unsubscribe;
  }, []);

  // =====================================================
  // APP STATE
  // =====================================================

  React.useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        async (nextState) => {
          if (nextState === "active") {
            await checkNetwork();
            await loadOfflineSurveyCount();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, []);

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await checkNetwork();

    await loadOfflineSurveyCount();

    await fetchTasks(false);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

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
          onPress: logout,
        },
      ]
    );
  };

  // =====================================================
  // STATUS HELPERS
  // =====================================================

  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING":
        return "Pending";

      case "ACCEPTED":
        return "Accepted";

      case "IN_PROGRESS":
        return "In Progress";

      case "COMPLETED":
        return "Completed";

      case "REJECTED":
        return "Rejected";

      case "CANCELLED":
        return "Cancelled";

      default:
        return status || "Unknown";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "#F9A825";

      case "ACCEPTED":
        return "#1565C0";

      case "IN_PROGRESS":
        return "#7B1FA2";

      case "COMPLETED":
        return "#2E7D32";

      case "REJECTED":
        return "#C62828";

      case "CANCELLED":
        return "#616161";

      default:
        return "#777777";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "#B71C1C";

      case "HIGH":
        return "#D32F2F";

      case "MEDIUM":
        return "#F57C00";

      case "LOW":
        return "#388E3C";

      default:
        return "#777777";
    }
  };

  const getPriorityBackground = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "#FEE2E2";

      case "HIGH":
        return "#FEF2F2";

      case "MEDIUM":
        return "#FFF7ED";

      case "LOW":
        return "#F0FDF4";

      default:
        return "#F8FAFC";
    }
  };

  // =====================================================
  // DATE HELPERS
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "No deadline";
    }

    try {
      return new Date(date).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "Invalid date";
    }
  };

  const isOverdue = (task) => {
    if (!task?.deadline) return false;

    if (
      task.status === "COMPLETED" ||
      task.status === "CANCELLED"
    ) {
      return false;
    }

    return (
      new Date(task.deadline).getTime() <
      Date.now()
    );
  };

  const isDueToday = (task) => {
    if (!task?.deadline) return false;

    const deadline = new Date(task.deadline);

    const today = new Date();

    return (
      deadline.getDate() === today.getDate() &&
      deadline.getMonth() === today.getMonth() &&
      deadline.getFullYear() ===
        today.getFullYear()
    );
  };

  // =====================================================
  // TASK COUNTS
  // =====================================================

  const pendingTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.status === "PENDING"
      ).length,
    [tasks]
  );

  const acceptedTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === "ACCEPTED" ||
          task.status === "IN_PROGRESS"
      ).length,
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.status === "COMPLETED"
      ).length,
    [tasks]
  );

  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) =>
        isOverdue(task)
      ).length,
    [tasks]
  );

  const todayTasks = useMemo(
    () =>
      tasks.filter((task) =>
        isDueToday(task)
      ),
    [tasks]
  );

  const priorityTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.priority === "CRITICAL" ||
          task.priority === "HIGH"
      ),
    [tasks]
  );

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === "PENDING" ||
          task.status === "ACCEPTED" ||
          task.status === "IN_PROGRESS"
      ),
    [tasks]
  );

  const completionRate =
    tasks.length > 0
      ? Math.round(
          (completedTasks / tasks.length) * 100
        )
      : 0;

  // =====================================================
  // NAVIGATION TO TASK
  // =====================================================

  const openTask = (task) => {
    navigation.navigate("TaskDetails", {
      task,
    });
  };

  // =====================================================
  // NAVIGATE TO PROJECT
  // =====================================================

  const navigateToProject = (task) => {
    const project = task?.projectId;

    const latitude =
      project?.latitude ??
      project?.lat ??
      project?.location?.coordinates?.[1];

    const longitude =
      project?.longitude ??
      project?.lon ??
      project?.lng ??
      project?.location?.coordinates?.[0];

    if (
      latitude === undefined ||
      longitude === undefined ||
      latitude === null ||
      longitude === null
    ) {
      Alert.alert(
        "Location Not Available",
        "GPS coordinates are not available for this project."
      );

      return;
    }

    const label =
      project?.name || "Watershed Project";

    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(
            label
          )}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(
            label
          )})`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Unable to Open Maps",
        "No map application could be opened."
      );
    });
  };

  // =====================================================
  // START / CONTINUE ACTION
  // =====================================================

  const handleTaskAction = (task) => {
    /*
     * We intentionally use TaskDetails here because
     * that route already exists in your current dashboard.
     *
     * Survey can then be started from TaskDetails.
     */

    navigation.navigate("TaskDetails", {
      task,
      autoStartSurvey:
        task.status === "ACCEPTED" ||
        task.status === "IN_PROGRESS",
    });
  };

  // =====================================================
  // ACTION TEXT
  // =====================================================

  const getTaskActionText = (task) => {
    if (task.status === "COMPLETED") {
      return "View Completed Task";
    }

    if (task.status === "IN_PROGRESS") {
      return "Continue Survey";
    }

    if (task.status === "ACCEPTED") {
      return "Start Survey";
    }

    if (task.status === "PENDING") {
      return "View & Accept Task";
    }

    return "View Task";
  };

  // =====================================================
  // PRIORITY TASK CARD
  // =====================================================

  const renderPriorityTask = ({
    item,
  }) => {
    const project = item.projectId;

    return (
      <TouchableOpacity
        style={[
          styles.priorityCard,
          {
            borderLeftColor:
              getPriorityColor(item.priority),
          },
        ]}
        activeOpacity={0.85}
        onPress={() => openTask(item)}
      >
        <View style={styles.priorityTop}>
          <View style={styles.priorityIconBox}>
            <Text style={styles.priorityIcon}>
              {item.priority === "CRITICAL"
                ? "🚨"
                : "⚠️"}
            </Text>
          </View>

          <View style={styles.priorityMain}>
            <Text
              style={styles.priorityProject}
              numberOfLines={1}
            >
              {project?.name ||
                "Unknown Project"}
            </Text>

            <Text
              style={styles.priorityTask}
              numberOfLines={2}
            >
              {item.title ||
                "Field Survey Task"}
            </Text>
          </View>

          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor:
                  getPriorityBackground(
                    item.priority
                  ),
              },
            ]}
          >
            <Text
              style={[
                styles.priorityBadgeText,
                {
                  color:
                    getPriorityColor(
                      item.priority
                    ),
                },
              ]}
            >
              {item.priority}
            </Text>
          </View>
        </View>

        <View style={styles.priorityBottom}>
          <Text style={styles.priorityLocation}>
            📍 {project?.village || "N/A"}
            {project?.district
              ? `, ${project.district}`
              : ""}
          </Text>

          <Text
            style={[
              styles.priorityDeadline,
              {
                color: isOverdue(item)
                  ? "#B91C1C"
                  : "#64748B",
              },
            ]}
          >
            {isOverdue(item)
              ? "⚠️ OVERDUE"
              : isDueToday(item)
              ? "📅 DUE TODAY"
              : `📅 ${formatDate(
                  item.deadline
                )}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // TODAY TASK CARD
  // =====================================================

  const renderTodayTask = ({
    item,
  }) => {
    const project = item.projectId;

    return (
      <TouchableOpacity
        style={styles.todayCard}
        activeOpacity={0.85}
        onPress={() => openTask(item)}
      >
        <View style={styles.todayHeader}>
          <View style={styles.todayIcon}>
            <Text>
              {item.surveyType === "BEFORE"
                ? "🟡"
                : item.surveyType === "AFTER"
                ? "🟢"
                : "🔵"}
            </Text>
          </View>

          <View style={styles.todayMain}>
            <Text
              style={styles.todayProject}
              numberOfLines={1}
            >
              {project?.name ||
                "Unknown Project"}
            </Text>

            <Text
              style={styles.todayTask}
              numberOfLines={1}
            >
              {item.title ||
                "Field Survey"}
            </Text>
          </View>

          <View
            style={[
              styles.miniStatus,
              {
                backgroundColor:
                  getStatusColor(
                    item.status
                  ),
              },
            ]}
          >
            <Text style={styles.miniStatusText}>
              {getStatusLabel(
                item.status
              )}
            </Text>
          </View>
        </View>

        <View style={styles.todayInfoRow}>
          <Text style={styles.todayInfo}>
            📋{" "}
            {item.surveyType ||
              "MONITORING"}
          </Text>

          <Text style={styles.todayInfo}>
            📍{" "}
            {project?.village ||
              "Location"}
          </Text>
        </View>

        <View style={styles.todayButtons}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() =>
              handleTaskAction(item)
            }
          >
            <Text
              style={styles.startButtonText}
            >
              {getTaskActionText(item)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() =>
              navigateToProject(item)
            }
          >
            <Text
              style={
                styles.navigateButtonText
              }
            >
              📍 Navigate
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // MAIN TASK CARD
  // =====================================================

  const renderTask = ({ item }) => {
    const project = item.projectId;

    return (
      <TouchableOpacity
        style={styles.taskCard}
        activeOpacity={0.8}
        onPress={() => openTask(item)}
      >
        <View style={styles.taskHeader}>
          <View
            style={styles.taskTitleContainer}
          >
            <Text
              style={styles.taskTitle}
              numberOfLines={2}
            >
              {item.title ||
                "Field Survey Task"}
            </Text>

            <Text
              style={styles.projectName}
              numberOfLines={1}
            >
              📁{" "}
              {project?.name ||
                "Project"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  getStatusColor(
                    item.status
                  ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusLabel(
                item.status
              )}
            </Text>
          </View>
        </View>

        {/* OVERDUE WARNING */}

        {isOverdue(item) && (
          <View style={styles.overdueBox}>
            <Text
              style={styles.overdueText}
            >
              ⚠️ This task is overdue
            </Text>
          </View>
        )}

        {/* LOCATION */}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            📍 Location
          </Text>

          <Text style={styles.infoValue}>
            {project?.village || "N/A"}
            {project?.district
              ? `, ${project.district}`
              : ""}
          </Text>
        </View>

        {/* SURVEY */}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            📋 Survey
          </Text>

          <Text
            style={[
              styles.infoValue,
              {
                fontWeight: "700",
                color:
                  item.surveyType ===
                  "BEFORE"
                    ? "#B45309"
                    : item.surveyType ===
                      "AFTER"
                    ? "#15803D"
                    : "#2563EB",
              },
            ]}
          >
            {item.surveyType ||
              "MONITORING"}
          </Text>
        </View>

        {/* PRIORITY */}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            ⚡ Priority
          </Text>

          <Text
            style={[
              styles.infoValue,
              {
                color:
                  getPriorityColor(
                    item.priority
                  ),
                fontWeight: "700",
              },
            ]}
          >
            {item.priority || "NORMAL"}
          </Text>
        </View>

        {/* DEADLINE */}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            📅 Deadline
          </Text>

          <Text
            style={[
              styles.infoValue,
              {
                color: isOverdue(item)
                  ? "#C62828"
                  : "#333",
                fontWeight: isOverdue(
                  item
                )
                  ? "800"
                  : "400",
              },
            ]}
          >
            {isOverdue(item)
              ? "OVERDUE"
              : formatDate(
                  item.deadline
                )}
          </Text>
        </View>

        {/* ACTIONS */}

        <View style={styles.taskActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() =>
              openTask(item)
            }
          >
            <Text
              style={
                styles.viewButtonText
              }
            >
              View Task →
            </Text>
          </TouchableOpacity>

          {item.status !==
            "COMPLETED" &&
            item.status !==
              "CANCELLED" && (
              <TouchableOpacity
                style={
                  styles.continueButton
                }
                onPress={() =>
                  handleTaskAction(
                    item
                  )
                }
              >
                <Text
                  style={
                    styles.continueButtonText
                  }
                >
                  {getTaskActionText(
                    item
                  )}
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#1565C0"
        />

        <Text
          style={styles.loadingText}
        >
          Loading your tasks...
        </Text>
      </View>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) =>
          item._id
        }
        renderItem={renderTask}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={
          <>
            {/* ==========================================
                HEADER
            ========================================== */}

            <View style={styles.header}>
              <View
                style={
                  styles.headerContent
                }
              >
                <Text style={styles.logo}>
                  🌱 JalDrishti
                </Text>

                <Text
                  style={styles.welcome}
                >
                  Welcome,{" "}
                  {user?.name ||
                    "Field Worker"}
                </Text>

                <View
                  style={styles.roleBadge}
                >
                  <Text
                    style={styles.roleText}
                  >
                    Field Worker
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={
                  styles.logoutButton
                }
                onPress={handleLogout}
              >
                <Text
                  style={styles.logoutText}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>

            {/* ==========================================
                CONNECTION STATUS
            ========================================== */}

            <View
              style={[
                styles.connectionBar,
                {
                  backgroundColor:
                    isOnline
                      ? "#ECFDF5"
                      : "#FEF2F2",
                },
              ]}
            >
              <View
                style={[
                  styles.connectionDot,
                  {
                    backgroundColor:
                      isOnline
                        ? "#16A34A"
                        : "#DC2626",
                  },
                ]}
              />

              <Text
                style={[
                  styles.connectionText,
                  {
                    color: isOnline
                      ? "#166534"
                      : "#991B1B",
                  },
                ]}
              >
                {isOnline
                  ? "Online — Data can be synced"
                  : "Offline — Working in offline mode"}
              </Text>
            </View>

            {/* ==========================================
                SUMMARY
            ========================================== */}

            <View
              style={
                styles.summaryContainer
              }
            >
              <View
                style={styles.summaryCard}
              >
                <Text
                  style={
                    styles.summaryNumber
                  }
                >
                  {pendingTasks}
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Pending
                </Text>
              </View>

              <View
                style={styles.summaryCard}
              >
                <Text
                  style={
                    styles.summaryNumber
                  }
                >
                  {acceptedTasks}
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Active
                </Text>
              </View>

              <View
                style={styles.summaryCard}
              >
                <Text
                  style={
                    styles.summaryNumber
                  }
                >
                  {completedTasks}
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Completed
                </Text>
              </View>
            </View>

            {/* ==========================================
                PERFORMANCE
            ========================================== */}

            <View
              style={
                styles.performanceCard
              }
            >
              <View
                style={
                  styles.performanceHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.performanceTitle
                    }
                  >
                    📊 My Performance
                  </Text>

                  <Text
                    style={
                      styles.performanceSubtitle
                    }
                  >
                    Your field task progress
                  </Text>
                </View>

                <Text
                  style={
                    styles.performanceRate
                  }
                >
                  {completionRate}%
                </Text>
              </View>

              <View
                style={
                  styles.progressBackground
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${completionRate}%`,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.performanceStats
                }
              >
                <Text
                  style={
                    styles.performanceStat
                  }
                >
                  📋 {tasks.length} Total
                </Text>

                <Text
                  style={
                    styles.performanceStat
                  }
                >
                  ⚠️ {overdueTasks} Overdue
                </Text>

                <Text
                  style={
                    styles.performanceStat
                  }
                >
                  📅{" "}
                  {todayTasks.length} Today
                </Text>
              </View>
            </View>

            {/* ==========================================
                OFFLINE SURVEYS
            ========================================== */}

            {offlineSurveyCount > 0 && (
              <View
                style={
                  styles.offlineSurveyCard
                }
              >
                <View
                  style={
                    styles.offlineIconBox
                  }
                >
                  <Text
                    style={
                      styles.offlineIcon
                    }
                  >
                    📶
                  </Text>
                </View>

                <View
                  style={
                    styles.offlineMain
                  }
                >
                  <Text
                    style={
                      styles.offlineTitle
                    }
                  >
                    Offline Surveys
                  </Text>

                  <Text
                    style={
                      styles.offlineText
                    }
                  >
                    {offlineSurveyCount} survey
                    {offlineSurveyCount !==
                    1
                      ? "s"
                      : ""}{" "}
                    waiting to sync
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.syncButton
                  }
                  onPress={() =>
                    Alert.alert(
                      "Offline Surveys",
                      "Open the survey history/sync screen to synchronize your pending surveys."
                    )
                  }
                >
                  <Text
                    style={
                      styles.syncButtonText
                    }
                  >
                    Sync
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ==========================================
                ATTENTION
            ========================================== */}

            {priorityTasks.length > 0 && (
              <View
                style={
                  styles.sectionContainer
                }
              >
                <View
                  style={
                    styles.sectionHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      🚨 Priority Tasks
                    </Text>

                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Tasks requiring your
                      attention
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.priorityCount
                    }
                  >
                    {priorityTasks.length}
                  </Text>
                </View>

                <FlatList
                  data={priorityTasks.slice(
                    0,
                    3
                  )}
                  keyExtractor={(item) =>
                    `priority-${item._id}`
                  }
                  renderItem={
                    renderPriorityTask
                  }
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* ==========================================
                TODAY'S TASKS
            ========================================== */}

            {todayTasks.length > 0 && (
              <View
                style={
                  styles.sectionContainer
                }
              >
                <View
                  style={
                    styles.sectionHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      📅 Today's Field Work
                    </Text>

                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Tasks due today
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.priorityCount
                    }
                  >
                    {todayTasks.length}
                  </Text>
                </View>

                <FlatList
                  data={todayTasks}
                  keyExtractor={(item) =>
                    `today-${item._id}`
                  }
                  renderItem={
                    renderTodayTask
                  }
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* ==========================================
                ALL TASKS HEADER
            ========================================== */}

            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={styles.sectionTitle}
                >
                  My Assigned Tasks
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  View and manage your
                  assigned field work
                </Text>
              </View>

              <Text
                style={styles.taskCount}
              >
                {tasks.length} tasks
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View
            style={styles.emptyContainer}
          >
            <Text
              style={styles.emptyIcon}
            >
              📋
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No Tasks Assigned
            </Text>

            <Text
              style={styles.emptyText}
            >
              Your officer has not assigned
              any field survey tasks yet.
            </Text>

            <TouchableOpacity
              style={
                styles.refreshButton
              }
              onPress={handleRefresh}
            >
              <Text
                style={
                  styles.refreshButtonText
                }
              >
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={
          tasks.length === 0
            ? styles.emptyList
            : styles.listContent
        }
      />
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  listContent: {
    paddingBottom: 40,
  },

  emptyList: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },

  loadingText: {
    marginTop: 10,
    color: "#555",
    fontSize: 14,
  },

  // =====================================================
  // HEADER
  // =====================================================

  header: {
    backgroundColor: "#1565C0",
    paddingTop: 55,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerContent: {
    flex: 1,
  },

  logo: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },

  welcome: {
    color: "#E3F2FD",
    fontSize: 15,
    marginTop: 5,
  },

  roleBadge: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },

  roleText: {
    color: "#1565C0",
    fontSize: 12,
    fontWeight: "700",
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // =====================================================
  // CONNECTION
  // =====================================================

  connectionBar: {
    marginHorizontal: 15,
    marginTop: -10,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  connectionDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },

  connectionText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // =====================================================
  // SUMMARY
  // =====================================================

  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    marginTop: 12,
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  summaryNumber: {
    fontSize: 23,
    fontWeight: "800",
    color: "#1565C0",
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },

  // =====================================================
  // PERFORMANCE
  // =====================================================

  performanceCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
  },

  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  performanceTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },

  performanceSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
  },

  performanceRate: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1565C0",
  },

  progressBackground: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 13,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#1565C0",
    borderRadius: 10,
  },

  performanceStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  performanceStat: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },

  // =====================================================
  // OFFLINE SURVEY
  // =====================================================

  offlineSurveyCard: {
    marginHorizontal: 15,
    marginTop: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  offlineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
  },

  offlineIcon: {
    fontSize: 19,
  },

  offlineMain: {
    flex: 1,
    marginLeft: 10,
  },

  offlineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9A3412",
  },

  offlineText: {
    fontSize: 10,
    color: "#C2410C",
    marginTop: 2,
  },

  syncButton: {
    backgroundColor: "#EA580C",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  syncButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  // =====================================================
  // SECTION
  // =====================================================

  sectionContainer: {
    marginTop: 20,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#718096",
    marginTop: 3,
  },

  taskCount: {
    color: "#777",
    fontSize: 13,
  },

  priorityCount: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    minWidth: 28,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
    fontWeight: "800",
    fontSize: 12,
  },

  // =====================================================
  // PRIORITY TASK
  // =====================================================

  priorityCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 13,
    padding: 13,
    borderLeftWidth: 4,
    elevation: 2,
  },

  priorityTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  priorityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  priorityIcon: {
    fontSize: 18,
  },

  priorityMain: {
    flex: 1,
    marginLeft: 9,
  },

  priorityProject: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },

  priorityTask: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  priorityBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginLeft: 7,
  },

  priorityBadgeText: {
    fontSize: 8,
    fontWeight: "900",
  },

  priorityBottom: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  priorityLocation: {
    flex: 1,
    fontSize: 9,
    color: "#64748B",
  },

  priorityDeadline: {
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 8,
  },

  // =====================================================
  // TODAY
  // =====================================================

  todayCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginBottom: 11,
    borderRadius: 14,
    padding: 13,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  todayIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  todayMain: {
    flex: 1,
    marginLeft: 9,
  },

  todayProject: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },

  todayTask: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  miniStatus: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 7,
  },

  miniStatusText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },

  todayInfoRow: {
    flexDirection: "row",
    gap: 15,
    marginTop: 10,
  },

  todayInfo: {
    fontSize: 10,
    color: "#64748B",
  },

  todayButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 11,
  },

  startButton: {
    flex: 1,
    backgroundColor: "#1565C0",
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },

  startButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  navigateButton: {
    paddingHorizontal: 12,
    backgroundColor: "#E0F2FE",
    borderRadius: 9,
    paddingVertical: 10,
    justifyContent: "center",
  },

  navigateButtonText: {
    color: "#0369A1",
    fontSize: 10,
    fontWeight: "800",
  },

  // =====================================================
  // TASK CARD
  // =====================================================

  taskCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 17,
    borderRadius: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  taskTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },

  taskTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  projectName: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  overdueBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },

  overdueText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 13,
  },

  infoLabel: {
    color: "#666",
    fontSize: 13,
  },

  infoValue: {
    color: "#333",
    fontSize: 13,
    maxWidth: "60%",
    textAlign: "right",
  },

  taskActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },

  viewButton: {
    flex: 1,
    backgroundColor: "#E3F2FD",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },

  viewButtonText: {
    color: "#1565C0",
    fontSize: 12,
    fontWeight: "700",
  },

  continueButton: {
    flex: 1,
    backgroundColor: "#1565C0",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },

  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // =====================================================
  // EMPTY
  // =====================================================

  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 70,
    paddingBottom: 80,
  },

  emptyIcon: {
    fontSize: 50,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
    marginTop: 15,
  },

  emptyText: {
    color: "#777",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },

  refreshButton: {
    backgroundColor: "#1565C0",
    paddingHorizontal: 25,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 20,
  },

  refreshButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});