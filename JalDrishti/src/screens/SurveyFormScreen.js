import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import { useAuth } from "../context/AuthContext";

import api from "../services/api";

import NetInfo from "@react-native-community/netinfo";

import {
  saveOfflineSurvey,
} from "../services/offlineStorage";


export default function SurveyFormScreen({
  route,
  navigation,
}) {
  const { user } = useAuth();

  const {
    project,
    task,
    location,
    photo,
    photoType,
    surveyType: routeSurveyType,
  } = route.params || {};


  // ======================================================
  // FINAL SURVEY TYPE
  // ======================================================

  const finalSurveyType =
    photoType ||
    routeSurveyType ||
    task?.surveyType ||
    "MONITORING";


  console.log("=================================");
  console.log("SURVEY FORM OPENED");
  console.log("Photo Type:", photoType);
  console.log("Route Survey Type:", routeSurveyType);
  console.log("Task Survey Type:", task?.surveyType);
  console.log("FINAL SURVEY TYPE:", finalSurveyType);
  console.log("=================================");


  // ======================================================
  // FORM STATES
  // ======================================================

  const [water, setWater] = useState(3);
  const [retention, setRetention] = useState(3);
  const [vegetation, setVegetation] = useState("60");
  const [structure, setStructure] = useState(3);
  const [maintenance, setMaintenance] = useState(3);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);


  // ======================================================
  // GO TO DASHBOARD
  // ======================================================

  const goToDashboard = () => {
    if (user?.role === "field_worker") {
      navigation.replace("FieldWorkerDashboard");
    } else if (user?.role === "officer" || user?.role === "admin") {
      navigation.replace("OfficerDashboard");
    } else {
      navigation.replace("AdminDashboard");
    }
  };


  // ======================================================
  // CALCULATE IMPACT SCORE
  // ======================================================

  const calculateScore = () => {
    const waterScore = (water / 5) * 35;
    const vegetationScore =
      (Math.min(Number(vegetation) || 0, 100) / 100) * 25;
    const structureScore = (structure / 5) * 20;
    const retentionScore = (retention / 5) * 10;
    const maintenanceScore = (maintenance / 5) * 10;

    return Math.round(
      waterScore +
        vegetationScore +
        structureScore +
        retentionScore +
        maintenanceScore
    );
  };

  const impactScore = calculateScore();


  // ======================================================
  // FETCH SATELLITE NDVI
  // ======================================================

  const fetchSatelliteNDVI = async () => {
    try {
      if (
        location?.latitude === undefined ||
        location?.longitude === undefined
      ) {
        console.log("GPS coordinates unavailable for satellite analysis");
        return null;
      }

      console.log("Fetching satellite NDVI...");

      const response = await api.get(
        `/satellite/ndvi?latitude=${location.latitude}&longitude=${location.longitude}`
      );

      console.log("Satellite NDVI response:", response.data);

      return response.data?.data || null;
    } catch (error) {
      console.log(
        "Satellite NDVI fetch failed:",
        error.response?.data || error.message
      );
      return null;
    }
  };


  // ======================================================
  // COMPLETE TASK
  // ======================================================

  const completeTask = async (surveyId) => {
    if (!task?._id) {
      console.log("No task ID available. Survey will still be saved.");
      return false;
    }

    try {
      console.log("Completing task:", task._id);

      const response = await api.patch(
        `/tasks/${task._id}/complete`,
        {
          surveyId,
          workerNotes: notes,
        }
      );

      console.log("Task completed:", response.data);

      return true;
    } catch (error) {
      console.log(
        "Task completion failed:",
        error.response?.data || error.message
      );
      return false;
    }
  };


  // ======================================================
  // UPLOAD PHOTO
  // ======================================================

  const uploadPhoto = async (photoUri) => {
    try {
      const formData = new FormData();

      formData.append("photo", {
        uri: photoUri,
        name: `jaldrishti_${Date.now()}.jpg`,
        type: "image/jpeg",
      });

      console.log("=================================");
      console.log("PHOTO UPLOAD START");
      console.log("PHOTO URI:", photoUri);
      console.log("=================================");

      const response = await api.post("/photos/upload", formData);

      console.log("=================================");
      console.log("PHOTO UPLOAD SUCCESS");
      console.log("RESPONSE:", response.data);
      console.log("=================================");

      return response.data?.photo?.url || null;
    } catch (error) {
      console.log("=================================");
      console.log("PHOTO UPLOAD FAILED");
      console.log("STATUS:", error.response?.status);
      console.log("SERVER ERROR:", error.response?.data);
      console.log("MESSAGE:", error.message);
      console.log("URL:", error.config?.url);
      console.log("METHOD:", error.config?.method);
      console.log("=================================");

      throw error;
    }
  };


  // ======================================================
  // SUBMIT SURVEY
  // ======================================================

  const submitSurvey = async () => {
    try {
      // ==================================================
      // VALIDATE VEGETATION
      // ==================================================

      if (
        !vegetation ||
        Number(vegetation) < 0 ||
        Number(vegetation) > 100
      ) {
        Alert.alert(
          "Invalid Vegetation",
          "Enter vegetation percentage between 0 and 100."
        );
        return;
      }

      // ==================================================
      // VALIDATE GPS
      // ==================================================

      if (!location) {
        Alert.alert(
          "GPS Required",
          "Please capture your current location first."
        );
        return;
      }

      if (
        location.latitude === undefined ||
        location.longitude === undefined
      ) {
        Alert.alert(
          "GPS Required",
          "Valid latitude and longitude are required."
        );
        return;
      }

      setLoading(true);

      // ==================================================
      // PROJECT ID
      // ==================================================

      const projectId =
        project?._id ||
        project?.id ||
        task?.projectId?._id ||
        task?.projectId?.id ||
        task?.projectId ||
        task?.project?._id ||
        task?.project?.id;

      console.log("========== PROJECT DEBUG ==========");
      console.log("Project:", project);
      console.log("Task:", task);
      console.log("Task projectId:", task?.projectId);
      console.log("Task project:", task?.project);
      console.log("Final projectId:", projectId);
      console.log("Final survey type:", finalSurveyType);
      console.log("====================================");

      if (!projectId) {
        Alert.alert(
          "Project Error",
          "Project information is missing.\n\nPlease open this survey from an assigned project/task."
        );
        setLoading(false);
        return;
      }

      // ==================================================
      // TASK ID
      // ==================================================

      const taskId = task?._id || null;

      // ==================================================
      // CHECK INTERNET
      // ==================================================

      const network = await NetInfo.fetch();

      console.log("Network:", network.isConnected);

      // ==================================================
      // OFFLINE DATA
      // ==================================================

      const offlineSurvey = {
        projectId,
        taskId,
        latitude: location.latitude,
        longitude: location.longitude,
        gpsAccuracy: location.accuracy || null,
        surveyType: finalSurveyType,
        water: Number(water),
        retention: Number(retention),
        vegetation: Number(vegetation),
        structure: Number(structure),
        maintenance: Number(maintenance),
        notes,
        impactScore,
        photoUri: photo?.uri || null,
        createdAt: new Date().toISOString(),
      };

      // ==================================================
      // OFFLINE
      // ==================================================

      if (!network.isConnected) {
        console.log("NO INTERNET - SAVING OFFLINE");

        await saveOfflineSurvey(offlineSurvey);

        Alert.alert(
          "Saved Offline",
          "No internet connection. Your survey and photo have been saved on this device and will sync automatically when internet returns.",
          [
            {
              text: "OK",
              onPress: goToDashboard,
            },
          ]
        );

        return;
      }

      // ==================================================
      // ONLINE SUBMISSION
      // ==================================================

      try {
        // ================================================
        // STEP 1 - SATELLITE NDVI
        // ================================================

        console.log("STEP 1: FETCHING SATELLITE NDVI");

        let satelliteData = null;

        satelliteData = await fetchSatelliteNDVI();

        console.log("STEP 1 COMPLETE - SATELLITE:", satelliteData);

        // ================================================
        // STEP 2 - PHOTO UPLOAD
        // ================================================

        console.log("STEP 2: UPLOADING PHOTO");

        let uploadedPhotoUrl = null;

        if (photo?.uri) {
          uploadedPhotoUrl = await uploadPhoto(photo.uri);
        } else {
          console.log("No photo provided.");
        }

        console.log("STEP 2 COMPLETE - PHOTO URL:", uploadedPhotoUrl);

        // ================================================
        // STEP 3 - PHOTO METADATA
        // ================================================

        const photos = uploadedPhotoUrl
          ? [
              {
                url: uploadedPhotoUrl,
                type:
                  finalSurveyType === "MONITORING"
                    ? "DURING"
                    : finalSurveyType,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy || null,
                timestamp: new Date().toISOString(),
              },
            ]
          : [];

        // ================================================
        // STEP 4 - SURVEY DATA
        // ================================================

        const surveyData = {
          projectId,
          latitude: location.latitude,
          longitude: location.longitude,
          gpsAccuracy: location.accuracy || null,
          surveyType: finalSurveyType,
          water: Number(water),
          retention: Number(retention),
          vegetation: Number(vegetation),
          structure: Number(structure),
          maintenance: Number(maintenance),
          notes,
          photos,
          satelliteNDVI: satelliteData?.ndvi ?? null,
          satelliteNDVIClassification:
            satelliteData?.classification || "",
          satelliteDate: satelliteData
            ? new Date().toISOString()
            : null,
        };

        console.log("=================================");
        console.log("STEP 3: SUBMITTING SURVEY");
        console.log("SURVEY DATA:", JSON.stringify(surveyData, null, 2));
        console.log("=================================");

        // ================================================
        // STEP 5 - CREATE SURVEY
        // ================================================

        const response = await api.post("/surveys", surveyData);

        console.log("=================================");
        console.log("STEP 4 COMPLETE - SURVEY CREATED");
        console.log("SURVEY RESPONSE:", response.data);
        console.log("=================================");

        // ================================================
        // GET SURVEY ID
        // ================================================

        const surveyId =
          response.data?.survey?._id ||
          response.data?.survey?.id ||
          response.data?._id ||
          response.data?.id ||
          null;

        console.log("Created Survey ID:", surveyId);

        // ================================================
        // STEP 6 - COMPLETE TASK
        //
        // IMPORTANT:
        // A task is only marked COMPLETED when the
        // submitted survey is the AFTER survey, or a
        // standalone MONITORING survey.
        //
        // A BEFORE survey must NOT complete the task,
        // because the worker still needs to come back
        // later and submit the AFTER survey.
        // ================================================

        let taskCompleted = false;

        const shouldCompleteTask =
          taskId &&
          surveyId &&
          (finalSurveyType === "AFTER" ||
            finalSurveyType === "MONITORING");

        if (shouldCompleteTask) {
          console.log(
            "STEP 5: COMPLETING TASK (survey type:",
            finalSurveyType,
            ")"
          );

          taskCompleted = await completeTask(surveyId);

          if (!taskCompleted) {
            console.log(
              "Survey was saved, but task could not be marked completed."
            );
          }
        } else {
          console.log(
            "Task completion skipped — survey type is",
            finalSurveyType,
            "(only AFTER or MONITORING surveys complete the task)."
          );
        }

        // ================================================
        // STEP 7 - SAVE SATELLITE HISTORY
        // ================================================

        if (
          satelliteData &&
          satelliteData.ndvi !== null &&
          satelliteData.ndvi !== undefined
        ) {
          try {
            console.log("STEP 6: SAVING SATELLITE HISTORY");

            await api.post("/satellite/analysis", {
              projectId,
              ndvi: satelliteData.ndvi,
              classification: satelliteData.classification,
              analysisType:
                finalSurveyType === "BEFORE"
                  ? "BEFORE"
                  : finalSurveyType === "AFTER"
                  ? "AFTER"
                  : "MONITORING",
              satelliteDate: new Date().toISOString(),
              source: "Copernicus Sentinel-2 L2A",
            });

            console.log("STEP 6 COMPLETE - SATELLITE HISTORY SAVED");
          } catch (error) {
            console.log(
              "Satellite history save failed:",
              error.response?.data || error.message
            );
          }
        }

        // ==================================================
        // SUCCESS MESSAGE
        // ==================================================

        let successMessage = `Survey saved successfully.\n\nSurvey Type: ${finalSurveyType}\nImpact Score: ${
          response.data?.survey?.impactScore ?? impactScore
        }/100`;

        if (
          satelliteData?.ndvi !== null &&
          satelliteData?.ndvi !== undefined
        ) {
          successMessage += `\n\nSatellite NDVI: ${Number(
            satelliteData.ndvi
          ).toFixed(4)}`;
        }

        if (taskId) {
          if (taskCompleted) {
            successMessage += "\n\nTask Status: COMPLETED ✅";
          } else if (finalSurveyType === "BEFORE") {
            successMessage +=
              "\n\nTask Status: IN PROGRESS (submit an AFTER survey to complete this task).";
          } else {
            successMessage +=
              "\n\nSurvey saved, but task completion could not be updated.";
          }
        }

        // ==================================================
        // SUCCESS ALERT
        // ==================================================

        Alert.alert("Survey Submitted ✅", successMessage, [
          {
            text: "View History",
            onPress: () => navigation.navigate("SurveyHistory"),
          },
          {
            text: "Done",
            onPress: goToDashboard,
          },
        ]);

        return;
      } catch (error) {
        // ==================================================
        // ONLINE SUBMISSION ERROR
        // ==================================================

        console.log("=================================");
        console.log("ONLINE SUBMISSION FAILED");
        console.log("STATUS:", error.response?.status);
        console.log("SERVER ERROR:", error.response?.data);
        console.log("MESSAGE:", error.message);
        console.log("URL:", error.config?.url);
        console.log("METHOD:", error.config?.method);
        console.log("=================================");

        Alert.alert(
          "Submission Error",
          error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Server error occurred while submitting the survey."
        );

        return;
      }
    } catch (error) {
      console.log(
        "Survey submission error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Submission Failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Unable to submit survey."
      );
    } finally {
      setLoading(false);
    }
  };


  // ======================================================
  // RATING SELECTOR
  // ======================================================

  const RatingSelector = ({ title, value, setValue }) => (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((number) => (
          <TouchableOpacity
            key={number}
            style={[
              styles.ratingButton,
              value === number && styles.ratingSelected,
            ]}
            onPress={() => setValue(number)}
          >
            <Text
              style={[
                styles.ratingText,
                value === number && styles.ratingTextSelected,
              ]}
            >
              {number}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );


  // ======================================================
  // UI
  // ======================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Field Survey</Text>

      <Text style={styles.projectName}>
        {project?.name || task?.projectId?.name || "Project"}
      </Text>

      {/* SURVEY TYPE */}
      <View
        style={[
          styles.surveyTypeCard,
          finalSurveyType === "BEFORE" && styles.beforeCard,
          finalSurveyType === "AFTER" && styles.afterCard,
          finalSurveyType === "MONITORING" && styles.monitoringCard,
        ]}
      >
        <Text style={styles.surveyTypeTitle}>Survey Type</Text>

        <Text style={styles.surveyTypeValue}>{finalSurveyType}</Text>

        <Text style={styles.surveyTypeDescription}>
          {finalSurveyType === "BEFORE"
            ? "Baseline condition before watershed intervention."
            : finalSurveyType === "AFTER"
            ? "Condition after watershed intervention."
            : "Current monitoring condition."}
        </Text>
      </View>

      {/* TASK */}
      {task && (
        <View style={styles.taskCard}>
          <Text style={styles.taskTitle}>📋 Assigned Task</Text>

          <Text style={styles.taskName}>{task.title}</Text>

          <Text style={styles.taskStatus}>
            Status: {task.status || "IN_PROGRESS"}
          </Text>

          <Text style={styles.taskType}>
            Survey Type: {finalSurveyType}
          </Text>
        </View>
      )}

      {/* GPS */}
      <View style={styles.gpsCard}>
        <Text style={styles.gpsTitle}>📍 GPS Evidence</Text>

        <Text style={styles.gpsText}>
          Latitude:{" "}
          {location?.latitude !== undefined
            ? Number(location.latitude).toFixed(6)
            : "Unavailable"}
        </Text>

        <Text style={styles.gpsText}>
          Longitude:{" "}
          {location?.longitude !== undefined
            ? Number(location.longitude).toFixed(6)
            : "Unavailable"}
        </Text>

        <Text style={styles.gpsText}>
          Accuracy:{" "}
          {location?.accuracy
            ? `${Number(location.accuracy).toFixed(1)} m`
            : "Unknown"}
        </Text>
      </View>

      <RatingSelector
        title="💧 Water Availability"
        value={water}
        setValue={setWater}
      />

      <RatingSelector
        title="🌊 Water Retention"
        value={retention}
        setValue={setRetention}
      />

      <View style={styles.section}>
        <Text style={styles.label}>🌱 Vegetation Coverage (%)</Text>

        <TextInput
          style={styles.input}
          value={vegetation}
          onChangeText={setVegetation}
          keyboardType="numeric"
          placeholder="Enter percentage"
          maxLength={3}
        />
      </View>

      <RatingSelector
        title="🏗️ Structure Condition"
        value={structure}
        setValue={setStructure}
      />

      <RatingSelector
        title="🔧 Maintenance Condition"
        value={maintenance}
        setValue={setMaintenance}
      />

      <View style={styles.section}>
        <Text style={styles.label}>📝 Field Notes</Text>

        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter observations..."
          multiline
          numberOfLines={4}
        />
      </View>

      {/* IMPACT SCORE */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreTitle}>Current Impact Score</Text>

        <Text style={styles.score}>{impactScore}</Text>

        <Text style={styles.outOf}>out of 100</Text>

        <Text style={styles.scoreDescription}>
          Water 35% • Vegetation 25% • Structure 20%
          {"\n"}
          Retention 10% • Maintenance 10%
        </Text>
      </View>

      {/* SUBMIT */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={submitSurvey}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Submit Survey</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}


// ======================================================
// STYLES
// ======================================================

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
    color: "#2E7D32",
    marginTop: 30,
  },

  projectName: {
    fontSize: 17,
    color: "#555",
    marginTop: 5,
    marginBottom: 15,
  },

  surveyTypeCard: {
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },

  beforeCard: {
    backgroundColor: "#FFF3E0",
    borderColor: "#FF9800",
  },

  afterCard: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
  },

  monitoringCard: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
  },

  surveyTypeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },

  surveyTypeValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 5,
  },

  surveyTypeDescription: {
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
  },

  taskCard: {
    backgroundColor: "#E3F2FD",
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#1565C0",
  },

  taskTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1565C0",
    marginBottom: 6,
  },

  taskName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },

  taskStatus: {
    fontSize: 13,
    color: "#555",
    marginBottom: 3,
  },

  taskType: {
    fontSize: 13,
    color: "#555",
  },

  gpsCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },

  gpsTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
  },

  gpsText: {
    fontSize: 13,
    color: "#444",
    marginTop: 3,
  },

  section: {
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },

  ratingRow: {
    flexDirection: "row",
    gap: 10,
  },

  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D5D5D5",
  },

  ratingSelected: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },

  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
  },

  ratingTextSelected: {
    color: "#FFFFFF",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 14,
    fontSize: 15,
  },

  notes: {
    height: 100,
    textAlignVertical: "top",
  },

  scoreCard: {
    backgroundColor: "#2E7D32",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 20,
  },

  scoreTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  score: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "bold",
    marginTop: 5,
  },

  outOf: {
    color: "#E8F5E9",
  },

  scoreDescription: {
    color: "#E8F5E9",
    textAlign: "center",
    fontSize: 11,
    marginTop: 12,
    lineHeight: 18,
  },

  submitButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.7,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },
});