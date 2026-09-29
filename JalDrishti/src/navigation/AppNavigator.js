
import React from "react";
import * as Linking from "expo-linking";

import {
  NavigationContainer,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";

// ============================================================
// AUTH
// ============================================================

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import VerifyOTPScreen from "../screens/VerifyOTPScreen";

// ============================================================
// FIELD WORKER
// ============================================================

import FieldWorkerDashboardScreen from "../screens/FieldWorkerDashboardScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import TaskDetailsScreen from "../screens/TaskDetailsScreen";
import ProjectDetailsScreen from "../screens/ProjectDetailsScreen";
import SurveyScreen from "../screens/SurveyScreen";
import LocationPickerScreen from "../screens/LocationPickerScreen";
import CameraScreen from "../screens/CameraScreen";
import SurveyFormScreen from "../screens/SurveyFormScreen";
import SurveyHistoryScreen from "../screens/SurveyHistoryScreen";
import MapScreen from "../screens/MapScreen";
import ComparisonScreen from "../screens/ComparisonScreen";
import ProfileScreen from "../screens/ProfileScreen";

// ============================================================
// OFFICER
// ============================================================

import CreateProjectScreen from "../screens/CreateProjectScreen";
import AssignProjectScreen from "../screens/AssignProjectScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import DistrictAnalyticsScreen from "../screens/DistrictAnalyticsScreen";
import OfficerDashboardScreen from "../screens/OfficerDashboardScreen";
import AlertsScreen from "../screens/AlertsScreen";

// ============================================================
// ADMIN
// ============================================================

import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminProjectsScreen from "../screens/AdminProjectsScreen";
import AdminUsersScreen from "../screens/AdminUsersScreen";
import AdminTasksScreen from "../screens/AdminTasksScreen";
import AdminTaskDetailsScreen from "../screens/AdminTaskDetailsScreen";

// ============================================================
// STACK
// ============================================================

const Stack = createNativeStackNavigator();

// ============================================================
// DEEP LINKING
// ============================================================

const linking = {
  prefixes: [
    "jaldrishti://",
    "https://jaldrishti.app",
  ],

  config: {
    screens: {
      // ---------------- AUTH ----------------

      Login: "login",

      Register: "register",

      ForgotPassword: "forgot-password",

      ResetPassword: {
        path: "reset-password/:token",

        parse: {
          token: (token) =>
            decodeURIComponent(token),
        },
      },

      // ---------------- FIELD WORKER ----------------

      FieldWorkerDashboard:
        "field-worker-dashboard",

      Dashboard: "dashboard",

      Projects: "projects",

      TaskDetails:
        "task-details/:taskId",

      ProjectDetails:
        "project-details/:projectId",

      Survey:
        "survey/:projectId",

      LocationPicker:
        "location-picker",

      Camera:
        "camera",

      SurveyForm:
        "survey-form",

      SurveyHistory:
        "survey-history",

      Map:
        "map",

      Comparison:
        "comparison",

      Profile:
        "profile",

      // ---------------- OFFICER ----------------

      OfficerDashboard:
        "officer-dashboard",

      CreateProject:
        "create-project",

      AssignProject:
        "assign-project",

      Analytics:
        "analytics",

      DistrictAnalytics:
        "district-analytics",

      Alerts:
        "alerts",

      // ---------------- ADMIN ----------------

      AdminDashboard:
        "admin-dashboard",

      AdminProjects:
        "admin-projects",

      AdminUsers:
        "admin-users",

      AdminTasks:
        "admin-tasks",

      AdminTaskDetails:
        "admin-task-details/:taskId",
    },
  },
};

// ============================================================
// NAVIGATOR
// ============================================================

export default function AppNavigator() {
  const { user, loading } = useAuth();

  console.log("========== NAVIGATOR ==========");
  console.log("LOADING:", loading);
  console.log("USER:", user);
  console.log("ROLE:", user?.role);
  console.log("================================");

  // ----------------------------------------------------------
  // AUTH LOADING
  // ----------------------------------------------------------

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >

        {/* ====================================================
            NOT LOGGED IN
        ==================================================== */}

        {!user && (
          <React.Fragment>

            {/* LOGIN */}

            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />

            {/* REGISTER */}

            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />

            {/* FORGOT PASSWORD */}

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />

            {/* RESET PASSWORD */}

            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />

            {/* VERIFY OTP */}

            <Stack.Screen
              name="VerifyOTP"
              component={VerifyOTPScreen}
            />

          </React.Fragment>
        )}

        {/* ====================================================
            FIELD WORKER
        ==================================================== */}

        {user?.role === "field_worker" && (
          <React.Fragment>

            {/* DASHBOARD */}

            <Stack.Screen
              name="FieldWorkerDashboard"
              component={FieldWorkerDashboardScreen}
            />

            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
            />

            {/* PROJECTS */}

            <Stack.Screen
              name="Projects"
              component={ProjectsScreen}
            />

            {/* TASK */}

            <Stack.Screen
              name="TaskDetails"
              component={TaskDetailsScreen}
            />

            {/* PROJECT DETAILS */}

            <Stack.Screen
              name="ProjectDetails"
              component={ProjectDetailsScreen}
            />

            {/* SURVEY */}

            <Stack.Screen
              name="Survey"
              component={SurveyScreen}
            />

            {/* LOCATION PICKER */}

            <Stack.Screen
              name="LocationPicker"
              component={LocationPickerScreen}
              options={{
                headerShown: false,
              }}
            />

            {/* CAMERA */}

            <Stack.Screen
              name="Camera"
              component={CameraScreen}
            />

            {/* SURVEY FORM */}

            <Stack.Screen
              name="SurveyForm"
              component={SurveyFormScreen}
            />

            {/* HISTORY */}

            <Stack.Screen
              name="SurveyHistory"
              component={SurveyHistoryScreen}
            />

            {/* MAP */}

            <Stack.Screen
              name="Map"
              component={MapScreen}
            />

            {/* COMPARISON */}

            <Stack.Screen
              name="Comparison"
              component={ComparisonScreen}
            />

            {/* PROFILE */}

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
            />

          </React.Fragment>
        )}

        {/* ====================================================
            OFFICER
        ==================================================== */}

        {user?.role === "officer" && (
          <React.Fragment>

            {/* OFFICER DASHBOARD */}

            <Stack.Screen
              name="OfficerDashboard"
              component={OfficerDashboardScreen}
            />

            {/* PROJECTS */}

            <Stack.Screen
              name="Projects"
              component={ProjectsScreen}
            />

            {/* PROJECT DETAILS */}

            <Stack.Screen
              name="ProjectDetails"
              component={ProjectDetailsScreen}
            />

            {/* CREATE PROJECT */}

            <Stack.Screen
              name="CreateProject"
              component={CreateProjectScreen}
            />

            {/* ASSIGN PROJECT */}

            <Stack.Screen
              name="AssignProject"
              component={AssignProjectScreen}
            />

            {/* ANALYTICS */}

            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
            />

            {/* DISTRICT ANALYTICS */}

            <Stack.Screen
              name="DistrictAnalytics"
              component={DistrictAnalyticsScreen}
            />

            {/* ALERTS */}

            <Stack.Screen
              name="Alerts"
              component={AlertsScreen}
            />

            {/* MAP */}

            <Stack.Screen
              name="Map"
              component={MapScreen}
            />

            {/* SURVEY */}

            <Stack.Screen
              name="Survey"
              component={SurveyScreen}
            />

            {/* LOCATION PICKER */}

            <Stack.Screen
              name="LocationPicker"
              component={LocationPickerScreen}
              options={{
                headerShown: false,
              }}
            />

            {/* CAMERA */}

            <Stack.Screen
              name="Camera"
              component={CameraScreen}
            />

            {/* SURVEY FORM */}

            <Stack.Screen
              name="SurveyForm"
              component={SurveyFormScreen}
            />

            {/* HISTORY */}

            <Stack.Screen
              name="SurveyHistory"
              component={SurveyHistoryScreen}
            />

            {/* COMPARISON */}

            <Stack.Screen
              name="Comparison"
              component={ComparisonScreen}
            />

            {/* PROFILE */}

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
            />

          </React.Fragment>
        )}

        {/* ====================================================
            ADMIN
        ==================================================== */}

        {user?.role === "admin" && (
          <React.Fragment>

            {/* ADMIN DASHBOARD */}

            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboardScreen}
            />

            {/* ADMIN USERS */}

            <Stack.Screen
              name="AdminUsers"
              component={AdminUsersScreen}
            />

            {/* ADMIN TASKS */}

            <Stack.Screen
              name="AdminTasks"
              component={AdminTasksScreen}
            />

            {/* ADMIN TASK DETAILS */}

            <Stack.Screen
              name="AdminTaskDetails"
              component={AdminTaskDetailsScreen}
              options={{
                headerShown: false,
              }}
            />

            {/* ADMIN PROJECTS */}

            <Stack.Screen
              name="AdminProjects"
              component={AdminProjectsScreen}
            />

            {/* OFFICER DASHBOARD */}

            <Stack.Screen
              name="OfficerDashboard"
              component={OfficerDashboardScreen}
            />

            {/* PROJECTS */}

            <Stack.Screen
              name="Projects"
              component={ProjectsScreen}
            />

            {/* PROJECT DETAILS */}

            <Stack.Screen
              name="ProjectDetails"
              component={ProjectDetailsScreen}
            />

            {/* CREATE PROJECT */}

            <Stack.Screen
              name="CreateProject"
              component={CreateProjectScreen}
            />

            {/* ASSIGN PROJECT */}

            <Stack.Screen
              name="AssignProject"
              component={AssignProjectScreen}
            />

            {/* ANALYTICS */}

            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
            />

            {/* DISTRICT ANALYTICS */}

            <Stack.Screen
              name="DistrictAnalytics"
              component={DistrictAnalyticsScreen}
            />

            {/* ALERTS */}

            <Stack.Screen
              name="Alerts"
              component={AlertsScreen}
            />

            {/* MAP */}

            <Stack.Screen
              name="Map"
              component={MapScreen}
            />

            {/* SURVEY */}

            <Stack.Screen
              name="Survey"
              component={SurveyScreen}
            />

            {/* LOCATION PICKER */}

            <Stack.Screen
              name="LocationPicker"
              component={LocationPickerScreen}
              options={{
                headerShown: false,
              }}
            />

            {/* CAMERA */}

            <Stack.Screen
              name="Camera"
              component={CameraScreen}
            />

            {/* SURVEY FORM */}

            <Stack.Screen
              name="SurveyForm"
              component={SurveyFormScreen}
            />

            {/* HISTORY */}

            <Stack.Screen
              name="SurveyHistory"
              component={SurveyHistoryScreen}
            />

            {/* COMPARISON */}

            <Stack.Screen
              name="Comparison"
              component={ComparisonScreen}
            />

            {/* PROFILE */}

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
            />

          </React.Fragment>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}
