import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validate fields
    if (!email.trim() || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      console.log("Login response:", response.data);

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error("Invalid login response from server.");
      }

      // Save authentication information
      await login(token, user);

      /*
       * IMPORTANT:
       * Do NOT use navigation.replace("Dashboard") here.
       *
       * AppNavigator automatically detects the authenticated user
       * and opens the correct screen based on the user's role.
       *
       * field_worker -> FieldWorkerDashboard
       * officer      -> OfficerDashboard
       * admin        -> adminDashboard
       */
    } catch (error) {
      console.log(
        "Login error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Login Failed",
        error.response?.data?.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* LOGO */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🌱</Text>

        <Text style={styles.title}>JalDrishti</Text>

        <Text style={styles.subtitle}>
          Watershed Impact Monitoring
        </Text>
      </View>

      {/* LOGIN FORM */}
      <View style={styles.form}>
        <Text style={styles.heading}>Welcome Back</Text>

        {/* EMAIL */}
        <Text style={styles.label}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* PASSWORD */}
        <Text style={styles.label}>Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
<TouchableOpacity
  style={styles.forgotPasswordButton}
  onPress={() =>
    navigation.navigate("ForgotPassword")
  }
>
  <Text style={styles.forgotPasswordText}>
    Forgot Password?
  </Text>
</TouchableOpacity>
        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* REGISTER */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.registerButton}
          disabled={loading}
        >
          <Text style={styles.registerText}>
            Don't have an account? Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9F5",
    justifyContent: "center",
    padding: 24,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },

  logo: {
    fontSize: 60,
  },

  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#2E7D32",
    marginTop: 8,
  },

  subtitle: {
    color: "#666666",
    marginTop: 5,
    fontSize: 14,
  },

  form: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 20,
    elevation: 4,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  heading: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#222222",
    marginBottom: 22,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444444",
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: "#FAFAFA",
    color: "#222222",
  },

  loginButton: {
    height: 52,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  disabledButton: {
    opacity: 0.7,
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  registerButton: {
    marginTop: 20,
    alignItems: "center",
  },
forgotPasswordButton: {
  alignSelf: "flex-end",
  marginTop: 8,
  marginBottom: 15,
},

forgotPasswordText: {
  color: "#1565C0",
  fontSize: 14,
  fontWeight: "700",
},
  registerText: {
    textAlign: "center",
    color: "#2E7D32",
    fontWeight: "600",
  },
});