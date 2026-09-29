import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import * as Location from "expo-location";

export default function SurveyScreen({
  route,
  navigation,
}) {
  const {
    project,
    task,
    selectedLocation,
  } = route.params || {};

  console.log("========== SURVEY PARAMS ==========");
  console.log("Project:", project);
  console.log("Task:", task);
  console.log("Selected Location:", selectedLocation);
  console.log("===================================");

  // --------------------------------------------------
  // LOCATION
  // --------------------------------------------------

  const [location, setLocation] =
    useState(selectedLocation || null);

  const [loading, setLoading] =
    useState(false);

  // --------------------------------------------------
  // SURVEY TYPE
  // --------------------------------------------------
  // If task already has a survey type, use it.
  // Otherwise default to MONITORING.
  //
  // Worker can change it using the buttons below.
  // --------------------------------------------------

  const [surveyType, setSurveyType] =
    useState(
      task?.surveyType || "MONITORING"
    );

  // --------------------------------------------------
  // RECEIVE LOCATION FROM MAP / MANUAL SCREEN
  // --------------------------------------------------

  useEffect(() => {
    if (selectedLocation) {
      setLocation(selectedLocation);

      // Remove selectedLocation from params
      // so it is not reused accidentally.
      navigation.setParams({
        selectedLocation: undefined,
      });
    }
  }, [selectedLocation]);

  // --------------------------------------------------
  // CAPTURE CURRENT GPS LOCATION
  // --------------------------------------------------

  const captureLocation = async () => {
    try {
      setLoading(true);

      const {
        status,
      } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Location permission is required for geo-tagged field survey."
        );

        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });

      const {
        latitude,
        longitude,
        accuracy,
      } = currentLocation.coords;

      // ------------------------------------------------
      // GPS ACCURACY CHECK
      // ------------------------------------------------

      if (
        accuracy !== null &&
        accuracy !== undefined &&
        accuracy > 30
      ) {
        Alert.alert(
          "GPS Accuracy Too Low",
          `Current accuracy is ${Math.round(
            accuracy
          )} m.\n\nPlease move to an open area and try again.`,
          [
            {
              text: "Try Again",
            },
          ]
        );

        return;
      }

      const capturedLocation = {
        latitude,
        longitude,
        accuracy:
          accuracy ?? null,
        source: "GPS",
        timestamp:
          new Date().toISOString(),
      };

      setLocation(capturedLocation);

      Alert.alert(
        "GPS Captured ✅",
        `Latitude: ${latitude.toFixed(
          6
        )}\nLongitude: ${longitude.toFixed(
          6
        )}\nAccuracy: ${
          accuracy !== null &&
          accuracy !== undefined
            ? `${Number(
                accuracy
              ).toFixed(1)} meters`
            : "Unknown"
        }`
      );
    } catch (error) {
      console.log(
        "GPS error:",
        error
      );

      Alert.alert(
        "GPS Error",
        "Unable to capture your current location. Please make sure GPS is turned on and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // OPEN MAP PICKER
  // --------------------------------------------------

  const openMapPicker = () => {
    navigation.navigate(
      "LocationPicker",
      {
        project,
        task,
        mode: "MAP",
        initialLocation:
          location || {
            latitude:
              project?.latitude ||
              26.8467,
            longitude:
              project?.longitude ||
              80.9462,
          },
      }
    );
  };

  // --------------------------------------------------
  // OPEN MANUAL LAT/LON
  // --------------------------------------------------

  const openManualLocation = () => {
    navigation.navigate(
      "LocationPicker",
      {
        project,
        task,
        mode: "MANUAL",
        initialLocation:
          location || {
            latitude:
              project?.latitude ||
              26.8467,
            longitude:
              project?.longitude ||
              80.9462,
          },
      }
    );
  };

  // --------------------------------------------------
  // SELECT SURVEY TYPE
  // --------------------------------------------------

  const selectSurveyType = (type) => {
    setSurveyType(type);

    console.log(
      "Selected Survey Type:",
      type
    );
  };

  // --------------------------------------------------
  // SURVEY TYPE DESCRIPTION
  // --------------------------------------------------

  const getSurveyDescription = () => {
    if (surveyType === "BEFORE") {
      return "Record the condition before watershed work or intervention.";
    }

    if (surveyType === "AFTER") {
      return "Record the condition after watershed work or intervention.";
    }

    return "Record the current condition during regular monitoring.";
  };

  // --------------------------------------------------
  // SURVEY TYPE ICON
  // --------------------------------------------------

  const getSurveyIcon = () => {
    if (surveyType === "BEFORE") {
      return "🟡";
    }

    if (surveyType === "AFTER") {
      return "🟢";
    }

    return "🔵";
  };

  // --------------------------------------------------
  // CONTINUE TO CAMERA
  // --------------------------------------------------

  const continueToCamera = () => {
    if (!location) {
      Alert.alert(
        "Location Required",
        "Please select your location using GPS, Map, or Latitude/Longitude."
      );

      return;
    }

    if (!surveyType) {
      Alert.alert(
        "Survey Type Required",
        "Please select BEFORE, AFTER, or MONITORING."
      );

      return;
    }

    console.log(
      "========== CONTINUE TO CAMERA =========="
    );

    console.log(
      "Survey Type:",
      surveyType
    );

    console.log(
      "Project ID:",
      project?._id ||
        project?.id
    );

    console.log(
      "Task ID:",
      task?._id
    );

    console.log(
      "Location:",
      location
    );

    console.log(
      "========================================"
    );

    navigation.navigate(
      "Camera",
      {
        project,
        task,

        location,

        // Used by CameraScreen
        photoType: surveyType,

        // Also pass explicitly
        // for future screens/backend use.
        surveyType: surveyType,
      }
    );
  };

  // --------------------------------------------------
  // LOCATION SOURCE TEXT
  // --------------------------------------------------

  const getSourceText = () => {
    if (!location) {
      return "";
    }

    if (location.source === "GPS") {
      return "📡 Captured using device GPS";
    }

    if (location.source === "MAP") {
      return "🗺️ Selected manually on map";
    }

    if (
      location.source === "MANUAL"
    ) {
      return "⌨️ Entered manually";
    }

    return "📍 Location selected";
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ==========================================
          HEADER
      ========================================== */}

      <Text style={styles.heading}>
        Field Survey
      </Text>

      <Text style={styles.projectName}>
        {project?.name || "Project"}
      </Text>

      {/* ==========================================
          ASSIGNED TASK
      ========================================== */}

      {task && (
        <View style={styles.taskBox}>
          <Text style={styles.taskTitle}>
            📋 Assigned Task
          </Text>

          <Text style={styles.taskName}>
            {task.title ||
              "Field Survey Task"}
          </Text>

          <Text style={styles.taskInfo}>
            Original Task Type:{" "}
            {task.surveyType ||
              "MONITORING"}
          </Text>

          <Text style={styles.taskInfo}>
            Status:{" "}
            {task.status ||
              "IN_PROGRESS"}
          </Text>
        </View>
      )}

      {/* ==========================================
          SURVEY TYPE SELECTION
      ========================================== */}

      <View style={styles.typeCard}>
        <Text style={styles.typeTitle}>
          📋 Select Survey Type
        </Text>

        <Text style={styles.typeSubtitle}>
          Choose whether this survey represents
          the condition before work, after work,
          or regular monitoring.
        </Text>

        {/* BEFORE */}

        <TouchableOpacity
          style={[
            styles.typeButton,
            surveyType === "BEFORE" &&
              styles.beforeSelected,
          ]}
          onPress={() =>
            selectSurveyType("BEFORE")
          }
        >
          <View
            style={styles.typeButtonIcon}
          >
            <Text style={styles.iconText}>
              🟡
            </Text>
          </View>

          <View
            style={styles.typeButtonContent}
          >
            <Text
              style={[
                styles.typeButtonTitle,
                surveyType === "BEFORE" &&
                  styles.selectedText,
              ]}
            >
              BEFORE
            </Text>

            <Text
              style={[
                styles.typeButtonDescription,
                surveyType === "BEFORE" &&
                  styles.selectedDescription,
              ]}
            >
              Condition before watershed work
            </Text>
          </View>

          {surveyType === "BEFORE" && (
            <Text style={styles.check}>
              ✓
            </Text>
          )}
        </TouchableOpacity>

        {/* AFTER */}

        <TouchableOpacity
          style={[
            styles.typeButton,
            surveyType === "AFTER" &&
              styles.afterSelected,
          ]}
          onPress={() =>
            selectSurveyType("AFTER")
          }
        >
          <View
            style={styles.typeButtonIcon}
          >
            <Text style={styles.iconText}>
              🟢
            </Text>
          </View>

          <View
            style={styles.typeButtonContent}
          >
            <Text
              style={[
                styles.typeButtonTitle,
                surveyType === "AFTER" &&
                  styles.selectedText,
              ]}
            >
              AFTER
            </Text>

            <Text
              style={[
                styles.typeButtonDescription,
                surveyType === "AFTER" &&
                  styles.selectedDescription,
              ]}
            >
              Condition after watershed work
            </Text>
          </View>

          {surveyType === "AFTER" && (
            <Text style={styles.check}>
              ✓
            </Text>
          )}
        </TouchableOpacity>

        {/* MONITORING */}

        <TouchableOpacity
          style={[
            styles.typeButton,
            surveyType === "MONITORING" &&
              styles.monitoringSelected,
          ]}
          onPress={() =>
            selectSurveyType("MONITORING")
          }
        >
          <View
            style={styles.typeButtonIcon}
          >
            <Text style={styles.iconText}>
              🔵
            </Text>
          </View>

          <View
            style={styles.typeButtonContent}
          >
            <Text
              style={[
                styles.typeButtonTitle,
                surveyType === "MONITORING" &&
                  styles.selectedText,
              ]}
            >
              MONITORING
            </Text>

            <Text
              style={[
                styles.typeButtonDescription,
                surveyType === "MONITORING" &&
                  styles.selectedDescription,
              ]}
            >
              Current regular monitoring condition
            </Text>
          </View>

          {surveyType === "MONITORING" && (
            <Text style={styles.check}>
              ✓
            </Text>
          )}
        </TouchableOpacity>

        {/* CURRENT SELECTION */}

        <View style={styles.currentTypeBox}>
          <Text style={styles.currentTypeText}>
            {getSurveyIcon()} Selected:{" "}
            {surveyType}
          </Text>

          <Text
            style={styles.typeDescription}
          >
            {getSurveyDescription()}
          </Text>
        </View>
      </View>

      {/* ==========================================
          LOCATION CARD
      ========================================== */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          📍 Survey Location
        </Text>

        {!location ? (
          <Text style={styles.info}>
            No survey location selected yet.
          </Text>
        ) : (
          <>
            <Text style={styles.locationText}>
              Latitude:{" "}
              {Number(
                location.latitude
              ).toFixed(6)}
            </Text>

            <Text style={styles.locationText}>
              Longitude:{" "}
              {Number(
                location.longitude
              ).toFixed(6)}
            </Text>

            {location.accuracy !==
              null &&
              location.accuracy !==
                undefined && (
                <Text
                  style={
                    styles.locationText
                  }
                >
                  Accuracy:{" "}
                  {Number(
                    location.accuracy
                  ).toFixed(1)}{" "}
                  meters
                </Text>
              )}

            <View
              style={
                styles.sourceBox
              }
            >
              <Text
                style={
                  styles.sourceText
                }
              >
                {getSourceText()}
              </Text>
            </View>

            <View
              style={
                styles.successBox
              }
            >
              <Text
                style={
                  styles.successText
                }
              >
                ✓ Location selected
              </Text>
            </View>
          </>
        )}
      </View>

      {/* ==========================================
          LOCATION OPTIONS
      ========================================== */}

      <Text style={styles.sectionTitle}>
        Select Location Method
      </Text>

      {/* GPS */}

      <TouchableOpacity
        style={[
          styles.locationButton,
          styles.gpsButton,
          loading &&
            styles.disabledButton,
        ]}
        onPress={captureLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <>
            <Text
              style={
                styles.locationButtonIcon
              }
            >
              📡
            </Text>

            <View
              style={
                styles.buttonContent
              }
            >
              <Text
                style={
                  styles.locationButtonTitle
                }
              >
                Use Current GPS
              </Text>

              <Text
                style={
                  styles.locationButtonSubtitle
                }
              >
                Capture your phone's
                current location
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* MAP */}

      <TouchableOpacity
        style={[
          styles.locationButton,
          styles.mapButton,
        ]}
        onPress={openMapPicker}
      >
        <Text
          style={
            styles.locationButtonIcon
          }
        >
          🗺️
        </Text>

        <View
          style={
            styles.buttonContent
          }
        >
          <Text
            style={
              styles.locationButtonTitle
            }
          >
            Select Location on Map
          </Text>

          <Text
            style={
              styles.locationButtonSubtitle
            }
          >
            Tap anywhere on the map
          </Text>
        </View>
      </TouchableOpacity>

      {/* MANUAL */}

      <TouchableOpacity
        style={[
          styles.locationButton,
          styles.manualButton,
        ]}
        onPress={
          openManualLocation
        }
      >
        <Text
          style={
            styles.locationButtonIcon
          }
        >
          ⌨️
        </Text>

        <View
          style={
            styles.buttonContent
          }
        >
          <Text
            style={
              styles.locationButtonTitle
            }
          >
            Enter Latitude & Longitude
          </Text>

          <Text
            style={
              styles.locationButtonSubtitle
            }
          >
            Enter coordinates manually
          </Text>
        </View>
      </TouchableOpacity>

      {/* ==========================================
          CONTINUE
      ========================================== */}

      {location && (
        <TouchableOpacity
          style={
            styles.nextButton
          }
          onPress={
            continueToCamera
          }
        >
          <Text
            style={
              styles.buttonText
            }
          >
            Continue to{" "}
            {surveyType} Camera →
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      "#F4F8F3",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  heading: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 30,
    color: "#222",
  },

  projectName: {
    fontSize: 18,
    color: "#555",
    marginTop: 5,
    marginBottom: 15,
  },

  // ----------------------------------------------
  // TASK
  // ----------------------------------------------

  taskBox: {
    backgroundColor:
      "#E8F5E9",
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
  },

  taskTitle: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "700",
    marginBottom: 6,
  },

  taskName: {
    fontSize: 17,
    color: "#222",
    fontWeight: "700",
    marginBottom: 8,
  },

  taskInfo: {
    fontSize: 13,
    color: "#555",
    marginTop: 3,
  },

  // ----------------------------------------------
  // SURVEY TYPE
  // ----------------------------------------------

  typeCard: {
    backgroundColor:
      "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
  },

  typeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 5,
  },

  typeSubtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 19,
    marginBottom: 14,
  },

  typeButton: {
    minHeight: 70,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#DDDDDD",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  beforeSelected: {
    borderColor: "#F9A825",
    backgroundColor: "#FFF8E1",
  },

  afterSelected: {
    borderColor: "#2E7D32",
    backgroundColor: "#E8F5E9",
  },

  monitoringSelected: {
    borderColor: "#1565C0",
    backgroundColor: "#E3F2FD",
  },

  typeButtonIcon: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  iconText: {
    fontSize: 24,
  },

  typeButtonContent: {
    flex: 1,
    marginLeft: 6,
  },

  typeButtonTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },

  typeButtonDescription: {
    fontSize: 11,
    color: "#777",
    marginTop: 3,
  },

  selectedText: {
    color: "#222",
  },

  selectedDescription: {
    color: "#555",
  },

  check: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: 8,
  },

  currentTypeBox: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },

  currentTypeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  typeDescription: {
    marginTop: 5,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },

  // ----------------------------------------------
  // LOCATION CARD
  // ----------------------------------------------

  card: {
    backgroundColor:
      "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#222",
  },

  info: {
    color: "#777",
    lineHeight: 22,
  },

  locationText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },

  sourceBox: {
    backgroundColor:
      "#E3F2FD",
    padding: 10,
    borderRadius: 10,
    marginTop: 3,
  },

  sourceText: {
    color: "#1565C0",
    fontWeight: "600",
  },

  successBox: {
    backgroundColor:
      "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },

  successText: {
    color: "#2E7D32",
    fontWeight: "bold",
  },

  // ----------------------------------------------
  // SECTION
  // ----------------------------------------------

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12,
  },

  // ----------------------------------------------
  // LOCATION BUTTONS
  // ----------------------------------------------

  locationButton: {
    minHeight: 78,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },

  gpsButton: {
    backgroundColor:
      "#2E7D32",
  },

  mapButton: {
    backgroundColor:
      "#1565C0",
  },

  manualButton: {
    backgroundColor:
      "#6A1B9A",
  },

  locationButtonIcon: {
    fontSize: 28,
    width: 45,
    textAlign: "center",
  },

  buttonContent: {
    flex: 1,
    marginLeft: 8,
  },

  locationButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  locationButtonSubtitle: {
    color: "#FFFFFF",
    opacity: 0.85,
    fontSize: 12,
    marginTop: 4,
  },

  disabledButton: {
    opacity: 0.7,
  },

  // ----------------------------------------------
  // NEXT
  // ----------------------------------------------

  nextButton: {
    backgroundColor:
      "#1565C0",
    padding: 17,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});