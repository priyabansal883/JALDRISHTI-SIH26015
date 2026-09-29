import React, {
  useEffect,
} from "react";

import NetInfo from "@react-native-community/netinfo";

import AppNavigator from "./src/navigation/AppNavigator";

import {
  AuthProvider,
} from "./src/context/AuthContext";

import {
  syncOfflineSurveys,
} from "./src/services/syncService";

export default function App() {
  useEffect(() => {
    syncOfflineSurveys();

    const unsubscribe =
      NetInfo.addEventListener(
        (state) => {
          if (state.isConnected) {
            console.log(
              "Internet connected. Syncing offline surveys..."
            );

            syncOfflineSurveys();
          }
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}