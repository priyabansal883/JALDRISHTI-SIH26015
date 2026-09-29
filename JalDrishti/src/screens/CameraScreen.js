import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

export default function CameraScreen({
  route,
  navigation,
}) {
  const {
    project,
    task,
    location,
    photoType: routePhotoType,
  } = route.params || {};
console.log("========== CAMERA PARAMS ==========");
console.log("Project:", project);
console.log("Task:", task);
console.log("Location:", location);
console.log("Photo Type:", routePhotoType);
console.log("===================================");
  const cameraRef = useRef(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [photo, setPhoto] = useState(null);

  // --------------------------------------------------
  // SURVEY TYPE
  // --------------------------------------------------
  // Task survey type has highest priority.
  // This prevents the worker from accidentally
  // changing an assigned BEFORE/AFTER/MONITORING task.
  // --------------------------------------------------

  const photoType =
    task?.surveyType ||
    routePhotoType ||
    "MONITORING";

  // --------------------------------------------------
  // CAMERA PERMISSION
  // --------------------------------------------------

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>
          📷 Camera Permission
        </Text>

        <Text style={styles.permissionText}>
          Camera access is required to capture
          geo-tagged evidence of the watershed
          project.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>
            Allow Camera
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --------------------------------------------------
  // TAKE PHOTO
  // --------------------------------------------------

  const takePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const result =
        await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });

      if (!result?.uri) {
        Alert.alert(
          "Camera Error",
          "Photo could not be captured."
        );

        return;
      }

      setPhoto(result.uri);
    } catch (error) {
      console.log(
        "Camera capture error:",
        error
      );

      Alert.alert(
        "Camera Error",
        "Unable to capture photo."
      );
    }
  };

  // --------------------------------------------------
  // RETAKE PHOTO
  // --------------------------------------------------

  const retakePhoto = () => {
    setPhoto(null);
  };

  // --------------------------------------------------
  // SAVE PHOTO AND CONTINUE
  // --------------------------------------------------

  const savePhoto = () => {
    if (!photo) {
      Alert.alert(
        "Photo Required",
        "Please capture a photo first."
      );

      return;
    }

    if (!location) {
      Alert.alert(
        "GPS Required",
        "GPS location is required for geo-tagged evidence."
      );

      return;
    }

    Alert.alert(
      "Photo Captured ✅",
      `Survey Type: ${photoType}\n\n` +
        `Latitude: ${Number(
          location.latitude
        ).toFixed(6)}\n` +
        `Longitude: ${Number(
          location.longitude
        ).toFixed(6)}\n` +
        `Accuracy: ${
          location.accuracy !== null &&
          location.accuracy !== undefined
            ? `${Number(
                location.accuracy
              ).toFixed(1)} m`
            : "Unknown"
        }`,
      [
        {
          text: "Continue Survey",
          onPress: () => {
            navigation.navigate(
              "SurveyForm",
              {
                project,
                task,
                location,
                photo: {
                  uri: photo,
                },
                photoType,
              }
            );
          },
        },
      ]
    );
  };

  // --------------------------------------------------
  // PHOTO PREVIEW
  // --------------------------------------------------

  if (photo) {
    return (
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: photo }}
          style={styles.preview}
        />

        {/* ------------------------------------------
            GEO-TAG OVERLAY
        ------------------------------------------ */}

        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            🌱 JalDrishti Evidence
          </Text>

          <Text style={styles.overlayText}>
            {photoType} PHOTO
          </Text>

          <Text style={styles.overlayText}>
            📍{" "}
            {Number(
              location.latitude
            ).toFixed(6)}
            ,{" "}
            {Number(
              location.longitude
            ).toFixed(6)}
          </Text>

          {location.accuracy !==
            null &&
            location.accuracy !==
              undefined && (
              <Text style={styles.overlayText}>
                GPS Accuracy:{" "}
                {Number(
                  location.accuracy
                ).toFixed(1)}
                m
              </Text>
            )}

          {task && (
            <Text style={styles.overlayText}>
              📋 {task.title}
            </Text>
          )}

          <Text style={styles.overlayText}>
            📅{" "}
            {new Date().toLocaleString()}
          </Text>
        </View>

        {/* ------------------------------------------
            PHOTO CONTROLS
        ------------------------------------------ */}

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={retakePhoto}
          >
            <Text style={styles.buttonText}>
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={savePhoto}
          >
            <Text style={styles.buttonText}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  return (
    <View style={styles.container}>
      {/* ------------------------------------------
          SURVEY TYPE
      ------------------------------------------ */}

      <View style={styles.typeContainer}>
        <Text style={styles.typeTitle}>
          Survey Type
        </Text>

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {photoType}
          </Text>
        </View>

        <Text style={styles.typeDescription}>
          {photoType === "BEFORE"
            ? "Capture the condition before watershed work."
            : photoType === "AFTER"
            ? "Capture the condition after watershed work."
            : "Capture the current monitoring condition."}
        </Text>
      </View>

      {/* ------------------------------------------
          CAMERA
      ------------------------------------------ */}

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

      {/* ------------------------------------------
          LOCATION BAR
      ------------------------------------------ */}

      <View style={styles.locationBar}>
        <Text style={styles.locationText}>
          📍{" "}
          {Number(
            location.latitude
          ).toFixed(6)}
          ,{" "}
          {Number(
            location.longitude
          ).toFixed(6)}
        </Text>

        <Text style={styles.locationText}>
          GPS:{" "}
          {location.accuracy !==
            null &&
          location.accuracy !==
            undefined
            ? `${Number(
                location.accuracy
              ).toFixed(1)} m`
            : "Unknown"}
        </Text>

        <Text style={styles.locationText}>
          Photo: {photoType}
        </Text>

        {task && (
          <Text style={styles.locationText}>
            Task: {task.title}
          </Text>
        )}
      </View>

      {/* ------------------------------------------
          CAPTURE BUTTON
      ------------------------------------------ */}

      <TouchableOpacity
        style={styles.captureButton}
        onPress={takePhoto}
      >
        <View style={styles.captureInner} />
      </TouchableOpacity>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  // ----------------------------------------------
  // SURVEY TYPE
  // ----------------------------------------------

  typeContainer: {
    position: "absolute",
    zIndex: 10,
    top: 45,
    left: 20,
    right: 20,
    backgroundColor:
      "rgba(0,0,0,0.70)",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  typeTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 8,
    fontSize: 14,
  },

  typeBadge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },

  typeBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  typeDescription: {
    color: "#EEEEEE",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },

  // ----------------------------------------------
  // LOCATION
  // ----------------------------------------------

  locationBar: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor:
      "rgba(0,0,0,0.70)",
    padding: 12,
    borderRadius: 12,
  },

  locationText: {
    color: "#FFFFFF",
    textAlign: "center",
    marginVertical: 2,
    fontSize: 13,
  },

  // ----------------------------------------------
  // CAPTURE
  // ----------------------------------------------

  captureButton: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: "#2E7D32",
  },

  // ----------------------------------------------
  // PREVIEW
  // ----------------------------------------------

  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  preview: {
    flex: 1,
    width: "100%",
    resizeMode: "contain",
  },

  overlay: {
    position: "absolute",
    top: 45,
    left: 20,
    right: 20,
    backgroundColor:
      "rgba(0,0,0,0.70)",
    padding: 15,
    borderRadius: 12,
  },

  overlayTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  overlayText: {
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 5,
    fontSize: 13,
  },

  // ----------------------------------------------
  // BOTTOM BUTTONS
  // ----------------------------------------------

  bottomControls: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  retakeButton: {
    backgroundColor: "#555555",
    padding: 16,
    borderRadius: 12,
    width: "45%",
    alignItems: "center",
  },

  saveButton: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
    width: "45%",
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  // ----------------------------------------------
  // PERMISSION
  // ----------------------------------------------

  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#F4F8F3",
  },

  permissionTitle: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },

  permissionText: {
    textAlign: "center",
    color: "#666666",
    lineHeight: 22,
    marginBottom: 25,
  },

  button: {
    backgroundColor: "#2E7D32",
    padding: 17,
    borderRadius: 12,
    alignItems: "center",
  },
});