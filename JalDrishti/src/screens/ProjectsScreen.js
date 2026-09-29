import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import api from "../services/api";

export default function ProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      const response = await api.get("/projects");

      setProjects(response.data.projects || []);
    } catch (error) {
      console.log("Projects error:", error.message);

      Alert.alert(
        "Connection Error",
        "Unable to load projects. Make sure the backend is running and your phone is connected to the same Wi-Fi."
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
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

  const renderProject = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("ProjectDetails", {
            project: item,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{item.name}</Text>

            <Text style={styles.location}>
              📍 {item.village}, {item.district}
            </Text>
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.score}>{item.impactScore}</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.type}>🌱 {item.type}</Text>

          <Text style={[styles.status, getStatusStyle(item.status)]}>
            {item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />

        <Text style={styles.loadingText}>
          Loading watershed projects...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Watershed Projects</Text>

        <Text style={styles.subtitle}>
          Monitor and evaluate watershed impact
        </Text>
      </View>

      {projects.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌱</Text>

          <Text style={styles.emptyTitle}>
            No Projects Found
          </Text>

          <Text style={styles.emptyText}>
            No watershed projects are currently available.
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item._id}
          renderItem={renderProject}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9F5",
  },

  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#2E7D32",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: "#E8F5E9",
  },

  list: {
    padding: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  projectName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B1B1B",
  },

  location: {
    marginTop: 6,
    color: "#666666",
    fontSize: 13,
  },

  scoreBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },

  score: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
  },

  scoreLabel: {
    fontSize: 10,
    color: "#555555",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
  },

  type: {
    fontSize: 13,
    color: "#555555",
  },

  status: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    fontWeight: "bold",
    overflow: "hidden",
  },

  good: {
    backgroundColor: "#E8F5E9",
    color: "#2E7D32",
  },

  moderate: {
    backgroundColor: "#FFF3CD",
    color: "#856404",
  },

  poor: {
    backgroundColor: "#FDECEC",
    color: "#C62828",
  },

  critical: {
    backgroundColor: "#FFCDD2",
    color: "#B71C1C",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F9F5",
  },

  loadingText: {
    marginTop: 12,
    color: "#555555",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyIcon: {
    fontSize: 50,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: "bold",
  },

  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: "#666666",
  },
});