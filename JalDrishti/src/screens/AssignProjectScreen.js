import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import api from "../services/api";

export default function AssignProjectScreen({
  route,
  navigation,
}) {
  const { project } = route.params;

  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const loadWorkers = async () => {
    try {
      const response = await api.get(
        "/auth/field-workers"
      );

      setWorkers(response.data.workers || []);
    } catch (error) {
      console.log(
        "Workers error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        "Unable to load field workers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);
const assignProject = async () => {
  if (!selectedWorker) {
    Alert.alert(
      "Select Worker",
      "Please select a field worker."
    );
    return;
  }

  try {
    setAssigning(true);

    const response = await api.post("/tasks/assign", {
      projectId: project._id,
      assignedTo: selectedWorker._id,
      surveyType: "MONITORING",
      title: `Survey - ${project.name}`,
      description: `Conduct watershed survey at ${project.village}, ${project.district}.`,
      priority: "MEDIUM",
      deadline: null,
    });

    console.log(
      "TASK ASSIGN RESPONSE:",
      response.data
    );

    Alert.alert(
      "Success",
      `${selectedWorker.name} has been assigned the task.`,
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  } catch (error) {
    console.log(
      "Task assignment error:",
      error.response?.data || error.message
    );

    Alert.alert(
      "Assignment Failed",
      error.response?.data?.message ||
        "Unable to assign task."
    );
  } finally {
    setAssigning(false);
  }
};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Assign Project
      </Text>

      <View style={styles.projectCard}>
        <Text style={styles.projectName}>
          {project.name}
        </Text>

        <Text style={styles.projectInfo}>
          📍 {project.village}, {project.district}
        </Text>

        <Text style={styles.projectInfo}>
          🌊 {project.type}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Select Field Worker
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2E7D32"
        />
      ) : workers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No field workers found.
          </Text>
        </View>
      ) : (
        workers.map((worker) => (
          <TouchableOpacity
            key={worker._id}
            style={[
              styles.workerCard,
              selectedWorker?._id === worker._id &&
                styles.selectedWorker,
            ]}
            onPress={() =>
              setSelectedWorker(worker)
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {worker.name
                  ?.charAt(0)
                  ?.toUpperCase() || "W"}
              </Text>
            </View>

            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>
                {worker.name}
              </Text>

              <Text style={styles.workerEmail}>
                {worker.email}
              </Text>

              {worker.district ? (
                <Text style={styles.workerDistrict}>
                  📍 {worker.district}
                </Text>
              ) : null}
            </View>

            {selectedWorker?._id ===
              worker._id && (
              <Text style={styles.check}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        style={styles.assignButton}
        onPress={assignProject}
        disabled={assigning}
      >
        {assigning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.assignText}>
            👷 Assign Project
          </Text>
        )}
      </TouchableOpacity>
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

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1B5E20",
    marginBottom: 20,
  },

  projectCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 18,
    marginBottom: 25,
  },

  projectName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1B5E20",
    marginBottom: 8,
  },

  projectInfo: {
    color: "#555",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },

  workerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  selectedWorker: {
    borderColor: "#2E7D32",
    borderWidth: 2,
    backgroundColor: "#F1F8F2",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  workerInfo: {
    flex: 1,
  },

  workerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },

  workerEmail: {
    color: "#666",
    marginTop: 3,
  },

  workerDistrict: {
    color: "#777",
    marginTop: 3,
    fontSize: 13,
  },

  check: {
    fontSize: 25,
    color: "#2E7D32",
    fontWeight: "bold",
  },

  emptyBox: {
    padding: 25,
    alignItems: "center",
  },

  emptyText: {
    color: "#777",
  },

  assignButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },

  assignText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});