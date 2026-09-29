import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert
} from "react-native";

import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// SATELLITE COMPARISON NORMALIZER
// ============================================================

function normalizeSatelliteComparison(rawResponse) {
  if (!rawResponse || typeof rawResponse !== "object") {
    return {
      before: null,
      after: null,
      comparison: {},
    };
  }

  const response =
    rawResponse?.data &&
    typeof rawResponse.data === "object"
      ? rawResponse.data
      : rawResponse;

  const data =
    response?.data &&
    typeof response.data === "object"
      ? response.data
      : response;

  return {
    before:
      data?.before ??
      data?.beforeData ??
      data?.beforeSatellite ??
      data?.beforeAnalysis ??
      null,

    after:
      data?.after ??
      data?.afterData ??
      data?.afterSatellite ??
      data?.afterAnalysis ??
      null,

    comparison:
      data?.comparison ??
      data?.changes ??
      data?.change ??
      {},
  };
}
// ============================================================
// MAIN SCREEN
// ============================================================

export default function ComparisonScreen({ route }) {
  const { project } = route.params || {};

  // ==========================================================
  // FIELD SURVEY COMPARISON
  // ==========================================================

  const [comparison, setComparison] = useState(null);

  const [surveyLoading, setSurveyLoading] =
    useState(true);
const [saving, setSaving] = useState(false);
  const [surveyError, setSurveyError] =
    useState("");


  // ==========================================================
  // SATELLITE COMPARISON
  // ==========================================================

  const [beforeDate, setBeforeDate] =
    useState("2022-01-01");

  const [afterDate , setAfterDate] =
    useState("2026-01-01");

  const [satelliteComparison, setSatelliteComparison] =
    useState(null);

  const [satelliteLoading, setSatelliteLoading] =
    useState(false);

  const [satelliteError, setSatelliteError] =
    useState("");


  // ==========================================================
  // SAVE SATELLITE COMPARISON TO PROJECT (BACKEND PERSISTENCE)
  // ==========================================================

  const [savingToProject, setSavingToProject] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const [saveError, setSaveError] =
    useState("");
const saveSatelliteComparison = async () => {
  try {
    setSavingSatellite(true);
    setSaveSatelliteError("");
    setSaveSatelliteSuccess("");

    // ========================================================
    // GET RAW BEFORE / AFTER DATA
    // ========================================================

    const rawBefore =
      satelliteComparison?.before ||
      satelliteComparison?.beforeData ||
      satelliteComparison?.beforeSatellite ||
      satelliteComparison?.beforeResult ||
      null;

    const rawAfter =
      satelliteComparison?.after ||
      satelliteComparison?.afterData ||
      satelliteComparison?.afterSatellite ||
      satelliteComparison?.afterResult ||
      null;

    // ========================================================
    // NORMALIZE SATELLITE DATA
    // ========================================================

    const normalizedBefore =
      normalizeSatelliteComparisonData(rawBefore);

    const normalizedAfter =
      normalizeSatelliteComparisonData(rawAfter);

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!normalizedBefore && !normalizedAfter) {
      throw new Error(
        "No BEFORE or AFTER satellite data available."
      );
    }

    // ========================================================
    // BUILD PAYLOAD
    // ========================================================

    const payload = {
      latitude:
        project?.latitude ?? null,

      longitude:
        project?.longitude ?? null,

      bbox:
        project?.bbox || [],

      before: normalizedBefore,

      after: normalizedAfter,

      comparison: {
        ndviChange:
          normalizedBefore?.ndvi != null &&
          normalizedAfter?.ndvi != null
            ? Number(normalizedAfter.ndvi) -
              Number(normalizedBefore.ndvi)
            : null,

        ndwiChange:
          normalizedBefore?.ndwi != null &&
          normalizedAfter?.ndwi != null
            ? Number(normalizedAfter.ndwi) -
              Number(normalizedBefore.ndwi)
            : null,
      },
    };

    console.log(
      "========================================"
    );

    console.log(
      "SATELLITE SAVE PAYLOAD"
    );

    console.log(
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    console.log(
      "========================================"
    );

    // ========================================================
    // SAVE TO BACKEND
    // ========================================================

    const response = await api.post(
      `/satellite/comparison/${project?._id}`,
      payload
    );

    console.log(
      "Satellite comparison saved:",
      response?.data
    );

    setSaveSatelliteSuccess(
      "Satellite comparison saved successfully."
    );

  } catch (error) {

    console.log(
      "Save satellite comparison error:",
      error?.response?.data ||
        error?.message ||
        error
    );

    setSaveSatelliteError(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to save satellite comparison."
    );

  } finally {

    setSavingSatellite(false);

  }
};
  // ==========================================================
  // CACHE KEY
  // FIX: satellite comparison results were only ever kept in
  // useState, so they vanished the moment this screen unmounted
  // (navigating away, pull-to-refresh, app restart) -- and they
  // were never sent to the backend either, so nothing about them
  // was actually saved to the project. This screen now does BOTH:
  //   1. caches the last result locally (AsyncStorage) so
  //      reopening this screen shows it again instead of an
  //      empty state
  //   2. gives the user an explicit "Save to Project" action that
  //      persists the result server-side
  // ==========================================================

  const satelliteCacheKey =
    project?._id
      ? `satelliteComparison:${project._id}`
      : null;


  // ==========================================================
  // LOAD FIELD SURVEY COMPARISON
  // ==========================================================

  useEffect(() => {
    loadSurveyComparison();
    loadCachedSatelliteComparison();
  }, []);


  const loadCachedSatelliteComparison = async () => {
    if (!satelliteCacheKey) return;

    try {
      const cached = await AsyncStorage.getItem(
        satelliteCacheKey
      );

      if (cached) {
        const parsed = JSON.parse(cached);

        if (parsed?.beforeDate) setBeforeDate(parsed.beforeDate);
        if (parsed?.afterDate) setAfterDate(parsed.afterDate);
        if (parsed?.data) setSatelliteComparison(parsed.data);
      }
    } catch (err) {
      console.log(
        "Failed to load cached satellite comparison:",
        err.message
      );
    }
  };


const loadSurveyComparison = async () => {
  try {
    setSurveyLoading(true);

    const response = await api.get(
      `/surveys/comparison/${project._id}`
    );

    console.log(
      "Field comparison response:",
      response.data
    );

    if (response?.data) {
      setComparison(response.data);
    } else {
      setComparison(null);
    }
  } catch (err) {
    console.log(
      "Field comparison not available:",
      err.response?.data || err.message
    );

    // Field comparison is optional.
    // Don't show an error if BEFORE/AFTER surveys
    // have not been created yet.
    setComparison(null);
  } finally {
    setSurveyLoading(false);
  }
};


  // ==========================================================
  // GET PROJECT COORDINATES
  // ==========================================================

  const getProjectCoordinates = () => {
    const latitude =
      project?.latitude ??
      project?.location?.latitude;

    const longitude =
      project?.longitude ??
      project?.location?.longitude;

    return {
      latitude,
      longitude,
    };
  };


  // ==========================================================
  // DATE VALIDATION
  // ==========================================================

  const isValidDateFormat = (date) => {
    const dateRegex =
      /^\d{4}-\d{2}-\d{2}$/;

    return dateRegex.test(date);
  };


  // ==========================================================
  // SATELLITE COMPARISON
  // ==========================================================

  const runSatelliteComparison = async () => {
    try {
      setSatelliteLoading(true);
      setSatelliteError("");
      setSatelliteComparison(null);


      // ------------------------------------------------------
      // PROJECT ID
      // ------------------------------------------------------

      if (!project?._id) {
        setSatelliteError(
          "Project ID is not available."
        );

        return;
      }


      // ------------------------------------------------------
      // DATE VALIDATION
      // ------------------------------------------------------

      if (!beforeDate || !afterDate) {
        setSatelliteError(
          "Please enter both Before and After dates."
        );

        return;
      }


      if (!isValidDateFormat(beforeDate)) {
        setSatelliteError(
          "Before date must be in YYYY-MM-DD format."
        );

        return;
      }


      if (!isValidDateFormat(afterDate)) {
        setSatelliteError(
          "After date must be in YYYY-MM-DD format."
        );

        return;
      }


      // ------------------------------------------------------
      // DATE OBJECT VALIDATION
      // ------------------------------------------------------

      const beforeDateObject =
        new Date(`${beforeDate}T00:00:00`);

      const afterDateObject =
        new Date(`${afterDate}T00:00:00`);


      if (
        Number.isNaN(
          beforeDateObject.getTime()
        )
      ) {
        setSatelliteError(
          "Before date is not a valid date."
        );

        return;
      }


      if (
        Number.isNaN(
          afterDateObject.getTime()
        )
      ) {
        setSatelliteError(
          "After date is not a valid date."
        );

        return;
      }


      // ------------------------------------------------------
      // DATE ORDER
      // ------------------------------------------------------

      if (
        beforeDateObject >=
        afterDateObject
      ) {
        setSatelliteError(
          "After date must be later than Before date."
        );

        return;
      }


      // ------------------------------------------------------
      // PROJECT LOCATION
      // ------------------------------------------------------

      const {
        latitude,
        longitude,
      } = getProjectCoordinates();


      if (
        latitude === undefined ||
        longitude === undefined ||
        latitude === null ||
        longitude === null
      ) {
        setSatelliteError(
          "Project latitude and longitude are not available."
        );

        return;
      }


      // ------------------------------------------------------
      // NUMERIC COORDINATE VALIDATION
      // ------------------------------------------------------

      const numericLatitude =
        Number(latitude);

      const numericLongitude =
        Number(longitude);


      if (
        !Number.isFinite(
          numericLatitude
        ) ||
        !Number.isFinite(
          numericLongitude
        )
      ) {
        setSatelliteError(
          "Project coordinates are invalid."
        );

        return;
      }


      if (
        numericLatitude < -90 ||
        numericLatitude > 90
      ) {
        setSatelliteError(
          "Project latitude must be between -90 and 90."
        );

        return;
      }


      if (
        numericLongitude < -180 ||
        numericLongitude > 180
      ) {
        setSatelliteError(
          "Project longitude must be between -180 and 180."
        );

        return;
      }


      // ------------------------------------------------------
      // DEBUG
      // ------------------------------------------------------

      console.log(
        "======================================"
      );

      console.log(
        "SATELLITE COMPARISON REQUEST"
      );

      console.log(
        "Project ID:",
        project?._id
      );

      console.log(
        "Project:",
        project?.name
      );

      console.log(
        "Before:",
        beforeDate
      );

      console.log(
        "After:",
        afterDate
      );

      console.log(
        "Latitude:",
        numericLatitude
      );

      console.log(
        "Longitude:",
        numericLongitude
      );

      console.log(
        "======================================"
      );


      // ------------------------------------------------------
      // API REQUEST
      // ------------------------------------------------------

      const response = await api.get(
        `/satellite/project/${project._id}/live-comparison`,
        {
          params: {
            beforeDate,
            afterDate,
          },
        }
      );


      console.log(
        "======================================"
      );

      console.log(
        "SATELLITE API RESPONSE"
      );

      console.log(
        response.data
      );

      console.log(
        "======================================"
      );


      // ------------------------------------------------------
      // RESPONSE VALIDATION
      // ------------------------------------------------------

      if (!response?.data) {
        setSatelliteError(
          "The satellite service returned an empty response."
        );

        return;
      }


      if (
        response.data.success === false
      ) {
        setSatelliteError(
          response.data.message ||
          "Satellite comparison failed."
        );

        return;
      }


      setSatelliteComparison(
        response.data
      );

      // FIX: persist the freshly fetched result locally so it
      // survives navigating away from (and back to) this screen.
      if (satelliteCacheKey) {
        try {
          await AsyncStorage.setItem(
            satelliteCacheKey,
            JSON.stringify({
              beforeDate,
              afterDate,
              data: response.data,
            })
          );
        } catch (cacheErr) {
          console.log(
            "Failed to cache satellite comparison:",
            cacheErr.message
          );
        }
      }

      // A fresh comparison invalidates any previous save status.
      setSaveMessage("");
      setSaveError("");

    } catch (err) {

      console.log(
        "======================================"
      );

      console.log(
        "SATELLITE COMPARISON ERROR"
      );

      console.log(
        "Status:",
        err.response?.status
      );

      console.log(
        "Response:",
        err.response?.data
      );

      console.log(
        "Message:",
        err.message
      );

      console.log(
        "======================================"
      );


      if (
        err.response?.status === 401
      ) {
        setSatelliteError(
          "Your login session has expired. Please login again."
        );

      } else if (
        err.response?.status === 404
      ) {
        setSatelliteError(
          "Satellite comparison endpoint was not found. Check your backend route."
        );

      } else if (
        err.response?.status === 400
      ) {
        setSatelliteError(
          err.response?.data?.message ||
          "Invalid satellite comparison request."
        );

      } else if (
        err.response?.status === 500
      ) {
        setSatelliteError(
          err.response?.data?.message ||
          "Satellite processing failed on the server."
        );

      } else if (
        err.response?.data?.message
      ) {
        setSatelliteError(
          err.response.data.message
        );

      } else {
        setSatelliteError(
          "Unable to fetch satellite comparison. Check that the backend is running."
        );
      }

    } finally {
      setSatelliteLoading(false);
    }
  };


  // ==========================================================
  // SAVE SATELLITE COMPARISON TO PROJECT
  // NOTE: "live-comparison" above only computes a preview and was
  // never expected to write to the database -- that's the actual
  // reason nothing was being "saved". This calls a separate save
  // endpoint. If your backend doesn't have one yet, add a route
  // (e.g. a POST handler that creates a SatelliteAnalysis document
  // linked to this project) and update the URL below to match it.
  // ==========================================================

 const saveSatelliteComparisonToProject = async () => {
  try {
    if (!project?._id) {
      Alert.alert("Error", "Project ID is missing.");
      return;
    }

   const comparisonData = satelliteComparison?.comparison || satelliteComparison;
    const beforeData = comparisonData?.before || null;
    const afterData = comparisonData?.after || null;

    if (!beforeData && !afterData) {
      Alert.alert(
        "No Satellite Data",
        "Before or After satellite data is required."
      );
      return;
    }

    setSavingToProject(true);
    setSaveMessage("");
    setSaveError("");

    const payload = {
      latitude: project.latitude ?? null,
      longitude: project.longitude ?? null,
      bbox: project.bbox || [],

      before: beforeData
        ? {
            ndvi: beforeData.ndvi ?? null,
            ndviClassification:
              beforeData.ndviClassification || beforeData.classification || "",
            ndwi: beforeData.ndwi ?? null,
            ndwiClassification: beforeData.ndwiClassification || "",
            satelliteImageUrl:
              beforeData.satelliteImageUrl || beforeData.imageUrl || "",
            thumbnailUrl: beforeData.thumbnailUrl || "",
            satelliteDate: beforeData.satelliteDate || null,
            dateFrom: beforeData.dateFrom || null,
            dateTo: beforeData.dateTo || null,
            source: beforeData.source || "Copernicus Sentinel-2 L2A",
            cloudCoverage: beforeData.cloudCoverage ?? null,
            status: beforeData.status || "SUCCESS",
          }
        : null,

      after: afterData
        ? {
            ndvi: afterData.ndvi ?? null,
            ndviClassification:
              afterData.ndviClassification || afterData.classification || "",
            ndwi: afterData.ndwi ?? null,
            ndwiClassification: afterData.ndwiClassification || "",
            satelliteImageUrl:
              afterData.satelliteImageUrl || afterData.imageUrl || "",
            thumbnailUrl: afterData.thumbnailUrl || "",
            satelliteDate: afterData.satelliteDate || null,
            dateFrom: afterData.dateFrom || null,
            dateTo: afterData.dateTo || null,
            source: afterData.source || "Copernicus Sentinel-2 L2A",
            cloudCoverage: afterData.cloudCoverage ?? null,
            status: afterData.status || "SUCCESS",
          }
        : null,

      comparison: {
        ndviChange:
          beforeData?.ndvi != null && afterData?.ndvi != null
            ? Number(afterData.ndvi) - Number(beforeData.ndvi)
            : null,
        ndwiChange:
          beforeData?.ndwi != null && afterData?.ndwi != null
            ? Number(afterData.ndwi) - Number(beforeData.ndwi)
            : null,
      },
    };

    const response = await api.post(
      `/satellite/project/${project._id}/save-comparison`,
      payload
    );

    console.log("Save comparison response:", response.data);
    setSaveMessage("Satellite comparison saved successfully.");
  } catch (error) {
    console.log(
      "Save satellite comparison error:",
      error?.response?.data || error.message
    );
    setSaveError(
      error?.response?.data?.message || "Unable to save satellite comparison."
    );
  } finally {
    setSavingToProject(false);
  }
};

const loadSavedSatelliteComparison = async () => {
  if (!project?._id) return;

  try {
    const response = await api.get(
      `/satellite/project/${project._id}/comparison`
    );

    if (response?.data?.before && response?.data?.after) {
      setSatelliteComparison({
        comparison: {
          before: response.data.before,
          after: response.data.after,
          change: response.data.comparison,
          satelliteIndicators:
            response.data.comparison?.satelliteIndicators,
        },
      });
    }
  } catch (err) {
    console.log(
      "Failed to load saved satellite comparison:",
      err.response?.data || err.message
    );
  }
};
  // ==========================================================
  // RECOMMENDATION STYLE
  // ==========================================================

  const getRecommendationStyle = (
    severity
  ) => {

    if (severity === "HIGH") {
      return {
        box: styles.highBox,
        badge: styles.highBadge,
        text: styles.highText,
      };
    }


    if (severity === "MEDIUM") {
      return {
        box: styles.mediumBox,
        badge: styles.mediumBadge,
        text: styles.mediumText,
      };
    }


    return {
      box: styles.lowBox,
      badge: styles.lowBadge,
      text: styles.lowText,
    };
  };


  // ==========================================================
  // FIELD SURVEY LOADING
  // ==========================================================

  if (surveyLoading) {
    return (
      <View style={styles.center}>

        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading comparison...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // MAIN SCREEN
  // ==========================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* ====================================================
          HEADER
      ===================================================== */}

      <Text style={styles.title}>
        Before / After Comparison
      </Text>


      <Text style={styles.projectName}>
        {project?.name ||
          "Watershed Project"}
      </Text>


      {/* ====================================================
          SATELLITE COMPARISON CARD
      ===================================================== */}

      <View style={styles.satelliteCard}>

        <Text style={styles.satelliteTitle}>
          🛰️ Satellite Comparison
        </Text>


        <Text
          style={
            styles.satelliteDescription
          }
        >
          Compare Sentinel-2 satellite
          data for the same geographical
          area before and after watershed
          implementation.
        </Text>


        {/* PROJECT LOCATION */}

        <View style={styles.locationBox}>

          <Text style={styles.locationTitle}>
            📍 Project Area
          </Text>


          <Text style={styles.locationText}>
            Latitude:{" "}
            {project?.latitude ??
              project?.location?.latitude ??
              "Not available"}
          </Text>


          <Text style={styles.locationText}>
            Longitude:{" "}
            {project?.longitude ??
              project?.location?.longitude ??
              "Not available"}
          </Text>

        </View>


        {/* BEFORE DATE */}

        <Text style={styles.inputLabel}>
          Before Date
        </Text>


        <TextInput
          value={beforeDate}
          onChangeText={
            setBeforeDate
          }
          placeholder="YYYY-MM-DD"
          style={styles.dateInput}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          editable={!satelliteLoading}
        />


        <Text style={styles.dateHint}>
          Example: 2022-01-01
        </Text>


        {/* AFTER DATE */}

        <Text style={styles.inputLabel}>
          After Date
        </Text>


        <TextInput
          value={afterDate}
          onChangeText={
            setAfterDate
          }
          placeholder="YYYY-MM-DD"
          style={styles.dateInput}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          editable={!satelliteLoading}
        />


        <Text style={styles.dateHint}>
          Example: 2026-01-01
        </Text>


        {/* COMPARE BUTTON */}

        <TouchableOpacity
          style={[
            styles.compareButton,
            satelliteLoading &&
              styles.disabledButton,
          ]}
          onPress={
            runSatelliteComparison
          }
          disabled={satelliteLoading}
        >

          {satelliteLoading ? (
            <>
              <ActivityIndicator
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.buttonText
                }
              >
                Fetching Satellite Data...
              </Text>
            </>
          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              🛰️ Compare Satellite
            </Text>
          )}

        </TouchableOpacity>


        {/* SATELLITE ERROR */}

        {satelliteError ? (
          <View
            style={
              styles.satelliteErrorBox
            }
          >

            <Text
              style={
                styles.satelliteErrorTitle
              }
            >
              Satellite Comparison Failed
            </Text>


            <Text
              style={
                styles.satelliteErrorText
              }
            >
              {satelliteError}
            </Text>

          </View>
        ) : null}

      </View>


      {/* ====================================================
          SATELLITE RESULT
      ===================================================== */}

      {satelliteComparison ? (
        <>
          <SatelliteResult
            data={
              satelliteComparison
            }
          />

          <View style={styles.saveToProjectBox}>
            <TouchableOpacity
              style={[
                styles.saveToProjectButton,
                savingToProject && styles.disabledButton,
              ]}
              onPress={saveSatelliteComparisonToProject}
              disabled={savingToProject}
            >
              {savingToProject ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  💾 Save Comparison to Project
                </Text>
              )}
            </TouchableOpacity>

            {saveMessage ? (
              <Text style={styles.saveSuccessText}>
                {saveMessage}
              </Text>
            ) : null}

            {saveError ? (
              <Text style={styles.saveErrorText}>
                {saveError}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}


      {/* ====================================================
          FIELD SURVEY COMPARISON
      ===================================================== */}



      {comparison ? (
        <FieldSurveyComparison
          comparison={comparison}
          project={project}
          getRecommendationStyle={
            getRecommendationStyle
          }
        />
      ) : null}

    </ScrollView>
  );
}


// ============================================================
// SATELLITE RESULT COMPONENT
// ============================================================

function SatelliteResult({ data }) {

  /*
  Backend:

  {
    success: true,

    project: {...},

    comparison: {
      projectArea: {...},
      before: {...},
      after: {...},
      change: {...},
      satelliteIndicators: {...}
    }
  }
  */

  const comparison =
    data?.comparison ||
    data;


  const before =
    comparison?.before;


  const after =
    comparison?.after;


  const change =
    comparison?.change;


  const projectArea =
    comparison?.projectArea ||
    data?.projectArea;


  const satelliteIndicators =
    comparison?.satelliteIndicators ||
    data?.satelliteIndicators;


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!before || !after) {
    return (
      <View style={styles.errorCard}>

        <Text style={styles.errorTitle}>
          Satellite data incomplete
        </Text>


        <Text style={styles.errorText}>
          The satellite service did not
          return complete Before and
          After information.
        </Text>

      </View>
    );
  }


  // ----------------------------------------------------------
  // IMAGE URLS
  // ----------------------------------------------------------

  const beforeImage =
    normalizeImageUrl(
      before?.imageUrl
    );


  const afterImage =
    normalizeImageUrl(
      after?.imageUrl
    );


  // ----------------------------------------------------------
  // NDVI
  // ----------------------------------------------------------

  const beforeNDVI =
    Number.isFinite(
      Number(before?.ndvi)
    )
      ? Number(before.ndvi)
      : 0;


  const afterNDVI =
    Number.isFinite(
      Number(after?.ndvi)
    )
      ? Number(after.ndvi)
      : 0;


  // ----------------------------------------------------------
  // NDVI CHANGE
  // ----------------------------------------------------------

  const ndviChange =
    Number.isFinite(
      Number(change?.ndviChange)
    )
      ? Number(change.ndviChange)
      : afterNDVI -
        beforeNDVI;


  // ----------------------------------------------------------
  // PERCENTAGE
  // ----------------------------------------------------------

  const percentageChange =
    Number.isFinite(
      Number(
        change?.percentageChange
      )
    )
      ? Number(
          change.percentageChange
        )
      : beforeNDVI !== 0
      ? (
          (
            afterNDVI -
            beforeNDVI
          ) /
          Math.abs(
            beforeNDVI
          )
        ) * 100
      : 0;


  // ----------------------------------------------------------
  // DIRECTION
  // ----------------------------------------------------------

  const direction =
    change?.direction ||
    (
      ndviChange > 0
        ? "Vegetation increased"
        : ndviChange < 0
        ? "Vegetation decreased"
        : "No significant change"
    );


  const isPositive =
    ndviChange > 0;


  const isNegative =
    ndviChange < 0;


  return (
    <View
      style={
        styles.satelliteResultCard
      }
    >

      {/* ====================================================
          HEADER
      ===================================================== */}

      <Text style={styles.resultTitle}>
        🛰️ Satellite Analysis Result
      </Text>


      <Text
        style={
          styles.resultSubtitle
        }
      >
        Same geographical area •
        Sentinel-2
      </Text>


      {/* ====================================================
          BEFORE
      ===================================================== */}

      <View style={styles.imageCard}>

        <Text style={styles.imageTitle}>
          BEFORE
        </Text>


        <Text style={styles.imageDate}>
          Date:{" "}
          {before?.selectedDate ||
            "Not available"}
        </Text>


        {beforeImage ? (
          <Image
            source={{
              uri: beforeImage,
            }}
            style={
              styles.satelliteImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.noSatelliteImage
            }
          >
            <Text
              style={
                styles.noImageText
              }
            >
              Before satellite image
              unavailable
            </Text>
          </View>
        )}


        <View style={styles.ndviBox}>

          <Text style={styles.ndviLabel}>
            Before NDVI
          </Text>


          <Text style={styles.ndviValue}>
            {beforeNDVI.toFixed(3)}
          </Text>


          {before?.classification ? (
            <Text
              style={
                styles.ndviClassification
              }
            >
              {before.classification}
            </Text>
          ) : null}

        </View>

      </View>


      {/* ====================================================
          AFTER
      ===================================================== */}

      <View style={styles.imageCard}>

        <Text style={styles.imageTitle}>
          AFTER
        </Text>


        <Text style={styles.imageDate}>
          Date:{" "}
          {after?.selectedDate ||
            "Not available"}
        </Text>


        {afterImage ? (
          <Image
            source={{
              uri: afterImage,
            }}
            style={
              styles.satelliteImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.noSatelliteImage
            }
          >
            <Text
              style={
                styles.noImageText
              }
            >
              After satellite image
              unavailable
            </Text>
          </View>
        )}


        <View style={styles.ndviBox}>

          <Text style={styles.ndviLabel}>
            After NDVI
          </Text>


          <Text style={styles.ndviValue}>
            {afterNDVI.toFixed(3)}
          </Text>


          {after?.classification ? (
            <Text
              style={
                styles.ndviClassification
              }
            >
              {after.classification}
            </Text>
          ) : null}

        </View>

      </View>


      {/* ====================================================
          NDVI CHANGE
      ===================================================== */}

      <View
        style={
          styles.ndviChangeCard
        }
      >

        <Text style={styles.changeTitle}>
          NDVI Change
        </Text>


        <Text
          style={[
            styles.ndviChangeValue,

            isPositive
              ? styles.positive
              : isNegative
              ? styles.negative
              : styles.neutral,
          ]}
        >
          {ndviChange >= 0
            ? "+"
            : ""}
          {ndviChange.toFixed(3)}
        </Text>


        <Text
          style={[
            styles.directionText,

            isPositive
              ? styles.positive
              : isNegative
              ? styles.negative
              : styles.neutral,
          ]}
        >
          {direction}
        </Text>


        <View
          style={
            styles.percentageBox
          }
        >

          <Text
            style={
              styles.percentageLabel
            }
          >
            Percentage Change
          </Text>


          <Text
            style={[
              styles.percentageValue,

              isPositive
                ? styles.positive
                : isNegative
                ? styles.negative
                : styles.neutral,
            ]}
          >
            {percentageChange >= 0
              ? "+"
              : ""}
            {percentageChange.toFixed(
              2
            )}
            %
          </Text>

        </View>

      </View>


      {/* ====================================================
          NDWI / OTHER SATELLITE DATA
      ===================================================== */}

      <SatelliteIndexSummary
        before={before}
        after={after}
        change={change}
      />


      {/* ====================================================
          SATELLITE INDICATORS
      ===================================================== */}

      <SatelliteIndicators
        indicators={
          satelliteIndicators
        }
      />


      {/* ====================================================
          AREA
      ===================================================== */}

      {projectArea ? (
        <View style={styles.areaCard}>

          <Text style={styles.areaTitle}>
            📍 Analysis Area
          </Text>


          <Text style={styles.areaText}>
            Latitude:{" "}
            {projectArea?.latitude ??
              "N/A"}
          </Text>


          <Text style={styles.areaText}>
            Longitude:{" "}
            {projectArea?.longitude ??
              "N/A"}
          </Text>


          {projectArea?.bbox ? (
            <Text style={styles.areaText}>
              Bounding Box:{" "}
              {Array.isArray(
                projectArea.bbox
              )
                ? projectArea.bbox.join(
                    ", "
                  )
                : String(
                    projectArea.bbox
                  )}
            </Text>
          ) : null}

        </View>
      ) : null}


      {/* ====================================================
          INDICATOR METHOD
      ===================================================== */}

      {comparison?.indicatorMethod ? (
        <View
          style={
            styles.methodCard
          }
        >

          <Text
            style={
              styles.methodTitle
            }
          >
            ℹ️ Indicator Method
          </Text>


          <Text
            style={
              styles.methodText
            }
          >
            {
              comparison.indicatorMethod
            }
          </Text>

        </View>
      ) : null}


      {/* ====================================================
          SOURCE
      ===================================================== */}

      <Text style={styles.sourceText}>
        Data source:{" "}
        {before?.source ||
          after?.source ||
          "Copernicus Sentinel-2 L2A"}
      </Text>

    </View>
  );
}


// ============================================================
// SATELLITE INDEX SUMMARY
// ============================================================

function SatelliteIndexSummary({
  before,
  after,
  change,
}) {
  const hasNDWI =
    before?.ndwi !== undefined ||
    after?.ndwi !== undefined ||
    change?.ndwiChange !== undefined;


  if (!hasNDWI) {
    return null;
  }


  const beforeNDWI =
    Number(before?.ndwi);

  const afterNDWI =
    Number(after?.ndwi);

  const ndwiChange =
    Number.isFinite(
      Number(change?.ndwiChange)
    )
      ? Number(change.ndwiChange)
      : Number.isFinite(
          beforeNDWI
        ) &&
        Number.isFinite(
          afterNDWI
        )
      ? afterNDWI -
        beforeNDWI
      : null;


  return (
    <View
      style={
        styles.ndwiCard
      }
    >

      <Text
        style={
          styles.ndwiTitle
        }
      >
        💧 Water Index (NDWI)
      </Text>


      <View
        style={
          styles.ndwiValues
        }
      >

        <View
          style={
            styles.ndwiValueColumn
          }
        >

          <Text
            style={
              styles.ndwiSmallLabel
            }
          >
            BEFORE
          </Text>


          <Text
            style={
              styles.ndwiNumber
            }
          >
            {Number.isFinite(
              beforeNDWI
            )
              ? beforeNDWI.toFixed(
                  3
                )
              : "N/A"}
          </Text>

        </View>


        <Text style={styles.arrow}>
          →
        </Text>


        <View
          style={
            styles.ndwiValueColumn
          }
        >

          <Text
            style={
              styles.ndwiSmallLabel
            }
          >
            AFTER
          </Text>


          <Text
            style={
              styles.ndwiNumber
            }
          >
            {Number.isFinite(
              afterNDWI
            )
              ? afterNDWI.toFixed(
                  3
                )
              : "N/A"}
          </Text>

        </View>


        <View
          style={
            styles.ndwiChangeBox
          }
        >

          <Text
            style={
              styles.ndwiSmallLabel
            }
          >
            CHANGE
          </Text>


          <Text
            style={
              styles.ndwiChangeNumber
            }
          >
            {Number.isFinite(
              ndwiChange
            )
              ? `${
                  ndwiChange >=
                  0
                    ? "+"
                    : ""
                }${ndwiChange.toFixed(
                  3
                )}`
              : "N/A"}
          </Text>

        </View>

      </View>

    </View>
  );
}


// ============================================================
// SATELLITE INDICATORS
// ============================================================

function SatelliteIndicators({
  indicators,
}) {

  console.log(
    "========== SATELLITE INDICATORS =========="
  );

  console.log(
    JSON.stringify(
      indicators,
      null,
      2
    )
  );

  console.log(
    "=========================================="
  );


  if (!indicators) {
    return (
      <View
        style={
          styles.indicatorUnavailableCard
        }
      >

        <Text
          style={
            styles.indicatorUnavailableTitle
          }
        >
          🛰️ Satellite Watershed Indicators
        </Text>


        <Text
          style={
            styles.indicatorUnavailableText
          }
        >
          No satellite indicator data was
          returned by the backend.
        </Text>

      </View>
    );
  }


  /*
  ============================================================
  SUPPORTED STRUCTURE 1

  {
    vegetation: {
      before: 20,
      after: 30,
      change: 10
    }
  }

  ============================================================

  SUPPORTED STRUCTURE 2

  {
    before: {
      vegetation: 20
    },

    after: {
      vegetation: 30
    },

    change: {
      vegetation: 10
    }
  }

  ============================================================
  */


  const indicatorNames = [

    {
      key: "vegetation",
      title: "🌱 Vegetation",
      description:
        "NDVI-based vegetation condition",
    },

    {
      key: "waterAvailability",
      title: "💧 Water Availability",
      description:
        "Satellite-derived water/environment proxy",
    },

    {
      key: "waterRetention",
      title: "💦 Water Retention",
      description:
        "Satellite-derived retention proxy",
    },

    {
      key: "structureCondition",
      title: "🏗️ Structure Condition",
      description:
        "Satellite environmental proxy",
    },

    {
      key: "maintenance",
      title: "🔧 Maintenance",
      description:
        "Satellite temporal-condition proxy",
    },

    {
      key: "overall",
      title: "📊 Overall Satellite Impact",
      description:
        "Combined satellite-derived prototype score",
    },

  ];


  // ==========================================================
  // GET INDICATOR DATA
  // ==========================================================

  const getIndicatorData = (
    key
  ) => {

    // --------------------------------------------------------
    // STRUCTURE 1
    // --------------------------------------------------------

    if (
      indicators?.[key] &&
      typeof indicators[key] ===
        "object" &&
      (
        indicators[key]?.before !==
          undefined ||

        indicators[key]?.after !==
          undefined ||

        indicators[key]?.change !==
          undefined
      )
    ) {

      return indicators[key];
    }


    // --------------------------------------------------------
    // STRUCTURE 2
    // --------------------------------------------------------

    if (
      indicators?.before?.[key] !==
        undefined ||

      indicators?.after?.[key] !==
        undefined ||

      indicators?.change?.[key] !==
        undefined
    ) {

      return {

        before:
          indicators?.before?.[key],

        after:
          indicators?.after?.[key],

        change:
          indicators?.change?.[key],

        percentageChange:
          indicators?.change?.[
            `${key}PercentageChange`
          ],
      };
    }


    // --------------------------------------------------------
    // SOME BACKENDS USE "score"
    // --------------------------------------------------------

    if (
      indicators?.[key] !==
        undefined
    ) {

      const value =
        indicators[key];

      if (
        typeof value ===
        "number"
      ) {

        return {
          before: null,
          after: value,
          change: null,
        };
      }
    }


    return null;
  };


  return (
    <View
      style={
        styles.satelliteIndicatorsCard
      }
    >

      <Text
        style={
          styles.satelliteIndicatorsTitle
        }
      >
        🛰️ Satellite-Based Watershed
        Assessment
      </Text>


      <Text
        style={
          styles.satelliteIndicatorsSubtitle
        }
      >
        Satellite-derived indicators are
        compared for the same project area
        before and after implementation.
      </Text>


      {indicatorNames.map(
        (item) => {

          const indicatorData =
            getIndicatorData(
              item.key
            );


          console.log(
            `Indicator ${item.key}:`,
            indicatorData
          );


          return (
            <SatelliteIndicatorRow
              key={item.key}
              title={item.title}
              description={
                item.description
              }
              data={
                indicatorData
              }
              overall={
                item.key ===
                "overall"
              }
            />
          );
        }
      )}


      {/* EXPLANATION */}

      <View
        style={
          styles.proxyExplanation
        }
      >

        <Text
          style={
            styles.proxyExplanationTitle
          }
        >
          ℹ️ How these indicators work
        </Text>


        <Text
          style={
            styles.proxyExplanationText
          }
        >
          Vegetation is primarily derived
          from NDVI. Water Availability and
          Water Retention use satellite
          water/environment information.
          Structure Condition and Maintenance
          are environmental proxy indicators
          and are not direct physical
          measurements of structures.
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// SATELLITE INDICATOR ROW
// ============================================================

function SatelliteIndicatorRow({
  title,
  description,
  data,
  overall = false,
}) {

  // ----------------------------------------------------------
  // NO DATA
  // ----------------------------------------------------------

  if (!data) {

    return (
      <View
        style={[
          styles.satelliteIndicator,
          overall &&
            styles.overallIndicator,
        ]}
      >

        <Text
          style={
            styles.satelliteIndicatorTitle
          }
        >
          {title}
        </Text>


        <Text
          style={
            styles.indicatorMissing
          }
        >
          Data unavailable
        </Text>


        <Text
          style={
            styles.indicatorMissingReason
          }
        >
          This indicator was not returned
          by the backend.
        </Text>

      </View>
    );
  }


  // ----------------------------------------------------------
  // EXTRACT VALUES
  // ----------------------------------------------------------

  let before =
    data?.before;

  let after =
    data?.after;

  let change =
    data?.change;


  /*
  Backend can sometimes return:

  before: {
    value: 20
  }
  */

  if (
    before &&
    typeof before ===
      "object"
  ) {

    before =
      before?.value ??
      before?.score ??
      before?.ndvi ??
      before?.ndwi ??
      before?.index ??
      before?.mean ??
      before;
  }


  if (
    after &&
    typeof after ===
      "object"
  ) {

    after =
      after?.value ??
      after?.score ??
      after?.ndvi ??
      after?.ndwi ??
      after?.index ??
      after?.mean ??
      after;
  }


  if (
    change &&
    typeof change ===
      "object"
  ) {

    change =
      change?.value ??
      change?.score ??
      change?.change ??
      change?.ndviChange ??
      change?.ndwiChange ??
      change?.indexChange ??
      change;
  }


  // ----------------------------------------------------------
  // NUMBER CONVERSION
  // ----------------------------------------------------------

  const beforeNumber =
    Number(before);

  const afterNumber =
    Number(after);

  let changeNumber =
    Number(change);


  // ----------------------------------------------------------
  // CALCULATE CHANGE IF MISSING
  // ----------------------------------------------------------

  if (
    !Number.isFinite(
      changeNumber
    ) &&

    Number.isFinite(
      beforeNumber
    ) &&

    Number.isFinite(
      afterNumber
    )
  ) {

    changeNumber =
      afterNumber -
      beforeNumber;
  }


  // ----------------------------------------------------------
  // PERCENTAGE
  // ----------------------------------------------------------

  let percentageChange =
    Number(
      data?.percentageChange
    );


  if (
    !Number.isFinite(
      percentageChange
    )
  ) {

    if (
      Number.isFinite(
        beforeNumber
      ) &&

      Number.isFinite(
        afterNumber
      ) &&

      beforeNumber !== 0
    ) {

      percentageChange =
        (
          (
            afterNumber -
            beforeNumber
          ) /
          Math.abs(
            beforeNumber
          )
        ) * 100;

    } else {

      percentageChange = 0;
    }
  }


  // ----------------------------------------------------------
  // STATES
  // ----------------------------------------------------------

  const validBefore =
    Number.isFinite(
      beforeNumber
    );


  const validAfter =
    Number.isFinite(
      afterNumber
    );


  const validChange =
    Number.isFinite(
      changeNumber
    );


  const positive =
    changeNumber > 0;


  const negative =
    changeNumber < 0;


  return (
    <View
      style={[
        styles.satelliteIndicator,
        overall &&
          styles.overallIndicator,
      ]}
    >

      {/* TITLE */}

      <Text
        style={
          styles.satelliteIndicatorTitle
        }
      >
        {title}
      </Text>


      {/* DESCRIPTION */}

      <Text
        style={
          styles.satelliteIndicatorDescription
        }
      >
        {description}
      </Text>


      {/* VALUES */}

      <View
        style={
          styles.satelliteIndicatorRow
        }
      >

        {/* BEFORE */}

        <View
          style={
            styles.valueColumn
          }
        >

          <Text
            style={
              styles.satelliteSmallLabel
            }
          >
            BEFORE
          </Text>


          <Text
            style={
              styles.satelliteIndicatorValue
            }
          >
            {validBefore
              ? beforeNumber.toFixed(
                  3
                )
              : "N/A"}
          </Text>

        </View>


        {/* ARROW */}

        <Text style={styles.arrow}>
          →
        </Text>


        {/* AFTER */}

        <View
          style={
            styles.valueColumn
          }
        >

          <Text
            style={
              styles.satelliteSmallLabel
            }
          >
            AFTER
          </Text>


          <Text
            style={
              styles.satelliteIndicatorValue
            }
          >
            {validAfter
              ? afterNumber.toFixed(
                  3
                )
              : "N/A"}
          </Text>

        </View>


        {/* CHANGE */}

        <View
          style={[
            styles.satelliteChangeBox,

            positive
              ? styles.positiveChangeBox
              : negative
              ? styles.negativeChangeBox
              : styles.neutralChangeBox,
          ]}
        >

          <Text
            style={[
              styles.satelliteChange,

              positive
                ? styles.positive
                : negative
                ? styles.negative
                : styles.neutral,
            ]}
          >
            {validChange
              ? `${
                  changeNumber >=
                  0
                    ? "+"
                    : ""
                }${changeNumber.toFixed(
                  3
                )}`
              : "N/A"}
          </Text>


          <Text
            style={
              styles.changeSmallText
            }
          >
            change
          </Text>

        </View>

      </View>


      {/* PERCENTAGE */}

      <View
        style={
          styles.percentageRow
        }
      >

        <Text
          style={
            styles.percentageSmallLabel
          }
        >
          Percentage Change
        </Text>


        <Text
          style={[
            styles.percentageSmallValue,

            positive
              ? styles.positive
              : negative
              ? styles.negative
              : styles.neutral,
          ]}
        >
          {Number.isFinite(
            percentageChange
          )
            ? `${
                percentageChange >=
                0
                  ? "+"
                  : ""
              }${percentageChange.toFixed(
                2
              )}%`
            : "N/A"}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// IMAGE URL HELPER
// ============================================================

function normalizeImageUrl(
  imageUrl
) {

  if (!imageUrl) {
    return null;
  }


  if (
    typeof imageUrl !==
    "string"
  ) {
    return null;
  }


  // Already a data URL

  if (
    imageUrl.startsWith(
      "data:image/"
    )
  ) {
    return imageUrl;
  }


  // Already HTTP URL

  if (
    imageUrl.startsWith(
      "http://"
    ) ||
    imageUrl.startsWith(
      "https://"
    )
  ) {
    return imageUrl;
  }


  // Raw base64 returned by backend

  if (
    imageUrl.length > 100
  ) {

    return `data:image/png;base64,${imageUrl}`;
  }


  return null;
}


// ============================================================
// FIELD SURVEY COMPARISON
// ============================================================

function FieldSurveyComparison({
  comparison,
  project,
  getRecommendationStyle,
}) {

  const {
    before,
    after,
    changes,
    recommendations = [],
  } = comparison || {};


  if (
    !before ||
    !after ||
    !changes
  ) {
    return null;
  }


  return (
    <View>

      {/* ====================================================
          TITLE
      ===================================================== */}

      <Text
        style={
          styles.fieldSectionTitle
        }
      >
        📋 Field Survey Comparison
      </Text>


      {/* ====================================================
          BEFORE PHOTO
      ===================================================== */}

      <View
        style={
          styles.photoSection
        }
      >

        <Text
          style={
            styles.photoHeading
          }
        >
          📸 BEFORE
        </Text>


        {before?.photos?.length >
        0 ? (

          <Image
            source={{
              uri:
                before.photos[0]
                  ?.url ||
                before.photos[0],
            }}
            style={
              styles.comparisonImage
            }
            resizeMode="cover"
          />

        ) : (

          <View
            style={
              styles.noPhoto
            }
          >
            <Text>
              No BEFORE photo
            </Text>
          </View>

        )}

      </View>


      {/* ====================================================
          AFTER PHOTO
      ===================================================== */}

      <View
        style={
          styles.photoSection
        }
      >

        <Text
          style={
            styles.photoHeading
          }
        >
          📸 AFTER
        </Text>


        {after?.photos?.length >
        0 ? (

          <Image
            source={{
              uri:
                after.photos[0]
                  ?.url ||
                after.photos[0],
            }}
            style={
              styles.comparisonImage
            }
            resizeMode="cover"
          />

        ) : (

          <View
            style={
              styles.noPhoto
            }
          >
            <Text>
              No AFTER photo
            </Text>
          </View>

        )}

      </View>


      {/* ====================================================
          IMPACT SCORE
      ===================================================== */}

      <View
        style={
          styles.scoreCard
        }
      >

        <Text
          style={
            styles.sectionTitle
          }
        >
          Field Survey Impact Score
        </Text>


        <View
          style={
            styles.scoreRow
          }
        >

          <View>

            <Text
              style={
                styles.smallLabel
              }
            >
              Before
            </Text>


            <Text
              style={
                styles.beforeScore
              }
            >
              {before?.impactScore ??
                "N/A"}
            </Text>

          </View>


          <Text style={styles.arrow}>
            →
          </Text>


          <View>

            <Text
              style={
                styles.smallLabel
              }
            >
              After
            </Text>


            <Text
              style={
                styles.afterScore
              }
            >
              {after?.impactScore ??
                "N/A"}
            </Text>

          </View>

        </View>


        <Text
          style={[
            styles.changeText,

            Number(
              changes?.impactScoreChange
            ) >= 0
              ? styles.positive
              : styles.negative,
          ]}
        >
          {Number(
            changes?.impactScoreChange
          ) >= 0
            ? "+"
            : ""}

          {changes?.impactScoreChange ??
            0}

          {" "}points
        </Text>

      </View>


      {/* ====================================================
          FIELD INDICATORS
      ===================================================== */}

      <View style={styles.card}>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Field Survey Indicators
        </Text>


        <Indicator
          title="Water Availability"
          before={
            before?.water
          }
          after={
            after?.water
          }
          change={
            changes?.waterChange
          }
        />


        <Indicator
          title="Water Retention"
          before={
            before?.retention
          }
          after={
            after?.retention
          }
          change={
            changes?.retentionChange
          }
        />


        <Indicator
          title="Vegetation"
          before={
            before?.vegetation !==
            undefined
              ? `${before.vegetation}%`
              : "N/A"
          }
          after={
            after?.vegetation !==
            undefined
              ? `${after.vegetation}%`
              : "N/A"
          }
          change={
            changes?.vegetationChange !==
            undefined
              ? `${changes.vegetationChange}%`
              : "N/A"
          }
        />


        <Indicator
          title="Structure Condition"
          before={
            before?.structure
          }
          after={
            after?.structure
          }
          change={
            changes?.structureChange
          }
        />


        <Indicator
          title="Maintenance"
          before={
            before?.maintenance
          }
          after={
            after?.maintenance
          }
          change={
            changes?.maintenanceChange
          }
        />

      </View>


      {/* ====================================================
          RECOMMENDATIONS
      ===================================================== */}

      <View style={styles.card}>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Recommended Actions
        </Text>


        {recommendations.length ===
        0 ? (

          <Text
            style={
              styles.noRecommendation
            }
          >
            No recommendations
            available.
          </Text>

        ) : (

          recommendations.map(
            (item, index) => {

              const recommendationStyle =
                getRecommendationStyle(
                  item?.severity
                );


              return (
                <View
                  key={index}
                  style={[
                    styles.recommendationCard,
                    recommendationStyle.box,
                  ]}
                >

                  <View
                    style={
                      styles.recommendationHeader
                    }
                  >

                    <Text
                      style={[
                        styles.severityBadge,
                        recommendationStyle.badge,
                      ]}
                    >
                      {item?.severity ||
                        "LOW"}
                    </Text>


                    <Text
                      style={[
                        styles.recommendationTitle,
                        recommendationStyle.text,
                      ]}
                    >
                      {item?.title ||
                        "Recommendation"}
                    </Text>

                  </View>


                  <Text
                    style={
                      styles.reasonLabel
                    }
                  >
                    Why?
                  </Text>


                  <Text
                    style={
                      styles.reason
                    }
                  >
                    {item?.reason ||
                      "No reason provided."}
                  </Text>


                  <Text
                    style={
                      styles.actionLabel
                    }
                  >
                    Recommended Action
                  </Text>


                  <Text
                    style={
                      styles.action
                    }
                  >
                    {item?.action ||
                      "No action provided."}
                  </Text>

                </View>
              );
            }
          )
        )}

      </View>


      {/* ====================================================
          CONCLUSION
      ===================================================== */}

      <View
        style={
          styles.conclusionCard
        }
      >

        <Text
          style={
            styles.sectionTitle
          }
        >
          Monitoring Conclusion
        </Text>


        {Number(
          changes?.impactScoreChange
        ) > 0 ? (

          <Text
            style={
              styles.conclusionText
            }
          >
            The project shows improvement
            after implementation. Continue
            monitoring to maintain the
            positive impact.
          </Text>

        ) : Number(
            changes?.impactScoreChange
          ) < 0 ? (

          <Text
            style={
              styles.conclusionText
            }
          >
            The project performance has
            decreased. Corrective action
            and field inspection are
            recommended.
          </Text>

        ) : (

          <Text
            style={
              styles.conclusionText
            }
          >
            The project shows no
            significant change. Continue
            regular monitoring.
          </Text>

        )}

      </View>

    </View>
  );
}


// ============================================================
// FIELD INDICATOR
// ============================================================

function Indicator({
  title,
  before,
  after,
  change,
}) {

  const changeString =
    String(change ?? "");


  const isNegative =
    changeString.startsWith("-");


  return (
    <View
      style={
        styles.indicator
      }
    >

      <Text
        style={
          styles.indicatorTitle
        }
      >
        {title}
      </Text>


      <View
        style={
          styles.indicatorValues
        }
      >

        <Text
          style={
            styles.indicatorValue
          }
        >
          {before ?? "N/A"}
        </Text>


        <Text style={styles.arrow}>
          →
        </Text>


        <Text
          style={
            styles.indicatorValue
          }
        >
          {after ?? "N/A"}
        </Text>


        <Text
          style={[
            styles.indicatorChange,

            isNegative
              ? styles.negative
              : styles.positive,
          ]}
        >
          {changeString
            ? isNegative
              ? changeString
              : `+${changeString}`
            : "N/A"}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // MAIN
    // ========================================================

    container: {
      flex: 1,
      backgroundColor:
        "#F5F7FA",
    },

    content: {
      padding: 20,
      paddingBottom: 60,
    },

    center: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      padding: 20,
    },

    loadingText: {
      marginTop: 10,
      fontSize: 16,
    },

    title: {
      fontSize: 25,
      fontWeight: "700",
      color: "#1F2937",
    },

    projectName: {
      fontSize: 16,
      color: "#6B7280",
      marginTop: 5,
      marginBottom: 20,
    },


    // ========================================================
    // SATELLITE INPUT
    // ========================================================

    satelliteCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 18,
      marginBottom: 18,
      elevation: 2,
    },

    satelliteTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#14532D",
      marginBottom: 8,
    },

    satelliteDescription: {
      fontSize: 14,
      color: "#4B5563",
      lineHeight: 21,
      marginBottom: 15,
    },

    locationBox: {
      backgroundColor:
        "#F0FDF4",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },

    locationTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#166534",
      marginBottom: 5,
    },

    locationText: {
      fontSize: 13,
      color: "#374151",
      marginTop: 2,
    },

    inputLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
      marginBottom: 6,
      marginTop: 8,
    },

    dateInput: {
      borderWidth: 1,
      borderColor:
        "#D1D5DB",
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 15,
      backgroundColor:
        "#FFFFFF",
      color: "#111827",
    },

    dateHint: {
      fontSize: 12,
      color: "#6B7280",
      marginTop: 4,
      marginBottom: 5,
    },

    compareButton: {
      backgroundColor:
        "#166534",
      borderRadius: 11,
      paddingVertical: 14,
      marginTop: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      flexDirection:
        "row",
      gap: 8,
    },

    disabledButton: {
      opacity: 0.7,
    },

    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },

    satelliteErrorBox: {
      backgroundColor:
        "#FEF2F2",
      borderWidth: 1,
      borderColor:
        "#FCA5A5",
      borderRadius: 10,
      padding: 12,
      marginTop: 15,
    },

    satelliteErrorTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#991B1B",
      marginBottom: 5,
    },

    satelliteErrorText: {
      fontSize: 13,
      color: "#7F1D1D",
      lineHeight: 19,
    },


    // ========================================================
    // SAVE TO PROJECT
    // ========================================================

    saveToProjectBox: {
      marginTop: -8,
      marginBottom: 20,
    },

    saveToProjectButton: {
      backgroundColor: "#1D4ED8",
      borderRadius: 11,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    saveSuccessText: {
      color: "#15803D",
      fontSize: 13,
      fontWeight: "700",
      marginTop: 8,
      textAlign: "center",
    },

    saveErrorText: {
      color: "#DC2626",
      fontSize: 13,
      fontWeight: "700",
      marginTop: 8,
      textAlign: "center",
    },


    // ========================================================
    // SATELLITE RESULT
    // ========================================================

    satelliteResultCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      elevation: 2,
    },

    resultTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#1F2937",
    },

    resultSubtitle: {
      fontSize: 13,
      color: "#6B7280",
      marginTop: 4,
      marginBottom: 16,
    },

    imageCard: {
      backgroundColor:
        "#F9FAFB",
      borderRadius: 13,
      padding: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
    },

    imageTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#166534",
    },

    imageDate: {
      fontSize: 13,
      color: "#6B7280",
      marginTop: 3,
      marginBottom: 10,
    },

    satelliteImage: {
      width: "100%",
      height: 230,
      borderRadius: 10,
      backgroundColor:
        "#E5E7EB",
    },

    noSatelliteImage: {
      width: "100%",
      height: 180,
      borderRadius: 10,
      backgroundColor:
        "#E5E7EB",
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    noImageText: {
      color: "#6B7280",
      fontSize: 13,
      textAlign:
        "center",
      paddingHorizontal: 15,
    },


    // ========================================================
    // NDVI
    // ========================================================

    ndviBox: {
      backgroundColor:
        "#ECFDF5",
      borderRadius: 10,
      padding: 12,
      marginTop: 10,
      alignItems:
        "center",
    },

    ndviLabel: {
      fontSize: 13,
      color: "#166534",
      fontWeight: "600",
    },

    ndviValue: {
      fontSize: 30,
      fontWeight: "800",
      color: "#14532D",
      marginTop: 2,
    },

    ndviClassification: {
      fontSize: 13,
      color: "#4B5563",
      marginTop: 2,
    },


    // ========================================================
    // NDVI CHANGE
    // ========================================================

    ndviChangeCard: {
      backgroundColor:
        "#F0FDF4",
      borderRadius: 14,
      padding: 18,
      alignItems:
        "center",
      marginTop: 3,
    },

    changeTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#374151",
    },

    ndviChangeValue: {
      fontSize: 38,
      fontWeight: "800",
      marginTop: 4,
    },

    directionText: {
      fontSize: 16,
      fontWeight: "700",
      marginTop: 3,
      textAlign:
        "center",
    },

    percentageBox: {
      marginTop: 14,
      alignItems:
        "center",
      borderTopWidth: 1,
      borderTopColor:
        "#D1FAE5",
      paddingTop: 12,
      width: "100%",
    },

    percentageLabel: {
      fontSize: 13,
      color: "#6B7280",
    },

    percentageValue: {
      fontSize: 22,
      fontWeight: "800",
      marginTop: 3,
    },


    // ========================================================
    // NDWI
    // ========================================================

    ndwiCard: {
      backgroundColor:
        "#EFF6FF",
      borderRadius: 13,
      padding: 14,
      marginTop: 15,
      borderWidth: 1,
      borderColor:
        "#BFDBFE",
    },

    ndwiTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#1E40AF",
      marginBottom: 12,
    },

    ndwiValues: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    ndwiValueColumn: {
      alignItems:
        "center",
      minWidth: 65,
    },

    ndwiSmallLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: "#64748B",
    },

    ndwiNumber: {
      fontSize: 20,
      fontWeight: "800",
      color: "#1D4ED8",
      marginTop: 3,
    },

    ndwiChangeBox: {
      backgroundColor:
        "#DBEAFE",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems:
        "center",
    },

    ndwiChangeNumber: {
      fontSize: 15,
      fontWeight: "800",
      color: "#1D4ED8",
      marginTop: 2,
    },


    // ========================================================
    // SATELLITE INDICATORS
    // ========================================================

    satelliteIndicatorsCard: {
      backgroundColor:
        "#F8FAFC",
      borderRadius: 15,
      padding: 15,
      marginTop: 15,
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
    },

    satelliteIndicatorsTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: "#14532D",
    },

    satelliteIndicatorsSubtitle: {
      fontSize: 12,
      color: "#64748B",
      lineHeight: 18,
      marginTop: 5,
      marginBottom: 13,
    },

    satelliteIndicator: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 11,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
    },

    overallIndicator: {
      backgroundColor:
        "#F0FDF4",
      borderColor:
        "#86EFAC",
      borderWidth: 1.5,
    },

    satelliteIndicatorTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#1F2937",
    },

    satelliteIndicatorDescription: {
      fontSize: 11,
      color: "#64748B",
      marginTop: 2,
      marginBottom: 9,
    },

    satelliteIndicatorRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    valueColumn: {
      minWidth: 58,
    },

    satelliteSmallLabel: {
      fontSize: 9,
      color: "#64748B",
      fontWeight: "700",
    },

    satelliteIndicatorValue: {
      fontSize: 20,
      fontWeight: "800",
      color: "#166534",
      marginTop: 2,
    },

    satelliteChangeBox: {
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 6,
      alignItems:
        "center",
      minWidth: 65,
    },

    positiveChangeBox: {
      backgroundColor:
        "#DCFCE7",
    },

    negativeChangeBox: {
      backgroundColor:
        "#FEE2E2",
    },

    neutralChangeBox: {
      backgroundColor:
        "#F3F4F6",
    },

    satelliteChange: {
      fontSize: 15,
      fontWeight: "800",
    },

    changeSmallText: {
      fontSize: 9,
      color: "#64748B",
      marginTop: 1,
    },

    percentageRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      borderTopWidth: 1,
      borderTopColor:
        "#E5E7EB",
      marginTop: 10,
      paddingTop: 8,
    },

    percentageSmallLabel: {
      fontSize: 11,
      color: "#64748B",
    },

    percentageSmallValue: {
      fontSize: 13,
      fontWeight: "800",
    },


    // ========================================================
    // PROXY EXPLANATION
    // ========================================================

    proxyExplanation: {
      backgroundColor:
        "#EFF6FF",
      borderRadius: 10,
      padding: 11,
      marginTop: 4,
    },

    proxyExplanationTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#1E40AF",
      marginBottom: 4,
    },

    proxyExplanationText: {
      fontSize: 11,
      color: "#374151",
      lineHeight: 17,
    },

    indicatorUnavailableCard: {
      backgroundColor:
        "#FFFBEB",
      borderWidth: 1,
      borderColor:
        "#FCD34D",
      borderRadius: 12,
      padding: 14,
      marginTop: 15,
    },

    indicatorUnavailableTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#92400E",
    },

    indicatorUnavailableText: {
      fontSize: 12,
      color: "#78350F",
      marginTop: 5,
      lineHeight: 18,
    },

    indicatorMissing: {
      fontSize: 12,
      color: "#9CA3AF",
      marginTop: 5,
    },

    indicatorMissingReason: {
      fontSize: 10,
      color: "#9CA3AF",
      marginTop: 3,
    },


    // ========================================================
    // AREA
    // ========================================================

    areaCard: {
      marginTop: 15,
      backgroundColor:
        "#F9FAFB",
      borderRadius: 10,
      padding: 12,
    },

    areaTitle: {
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 5,
    },

    areaText: {
      fontSize: 12,
      color: "#6B7280",
      marginTop: 2,
    },


    // ========================================================
    // METHOD
    // ========================================================

    methodCard: {
      backgroundColor:
        "#EFF6FF",
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },

    methodTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: "#1E40AF",
      marginBottom: 5,
    },

    methodText: {
      fontSize: 11,
      color: "#374151",
      lineHeight: 17,
    },


    // ========================================================
    // SOURCE
    // ========================================================

    sourceText: {
      fontSize: 11,
      color: "#9CA3AF",
      textAlign:
        "center",
      marginTop: 14,
    },


    // ========================================================
    // FIELD SURVEY
    // ========================================================

    fieldSectionTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#1F2937",
      marginTop: 5,
      marginBottom: 12,
    },

    errorCard: {
      backgroundColor:
        "#FEF2F2",
      borderWidth: 1,
      borderColor:
        "#FCA5A5",
      borderRadius: 14,
      padding: 18,
      marginBottom: 18,
    },

    errorTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: "#991B1B",
      marginBottom: 8,
    },

    errorText: {
      fontSize: 14,
      color: "#7F1D1D",
      textAlign:
        "center",
      lineHeight: 20,
    },

    fieldHelpText: {
      fontSize: 12,
      color: "#7F1D1D",
      lineHeight: 18,
      marginTop: 10,
      textAlign:
        "center",
    },

    photoSection: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 14,
      padding: 12,
      marginBottom: 15,
    },

    photoHeading: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1B5E20",
      marginBottom: 10,
    },

    comparisonImage: {
      width: "100%",
      height: 220,
      borderRadius: 10,
    },

    noPhoto: {
      height: 150,
      backgroundColor:
        "#E5E7EB",
      justifyContent:
        "center",
      alignItems:
        "center",
      borderRadius: 8,
    },


    // ========================================================
    // FIELD SCORE
    // ========================================================

    scoreCard: {
      backgroundColor:
        "#FFFFFF",
      padding: 18,
      borderRadius: 14,
      marginTop: 3,
      alignItems:
        "center",
    },

    card: {
      backgroundColor:
        "#FFFFFF",
      padding: 16,
      borderRadius: 14,
      marginTop: 18,
    },

    sectionTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: "#1F2937",
      marginBottom: 15,
    },

    scoreRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 30,
    },

    smallLabel: {
      fontSize: 13,
      color: "#6B7280",
      textAlign:
        "center",
    },

    beforeScore: {
      fontSize: 35,
      fontWeight: "700",
      textAlign:
        "center",
    },

    afterScore: {
      fontSize: 35,
      fontWeight: "700",
      textAlign:
        "center",
    },

    arrow: {
      fontSize: 25,
      color: "#6B7280",
    },

    changeText: {
      marginTop: 10,
      fontSize: 17,
      fontWeight: "700",
    },

    positive: {
      color: "#15803D",
    },

    negative: {
      color: "#DC2626",
    },

    neutral: {
      color: "#6B7280",
    },


    // ========================================================
    // FIELD INDICATORS
    // ========================================================

    indicator: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        "#E5E7EB",
    },

    indicatorTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 7,
    },

    indicatorValues: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
      flexWrap:
        "wrap",
    },

    indicatorValue: {
      fontSize: 15,
      fontWeight: "600",
    },

    indicatorChange: {
      fontSize: 14,
      fontWeight: "700",
    },


    // ========================================================
    // RECOMMENDATIONS
    // ========================================================

    recommendationCard: {
      padding: 15,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
    },

    highBox: {
      borderColor:
        "#FCA5A5",
      backgroundColor:
        "#FEF2F2",
    },

    mediumBox: {
      borderColor:
        "#FCD34D",
      backgroundColor:
        "#FFFBEB",
    },

    lowBox: {
      borderColor:
        "#86EFAC",
      backgroundColor:
        "#F0FDF4",
    },

    recommendationHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 12,
      gap: 10,
    },

    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 11,
      fontWeight: "700",
      overflow: "hidden",
    },

    highBadge: {
      backgroundColor:
        "#FECACA",
      color: "#991B1B",
    },

    mediumBadge: {
      backgroundColor:
        "#FDE68A",
      color: "#92400E",
    },

    lowBadge: {
      backgroundColor:
        "#BBF7D0",
      color: "#166534",
    },

    recommendationTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
    },

    highText: {
      color: "#991B1B",
    },

    mediumText: {
      color: "#92400E",
    },

    lowText: {
      color: "#166534",
    },

    reasonLabel: {
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 3,
    },

    reason: {
      fontSize: 14,
      color: "#4B5563",
      marginBottom: 10,
      lineHeight: 20,
    },

    actionLabel: {
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 3,
    },

    action: {
      fontSize: 14,
      color: "#374151",
      lineHeight: 20,
    },

    noRecommendation: {
      color: "#6B7280",
    },


    // ========================================================
    // CONCLUSION
    // ========================================================

    conclusionCard: {
      backgroundColor:
        "#FFFFFF",
      padding: 18,
      borderRadius: 14,
      marginTop: 18,
    },

    conclusionText: {
      fontSize: 15,
      color: "#374151",
      lineHeight: 22,
    },

  });