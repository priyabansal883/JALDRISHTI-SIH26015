import React from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import { useAuth } from "../context/AuthContext";

export default function RoleHeader({
  title,
}) {
  const { user } = useAuth();

  const getRoleName = () => {
    if (user?.role === "field_worker") {
      return "Field Worker";
    }

    if (user?.role === "officer") {
      return "Watershed Officer";
    }

    if (user?.role === "admin") {
      return "Administrator";
    }

    return "User";
  };

  return (
    <View style={styles.container}>

      <View>
        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.welcome}>
          Welcome, {user?.name || "User"}
        </Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {getRoleName()}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,

    backgroundColor: "#FFFFFF",
  },

  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#1565C0",
  },

  welcome: {
    marginTop: 4,
    fontSize: 14,
    color: "#666",
  },

  badge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  badgeText: {
    color: "#1565C0",
    fontSize: 12,
    fontWeight: "bold",
  },
});