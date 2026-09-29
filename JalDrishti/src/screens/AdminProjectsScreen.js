import React, {
  useCallback,
  useMemo,
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
  TextInput,
  Alert,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import api from "../services/api";

export default function AdminProjectsScreen({
  navigation,
}) {
  // ============================================================
  // STATE
  // ============================================================

  const [projects, setProjects] =
    useState([]);

  const [surveys, setSurveys] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [impactFilter, setImpactFilter] =
    useState("ALL");

  // ============================================================
  // LOAD PROJECTS + SURVEYS
  // ============================================================

  const loadProjects = async () => {
    try {
      console.log(
        "================================"
      );

      console.log(
        "ADMIN PROJECTS: LOADING DATA"
      );

      setLoading(true);

      const [
        projectsResponse,
        surveysResponse,
      ] = await Promise.all([
        api.get("/projects"),
        api.get("/surveys"),
      ]);

      const projectData =
        projectsResponse?.data
          ?.projects || [];

      const surveyData =
        surveysResponse?.data
          ?.surveys || [];

      console.log(
        "PROJECT COUNT:",
        projectData.length
      );

      console.log(
        "SURVEY COUNT:",
        surveyData.length
      );

      // ----------------------------------------------------------
      // DEBUG SURVEYS
      // ----------------------------------------------------------

      surveyData.forEach(
        (survey, index) => {
          console.log(
            `SURVEY ${index + 1}:`,
            {
              id: survey?._id,
              projectId:
                typeof survey?.projectId ===
                "object"
                  ? survey?.projectId?._id
                  : survey?.projectId,
              projectName:
                typeof survey?.projectId ===
                "object"
                  ? survey?.projectId?.name
                  : undefined,
              surveyType:
                survey?.surveyType,
              impactScore:
                survey?.impactScore,
            }
          );
        }
      );

      setProjects(projectData);
      setSurveys(surveyData);

      console.log(
        "================================"
      );
    } catch (error) {
      console.log(
        "Admin Projects Load Error:",
        error?.response?.data ||
          error?.message
      );

      Alert.alert(
        "Error",
        "Unable to load projects."
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
      loadProjects();
    }, [])
  );

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  // ============================================================
  // GET PROJECT ID FROM SURVEY
  // ============================================================

  const getSurveyProjectId = (
    survey
  ) => {
    if (!survey) {
      return null;
    }

    if (
      typeof survey.projectId ===
      "object"
    ) {
      return (
        survey.projectId?._id ||
        survey.projectId?.id ||
        null
      );
    }

    return survey.projectId || null;
  };

  // ============================================================
  // NORMALIZE SURVEY TYPE
  // ============================================================

  const getSurveyType = (
    survey
  ) => {
    return String(
      survey?.surveyType || ""
    )
      .trim()
      .toUpperCase();
  };

  // ============================================================
  // ADD SURVEY COUNTS TO PROJECTS
  // ============================================================

  const projectsWithSurveyData =
    useMemo(() => {
      return projects.map(
        (project) => {
          const projectId =
            String(project?._id);

          // ------------------------------------------------------
          // ALL SURVEYS FOR THIS PROJECT
          // ------------------------------------------------------

          const projectSurveys =
            surveys.filter(
              (survey) => {
                const surveyProjectId =
                  getSurveyProjectId(
                    survey
                  );

                return (
                  String(
                    surveyProjectId
                  ) === projectId
                );
              }
            );

          // ------------------------------------------------------
          // BEFORE
          // ------------------------------------------------------

          const beforeSurveys =
            projectSurveys.filter(
              (survey) =>
                getSurveyType(
                  survey
                ) === "BEFORE"
            );

          // ------------------------------------------------------
          // AFTER
          // ------------------------------------------------------

          const afterSurveys =
            projectSurveys.filter(
              (survey) =>
                getSurveyType(
                  survey
                ) === "AFTER"
            );

          // ------------------------------------------------------
          // MONITORING
          // ------------------------------------------------------

          const monitoringSurveys =
            projectSurveys.filter(
              (survey) =>
                getSurveyType(
                  survey
                ) === "MONITORING"
            );

          // ------------------------------------------------------
          // IMPACT SCORE
          // ------------------------------------------------------

          const impactScore = Number(
            project?.impactScore ?? 0
          );

          // ------------------------------------------------------
          // STATUS
          // ------------------------------------------------------

          let status = "Critical";

          if (impactScore >= 75) {
            status = "Good";
          } else if (
            impactScore >= 50
          ) {
            status = "Moderate";
          } else if (
            impactScore >= 25
          ) {
            status = "Poor";
          }

          // ------------------------------------------------------
          // ATTENTION
          // ------------------------------------------------------

          const needsAttention =
            impactScore < 50;

          console.log(
            "PROJECT SURVEY DATA:",
            {
              project:
                project?.name,
              projectId,
              total:
                projectSurveys.length,
              before:
                beforeSurveys.length,
              after:
                afterSurveys.length,
              monitoring:
                monitoringSurveys.length,
              impactScore,
              needsAttention,
            }
          );

          return {
            ...project,

            impactScore,

            status,

            needsAttention,

            surveys:
              projectSurveys,

            beforeSurveys,

            afterSurveys,

            monitoringSurveys,

            beforeSurveyCount:
              beforeSurveys.length,

            afterSurveyCount:
              afterSurveys.length,

            monitoringSurveyCount:
              monitoringSurveys.length,

            totalSurveyCount:
              projectSurveys.length,
          };
        }
      );
    }, [projects, surveys]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary = useMemo(() => {
    let good = 0;
    let moderate = 0;
    let poor = 0;
    let critical = 0;
    let attention = 0;

    projectsWithSurveyData.forEach(
      (project) => {
        const score =
          Number(
            project?.impactScore || 0
          );

        if (score >= 75) {
          good++;
        } else if (score >= 50) {
          moderate++;
        } else if (score >= 25) {
          poor++;
        } else {
          critical++;
        }

        if (score < 50) {
          attention++;
        }
      }
    );

    return {
      total:
        projectsWithSurveyData.length,

      good,

      moderate,

      poor,

      critical,

      attention,
    };
  }, [projectsWithSurveyData]);

  // ============================================================
  // SEARCH + FILTER
  // ============================================================

  const filteredProjects =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return projectsWithSurveyData.filter(
        (project) => {
          // ------------------------------------------------------
          // SEARCH
          // ------------------------------------------------------

          const searchableText = [
            project?.name,
            project?.village,
            project?.district,
            project?.state,
            project?.type,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !searchText ||
            searchableText.includes(
              searchText
            );

          // ------------------------------------------------------
          // IMPACT FILTER
          // ------------------------------------------------------

          let matchesImpact = true;

          if (
            impactFilter ===
            "GOOD"
          ) {
            matchesImpact =
              project.impactScore >=
              75;
          }

          if (
            impactFilter ===
            "MODERATE"
          ) {
            matchesImpact =
              project.impactScore >=
                50 &&
              project.impactScore <
                75;
          }

          if (
            impactFilter ===
            "ATTENTION"
          ) {
            matchesImpact =
              project.impactScore < 50;
          }

          return (
            matchesSearch &&
            matchesImpact
          );
        }
      );
    }, [
      projectsWithSurveyData,
      search,
      impactFilter,
    ]);

  // ============================================================
  // ATTENTION PROJECTS
  // ============================================================

  const attentionProjects =
    useMemo(() => {
      return projectsWithSurveyData
        .filter(
          (project) =>
            project.needsAttention
        )
        .sort(
          (a, b) =>
            Number(
              a.impactScore
            ) -
            Number(
              b.impactScore
            )
        );
    }, [projectsWithSurveyData]);

  // ============================================================
  // STATUS COLOR
  // ============================================================

  const getStatusColor = (
    status
  ) => {
    switch (status) {
      case "Good":
        return "#15803D";

      case "Moderate":
        return "#CA8A04";

      case "Poor":
        return "#EA580C";

      case "Critical":
        return "#DC2626";

      default:
        return "#64748B";
    }
  };

  // ============================================================
  // STATUS BACKGROUND
  // ============================================================

  const getStatusBackground = (
    status
  ) => {
    switch (status) {
      case "Good":
        return "#DCFCE7";

      case "Moderate":
        return "#FEF9C3";

      case "Poor":
        return "#FFEDD5";

      case "Critical":
        return "#FEE2E2";

      default:
        return "#F1F5F9";
    }
  };

  // ============================================================
  // DELETE PROJECT
  // ============================================================

  const deleteProject = (
    project
  ) => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${project?.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            try {
              await api.delete(
                `/projects/${project._id}`
              );

              Alert.alert(
                "Success",
                "Project deleted successfully."
              );

              loadProjects();
            } catch (error) {
              console.log(
                "Delete project error:",
                error?.response
                  ?.data ||
                  error?.message
              );

              Alert.alert(
                "Delete Failed",
                error?.response
                  ?.data
                  ?.message ||
                  "Unable to delete project."
              );
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // VIEW DETAILS
  // ============================================================

  const openProjectDetails = (
    project
  ) => {
    navigation.navigate(
      "ProjectDetails",
      {
        project,
      }
    );
  };

  // ============================================================
  // COMPARE
  // ============================================================

  const openComparison = (
    project
  ) => {
    navigation.navigate(
      "Comparison",
      {
        project,
      }
    );
  };

  // ============================================================
  // ASSIGN
  // ============================================================

  const assignProject = (
    project
  ) => {
    navigation.navigate(
      "AssignProject",
      {
        project,
      }
    );
  };

  // ============================================================
  // REPORT
  // ============================================================

  const generateReport = async (
    project
  ) => {
    try {
      Alert.alert(
        "Report",
        "Project report endpoint is available. Open Project Details to generate/view the complete report."
      );

      navigation.navigate(
        "ProjectDetails",
        {
          project,
        }
      );
    } catch (error) {
      console.log(
        "Report navigation error:",
        error
      );
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
          color="#5B21B6"
        />

        <Text
          style={styles.loadingText}
        >
          Loading projects...
        </Text>
      </View>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <View style={styles.header}>
          <View
            style={styles.headerTextBox}
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Project Management
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Monitor and manage
              watershed projects
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.newButton
            }
            onPress={() =>
              navigation.navigate(
                "CreateProject"
              )
            }
          >
            <Text
              style={
                styles.newButtonText
              }
            >
              ＋ New
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================
            SUMMARY CARDS
        ====================================================== */}

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            value={
              summary.total
            }
            label="Total"
            color="#5B21B6"
            background="#F3E8FF"
          />

          <SummaryCard
            value={
              summary.good
            }
            label="Good"
            color="#15803D"
            background="#DCFCE7"
          />

          <SummaryCard
            value={
              summary.moderate
            }
            label="Moderate"
            color="#A16207"
            background="#FEF9C3"
          />

          <SummaryCard
            value={
              summary.attention
            }
            label="Attention"
            color="#DC2626"
            background="#FEE2E2"
          />
        </View>

        {/* ======================================================
            SEARCH
        ====================================================== */}

        <View
          style={
            styles.searchBox
          }
        >
          <Text
            style={
              styles.searchIcon
            }
          >
            🔎
          </Text>

          <TextInput
            value={search}
            onChangeText={
              setSearch
            }
            placeholder="Search project, village or district..."
            placeholderTextColor="#94A3B8"
            style={
              styles.searchInput
            }
          />
        </View>

        {/* ======================================================
            FILTERS
        ====================================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          <FilterButton
            label="All"
            active={
              impactFilter ===
              "ALL"
            }
            onPress={() =>
              setImpactFilter(
                "ALL"
              )
            }
          />

          <FilterButton
            label="75–100"
            active={
              impactFilter ===
              "GOOD"
            }
            onPress={() =>
              setImpactFilter(
                "GOOD"
              )
            }
          />

          <FilterButton
            label="50–74"
            active={
              impactFilter ===
              "MODERATE"
            }
            onPress={() =>
              setImpactFilter(
                "MODERATE"
              )
            }
          />

          <FilterButton
            label="<50"
            active={
              impactFilter ===
              "ATTENTION"
            }
            onPress={() =>
              setImpactFilter(
                "ATTENTION"
              )
            }
          />
        </ScrollView>

        {/* ======================================================
            ATTENTION SECTION
        ====================================================== */}

        {attentionProjects.length >
          0 && (
          <View
            style={
              styles.attentionSection
            }
          >
            <View
              style={
                styles.attentionHeader
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.attentionTitle
                  }
                >
                  🚨 Projects
                  Requiring Attention
                </Text>

                <Text
                  style={
                    styles.attentionSubtitle
                  }
                >
                  Impact score below
                  50 requires
                  intervention.
                </Text>
              </View>

              <View
                style={
                  styles.attentionCount
                }
              >
                <Text
                  style={
                    styles.attentionCountText
                  }
                >
                  {
                    attentionProjects.length
                  }
                </Text>

                <Text
                  style={
                    styles.attentionCountLabel
                  }
                >
                  projects
                </Text>
              </View>
            </View>

            {attentionProjects.map(
              (project) => (
                <TouchableOpacity
                  key={
                    `attention-${project._id}`
                  }
                  style={
                    styles.attentionProjectCard
                  }
                  onPress={() =>
                    openProjectDetails(
                      project
                    )
                  }
                >
                  <View
                    style={
                      styles.attentionProjectMain
                    }
                  >
                    <Text
                      style={
                        styles.attentionProjectName
                      }
                    >
                      📁{" "}
                      {project.name ||
                        "Unnamed Project"}
                    </Text>

                    <Text
                      style={
                        styles.attentionProjectLocation
                      }
                    >
                      📍{" "}
                      {project.village ||
                        "Village"}
                      {project.district
                        ? `, ${project.district}`
                        : ""}
                    </Text>

                    <Text
                      style={
                        styles.attentionReason
                      }
                    >
                      ⚠️ Immediate
                      attention
                      recommended
                    </Text>
                  </View>

                  <View
                    style={
                      styles.attentionScore
                    }
                  >
                    <Text
                      style={
                        styles.attentionScoreValue
                      }
                    >
                      {Number(
                        project.impactScore ||
                          0
                      ).toFixed(1)}
                    </Text>

                    <Text
                      style={
                        styles.attentionScoreLabel
                      }
                    >
                      /100
                    </Text>

                    <Text
                      style={
                        styles.attentionStatus
                      }
                    >
                      {project.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {/* ======================================================
            PROJECTS HEADER
        ====================================================== */}

        <View
          style={
            styles.projectsHeader
          }
        >
          <View>
            <Text
              style={
                styles.projectsTitle
              }
            >
              Projects
            </Text>

            <Text
              style={
                styles.projectsSubtitle
              }
            >
              Showing{" "}
              {
                filteredProjects.length
              }{" "}
              of{" "}
              {
                projectsWithSurveyData.length
              }
            </Text>
          </View>

          {summary.attention >
            0 && (
            <View
              style={
                styles.smallAttentionBadge
              }
            >
              <Text
                style={
                  styles.smallAttentionText
                }
              >
                ⚠{" "}
                {summary.attention}{" "}
                attention
              </Text>
            </View>
          )}
        </View>

        {/* ======================================================
            PROJECT LIST
        ====================================================== */}

        {filteredProjects.length ===
        0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              📁
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No projects found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Try changing your
              search or filter.
            </Text>
          </View>
        ) : (
          filteredProjects.map(
            (project) => (
              <ProjectCard
                key={project._id}
                project={project}
                getStatusColor={
                  getStatusColor
                }
                getStatusBackground={
                  getStatusBackground
                }
                onViewDetails={() =>
                  openProjectDetails(
                    project
                  )
                }
                onCompare={() =>
                  openComparison(
                    project
                  )
                }
                onAssign={() =>
                  assignProject(
                    project
                  )
                }
                onReport={() =>
                  generateReport(
                    project
                  )
                }
                onDelete={() =>
                  deleteProject(
                    project
                  )
                }
              />
            )
          )
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  value,
  label,
  color,
  background,
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor:
            background,
        },
      ]}
    >
      <Text
        style={[
          styles.summaryValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.summaryLabel,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// FILTER BUTTON
// ============================================================

function FilterButton({
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        active &&
          styles.filterButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.filterButtonText,
          active &&
            styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// PROJECT CARD
// ============================================================

function ProjectCard({
  project,
  getStatusColor,
  getStatusBackground,
  onViewDetails,
  onCompare,
  onAssign,
  onReport,
  onDelete,
}) {
  const score = Number(
    project?.impactScore || 0
  );

  const status =
    project?.status ||
    "Critical";

  return (
    <View
      style={[
        styles.projectCard,

        project?.needsAttention &&
          styles.projectCardAttention,
      ]}
    >
      {/* ======================================================
          PROJECT HEADER
      ====================================================== */}

      <View
        style={
          styles.projectHeader
        }
      >
        <View
          style={
            styles.projectIconBox
          }
        >
          <Text
            style={
              styles.projectIcon
            }
          >
            💧
          </Text>
        </View>

        <View
          style={
            styles.projectHeaderMain
          }
        >
          <Text
            style={
              styles.projectName
            }
            numberOfLines={2}
          >
            {project?.name ||
              "Unnamed Project"}
          </Text>

          <Text
            style={
              styles.projectLocation
            }
          >
            📍{" "}
            {project?.village ||
              "Village"}
            {project?.district
              ? `, ${project.district}`
              : ""}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                getStatusBackground(
                  status
                ),
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              {
                color:
                  getStatusColor(
                    status
                  ),
              },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {/* ======================================================
          ATTENTION WARNING
      ====================================================== */}

      {project?.needsAttention && (
        <View
          style={
            styles.projectAttentionWarning
          }
        >
          <Text
            style={
              styles.projectAttentionWarningText
            }
          >
            🚨 ATTENTION REQUIRED —
            This project has an
            impact score below 50.
          </Text>
        </View>
      )}

      {/* ======================================================
          IMPACT SCORE
      ====================================================== */}

      <View
        style={
          styles.impactSection
        }
      >
        <View>
          <Text
            style={
              styles.impactTitle
            }
          >
            Impact Score
          </Text>

          <Text
            style={
              styles.impactSubtitle
            }
          >
            Overall watershed
            outcome
          </Text>
        </View>

        <View
          style={
            styles.scoreContainer
          }
        >
          <Text
            style={[
              styles.scoreValue,
              {
                color:
                  getStatusColor(
                    status
                  ),
              },
            ]}
          >
            {score.toFixed(1)}
          </Text>

          <Text
            style={
              styles.scoreOutOf
            }
          >
            /100
          </Text>
        </View>
      </View>

      {/* ======================================================
          SCORE BAR
      ====================================================== */}

      <View
        style={
          styles.progressBackground
        }
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(
                Math.max(score, 0),
                100
              )}%`,

              backgroundColor:
                getStatusColor(
                  status
                ),
            },
          ]}
        />
      </View>

      {/* ======================================================
          SURVEY COUNTS
      ====================================================== */}

      <View
        style={
          styles.surveySummary
        }
      >
        <SurveyCount
          label="BEFORE"
          value={
            project?.beforeSurveyCount ??
            0
          }
          color="#7C3AED"
        />

        <View
          style={
            styles.surveyDivider
          }
        />

        <SurveyCount
          label="AFTER"
          value={
            project?.afterSurveyCount ??
            0
          }
          color="#16A34A"
        />

        <View
          style={
            styles.surveyDivider
          }
        />

        <SurveyCount
          label="MONITORING"
          value={
            project?.monitoringSurveyCount ??
            0
          }
          color="#2563EB"
        />
      </View>

      {/* ======================================================
          SURVEY DEBUG INFO
      ====================================================== */}

      <View
        style={
          styles.totalSurveyRow
        }
      >
        <Text
          style={
            styles.totalSurveyLabel
          }
        >
          Total field surveys
        </Text>

        <Text
          style={
            styles.totalSurveyValue
          }
        >
          {project?.totalSurveyCount ??
            0}
        </Text>
      </View>

      {/* ======================================================
          ASSIGNED OFFICER
      ====================================================== */}

      <View
        style={
          styles.assignmentInfo
        }
      >
        <View
          style={
            styles.assignmentPerson
          }
        >
          <Text
            style={
              styles.assignmentIcon
            }
          >
            👨‍💼
          </Text>

          <Text
            style={
              styles.assignmentLabel
            }
          >
            Officer
          </Text>
        </View>

        <Text
          style={
            styles.assignmentName
          }
        >
          {project
            ?.assignedOfficer
            ?.name ||
            project?.officerName ||
            "Not assigned"}
        </Text>
      </View>

      {/* ======================================================
          FIELD WORKER
      ====================================================== */}

      <View
        style={
          styles.assignmentInfo
        }
      >
        <View
          style={
            styles.assignmentPerson
          }
        >
          <Text
            style={
              styles.assignmentIcon
            }
          >
            👷
          </Text>

          <Text
            style={
              styles.assignmentLabel
            }
          >
            Field Worker
          </Text>
        </View>

        <Text
          style={
            styles.assignmentName
          }
        >
          {project
            ?.assignedWorker
            ?.name ||
            project?.workerName ||
            "Not assigned"}
        </Text>
      </View>

      {/* ======================================================
          BUTTONS
      ====================================================== */}

      <View
        style={
          styles.actionRow
        }
      >
        <TouchableOpacity
          style={
            styles.detailsButton
          }
          onPress={
            onViewDetails
          }
        >
          <Text
            style={
              styles.detailsButtonText
            }
          >
            View Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.compareButton
          }
          onPress={
            onCompare
          }
        >
          <Text
            style={
              styles.compareButtonText
            }
          >
            Compare
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.assignButton
          }
          onPress={
            onAssign
          }
        >
          <Text
            style={
              styles.assignButtonText
            }
          >
            Assign
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================
          REPORT + DELETE
      ====================================================== */}

      <View
        style={
          styles.bottomActions
        }
      >
        <TouchableOpacity
          onPress={
            onReport
          }
        >
          <Text
            style={
              styles.reportText
            }
          >
            📄 Reports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            onDelete
          }
        >
          <Text
            style={
              styles.deleteText
            }
          >
            Delete Project
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// SURVEY COUNT
// ============================================================

function SurveyCount({
  label,
  value,
  color,
}) {
  return (
    <View
      style={
        styles.surveyCount
      }
    >
      <View
        style={
          styles.surveyCountTitleRow
        }
      >
        <Text
          style={[
            styles.surveyTriangle,
            {
              color,
            },
          ]}
        >
          ▶
        </Text>

        <Text
          style={
            styles.surveyLabel
          }
        >
          {label}
        </Text>
      </View>

      <Text
        style={
          styles.surveyValue
        }
      >
        {value}{" "}
        {value === 1
          ? "survey"
          : "surveys"}
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F5F7FB",
    },

    content: {
      paddingBottom: 40,
    },

    // ========================================================
    // LOADING
    // ========================================================

    center: {
      flex: 1,
      justifyContent:
        "center",
      alignItems: "center",
      backgroundColor:
        "#F5F7FB",
    },

    loadingText: {
      marginTop: 12,
      color: "#64748B",
      fontSize: 14,
      fontWeight: "600",
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      backgroundColor:
        "#5420A8",
      paddingTop: 55,
      paddingHorizontal: 25,
      paddingBottom: 35,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      flexDirection: "row",
      alignItems: "flex-start",
    },

    headerTextBox: {
      flex: 1,
    },

    headerTitle: {
      color: "#FFFFFF",
      fontSize: 29,
      fontWeight: "900",
      letterSpacing: -0.5,
    },

    headerSubtitle: {
      color: "#E9D5FF",
      fontSize: 16,
      marginTop: 8,
    },

    newButton: {
      backgroundColor:
        "#FFFFFF",
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderRadius: 17,
      marginLeft: 10,
      elevation: 4,
    },

    newButtonText: {
      color: "#5B21B6",
      fontSize: 15,
      fontWeight: "900",
    },

    // ========================================================
    // SUMMARY
    // ========================================================

    summaryGrid: {
      flexDirection: "row",
      marginTop: -16,
      paddingHorizontal: 12,
      gap: 8,
    },

    summaryCard: {
      flex: 1,
      minHeight: 94,
      borderRadius: 18,
      justifyContent:
        "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        "rgba(0,0,0,0.04)",
      elevation: 2,
    },

    summaryValue: {
      fontSize: 25,
      fontWeight: "900",
    },

    summaryLabel: {
      marginTop: 5,
      fontSize: 12,
      fontWeight: "800",
    },

    // ========================================================
    // SEARCH
    // ========================================================

    searchBox: {
      marginHorizontal: 25,
      marginTop: 30,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      elevation: 1,
    },

    searchIcon: {
      fontSize: 25,
      marginRight: 12,
    },

    searchInput: {
      flex: 1,
      fontSize: 17,
      color: "#1E293B",
    },

    // ========================================================
    // FILTER
    // ========================================================

    filterRow: {
      paddingHorizontal: 27,
      paddingTop: 18,
      paddingBottom: 8,
      gap: 10,
    },

    filterButton: {
      minWidth: 75,
      paddingHorizontal: 17,
      paddingVertical: 9,
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
      alignItems: "center",
    },

    filterButtonActive: {
      backgroundColor:
        "#5B21B6",
      borderColor:
        "#5B21B6",
    },

    filterButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#64748B",
    },

    filterButtonTextActive: {
      color: "#FFFFFF",
    },

    // ========================================================
    // ATTENTION
    // ========================================================

    attentionSection: {
      marginHorizontal: 20,
      marginTop: 15,
      padding: 16,
      backgroundColor:
        "#FEF2F2",
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "#FECACA",
    },

    attentionHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    attentionTitle: {
      color: "#991B1B",
      fontSize: 17,
      fontWeight: "900",
    },

    attentionSubtitle: {
      color: "#7F1D1D",
      fontSize: 11,
      marginTop: 4,
      lineHeight: 16,
    },

    attentionCount: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor:
        "#DC2626",
      justifyContent:
        "center",
      alignItems: "center",
      marginLeft: 10,
    },

    attentionCountText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
    },

    attentionCountLabel: {
      color: "#FEE2E2",
      fontSize: 8,
      fontWeight: "700",
    },

    attentionProjectCard: {
      marginTop: 11,
      padding: 12,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        "#FECACA",
      flexDirection: "row",
      alignItems: "center",
    },

    attentionProjectMain: {
      flex: 1,
    },

    attentionProjectName: {
      fontSize: 14,
      fontWeight: "900",
      color: "#7F1D1D",
    },

    attentionProjectLocation: {
      fontSize: 11,
      color: "#64748B",
      marginTop: 4,
    },

    attentionReason: {
      marginTop: 5,
      fontSize: 10,
      color: "#DC2626",
      fontWeight: "800",
    },

    attentionScore: {
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 10,
      minWidth: 58,
    },

    attentionScoreValue: {
      fontSize: 20,
      color: "#DC2626",
      fontWeight: "900",
    },

    attentionScoreLabel: {
      fontSize: 9,
      color: "#94A3B8",
    },

    attentionStatus: {
      marginTop: 3,
      color: "#DC2626",
      fontSize: 9,
      fontWeight: "900",
    },

    // ========================================================
    // PROJECT HEADER
    // ========================================================

    projectsHeader: {
      marginHorizontal: 26,
      marginTop: 23,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    projectsTitle: {
      fontSize: 28,
      fontWeight: "900",
      color: "#172033",
    },

    projectsSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: "#94A3B8",
    },

    smallAttentionBadge: {
      backgroundColor:
        "#FEF2F2",
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 12,
    },

    smallAttentionText: {
      color: "#DC2626",
      fontSize: 11,
      fontWeight: "900",
    },

    // ========================================================
    // PROJECT CARD
    // ========================================================

    projectCard: {
      marginHorizontal: 20,
      marginBottom: 17,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 23,
      padding: 18,
      elevation: 3,
      borderWidth: 1,
      borderColor:
        "#EEF2F7",
    },

    projectCardAttention: {
      borderWidth: 1.5,
      borderColor:
        "#FCA5A5",
    },

    projectHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    projectIconBox: {
      width: 62,
      height: 62,
      borderRadius: 19,
      backgroundColor:
        "#F5F3FF",
      justifyContent:
        "center",
      alignItems: "center",
    },

    projectIcon: {
      fontSize: 34,
    },

    projectHeaderMain: {
      flex: 1,
      marginLeft: 15,
      marginRight: 8,
    },

    projectName: {
      fontSize: 21,
      fontWeight: "900",
      color: "#172033",
    },

    projectLocation: {
      marginTop: 5,
      fontSize: 13,
      color: "#64748B",
    },

    statusBadge: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 12,
    },

    statusBadgeText: {
      fontSize: 11,
      fontWeight: "900",
    },

    // ========================================================
    // ATTENTION WARNING
    // ========================================================

    projectAttentionWarning: {
      marginTop: 14,
      padding: 11,
      borderRadius: 10,
      backgroundColor:
        "#FEF2F2",
      borderWidth: 1,
      borderColor:
        "#FECACA",
    },

    projectAttentionWarningText: {
      color: "#B91C1C",
      fontSize: 11,
      fontWeight: "800",
      lineHeight: 16,
    },

    // ========================================================
    // IMPACT
    // ========================================================

    impactSection: {
      marginTop: 20,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    impactTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: "#334155",
    },

    impactSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: "#94A3B8",
    },

    scoreContainer: {
      flexDirection: "row",
      alignItems: "baseline",
    },

    scoreValue: {
      fontSize: 31,
      fontWeight: "900",
    },

    scoreOutOf: {
      fontSize: 12,
      color: "#94A3B8",
      marginLeft: 3,
    },

    progressBackground: {
      height: 9,
      marginTop: 11,
      backgroundColor:
        "#E2E8F0",
      borderRadius: 10,
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      borderRadius: 10,
    },

    // ========================================================
    // SURVEY SUMMARY
    // ========================================================

    surveySummary: {
      marginTop: 17,
      paddingVertical: 13,
      paddingHorizontal: 9,
      borderRadius: 15,
      backgroundColor:
        "#F8FAFC",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-around",
    },

    surveyCount: {
      flex: 1,
      alignItems: "center",
    },

    surveyCountTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    surveyTriangle: {
      fontSize: 9,
      marginRight: 5,
    },

    surveyLabel: {
      fontSize: 9,
      color: "#94A3B8",
      fontWeight: "900",
    },

    surveyValue: {
      marginTop: 5,
      fontSize: 12,
      fontWeight: "900",
      color: "#334155",
    },

    surveyDivider: {
      width: 1,
      height: 38,
      backgroundColor:
        "#E2E8F0",
    },

    totalSurveyRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginTop: 9,
      paddingHorizontal: 5,
    },

    totalSurveyLabel: {
      fontSize: 10,
      color: "#94A3B8",
      fontWeight: "700",
    },

    totalSurveyValue: {
      fontSize: 11,
      color: "#475569",
      fontWeight: "900",
    },

    // ========================================================
    // ASSIGNMENT
    // ========================================================

    assignmentInfo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 11,
    },

    assignmentPerson: {
      flexDirection: "row",
      alignItems: "center",
    },

    assignmentIcon: {
      fontSize: 18,
      marginRight: 8,
    },

    assignmentLabel: {
      fontSize: 12,
      color: "#94A3B8",
      fontWeight: "700",
    },

    assignmentName: {
      fontSize: 12,
      color: "#334155",
      fontWeight: "900",
      maxWidth: "55%",
    },

    // ========================================================
    // ACTION BUTTONS
    // ========================================================

    actionRow: {
      flexDirection: "row",
      marginTop: 18,
      gap: 8,
    },

    detailsButton: {
      flex: 1.4,
      backgroundColor:
        "#5B21B6",
      paddingVertical: 13,
      borderRadius: 13,
      alignItems: "center",
    },

    detailsButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },

    compareButton: {
      flex: 1,
      backgroundColor:
        "#EDE9FE",
      paddingVertical: 13,
      borderRadius: 13,
      alignItems: "center",
    },

    compareButtonText: {
      color: "#6D28D9",
      fontSize: 12,
      fontWeight: "900",
    },

    assignButton: {
      flex: 1,
      backgroundColor:
        "#EFF6FF",
      paddingVertical: 13,
      borderRadius: 13,
      alignItems: "center",
    },

    assignButtonText: {
      color: "#2563EB",
      fontSize: 12,
      fontWeight: "900",
    },

    bottomActions: {
      marginTop: 17,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor:
        "#EEF2F7",
      flexDirection: "row",
      justifyContent:
        "space-between",
    },

    reportText: {
      color: "#6D28D9",
      fontSize: 12,
      fontWeight: "900",
    },

    deleteText: {
      color: "#DC2626",
      fontSize: 12,
      fontWeight: "900",
    },

    // ========================================================
    // EMPTY
    // ========================================================

    emptyCard: {
      marginHorizontal: 20,
      marginTop: 20,
      padding: 35,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      alignItems: "center",
    },

    emptyIcon: {
      fontSize: 40,
    },

    emptyTitle: {
      marginTop: 10,
      fontSize: 17,
      fontWeight: "900",
      color: "#334155",
    },

    emptyText: {
      marginTop: 5,
      color: "#94A3B8",
      fontSize: 12,
      textAlign: "center",
    },
  });