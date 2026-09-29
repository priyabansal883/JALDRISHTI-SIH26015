import React from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";

export default function AdminTaskDetailsScreen({
  route,
  navigation,
}) {
  const { task } = route.params || {};

  // ============================================================
  // SAFETY CHECK
  // ============================================================

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>

        <Text style={styles.errorTitle}>
          Task information not found
        </Text>

        <Text style={styles.errorText}>
          The selected task could not be loaded.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  const getStatusColor = (status) => {
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

  const getPriorityColor = (priority) => {
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

  const getSurveyIcon = (type) => {
    switch (type) {
      case "BEFORE":
        return "🟡";

      case "AFTER":
        return "🟢";

      case "MONITORING":
        return "🔵";

      default:
        return "📋";
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
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

  const formatDateTime = (date) => {
    if (!date) {
      return "Not available";
    }

    try {
      return new Date(date).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "Invalid date";
    }
  };

  // ============================================================
  // DATA
  // ============================================================

  const project = task.projectId || {};
  const worker = task.assignedTo || {};
  const officer = task.assignedBy || {};
  const survey = task.surveyId || null;

  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);

  // ============================================================
  // UI
  // ============================================================

  return (
    <View style={styles.container}>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <View style={styles.header}>

        <View style={styles.headerTop}>

          <TouchableOpacity
            style={styles.backCircle}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              Task Details
            </Text>

            <Text style={styles.headerSubtitle}>
              Admin Monitoring
            </Text>
          </View>

        </View>

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* ================================================== */}
        {/* TASK HEADER CARD */}
        {/* ================================================== */}

        <View style={styles.mainCard}>

          <View style={styles.taskTypeRow}>

            <View style={styles.surveyTypeBox}>

              <Text style={styles.surveyIcon}>
                {getSurveyIcon(task.surveyType)}
              </Text>

              <Text style={styles.surveyTypeText}>
                {task.surveyType || "MONITORING"}
              </Text>

            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusColor,
                },
              ]}
            >
              <Text style={styles.statusText}>
                {task.status || "PENDING"}
              </Text>
            </View>

          </View>

          <Text style={styles.taskTitle}>
            {task.title || "Untitled Task"}
          </Text>

          {task.description ? (
            <Text style={styles.description}>
              {task.description}
            </Text>
          ) : (
            <Text style={styles.noDescription}>
              No task description provided.
            </Text>
          )}

          {/* PRIORITY */}

          <View style={styles.priorityRow}>

            <Text style={styles.priorityLabel}>
              Priority
            </Text>

            <Text
              style={[
                styles.priorityValue,
                {
                  color: priorityColor,
                },
              ]}
            >
              {task.priority || "MEDIUM"}
            </Text>

          </View>

        </View>

        {/* ================================================== */}
        {/* WHO IS PERFORMING */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            👷 Field Worker Performing Task
          </Text>

          <View style={styles.personBox}>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(worker.name || "W")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.personInfo}>

              <Text style={styles.personName}>
                {worker.name || "Unknown Worker"}
              </Text>

              <Text style={styles.personEmail}>
                {worker.email || "Email not available"}
              </Text>

              <Text style={styles.personRole}>
                {worker.role || "field_worker"}
              </Text>

              {worker.district ? (
                <Text style={styles.personDistrict}>
                  📍 {worker.district}
                </Text>
              ) : null}

            </View>

          </View>

        </View>

        {/* ================================================== */}
        {/* ASSIGNED BY */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            👨‍💼 Assigned By
          </Text>

          <View style={styles.personBox}>

            <View
              style={[
                styles.avatar,
                styles.officerAvatar,
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  styles.officerAvatarText,
                ]}
              >
                {(officer.name || "O")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.personInfo}>

              <Text style={styles.personName}>
                {officer.name || "Unknown Officer"}
              </Text>

              <Text style={styles.personEmail}>
                {officer.email || "Email not available"}
              </Text>

              <Text style={styles.personRole}>
                {officer.role || "officer"}
              </Text>

              {officer.district ? (
                <Text style={styles.personDistrict}>
                  📍 {officer.district}
                </Text>
              ) : null}

            </View>

          </View>

        </View>

        {/* ================================================== */}
        {/* PROJECT */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            📁 Watershed Project
          </Text>

          <View style={styles.projectBox}>

            <View style={styles.projectIconBox}>
              <Text style={styles.projectIcon}>
                💧
              </Text>
            </View>

            <View style={styles.projectInfo}>

              <Text style={styles.projectName}>
                {project.name || "Project name unavailable"}
              </Text>

              {project.village ? (
                <Text style={styles.projectDetail}>
                  🏘️ Village: {project.village}
                </Text>
              ) : null}

              {project.district ? (
                <Text style={styles.projectDetail}>
                  📍 District: {project.district}
                </Text>
              ) : null}

              {project.state ? (
                <Text style={styles.projectDetail}>
                  🗺️ State: {project.state}
                </Text>
              ) : null}

            </View>

          </View>

        </View>

        {/* ================================================== */}
        {/* TASK TIMELINE */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            🕒 Task Timeline
          </Text>

          <TimelineRow
            icon="📋"
            title="Created"
            date={task.createdAt}
            active={true}
          />

          <TimelineRow
            icon="✅"
            title="Accepted"
            date={task.acceptedAt}
            active={!!task.acceptedAt}
          />

          <TimelineRow
            icon="🔵"
            title="Started"
            date={task.startedAt}
            active={!!task.startedAt}
          />

          <TimelineRow
            icon="🏁"
            title="Completed"
            date={task.completedAt}
            active={!!task.completedAt}
            last
          />

        </View>

        {/* ================================================== */}
        {/* DEADLINE */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            ⏰ Deadline
          </Text>

          <View style={styles.deadlineBox}>

            <Text style={styles.deadlineLabel}>
              Assigned Deadline
            </Text>

            <Text
              style={[
                styles.deadlineValue,
                {
                  color:
                    task.deadline &&
                    new Date(task.deadline) < new Date() &&
                    ![
                      "COMPLETED",
                      "CANCELLED",
                    ].includes(task.status)
                      ? "#DC2626"
                      : "#1E293B",
                },
              ]}
            >
              {formatDate(task.deadline)}
            </Text>

            {task.deadline &&
            new Date(task.deadline) < new Date() &&
            ![
              "COMPLETED",
              "CANCELLED",
            ].includes(task.status) ? (
              <Text style={styles.overdueText}>
                ⚠️ This task is overdue
              </Text>
            ) : null}

          </View>

        </View>

        {/* ================================================== */}
        {/* SURVEY */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            📋 Survey Submission
          </Text>

          {survey ? (
            <View style={styles.surveyBox}>

              <View style={styles.surveyHeader}>

                <Text style={styles.surveyStatus}>
                  ✅ Survey Submitted
                </Text>

                <Text style={styles.surveyType}>
                  {survey.surveyType || task.surveyType}
                </Text>

              </View>

              <InfoRow
                label="Impact Score"
                value={
                  survey.impactScore !== undefined &&
                  survey.impactScore !== null
                    ? `${survey.impactScore}/100`
                    : "Not available"
                }
              />

              <InfoRow
                label="Survey Status"
                value={survey.status || "Not available"}
              />

              <InfoRow
                label="GPS Accuracy"
                value={
                  survey.gpsAccuracy !== undefined &&
                  survey.gpsAccuracy !== null
                    ? `${survey.gpsAccuracy} m`
                    : "Not available"
                }
              />

              <InfoRow
                label="Latitude"
                value={
                  survey.latitude !== undefined &&
                  survey.latitude !== null
                    ? String(survey.latitude)
                    : "Not available"
                }
              />

              <InfoRow
                label="Longitude"
                value={
                  survey.longitude !== undefined &&
                  survey.longitude !== null
                    ? String(survey.longitude)
                    : "Not available"
                }
              />

              <InfoRow
                label="Submitted"
                value={formatDateTime(survey.createdAt)}
                last
              />

            </View>
          ) : (
            <View style={styles.noSurveyBox}>

              <Text style={styles.noSurveyIcon}>
                📭
              </Text>

              <Text style={styles.noSurveyTitle}>
                Survey not submitted
              </Text>

              <Text style={styles.noSurveyText}>
                The field worker has not linked a survey
                to this task yet.
              </Text>

            </View>
          )}

        </View>

        {/* ================================================== */}
        {/* NOTES */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            📝 Task Notes
          </Text>

          <View style={styles.noteBox}>

            <Text style={styles.noteLabel}>
              Officer Notes
            </Text>

            <Text style={styles.noteText}>
              {task.officerNotes?.trim()
                ? task.officerNotes
                : "No officer notes provided."}
            </Text>

          </View>

          <View style={styles.noteBox}>

            <Text style={styles.noteLabel}>
              Worker Notes
            </Text>

            <Text style={styles.noteText}>
              {task.workerNotes?.trim()
                ? task.workerNotes
                : "No worker notes provided."}
            </Text>

          </View>

        </View>

        {/* ================================================== */}
        {/* TASK METADATA */}
        {/* ================================================== */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            ℹ️ Task Information
          </Text>

          <InfoRow
            label="Task ID"
            value={String(task._id || "N/A")}
          />

          <InfoRow
            label="Survey Type"
            value={task.surveyType || "MONITORING"}
          />

          <InfoRow
            label="Status"
            value={task.status || "PENDING"}
          />

          <InfoRow
            label="Priority"
            value={task.priority || "MEDIUM"}
          />

          <InfoRow
            label="Created"
            value={formatDateTime(task.createdAt)}
          />

          <InfoRow
            label="Updated"
            value={formatDateTime(task.updatedAt)}
            last
          />

        </View>

        {/* ================================================== */}
        {/* BOTTOM BUTTON */}
        {/* ================================================== */}

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.bottomButtonText}>
            ← Back to Task Monitoring
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ============================================================
// TIMELINE ROW
// ============================================================

function TimelineRow({
  icon,
  title,
  date,
  active,
  last = false,
}) {
  return (
    <View style={styles.timelineRow}>

      <View style={styles.timelineLeft}>

        <View
          style={[
            styles.timelineCircle,
            active
              ? styles.timelineActive
              : styles.timelineInactive,
          ]}
        >
          <Text style={styles.timelineIcon}>
            {icon}
          </Text>
        </View>

        {!last ? (
          <View
            style={[
              styles.timelineLine,
              active
                ? styles.timelineLineActive
                : styles.timelineLineInactive,
            ]}
          />
        ) : null}

      </View>

      <View style={styles.timelineContent}>

        <Text
          style={[
            styles.timelineTitle,
            !active && styles.timelineTitleInactive,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.timelineDate}>
          {date
            ? new Date(date).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Not yet"}
        </Text>

      </View>

    </View>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoRowBorder,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={styles.infoValue}
        numberOfLines={3}
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
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    backgroundColor: "#F4F6FA",
  },

  errorIcon: {
    fontSize: 42,
  },

  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },

  errorText: {
    marginTop: 6,
    color: "#64748B",
    textAlign: "center",
  },

  backButton: {
    marginTop: 20,
    backgroundColor: "#4A148C",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    backgroundColor: "#4A148C",
    paddingTop: 55,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  backIcon: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "300",
  },

  headerTitleContainer: {
    marginLeft: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#E9D5FF",
    fontSize: 12,
    marginTop: 2,
  },

  // ==========================================================
  // MAIN CARD
  // ==========================================================

  mainCard: {
    backgroundColor: "#FFFFFF",
    margin: 15,
    padding: 17,
    borderRadius: 18,
    elevation: 3,
  },

  taskTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  surveyTypeBox: {
    flexDirection: "row",
    alignItems: "center",
  },

  surveyIcon: {
    fontSize: 17,
  },

  surveyTypeText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "900",
    color: "#64748B",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },

  taskTitle: {
    marginTop: 13,
    fontSize: 21,
    fontWeight: "900",
    color: "#172033",
    lineHeight: 27,
  },

  description: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },

  noDescription: {
    marginTop: 8,
    fontSize: 12,
    fontStyle: "italic",
    color: "#94A3B8",
  },

  priorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 17,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  priorityLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },

  priorityValue: {
    fontSize: 11,
    fontWeight: "900",
  },

  // ==========================================================
  // SECTION
  // ==========================================================

  sectionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginBottom: 13,
    padding: 16,
    borderRadius: 17,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#172033",
    marginBottom: 13,
  },

  // ==========================================================
  // PEOPLE
  // ==========================================================

  personBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 13,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#6B21A8",
    fontSize: 20,
    fontWeight: "900",
  },

  officerAvatar: {
    backgroundColor: "#DBEAFE",
  },

  officerAvatarText: {
    color: "#1D4ED8",
  },

  personInfo: {
    flex: 1,
    marginLeft: 12,
  },

  personName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E293B",
  },

  personEmail: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  personRole: {
    marginTop: 4,
    fontSize: 10,
    color: "#7C3AED",
    fontWeight: "800",
  },

  personDistrict: {
    marginTop: 3,
    fontSize: 10,
    color: "#64748B",
  },

  // ==========================================================
  // PROJECT
  // ==========================================================

  projectBox: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    padding: 13,
    borderRadius: 13,
  },

  projectIconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  projectIcon: {
    fontSize: 23,
  },

  projectInfo: {
    flex: 1,
    marginLeft: 11,
  },

  projectName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#166534",
  },

  projectDetail: {
    marginTop: 4,
    fontSize: 10,
    color: "#4B5563",
  },

  // ==========================================================
  // TIMELINE
  // ==========================================================

  timelineRow: {
    flexDirection: "row",
    minHeight: 65,
  },

  timelineLeft: {
    width: 38,
    alignItems: "center",
  },

  timelineCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  timelineActive: {
    backgroundColor: "#EDE9FE",
  },

  timelineInactive: {
    backgroundColor: "#F1F5F9",
  },

  timelineIcon: {
    fontSize: 14,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },

  timelineLineActive: {
    backgroundColor: "#DDD6FE",
  },

  timelineLineInactive: {
    backgroundColor: "#E2E8F0",
  },

  timelineContent: {
    flex: 1,
    marginLeft: 8,
    paddingBottom: 12,
  },

  timelineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },

  timelineTitleInactive: {
    color: "#94A3B8",
  },

  timelineDate: {
    marginTop: 3,
    fontSize: 10,
    color: "#64748B",
  },

  // ==========================================================
  // DEADLINE
  // ==========================================================

  deadlineBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
  },

  deadlineLabel: {
    fontSize: 10,
    color: "#64748B",
  },

  deadlineValue: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: "900",
  },

  overdueText: {
    marginTop: 5,
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "800",
  },

  // ==========================================================
  // SURVEY
  // ==========================================================

  surveyBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 13,
    padding: 13,
  },

  surveyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },

  surveyStatus: {
    fontSize: 13,
    fontWeight: "900",
    color: "#166534",
  },

  surveyType: {
    fontSize: 10,
    fontWeight: "900",
    color: "#15803D",
  },

  noSurveyBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    padding: 22,
  },

  noSurveyIcon: {
    fontSize: 30,
  },

  noSurveyTitle: {
    marginTop: 7,
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
  },

  noSurveyText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    color: "#94A3B8",
  },

  // ==========================================================
  // INFO
  // ==========================================================

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  infoLabel: {
    width: "40%",
    fontSize: 11,
    color: "#64748B",
  },

  infoValue: {
    width: "58%",
    textAlign: "right",
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },

  // ==========================================================
  // NOTES
  // ==========================================================

  noteBox: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 11,
    marginBottom: 9,
  },

  noteLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#7C3AED",
    marginBottom: 5,
  },

  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },

  // ==========================================================
  // BOTTOM
  // ==========================================================

  bottomButton: {
    marginHorizontal: 15,
    marginTop: 3,
    marginBottom: 20,
    backgroundColor: "#4A148C",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  bottomButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});