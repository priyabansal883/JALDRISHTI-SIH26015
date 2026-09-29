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
  Alert,
  RefreshControl,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import api from "../services/api";


// ============================================================
// TASK DETAILS SCREEN
// ============================================================

export default function TaskDetailsScreen({
  route,
  navigation,
}) {

  const initialTask =
    route?.params?.task || null;

  const initialProject =
    route?.params?.project ||
    initialTask?.projectId ||
    initialTask?.project ||
    null;


  const [task, setTask] =
    useState(initialTask);

  const [project, setProject] =
    useState(initialProject);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");


  // ==========================================================
  // TASK ID
  // ==========================================================

  const taskId =
    task?._id ||
    task?.id ||
    null;


  // ==========================================================
  // LOAD TASK
  // ==========================================================

  const loadTask = useCallback(
    async (showLoader = true) => {

      if (!taskId) {

        setError(
          "Task information is missing."
        );

        setLoading(false);

        return;
      }

      try {

        setError("");

        if (showLoader) {
          setLoading(true);
        }

        console.log(
          "Loading task:",
          taskId
        );

        const response =
          await api.get(
            `/tasks/${taskId}`
          );

        console.log(
          "TASK DETAILS RESPONSE:",
          response?.data
        );


        const data =
          response?.data || {};


        const fetchedTask =
          data?.task ||
          data?.data ||
          data;


        if (
          fetchedTask &&
          typeof fetchedTask === "object"
        ) {

          setTask(fetchedTask);


          const fetchedProject =
            fetchedTask?.projectId &&
            typeof fetchedTask.projectId ===
              "object"
              ? fetchedTask.projectId
              : fetchedTask?.project ||
                initialProject ||
                null;


          setProject(
            fetchedProject
          );
        }

      } catch (err) {

        console.log(
          "TASK DETAILS ERROR:",
          err?.response?.data ||
            err?.message
        );


        /*
         * If the task was already passed
         * from FieldWorkerDashboard, keep
         * displaying it instead of showing
         * an empty screen.
         */

        if (!initialTask) {

          setError(
            err?.response?.data?.message ||
              "Unable to load task details."
          );
        }

      } finally {

        setLoading(false);
        setRefreshing(false);
      }

    },
    [
      taskId,
      initialTask,
      initialProject,
    ]
  );


  // ==========================================================
  // REFRESH WHEN SCREEN OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadTask();

    }, [loadTask])
  );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh = async () => {

    setRefreshing(true);

    await loadTask(false);
  };


  // ==========================================================
  // GENERIC TASK ACTION
  // ==========================================================

  const performTaskAction = async (
    action,
    successMessage
  ) => {

    if (!taskId) {

      Alert.alert(
        "Task Error",
        "Task ID is missing."
      );

      return;
    }


    try {

      setActionLoading(true);


      console.log(
        `TASK ACTION: ${action}`,
        taskId
      );


      const response =
        await api.patch(
          `/tasks/${taskId}/${action}`
        );


      console.log(
        `${action} RESPONSE:`,
        response?.data
      );


      const responseData =
        response?.data || {};


      const updatedTask =
        responseData?.task ||
        responseData?.data ||
        responseData;


      if (
        updatedTask &&
        typeof updatedTask === "object" &&
        (
          updatedTask._id ||
          updatedTask.id ||
          updatedTask.status
        )
      ) {

        setTask(
          updatedTask
        );


        const updatedProject =
          updatedTask?.projectId &&
          typeof updatedTask.projectId ===
            "object"
            ? updatedTask.projectId
            : updatedTask?.project ||
              project ||
              null;


        setProject(
          updatedProject
        );

      } else {

        await loadTask(false);
      }


      Alert.alert(
        "Success",
        successMessage
      );

    } catch (err) {

      console.log(
        `TASK ${action.toUpperCase()} ERROR:`,
        err?.response?.data ||
          err?.message
      );


      Alert.alert(
        "Action Failed",
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          `Unable to ${action} task.`
      );

    } finally {

      setActionLoading(false);
    }
  };


  // ==========================================================
  // ACCEPT TASK
  // ==========================================================

  const acceptTask = () => {

    Alert.alert(
      "Accept Task",
      "Are you sure you want to accept this task?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: () =>
            performTaskAction(
              "accept",
              "Task accepted successfully."
            ),
        },
      ]
    );
  };


  // ==========================================================
  // REJECT TASK
  // ==========================================================

  const rejectTask = () => {

    Alert.alert(
      "Reject Task",
      "Are you sure you want to reject this task?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: () =>
            performTaskAction(
              "reject",
              "Task rejected successfully."
            ),
        },
      ]
    );
  };


  // ==========================================================
  // START TASK
  // ==========================================================

  const startTask = () => {

    Alert.alert(
      "Start Task",
      "Start working on this task now?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Start",
          onPress: () =>
            performTaskAction(
              "start",
              "Task started successfully."
            ),
        },
      ]
    );
  };


  // ==========================================================
  // NAVIGATE TO SURVEY
  // ==========================================================

  const openSurvey = () => {

    if (!taskId) {

      Alert.alert(
        "Task Error",
        "Task information is missing."
      );

      return;
    }


    const surveyProject =
      project ||
      (
        task?.projectId &&
        typeof task.projectId === "object"
          ? task.projectId
          : null
      ) ||
      task?.project ||
      null;


    console.log(
      "OPENING SURVEY",
      {
        project:
          surveyProject,
        task,
        surveyType:
          task?.surveyType,
      }
    );


    navigation.navigate(
      "Survey",
      {
        project:
          surveyProject,

        task,

        surveyType:
          task?.surveyType ||
          "MONITORING",
      }
    );
  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    !refreshing
  ) {

    return (
      <View style={styles.center}>

        <ActivityIndicator
          size="large"
          color="#166534"
        />

        <Text
          style={styles.loadingText}
        >
          Loading Task Details...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    !task
  ) {

    return (
      <View style={styles.center}>

        <Text
          style={styles.errorIcon}
        >
          ⚠️
        </Text>

        <Text
          style={styles.errorTitle}
        >
          Unable to Load Task
        </Text>

        <Text
          style={styles.errorText}
        >
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() =>
            loadTask()
          }
        >

          <Text
            style={styles.retryText}
          >
            Retry
          </Text>

        </TouchableOpacity>

      </View>
    );
  }


  // ==========================================================
  // TASK DATA
  // ==========================================================

  const status =
    normalizeStatus(
      task?.status
    );


  const surveyType =
    String(
      task?.surveyType ||
        "MONITORING"
    ).toUpperCase();


  const priority =
    String(
      task?.priority ||
        "MEDIUM"
    ).toUpperCase();


  const deadlineInfo =
    getDeadlineInfo(
      task?.deadline
    );


  const projectName =
    project?.name ||
    project?.projectName ||
    task?.projectId?.name ||
    task?.project?.name ||
    "Watershed Project";


  const projectLocation =
    getProjectLocation(
      project ||
        task?.projectId ||
        task?.project
    );


  const description =
    task?.description ||
    task?.instructions ||
    task?.workerNotes ||
    "Complete the assigned field survey and submit accurate watershed monitoring data.";


  // ==========================================================
  // STATUS
  // ==========================================================

  const statusStyle =
    getTaskStatusStyle(
      status
    );


  // ==========================================================
  // DEADLINE STYLE
  // ==========================================================

  const deadlineStyle =
    getDeadlineStyle(
      deadlineInfo
    );


  // ==========================================================
  // DETERMINE AVAILABLE ACTIONS
  // ==========================================================

  const canAccept =
    status === "PENDING" ||
    status === "ASSIGNED";


  const canReject =
    status === "PENDING" ||
    status === "ASSIGNED";


  const canStart =
    status === "ACCEPTED";


  const canContinue =
    status === "IN_PROGRESS";


  const isCompleted =
    status === "COMPLETED";


  const isRejected =
    status === "REJECTED";


  // ==========================================================
  // SCREEN
  // ==========================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={
            onRefresh
          }
        />
      }
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View
        style={styles.header}
      >

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >

          <Text
            style={styles.backText}
          >
            ←
          </Text>

        </TouchableOpacity>


        <View
          style={styles.headerInfo}
        >

          <Text
            style={styles.headerTitle}
          >
            Task Details
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            Assigned Field Work
          </Text>

        </View>

      </View>


      {/* ====================================================
          DEADLINE ALERT
      ==================================================== */}

      {deadlineInfo.hasDeadline ? (

        <View
          style={[
            styles.deadlineCard,
            {
              backgroundColor:
                deadlineStyle.backgroundColor,
              borderColor:
                deadlineStyle.borderColor,
            },
          ]}
        >

          <View
            style={styles.deadlineIconBox}
          >

            <Text
              style={styles.deadlineIcon}
            >
              {deadlineInfo.isOverdue
                ? "🚨"
                : deadlineInfo.isToday
                ? "⏰"
                : "📅"}
            </Text>

          </View>


          <View
            style={styles.deadlineContent}
          >

            <Text
              style={[
                styles.deadlineLabel,
                {
                  color:
                    deadlineStyle.color,
                },
              ]}
            >
              {deadlineInfo.isOverdue
                ? "DEADLINE OVERDUE"
                : deadlineInfo.isToday
                ? "DEADLINE TODAY"
                : "TASK DEADLINE"}
            </Text>


            <Text
              style={[
                styles.deadlineDate,
                {
                  color:
                    deadlineStyle.color,
                },
              ]}
            >
              {deadlineInfo.formattedDate}
            </Text>


            <Text
              style={[
                styles.deadlineRelative,
                {
                  color:
                    deadlineStyle.color,
                },
              ]}
            >
              {deadlineInfo.relativeText}
            </Text>

          </View>

        </View>

      ) : (

        <View
          style={styles.noDeadlineCard}
        >

          <Text
            style={styles.noDeadlineIcon}
          >
            📅
          </Text>

          <View
            style={styles.noDeadlineContent}
          >

            <Text
              style={styles.noDeadlineTitle}
            >
              No Deadline Set
            </Text>

            <Text
              style={styles.noDeadlineText}
            >
              No deadline has been assigned
              to this task.
            </Text>

          </View>

        </View>

      )}


      {/* ====================================================
          TASK TITLE
      ==================================================== */}

      <View
        style={styles.titleCard}
      >

        <Text
          style={styles.taskTitle}
        >
          {task?.title ||
            "Field Survey Task"}
        </Text>


        <View
          style={styles.badgesRow}
        >

          {/* STATUS */}

          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  statusStyle.backgroundColor,
              },
            ]}
          >

            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    statusStyle.color,
                },
              ]}
            >
              {formatStatus(status)}
            </Text>

          </View>


          {/* PRIORITY */}

          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  getPriorityStyle(
                    priority
                  ).backgroundColor,
              },
            ]}
          >

            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    getPriorityStyle(
                      priority
                    ).color,
                },
              ]}
            >
              {priority} PRIORITY
            </Text>

          </View>

        </View>

      </View>


      {/* ====================================================
          PROJECT
      ==================================================== */}

      <View
        style={styles.card}
      >

        <Text
          style={styles.cardTitle}
        >
          📁 Project
        </Text>


        <Text
          style={styles.projectName}
        >
          {projectName}
        </Text>


        <Text
          style={styles.projectLocation}
        >
          📍 {projectLocation}
        </Text>

      </View>


      {/* ====================================================
          SURVEY TYPE
      ==================================================== */}

      <View
        style={[
          styles.surveyTypeCard,
          getSurveyTypeStyle(
            surveyType
          ),
        ]}
      >

        <Text
          style={styles.surveyTypeLabel}
        >
          Required Survey
        </Text>


        <Text
          style={styles.surveyTypeValue}
        >
          {surveyType}
        </Text>


        <Text
          style={styles.surveyTypeDescription}
        >
          {getSurveyTypeDescription(
            surveyType
          )}
        </Text>

      </View>


      {/* ====================================================
          DESCRIPTION / INSTRUCTIONS
      ==================================================== */}

      <View
        style={styles.card}
      >

        <Text
          style={styles.cardTitle}
        >
          📝 Instructions
        </Text>


        <Text
          style={styles.description}
        >
          {description}
        </Text>

      </View>


      {/* ====================================================
          TASK INFORMATION
      ==================================================== */}

      <View
        style={styles.card}
      >

        <Text
          style={styles.cardTitle}
        >
          ℹ️ Task Information
        </Text>


        <InfoRow
          label="Task ID"
          value={
            task?._id ||
            task?.id ||
            "Unavailable"
          }
        />


        <InfoRow
          label="Survey Type"
          value={
            surveyType
          }
        />


        <InfoRow
          label="Priority"
          value={
            priority
          }
        />


        <InfoRow
          label="Status"
          value={
            formatStatus(
              status
            )
          }
        />


        <InfoRow
          label="Deadline"
          value={
            deadlineInfo.hasDeadline
              ? deadlineInfo.formattedDate
              : "Not assigned"
          }
          danger={
            deadlineInfo.isOverdue
          }
        />

      </View>


      {/* ====================================================
          DEADLINE WARNING
      ==================================================== */}

      {deadlineInfo.hasDeadline &&
      !isCompleted ? (

        <View
          style={[
            styles.warningCard,
            deadlineInfo.isOverdue &&
              styles.overdueWarning,
          ]}
        >

          <Text
            style={styles.warningIcon}
          >
            {deadlineInfo.isOverdue
              ? "🚨"
              : deadlineInfo.isToday
              ? "⚠️"
              : "⏱️"}
          </Text>


          <View
            style={styles.warningContent}
          >

            <Text
              style={styles.warningTitle}
            >
              {deadlineInfo.isOverdue
                ? "This task is overdue"
                : deadlineInfo.isToday
                ? "Complete this task today"
                : "Keep the deadline in mind"}
            </Text>


            <Text
              style={styles.warningText}
            >
              {deadlineInfo.isOverdue
                ? "Please complete the assigned survey as soon as possible."
                : deadlineInfo.isToday
                ? "The assigned deadline is today. Complete and submit the field survey before the day ends."
                : `You have ${deadlineInfo.relativeText.toLowerCase()} to complete this task.`}
            </Text>

          </View>

        </View>

      ) : null}


      {/* ====================================================
          COMPLETED
      ==================================================== */}

      {isCompleted ? (

        <View
          style={styles.completedCard}
        >

          <Text
            style={styles.completedIcon}
          >
            ✅
          </Text>


          <Text
            style={styles.completedTitle}
          >
            Task Completed
          </Text>


          <Text
            style={styles.completedText}
          >
            This field task has been
            completed successfully.
          </Text>


          {task?.completedAt ? (

            <Text
              style={styles.completedDate}
            >
              Completed:{" "}
              {formatDateTime(
                task.completedAt
              )}
            </Text>

          ) : null}

        </View>

      ) : null}


      {/* ====================================================
          REJECTED
      ==================================================== */}

      {isRejected ? (

        <View
          style={styles.rejectedCard}
        >

          <Text
            style={styles.rejectedIcon}
          >
            ❌
          </Text>


          <Text
            style={styles.rejectedTitle}
          >
            Task Rejected
          </Text>


          <Text
            style={styles.rejectedText}
          >
            This task has been rejected
            and cannot be started.
          </Text>

        </View>

      ) : null}


      {/* ====================================================
          ACTIONS
      ==================================================== */}

      {!isCompleted &&
      !isRejected ? (

        <View
          style={styles.actionsCard}
        >

          <Text
            style={styles.actionsTitle}
          >
            Task Actions
          </Text>


          {/* ACCEPT / REJECT */}

          {canAccept ? (

            <>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  actionLoading &&
                    styles.disabledButton,
                ]}
                onPress={
                  acceptTask
                }
                disabled={
                  actionLoading
                }
              >

                {actionLoading ? (

                  <ActivityIndicator
                    color="#FFFFFF"
                  />

                ) : (

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    ✓ Accept Task
                  </Text>

                )}

              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.rejectButton,
                  actionLoading &&
                    styles.disabledButton,
                ]}
                onPress={
                  rejectTask
                }
                disabled={
                  actionLoading
                }
              >

                <Text
                  style={
                    styles.rejectButtonText
                  }
                >
                  ✕ Reject Task
                </Text>

              </TouchableOpacity>

            </>

          ) : null}


          {/* START */}

          {canStart ? (

            <TouchableOpacity
              style={[
                styles.primaryButton,
                actionLoading &&
                  styles.disabledButton,
              ]}
              onPress={
                startTask
              }
              disabled={
                actionLoading
              }
            >

              {actionLoading ? (

                <ActivityIndicator
                  color="#FFFFFF"
                />

              ) : (

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  ▶ Start Task
                </Text>

              )}

            </TouchableOpacity>

          ) : null}


          {/* CONTINUE SURVEY */}

          {canContinue ? (

            <TouchableOpacity
              style={
                styles.surveyButton
              }
              onPress={
                openSurvey
              }
              disabled={
                actionLoading
              }
            >

              <Text
                style={
                  styles.surveyButtonText
                }
              >
                📋 Continue Survey
              </Text>

            </TouchableOpacity>

          ) : null}


          {/* FALLBACK FOR ACCEPTED */}

          {status ===
            "ACCEPTED" ? (

            <Text
              style={
                styles.actionHint
              }
            >
              Start the task to begin
              the field survey.
            </Text>

          ) : null}


          {/* FALLBACK FOR PENDING */}

          {(
            status === "PENDING" ||
            status === "ASSIGNED"
          ) ? (

            <Text
              style={
                styles.actionHint
              }
            >
              Accept this task to
              start working on it.
            </Text>

          ) : null}

        </View>

      ) : null}


      {/* ====================================================
          VIEW SURVEY
      ==================================================== */}

      {isCompleted ? (

        <TouchableOpacity
          style={
            styles.secondaryButton
          }
          onPress={() =>
            navigation.navigate(
              "SurveyHistory"
            )
          }
        >

          <Text
            style={
              styles.secondaryButtonText
            }
          >
            📊 View Survey History
          </Text>

        </TouchableOpacity>

      ) : null}


      {/* ====================================================
          REFRESH TASK
      ==================================================== */}

      <TouchableOpacity
        style={
          styles.refreshButton
        }
        onPress={
          onRefresh
        }
        disabled={
          refreshing ||
          actionLoading
        }
      >

        {refreshing ? (

          <ActivityIndicator
            color="#166534"
          />

        ) : (

          <Text
            style={
              styles.refreshButtonText
            }
          >
            🔄 Refresh Task
          </Text>

        )}

      </TouchableOpacity>


    </ScrollView>
  );
}


// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  label,
  value,
  danger = false,
}) {

  return (
    <View
      style={styles.infoRow}
    >

      <Text
        style={styles.infoLabel}
      >
        {label}
      </Text>


      <Text
        style={[
          styles.infoValue,
          danger &&
            styles.dangerText,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>

    </View>
  );
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function normalizeStatus(
  status
) {

  const value =
    String(
      status ||
        "PENDING"
    )
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");


  if (
    value === "ASSIGNED"
  ) {
    return "ASSIGNED";
  }


  if (
    value === "PENDING"
  ) {
    return "PENDING";
  }


  if (
    value === "ACCEPTED"
  ) {
    return "ACCEPTED";
  }


  if (
    value === "IN_PROGRESS" ||
    value === "INPROGRESS"
  ) {
    return "IN_PROGRESS";
  }


  if (
    value === "COMPLETED" ||
    value === "COMPLETE"
  ) {
    return "COMPLETED";
  }


  if (
    value === "REJECTED" ||
    value === "DECLINED"
  ) {
    return "REJECTED";
  }


  return value;
}


// ============================================================
// FORMAT STATUS
// ============================================================

function formatStatus(
  status
) {

  return String(
    status || ""
  )
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


// ============================================================
// DEADLINE INFORMATION
// ============================================================

function getDeadlineInfo(
  deadline
) {

  if (!deadline) {

    return {
      hasDeadline: false,
      isOverdue: false,
      isToday: false,
      formattedDate:
        "No deadline",
      relativeText:
        "",
    };
  }


  const date =
    new Date(
      deadline
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return {
      hasDeadline: false,
      isOverdue: false,
      isToday: false,
      formattedDate:
        "Invalid deadline",
      relativeText:
        "",
    };
  }


  const now =
    new Date();


  const todayStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  const deadlineStart =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );


  const difference =
    deadlineStart.getTime() -
    todayStart.getTime();


  const daysRemaining =
    Math.round(
      difference /
        (1000 *
          60 *
          60 *
          24)
    );


  const isToday =
    daysRemaining === 0;


  const isOverdue =
    date.getTime() <
      now.getTime();


  let relativeText =
    "";


  if (isOverdue) {

    const overdueDays =
      Math.max(
        1,
        Math.abs(
          daysRemaining
        )
      );


    relativeText =
      overdueDays === 1
        ? "1 day overdue"
        : `${overdueDays} days overdue`;

  } else if (isToday) {

    relativeText =
      "Due today";

  } else if (
    daysRemaining === 1
  ) {

    relativeText =
      "1 day remaining";

  } else {

    relativeText =
      `${daysRemaining} days remaining`;
  }


  return {

    hasDeadline: true,

    isOverdue,

    isToday,

    daysRemaining,

    formattedDate:
      formatDateTime(
        deadline
      ),

    relativeText,

  };
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDateTime(
  value
) {

  if (!value) {
    return "Not available";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Invalid date";
  }


  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


// ============================================================
// TASK STATUS STYLE
// ============================================================

function getTaskStatusStyle(
  status
) {

  switch (
    String(status).toUpperCase()
  ) {

    case "COMPLETED":

      return {
        color: "#166534",
        backgroundColor:
          "#DCFCE7",
      };


    case "IN_PROGRESS":

      return {
        color: "#1D4ED8",
        backgroundColor:
          "#DBEAFE",
      };


    case "ACCEPTED":

      return {
        color: "#0369A1",
        backgroundColor:
          "#E0F2FE",
      };


    case "REJECTED":

      return {
        color: "#991B1B",
        backgroundColor:
          "#FEE2E2",
      };


    case "PENDING":
    case "ASSIGNED":

      return {
        color: "#92400E",
        backgroundColor:
          "#FEF3C7",
      };


    default:

      return {
        color: "#4B5563",
        backgroundColor:
          "#F3F4F6",
      };
  }
}


// ============================================================
// PRIORITY STYLE
// ============================================================

function getPriorityStyle(
  priority
) {

  switch (
    String(priority).toUpperCase()
  ) {

    case "HIGH":

      return {
        color: "#991B1B",
        backgroundColor:
          "#FEE2E2",
      };


    case "URGENT":

      return {
        color: "#7F1D1D",
        backgroundColor:
          "#FECACA",
      };


    case "LOW":

      return {
        color: "#166534",
        backgroundColor:
          "#DCFCE7",
      };


    default:

      return {
        color: "#92400E",
        backgroundColor:
          "#FEF3C7",
      };
  }
}


// ============================================================
// DEADLINE STYLE
// ============================================================

function getDeadlineStyle(
  deadline
) {

  if (
    deadline.isOverdue
  ) {

    return {
      color: "#991B1B",
      backgroundColor:
        "#FEF2F2",
      borderColor:
        "#FCA5A5",
    };
  }


  if (
    deadline.isToday
  ) {

    return {
      color: "#92400E",
      backgroundColor:
        "#FFFBEB",
      borderColor:
        "#FCD34D",
    };
  }


  return {
    color: "#166534",
    backgroundColor:
      "#F0FDF4",
    borderColor:
      "#86EFAC",
  };
}


// ============================================================
// SURVEY TYPE STYLE
// ============================================================

function getSurveyTypeStyle(
  surveyType
) {

  switch (
    String(
      surveyType
    ).toUpperCase()
  ) {

    case "BEFORE":

      return {
        backgroundColor:
          "#FFF7ED",
        borderColor:
          "#FDBA74",
      };


    case "AFTER":

      return {
        backgroundColor:
          "#F0FDF4",
        borderColor:
          "#86EFAC",
      };


    default:

      return {
        backgroundColor:
          "#EFF6FF",
        borderColor:
          "#93C5FD",
      };
  }
}


// ============================================================
// SURVEY TYPE DESCRIPTION
// ============================================================

function getSurveyTypeDescription(
  surveyType
) {

  switch (
    String(
      surveyType
    ).toUpperCase()
  ) {

    case "BEFORE":

      return "Record the baseline condition before watershed intervention.";

    case "AFTER":

      return "Record the condition after watershed intervention.";

    case "MONITORING":

      return "Record the current condition of the watershed project.";

    default:

      return "Complete the assigned watershed field survey.";
  }
}


// ============================================================
// PROJECT LOCATION
// ============================================================

function getProjectLocation(
  project
) {

  if (
    !project
  ) {

    return "Location unavailable";
  }


  if (
    project?.district
  ) {

    return project.district;
  }


  if (
    project?.location?.district
  ) {

    return project.location.district;
  }


  if (
    project?.location?.address
  ) {

    return project.location.address;
  }


  const latitude =
    project?.latitude ??
    project?.location?.latitude;


  const longitude =
    project?.longitude ??
    project?.location?.longitude;


  if (
    latitude !== undefined &&
    longitude !== undefined
  ) {

    return `${Number(
      latitude
    ).toFixed(6)}, ${Number(
      longitude
    ).toFixed(6)}`;
  }


  return "Location unavailable";
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        "#F5F7FA",
    },


    content: {
      padding: 20,
      paddingBottom: 50,
    },


    center: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      padding: 25,
      backgroundColor:
        "#F5F7FA",
    },


    loadingText: {
      marginTop: 12,
      fontSize: 15,
      color: "#6B7280",
    },


    errorIcon: {
      fontSize: 40,
      marginBottom: 10,
    },


    errorTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#991B1B",
    },


    errorText: {
      fontSize: 14,
      color: "#6B7280",
      textAlign:
        "center",
      marginTop: 8,
      lineHeight: 20,
    },


    retryButton: {
      marginTop: 18,
      backgroundColor:
        "#166534",
      paddingHorizontal: 25,
      paddingVertical: 12,
      borderRadius: 10,
    },


    retryText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 14,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
    },


    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#FFFFFF",
      justifyContent:
        "center",
      alignItems:
        "center",
      marginRight: 12,
      elevation: 2,
    },


    backText: {
      fontSize: 27,
      color: "#14532D",
      marginTop: -2,
    },


    headerInfo: {
      flex: 1,
    },


    headerTitle: {
      fontSize: 27,
      fontWeight: "800",
      color: "#14532D",
    },


    headerSubtitle: {
      fontSize: 13,
      color: "#6B7280",
      marginTop: 3,
    },


    // ========================================================
    // DEADLINE
    // ========================================================

    deadlineCard: {
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      alignItems: "center",
    },


    deadlineIconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        "rgba(255,255,255,0.75)",
      justifyContent:
        "center",
      alignItems:
        "center",
      marginRight: 13,
    },


    deadlineIcon: {
      fontSize: 24,
    },


    deadlineContent: {
      flex: 1,
    },


    deadlineLabel: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.5,
    },


    deadlineDate: {
      fontSize: 18,
      fontWeight: "900",
      marginTop: 3,
    },


    deadlineRelative: {
      fontSize: 12,
      fontWeight: "700",
      marginTop: 3,
    },


    noDeadlineCard: {
      flexDirection: "row",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
    },


    noDeadlineIcon: {
      fontSize: 28,
      marginRight: 13,
    },


    noDeadlineContent: {
      flex: 1,
    },


    noDeadlineTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#374151",
    },


    noDeadlineText: {
      fontSize: 12,
      color: "#6B7280",
      marginTop: 3,
    },


    // ========================================================
    // TITLE
    // ========================================================

    titleCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      elevation: 2,
    },


    taskTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: "#1F2937",
      lineHeight: 29,
    },


    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 12,
    },


    badge: {
      borderRadius: 20,
      paddingHorizontal: 11,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 5,
    },


    badgeText: {
      fontSize: 10,
      fontWeight: "900",
    },


    // ========================================================
    // GENERAL CARD
    // ========================================================

    card: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 17,
      marginBottom: 14,
      elevation: 1,
    },


    cardTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#374151",
      marginBottom: 10,
    },


    projectName: {
      fontSize: 19,
      fontWeight: "900",
      color: "#14532D",
    },


    projectLocation: {
      fontSize: 13,
      color: "#6B7280",
      marginTop: 7,
    },


    description: {
      fontSize: 14,
      color: "#4B5563",
      lineHeight: 21,
    },


    // ========================================================
    // SURVEY TYPE
    // ========================================================

    surveyTypeCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 17,
      marginBottom: 14,
    },


    surveyTypeLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#6B7280",
      textTransform:
        "uppercase",
    },


    surveyTypeValue: {
      fontSize: 24,
      fontWeight: "900",
      color: "#1F2937",
      marginTop: 4,
    },


    surveyTypeDescription: {
      fontSize: 13,
      color: "#4B5563",
      lineHeight: 19,
      marginTop: 5,
    },


    // ========================================================
    // INFO
    // ========================================================

    infoRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F3F4F6",
    },


    infoLabel: {
      fontSize: 13,
      color: "#6B7280",
      fontWeight: "600",
      flex: 0.45,
    },


    infoValue: {
      fontSize: 13,
      color: "#1F2937",
      fontWeight: "800",
      textAlign: "right",
      flex: 0.55,
    },


    dangerText: {
      color: "#B91C1C",
    },


    // ========================================================
    // WARNING
    // ========================================================

    warningCard: {
      flexDirection: "row",
      backgroundColor:
        "#FFFBEB",
      borderWidth: 1,
      borderColor:
        "#FCD34D",
      borderRadius: 14,
      padding: 15,
      marginBottom: 15,
    },


    overdueWarning: {
      backgroundColor:
        "#FEF2F2",
      borderColor:
        "#FCA5A5",
    },


    warningIcon: {
      fontSize: 25,
      marginRight: 12,
    },


    warningContent: {
      flex: 1,
    },


    warningTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: "#92400E",
    },


    warningText: {
      fontSize: 12,
      color: "#78350F",
      marginTop: 4,
      lineHeight: 18,
    },


    // ========================================================
    // COMPLETED
    // ========================================================

    completedCard: {
      backgroundColor:
        "#F0FDF4",
      borderWidth: 1,
      borderColor:
        "#86EFAC",
      borderRadius: 16,
      padding: 22,
      alignItems:
        "center",
      marginBottom: 15,
    },


    completedIcon: {
      fontSize: 38,
    },


    completedTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: "#166534",
      marginTop: 8,
    },


    completedText: {
      fontSize: 13,
      color: "#4B5563",
      textAlign:
        "center",
      marginTop: 5,
    },


    completedDate: {
      fontSize: 12,
      color: "#166534",
      fontWeight: "700",
      marginTop: 9,
    },


    // ========================================================
    // REJECTED
    // ========================================================

    rejectedCard: {
      backgroundColor:
        "#FEF2F2",
      borderWidth: 1,
      borderColor:
        "#FCA5A5",
      borderRadius: 16,
      padding: 22,
      alignItems:
        "center",
      marginBottom: 15,
    },


    rejectedIcon: {
      fontSize: 38,
    },


    rejectedTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: "#991B1B",
      marginTop: 8,
    },


    rejectedText: {
      fontSize: 13,
      color: "#7F1D1D",
      textAlign:
        "center",
      marginTop: 5,
    },


    // ========================================================
    // ACTIONS
    // ========================================================

    actionsCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 17,
      marginBottom: 15,
      elevation: 2,
    },


    actionsTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: "#1F2937",
      marginBottom: 13,
    },


    primaryButton: {
      backgroundColor:
        "#166534",
      borderRadius: 12,
      minHeight: 52,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 10,
    },


    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
    },


    rejectButton: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#DC2626",
      borderRadius: 12,
      minHeight: 50,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 10,
    },


    rejectButtonText: {
      color: "#B91C1C",
      fontSize: 15,
      fontWeight: "900",
    },


    surveyButton: {
      backgroundColor:
        "#2563EB",
      borderRadius: 12,
      minHeight: 55,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 10,
      elevation: 2,
    },


    surveyButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
    },


    actionHint: {
      fontSize: 12,
      color: "#6B7280",
      textAlign:
        "center",
      lineHeight: 18,
      marginTop: 3,
    },


    disabledButton: {
      opacity: 0.6,
    },


    // ========================================================
    // SECONDARY
    // ========================================================

    secondaryButton: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#166534",
      borderRadius: 12,
      minHeight: 50,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 12,
    },


    secondaryButtonText: {
      color: "#166534",
      fontSize: 15,
      fontWeight: "900",
    },


    refreshButton: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#D1D5DB",
      borderRadius: 12,
      minHeight: 48,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 15,
    },


    refreshButtonText: {
      color: "#166534",
      fontSize: 14,
      fontWeight: "800",
    },

  });