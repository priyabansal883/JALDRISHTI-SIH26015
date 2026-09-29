import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_SURVEYS_KEY = "offline_surveys";

export const getOfflineSurveys = async () => {
  try {
    const data = await AsyncStorage.getItem(
      OFFLINE_SURVEYS_KEY
    );

    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.log(
      "Get offline surveys error:",
      error
    );

    return [];
  }
};

export const saveOfflineSurvey = async (
  survey
) => {
  try {
    const existing =
      await getOfflineSurveys();

    const offlineSurvey = {
      ...survey,

      offlineId:
        `offline_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`,

      savedOfflineAt:
        new Date().toISOString(),

      syncStatus: "PENDING",
    };

    existing.push(offlineSurvey);

    await AsyncStorage.setItem(
      OFFLINE_SURVEYS_KEY,
      JSON.stringify(existing)
    );

    console.log(
      "Offline survey saved:",
      offlineSurvey.offlineId
    );

    return offlineSurvey;
  } catch (error) {
    console.log(
      "Save offline survey error:",
      error
    );

    throw error;
  }
};

export const removeOfflineSurvey =
  async (offlineId) => {
    try {
      const existing =
        await getOfflineSurveys();

      const remaining =
        existing.filter(
          (survey) =>
            survey.offlineId !==
            offlineId
        );

      await AsyncStorage.setItem(
        OFFLINE_SURVEYS_KEY,
        JSON.stringify(remaining)
      );
    } catch (error) {
      console.log(
        "Remove offline survey error:",
        error
      );
    }
  };

export const clearOfflineSurveys =
  async () => {
    try {
      await AsyncStorage.removeItem(
        OFFLINE_SURVEYS_KEY
      );
    } catch (error) {
      console.log(
        "Clear offline surveys error:",
        error
      );
    }
  };