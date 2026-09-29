import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";

import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import { WebView } from "react-native-webview";

import api from "../services/api";

// ============================================================
// PROJECT TYPES
// ============================================================

const PROJECT_TYPES = [
  "Check Dam",
  "Farm Pond",
  "Recharge Structure",
  "Contour Bund",
  "Plantation",
  "Percolation Tank",
  "Other",
];

// ============================================================
// HELPERS
// ============================================================

const formatDate = (date) => {
  if (!date) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getMinimumDeadline = () => {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
};

// ============================================================
// LEAFLET MAP HTML (OpenStreetMap - no Google API key needed)
// ============================================================

const buildMapHTML = (lat, lng, hasMarker) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map("map").setView([${lat}, ${lng}], ${hasMarker ? 16 : 13});

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  var marker = null;
  ${
    hasMarker
      ? "marker = L.marker([" + lat + "," + lng + "]).addTo(map);"
      : ""
  }

  map.on("click", function (e) {
    var la = e.latlng.lat;
    var lo = e.latlng.lng;

    if (marker) {
      marker.setLatLng([la, lo]);
    } else {
      marker = L.marker([la, lo]).addTo(map);
    }

    window.ReactNativeWebView.postMessage(
      JSON.stringify({ latitude: la, longitude: lo })
    );
  });
</script>
</body>
</html>`;

// ============================================================
// MAIN SCREEN
// ============================================================

export default function CreateProjectScreen({ navigation }) {
  // ==========================================================
  // PROJECT DETAILS
  // ==========================================================

  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState("Check Dam");
  const [description, setDescription] = useState("");

  // ==========================================================
  // DEADLINE
  // ==========================================================

  const [deadline, setDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ==========================================================
  // LOCATION
  // ==========================================================

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [gettingLocation, setGettingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==========================================================
  // MAP
  // ==========================================================

  const [showMap, setShowMap] = useState(false);

  // HTML is stored in state so the map does not reload
  // every time the coordinates change after a tap.
  const [mapHtml, setMapHtml] = useState("");

  // ==========================================================
  // CAPTURE CURRENT GPS
  // ==========================================================

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please allow location permission to capture your current GPS location."
        );

        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      setLatitude(lat.toFixed(7));
      setLongitude(lng.toFixed(7));

      Alert.alert(
        "Location Captured",
        `Latitude: ${lat.toFixed(7)}\nLongitude: ${lng.toFixed(7)}`
      );
    } catch (error) {
      console.log("GPS ERROR:", error);

      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please try again."
      );
    } finally {
      setGettingLocation(false);
    }
  };

  // ============================================================
  // OPEN MAP
  // ============================================================

  const openMap = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const valid =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    setMapHtml(
      buildMapHTML(
        valid ? lat : 26.8467,
        valid ? lng : 80.9462,
        valid
      )
    );

    setShowMap(true);
  };

  // ============================================================
  // MAP MESSAGE (tap on Leaflet map)
  // ============================================================

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      const lat = Number(data.latitude);
      const lng = Number(data.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      setLatitude(lat.toFixed(7));
      setLongitude(lng.toFixed(7));
    } catch (error) {
      console.log("Map message error:", error);
    }
  };

  // ============================================================
  // DATE PICKER
  // ============================================================

  const handleDeadlineChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (!selectedDate) {
      return;
    }

    const today = getMinimumDeadline();

    if (selectedDate < today) {
      Alert.alert(
        "Invalid Deadline",
        "Project deadline cannot be in the past."
      );

      return;
    }

    setDeadline(selectedDate);
  };

  const confirmIOSDate = () => {
    setShowDatePicker(false);
  };

  // ============================================================
  // VALIDATE COORDINATES
  // ============================================================

  const validateCoordinates = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert(
        "Invalid Location",
        "Please enter valid latitude and longitude."
      );

      return false;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert(
        "Invalid Latitude",
        "Latitude must be between -90 and 90."
      );

      return false;
    }

    if (lng < -180 || lng > 180) {
      Alert.alert(
        "Invalid Longitude",
        "Longitude must be between -180 and 180."
      );

      return false;
    }

    return true;
  };

  // ============================================================
  // VALIDATE FORM
  // ============================================================

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert(
        "Project Name Required",
        "Please enter the watershed project name."
      );

      return false;
    }

    if (!village.trim()) {
      Alert.alert(
        "Village Required",
        "Please enter the village name."
      );

      return false;
    }

    if (!district.trim()) {
      Alert.alert(
        "District Required",
        "Please enter the district name."
      );

      return false;
    }

    if (!deadline) {
      Alert.alert(
        "Deadline Required",
        "Please select a project completion deadline."
      );

      return false;
    }

    if (!validateCoordinates()) {
      return false;
    }

    return true;
  };

  // ============================================================
  // CREATE PROJECT
  // ============================================================

  const handleCreateProject = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const response = await api.post("/projects", {
        name: name.trim(),

        village: village.trim(),

        district: district.trim(),

        state: "Uttar Pradesh",

        type,

        latitude: parseFloat(latitude),

        longitude: parseFloat(longitude),

        description: description.trim(),

        // Send ISO date to backend
        deadline: deadline.toISOString(),
      });

      console.log("PROJECT CREATED:", response.data);

      Alert.alert(
        "Project Created",
        "Watershed project has been created successfully.",
        [
          {
            text: "View Projects",
            onPress: () => {
              navigation.replace("Projects");
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "CREATE PROJECT ERROR:",
        error?.response?.data || error.message
      );

      Alert.alert(
        "Creation Failed",
        error?.response?.data?.message ||
          "Unable to create project. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // MAP SCREEN
  // ============================================================

  if (showMap) {
    return (
      <View style={styles.mapContainer}>

        {/* MAP HEADER */}
        <View style={styles.mapHeader}>

          <TouchableOpacity
            style={styles.mapBackButton}
            onPress={() => setShowMap(false)}
          >
            <Text style={styles.mapBackText}>←</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.mapTitle}>
              Select Location
            </Text>

            <Text style={styles.mapSubtitle}>
              Tap anywhere to place the project
            </Text>
          </View>

        </View>

        {/* MAP (Leaflet + OpenStreetMap) */}
        <WebView
          style={styles.map}
          originWhitelist={["*"]}
          source={{
            html: mapHtml,
            baseUrl: "https://localhost",
          }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          onMessage={handleMapMessage}
          onError={(e) =>
            console.log("WebView error:", e.nativeEvent)
          }
          onHttpError={(e) =>
            console.log("HTTP error:", e.nativeEvent)
          }
        />

        {/* BOTTOM CARD */}
        <View style={styles.locationBottomCard}>

          <View style={styles.mapInstructionIcon}>
            <Text style={styles.mapInstructionIconText}>
              📍
            </Text>
          </View>

          <Text style={styles.bottomTitle}>
            Select Project Location
          </Text>

          <Text style={styles.bottomSubtitle}>
            Tap on the map to set the exact project
            coordinates.
          </Text>

          <View style={styles.coordinateRow}>

            <View style={styles.coordinateBox}>
              <Text style={styles.coordinateLabel}>
                LATITUDE
              </Text>

              <Text style={styles.coordinateValue}>
                {latitude || "--"}
              </Text>
            </View>

            <View style={styles.coordinateBox}>
              <Text style={styles.coordinateLabel}>
                LONGITUDE
              </Text>

              <Text style={styles.coordinateValue}>
                {longitude || "--"}
              </Text>
            </View>

          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!latitude || !longitude) &&
                styles.disabledButton,
            ]}
            disabled={!latitude || !longitude}
            onPress={() => {
              setShowMap(false);
            }}
          >
            <Text style={styles.confirmButtonText}>
              ✓  Confirm Location
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    );
  }

  // ============================================================
  // MAIN FORM
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <View style={styles.headerSection}>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🌊</Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              Create Watershed Project
            </Text>

            <Text style={styles.subtitle}>
              Add project details, location and
              completion deadline.
            </Text>
          </View>

        </View>

        {/* ====================================================
            SECTION 1 - BASIC DETAILS
        ==================================================== */}

        <View style={styles.card}>

          <View style={styles.sectionHeader}>

            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>1</Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Project Details
              </Text>

              <Text style={styles.sectionSubtitle}>
                Basic information about the project
              </Text>
            </View>

          </View>

          {/* PROJECT NAME */}
          <Text style={styles.label}>Project Name *</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Ramganga Check Dam"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          {/* VILLAGE */}
          <Text style={styles.label}>Village *</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter village name"
            placeholderTextColor="#9CA3AF"
            value={village}
            onChangeText={setVillage}
          />

          {/* DISTRICT */}
          <Text style={styles.label}>District *</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter district"
            placeholderTextColor="#9CA3AF"
            value={district}
            onChangeText={setDistrict}
          />

          {/* PROJECT TYPE */}
          <Text style={styles.label}>Project Type *</Text>

          <View style={styles.typeContainer}>
            {PROJECT_TYPES.map((item) => {
              const selected = type === item;

              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  style={[
                    styles.typeButton,
                    selected && styles.selectedTypeButton,
                  ]}
                  onPress={() => setType(item)}
                >
                  {selected && (
                    <Text style={styles.typeCheck}>✓</Text>
                  )}

                  <Text
                    style={[
                      styles.typeButtonText,
                      selected &&
                        styles.selectedTypeButtonText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </View>

        {/* ====================================================
            SECTION 2 - DEADLINE
        ==================================================== */}

        <View style={styles.card}>

          <View style={styles.sectionHeader}>

            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>2</Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Project Deadline
              </Text>

              <Text style={styles.sectionSubtitle}>
                Set the expected completion date
              </Text>
            </View>

          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.deadlineButton,
              deadline && styles.deadlineButtonSelected,
            ]}
            onPress={() => setShowDatePicker(true)}
          >

            <View style={styles.deadlineIcon}>
              <Text style={styles.deadlineIconText}>📅</Text>
            </View>

            <View style={styles.deadlineTextContainer}>

              <Text style={styles.deadlineLabel}>
                COMPLETION DEADLINE
              </Text>

              <Text
                style={[
                  styles.deadlineValue,
                  !deadline && styles.deadlinePlaceholder,
                ]}
              >
                {deadline
                  ? formatDate(deadline)
                  : "Select deadline date"}
              </Text>

            </View>

            <Text style={styles.calendarArrow}>›</Text>

          </TouchableOpacity>

          {deadline && (
            <View style={styles.deadlineInfo}>
              <Text style={styles.deadlineInfoIcon}>⏱</Text>

              <Text style={styles.deadlineInfoText}>
                Project should be completed by{" "}
                <Text style={styles.boldText}>
                  {formatDate(deadline)}
                </Text>
              </Text>
            </View>
          )}

          {showDatePicker && (
            <View style={styles.datePickerContainer}>

              <DateTimePicker
                value={deadline || getMinimumDeadline()}
                mode="date"
                display={
                  Platform.OS === "ios" ? "spinner" : "default"
                }
                minimumDate={getMinimumDeadline()}
                onChange={handleDeadlineChange}
              />

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.dateDoneButton}
                  onPress={confirmIOSDate}
                >
                  <Text style={styles.dateDoneButtonText}>
                    Done
                  </Text>
                </TouchableOpacity>
              )}

            </View>
          )}

        </View>

        {/* ====================================================
            SECTION 3 - LOCATION
        ==================================================== */}

        <View style={styles.card}>

          <View style={styles.sectionHeader}>

            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>3</Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Project Location
              </Text>

              <Text style={styles.sectionSubtitle}>
                Capture or select the exact GPS location
              </Text>
            </View>

          </View>

          {/* LOCATION STATUS */}
          {latitude && longitude ? (
            <View style={styles.locationSuccessCard}>

              <View style={styles.locationSuccessIcon}>
                <Text>✓</Text>
              </View>

              <View style={styles.locationSuccessText}>
                <Text style={styles.locationSuccessTitle}>
                  Location Selected
                </Text>

                <Text style={styles.locationCoordinates}>
                  {latitude}, {longitude}
                </Text>
              </View>

            </View>
          ) : (
            <View style={styles.locationEmptyCard}>

              <Text style={styles.locationEmptyIcon}>📍</Text>

              <Text style={styles.locationEmptyTitle}>
                No location selected
              </Text>

              <Text style={styles.locationEmptyText}>
                Capture your GPS or select a point
                from the map.
              </Text>

            </View>
          )}

          {/* GPS BUTTON */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.gpsButton}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>📍</Text>

                <Text style={styles.gpsButtonText}>
                  Capture Current GPS
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* MAP BUTTON */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.mapButton}
            onPress={openMap}
          >
            <Text style={styles.mapButtonIcon}>🗺️</Text>

            <Text style={styles.mapButtonText}>
              Select Location on Map
            </Text>
          </TouchableOpacity>

          {/* MANUAL */}
          <View style={styles.orContainer}>
            <View style={styles.orLine} />

            <Text style={styles.orText}>
              OR ENTER MANUALLY
            </Text>

            <View style={styles.orLine} />
          </View>

          <View style={styles.coordinateInputRow}>

            <View style={styles.coordinateInputWrapper}>
              <Text style={styles.smallLabel}>Latitude</Text>

              <TextInput
                style={styles.input}
                placeholder="26.9157508"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={latitude}
                onChangeText={setLatitude}
              />
            </View>

            <View style={styles.coordinateInputWrapper}>
              <Text style={styles.smallLabel}>Longitude</Text>

              <TextInput
                style={styles.input}
                placeholder="80.9398416"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={longitude}
                onChangeText={setLongitude}
              />
            </View>

          </View>

        </View>

        {/* ====================================================
            SECTION 4 - DESCRIPTION
        ==================================================== */}

        <View style={styles.card}>

          <View style={styles.sectionHeader}>

            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>4</Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Project Description
              </Text>

              <Text style={styles.sectionSubtitle}>
                Add additional project information
              </Text>
            </View>

          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the watershed project, objectives, expected outcomes, etc."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={styles.characterHint}>
            Optional • Add useful information for
            officers and field workers
          </Text>

        </View>

        {/* ====================================================
            SATELLITE CARD
        ==================================================== */}

        <View style={styles.satelliteCard}>

          <View style={styles.satelliteIconBox}>
            <Text style={styles.satelliteIcon}>🛰️</Text>
          </View>

          <View style={styles.satelliteContent}>

            <Text style={styles.satelliteTitle}>
              Satellite Monitoring Enabled
            </Text>

            <Text style={styles.satelliteText}>
              The project coordinates will be used
              for Sentinel-2 analysis, NDVI monitoring
              and before/after watershed comparison.
            </Text>

          </View>

        </View>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <View style={styles.summaryCard}>

          <Text style={styles.summaryTitle}>
            Project Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Project</Text>

            <Text style={styles.summaryValue}>
              {name || "Not entered"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Type</Text>

            <Text style={styles.summaryValue}>{type}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deadline</Text>

            <Text
              style={[
                styles.summaryValue,
                deadline && styles.summaryDeadline,
              ]}
            >
              {deadline
                ? formatDate(deadline)
                : "Not selected"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>

            <Text style={styles.summaryValue}>
              {latitude && longitude
                ? "Selected"
                : "Not selected"}
            </Text>
          </View>

        </View>

        {/* ====================================================
            CREATE BUTTON
        ==================================================== */}

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.createButton,
            saving && styles.disabledButton,
          ]}
          onPress={handleCreateProject}
          disabled={saving}
        >

          {saving ? (
            <>
              <ActivityIndicator color="#FFFFFF" />

              <Text style={styles.createButtonText}>
                Creating Project...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.createButtonIcon}>✓</Text>

              <Text style={styles.createButtonText}>
                Create Watershed Project
              </Text>
            </>
          )}

        </TouchableOpacity>

        <Text style={styles.requiredHint}>
          * Required fields
        </Text>

        <View style={{ height: 40 }} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingTop: 8,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#DDF4F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerIconText: {
    fontSize: 27,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#16324F",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },

  // ==========================================================
  // CARD
  // ==========================================================

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: "#E8EDF2",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,

    elevation: 2,
  },

  // ==========================================================
  // SECTION HEADER
  // ==========================================================

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#176B87",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  sectionNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17324D",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#8A94A3",
    marginTop: 2,
  },

  // ==========================================================
  // INPUT
  // ==========================================================

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#DCE2E8",
    borderRadius: 11,

    paddingHorizontal: 13,
    paddingVertical: 12,

    fontSize: 14,
    color: "#111827",
  },

  textArea: {
    minHeight: 120,
    paddingTop: 13,
  },

  characterHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 7,
  },

  smallLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 7,
  },

  // ==========================================================
  // PROJECT TYPES
  // ==========================================================

  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 3,
  },

  typeButton: {
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#D8E0E7",

    borderRadius: 22,

    paddingHorizontal: 13,
    paddingVertical: 9,

    marginRight: 7,
    marginBottom: 8,

    backgroundColor: "#FFFFFF",
  },

  selectedTypeButton: {
    backgroundColor: "#176B87",
    borderColor: "#176B87",
  },

  typeButtonText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },

  selectedTypeButtonText: {
    color: "#FFFFFF",
  },

  typeCheck: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginRight: 5,
  },

  // ==========================================================
  // DEADLINE
  // ==========================================================

  deadlineButton: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFF9ED",

    borderWidth: 1,
    borderColor: "#F4D99A",

    borderRadius: 14,

    padding: 13,
  },

  deadlineButtonSelected: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBE5C6",
  },

  deadlineIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  deadlineIconText: {
    fontSize: 21,
  },

  deadlineTextContainer: {
    flex: 1,
  },

  deadlineLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8A6B24",
    letterSpacing: 0.6,
    marginBottom: 3,
  },

  deadlineValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#17324D",
  },

  deadlinePlaceholder: {
    color: "#8A94A3",
    fontWeight: "600",
    fontSize: 14,
  },

  calendarArrow: {
    fontSize: 27,
    color: "#64748B",
  },

  deadlineInfo: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#F8FAFC",

    borderRadius: 10,

    padding: 10,

    marginTop: 10,
  },

  deadlineInfoIcon: {
    fontSize: 16,
    marginRight: 7,
  },

  deadlineInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },

  boldText: {
    fontWeight: "800",
    color: "#334155",
  },

  datePickerContainer: {
    marginTop: 12,
    alignItems: "center",
  },

  dateDoneButton: {
    backgroundColor: "#176B87",
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 9,
    marginTop: 5,
  },

  dateDoneButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // ==========================================================
  // LOCATION
  // ==========================================================

  locationSuccessCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#ECFDF5",

    borderWidth: 1,
    borderColor: "#B7E8CF",

    borderRadius: 12,

    padding: 12,

    marginBottom: 12,
  },

  locationSuccessIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  locationSuccessText: {
    flex: 1,
  },

  locationSuccessTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
  },

  locationCoordinates: {
    fontSize: 11,
    color: "#065F46",
    marginTop: 3,
  },

  locationEmptyCard: {
    alignItems: "center",

    backgroundColor: "#F8FAFC",

    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",

    borderRadius: 13,

    padding: 17,

    marginBottom: 12,
  },

  locationEmptyIcon: {
    fontSize: 26,
    marginBottom: 5,
  },

  locationEmptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },

  locationEmptyText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 3,
  },

  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#176B87",

    borderRadius: 11,

    paddingVertical: 13,

    marginBottom: 9,
  },

  buttonIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  gpsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#176B87",

    borderRadius: 11,

    paddingVertical: 13,
  },

  mapButtonIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  mapButtonText: {
    color: "#176B87",
    fontSize: 14,
    fontWeight: "800",
  },

  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  orText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9CA3AF",
    marginHorizontal: 9,
  },

  coordinateInputRow: {
    flexDirection: "row",
    gap: 10,
  },

  coordinateInputWrapper: {
    flex: 1,
  },

  // ==========================================================
  // SATELLITE
  // ==========================================================

  satelliteCard: {
    flexDirection: "row",

    backgroundColor: "#EFF6FF",

    borderWidth: 1,
    borderColor: "#C7DDFF",

    borderRadius: 17,

    padding: 15,

    marginBottom: 14,
  },

  satelliteIconBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 11,
  },

  satelliteIcon: {
    fontSize: 22,
  },

  satelliteContent: {
    flex: 1,
  },

  satelliteTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1D4ED8",
    marginBottom: 4,
  },

  satelliteText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#315A9E",
  },

  // ==========================================================
  // SUMMARY
  // ==========================================================

  summaryCard: {
    backgroundColor: "#17324D",

    borderRadius: 17,

    padding: 16,

    marginBottom: 14,
  },

  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",

    paddingVertical: 8,

    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  summaryLabel: {
    color: "#B8C7D6",
    fontSize: 12,
  },

  summaryValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },

  summaryDeadline: {
    color: "#A7F3D0",
  },

  // ==========================================================
  // CREATE
  // ==========================================================

  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#0F766E",

    borderRadius: 13,

    paddingVertical: 15,

    shadowColor: "#0F766E",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,

    elevation: 3,
  },

  createButtonIcon: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginRight: 8,
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  requiredHint: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 9,
  },

  disabledButton: {
    opacity: 0.5,
  },

  // ==========================================================
  // MAP SCREEN
  // ==========================================================

  mapContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  mapHeader: {
    minHeight: 70,

    paddingHorizontal: 15,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",

    zIndex: 10,
  },

  mapBackButton: {
    width: 42,
    height: 42,

    borderRadius: 12,

    backgroundColor: "#F1F5F9",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 11,
  },

  mapBackText: {
    fontSize: 26,
    color: "#17324D",
    marginTop: -2,
  },

  mapTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17324D",
  },

  mapSubtitle: {
    fontSize: 11,
    color: "#8A94A3",
    marginTop: 2,
  },

  map: {
    flex: 1,
  },

  locationBottomCard: {
    backgroundColor: "#FFFFFF",

    padding: 18,

    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,

    elevation: 10,
  },

  mapInstructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,

    backgroundColor: "#E6F4F5",

    justifyContent: "center",
    alignItems: "center",

    alignSelf: "center",

    marginBottom: 7,
  },

  mapInstructionIconText: {
    fontSize: 19,
  },

  bottomTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#17324D",
    textAlign: "center",
  },

  bottomSubtitle: {
    fontSize: 11,
    color: "#8A94A3",
    textAlign: "center",
    marginTop: 3,
    marginBottom: 13,
  },

  coordinateRow: {
    flexDirection: "row",
    gap: 9,
  },

  coordinateBox: {
    flex: 1,

    backgroundColor: "#F8FAFC",

    borderWidth: 1,
    borderColor: "#E2E8F0",

    borderRadius: 11,

    padding: 10,
  },

  coordinateLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    marginBottom: 4,
  },

  coordinateValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },

  confirmButton: {
    backgroundColor: "#0F766E",

    paddingVertical: 14,

    borderRadius: 11,

    alignItems: "center",

    marginTop: 12,
  },

  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});