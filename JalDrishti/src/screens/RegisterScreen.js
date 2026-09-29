import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("officer");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Error",
        "Password must contain at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      const { token, user } = response.data;

      await login(token, user);

    const roleLabel =
  role === "officer" ? "Officer" :
  role === "admin" ? "Admin" :
  "Field Worker";

Alert.alert("Success", `Account created as ${roleLabel}`);
    } catch (error) {
      console.log(
        "Registration Error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Registration Failed",
        error.response?.data?.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>🌱</Text>

      <Text style={styles.title}>Create Account</Text>

      <Text style={styles.subtitle}>
        Join JalDrishti Watershed Monitoring
      </Text>

      <View style={styles.form}>

        {/* NAME */}
        <Text style={styles.label}>Full Name</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
        />

        {/* EMAIL */}
        <Text style={styles.label}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* PASSWORD */}
        <Text style={styles.label}>Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Minimum 6 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* ROLE */}
        <Text style={styles.label}>Select Role</Text>

        <View style={styles.roleContainer}>

          <TouchableOpacity
            style={[
              styles.roleButton,
              role === "officer" && styles.selectedRole,
            ]}
            onPress={() => setRole("officer")}
          >
            <Text
              style={[
                styles.roleIcon,
                role === "officer" && styles.selectedRoleText,
              ]}
            >
              👨‍💼
            </Text>

            <Text
              style={[
                styles.roleText,
                role === "officer" && styles.selectedRoleText,
              ]}
            >
              Officer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              role === "field_worker" && styles.selectedRole,
            ]}
            onPress={() => setRole("field_worker")}
          >
            <Text
              style={[
                styles.roleIcon,
                role === "field_worker" && styles.selectedRoleText,
              ]}
            >
              👷
            </Text>

            <Text
              style={[
                styles.roleText,
                role === "field_worker" && styles.selectedRoleText,
              ]}
            >
              Field Worker
            </Text>
          </TouchableOpacity>
  <TouchableOpacity
    style={[
      styles.roleButtonFull,
      role === "admin" && styles.selectedRole,
    ]}
    onPress={() => setRole("admin")}
  >
    <Text
      style={[
        styles.roleIcon,
        role === "admin" && styles.selectedRoleText,
      ]}
    >
      🛡️
    </Text>

    <Text
      style={[
        styles.roleText,
        role === "admin" && styles.selectedRoleText,
      ]}
    >
      Admin
    </Text>
  </TouchableOpacity>


        </View>

        {/* REGISTER */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerText}>
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        {/* LOGIN */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.loginText}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#F5F9F5",
  },

  logo: {
    fontSize: 55,
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1B5E20",
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    marginTop: 8,
    marginBottom: 30,
  },

  form: {
    width: "100%",
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 7,
    color: "#333",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D5D5D5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 18,
    fontSize: 16,
  },

 roleContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  marginBottom: 20,
  gap: 10,
},

roleButtonFull: {
  width: "100%",
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#D5D5D5",
  borderRadius: 10,
  paddingVertical: 15,
  alignItems: "center",
},
  roleButton: {
    width: "48%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D5D5D5",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },

  selectedRole: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },

  roleIcon: {
    fontSize: 28,
    marginBottom: 5,
  },

  roleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  selectedRoleText: {
    color: "#fff",
  },

  registerButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },

  registerText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },

  loginButton: {
    alignItems: "center",
    marginTop: 22,
  },

  loginText: {
    color: "#2E7D32",
    fontSize: 15,
    fontWeight: "600",
  },
});

