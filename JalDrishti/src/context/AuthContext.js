import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      const savedToken =
        await AsyncStorage.getItem("token");

      const savedUser =
        await AsyncStorage.getItem("user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.log("Auth loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (token, userData) => {
      console.log("========== AUTH LOGIN ==========");
  console.log("TOKEN RECEIVED:", !!token);
  console.log("USER DATA:", userData);
  console.log("ROLE:", userData?.role);
  console.log("================================");

    await AsyncStorage.setItem("token", token);

    await AsyncStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    setToken(token);
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};