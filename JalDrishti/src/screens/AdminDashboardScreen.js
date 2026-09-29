import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboardScreen({
  navigation,
}) {
  const { user, logout } = useAuth();

  // ============================================================
  // STATE
  // ============================================================

  const [summary, setSummary] = useState(null);

  const [
    attentionProjects,
    setAttentionProjects,
  ] = useState([]);

  const [districts, setDistricts] =
    useState([]);

  const [surveyStats, setSurveyStats] =
    useState(null);

  const [tasks, setTasks] =
    useState([]);

  const [taskStats, setTaskStats] =
    useState(null);

  const [
    workerPerformance,
    setWorkerPerformance,
  ] = useState([]);

  const [
    projectActivity,
    setProjectActivity,
  ] = useState([]);

  const [
    officerPerformance,
    setOfficerPerformance,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  const loadDashboard = async () => {
    try {
      console.log(
        "================================="
      );

      console.log(
        "ADMIN DASHBOARD LOADING..."
      );

      console.log(
        "================================="
      );

      const [
        dashboardRes,
        districtRes,
        surveyRes,
        taskRes,
        taskSummaryRes,
        projectsRes,
      ] = await Promise.all([
        // ------------------------------------------------------
        // DASHBOARD SUMMARY
        // ------------------------------------------------------

        api.get(
          "/projects/analytics/dashboard"
        ),

        // ------------------------------------------------------
        // DISTRICT ANALYTICS
        // ------------------------------------------------------

        api.get(
          "/projects/analytics/district"
        ),

        // ------------------------------------------------------
        // SURVEY ANALYTICS
        // ------------------------------------------------------

        api.get(
          "/surveys/analytics/summary"
        ),

        // ------------------------------------------------------
        // ALL ADMIN TASKS
        // ------------------------------------------------------

        api.get(
          "/tasks/admin/all"
        ),

        // ------------------------------------------------------
        // TASK SUMMARY
        // ------------------------------------------------------

        api.get(
          "/tasks/admin/summary"
        ),

        // ------------------------------------------------------
        // ALL PROJECTS
        //
        // This is important because sometimes dashboard
        // API returns priorityCount but doesn't return
        // attentionProjects.
        // ------------------------------------------------------

        api.get("/projects"),
      ]);

      // ========================================================
      // DEBUG DASHBOARD RESPONSE
      // ========================================================

      console.log(
        "ADMIN DASHBOARD RESPONSE:",
        dashboardRes.data
      );

      console.log(
        "PROJECTS RESPONSE:",
        projectsRes.data
      );

      // ========================================================
      // PROJECT SUMMARY
      // ========================================================

      const dashboardData =
        dashboardRes.data || {};

      const dashboardSummary =
        dashboardData.summary || null;

      setSummary(
        dashboardSummary
      );

      // ========================================================
      // GET ALL PROJECTS
      // ========================================================

      const allProjects =
        projectsRes.data?.projects ||
        projectsRes.data?.data ||
        (
          Array.isArray(
            projectsRes.data
          )
            ? projectsRes.data
            : []
        );

      console.log(
        "TOTAL PROJECTS RECEIVED:",
        allProjects.length
      );

      // ========================================================
      // ATTENTION PROJECTS
      // ========================================================

      const backendAttentionProjects =
        dashboardData.attentionProjects;

      let finalAttentionProjects = [];

      // --------------------------------------------------------
      // CASE 1:
      // Backend already sends attentionProjects
      // --------------------------------------------------------

      if (
        Array.isArray(
          backendAttentionProjects
        ) &&
        backendAttentionProjects.length > 0
      ) {
        finalAttentionProjects =
          backendAttentionProjects;
      }

      // --------------------------------------------------------
      // CASE 2:
      // Backend doesn't send them.
      //
      // Calculate from projects.
      // --------------------------------------------------------

      else {
        finalAttentionProjects =
          allProjects.filter(
            (project) => {
              const score = Number(
                project.impactScore ??
                project.latestImpactScore ??
                project.latestSurvey
                  ?.impactScore ??
                project.score
              );

              const status =
                String(
                  project.status ||
                  project.impactStatus ||
                  project.latestSurvey
                    ?.status ||
                  ""
                ).toUpperCase();

              const needsAttention =
                (
                  !Number.isNaN(score) &&
                  score < 50
                ) ||
                status === "POOR" ||
                status === "CRITICAL";

              return needsAttention;
            }
          );
      }

      // ========================================================
      // REMOVE DUPLICATES
      // ========================================================

      const uniqueAttentionProjects =
        finalAttentionProjects.filter(
          (
            project,
            index,
            array
          ) => {
            const id =
              project._id ||
              project.id;

            if (!id) {
              return true;
            }

            return (
              index ===
              array.findIndex(
                (item) =>
                  (
                    item._id ||
                    item.id
                  ) === id
              )
            );
          }
        );

      console.log(
        "ATTENTION PROJECTS:",
        uniqueAttentionProjects
      );

      setAttentionProjects(
        uniqueAttentionProjects
      );

      // ========================================================
      // DISTRICTS
      // ========================================================

      setDistricts(
        districtRes.data?.districts ||
          []
      );

      // ========================================================
      // SURVEY STATS
      // ========================================================

      setSurveyStats(
        surveyRes.data || null
      );

      // ========================================================
      // TASKS
      // ========================================================

      setTasks(
        taskRes.data?.tasks || []
      );

      // ========================================================
      // TASK STATS
      // ========================================================

      setTaskStats(
        taskRes.data?.stats || null
      );

      // ========================================================
      // WORKER PERFORMANCE
      // ========================================================

      setWorkerPerformance(
        taskSummaryRes.data
          ?.workerPerformance || []
      );

      // ========================================================
      // PROJECT ACTIVITY
      // ========================================================

      setProjectActivity(
        taskSummaryRes.data
          ?.projectActivity || []
      );

      // ========================================================
      // OFFICER PERFORMANCE
      // ========================================================

      setOfficerPerformance(
        taskSummaryRes.data
          ?.officerPerformance || []
      );

      console.log(
        "ADMIN DASHBOARD LOADED SUCCESSFULLY"
      );

    } catch (error) {
      console.log(
        "================================="
      );

      console.log(
        "ADMIN DASHBOARD LOAD ERROR"
      );

      console.log(
        error.response?.data ||
          error.message
      );

      console.log(
        "================================="
      );

      Alert.alert(
        "Error",
        "Unable to load admin dashboard data."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================================
  // FOCUS
  // ============================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // ============================================================
  // LOGOUT
  // ============================================================

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

  // ============================================================
  // TASK STATUS COLOR
  // ============================================================

  const getTaskStatusColor = (
    status
  ) => {
    switch (status) {
      case "COMPLETED":
        return "#16A34A";

      case "IN_PROGRESS":
        return "#2563EB";

      case "ACCEPTED":
        return "#0891B2";

      case "PENDING":
        return "#D97706";

      case "REJECTED":
        return "#DC2626";

      case "CANCELLED":
        return "#6B7280";

      default:
        return "#64748B";
    }
  };

  // ============================================================
  // PRIORITY COLOR
  // ============================================================

  const getPriorityColor = (
    priority
  ) => {
    switch (priority) {
      case "CRITICAL":
        return "#DC2626";

      case "HIGH":
        return "#EA580C";

      case "MEDIUM":
        return "#D97706";

      case "LOW":
        return "#16A34A";

      default:
        return "#64748B";
    }
  };

  // ============================================================
  // DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) {
      return "No deadline";
    }

    try {
      return new Date(
        date
      ).toLocaleDateString(
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

  // ============================================================
  // GET PROJECT SCORE
  // ============================================================

  const getProjectScore = (
    project
  ) => {
    const score = Number(
      project?.impactScore ??
      project?.latestImpactScore ??
      project?.latestSurvey
        ?.impactScore ??
      project?.score
    );

    if (Number.isNaN(score)) {
      return null;
    }

    return score;
  };

  // ============================================================
  // GET PROJECT STATUS
  // ============================================================

  const getProjectStatus = (
    project,
    score
  ) => {
    const existingStatus =
      String(
        project?.impactStatus ||
        project?.status ||
        project?.latestSurvey
          ?.status ||
        ""
      ).toUpperCase();

    if (
      existingStatus === "CRITICAL"
    ) {
      return "CRITICAL";
    }

    if (
      existingStatus === "POOR"
    ) {
      return "POOR";
    }

    if (
      existingStatus === "MODERATE"
    ) {
      return "MODERATE";
    }

    if (
      existingStatus === "GOOD"
    ) {
      return "GOOD";
    }

    if (
      score !== null &&
      score < 30
    ) {
      return "CRITICAL";
    }

    if (
      score !== null &&
      score < 50
    ) {
      return "POOR";
    }

    if (
      score !== null &&
      score < 70
    ) {
      return "MODERATE";
    }

    if (
      score !== null
    ) {
      return "GOOD";
    }

    return "ATTENTION";
  };

  // ============================================================
  // ATTENTION STATUS COLOR
  // ============================================================

  const getAttentionColors = (
    status
  ) => {
    switch (status) {
      case "CRITICAL":
        return {
          background: "#FEE2E2",
          border: "#FCA5A5",
          text: "#991B1B",
        };

      case "POOR":
        return {
          background: "#FFEDD5",
          border: "#FDBA74",
          text: "#C2410C",
        };

      default:
        return {
          background: "#FEF3C7",
          border: "#FCD34D",
          text: "#92400E",
        };
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#4A148C"
        />

        <Text style={styles.loadingText}>
          Loading admin dashboard...
        </Text>
      </View>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
      showsVerticalScrollIndicator={
        false
      }
    >

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <View style={styles.header}>

        <View
          style={styles.headerTop}
        >

          <View
            style={{
              flex: 1,
            }}
          >

            <Text
              style={
                styles.headerTitle
              }
            >
              🛡️ Admin Control Center
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Welcome,{" "}
              {user?.name || "Admin"}
            </Text>

          </View>

          <TouchableOpacity
            style={
              styles.logoutButton
            }
            onPress={handleLogout}
          >

            <Text
              style={
                styles.logoutText
              }
            >
              Logout
            </Text>

          </TouchableOpacity>

        </View>

        <View
          style={styles.headerInfo}
        >

          <Text
            style={
              styles.headerInfoTitle
            }
          >
            Watershed Monitoring
            Administration
          </Text>

          <Text
            style={
              styles.headerInfoText
            }
          >
            Monitor watershed projects,
            field workers, tasks, surveys
            and impact performance.
          </Text>

        </View>

      </View>

      {/* ================================================== */}
      {/* PROJECT OVERVIEW */}
      {/* ================================================== */}

      <Text
        style={styles.sectionTitle}
      >
        Project Overview
      </Text>

      <View
        style={styles.summaryGrid}
      >

        <SummaryCard
          icon="📁"
          title="Projects"
          value={
            summary?.totalProjects ||
            0
          }
        />

        <SummaryCard
          icon="🎯"
          title="Avg Impact"
          value={
            summary
              ?.averageImpactScore ||
            0
          }
          suffix="/100"
        />

        <SummaryCard
          icon="📋"
          title="Surveys"
          value={
            surveyStats
              ?.totalSurveys || 0
          }
        />

        <SummaryCard
          icon="🚨"
          title="Attention"
          value={
            attentionProjects.length ||
            summary?.priorityCount ||
            0
          }
        />

      </View>

      {/* ================================================== */}
      {/* TASK MONITORING */}
      {/* ================================================== */}

      <View
        style={
          styles.sectionHeaderRow
        }
      >

        <View>

          <Text
            style={
              styles.sectionTitleNoMargin
            }
          >
            Field Task Monitoring
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            See who is performing which
            task
          </Text>

        </View>

        <TouchableOpacity
          style={
            styles.viewAllButton
          }
          onPress={() =>
            navigation.navigate(
              "AdminTasks"
            )
          }
        >

          <Text
            style={
              styles.viewAllText
            }
          >
            View All
          </Text>

        </TouchableOpacity>

      </View>

      <View
        style={styles.taskSummaryGrid}
      >

        <TaskSummaryCard
          title="Total"
          value={
            taskStats?.total || 0
          }
          icon="📋"
        />

        <TaskSummaryCard
          title="Pending"
          value={
            taskStats?.pending || 0
          }
          icon="⏳"
        />

        <TaskSummaryCard
          title="In Progress"
          value={
            taskStats
              ?.inProgress || 0
          }
          icon="🔵"
        />

        <TaskSummaryCard
          title="Completed"
          value={
            taskStats
              ?.completed || 0
          }
          icon="✅"
        />

        <TaskSummaryCard
          title="Overdue"
          value={
            taskStats?.overdue || 0
          }
          icon="⚠️"
        />

        <TaskSummaryCard
          title="Surveys"
          value={
            taskStats
              ?.surveySubmitted || 0
          }
          icon="📍"
        />

      </View>

      {/* ================================================== */}
      {/* WHO IS PERFORMING WHICH TASK */}
      {/* ================================================== */}

      <View style={styles.card}>

        <Text
          style={styles.cardTitle}
        >
          👷 Who Is Performing Which Task?
        </Text>

        <Text
          style={styles.cardDescription}
        >
          Live assignment monitoring:
          project → worker → task → survey
        </Text>

        {tasks.length === 0 ? (

          <View
            style={styles.emptyBox}
          >

            <Text
              style={styles.emptyIcon}
            >
              📋
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No field tasks yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              Assigned tasks will appear
              here.
            </Text>

          </View>

        ) : (

          tasks
            .slice(0, 10)
            .map((task) => (

              <TouchableOpacity
                key={task._id}
                style={
                  styles.monitorTask
                }
                onPress={() =>
                  navigation.navigate(
                    "AdminTaskDetails",
                    { task }
                  )
                }
              >

                {/* TASK HEADER */}

                <View
                  style={
                    styles.monitorHeader
                  }
                >

                  <View
                    style={{
                      flex: 1,
                    }}
                  >

                    <Text
                      style={
                        styles.monitorProject
                      }
                      numberOfLines={1}
                    >
                      📁{" "}
                      {task.projectId
                        ?.name ||
                        "Unknown Project"}
                    </Text>

                    <Text
                      style={
                        styles.monitorLocation
                      }
                    >
                      {task.projectId
                        ?.village ||
                        ""}
                      {task.projectId
                        ?.district
                        ? `, ${task.projectId.district}`
                        : ""}
                    </Text>

                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getTaskStatusColor(
                            task.status
                          ),
                      },
                    ]}
                  >

                    <Text
                      style={
                        styles.statusText
                      }
                    >
                      {task.status}
                    </Text>

                  </View>

                </View>

                {/* TASK */}

                <View
                  style={
                    styles.monitorTaskBox
                  }
                >

                  <Text
                    style={
                      styles.monitorTaskLabel
                    }
                  >
                    TASK
                  </Text>

                  <Text
                    style={
                      styles.monitorTaskTitle
                    }
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>

                  <View
                    style={
                      styles.taskMetaRow
                    }
                  >

                    <Text
                      style={
                        styles.taskMeta
                      }
                    >
                      📋{" "}
                      {task.surveyType ||
                        "MONITORING"}
                    </Text>

                    <Text
                      style={[
                        styles.taskMeta,
                        {
                          color:
                            getPriorityColor(
                              task.priority
                            ),
                        },
                      ]}
                    >
                      ●{" "}
                      {task.priority}
                    </Text>

                  </View>

                </View>

                {/* WORKER */}

                <View
                  style={
                    styles.performerBox
                  }
                >

                  <View
                    style={
                      styles.performerAvatar
                    }
                  >

                    <Text
                      style={
                        styles.performerAvatarText
                      }
                    >
                      {(
                        task.assignedTo
                          ?.name ||
                        "W"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Text>

                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >

                    <Text
                      style={
                        styles.performerLabel
                      }
                    >
                      PERFORMING
                    </Text>

                    <Text
                      style={
                        styles.performerName
                      }
                    >
                      {task.assignedTo
                        ?.name ||
                        "Not assigned"}
                    </Text>

                    <Text
                      style={
                        styles.performerEmail
                      }
                      numberOfLines={1}
                    >
                      {task.assignedTo
                        ?.email ||
                        ""}
                    </Text>

                  </View>

                </View>

                {/* ASSIGNED BY */}

                <View
                  style={
                    styles.assignmentFooter
                  }
                >

                  <View>

                    <Text
                      style={
                        styles.smallLabel
                      }
                    >
                      ASSIGNED BY
                    </Text>

                    <Text
                      style={
                        styles.smallValue
                      }
                    >
                      {task.assignedBy
                        ?.name ||
                        "Unknown"}
                    </Text>

                  </View>

                  <View>

                    <Text
                      style={
                        styles.smallLabel
                      }
                    >
                      DEADLINE
                    </Text>

                    <Text
                      style={
                        styles.smallValue
                      }
                    >
                      {formatDate(
                        task.deadline
                      )}
                    </Text>

                  </View>

                  <View>

                    <Text
                      style={
                        styles.smallLabel
                      }
                    >
                      SURVEY
                    </Text>

                    <Text
                      style={[
                        styles.smallValue,
                        {
                          color:
                            task.surveyId
                              ? "#16A34A"
                              : "#D97706",
                        },
                      ]}
                    >
                      {task.surveyId
                        ? "Submitted"
                        : "Pending"}
                    </Text>

                  </View>

                </View>

              </TouchableOpacity>

            ))

        )}

      </View>

      {/* ================================================== */}
      {/* WORKER PERFORMANCE */}
      {/* ================================================== */}

      <View style={styles.card}>

        <Text
          style={styles.cardTitle}
        >
          👷 Field Worker Performance
        </Text>

        {workerPerformance.length ===
        0 ? (

          <View
            style={styles.emptyBox}
          >

            <Text
              style={styles.emptyText}
            >
              No worker performance
              data available.
            </Text>

          </View>

        ) : (

          workerPerformance
            .slice(0, 10)
            .map((worker) => (

              <View
                key={
                  worker.worker?._id
                }
                style={
                  styles.workerPerformance
                }
              >

                <View
                  style={
                    styles.workerAvatar
                  }
                >

                  <Text
                    style={
                      styles.workerAvatarText
                    }
                  >
                    {(
                      worker.worker
                        ?.name ||
                      "W"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>

                </View>

                <View
                  style={
                    styles.workerMain
                  }
                >

                  <Text
                    style={
                      styles.workerName
                    }
                    numberOfLines={1}
                  >
                    {worker.worker
                      ?.name ||
                      "Unknown Worker"}
                  </Text>

                  <Text
                    style={
                      styles.workerDistrict
                    }
                  >
                    {worker.worker
                      ?.district ||
                      "District not assigned"}
                  </Text>

                  <View
                    style={
                      styles.workerStats
                    }
                  >

                    <Text
                      style={
                        styles.workerStat
                      }
                    >
                      {worker.totalTasks}{" "}
                      tasks
                    </Text>

                    <Text
                      style={
                        styles.workerStat
                      }
                    >
                      ✅{" "}
                      {worker.completed}
                    </Text>

                    <Text
                      style={
                        styles.workerStat
                      }
                    >
                      🔵{" "}
                      {worker.inProgress}
                    </Text>

                    <Text
                      style={
                        styles.workerStat
                      }
                    >
                      ⏳{" "}
                      {worker.pending}
                    </Text>

                    {worker.overdue >
                      0 && (
                      <Text
                        style={
                          styles.workerOverdue
                        }
                      >
                        ⚠️{" "}
                        {worker.overdue}
                      </Text>
                    )}

                  </View>

                </View>

                <View
                  style={
                    styles.completionBox
                  }
                >

                  <Text
                    style={
                      styles.completionValue
                    }
                  >
                    {
                      worker.completionRate
                    }
                    %
                  </Text>

                  <Text
                    style={
                      styles.completionLabel
                    }
                  >
                    completed
                  </Text>

                </View>

              </View>

            ))

        )}

      </View>

      {/* ================================================== */}
      {/* PROJECT-WISE ACTIVITY */}
      {/* ================================================== */}

      <View style={styles.card}>

        <Text
          style={styles.cardTitle}
        >
          📁 Project-wise Field Activity
        </Text>

        <Text
          style={styles.cardDescription}
        >
          See which workers are working on
          each watershed project.
        </Text>

        {projectActivity.length ===
        0 ? (

          <View
            style={styles.emptyBox}
          >

            <Text
              style={styles.emptyText}
            >
              No project activity
              available.
            </Text>

          </View>

        ) : (

          projectActivity.map(
            (project) => (

              <View
                key={
                  project.project?._id
                }
                style={
                  styles.projectActivity
                }
              >

                <View
                  style={
                    styles.projectActivityHeader
                  }
                >

                  <View
                    style={{
                      flex: 1,
                    }}
                  >

                    <Text
                      style={
                        styles.projectActivityName
                      }
                    >
                      📁{" "}
                      {project.project
                        ?.name ||
                        "Unknown Project"}
                    </Text>

                    <Text
                      style={
                        styles.projectActivityLocation
                      }
                    >
                      {project.project
                        ?.village ||
                        ""}
                      {project.project
                        ?.district
                        ? `, ${project.project.district}`
                        : ""}
                    </Text>

                  </View>

                  <Text
                    style={
                      styles.projectTaskCount
                    }
                  >
                    {
                      project.totalTasks
                    }{" "}
                    tasks
                  </Text>

                </View>

                <View
                  style={
                    styles.projectStats
                  }
                >

                  <Text
                    style={
                      styles.projectStat
                    }
                  >
                    ⏳{" "}
                    {project.pending}
                  </Text>

                  <Text
                    style={
                      styles.projectStat
                    }
                  >
                    🔵{" "}
                    {project.inProgress}
                  </Text>

                  <Text
                    style={[
                      styles.projectStat,
                      {
                        color:
                          "#16A34A",
                      },
                    ]}
                  >
                    ✅{" "}
                    {project.completed}
                  </Text>

                  <Text
                    style={[
                      styles.projectStat,
                      {
                        color:
                          "#DC2626",
                      },
                    ]}
                  >
                    ⚠️{" "}
                    {project.overdue}
                  </Text>

                  <Text
                    style={
                      styles.projectStat
                    }
                  >
                    📍{" "}
                    {
                      project.surveySubmitted
                    }
                  </Text>

                </View>

                <Text
                  style={
                    styles.projectWorkersTitle
                  }
                >
                  Assigned Workers
                </Text>

                {project.workers
                  ?.length === 0 ? (

                  <Text
                    style={
                      styles.noWorkerText
                    }
                  >
                    No workers assigned.
                  </Text>

                ) : (

                  project.workers.map(
                    (worker) => (

                      <View
                        key={
                          worker._id
                        }
                        style={
                          styles.projectWorker
                        }
                      >

                        <View
                          style={
                            styles.projectWorkerAvatar
                          }
                        >

                          <Text
                            style={
                              styles.projectWorkerAvatarText
                            }
                          >
                            {(
                              worker.name ||
                              "W"
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </Text>

                        </View>

                        <View
                          style={{
                            flex: 1,
                          }}
                        >

                          <Text
                            style={
                              styles.projectWorkerName
                            }
                          >
                            {worker.name ||
                              "Unknown"}
                          </Text>

                          <Text
                            style={
                              styles.projectWorkerEmail
                            }
                          >
                            {worker.email ||
                              ""}
                          </Text>

                        </View>

                        <View
                          style={
                            styles.projectWorkerStats
                          }
                        >

                          <Text
                            style={
                              styles.projectWorkerTasks
                            }
                          >
                            {
                              worker.tasks
                            }{" "}
                            tasks
                          </Text>

                          <Text
                            style={
                              styles.projectWorkerCompleted
                            }
                          >
                            ✅{" "}
                            {
                              worker.completed
                            }
                          </Text>

                          <Text
                            style={
                              styles.projectWorkerActive
                            }
                          >
                            🔵{" "}
                            {
                              worker.inProgress
                            }
                          </Text>

                        </View>

                      </View>

                    )
                  )

                )}

              </View>

            )
          )

        )}

      </View>

      {/* ================================================== */}
      {/* CURRENT ASSIGNMENTS */}
      {/* ================================================== */}

      <View
        style={
          styles.sectionHeaderRow
        }
      >

        <View>

          <Text
            style={
              styles.sectionTitleNoMargin
            }
          >
            Current Assignments
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Latest field activities
          </Text>

        </View>

      </View>

      {tasks
        .slice(0, 8)
        .map((task) => (

          <TouchableOpacity
            key={`assignment-${task._id}`}
            style={
              styles.taskCard
            }
            onPress={() =>
              navigation.navigate(
                "AdminTaskDetails",
                { task }
              )
            }
          >

            <View
              style={styles.taskTop}
            >

              <View
                style={styles.taskType}
              >

                <Text
                  style={
                    styles.taskTypeIcon
                  }
                >
                  {task.surveyType ===
                  "BEFORE"
                    ? "🟡"
                    : task.surveyType ===
                      "AFTER"
                    ? "🟢"
                    : "🔵"}
                </Text>

                <Text
                  style={
                    styles.taskTypeText
                  }
                >
                  {task.surveyType ||
                    "MONITORING"}
                </Text>

              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      getTaskStatusColor(
                        task.status
                      ),
                  },
                ]}
              >

                <Text
                  style={
                    styles.statusText
                  }
                >
                  {task.status}
                </Text>

              </View>

            </View>

            <Text
              style={styles.taskTitle}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            <View
              style={styles.taskProject}
            >

              <Text
                style={
                  styles.taskProjectIcon
                }
              >
                📁
              </Text>

              <View
                style={{
                  flex: 1,
                }}
              >

                <Text
                  style={
                    styles.taskProjectName
                  }
                  numberOfLines={1}
                >
                  {task.projectId
                    ?.name ||
                    "Project"}
                </Text>

                <Text
                  style={
                    styles.taskProjectLocation
                  }
                >
                  {task.projectId
                    ?.village ||
                    ""}
                  {task.projectId
                    ?.district
                    ? `, ${task.projectId.district}`
                    : ""}
                </Text>

              </View>

            </View>

            <View
              style={
                styles.assignmentBox
              }
            >

              <View
                style={
                  styles.assignmentColumn
                }
              >

                <Text
                  style={
                    styles.assignmentLabel
                  }
                >
                  👷 PERFORMING
                </Text>

                <Text
                  style={
                    styles.assignmentName
                  }
                  numberOfLines={1}
                >
                  {task.assignedTo
                    ?.name ||
                    "Not assigned"}
                </Text>

                <Text
                  style={
                    styles.assignmentEmail
                  }
                >
                  {task.assignedTo
                    ?.email ||
                    ""}
                </Text>

              </View>

              <View
                style={
                  styles.assignmentDivider
                }
              />

              <View
                style={
                  styles.assignmentColumn
                }
              >

                <Text
                  style={
                    styles.assignmentLabel
                  }
                >
                  👨‍💼 ASSIGNED BY
                </Text>

                <Text
                  style={
                    styles.assignmentName
                  }
                  numberOfLines={1}
                >
                  {task.assignedBy
                    ?.name ||
                    "Unknown"}
                </Text>

                <Text
                  style={
                    styles.assignmentEmail
                  }
                >
                  {task.assignedBy
                    ?.role ||
                    "Officer"}
                </Text>

              </View>

            </View>

          </TouchableOpacity>

        ))}

      {/* ================================================== */}
      {/* ADMINISTRATION */}
      {/* ================================================== */}

      <Text
        style={styles.sectionTitle}
      >
        Administration
      </Text>

      <View
        style={styles.manageGrid}
      >

        <ManageCard
          icon="👥"
          title="Users"
          subtitle="Officers & field workers"
          onPress={() =>
            navigation.navigate(
              "AdminUsers"
            )
          }
        />

        <ManageCard
          icon="📁"
          title="Projects"
          subtitle="Manage watershed projects"
          onPress={() =>
            navigation.navigate(
              "AdminProjects"
            )
          }
        />

        <ManageCard
          icon="📋"
          title="Tasks"
          subtitle="Track field activities"
          onPress={() =>
            navigation.navigate(
              "AdminTasks"
            )
          }
        />

        <ManageCard
          icon="📊"
          title="Analytics"
          subtitle="District performance"
          onPress={() =>
            navigation.navigate(
              "Analytics"
            )
          }
        />

      </View>

      {/* ================================================== */}
      {/* PROJECT STATUS */}
      {/* ================================================== */}

      <View style={styles.card}>

        <Text
          style={styles.cardTitle}
        >
          Project Status
        </Text>

        <StatusRow
          label="Good"
          value={
            summary?.good || 0
          }
          symbol="🟢"
        />

        <StatusRow
          label="Moderate"
          value={
            summary?.moderate || 0
          }
          symbol="🟡"
        />

        <StatusRow
          label="Poor"
          value={
            summary?.poor || 0
          }
          symbol="🟠"
        />

        <StatusRow
          label="Critical"
          value={
            summary?.critical || 0
          }
          symbol="🔴"
        />

      </View>

      {/* ================================================== */}
      {/* DISTRICTS */}
      {/* ================================================== */}

      <View style={styles.card}>

        <Text
          style={styles.cardTitle}
        >
          District-wise Performance
        </Text>

        {districts.length === 0 ? (

          <Text
            style={styles.emptyText}
          >
            No district data available.
          </Text>

        ) : (

          districts.map(
            (district) => (

              <View
                key={
                  district.district
                }
                style={
                  styles.districtRow
                }
              >

                <View
                  style={
                    styles.districtHeader
                  }
                >

                  <Text
                    style={
                      styles.districtName
                    }
                  >
                    {
                      district.district
                    }
                  </Text>

                  <Text
                    style={
                      styles.districtScore
                    }
                  >
                    {
                      district.averageImpactScore
                    }
                    /100
                  </Text>

                </View>

                <Text
                  style={
                    styles.districtSub
                  }
                >
                  {
                    district.totalProjects
                  }{" "}
                  projects • 🟢
                  {district.good} 🟡
                  {district.moderate} 🟠
                  {district.poor} 🔴
                  {district.critical}
                </Text>

              </View>

            )
          )

        )}

      </View>

      {/* ================================================== */}
      {/* ATTENTION PROJECTS */}
      {/* ================================================== */}

      {(
        attentionProjects.length > 0 ||
        (summary?.priorityCount || 0) > 0
      ) && (

        <View
          style={styles.alertCard}
        >

          {/* ATTENTION HEADER */}

          <View
            style={
              styles.attentionHeaderRow
            }
          >

            <View
              style={{
                flex: 1,
              }}
            >

              <Text
                style={
                  styles.alertTitle
                }
              >
                🚨 Projects Need Attention
              </Text>

              <Text
                style={
                  styles.alertText
                }
              >
                These watershed projects
                require intervention or
                further monitoring.
              </Text>

            </View>

            <View
              style={
                styles.attentionCountBox
              }
            >

              <Text
                style={
                  styles.attentionCount
                }
              >
                {
                  attentionProjects.length ||
                  summary?.priorityCount ||
                  0
                }
              </Text>

              <Text
                style={
                  styles.attentionCountLabel
                }
              >
                PROJECT
                {(
                  attentionProjects.length ||
                  summary?.priorityCount ||
                  0
                ) !== 1
                  ? "S"
                  : ""}
              </Text>

            </View>

          </View>

          {/* ================================================= */}
          {/* PROJECT LIST */}
          {/* ================================================= */}

          {attentionProjects.length ===
          0 ? (

            <View
              style={
                styles.noAttentionBox
              }
            >

              <Text
                style={
                  styles.noAttentionIcon
                }
              >
                ⚠️
              </Text>

              <Text
                style={
                  styles.noAttentionTitle
                }
              >
                Attention project details
                unavailable
              </Text>

              <Text
                style={
                  styles.noAttentionText
                }
              >
                The dashboard reports{" "}
                {summary?.priorityCount ||
                  0}{" "}
                project
                {(
                  summary?.priorityCount ||
                  0
                ) !== 1
                  ? "s"
                  : ""}{" "}
                requiring attention, but
                project details were not
                returned by the server.
              </Text>

              <TouchableOpacity
                style={
                  styles.retryAttentionButton
                }
                onPress={
                  handleRefresh
                }
              >

                <Text
                  style={
                    styles.retryAttentionText
                  }
                >
                  Refresh Dashboard
                </Text>

              </TouchableOpacity>

            </View>

          ) : (

            attentionProjects.map(
              (
                project,
                index
              ) => {

                const score =
                  getProjectScore(
                    project
                  );

                const status =
                  getProjectStatus(
                    project,
                    score
                  );

                const colors =
                  getAttentionColors(
                    status
                  );

                const projectId =
                  project._id ||
                  project.id;

                return (
                  <TouchableOpacity
                    key={
                      projectId ||
                      `attention-${index}`
                    }
                    activeOpacity={0.8}
                    style={
                      styles.attentionProjectCard
                    }
                    onPress={() => {

                      console.log(
                        "OPEN ATTENTION PROJECT:",
                        project
                      );

                      if (!projectId) {
                        Alert.alert(
                          "Project Error",
                          "Project ID is missing."
                        );
                        return;
                      }

                      navigation.navigate(
                        "ProjectDetails",
                        {
                          project:
                            project,
                          projectId:
                            projectId,
                        }
                      );

                    }}
                  >

                    {/* PROJECT HEADER */}

                    <View
                      style={
                        styles.attentionProjectTop
                      }
                    >

                      <View
                        style={{
                          flex: 1,
                        }}
                      >

                        <Text
                          style={
                            styles.attentionProjectName
                          }
                          numberOfLines={2}
                        >
                          📁{" "}
                          {
                            project.name ||
                            project.projectName ||
                            "Unnamed Project"
                          }
                        </Text>

                        <Text
                          style={
                            styles.attentionProjectLocation
                          }
                          numberOfLines={2}
                        >
                          📍{" "}
                          {
                            project.village ||
                            project.location
                              ?.village ||
                            "Village not available"
                          }

                          {(
                            project.district ||
                            project.location
                              ?.district
                          )
                            ? `, ${
                                project.district ||
                                project.location
                                  ?.district
                              }`
                            : ""}
                        </Text>

                      </View>

                      {/* SCORE */}

                      <View
                        style={
                          styles.attentionScoreContainer
                        }
                      >

                        <Text
                          style={[
                            styles.attentionScore,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          {score === null
                            ? "—"
                            : Math.round(
                                score
                              )}
                        </Text>

                        <Text
                          style={
                            styles.attentionScoreLabel
                          }
                        >
                          /100
                        </Text>

                      </View>

                    </View>

                    {/* STATUS */}

                    <View
                      style={
                        styles.attentionInfoRow
                      }
                    >

                      <View
                        style={[
                          styles.attentionStatusBadge,
                          {
                            backgroundColor:
                              colors.background,
                          },
                        ]}
                      >

                        <Text
                          style={[
                            styles.attentionStatusText,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          {status}
                        </Text>

                      </View>

                      <Text
                        style={
                          styles.attentionReason
                        }
                      >
                        {score === null
                          ? "Impact assessment requires review"
                          : score < 30
                          ? "Very low impact score"
                          : score < 50
                          ? "Low impact score"
                          : status ===
                            "CRITICAL"
                          ? "Critical project condition"
                          : status ===
                            "POOR"
                          ? "Poor project condition"
                          : "Project requires intervention"}
                      </Text>

                    </View>

                    {/* PROJECT DETAILS */}

                    <View
                      style={
                        styles.attentionDetailsBox
                      }
                    >

                      <View
                        style={
                          styles.attentionDetailItem
                        }
                      >

                        <Text
                          style={
                            styles.attentionDetailLabel
                          }
                        >
                          PROJECT
                        </Text>

                        <Text
                          style={
                            styles.attentionDetailValue
                          }
                          numberOfLines={1}
                        >
                          {project.name ||
                            "Unnamed"}
                        </Text>

                      </View>

                      <View
                        style={
                          styles.attentionDetailItem
                        }
                      >

                        <Text
                          style={
                            styles.attentionDetailLabel
                          }
                        >
                          DISTRICT
                        </Text>

                        <Text
                          style={
                            styles.attentionDetailValue
                          }
                          numberOfLines={1}
                        >
                          {project.district ||
                            project.location
                              ?.district ||
                            "N/A"}
                        </Text>

                      </View>

                      <View
                        style={
                          styles.attentionDetailItem
                        }
                      >

                        <Text
                          style={
                            styles.attentionDetailLabel
                          }
                        >
                          SCORE
                        </Text>

                        <Text
                          style={[
                            styles.attentionDetailValue,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          {score === null
                            ? "N/A"
                            : `${Math.round(
                                score
                              )}/100`}
                        </Text>

                      </View>

                    </View>

                    {/* BOTTOM */}

                    <View
                      style={
                        styles.attentionBottomRow
                      }
                    >

                      <Text
                        style={
                          styles.attentionDetailsText
                        }
                      >
                        View project details →
                      </Text>

                      <Text
                        style={
                          styles.attentionIndex
                        }
                      >
                        #{index + 1}
                      </Text>

                    </View>

                  </TouchableOpacity>
                );
              }
            )

          )}

          {/* VIEW ALL */}

          <TouchableOpacity
            style={
              styles.alertButton
            }
            onPress={() =>
              navigation.navigate(
                "AdminProjects"
              )
            }
          >

            <Text
              style={
                styles.alertButtonText
              }
            >
              View All Projects
            </Text>

          </TouchableOpacity>

        </View>
      )}

    </ScrollView>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon,
  title,
  value,
  suffix = "",
}) {
  return (
    <View
      style={styles.summaryCard}
    >

      <Text
        style={styles.summaryIcon}
      >
        {icon}
      </Text>

      <Text
        style={styles.summaryValue}
      >

        {value}

        <Text
          style={styles.summarySuffix}
        >
          {suffix}
        </Text>

      </Text>

      <Text
        style={styles.summaryTitle}
      >
        {title}
      </Text>

    </View>
  );
}

// ============================================================
// TASK SUMMARY
// ============================================================

function TaskSummaryCard({
  title,
  value,
  icon,
}) {
  return (
    <View
      style={
        styles.taskSummaryCard
      }
    >

      <Text
        style={
          styles.taskSummaryIcon
        }
      >
        {icon}
      </Text>

      <Text
        style={
          styles.taskSummaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.taskSummaryTitle
        }
      >
        {title}
      </Text>

    </View>
  );
}

// ============================================================
// MANAGE CARD
// ============================================================

function ManageCard({
  icon,
  title,
  subtitle,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.manageCard}
      onPress={onPress}
    >

      <Text
        style={styles.manageIcon}
      >
        {icon}
      </Text>

      <Text
        style={styles.manageTitle}
      >
        {title}
      </Text>

      <Text
        style={styles.manageSubtitle}
      >
        {subtitle}
      </Text>

    </TouchableOpacity>
  );
}

// ============================================================
// STATUS ROW
// ============================================================

function StatusRow({
  label,
  value,
  symbol,
}) {
  return (
    <View
      style={styles.statusRow}
    >

      <Text
        style={styles.statusLabel}
      >
        {symbol} {label}
      </Text>

      <Text
        style={styles.statusValue}
      >
        {value}
      </Text>

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },

  content: {
    paddingBottom: 50,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
  },

  loadingText: {
    marginTop: 10,
    color: "#64748B",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    backgroundColor: "#4A148C",
    paddingTop: 58,
    paddingBottom: 25,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#E9D5FF",
    fontSize: 14,
    marginTop: 5,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  headerInfo: {
    backgroundColor:
      "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },

  headerInfoTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  headerInfoText: {
    color: "#E9D5FF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  // ==========================================================
  // SECTIONS
  // ==========================================================

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },

  sectionTitleNoMargin: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 2,
  },

  sectionSubtitle: {
    marginLeft: 16,
    marginTop: -5,
    marginBottom: 10,
    color: "#718096",
    fontSize: 12,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 20,
  },

  viewAllButton: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },

  viewAllText: {
    color: "#6B21A8",
    fontSize: 12,
    fontWeight: "800",
  },

  // ==========================================================
  // SUMMARY
  // ==========================================================

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 11,
    gap: 10,
  },

  summaryCard: {
    width: "47.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    elevation: 2,
  },

  summaryIcon: {
    fontSize: 22,
  },

  summaryValue: {
    marginTop: 8,
    fontSize: 25,
    fontWeight: "900",
    color: "#4A148C",
  },

  summarySuffix: {
    fontSize: 12,
    color: "#718096",
  },

  summaryTitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },

  // ==========================================================
  // TASK SUMMARY
  // ==========================================================

  taskSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 11,
    gap: 8,
  },

  taskSummaryCard: {
    width: "30.8%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    elevation: 2,
  },

  taskSummaryIcon: {
    fontSize: 19,
  },

  taskSummaryValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
    marginTop: 5,
  },

  taskSummaryTitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },

  // ==========================================================
  // CARD
  // ==========================================================

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  cardDescription: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },

  // ==========================================================
  // MONITOR TASK
  // ==========================================================

  monitorTask: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  monitorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  monitorProject: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },

  monitorLocation: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },

  monitorTaskBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },

  monitorTaskLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#94A3B8",
  },

  monitorTaskTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginTop: 3,
  },

  taskMetaRow: {
    flexDirection: "row",
    gap: 15,
    marginTop: 7,
  },

  taskMeta: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },

  // ==========================================================
  // PERFORMER
  // ==========================================================

  performerBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#F5F3FF",
    padding: 10,
    borderRadius: 10,
  },

  performerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DDD6FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  performerAvatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#6B21A8",
  },

  performerLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#7C3AED",
  },

  performerName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },

  performerEmail: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },

  assignmentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  smallLabel: {
    fontSize: 8,
    color: "#94A3B8",
    fontWeight: "800",
  },

  smallValue: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
    marginTop: 2,
  },

  // ==========================================================
  // WORKER
  // ==========================================================

  workerPerformance: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  workerAvatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#6B21A8",
  },

  workerMain: {
    flex: 1,
  },

  workerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },

  workerDistrict: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  workerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 5,
  },

  workerStat: {
    fontSize: 10,
    color: "#64748B",
  },

  workerOverdue: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "700",
  },

  completionBox: {
    alignItems: "center",
    marginLeft: 8,
  },

  completionValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#16A34A",
  },

  completionLabel: {
    fontSize: 9,
    color: "#64748B",
  },

  // ==========================================================
  // PROJECT ACTIVITY
  // ==========================================================

  projectActivity: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  projectActivityHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  projectActivityName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1E293B",
  },

  projectActivityLocation: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  projectTaskCount: {
    fontSize: 11,
    fontWeight: "900",
    color: "#6B21A8",
  },

  projectStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },

  projectStat: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },

  projectWorkersTitle: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 6,
  },

  projectWorker: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  projectWorkerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  projectWorkerAvatarText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B21A8",
  },

  projectWorkerName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  projectWorkerEmail: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 2,
  },

  projectWorkerStats: {
    alignItems: "flex-end",
  },

  projectWorkerTasks: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },

  projectWorkerCompleted: {
    fontSize: 9,
    color: "#16A34A",
    marginTop: 2,
  },

  projectWorkerActive: {
    fontSize: 9,
    color: "#2563EB",
    marginTop: 1,
  },

  noWorkerText: {
    fontSize: 11,
    color: "#94A3B8",
  },

  // ==========================================================
  // TASK CARD
  // ==========================================================

  taskCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 16,
    borderRadius: 17,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  taskTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  taskType: {
    flexDirection: "row",
    alignItems: "center",
  },

  taskTypeIcon: {
    fontSize: 14,
  },

  taskTypeText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },

  taskTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
  },

  taskProject: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
  },

  taskProjectIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  taskProjectName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },

  taskProjectLocation: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  assignmentBox: {
    flexDirection: "row",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
  },

  assignmentColumn: {
    flex: 1,
  },

  assignmentDivider: {
    width: 1,
    backgroundColor: "#DDD6FE",
    marginHorizontal: 10,
  },

  assignmentLabel: {
    fontSize: 9,
    color: "#7C3AED",
    fontWeight: "900",
    marginBottom: 4,
  },

  assignmentName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },

  assignmentEmail: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  // ==========================================================
  // MANAGE
  // ==========================================================

  manageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 11,
    gap: 9,
  },

  manageCard: {
    width: "47.5%",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },

  manageIcon: {
    fontSize: 26,
  },

  manageTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },

  manageSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  // ==========================================================
  // STATUS
  // ==========================================================

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  statusLabel: {
    color: "#475569",
    fontSize: 13,
  },

  statusValue: {
    fontWeight: "800",
    color: "#1E293B",
  },

  // ==========================================================
  // DISTRICT
  // ==========================================================

  districtRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  districtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  districtName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },

  districtScore: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B21A8",
  },

  districtSub: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748B",
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyBox: {
    paddingVertical: 25,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  // ==========================================================
  // ALERT
  // ==========================================================

  alertCard: {
    backgroundColor: "#FEF2F2",
    marginHorizontal: 15,
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  alertTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#991B1B",
  },

  alertText: {
    marginTop: 6,
    fontSize: 12,
    color: "#7F1D1D",
    lineHeight: 18,
  },

  // ==========================================================
  // ATTENTION HEADER
  // ==========================================================

  attentionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  attentionCountBox: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 15,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  attentionCount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#B91C1C",
  },

  attentionCountLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#991B1B",
    marginTop: 1,
  },

  // ==========================================================
  // ATTENTION PROJECT CARD
  // ==========================================================

  attentionProjectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    elevation: 2,
  },

  attentionProjectTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  attentionProjectName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#7F1D1D",
    lineHeight: 20,
  },

  attentionProjectLocation: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 5,
    lineHeight: 16,
  },

  attentionScoreContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  attentionScore: {
    fontSize: 20,
    fontWeight: "900",
  },

  attentionScoreLabel: {
    fontSize: 9,
    color: "#64748B",
    marginTop: -2,
  },

  attentionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  attentionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  attentionStatusText: {
    fontSize: 9,
    fontWeight: "900",
  },

  attentionReason: {
    flex: 1,
    marginLeft: 9,
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    lineHeight: 15,
  },

  // ==========================================================
  // ATTENTION DETAILS
  // ==========================================================

  attentionDetailsBox: {
    flexDirection: "row",
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FFF7F7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },

  attentionDetailItem: {
    flex: 1,
    paddingHorizontal: 4,
  },

  attentionDetailLabel: {
    fontSize: 7,
    color: "#94A3B8",
    fontWeight: "900",
  },

  attentionDetailValue: {
    marginTop: 3,
    fontSize: 10,
    color: "#334155",
    fontWeight: "800",
  },

  // ==========================================================
  // ATTENTION BOTTOM
  // ==========================================================

  attentionBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  attentionDetailsText: {
    fontSize: 10,
    color: "#B91C1C",
    fontWeight: "800",
  },

  attentionIndex: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "700",
  },

  // ==========================================================
  // NO ATTENTION DETAILS
  // ==========================================================

  noAttentionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    marginTop: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  noAttentionIcon: {
    fontSize: 30,
  },

  noAttentionTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
    textAlign: "center",
  },

  noAttentionText: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 16,
    color: "#7F1D1D",
    textAlign: "center",
  },

  retryAttentionButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: "#B91C1C",
    borderRadius: 8,
  },

  retryAttentionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  // ==========================================================
  // ALERT BUTTON
  // ==========================================================

  alertButton: {
    marginTop: 14,
    backgroundColor: "#B91C1C",
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: "center",
  },

  alertButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

});