import React, { useCallback, useMemo, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect } from "@react-navigation/native";

import api from "../services/api";

// ============================================================
// HELPERS
// ============================================================

const numberValue = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }

  return 0;
};

const clamp = (value, min = 0, max = 1) => {
  return Math.min(max, Math.max(min, Number(value) || 0));
};

const formatDate = (date) => {
  if (!date) return "—";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getProjectStatus = (score) => {
  const value = Number(score || 0);

  if (value >= 70) return "Good";
  if (value >= 50) return "Moderate";
  if (value >= 30) return "Poor";

  return "Critical";
};

const getStatusColor = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "GOOD":
      return "#2E7D32";

    case "MODERATE":
      return "#F9A825";

    case "POOR":
      return "#EF6C00";

    case "CRITICAL":
      return "#C62828";

    default:
      return "#757575";
  }
};

const getStatusBackground = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "GOOD":
      return "#E8F5E9";

    case "MODERATE":
      return "#FFF8E1";

    case "POOR":
      return "#FFF3E0";

    case "CRITICAL":
      return "#FFEBEE";

    default:
      return "#F3F4F6";
  }
};

const getTaskStatusColor = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "COMPLETED":
      return "#2E7D32";

    case "IN_PROGRESS":
      return "#1565C0";

    case "ACCEPTED":
      return "#00838F";

    case "PENDING":
      return "#F9A825";

    case "REJECTED":
      return "#C62828";

    case "CANCELLED":
      return "#757575";

    default:
      return "#757575";
  }
};

const getPriorityColor = (priority) => {
  switch (String(priority || "").toUpperCase()) {
    case "CRITICAL":
      return "#C62828";

    case "HIGH":
      return "#EF6C00";

    case "MEDIUM":
      return "#F9A825";

    case "LOW":
      return "#2E7D32";

    default:
      return "#757575";
  }
};

const formatRole = (role) => {
  if (!role) return "—";

  return String(role)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// ============================================================
// MAIN SCREEN
// ============================================================

export default function AnalyticsScreen({ navigation }) {
  const [summary, setSummary] = useState(null);

  const [projectIndicators, setProjectIndicators] = useState([]);

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [expandedProjects, setExpandedProjects] = useState({});

  // ==========================================================
  // LOAD ANALYTICS
  // ==========================================================

  const loadAnalytics = async () => {
    try {
      const [
        dashboardResponse,
        indicatorsResponse,
        tasksResponse,
      ] = await Promise.allSettled([
        api.get("/projects/analytics/dashboard"),

        api.get("/projects/analytics/watershed-indicators"),

        api.get("/tasks/admin/all"),
      ]);

      // ------------------------------------------------------
      // DASHBOARD
      // ------------------------------------------------------

      if (dashboardResponse.status === "fulfilled") {
        const data = dashboardResponse.value?.data;

        setSummary(
          data?.summary ||
            data ||
            null
        );
      } else {
        console.log(
          "Dashboard analytics error:",
          dashboardResponse.reason?.response?.data ||
            dashboardResponse.reason?.message
        );
      }

      // ------------------------------------------------------
      // PROJECT INDICATORS
      // ------------------------------------------------------

      if (indicatorsResponse.status === "fulfilled") {
        const data = indicatorsResponse.value?.data;

        setProjectIndicators(
          data?.projects ||
            data?.projectIndicators ||
            []
        );
      } else {
        console.log(
          "Project indicators error:",
          indicatorsResponse.reason?.response?.data ||
            indicatorsResponse.reason?.message
        );

        setProjectIndicators([]);
      }

      // ------------------------------------------------------
      // TASKS
      // ------------------------------------------------------

    // ------------------------------------------------------
// TASKS
// ------------------------------------------------------

if (tasksResponse.status === "fulfilled") {
  const data = tasksResponse.value?.data;

  console.log(
    "=========================================="
  );

  console.log(
    "ADMIN TASKS RESPONSE:",
    JSON.stringify(data, null, 2)
  );

  console.log(
    "=========================================="
  );

  const receivedTasks =
    data?.tasks ||
    data?.activities ||
    data?.data?.tasks ||
    [];

  console.log(
    "TASK COUNT FROM API:",
    receivedTasks.length
  );

  setTasks(
    Array.isArray(receivedTasks)
      ? receivedTasks
      : []
  );
} else {
  console.log(
    "=========================================="
  );

  console.log(
    "ADMIN TASK API ERROR:"
  );

  console.log(
    tasksResponse.reason?.response?.status
  );

  console.log(
    tasksResponse.reason?.response?.data ||
      tasksResponse.reason?.message
  );

  console.log(
    "=========================================="
  );

  setTasks([]);
}
    } catch (error) {
      console.log(
        "Analytics load error:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // SCREEN FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = () => {
    setRefreshing(true);

    loadAnalytics();
  };

  // ==========================================================
  // NORMALIZE PROJECT DATA
  // ==========================================================

  const normalizedProjects = useMemo(() => {
    return projectIndicators.map((project) => {
      const indicators = project.indicators || {};

      const impactScore = numberValue(
        project.impactScore,
        project.score
      );

      const waterAvailability = numberValue(
        indicators.waterAvailability,
        indicators.water,
        project.waterAvailability,
        project.water
      );

      const waterRetention = numberValue(
        indicators.waterRetention,
        indicators.retention,
        project.waterRetention,
        project.retention
      );

      const vegetation = numberValue(
        indicators.vegetation,
        indicators.fieldVegetation,
        project.vegetation,
        project.fieldVegetation
      );

      const structureCondition = numberValue(
        indicators.structureCondition,
        indicators.structure,
        project.structureCondition,
        project.structure
      );

      const maintenance = numberValue(
        indicators.maintenance,
        project.maintenance
      );

      const status =
        project.status &&
        project.status !== "N/A"
          ? project.status
          : getProjectStatus(impactScore);

      return {
        ...project,

        impactScore,

        waterAvailability,

        waterRetention,

        vegetation,

        structureCondition,

        maintenance,

        status,
      };
    });
  }, [projectIndicators]);

  // ==========================================================
  // FILTER PROJECTS
  // ==========================================================

  const filteredProjects = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return normalizedProjects.filter((project) => {
      const matchesSearch =
        !query ||
        String(project.projectName || "")
          .toLowerCase()
          .includes(query) ||
        String(project.village || "")
          .toLowerCase()
          .includes(query) ||
        String(project.district || "")
          .toLowerCase()
          .includes(query) ||
        String(project.assignedWorker || "")
          .toLowerCase()
          .includes(query) ||
        String(project.assignedOfficer || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(project.status || "").toUpperCase() ===
          statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    normalizedProjects,
    searchText,
    statusFilter,
  ]);

  // ==========================================================
  // PROJECT STATUS COUNTS
  // ==========================================================

  const projectStatusCounts = useMemo(() => {
    const counts = {
      GOOD: 0,
      MODERATE: 0,
      POOR: 0,
      CRITICAL: 0,
    };

    normalizedProjects.forEach((project) => {
      const status = String(
        project.status || ""
      ).toUpperCase();

      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
    });

    return counts;
  }, [normalizedProjects]);

  // ==========================================================
  // TASK COUNTS
  // ==========================================================

  const taskCounts = useMemo(() => {
    const counts = {
      total: tasks.length,
      pending: 0,
      accepted: 0,
      inProgress: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    };

    tasks.forEach((task) => {
      switch (
        String(task.status || "").toUpperCase()
      ) {
        case "PENDING":
          counts.pending++;
          break;

        case "ACCEPTED":
          counts.accepted++;
          break;

        case "IN_PROGRESS":
          counts.inProgress++;
          break;

        case "COMPLETED":
          counts.completed++;
          break;

        case "REJECTED":
          counts.rejected++;
          break;

        case "CANCELLED":
          counts.cancelled++;
          break;

        default:
          break;
      }
    });

    return counts;
  }, [tasks]);

  // ==========================================================
  // TOGGLE PROJECT
  // ==========================================================

  const toggleProject = (projectId) => {
    setExpandedProjects((previous) => ({
      ...previous,
      [projectId]: !previous[projectId],
    }));
  };

  // ==========================================================
  // NAVIGATE PROJECT
  // ==========================================================

  const openProject = (project) => {
    navigation.navigate("ProjectDetails", {
      project: {
        _id: project.projectId,
        name: project.projectName,
        village: project.village,
        district: project.district,
      },
    });
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
        edges={["top"]}
      >
        <ActivityIndicator
          size="large"
          color="#176B3A"
        />

        <Text style={styles.loadingTitle}>
          Loading Impact Analytics
        </Text>

        <Text style={styles.loadingSubtitle}>
          Preparing watershed performance data...
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================================
  // SUMMARY VALUES
  // ==========================================================

  const totalProjects = numberValue(
    summary?.totalProjects,
    normalizedProjects.length
  );

  const totalSurveys = numberValue(
    summary?.totalSurveys
  );

  const averageImpactScore = numberValue(
    summary?.averageImpactScore,
    summary?.averageImpact
  );

  const priorityCount = numberValue(
    summary?.priorityCount
  );

  const summaryGood =
    summary?.good ??
    projectStatusCounts.GOOD;

  const summaryModerate =
    summary?.moderate ??
    projectStatusCounts.MODERATE;

  const summaryPoor =
    summary?.poor ??
    projectStatusCounts.POOR;

  const summaryCritical =
    summary?.critical ??
    projectStatusCounts.CRITICAL;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <Text style={styles.headerIcon}>
              📊
            </Text>
          </View>

          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>
              Impact Analytics
            </Text>

            <Text style={styles.headerSubtitle}>
              Watershed project performance
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshIcon}>
              ↻
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* SUMMARY */}
        {/* ================================================== */}

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="📁"
            title="Projects"
            value={totalProjects}
          />

          <SummaryCard
            icon="📝"
            title="Surveys"
            value={totalSurveys}
          />

          <SummaryCard
            icon="📈"
            title="Average Impact"
            value={averageImpactScore.toFixed(1)}
            suffix="/100"
          />

          <SummaryCard
            icon="🚨"
            title="Attention"
            value={priorityCount}
            danger={priorityCount > 0}
          />
        </View>

        {/* ================================================== */}
        {/* PROJECT STATUS */}
        {/* ================================================== */}

        <SectionCard>
          <SectionHeader
            title="Project Status"
            subtitle="Current watershed health"
          />

          <StatusProgress
            label="Good"
            value={Number(summaryGood)}
            total={Math.max(totalProjects, 1)}
            color="#66BB6A"
            icon="🟢"
          />

          <StatusProgress
            label="Moderate"
            value={Number(summaryModerate)}
            total={Math.max(totalProjects, 1)}
            color="#FBC02D"
            icon="🟡"
          />

          <StatusProgress
            label="Poor"
            value={Number(summaryPoor)}
            total={Math.max(totalProjects, 1)}
            color="#FB8C00"
            icon="🟠"
          />

          <StatusProgress
            label="Critical"
            value={Number(summaryCritical)}
            total={Math.max(totalProjects, 1)}
            color="#F44336"
            icon="🔴"
          />
        </SectionCard>

        {/* ================================================== */}
        {/* PROJECT-WISE INDICATORS */}
        {/* ================================================== */}

        <SectionCard>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Watershed Indicators
              </Text>

              <Text style={styles.sectionSubtitle}>
                Individual project performance
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {normalizedProjects.length}
              </Text>

              <Text style={styles.countBadgeLabel}>
                Projects
              </Text>
            </View>
          </View>

          {/* SEARCH */}

          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>
              🔍
            </Text>

            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search project, village, officer..."
              placeholderTextColor="#999"
              style={styles.searchInput}
            />

            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText("")}
              >
                <Text style={styles.clearSearch}>
                  ✕
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* STATUS FILTER */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {[
              "ALL",
              "GOOD",
              "MODERATE",
              "POOR",
              "CRITICAL",
            ].map((status) => {
              const active =
                statusFilter === status;

              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    active &&
                      styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setStatusFilter(status)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {status === "ALL"
                      ? "All"
                      : status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* PROJECT LIST */}

          {filteredProjects.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No project data"
              message={
                normalizedProjects.length === 0
                  ? "Complete project surveys to generate watershed indicators."
                  : "No project matches your search or filter."
              }
            />
          ) : (
            filteredProjects.map((project) => (
              <ProjectIndicatorCard
                key={String(
                  project.projectId
                )}
                project={project}
                expanded={
                  !!expandedProjects[
                    project.projectId
                  ]
                }
                onToggle={() =>
                  toggleProject(
                    project.projectId
                  )
                }
                onOpen={() =>
                  openProject(project)
                }
              />
            ))
          )}
        </SectionCard>

        {/* ================================================== */}
        {/* TASK ACTIVITY */}
        {/* ================================================== */}

        <SectionCard>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Project Activity & Tasks
              </Text>

              <Text style={styles.sectionSubtitle}>
                Who is performing which task
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {taskCounts.total}
              </Text>

              <Text style={styles.countBadgeLabel}>
                Tasks
              </Text>
            </View>
          </View>

          {/* TASK SUMMARY */}

          <View style={styles.taskSummaryGrid}>
            <MiniTaskStat
              label="Pending"
              value={taskCounts.pending}
              color="#F9A825"
            />

            <MiniTaskStat
              label="Active"
              value={
                taskCounts.accepted +
                taskCounts.inProgress
              }
              color="#1565C0"
            />

            <MiniTaskStat
              label="Completed"
              value={taskCounts.completed}
              color="#2E7D32"
            />

            <MiniTaskStat
              label="Rejected"
              value={taskCounts.rejected}
              color="#C62828"
            />
          </View>

          {tasks.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No task activity"
              message="Assigned tasks will appear here."
            />
          ) : (
            tasks.map((task, index) => (
              <TaskActivityCard
                key={
                  String(
                    task._id ||
                      task.id ||
                      index
                  )
                }
                task={task}
              />
            ))
          )}
        </SectionCard>

        {/* ================================================== */}
        {/* ATTENTION */}
        {/* ================================================== */}

        {priorityCount > 0 && (
          <View style={styles.attentionCard}>
            <View style={styles.attentionIconBox}>
              <Text style={styles.attentionIcon}>
                🚨
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.attentionTitle}>
                Attention Required
              </Text>

              <Text style={styles.attentionText}>
                {priorityCount} project
                {priorityCount === 1
                  ? ""
                  : "s"} require
                inspection or improvement.
              </Text>
            </View>
          </View>
        )}

        {/* ================================================== */}
        {/* ABOUT */}
        {/* ================================================== */}

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>
            About Impact Score
          </Text>

          <Text style={styles.aboutText}>
            The JalDrishti impact score combines
            field observations for water
            availability, vegetation, structure
            condition, water retention and
            maintenance to measure watershed
            performance.
          </Text>

          <Text style={styles.aboutText}>
            BEFORE and AFTER surveys can be
            compared to measure improvement,
            while MONITORING surveys show the
            current project condition.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  danger = false,
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        danger &&
          value > 0 &&
          styles.summaryCardDanger,
      ]}
    >
      <View style={styles.summaryIconCircle}>
        <Text style={styles.summaryIcon}>
          {icon}
        </Text>
      </View>

      <Text
        style={[
          styles.summaryValue,
          danger &&
            value > 0 &&
            styles.summaryDangerValue,
        ]}
      >
        {value}
        {suffix && (
          <Text style={styles.summarySuffix}>
            {suffix}
          </Text>
        )}
      </Text>

      <Text style={styles.summaryTitle}>
        {title}
      </Text>
    </View>
  );
}

// ============================================================
// SECTION CARD
// ============================================================

function SectionCard({ children }) {
  return (
    <View style={styles.sectionCard}>
      {children}
    </View>
  );
}

// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

// ============================================================
// STATUS PROGRESS
// ============================================================

function StatusProgress({
  label,
  value,
  total,
  color,
  icon,
}) {
  const progress = clamp(
    Number(value) / Number(total)
  );

  return (
    <View style={styles.statusProgress}>
      <View style={styles.statusProgressHeader}>
        <Text style={styles.statusLabel}>
          {icon} {label}
        </Text>

        <Text style={styles.statusValue}>
          {value}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ============================================================
// PROJECT INDICATOR CARD
// ============================================================

function ProjectIndicatorCard({
  project,
  expanded,
  onToggle,
  onOpen,
}) {
  const statusColor = getStatusColor(
    project.status
  );

  const statusBackground =
    getStatusBackground(project.status);

  const score = numberValue(
    project.impactScore
  );

  return (
    <View style={styles.projectCard}>
      {/* HEADER */}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggle}
      >
        <View style={styles.projectHeader}>
          <View
            style={styles.projectTitleBox}
          >
            <Text
              style={styles.projectName}
              numberOfLines={2}
            >
              {project.projectName ||
                "Unnamed Project"}
            </Text>

            <Text
              style={styles.projectLocation}
              numberOfLines={1}
            >
              📍{" "}
              {project.village ||
                "Village"}
              {project.district
                ? `, ${project.district}`
                : ""}
            </Text>
          </View>

          <View
            style={[
              styles.scoreBox,
              {
                backgroundColor:
                  statusBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreValue,
                {
                  color: statusColor,
                },
              ]}
            >
              {score.toFixed(1)}
            </Text>

            <Text
              style={[
                styles.scoreOutOf,
                {
                  color: statusColor,
                },
              ]}
            >
              /100
            </Text>
          </View>
        </View>

        {/* STATUS */}

        <View style={styles.projectMetaRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  statusBackground,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    statusColor,
                },
              ]}
            />

            <Text
              style={[
                styles.statusPillText,
                {
                  color: statusColor,
                },
              ]}
            >
              {String(
                project.status || "N/A"
              ).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.surveyType}>
            {project.surveyType ||
              "NO SURVEY"}
          </Text>

          <Text style={styles.expandIcon}>
            {expanded ? "⌃" : "⌄"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* MAIN INDICATORS */}

      <View style={styles.indicatorsContainer}>
        <IndicatorRow
          icon="💧"
          label="Water Availability"
          value={`${project.waterAvailability}/5`}
          progress={
            project.waterAvailability / 5
          }
        />

        <IndicatorRow
          icon="💦"
          label="Water Retention"
          value={`${project.waterRetention}/5`}
          progress={
            project.waterRetention / 5
          }
        />

        <IndicatorRow
          icon="🌱"
          label="Vegetation"
          value={`${project.vegetation}%`}
          progress={
            project.vegetation / 100
          }
        />

        <IndicatorRow
          icon="🏗️"
          label="Structure Condition"
          value={`${project.structureCondition}/5`}
          progress={
            project.structureCondition / 5
          }
        />

        <IndicatorRow
          icon="🔧"
          label="Maintenance"
          value={`${project.maintenance}/5`}
          progress={
            project.maintenance / 5
          }
        />
      </View>

      {/* EXPANDED DETAILS */}

      {expanded && (
        <View style={styles.expandedArea}>
          <Text style={styles.detailsTitle}>
            Project Assignment
          </Text>

          <AssignmentRow
            icon="👨‍💼"
            label="Officer"
            value={
              project.assignedOfficer ||
              "Not assigned"
            }
          />

          <AssignmentRow
            icon="👷"
            label="Field Worker"
            value={
              project.assignedWorker ||
              "Not assigned"
            }
          />

          <AssignmentRow
            icon="📝"
            label="Survey Type"
            value={
              project.surveyType ||
              "Not available"
            }
          />

          <AssignmentRow
            icon="📅"
            label="Last Survey"
            value={formatDate(
              project.surveyDate
            )}
          />

          <TouchableOpacity
            style={styles.viewProjectButton}
            onPress={onOpen}
          >
            <Text style={styles.viewProjectButtonText}>
              View Complete Project
            </Text>

            <Text style={styles.viewProjectArrow}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================================
// INDICATOR ROW
// ============================================================

function IndicatorRow({
  icon,
  label,
  value,
  progress,
}) {
  const safeProgress = clamp(
    progress
  );

  return (
    <View style={styles.indicatorRow}>
      <View style={styles.indicatorHeader}>
        <Text style={styles.indicatorLabel}>
          {icon} {label}
        </Text>

        <Text style={styles.indicatorValue}>
          {value}
        </Text>
      </View>

      <View style={styles.indicatorTrack}>
        <View
          style={[
            styles.indicatorFill,
            {
              width: `${
                safeProgress * 100
              }%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ============================================================
// ASSIGNMENT ROW
// ============================================================

function AssignmentRow({
  icon,
  label,
  value,
}) {
  return (
    <View style={styles.assignmentRow}>
      <View style={styles.assignmentLeft}>
        <Text style={styles.assignmentIcon}>
          {icon}
        </Text>

        <Text style={styles.assignmentLabel}>
          {label}
        </Text>
      </View>

      <Text
        style={styles.assignmentValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// TASK ACTIVITY CARD
// ============================================================

function TaskActivityCard({ task }) {
  const status = String(
    task.status || "PENDING"
  ).toUpperCase();

  const priority = String(
    task.priority || "MEDIUM"
  ).toUpperCase();

  const statusColor =
    getTaskStatusColor(status);

  const priorityColor =
    getPriorityColor(priority);

  const project =
    task.projectId &&
    typeof task.projectId === "object"
      ? task.projectId
      : null;

  const assignedTo =
    task.assignedTo &&
    typeof task.assignedTo === "object"
      ? task.assignedTo
      : null;

  const assignedBy =
    task.assignedBy &&
    typeof task.assignedBy === "object"
      ? task.assignedBy
      : null;

  return (
    <View style={styles.taskCard}>
      {/* TASK HEADER */}

      <View style={styles.taskHeader}>
        <View style={styles.taskIconBox}>
          <Text style={styles.taskIcon}>
            📋
          </Text>
        </View>

        <View style={styles.taskTitleBox}>
          <Text
            style={styles.taskTitle}
            numberOfLines={2}
          >
            {task.title ||
              "Untitled Task"}
          </Text>

          <Text
            style={styles.taskProject}
            numberOfLines={1}
          >
            📁{" "}
            {project?.name ||
              task.projectName ||
              "Project"}
          </Text>
        </View>

        <View
          style={[
            styles.taskStatusBadge,
            {
              backgroundColor:
                `${statusColor}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.taskStatusText,
              {
                color: statusColor,
              },
            ]}
          >
            {status.replace("_", " ")}
          </Text>
        </View>
      </View>

      {/* ASSIGNED PEOPLE */}

      <View style={styles.taskPeopleBox}>
        <View style={styles.taskPerson}>
          <Text style={styles.taskPersonIcon}>
            👷
          </Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.taskPersonLabel}>
              Performing
            </Text>

            <Text
              style={styles.taskPersonName}
              numberOfLines={1}
            >
              {assignedTo?.name ||
                task.workerName ||
                task.assignedWorker ||
                "Not assigned"}
            </Text>
          </View>
        </View>

        <View style={styles.taskPersonDivider} />

        <View style={styles.taskPerson}>
          <Text style={styles.taskPersonIcon}>
            👨‍💼
          </Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.taskPersonLabel}>
              Assigned by
            </Text>

            <Text
              style={styles.taskPersonName}
              numberOfLines={1}
            >
              {assignedBy?.name ||
                task.officerName ||
                task.assignedOfficer ||
                "Not assigned"}
            </Text>
          </View>
        </View>
      </View>

      {/* TASK INFO */}

      <View style={styles.taskInfoGrid}>
        <TaskInfo
          label="Survey"
          value={
            task.surveyType ||
            "MONITORING"
          }
        />

        <TaskInfo
          label="Priority"
          value={priority}
          valueColor={priorityColor}
        />

        <TaskInfo
          label="Deadline"
          value={formatDate(
            task.deadline
          )}
        />

        <TaskInfo
          label="Completed"
          value={
            task.completedAt
              ? formatDateTime(
                  task.completedAt
                )
              : "—"
          }
        />
      </View>

      {/* DESCRIPTION */}

      {task.description ? (
        <View style={styles.taskDescriptionBox}>
          <Text style={styles.taskDescription}>
            {task.description}
          </Text>
        </View>
      ) : null}

      {/* SURVEY */}

      {task.surveyId ? (
        <View style={styles.taskSurveyBox}>
          <Text style={styles.taskSurveyIcon}>
            ✓
          </Text>

          <Text style={styles.taskSurveyText}>
            Survey submitted for this task
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================
// TASK INFO
// ============================================================

function TaskInfo({
  label,
  value,
  valueColor,
}) {
  return (
    <View style={styles.taskInfo}>
      <Text style={styles.taskInfoLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.taskInfoValue,
          valueColor && {
            color: valueColor,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// MINI TASK STAT
// ============================================================

function MiniTaskStat({
  label,
  value,
  color,
}) {
  return (
    <View style={styles.miniTaskStat}>
      <Text
        style={[
          styles.miniTaskValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text style={styles.miniTaskLabel}>
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  icon,
  title,
  message,
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>
        {icon}
      </Text>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyMessage}>
        {message}
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7F5",
  },

  container: {
    flex: 1,
    backgroundColor: "#F4F7F5",
  },

  content: {
    paddingBottom: 45,
  },

  // ========================================================
  // LOADING
  // ========================================================

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F7F5",
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  loadingSubtitle: {
    marginTop: 5,
    fontSize: 12,
    color: "#777",
  },

  // ========================================================
  // HEADER
  // ========================================================

  header: {
    backgroundColor: "#176B3A",
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  headerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerIcon: {
    fontSize: 25,
  },

  headerTextBox: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#D7F0DF",
    fontSize: 12,
    marginTop: 3,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshIcon: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
  },

  // ========================================================
  // SUMMARY
  // ========================================================

  summaryGrid: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7ECE9",
  },

  summaryCardDanger: {
    borderColor: "#FECACA",
    backgroundColor: "#FFF8F8",
  },

  summaryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF7F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  summaryIcon: {
    fontSize: 17,
  },

  summaryValue: {
    fontSize: 25,
    fontWeight: "900",
    color: "#176B3A",
  },

  summaryDangerValue: {
    color: "#C62828",
  },

  summarySuffix: {
    fontSize: 11,
    color: "#777",
    fontWeight: "600",
  },

  summaryTitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#777",
    fontWeight: "600",
  },

  // ========================================================
  // SECTION
  // ========================================================

  sectionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E7ECE9",
  },

  sectionHeader: {
    marginBottom: 13,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#222",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#888",
  },

  countBadge: {
    minWidth: 55,
    alignItems: "center",
    backgroundColor: "#EEF7F1",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  countBadgeText: {
    color: "#176B3A",
    fontSize: 15,
    fontWeight: "900",
  },

  countBadgeLabel: {
    color: "#66806F",
    fontSize: 8,
    fontWeight: "700",
  },

  // ========================================================
  // STATUS
  // ========================================================

  statusProgress: {
    marginBottom: 13,
  },

  statusProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  statusLabel: {
    fontSize: 13,
    color: "#555",
  },

  statusValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#333",
  },

  progressTrack: {
    height: 8,
    backgroundColor: "#E8ECEA",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
  },

  // ========================================================
  // SEARCH
  // ========================================================

  searchBox: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F5F7F6",
    borderWidth: 1,
    borderColor: "#E1E7E3",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#222",
  },

  clearSearch: {
    fontSize: 16,
    color: "#777",
    padding: 4,
  },

  filterScroll: {
    marginTop: 10,
    marginBottom: 12,
  },

  filterChip: {
    borderWidth: 1,
    borderColor: "#D9E1DC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 7,
  },

  filterChipActive: {
    backgroundColor: "#176B3A",
    borderColor: "#176B3A",
  },

  filterChipText: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // ========================================================
  // PROJECT CARD
  // ========================================================

  projectCard: {
    backgroundColor: "#FAFCFB",
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E3EAE5",
  },

  projectHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  projectTitleBox: {
    flex: 1,
    paddingRight: 10,
  },

  projectName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#222",
  },

  projectLocation: {
    marginTop: 4,
    fontSize: 11,
    color: "#777",
  },

  scoreBox: {
    minWidth: 61,
    borderRadius: 11,
    paddingVertical: 7,
    paddingHorizontal: 7,
    alignItems: "center",
  },

  scoreValue: {
    fontSize: 17,
    fontWeight: "900",
  },

  scoreOutOf: {
    fontSize: 9,
    fontWeight: "700",
  },

  projectMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 13,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  statusPillText: {
    fontSize: 9,
    fontWeight: "900",
  },

  surveyType: {
    marginLeft: 8,
    fontSize: 9,
    color: "#777",
    backgroundColor: "#F0F2F1",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    fontWeight: "700",
  },

  expandIcon: {
    marginLeft: "auto",
    fontSize: 18,
    color: "#176B3A",
    fontWeight: "900",
  },

  // ========================================================
  // INDICATORS
  // ========================================================

  indicatorsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#EAEFED",
    paddingTop: 12,
  },

  indicatorRow: {
    marginBottom: 11,
  },

  indicatorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },

  indicatorLabel: {
    fontSize: 11,
    color: "#555",
  },

  indicatorValue: {
    fontSize: 11,
    fontWeight: "900",
    color: "#176B3A",
  },

  indicatorTrack: {
    height: 6,
    borderRadius: 10,
    backgroundColor: "#E2E7E4",
    overflow: "hidden",
  },

  indicatorFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#176B3A",
  },

  // ========================================================
  // EXPANDED PROJECT
  // ========================================================

  expandedArea: {
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#E5EAE7",
    paddingTop: 13,
  },

  detailsTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#333",
    marginBottom: 8,
  },

  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },

  assignmentLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  assignmentIcon: {
    fontSize: 15,
    width: 27,
  },

  assignmentLabel: {
    fontSize: 11,
    color: "#777",
  },

  assignmentValue: {
    maxWidth: "58%",
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
  },

  viewProjectButton: {
    marginTop: 10,
    backgroundColor: "#176B3A",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  viewProjectButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  viewProjectArrow: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  // ========================================================
  // TASK SUMMARY
  // ========================================================

  taskSummaryGrid: {
    flexDirection: "row",
    marginBottom: 13,
    borderRadius: 12,
    backgroundColor: "#F6F8F7",
    paddingVertical: 10,
  },

  miniTaskStat: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#E0E5E2",
  },

  miniTaskValue: {
    fontSize: 17,
    fontWeight: "900",
  },

  miniTaskLabel: {
    marginTop: 2,
    fontSize: 9,
    color: "#777",
    fontWeight: "600",
  },

  // ========================================================
  // TASK CARD
  // ========================================================

  taskCard: {
    backgroundColor: "#FAFCFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3EAE5",
    padding: 13,
    marginBottom: 11,
  },

  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  taskIconBox: {
    width: 37,
    height: 37,
    borderRadius: 10,
    backgroundColor: "#EEF7F1",
    alignItems: "center",
    justifyContent: "center",
  },

  taskIcon: {
    fontSize: 18,
  },

  taskTitleBox: {
    flex: 1,
    marginLeft: 9,
    paddingRight: 6,
  },

  taskTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#222",
  },

  taskProject: {
    marginTop: 3,
    fontSize: 10,
    color: "#777",
  },

  taskStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
  },

  taskStatusText: {
    fontSize: 8,
    fontWeight: "900",
  },

  // ========================================================
  // TASK PEOPLE
  // ========================================================

  taskPeopleBox: {
    flexDirection: "row",
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E8ECEA",
  },

  taskPerson: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  taskPersonIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  taskPersonLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase",
    fontWeight: "800",
  },

  taskPersonName: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
  },

  taskPersonDivider: {
    width: 1,
    backgroundColor: "#E1E5E2",
    marginHorizontal: 8,
  },

  // ========================================================
  // TASK INFO
  // ========================================================

  taskInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 9,
  },

  taskInfo: {
    width: "50%",
    paddingVertical: 5,
  },

  taskInfoLabel: {
    fontSize: 9,
    color: "#888",
  },

  taskInfoValue: {
    marginTop: 2,
    fontSize: 10,
    color: "#333",
    fontWeight: "800",
  },

  taskDescriptionBox: {
    marginTop: 7,
    backgroundColor: "#F4F6F5",
    borderRadius: 8,
    padding: 9,
  },

  taskDescription: {
    fontSize: 10,
    color: "#666",
    lineHeight: 15,
  },

  taskSurveyBox: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 8,
    borderRadius: 8,
  },

  taskSurveyIcon: {
    color: "#2E7D32",
    fontWeight: "900",
    marginRight: 6,
  },

  taskSurveyText: {
    fontSize: 10,
    color: "#2E7D32",
    fontWeight: "700",
  },

  // ========================================================
  // ATTENTION
  // ========================================================

  attentionCard: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
  },

  attentionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  attentionIcon: {
    fontSize: 21,
  },

  attentionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#991B1B",
  },

  attentionText: {
    marginTop: 3,
    fontSize: 11,
    color: "#7F1D1D",
  },

  // ========================================================
  // ABOUT
  // ========================================================

  aboutCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E7ECE9",
  },

  aboutTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#333",
    marginBottom: 8,
  },

  aboutText: {
    fontSize: 11,
    color: "#666",
    lineHeight: 17,
    marginBottom: 7,
  },

  // ========================================================
  // EMPTY
  // ========================================================

  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 15,
  },

  emptyIcon: {
    fontSize: 35,
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#444",
  },

  emptyMessage: {
    marginTop: 4,
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    lineHeight: 17,
  },
});