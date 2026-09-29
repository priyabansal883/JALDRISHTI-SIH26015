import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";

export default function ResetPasswordScreen({
  navigation,
  route,
}) {
  const email = route?.params?.email || "";
  const otp = route?.params?.otp || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(
        "Missing Information",
        "Please enter and confirm your new password."
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Passwords Don't Match",
        "Please make sure both passwords are the same."
      );
      return;
    }

    if (!email || !otp) {
      Alert.alert(
        "Session Expired",
        "Please request a new OTP."
      );
      navigation.replace("ForgotPassword");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/reset-password",
        {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        }
      );

      if (response.data?.success) {
        Alert.alert(
          "Password Reset Successful",
          "Your password has been changed successfully. You can now login with your new password.",
          [
            {
              text: "Go to Login",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.log(
        "Reset Password Error:",
        error?.response?.data || error.message
      );

      Alert.alert(
        "Reset Failed",
        error?.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons
            name="key-outline"
            size={42}
            color="#16A34A"
          />
        </View>

        <Text style={styles.title}>Reset Password</Text>

        <Text style={styles.subtitle}>
          Create a new secure password for your JalDrishti account.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>New Password</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword((prev) => !prev)
              }
            >
              <Ionicons
                name={
                  showPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={21}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Minimum 6 characters
          </Text>

          <Text style={styles.label}>Confirm Password</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6B7280"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword((prev) => !prev)
              }
            >
              <Ionicons
                name={
                  showConfirmPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={21}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  Reset Password
                </Text>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDF4",
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 55,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },

  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 30,
    marginBottom: 25,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 30,
  },

  form: {
    width: "100%",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },

  inputContainer: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },

  hint: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 6,
  },

  button: {
    height: 56,
    backgroundColor: "#16A34A",
    borderRadius: 16,
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});