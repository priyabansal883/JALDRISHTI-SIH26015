import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { WebView } from "react-native-webview";

export default function LocationPickerScreen({
  route,
  navigation,
}) {
  // ==================================================
  // RECEIVE PARAMETERS
  // ==================================================

  const {
    project,
    task,
    initialLocation,
    mode = "MAP",
  } = route.params || {};

  console.log("===================================");
  console.log("===== LOCATION PICKER PARAMS =====");
  console.log("Project:", project);
  console.log("Task:", task);
  console.log("Mode:", mode);
  console.log("Initial Location:", initialLocation);
  console.log("===================================");

  // ==================================================
  // DEFAULT LOCATION
  // ==================================================

  const defaultLatitude = Number(
    initialLocation?.latitude ??
      project?.latitude ??
      26.8467
  );

  const defaultLongitude = Number(
    initialLocation?.longitude ??
      project?.longitude ??
      80.9462
  );

  // ==================================================
  // SELECTED COORDINATE
  // ==================================================

  const [selectedCoordinate, setSelectedCoordinate] =
    useState({
      latitude: defaultLatitude,
      longitude: defaultLongitude,
    });

  // ==================================================
  // MANUAL INPUT
  // ==================================================

  const [latitude, setLatitude] = useState(
    String(defaultLatitude)
  );

  const [longitude, setLongitude] = useState(
    String(defaultLongitude)
  );

  // ==================================================
  // LEAFLET MAP MESSAGE
  // ==================================================

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "locationSelected") {
        const newLatitude = Number(data.latitude);
        const newLongitude = Number(data.longitude);

        if (
          !Number.isFinite(newLatitude) ||
          !Number.isFinite(newLongitude)
        ) {
          return;
        }

        const coordinate = {
          latitude: newLatitude,
          longitude: newLongitude,
        };

        setSelectedCoordinate(coordinate);

        setLatitude(newLatitude.toFixed(6));
        setLongitude(newLongitude.toFixed(6));

        console.log(
          "LEAFLET LOCATION SELECTED:",
          coordinate
        );
      }
    } catch (error) {
      console.log(
        "Leaflet message error:",
        error
      );
    }
  };

  // ==================================================
  // MANUAL COORDINATES
  // ==================================================

  const useManualCoordinates = () => {
    const lat = Number(latitude);
    const lon = Number(longitude);

    // -----------------------------------------------
    // LATITUDE VALIDATION
    // -----------------------------------------------

    if (
      latitude.trim() === "" ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      Alert.alert(
        "Invalid Latitude",
        "Latitude must be between -90 and 90."
      );

      return;
    }

    // -----------------------------------------------
    // LONGITUDE VALIDATION
    // -----------------------------------------------

    if (
      longitude.trim() === "" ||
      !Number.isFinite(lon) ||
      lon < -180 ||
      lon > 180
    ) {
      Alert.alert(
        "Invalid Longitude",
        "Longitude must be between -180 and 180."
      );

      return;
    }

    const coordinate = {
      latitude: lat,
      longitude: lon,
    };

    setSelectedCoordinate(coordinate);

    // Update Leaflet map marker and center
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "setLocation",
          latitude: lat,
          longitude: lon,
        })
      );
    }

    Alert.alert(
      "Location Set ✅",
      `Latitude: ${lat.toFixed(
        6
      )}\nLongitude: ${lon.toFixed(6)}`
    );

    console.log(
      "MANUAL LOCATION SELECTED:",
      coordinate
    );
  };

  // ==================================================
  // WEBVIEW REF
  // ==================================================

  const webViewRef = React.useRef(null);

  // ==================================================
  // CONFIRM LOCATION
  // ==================================================

  const confirmLocation = () => {
    if (!selectedCoordinate) {
      Alert.alert(
        "Location Required",
        "Please select a location first."
      );

      return;
    }

    const latitudeValue = Number(
      selectedCoordinate.latitude
    );

    const longitudeValue = Number(
      selectedCoordinate.longitude
    );

    // -----------------------------------------------
    // FINAL VALIDATION
    // -----------------------------------------------

    if (
      !Number.isFinite(latitudeValue) ||
      latitudeValue < -90 ||
      latitudeValue > 90
    ) {
      Alert.alert(
        "Invalid Latitude",
        "Please select a valid location."
      );

      return;
    }

    if (
      !Number.isFinite(longitudeValue) ||
      longitudeValue < -180 ||
      longitudeValue > 180
    ) {
      Alert.alert(
        "Invalid Longitude",
        "Please select a valid location."
      );

      return;
    }

    // -----------------------------------------------
    // DETERMINE SOURCE
    // -----------------------------------------------

    const source =
      mode === "MANUAL"
        ? "MANUAL"
        : "MAP";

    // -----------------------------------------------
    // FINAL LOCATION OBJECT
    // -----------------------------------------------

    const selectedLocation = {
      latitude: latitudeValue,
      longitude: longitudeValue,
      accuracy: null,
      source,
      timestamp: new Date().toISOString(),
    };

    // -----------------------------------------------
    // DEBUG
    // -----------------------------------------------

    console.log("===================================");
    console.log("===== RETURNING TO SURVEY =====");
    console.log("Project:", project);
    console.log("Task:", task);
    console.log(
      "Selected Location:",
      selectedLocation
    );
    console.log("===================================");

    // -----------------------------------------------
    // RETURN TO SURVEY
    // -----------------------------------------------

    navigation.navigate("Survey", {
      project: project,
      task: task,
      selectedLocation: selectedLocation,
    });
  };

  // ==================================================
  // LEAFLET HTML
  // ==================================================

  const leafletHTML = `
<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
</script>

<style>

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

#map {
  width: 100%;
  height: 100%;
}

.leaflet-control-attribution {
  font-size: 10px;
}

</style>

</head>

<body>

<div id="map"></div>

<script>

const defaultLatitude = ${defaultLatitude};
const defaultLongitude = ${defaultLongitude};

const map = L.map("map", {
  zoomControl: true,
  attributionControl: true
}).setView(
  [defaultLatitude, defaultLongitude],
  15
);

// ==================================================
// OPENSTREETMAP
// ==================================================

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; OpenStreetMap contributors'
  }
).addTo(map);

// ==================================================
// MARKER ICON
// ==================================================

const markerIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],

  iconAnchor: [12, 41],

  popupAnchor: [1, -34],

  shadowSize: [41, 41]
});

// ==================================================
// INITIAL MARKER
// ==================================================

let selectedMarker = L.marker(
  [
    defaultLatitude,
    defaultLongitude
  ],
  {
    icon: markerIcon
  }
).addTo(map);

selectedMarker
  .bindPopup(
    "Selected Survey Location"
  )
  .openPopup();

// ==================================================
// SEND LOCATION TO REACT NATIVE
// ==================================================

function sendLocation(latitude, longitude) {

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: "locationSelected",
      latitude: latitude,
      longitude: longitude
    })
  );

}

// ==================================================
// MAP CLICK
// ==================================================

map.on("click", function(e) {

  const latitude =
    Number(e.latlng.lat.toFixed(6));

  const longitude =
    Number(e.latlng.lng.toFixed(6));

  // Move marker
  selectedMarker.setLatLng([
    latitude,
    longitude
  ]);

  // Update popup
  selectedMarker
    .bindPopup(
      "Selected Survey Location<br>" +
      latitude.toFixed(6) +
      ", " +
      longitude.toFixed(6)
    )
    .openPopup();

  // Send coordinates to React Native
  sendLocation(
    latitude,
    longitude
  );

});

// ==================================================
// RECEIVE MANUAL COORDINATES
// ==================================================

document.addEventListener(
  "message",
  function(event) {

    try {

      const data =
        JSON.parse(event.data);

      if (
        data.type ===
        "setLocation"
      ) {

        const latitude =
          Number(data.latitude);

        const longitude =
          Number(data.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return;
        }

        // Move marker
        selectedMarker.setLatLng([
          latitude,
          longitude
        ]);

        // Move map
        map.setView(
          [
            latitude,
            longitude
          ],
          15
        );

        // Update popup
        selectedMarker
          .bindPopup(
            "Selected Survey Location<br>" +
            latitude.toFixed(6) +
            ", " +
            longitude.toFixed(6)
          )
          .openPopup();

      }

    } catch (error) {

      console.log(
        "Leaflet receive error",
        error
      );

    }

  }
);

</script>

</body>

</html>
`;

  // ==================================================
  // UI
  // ==================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >

      {/* ============================================
          HEADER
      ============================================ */}

      <View style={styles.header}>

        <Text style={styles.heading}>
          Select Survey Location
        </Text>

        <Text style={styles.subtitle}>
          {mode === "MANUAL"
            ? "Enter the exact latitude and longitude."
            : "Tap anywhere on the map to select the survey location."}
        </Text>

      </View>

      {/* ============================================
          LEAFLET MAP
      ============================================ */}

      <View style={styles.mapContainer}>

        <WebView
  ref={webViewRef}
  originWhitelist={["*"]}
  source={{
    html: leafletHTML,
    baseUrl: "https://localhost",
  }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  onMessage={handleMapMessage}
  onError={(e) => console.log("WebView error:", e.nativeEvent)}
  onHttpError={(e) => console.log("HTTP error:", e.nativeEvent)}
  style={styles.map}
  startInLoadingState={true}
  mixedContentMode="always"
/>

        {/* MAP HINT */}

        <View style={styles.mapHint}>

          <Text style={styles.mapHintText}>
            🗺️ Tap on the map to select a location
          </Text>

        </View>

      </View>

      {/* ============================================
          COORDINATES CARD
      ============================================ */}

      <View style={styles.coordinateCard}>

        <Text style={styles.cardTitle}>
          Selected Coordinates
        </Text>

        <View style={styles.inputRow}>

          {/* LATITUDE */}

          <View style={styles.inputContainer}>

            <Text style={styles.label}>
              Latitude
            </Text>

            <TextInput
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
              placeholder="26.846700"
              placeholderTextColor="#999"
              style={styles.input}
            />

          </View>

          {/* LONGITUDE */}

          <View style={styles.inputContainer}>

            <Text style={styles.label}>
              Longitude
            </Text>

            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
              placeholder="80.946200"
              placeholderTextColor="#999"
              style={styles.input}
            />

          </View>

        </View>

        {/* ========================================
            SET MANUAL COORDINATES
        ======================================== */}

        <TouchableOpacity
          style={styles.setButton}
          onPress={useManualCoordinates}
          activeOpacity={0.8}
        >

          <Text style={styles.buttonText}>
            Set Coordinates
          </Text>

        </TouchableOpacity>

        {/* ========================================
            CONFIRM
        ======================================== */}

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={confirmLocation}
          activeOpacity={0.8}
        >

          <Text style={styles.buttonText}>
            ✓ Use This Location
          </Text>

        </TouchableOpacity>

      </View>

    </KeyboardAvoidingView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F4F8F3",
  },

  header: {
    paddingTop: 25,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },

  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
    lineHeight: 20,
  },

  // =================================================
  // MAP
  // =================================================

  mapContainer: {
    flex: 1,
    marginHorizontal: 15,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 4,
  },

  map: {
    flex: 1,
  },

  mapHint: {
    position: "absolute",
    top: 12,
    left: 15,
    right: 15,
    backgroundColor:
      "rgba(0,0,0,0.70)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  mapHintText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },

  // =================================================
  // COORDINATES
  // =================================================

  coordinateCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 6,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12,
  },

  inputRow: {
    flexDirection: "row",
    gap: 10,
  },

  inputContainer: {
    flex: 1,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#FAFAFA",
  },

  // =================================================
  // SET BUTTON
  // =================================================

  setButton: {
    backgroundColor: "#6A1B9A",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },

  // =================================================
  // CONFIRM BUTTON
  // =================================================

  confirmButton: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

});