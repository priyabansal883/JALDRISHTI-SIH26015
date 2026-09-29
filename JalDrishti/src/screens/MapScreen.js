import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

import { WebView } from "react-native-webview";

import {
  getImpactColor,
  getImpactLabel,
} from "../utils/heatmapHelper";

import api from "../services/api";

export default function MapScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [ndviData, setNdviData] = useState({});

  const [impactFilter, setImpactFilter] =
    useState("ALL");

  const [ndviFilter, setNdviFilter] =
    useState("ALL");

  const [mapMode, setMapMode] =
    useState("IMPACT");

  // =========================================
  // LOAD PROJECTS
  // =========================================

  useEffect(() => {
    loadProjects();
  }, []);

  // =========================================
  // LOAD PROJECT DATA
  // =========================================

  const loadProjects = async () => {
    try {
      setLoading(true);

      const response = await api.get("/projects");

      console.log(
        "MAP PROJECTS RESPONSE:",
        response.data
      );

      const projectList =
        response.data?.projects || [];

      setProjects(projectList);

      // Load NDVI for every valid project
      projectList.forEach((project) => {
        if (project?._id) {
          loadNDVI(project._id);
        }
      });
    } catch (error) {
      console.log(
        "Map project error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Map Error",
        "Unable to load watershed projects."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // LOAD NDVI
  // =========================================

  const loadNDVI = async (projectId) => {
    try {
      const response = await api.get(
        `/satellite/project/${projectId}`
      );

      console.log(
        "NDVI RESPONSE:",
        projectId,
        response.data
      );

      const satellite =
        response.data?.satellite ||
        response.data ||
        null;

      setNdviData((previous) => ({
        ...previous,
        [projectId]: satellite,
      }));
    } catch (error) {
      console.log(
        "NDVI FETCH ERROR:",
        projectId,
        error.response?.data || error.message
      );

      setNdviData((previous) => ({
        ...previous,
        [projectId]: null,
      }));
    }
  };

  // =========================================
  // VALID PROJECTS
  // =========================================

  const validProjects = useMemo(() => {
    return projects.filter((project) => {
      const latitude = Number(project?.latitude);
      const longitude = Number(project?.longitude);

      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      );
    });
  }, [projects]);

  // =========================================
  // GET PROJECT NDVI
  // =========================================

  const getProjectNDVI = (project) => {
    const satellite =
      ndviData[project?._id];

    if (!satellite) {
      return null;
    }

    const value =
      satellite?.ndvi ??
      satellite?.meanNDVI ??
      satellite?.meanNdvi ??
      satellite?.value ??
      null;

    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue)
      ? numericValue
      : null;
  };

  // =========================================
  // NDVI CLASS
  // =========================================

  const getNDVIClass = (ndvi) => {
    if (
      ndvi === null ||
      ndvi === undefined ||
      !Number.isFinite(Number(ndvi))
    ) {
      return "No Data";
    }

    const value = Number(ndvi);

    if (value < 0.2) {
      return "Very Low";
    }

    if (value < 0.4) {
      return "Low";
    }

    if (value < 0.6) {
      return "Moderate";
    }

    return "Dense";
  };

  // =========================================
  // NDVI COLOR
  // =========================================

  const getNDVIColor = (ndvi) => {
    if (
      ndvi === null ||
      ndvi === undefined
    ) {
      return "#9E9E9E";
    }

    const value = Number(ndvi);

    if (value < 0.2) {
      return "#D32F2F";
    }

    if (value < 0.4) {
      return "#F57C00";
    }

    if (value < 0.6) {
      return "#FBC02D";
    }

    return "#388E3C";
  };

  // =========================================
  // NDVI FILTER
  // =========================================

  const matchesNDVIFilter = (
    project,
    filterValue
  ) => {
    if (filterValue === "ALL") {
      return true;
    }

    const ndvi = getProjectNDVI(project);

    if (ndvi === null) {
      return filterValue === "NO_DATA";
    }

    if (filterValue === "VERY_LOW") {
      return ndvi < 0.2;
    }

    if (filterValue === "LOW") {
      return (
        ndvi >= 0.2 &&
        ndvi < 0.4
      );
    }

    if (filterValue === "MODERATE") {
      return (
        ndvi >= 0.4 &&
        ndvi < 0.6
      );
    }

    if (filterValue === "DENSE") {
      return ndvi >= 0.6;
    }

    return true;
  };

  // =========================================
  // FILTER PROJECTS
  // =========================================

  const filteredProjects = useMemo(() => {
    return validProjects.filter((project) => {
      const score = Number(
        project?.impactScore || 0
      );

      const impactMatches =
        impactFilter === "ALL" ||
        getImpactLabel(score) ===
          impactFilter;

      const ndviMatches =
        matchesNDVIFilter(
          project,
          ndviFilter
        );

      return (
        impactMatches &&
        ndviMatches
      );
    });
  }, [
    validProjects,
    impactFilter,
    ndviFilter,
    ndviData,
  ]);

  // =========================================
  // SUMMARY
  // =========================================

  const summary = useMemo(() => {
    let good = 0;
    let moderate = 0;
    let poor = 0;
    let critical = 0;

    validProjects.forEach((project) => {
      const score = Number(
        project?.impactScore || 0
      );

      const status =
        getImpactLabel(score);

      if (status === "Good") {
        good++;
      }

      if (status === "Moderate") {
        moderate++;
      }

      if (status === "Poor") {
        poor++;
      }

      if (status === "Critical") {
        critical++;
      }
    });

    return {
      total: validProjects.length,
      good,
      moderate,
      poor,
      critical,
    };
  }, [validProjects]);

  // =========================================
  // MAP CENTER
  // =========================================

  const firstProject =
    filteredProjects.length > 0
      ? filteredProjects[0]
      : validProjects.length > 0
      ? validProjects[0]
      : null;

  const mapLatitude = firstProject
    ? Number(firstProject.latitude)
    : 26.8467;

  const mapLongitude = firstProject
    ? Number(firstProject.longitude)
    : 80.9462;

  // =========================================
  // CREATE MAP HTML
  // =========================================

  const createMapHTML = () => {
    const mapProjects =
      filteredProjects.map((project) => {
        const score = Number(
          project?.impactScore || 0
        );

        const ndvi =
          getProjectNDVI(project);

        const satellite =
          ndviData[project._id] ||
          null;

        // =====================================
        // BEFORE NDVI
        // =====================================

        const beforeNDVI =
          satellite?.beforeNDVI ??
          satellite?.beforeNdvi ??
          satellite?.before?.ndvi ??
          null;

        // =====================================
        // AFTER NDVI
        // =====================================

        const afterNDVI =
          satellite?.afterNDVI ??
          satellite?.afterNdvi ??
          satellite?.after?.ndvi ??
          null;

        // =====================================
        // NDVI CHANGE
        // =====================================

        let ndviChange = null;

        if (
          beforeNDVI !== null &&
          beforeNDVI !== undefined &&
          afterNDVI !== null &&
          afterNDVI !== undefined
        ) {
          const before =
            Number(beforeNDVI);

          const after =
            Number(afterNDVI);

          if (
            Number.isFinite(before) &&
            Number.isFinite(after)
          ) {
            ndviChange =
              after - before;
          }
        }

        return {
          id: project._id,

          name:
            project?.name ||
            "Watershed Project",

          village:
            project?.village ||
            "Unknown Village",

          district:
            project?.district ||
            "Unknown District",

          state:
            project?.state ||
            "Uttar Pradesh",

          type:
            project?.type ||
            "Other",

          latitude:
            Number(project.latitude),

          longitude:
            Number(project.longitude),

          impactScore: score,

          status:
            getImpactLabel(score),

          impactColor:
            getImpactColor(score),

          ndvi,

          ndviClass:
            getNDVIClass(ndvi),

          ndviColor:
            getNDVIColor(ndvi),

          beforeNDVI:
            beforeNDVI !== null
              ? Number(beforeNDVI)
              : null,

          afterNDVI:
            afterNDVI !== null
              ? Number(afterNDVI)
              : null,

          ndviChange,

          implementationDate:
            project?.implementationDate ||
            null,

          description:
            project?.description ||
            "",
        };
      });

    const projectJSON =
      JSON.stringify(mapProjects);

    const mapModeJSON =
      JSON.stringify(mapMode);

    return `
<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
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
body,
#map {

  width: 100%;

  height: 100%;

  margin: 0;

  padding: 0;

}

body {

  overflow: hidden;

}

.leaflet-popup-content {

  font-family:
    Arial,
    sans-serif;

  min-width: 265px;

  margin: 12px;

}

.project-title {

  font-size: 17px;

  font-weight: bold;

  color: #166534;

  margin-bottom: 8px;

}

.info {

  margin: 4px 0;

  font-size: 13px;

  color: #333;

}

.impact {

  margin-top: 9px;

  padding: 9px;

  background: #f8fafc;

  border-radius: 8px;

}

.impact-title {

  font-weight: bold;

  font-size: 13px;

}

.score {

  font-size: 21px;

  font-weight: bold;

  color: #166534;

  margin-top: 3px;

}

.status {

  font-size: 13px;

  font-weight: bold;

  margin-top: 3px;

}

.coordinates {

  margin-top: 9px;

  padding: 9px;

  background: #eff6ff;

  border-radius: 8px;

}

.coordinates-title {

  font-size: 13px;

  font-weight: bold;

  color: #1d4ed8;

  margin-bottom: 4px;

}

.aoi-info {

  margin-top: 6px;

  font-size: 11px;

  color: #555;

}

.ndvi {

  margin-top: 9px;

  padding-top: 9px;

  border-top:
    1px solid #e5e7eb;

}

.ndvi-title {

  font-size: 14px;

  font-weight: bold;

  color: #166534;

  margin-bottom: 5px;

}

.ndvi-value {

  font-size: 18px;

  font-weight: bold;

}

.ndvi-change-positive {

  color: #2E7D32;

  font-weight: bold;

}

.ndvi-change-negative {

  color: #C62828;

  font-weight: bold;

}

.ndvi-change-neutral {

  color: #555;

  font-weight: bold;

}

.priority {

  margin-top: 9px;

  padding: 7px;

  background: #ffebee;

  color: #c62828;

  font-weight: bold;

  font-size: 12px;

  border-radius: 6px;

}

.description {

  margin-top: 8px;

  font-size: 12px;

  color: #555;

}

.satellite-button {

  margin-top: 10px;

  padding: 10px;

  background: #166534;

  color: white;

  border-radius: 7px;

  text-align: center;

  font-weight: bold;

  font-size: 13px;

}

.details-button {

  margin-top: 7px;

  padding: 9px;

  background: #2563eb;

  color: white;

  border-radius: 7px;

  text-align: center;

  font-weight: bold;

  font-size: 13px;

}

.aoi-label {

  background: white;

  border: 1px solid #166534;

  color: #166534;

  font-weight: bold;

  font-size: 11px;

  padding: 3px 6px;

  border-radius: 5px;

}

</style>

</head>

<body>

<div id="map"></div>

<script>

const projects =
  ${projectJSON};

const currentMapMode =
  ${mapModeJSON};

const centerLatitude =
  ${mapLatitude};

const centerLongitude =
  ${mapLongitude};

const mapZoom =
  ${firstProject ? 13 : 7};

// ==========================================
// CREATE MAP
// ==========================================

const map =
  L.map(
    "map",
    {
      zoomControl: true
    }
  ).setView(
    [
      centerLatitude,
      centerLongitude
    ],
    mapZoom
  );

// ==========================================
// OPEN STREET MAP
// ==========================================

L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,

    attribution:
      "&copy; OpenStreetMap contributors"
  }
).addTo(map);

// ==========================================
// MARKER GROUP
// ==========================================

const markerGroup =
  L.layerGroup().addTo(map);

// ==========================================
// PROJECT MARKERS
// ==========================================

projects.forEach(
  function(project) {

    // ========================================
    // MARKER COLOR
    // ========================================

    let markerColor =
      project.impactColor;

    if (
      currentMapMode ===
      "NDVI"
    ) {
      markerColor =
        project.ndviColor;
    }

    // ========================================
    // PROJECT MARKER
    // ========================================

    const marker =
      L.circleMarker(
        [
          project.latitude,
          project.longitude
        ],
        {
          radius: 11,

          color:
            "#ffffff",

          weight: 2,

          fillColor:
            markerColor,

          fillOpacity: 1
        }
      );

    // ========================================
    // SATELLITE AOI
    // ========================================

    /*
      Prototype AOI:
      approximately 0.002 degrees around
      the project coordinate.

      The same concept is currently used
      by the backend satellite service.
    */

    const aoiSize = 0.002;

    const southWest = [
      project.latitude - aoiSize,
      project.longitude - aoiSize
    ];

    const northEast = [
      project.latitude + aoiSize,
      project.longitude + aoiSize
    ];

    const aoiBounds = [
      southWest,
      northEast
    ];

    const aoiRectangle =
      L.rectangle(
        aoiBounds,
        {
          color: "#166534",

          weight: 2,

          opacity: 0.8,

          fillColor: "#22c55e",

          fillOpacity: 0.08,

          dashArray: "6, 5"
        }
      );

    aoiRectangle.addTo(map);

    // ========================================
    // AOI LABEL
    // ========================================

    const aoiLabel =
      L.marker(
        [
          project.latitude,
          project.longitude
        ],
        {
          icon:
            L.divIcon({
              className:
                "",

              html:
                '<div class="aoi-label">' +
                'Satellite AOI' +
                '</div>',

              iconSize:
                [90, 22],

              iconAnchor:
                [45, 38]
            }),

          interactive: false
        }
      );

    aoiLabel.addTo(map);

    // ========================================
    // NDVI CIRCLE
    // ========================================

    if (
      project.ndvi !==
        null &&
      project.ndvi !==
        undefined
    ) {

      const ndviCircle =
        L.circle(
          [
            project.latitude,
            project.longitude
          ],
          {
            radius: 450,

            color:
              project.ndviColor,

            weight: 1,

            opacity: 0.55,

            fillColor:
              project.ndviColor,

            fillOpacity: 0.12
          }
        );

      ndviCircle.addTo(map);
    }

    // ========================================
    // NDVI HTML
    // ========================================

    let ndviHTML = "";

    if (
      project.ndvi !==
        null &&
      project.ndvi !==
        undefined
    ) {

      ndviHTML =
        '<div class="ndvi">' +

          '<div class="ndvi-title">' +
            '🛰️ Satellite Vegetation Analysis' +
          '</div>' +

          '<div class="info">' +
            'Current NDVI: ' +

            '<span class="ndvi-value">' +

              Number(
                project.ndvi
              ).toFixed(3) +

            '</span>' +

          '</div>' +

          '<div class="info">' +
            'Vegetation class: ' +
            project.ndviClass +
          '</div>' +

          '<div class="info">' +
            'Source: Sentinel-2 L2A' +
          '</div>';

      // ======================================
      // BEFORE / AFTER
      // ======================================

      if (
        project.beforeNDVI !==
          null &&
        project.afterNDVI !==
          null
      ) {

        ndviHTML +=

          '<div class="info">' +
            'Before NDVI: ' +
            Number(
              project.beforeNDVI
            ).toFixed(3) +
          '</div>' +

          '<div class="info">' +
            'After NDVI: ' +
            Number(
              project.afterNDVI
            ).toFixed(3) +
          '</div>';

        if (
          project.ndviChange !==
            null
        ) {

          let changeClass =
            "ndvi-change-neutral";

          if (
            project.ndviChange >
            0
          ) {
            changeClass =
              "ndvi-change-positive";
          }

          if (
            project.ndviChange <
            0
          ) {
            changeClass =
              "ndvi-change-negative";
          }

          const sign =
            project.ndviChange >
            0
              ? "+"
              : "";

          ndviHTML +=

            '<div class="' +
              changeClass +
            '">' +

              'NDVI change: ' +
              sign +

              Number(
                project.ndviChange
              ).toFixed(3) +

            '</div>';
        }
      }

      ndviHTML +=
        '</div>';

    } else {

      ndviHTML =
        '<div class="ndvi">' +

          '<div class="ndvi-title">' +
            '🛰️ Satellite Vegetation Analysis' +
          '</div>' +

          '<div class="info">' +
            'NDVI data not available' +
          '</div>' +

          '<div class="info">' +
            'Satellite analysis may be pending.' +
          '</div>' +

        '</div>';
    }

    // ========================================
    // PRIORITY
    // ========================================

    let priorityHTML = "";

    if (
      project.impactScore <
      50
    ) {

      priorityHTML =
        '<div class="priority">' +
          '⚠️ High priority inspection recommended' +
        '</div>';
    }

    // ========================================
    // DESCRIPTION
    // ========================================

    let descriptionHTML = "";

    if (
      project.description
    ) {

      descriptionHTML =
        '<div class="description">' +
          project.description +
        '</div>';
    }

    // ========================================
    // COORDINATES
    // ========================================

    const coordinatesHTML =

      '<div class="coordinates">' +

        '<div class="coordinates-title">' +
          '📍 Project Satellite Location' +
        '</div>' +

        '<div class="info">' +
          'Latitude: ' +
          Number(
            project.latitude
          ).toFixed(6) +
        '</div>' +

        '<div class="info">' +
          'Longitude: ' +
          Number(
            project.longitude
          ).toFixed(6) +
        '</div>' +

        '<div class="aoi-info">' +
          'The dashed rectangle shows the ' +
          'Area of Interest (AOI) used for ' +
          'prototype satellite analysis.' +
        '</div>' +

      '</div>';

    // ========================================
    // POPUP
    // ========================================

    let popupHTML =

      '<div>' +

        '<div class="project-title">' +
          project.name +
        '</div>' +

        '<div class="info">' +
          '📍 Village: ' +
          project.village +
        '</div>' +

        '<div class="info">' +
          '🏛️ District: ' +
          project.district +
        '</div>' +

        '<div class="info">' +
          '🗺️ State: ' +
          project.state +
        '</div>' +

        '<div class="info">' +
          '🌱 Type: ' +
          project.type +
        '</div>' +

        coordinatesHTML +

        '<div class="impact">' +

          '<div class="impact-title">' +
            'Impact Performance' +
          '</div>' +

          '<div class="score">' +
            Number(
              project.impactScore
            ).toFixed(1) +
            ' / 100' +
          '</div>' +

          '<div class="status">' +
            'Status: ' +
            project.status +
          '</div>' +

        '</div>' +

        ndviHTML +

        priorityHTML +

        descriptionHTML +

        '<div ' +
          'class="satellite-button" ' +
          'onclick="openSatelliteComparison(\\'' +
            project.id +
          '\\')"' +
        '>' +
          '🛰️ Satellite Comparison' +
        '</div>' +

        '<div ' +
          'class="details-button" ' +
          'onclick="openProjectDetails(\\'' +
            project.id +
          '\\')"' +
        '>' +
          '📋 View Project Details' +
        '</div>' +

      '</div>';

    marker.bindPopup(
      popupHTML
    );

    // ========================================
    // MARKER CLICK
    // ========================================

    marker.on(
      "click",
      function() {

        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type:
              "PROJECT_CLICK",

            projectId:
              project.id
          })
        );

      }
    );

    markerGroup.addLayer(
      marker
    );

  }
);

// ==========================================
// OPEN SATELLITE COMPARISON
// ==========================================

function openSatelliteComparison(
  projectId
) {

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type:
        "SATELLITE_COMPARISON",

      projectId:
        projectId
    })
  );

}

// ==========================================
// OPEN PROJECT DETAILS
// ==========================================

function openProjectDetails(
  projectId
) {

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type:
        "PROJECT_CLICK",

      projectId:
        projectId
    })
  );

}

// ==========================================
// FIT MAP
// ==========================================

if (
  projects.length > 1
) {

  const coordinates =
    projects.map(
      function(project) {

        return [
          project.latitude,
          project.longitude
        ];

      }
    );

  const bounds =
    L.latLngBounds(
      coordinates
    );

  map.fitBounds(
    bounds,
    {
      padding:
        [40, 40]
    }
  );

}

// ==========================================
// MAP READY
// ==========================================

window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type:
      "MAP_READY",

    projectCount:
      projects.length
  })
);

</script>

</body>

</html>
`;
  };

  // =========================================
  // LOADING SCREEN
  // =========================================

  if (loading) {
    return (
      <View style={styles.center}>

        <ActivityIndicator
          size="large"
          color="#166534"
        />

        <Text style={styles.loadingText}>
          Loading watershed map...
        </Text>

      </View>
    );
  }

  // =========================================
  // MAIN SCREEN
  // =========================================

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <Text style={styles.headerTitle}>
          Watershed GIS Map
        </Text>

        <Text style={styles.headerSubtitle}>
          SIH26015 • JalDrishti
        </Text>

      </View>

      {/* MAP MODE */}

      <View style={styles.modeContainer}>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.modeButton,
            mapMode === "IMPACT" &&
              styles.activeMode,
          ]}
          onPress={() =>
            setMapMode("IMPACT")
          }
        >

          <Text
            style={[
              styles.modeText,
              mapMode === "IMPACT" &&
                styles.activeModeText,
            ]}
          >
            📊 Impact
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.modeButton,
            mapMode === "NDVI" &&
              styles.activeMode,
          ]}
          onPress={() =>
            setMapMode("NDVI")
          }
        >

          <Text
            style={[
              styles.modeText,
              mapMode === "NDVI" &&
                styles.activeModeText,
            ]}
          >
            🛰️ NDVI
          </Text>

        </TouchableOpacity>

      </View>

      {/* IMPACT FILTERS */}

      <View style={styles.filterWrapper}>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterContainer
          }
        >

          {[
            "ALL",
            "Good",
            "Moderate",
            "Poor",
            "Critical",
          ].map((item) => (

            <TouchableOpacity
              key={item}
              activeOpacity={0.8}
              style={[
                styles.filterButton,
                impactFilter === item &&
                  styles.activeFilter,
              ]}
              onPress={() =>
                setImpactFilter(item)
              }
            >

              <Text
                style={[
                  styles.filterText,
                  impactFilter === item &&
                    styles.activeFilterText,
                ]}
              >
                {item}
              </Text>

            </TouchableOpacity>

          ))}

        </ScrollView>

      </View>

      {/* NDVI FILTERS */}

      <View
        style={
          styles.ndviFilterWrapper
        }
      >

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterContainer
          }
        >

          {[
            {
              key: "ALL",
              label: "All NDVI",
            },
            {
              key: "VERY_LOW",
              label: "Very Low",
            },
            {
              key: "LOW",
              label: "Low",
            },
            {
              key: "MODERATE",
              label: "Moderate",
            },
            {
              key: "DENSE",
              label: "Dense",
            },
            {
              key: "NO_DATA",
              label: "No Data",
            },
          ].map((item) => (

            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              style={[
                styles.ndviFilterButton,
                ndviFilter === item.key &&
                  styles.activeNDVIFilter,
              ]}
              onPress={() =>
                setNdviFilter(
                  item.key
                )
              }
            >

              <Text
                style={[
                  styles.ndviFilterText,
                  ndviFilter === item.key &&
                    styles.activeNDVIFilterText,
                ]}
              >
                {item.label}
              </Text>

            </TouchableOpacity>

          ))}

        </ScrollView>

      </View>

      {/* MAP */}
      source={{
  html: createMapHTML(),
  baseUrl: "https://localhost",
}}

      <WebView
        originWhitelist={["*"]}

        source={{
          html: createMapHTML(),
        }}

        javaScriptEnabled={true}

        domStorageEnabled={true}

        cacheEnabled={true}

        startInLoadingState={true}

        style={styles.map}

        onMessage={(event) => {

          try {

            const data =
              JSON.parse(
                event.nativeEvent.data
              );

            console.log(
              "MAP MESSAGE:",
              data
            );

            // =================================
            // MAP READY
            // =================================

            if (
              data.type ===
              "MAP_READY"
            ) {

              console.log(
                "LEAFLET MAP READY:",
                data.projectCount
              );

            }

            // =================================
            // SATELLITE COMPARISON
            // =================================

            if (
              data.type ===
                "SATELLITE_COMPARISON" &&
              data.projectId
            ) {

              const project =
                projects.find(
                  (item) =>
                    item._id ===
                    data.projectId
                );

              if (project) {

                navigation.navigate(
                  "Comparison",
                  {
                    project,
                  }
                );

              }

              return;
            }

            // =================================
            // PROJECT CLICK
            // =================================

            if (
              data.type ===
                "PROJECT_CLICK" &&
              data.projectId
            ) {

              const project =
                projects.find(
                  (item) =>
                    item._id ===
                    data.projectId
                );

              if (project) {

                navigation.navigate(
                  "ProjectDetails",
                  {
                    project,
                  }
                );

              }

            }

          } catch (error) {

            console.log(
              "Map message error:",
              error
            );

          }

        }}

        onError={(event) => {

          console.log(
            "WEBVIEW ERROR:",
            event.nativeEvent
          );

        }}

        onHttpError={(event) => {

          console.log(
            "WEBVIEW HTTP ERROR:",
            event.nativeEvent
          );

        }}

        renderLoading={() => (

          <View
            style={
              styles.webLoading
            }
          >

            <ActivityIndicator
              size="large"
              color="#166534"
            />

            <Text
              style={
                styles.webLoadingText
              }
            >
              Loading map...
            </Text>

          </View>

        )}

      />

      {/* NO PROJECTS */}

      {filteredProjects.length === 0 && (

        <View
          style={
            styles.emptyCard
          }
        >

          <Text
            style={
              styles.emptyIcon
            }
          >
            🗺️
          </Text>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No projects found
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            No projects match
            the selected
            filters.
          </Text>

        </View>

      )}

      {/* SUMMARY */}

      <View
        style={
          styles.summaryCard
        }
      >

        <Text
          style={
            styles.summaryTitle
          }
        >
          Watershed Projects
        </Text>

        <View
          style={
            styles.summaryRow
          }
        >

          <SummaryItem
            number={summary.total}
            label="Total"
          />

          <SummaryItem
            number={summary.good}
            label="Good"
          />

          <SummaryItem
            number={summary.moderate}
            label="Moderate"
          />

          <SummaryItem
            number={summary.poor}
            label="Poor"
          />

          <SummaryItem
            number={summary.critical}
            label="Critical"
          />

        </View>

      </View>

      {/* LEGEND */}

      <View
        style={
          styles.legend
        }
      >

        <Text
          style={
            styles.legendTitle
          }
        >
          {mapMode === "NDVI"
            ? "🛰️ NDVI Vegetation"
            : "📊 Impact Performance"}
        </Text>

        {mapMode === "IMPACT" ? (
          <>
            <LegendRow
              color="#2E7D32"
              text="Good ≥ 75"
            />

            <LegendRow
              color="#F9A825"
              text="Moderate 50–74"
            />

            <LegendRow
              color="#EF6C00"
              text="Poor 25–49"
            />

            <LegendRow
              color="#C62828"
              text="Critical < 25"
            />
          </>
        ) : (
          <>
            <LegendRow
              color="#D32F2F"
              text="Very Low < 0.2"
            />

            <LegendRow
              color="#F57C00"
              text="Low 0.2–0.4"
            />

            <LegendRow
              color="#FBC02D"
              text="Moderate 0.4–0.6"
            />

            <LegendRow
              color="#388E3C"
              text="Dense ≥ 0.6"
            />

            <LegendRow
              color="#9E9E9E"
              text="No satellite data"
            />
          </>
        )}

      </View>

    </View>
  );
}

// ===========================================
// SUMMARY ITEM
// ===========================================

function SummaryItem({
  number,
  label,
}) {
  return (
    <View
      style={
        styles.summaryItem
      }
    >

      <Text
        style={
          styles.summaryNumber
        }
      >
        {number}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>

    </View>
  );
}

// ===========================================
// LEGEND ROW
// ===========================================

function LegendRow({
  color,
  text,
}) {
  return (
    <View
      style={
        styles.legendRow
      }
    >

      <View
        style={[
          styles.dot,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={
          styles.legendText
        }
      >
        {text}
      </Text>

    </View>
  );
}

// ===========================================
// STYLES
// ===========================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    // =======================================
    // HEADER
    // =======================================

    header: {
      position:
        "absolute",

      zIndex: 30,

      elevation: 30,

      top: 10,

      left: 12,

      backgroundColor:
        "#FFFFFF",

      paddingHorizontal:
        14,

      paddingVertical:
        9,

      borderRadius: 12,

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.15,

      shadowRadius: 4,
    },

    headerTitle: {
      fontSize: 16,

      fontWeight:
        "bold",

      color:
        "#166534",
    },

    headerSubtitle: {
      marginTop: 2,

      fontSize: 11,

      color:
        "#666",
    },

    // =======================================
    // MAP
    // =======================================

    map: {
      flex: 1,
    },

    center: {
      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",
    },

    loadingText: {
      marginTop: 10,

      color:
        "#666",

      fontSize: 14,
    },

    // =======================================
    // WEBVIEW LOADING
    // =======================================

    webLoading: {
      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",
    },

    webLoadingText: {
      marginTop: 10,

      color:
        "#555",

      fontSize: 14,
    },

    // =======================================
    // MAP MODE
    // =======================================

    modeContainer: {
      position:
        "absolute",

      zIndex: 25,

      elevation: 25,

      top: 74,

      right: 12,

      flexDirection:
        "row",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 22,

      padding: 4,

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.15,

      shadowRadius: 4,
    },

    modeButton: {
      paddingHorizontal:
        12,

      paddingVertical:
        8,

      borderRadius: 18,
    },

    activeMode: {
      backgroundColor:
        "#166534",
    },

    modeText: {
      fontSize: 12,

      fontWeight:
        "600",

      color:
        "#333",
    },

    activeModeText: {
      color:
        "#FFFFFF",
    },

    // =======================================
    // IMPACT FILTER
    // =======================================

    filterWrapper: {
      position:
        "absolute",

      zIndex: 20,

      elevation: 20,

      top: 126,

      left: 0,

      right: 0,
    },

    filterContainer: {
      paddingHorizontal:
        10,

      gap: 7,
    },

    filterButton: {
      backgroundColor:
        "#FFFFFF",

      paddingHorizontal:
        14,

      paddingVertical:
        9,

      borderRadius: 22,

      elevation: 4,

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.12,

      shadowRadius: 3,
    },

    activeFilter: {
      backgroundColor:
        "#166534",
    },

    filterText: {
      fontSize: 13,

      color:
        "#333",

      fontWeight:
        "600",
    },

    activeFilterText: {
      color:
        "#FFFFFF",
    },

    // =======================================
    // NDVI FILTER
    // =======================================

    ndviFilterWrapper: {
      position:
        "absolute",

      zIndex: 20,

      elevation: 20,

      top: 174,

      left: 0,

      right: 0,
    },

    ndviFilterButton: {
      backgroundColor:
        "#FFFFFF",

      paddingHorizontal:
        13,

      paddingVertical:
        8,

      borderRadius: 20,

      elevation: 4,

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.12,

      shadowRadius: 3,
    },

    activeNDVIFilter: {
      backgroundColor:
        "#0F766E",
    },

    ndviFilterText: {
      fontSize: 12,

      color:
        "#333",

      fontWeight:
        "600",
    },

    activeNDVIFilterText: {
      color:
        "#FFFFFF",
    },

    // =======================================
    // EMPTY
    // =======================================

    emptyCard: {
      position:
        "absolute",

      top: 235,

      alignSelf:
        "center",

      backgroundColor:
        "#FFFFFF",

      padding: 18,

      borderRadius: 14,

      elevation: 7,

      maxWidth: 280,

      alignItems:
        "center",
    },

    emptyIcon: {
      fontSize: 30,

      marginBottom: 5,
    },

    emptyTitle: {
      fontSize: 16,

      fontWeight:
        "bold",

      color:
        "#222",
    },

    emptyText: {
      marginTop: 5,

      textAlign:
        "center",

      color:
        "#666",

      fontSize: 13,
    },

    // =======================================
    // SUMMARY
    // =======================================

    summaryCard: {
      position:
        "absolute",

      top: 222,

      left: 12,

      right: 12,

      backgroundColor:
        "#FFFFFF",

      padding: 10,

      borderRadius: 12,

      elevation: 6,

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.15,

      shadowRadius: 4,
    },

    summaryTitle: {
      fontSize: 12,

      fontWeight:
        "bold",

      color:
        "#166534",

      marginBottom: 5,
    },

    summaryRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },

    summaryItem: {
      alignItems:
        "center",

      flex: 1,
    },

    summaryNumber: {
      fontSize: 16,

      fontWeight:
        "bold",

      color:
        "#166534",
    },

    summaryLabel: {
      fontSize: 9,

      color:
        "#666",

      marginTop: 1,
    },

    // =======================================
    // LEGEND
    // =======================================

    legend: {
      position:
        "absolute",

      bottom: 16,

      left: 12,

      backgroundColor:
        "#FFFFFF",

      padding: 11,

      borderRadius: 12,

      elevation: 7,

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.15,

      shadowRadius: 4,

      maxWidth: 210,
    },

    legendTitle: {
      fontWeight:
        "bold",

      marginBottom: 5,

      fontSize: 12,

      color:
        "#222",
    },

    legendRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginVertical: 2,
    },

    dot: {
      width: 11,

      height: 11,

      borderRadius: 6,

      marginRight: 6,
    },

    legendText: {
      fontSize: 10,

      color:
        "#444",
    },

  });