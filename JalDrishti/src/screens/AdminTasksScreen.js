import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import api from "../services/api";

export default function AdminTasksScreen({
  navigation,
}) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [filter, setFilter] =
    useState("all");

  const loadTasks = async () => {
    try {
      const url =
        filter === "all"
          ? "/tasks/admin/all"
          : `/tasks/admin/all?status=${filter}`;

      const response =
        await api.get(url);

      setTasks(
        response.data?.tasks || []
      );

      setStats(
        response.data?.stats || null
      );
    } catch (error) {
      console.log(
        "Admin tasks error:",
        error.response?.data ||
          error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [filter])
  );

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

      default:
        return "#64748B";
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#4A148C"
        />

        <Text style={styles.loadingText}>
          Loading tasks...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Field Tasks
          </Text>

          <Text style={styles.subtitle}>
            Monitor officer assignments
            and worker activity
          </Text>
        </View>
      </View>

      {/* SUMMARY */}

      <View style={styles.summary}>
        <Stat
          label="Total"
          value={stats?.total || 0}
        />

        <Stat
          label="Pending"
          value={stats?.pending || 0}
        />

        <Stat
          label="Active"
          value={
            (stats?.accepted || 0) +
            (stats?.inProgress || 0)
          }
        />

        <Stat
          label="Done"
          value={stats?.completed || 0}
        />
      </View>

      {/* FILTER */}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        data={[
          "all",
          "PENDING",
          "ACCEPTED",
          "IN_PROGRESS",
          "COMPLETED",
          "REJECTED",
        ]}
        keyExtractor={(item) => item}
        style={styles.filterList}
        contentContainerStyle={{
          paddingHorizontal: 15,
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filter,
              filter === item &&
                styles.filterActive,
            ]}
            onPress={() =>
              setFilter(item)
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === item &&
                  styles.filterTextActive,
              ]}
            >
              {item === "all"
                ? "All"
                : item.replace(
                    "_",
                    " "
                  )}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* TASK LIST */}

      <FlatList
        data={tasks}
        keyExtractor={(item) =>
          item._id
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTasks();
            }}
          />
        }
        contentContainerStyle={{
          padding: 15,
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              No tasks found
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() =>
              navigation.navigate(
                "AdminTaskDetails",
                { task: item }
              )
            }
          >
            <View
              style={styles.taskHeader}
            >
              <Text
                style={styles.taskTitle}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <View
                style={[
                  styles.status,
                  {
                    backgroundColor:
                      getStatusColor(
                        item.status
                      ),
                  },
                ]}
              >
                <Text
                  style={styles.statusText}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.project}>
              📁{" "}
              {item.projectId?.name ||
                "Project"}
            </Text>

            <View
              style={styles.people}
            >
              <View
                style={styles.person}
              >
                <Text
                  style={styles.personLabel}
                >
                  👷 PERFORMER
                </Text>

                <Text
                  style={styles.personName}
                >
                  {item.assignedTo
                    ?.name ||
                    "Not assigned"}
                </Text>

                <Text
                  style={styles.personEmail}
                >
                  {item.assignedTo
                    ?.email || ""}
                </Text>
              </View>

              <View
                style={styles.person}
              >
                <Text
                  style={styles.personLabel}
                >
                  👨‍💼 ASSIGNED BY
                </Text>

                <Text
                  style={styles.personName}
                >
                  {item.assignedBy
                    ?.name ||
                    "Unknown"}
                </Text>

                <Text
                  style={styles.personEmail}
                >
                  {item.assignedBy
                    ?.role || ""}
                </Text>
              </View>
            </View>

            <View
              style={styles.footer}
            >
              <Text
                style={styles.footerText}
              >
                {item.surveyType}
              </Text>

              <Text
                style={styles.footerText}
              >
                Priority:{" "}
                {item.priority}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ============================================================
// STAT
// ============================================================

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#64748B",
  },

  header: {
    backgroundColor: "#4A148C",
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    color: "#E9D5FF",
    marginTop: 4,
    fontSize: 12,
  },

  summary: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },

  stat: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    elevation: 2,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#4A148C",
  },

  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  filterList: {
    maxHeight: 50,
  },

  filter: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  filterActive: {
    backgroundColor: "#4A148C",
    borderColor: "#4A148C",
  },

  filterText: {
    fontSize: 11,
    color: "#475569",
  },

  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },

  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
    marginRight: 8,
  },

  status: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },

  project: {
    marginTop: 9,
    fontSize: 12,
    color: "#64748B",
  },

  people: {
    flexDirection: "row",
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
  },

  person: {
    flex: 1,
  },

  personLabel: {
    fontSize: 9,
    color: "#7C3AED",
    fontWeight: "900",
  },

  personName: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },

  personEmail: {
    marginTop: 2,
    fontSize: 9,
    color: "#64748B",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  footerText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },

  empty: {
    alignItems: "center",
    paddingTop: 80,
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },
});