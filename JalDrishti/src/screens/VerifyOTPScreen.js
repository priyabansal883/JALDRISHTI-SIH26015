import React, { useEffect, useRef, useState } from "react";
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

export default function VerifyOTPScreen({ navigation, route }) {
  const email = route?.params?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert(
        "Invalid OTP",
        "Please enter the complete 6-digit OTP."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/verify-otp", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (response.data?.success) {
        navigation.replace("ResetPassword", {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        });
      }
    } catch (error) {
      console.log(
        "Verify OTP Error:",
        error?.response?.data || error.message
      );

      Alert.alert(
        "Verification Failed",
        error?.response?.data?.message ||
          "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0 || resending) return;

    setResending(true);

    try {
      await api.post("/auth/resend-otp", {
        email: email.trim().toLowerCase(),
      });

      setOtp("");
      setTimer(60);

      Alert.alert(
        "OTP Resent",
        "A new OTP has been sent to your email."
      );
    } catch (error) {
      console.log(
        "Resend OTP Error:",
        error?.response?.data || error.message
      );

      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          "Unable to resend OTP."
      );
    } finally {
      setResending(false);
    }
  };

  const formatTimer = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
            name="shield-checkmark-outline"
            size={42}
            color="#16A34A"
          />
        </View>

        <Text style={styles.title}>Verify OTP</Text>

        <Text style={styles.subtitle}>
          Enter the 6-digit OTP sent to
        </Text>

        <Text style={styles.email}>{email}</Text>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={(value) => {
            const cleaned = value.replace(/\D/g, "").slice(0, 6);
            setOtp(cleaned);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={styles.otpContainer}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.otpBox,
                otp.length === index && styles.otpBoxActive,
              ]}
            >
              <Text style={styles.otpText}>
                {otp[index] || ""}
              </Text>
            </View>
          ))}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleVerifyOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.verifyText}>
                Verify OTP
              </Text>
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendLabel}>
            Didn't receive the OTP?
          </Text>

          {timer > 0 ? (
            <Text style={styles.timerText}>
              Resend in {formatTimer()}
            </Text>
          ) : (
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator color="#16A34A" />
              ) : (
                <Text style={styles.resendText}>
                  Resend OTP
                </Text>
              )}
            </TouchableOpacity>
          )}
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
    alignItems: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    elevation: 2,
  },

  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 35,
    marginBottom: 25,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 12,
  },

  email: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16A34A",
    marginTop: 6,
  },

  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },

  otpContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 35,
  },

  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },

  otpBoxActive: {
    borderColor: "#16A34A",
    borderWidth: 2,
  },

  otpText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  verifyButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#16A34A",
    borderRadius: 16,
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  verifyText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  resendContainer: {
    alignItems: "center",
    marginTop: 28,
  },

  resendLabel: {
    color: "#6B7280",
    fontSize: 14,
  },

  timerText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },

  resendText: {
    color: "#16A34A",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
});