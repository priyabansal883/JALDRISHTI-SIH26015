import NetInfo from "@react-native-community/netinfo";

import api from "./api";

import {
  getOfflineSurveys,
  removeOfflineSurvey,
} from "./offlineStorage";


// ======================================================
// UPLOAD OFFLINE PHOTO
// ======================================================

const uploadOfflinePhoto = async (photoUri) => {
  try {
    console.log("=================================");
    console.log("OFFLINE PHOTO UPLOAD START");
    console.log("PHOTO URI:", photoUri);
    console.log("=================================");

    if (!photoUri) {
      throw new Error("Photo URI is missing");
    }

    const formData = new FormData();

    formData.append("photo", {
      uri: photoUri,
      name: `jaldrishti_${Date.now()}.jpg`,
      type: "image/jpeg",
    });

    console.log("FORM DATA CREATED");
    console.log("Uploading to /photos/upload...");

    /*
     * Do not manually set Content-Type here.
     * Axios/React Native will create the multipart
     * boundary automatically.
     */

    const response = await api.post(
      "/photos/upload",
      formData
    );

    console.log("=================================");
    console.log("OFFLINE PHOTO UPLOAD SUCCESS");
    console.log("PHOTO RESPONSE:", response.data);
    console.log("=================================");

    if (!response.data?.photo?.url) {
      throw new Error(
        "Photo upload succeeded but server did not return a photo URL."
      );
    }

    return response.data.photo;

  } catch (error) {
    console.log("=================================");
    console.log("OFFLINE PHOTO UPLOAD FAILED");
    console.log("STATUS:", error.response?.status);
    console.log(
      "SERVER RESPONSE:",
      error.response?.data
    );
    console.log("MESSAGE:", error.message);
    console.log("URL:", error.config?.url);
    console.log("=================================");

    throw error;
  }
};


// ======================================================
// CONVERT SURVEY TYPE → PHOTO TYPE
// ======================================================

const getPhotoType = (surveyType) => {
  if (surveyType === "BEFORE") {
    return "BEFORE";
  }

  if (surveyType === "AFTER") {
    return "AFTER";
  }

  // MONITORING photo is stored as DURING
  return "DURING";
};


// ======================================================
// CONVERT SURVEY TYPE → SATELLITE ANALYSIS TYPE
// ======================================================

const getAnalysisType = (surveyType) => {
  if (surveyType === "BEFORE") {
    return "BEFORE";
  }

  if (surveyType === "AFTER") {
    return "AFTER";
  }

  return "MONITORING";
};


// ======================================================
// COMPLETE OFFLINE TASK
// ======================================================

const completeOfflineTask = async (
  taskId,
  surveyId,
  workerNotes
) => {

  if (!taskId) {
    console.log(
      "No task ID found. Skipping task completion."
    );

    return false;
  }

  if (!surveyId) {
    console.log(
      "No survey ID found. Cannot complete task."
    );

    return false;
  }

  try {
    console.log("=================================");
    console.log("COMPLETING OFFLINE TASK");
    console.log("TASK ID:", taskId);
    console.log("SURVEY ID:", surveyId);
    console.log("=================================");

    const response = await api.patch(
      `/tasks/${taskId}/complete`,
      {
        surveyId,
        workerNotes: workerNotes || "",
      }
    );

    console.log(
      "Offline task completed successfully:",
      response.data
    );

    return true;

  } catch (error) {

    console.log(
      "Offline task completion failed:",
      error.response?.data ||
        error.message
    );

    return false;
  }
};


// ======================================================
// SYNC OFFLINE SURVEYS
// ======================================================

export const syncOfflineSurveys = async () => {

  try {

    console.log("=================================");
    console.log("OFFLINE SYNC STARTED");
    console.log("=================================");


    // ==================================================
    // CHECK INTERNET
    // ==================================================

    const network =
      await NetInfo.fetch();

    console.log(
      "NETWORK CONNECTED:",
      network.isConnected
    );


    if (!network.isConnected) {

      console.log(
        "No internet connection."
      );

      return {
        success: false,
        synced: 0,
        message:
          "No internet connection",
      };
    }


    // ==================================================
    // GET OFFLINE SURVEYS
    // ==================================================

    const surveys =
      await getOfflineSurveys();

    console.log(
      "TOTAL OFFLINE SURVEYS:",
      surveys.length
    );


    if (surveys.length === 0) {

      console.log(
        "No offline surveys found."
      );

      return {
        success: true,
        synced: 0,
        message:
          "Nothing to sync",
      };
    }


    let syncedCount = 0;


    // ==================================================
    // PROCESS EACH SURVEY
    // ==================================================

    for (const survey of surveys) {

      try {

        console.log("=================================");
        console.log(
          "SYNCING SURVEY:",
          survey.offlineId
        );
        console.log("=================================");


        // ==================================================
        // EXTRACT LOCAL-ONLY DATA
        // ==================================================

        const {
          offlineId,
          savedOfflineAt,
          syncStatus,
          photoUri,
          taskId,

          // Keep the remaining survey data
          ...surveyData

        } = survey;


        console.log(
          "PROJECT ID:",
          surveyData.projectId
        );

        console.log(
          "SURVEY TYPE:",
          surveyData.surveyType
        );

        console.log(
          "TASK ID:",
          taskId
        );


        // ==================================================
        // UPLOAD PHOTO
        // ==================================================

        if (photoUri) {

          console.log("=================================");
          console.log(
            "STEP 1: UPLOADING OFFLINE PHOTO"
          );
          console.log("=================================");


          const uploadedPhoto =
            await uploadOfflinePhoto(
              photoUri
            );


          const photoType =
            getPhotoType(
              surveyData.surveyType
            );


          surveyData.photos = [
            {
              url:
                uploadedPhoto.url,

              publicId:
                uploadedPhoto.publicId ||
                "",

              type:
                photoType,

              latitude:
                surveyData.latitude,

              longitude:
                surveyData.longitude,

              accuracy:
                surveyData.gpsAccuracy ||
                null,

              timestamp:
                surveyData.createdAt ||
                new Date().toISOString(),
            },
          ];


          console.log(
            "PHOTO ADDED TO SURVEY DATA"
          );

        } else {

          console.log(
            "No offline photo found."
          );

        }


        // ==================================================
        // SATELLITE NDVI
        // ==================================================

        let satelliteData = null;


        try {

          if (
            surveyData.latitude !==
              undefined &&

            surveyData.longitude !==
              undefined &&

            surveyData.latitude !==
              null &&

            surveyData.longitude !==
              null
          ) {

            console.log("=================================");
            console.log(
              "STEP 2: FETCHING SATELLITE NDVI"
            );

            console.log(
              "LATITUDE:",
              surveyData.latitude
            );

            console.log(
              "LONGITUDE:",
              surveyData.longitude
            );

            console.log("=================================");


            const response =
              await api.get(
                `/satellite/ndvi?latitude=${surveyData.latitude}&longitude=${surveyData.longitude}`
              );


            satelliteData =
              response.data?.data ||
              null;


            console.log(
              "SATELLITE NDVI RESPONSE:",
              satelliteData
            );

          }

        } catch (error) {

          console.log(
            "Satellite NDVI failed:"
          );

          console.log(
            error.response?.data ||
              error.message
          );


          /*
           * Satellite failure should NOT prevent
           * the field survey from syncing.
           */

          satelliteData = null;
        }


        // ==================================================
        // ADD SATELLITE DATA TO SURVEY
        // ==================================================

        if (satelliteData) {

          surveyData.satelliteNDVI =
            satelliteData.ndvi ??
            null;


          surveyData.satelliteNDVIClassification =
            satelliteData.classification ||
            "";


          surveyData.satelliteDate =
            new Date().toISOString();

        } else {

          surveyData.satelliteNDVI =
            null;


          surveyData.satelliteNDVIClassification =
            "";


          surveyData.satelliteDate =
            null;
        }


        // ==================================================
        // SUBMIT SURVEY
        // ==================================================

        console.log("=================================");
        console.log(
          "STEP 3: SUBMITTING SURVEY"
        );

        console.log(
          "SURVEY DATA:",
          surveyData
        );

        console.log("=================================");


        const surveyResponse =
          await api.post(
            "/surveys",
            surveyData
          );


        console.log("=================================");
        console.log(
          "SURVEY SUBMITTED SUCCESSFULLY"
        );

        console.log(
          "SERVER RESPONSE:",
          surveyResponse.data
        );

        console.log("=================================");


        // ==================================================
        // GET CREATED SURVEY ID
        // ==================================================

        const surveyId =
          surveyResponse.data?.survey?._id ||

          surveyResponse.data?.survey?.id ||

          surveyResponse.data?._id ||

          surveyResponse.data?.id ||

          null;


        console.log(
          "CREATED SURVEY ID:",
          surveyId
        );


        // ==================================================
        // COMPLETE TASK
        // ==================================================

        if (
          taskId &&
          surveyId
        ) {

          console.log(
            "STEP 4: COMPLETING TASK"
          );


          const taskCompleted =
            await completeOfflineTask(
              taskId,
              surveyId,
              surveyData.notes
            );


          if (!taskCompleted) {

            console.log(
              "Survey synced, but task completion failed."
            );

          }

        } else {

          console.log(
            "No task completion required."
          );

        }


        // ==================================================
        // SAVE SATELLITE HISTORY
        // ==================================================

        if (
          satelliteData &&

          satelliteData.ndvi !==
            null &&

          satelliteData.ndvi !==
            undefined
        ) {

          try {

            console.log("=================================");
            console.log(
              "STEP 5: SAVING SATELLITE HISTORY"
            );
            console.log("=================================");


            await api.post(
              "/satellite/analysis",
              {
                projectId:
                  surveyData.projectId,

                ndvi:
                  satelliteData.ndvi,

                classification:
                  satelliteData.classification,

                analysisType:
                  getAnalysisType(
                    surveyData.surveyType
                  ),

                satelliteDate:
                  new Date().toISOString(),

                source:
                  "Copernicus Sentinel-2 L2A",
              }
            );


            console.log(
              "Satellite history saved successfully."
            );

          } catch (error) {

            /*
             * Satellite history is secondary.
             * Survey has already been saved,
             * so don't fail the entire sync.
             */

            console.log(
              "Satellite history save failed:",
              error.response?.data ||
                error.message
            );
          }
        }


        // ==================================================
        // REMOVE OFFLINE SURVEY
        // ==================================================

        /*
         * IMPORTANT:
         *
         * Remove the offline survey ONLY after
         * the main survey has successfully reached
         * the backend.
         */

        await removeOfflineSurvey(
          offlineId
        );


        syncedCount++;


        console.log("=================================");
        console.log(
          `SURVEY ${offlineId} SYNCED SUCCESSFULLY`
        );
        console.log("=================================");


      } catch (error) {

        // ==================================================
        // THIS SURVEY FAILED
        // ==================================================

        console.log("=================================");
        console.log(
          `SURVEY ${survey.offlineId} SYNC FAILED`
        );

        console.log(
          "STATUS:",
          error.response?.status
        );

        console.log(
          "SERVER:",
          error.response?.data
        );

        console.log(
          "MESSAGE:",
          error.message
        );

        console.log(
          "URL:",
          error.config?.url
        );

        console.log("=================================");


        /*
         * DO NOT REMOVE THE OFFLINE SURVEY.
         *
         * It will remain in AsyncStorage and can
         * be retried later.
         */

        continue;
      }
    }


    // ==================================================
    // FINAL RESULT
    // ==================================================

    console.log("=================================");
    console.log("OFFLINE SYNC FINISHED");
    console.log(
      "SYNCED:",
      syncedCount
    );

    console.log(
      "TOTAL:",
      surveys.length
    );

    console.log("=================================");


    return {
      success: true,

      synced:
        syncedCount,

      total:
        surveys.length,

      message:
        `${syncedCount} survey(s) synced`,
    };


  } catch (error) {

    console.log("=================================");
    console.log("OFFLINE SYNC ERROR");
    console.log(error);
    console.log("=================================");


    return {
      success: false,

      synced: 0,

      message:
        "Offline sync failed",
    };
  }
};