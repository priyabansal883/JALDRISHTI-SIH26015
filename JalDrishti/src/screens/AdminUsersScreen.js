
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminUsersScreen({ navigation }) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterRole, setFilterRole] = useState("all");
  const [searchText, setSearchText] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("field_worker");
  const [district, setDistrict] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // =========================================================
  // LOAD USERS
  // =========================================================

  const loadUsers = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const query =
        filterRole !== "all"
          ? `?role=${encodeURIComponent(filterRole)}`
          : "";

      const response = await api.get(`/users${query}`);

      setUsers(response.data?.users || []);
    } catch (error) {
      console.log(
        "Load users error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Unable to load users",
        error.response?.data?.message ||
          "Please check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [filterRole])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers(false);
  };

  // =========================================================
  // USER COUNTS
  // =========================================================

  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      field_worker: users.filter(
        (item) => item.role === "field_worker"
      ).length,
      officer: users.filter(
        (item) => item.role === "officer"
      ).length,
      admin: users.filter(
        (item) => item.role === "admin"
      ).length,
    };
  }, [users]);

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((item) => {
      return (
        item.name?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        item.district?.toLowerCase().includes(query) ||
        item.role?.toLowerCase().includes(query)
      );
    });
  }, [users, searchText]);

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("field_worker");
    setDistrict("");
    setShowPassword(false);
  };

  // =========================================================
  // CREATE USER
  // =========================================================

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // =========================================================
  // EDIT USER
  // =========================================================

  const openEditModal = (selectedUser) => {
    setEditingUser(selectedUser);

    setName(selectedUser.name || "");
    setEmail(selectedUser.email || "");
    setPassword("");
    setRole(selectedUser.role || "field_worker");
    setDistrict(selectedUser.district || "");

    setShowPassword(false);
    setModalVisible(true);
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    resetForm();
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert("Missing information", "Please enter the user's name.");
      return false;
    }

    if (!email.trim()) {
      Alert.alert("Missing information", "Please enter an email address.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return false;
    }

    if (!editingUser && !password.trim()) {
      Alert.alert(
        "Missing password",
        "A password is required when creating a new user."
      );
      return false;
    }

    if (!editingUser && password.length < 6) {
      Alert.alert(
        "Weak password",
        "Password should contain at least 6 characters."
      );
      return false;
    }

    if (editingUser && password.trim() && password.length < 6) {
      Alert.alert(
        "Weak password",
        "Password should contain at least 6 characters."
      );
      return false;
    }

    return true;
  };

  // =========================================================
  // SAVE USER
  // =========================================================

  const saveUser = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (editingUser) {
        const payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          district: district.trim(),
        };

        if (password.trim()) {
          payload.password = password;
        }

        await api.put(`/users/${editingUser._id}`, payload);

        Alert.alert(
          "User updated",
          `${name.trim()} has been updated successfully.`
        );
      } else {
        await api.post("/users", {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          district: district.trim(),
        });

        Alert.alert(
          "User created",
          `${name.trim()} has been added successfully.`
        );
      }

      setModalVisible(false);
      resetForm();

      await loadUsers(false);
    } catch (error) {
      console.log(
        "Save user error:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Operation failed",
        error.response?.data?.message ||
          "Unable to save the user. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE USER
  // =========================================================

  const deleteUser = (selectedUser) => {
    if (
      currentUser?._id &&
      selectedUser?._id === currentUser._id
    ) {
      Alert.alert(
        "Action not allowed",
        "You cannot delete the admin account currently being used."
      );
      return;
    }

    Alert.alert(
      "Delete user?",
      `This will permanently remove ${selectedUser.name}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(selectedUser._id);

              await api.delete(`/users/${selectedUser._id}`);

              Alert.alert(
                "User deleted",
                `${selectedUser.name} has been removed.`
              );

              await loadUsers(false);
            } catch (error) {
              console.log(
                "Delete user error:",
                error.response?.data || error.message
              );

              Alert.alert(
                "Delete failed",
                error.response?.data?.message ||
                  "Unable to delete this user."
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // =========================================================
  // ROLE HELPERS
  // =========================================================

  const getRoleColor = (userRole) => {
    switch (userRole) {
      case "admin":
        return "#7C3AED";

      case "officer":
        return "#2563EB";

      case "field_worker":
        return "#059669";

      default:
        return "#64748B";
    }
  };

  const getRoleBackground = (userRole) => {
    switch (userRole) {
      case "admin":
        return "#F3E8FF";

      case "officer":
        return "#EFF6FF";

      case "field_worker":
        return "#ECFDF5";

      default:
        return "#F1F5F9";
    }
  };

  const getRoleLabel = (userRole) => {
    switch (userRole) {
      case "field_worker":
        return "Field Worker";

      case "officer":
        return "Officer";

      case "admin":
        return "Administrator";

      default:
        return "User";
    }
  };

  const getInitials = (userName) => {
    if (!userName) return "U";

    const parts = userName.trim().split(" ");

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  // =========================================================
  // RENDER FILTER
  // =========================================================

  const renderFilter = (value, label) => {
    const active = filterRole === value;

    return (
      <TouchableOpacity
        key={value}
        activeOpacity={0.8}
        style={[
          styles.filterChip,
          active && styles.filterChipActive,
        ]}
        onPress={() => setFilterRole(value)}
      >
        <Text
          style={[
            styles.filterChipText,
            active && styles.filterChipTextActive,
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.countBadge,
            active && styles.countBadgeActive,
          ]}
        >
          <Text
            style={[
              styles.countText,
              active && styles.countTextActive,
            ]}
          >
            {roleCounts[value]}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================================================
  // USER CARD
  // =========================================================

  const renderUser = ({ item }) => {
    const roleColor = getRoleColor(item.role);
    const roleBackground = getRoleBackground(item.role);
    const isDeleting = deletingId === item._id;

    return (
      <View style={styles.userCard}>
        <View style={styles.userTop}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: roleBackground },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: roleColor },
              ]}
            >
              {getInitials(item.name)}
            </Text>
          </View>

          <View style={styles.userMain}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name || "Unnamed User"}
            </Text>

            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email || "No email"}
            </Text>

            {item.district ? (
              <Text style={styles.userDistrict} numberOfLines={1}>
                📍 {item.district}
              </Text>
            ) : (
              <Text style={styles.noDistrict}>
                District not assigned
              </Text>
            )}
          </View>

          <View
            style={[
              styles.roleBadge,
              { backgroundColor: roleBackground },
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                { color: roleColor },
              ]}
            >
              {getRoleLabel(item.role)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.editButton}
            onPress={() => openEditModal(item)}
            disabled={isDeleting}
          >
            <Text style={styles.editIcon}>✎</Text>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.deleteButton}
            onPress={() => deleteUser(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator
                size="small"
                color="#DC2626"
              />
            ) : (
              <>
                <Text style={styles.deleteIcon}>🗑</Text>
                <Text style={styles.deleteButtonText}>
                  Delete
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCircle}>
          <ActivityIndicator
            size="large"
            color="#6D28D9"
          />
        </View>

        <Text style={styles.loadingTitle}>
          Loading users
        </Text>

        <Text style={styles.loadingSubtitle}>
          Please wait...
        </Text>
      </View>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <View style={styles.container}>
      {/* ====================================================
          HEADER
      ==================================================== */}

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerEyebrow}>
              ADMINISTRATION
            </Text>

            <Text style={styles.headerTitle}>
              User Management
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage system users and access roles
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.addButton}
            onPress={openCreateModal}
          >
            <Text style={styles.addButtonIcon}>＋</Text>
            <Text style={styles.addButtonText}>
              Add User
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH */}

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email, district..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              style={styles.clearSearch}
            >
              <Text style={styles.clearSearchText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ====================================================
          FILTERS
      ==================================================== */}

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>
          Filter by role
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {renderFilter("all", "All")}
          {renderFilter("field_worker", "Field Workers")}
          {renderFilter("officer", "Officers")}
          {renderFilter("admin", "Admins")}
        </ScrollView>
      </View>

      {/* ====================================================
          RESULT HEADER
      ==================================================== */}

      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.resultTitle}>
            Users
          </Text>

          <Text style={styles.resultSubtitle}>
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1
              ? "user"
              : "users"}{" "}
            found
          </Text>
        </View>

        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>
            {users.length} total
          </Text>
        </View>
      </View>

      {/* ====================================================
          USER LIST
      ==================================================== */}

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) =>
          item._id?.toString()
        }
        renderItem={renderUser}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredUsers.length === 0 &&
            styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6D28D9"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>
                👥
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No users found
            </Text>

            <Text style={styles.emptySubtitle}>
              {searchText
                ? "Try changing your search."
                : "No users match the selected filter."}
            </Text>

            {searchText ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchText("")}
              >
                <Text style={styles.clearButtonText}>
                  Clear Search
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {/* ====================================================
          CREATE / EDIT MODAL
      ==================================================== */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <View style={styles.modalContainer}>
            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  USER ACCOUNT
                </Text>

                <Text style={styles.modalTitle}>
                  {editingUser
                    ? "Edit User"
                    : "Add New User"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.modalCloseText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              {/* NAME */}

              <Text style={styles.inputLabel}>
                Full Name
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>
                  👤
                </Text>

                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>

              {/* EMAIL */}

              <Text style={styles.inputLabel}>
                Email Address
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>
                  ✉
                </Text>

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="user@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* PASSWORD */}

              <Text style={styles.inputLabel}>
                Password
                {editingUser
                  ? "  (optional)"
                  : "  *"}
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>
                  🔒
                </Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current"
                      : "Minimum 6 characters"
                  }
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPassword((prev) => !prev)
                  }
                  style={styles.passwordToggle}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* DISTRICT */}

              <Text style={styles.inputLabel}>
                District
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>
                  📍
                </Text>

                <TextInput
                  style={styles.input}
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="Enter district"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>

              {/* ROLE */}

              <Text style={styles.inputLabel}>
                Access Role
              </Text>

              <View style={styles.roleGrid}>
                {[
                  {
                    value: "field_worker",
                    title: "Field Worker",
                    icon: "👷",
                    description: "Collect field surveys",
                  },
                  {
                    value: "officer",
                    title: "Officer",
                    icon: "📋",
                    description: "Manage projects",
                  },
                  {
                    value: "admin",
                    title: "Admin",
                    icon: "🛡",
                    description: "Full system access",
                  },
                ].map((item) => {
                  const selected =
                    role === item.value;

                  return (
                    <TouchableOpacity
                      key={item.value}
                      activeOpacity={0.8}
                      style={[
                        styles.roleCard,
                        selected &&
                          styles.roleCardSelected,
                      ]}
                      onPress={() =>
                        setRole(item.value)
                      }
                    >
                      <View
                        style={[
                          styles.roleIconCircle,
                          selected &&
                            styles.roleIconCircleSelected,
                        ]}
                      >
                        <Text style={styles.roleIcon}>
                          {item.icon}
                        </Text>
                      </View>

                      <View style={styles.roleCardText}>
                        <Text
                          style={[
                            styles.roleCardTitle,
                            selected &&
                              styles.roleCardTitleSelected,
                          ]}
                        >
                          {item.title}
                        </Text>

                        <Text
                          style={[
                            styles.roleCardDescription,
                            selected &&
                              styles.roleCardDescriptionSelected,
                          ]}
                        >
                          {item.description}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radio,
                          selected &&
                            styles.radioSelected,
                        ]}
                      >
                        {selected && (
                          <View
                            style={
                              styles.radioInner
                            }
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ACTIONS */}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.cancelButton}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.saveButton,
                    saving &&
                      styles.saveButtonDisabled,
                  ]}
                  onPress={saveUser}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Text style={styles.saveButtonIcon}>
                        ✓
                      </Text>

                      <Text style={styles.saveButtonText}>
                        {editingUser
                          ? "Update User"
                          : "Create User"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // =======================================================
  // LOADING
  // =======================================================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  loadingCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },

  loadingSubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748B",
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    backgroundColor: "#4A148C",
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  headerEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#D8B4FE",
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#E9D5FF",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 3,
  },

  addButtonIcon: {
    fontSize: 18,
    color: "#6D28D9",
    fontWeight: "700",
    marginRight: 3,
  },

  addButtonText: {
    color: "#5B21B6",
    fontSize: 12,
    fontWeight: "800",
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchBox: {
    marginTop: 18,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },

  searchIcon: {
    fontSize: 24,
    color: "#64748B",
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#1E293B",
  },

  clearSearch: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  clearSearchText: {
    fontSize: 24,
    color: "#64748B",
  },

  // =======================================================
  // FILTER
  // =======================================================

  filterSection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  filterTitle: {
    marginHorizontal: 18,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 9,
  },

  filterScroll: {
    paddingHorizontal: 15,
    gap: 8,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 13,
    paddingRight: 6,
    height: 36,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  filterChipActive: {
    backgroundColor: "#6D28D9",
    borderColor: "#6D28D9",
  },

  filterChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  countBadge: {
    marginLeft: 7,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  countBadgeActive: {
    backgroundColor: "#FFFFFF",
  },

  countText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },

  countTextActive: {
    color: "#6D28D9",
  },

  // =======================================================
  // RESULT HEADER
  // =======================================================

  resultHeader: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },

  resultSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },

  totalBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },

  totalBadgeText: {
    color: "#6D28D9",
    fontSize: 11,
    fontWeight: "700",
  },

  // =======================================================
  // LIST
  // =======================================================

  listContent: {
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 40,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  // =======================================================
  // USER CARD
  // =======================================================

  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  userTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 17,
    fontWeight: "900",
  },

  userMain: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 8,
  },

  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },

  userEmail: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  userDistrict: {
    marginTop: 5,
    fontSize: 11,
    color: "#475569",
  },

  noDistrict: {
    marginTop: 5,
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
  },

  roleBadge: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },

  roleBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 14,
    marginBottom: 11,
  },

  cardFooter: {
    flexDirection: "row",
    gap: 9,
  },

  editButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  editIcon: {
    color: "#2563EB",
    fontSize: 16,
    marginRight: 5,
  },

  editButtonText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
  },

  deleteButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  deleteIcon: {
    fontSize: 13,
    marginRight: 5,
  },

  deleteButtonText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  },

  // =======================================================
  // EMPTY
  // =======================================================

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 70,
  },

  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 30,
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },

  emptySubtitle: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },

  clearButton: {
    marginTop: 15,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#6D28D9",
    borderRadius: 9,
  },

  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // =======================================================
  // MODAL
  // =======================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "92%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  modalEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#7C3AED",
  },

  modalTitle: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCloseText: {
    fontSize: 27,
    lineHeight: 28,
    color: "#475569",
  },

  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },

  // =======================================================
  // INPUTS
  // =======================================================

  inputLabel: {
    marginTop: 15,
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  inputWrapper: {
    height: 48,
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  inputIcon: {
    width: 27,
    fontSize: 16,
  },

  input: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#1E293B",
  },

  passwordToggle: {
    paddingHorizontal: 5,
    paddingVertical: 6,
  },

  passwordToggleText: {
    color: "#6D28D9",
    fontSize: 11,
    fontWeight: "800",
  },

  // =======================================================
  // ROLE CARDS
  // =======================================================

  roleGrid: {
    marginTop: 3,
    gap: 8,
  },

  roleCard: {
    minHeight: 65,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  roleCardSelected: {
    borderColor: "#7C3AED",
    backgroundColor: "#FAF5FF",
  },

  roleIconCircle: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  roleIconCircleSelected: {
    backgroundColor: "#EDE9FE",
  },

  roleIcon: {
    fontSize: 19,
  },

  roleCardText: {
    flex: 1,
    marginLeft: 10,
  },

  roleCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },

  roleCardTitleSelected: {
    color: "#6D28D9",
  },

  roleCardDescription: {
    marginTop: 2,
    fontSize: 10,
    color: "#94A3B8",
  },

  roleCardDescriptionSelected: {
    color: "#7C3AED",
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },

  radioSelected: {
    borderColor: "#7C3AED",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7C3AED",
  },

  // =======================================================
  // MODAL ACTIONS
  // =======================================================

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 25,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
  },

  saveButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 11,
    backgroundColor: "#6D28D9",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonIcon: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginRight: 6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
