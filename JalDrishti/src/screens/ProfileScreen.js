import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

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

  return (
    <View style={styles.container}>

      <Text style={styles.logo}>
        🌱 JalDrishti
      </Text>

      <View style={styles.profileCard}>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name
              ?.charAt(0)
              ?.toUpperCase() || "U"}
          </Text>
        </View>

        <Text style={styles.name}>
          {user?.name}
        </Text>

        <Text style={styles.email}>
          {user?.email}
        </Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {getRoleName()}
          </Text>
        </View>

      </View>

      <View style={styles.infoCard}>

        <Text style={styles.label}>
          District
        </Text>

        <Text style={styles.value}>
          {user?.district || "Not specified"}
        </Text>

        <Text style={styles.label}>
          Account Role
        </Text>

        <Text style={styles.value}>
          {getRoleName()}
        </Text>

      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>
          Logout
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
  },

  logo: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#1565C0",
    marginBottom: 25,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
  },

  avatar: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: "#1565C0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "bold",
  },

  name: {
    fontSize: 22,
    fontWeight: "bold",
  },

  email: {
    color: "#777",
    marginTop: 5,
  },

  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
  },

  roleText: {
    color: "#1565C0",
    fontWeight: "bold",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
  },

  label: {
    color: "#888",
    fontSize: 13,
    marginTop: 8,
  },

  value: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 3,
  },

  logoutButton: {
    backgroundColor: "#D32F2F",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});