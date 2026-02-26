import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const initialUsersState = {
  data: [],
  loading: false,
  error: "",
  lastFetched: null,
};

const ManagerContext = createContext(null);

function redirectToLogin() {
  window.location.href = "/login";
}

export function ManagerProvider({ children }) {
  const [usersState, setUsersState] = useState(initialUsersState);

  const refreshUsers = useCallback(async ({ signal } = {}) => {
    setUsersState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await fetch("/manager/api/users", {
        headers: { Accept: "application/json" },
        credentials: "include",
        signal,
      });
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return { success: false, message: "Unauthorized" };
      }
      if (!res.ok) {
        throw new Error("Failed to load users");
      }
      const data = await res.json();
      if (signal?.aborted) {
        return { success: false, message: "aborted" };
      }
      setUsersState({
        data: data.users || [],
        loading: false,
        error: "",
        lastFetched: Date.now(),
      });
      return { success: true };
    } catch (err) {
      if (signal?.aborted) {
        return { success: false, message: "aborted" };
      }
      setUsersState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load users",
      }));
      return { success: false, message: err.message || "Failed to load users" };
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshUsers({ signal: controller.signal });
    return () => controller.abort();
  }, [refreshUsers]);

  const updateUserStatus = useCallback(async (userId, action) => {
    if (!userId || !["suspend", "restore"].includes(action)) {
      return { success: false, message: "Invalid action" };
    }
    try {
      const res = await fetch(`/manager/users/${action}/${userId}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const payload = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return { success: false, message: "Unauthorized" };
      }
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Action failed");
      }
      setUsersState((prev) => ({
        ...prev,
        data: prev.data.map((user) =>
          user._id === userId
            ? { ...user, suspended: action === "suspend" }
            : user
        ),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || "Action failed" };
    }
  }, []);

  const createManager = useCallback(
    async ({ name, email, phone, password }) => {
      try {
        const res = await fetch("/manager/users/create-manager", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            email,
            phone,
            password,
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          redirectToLogin();
          return { success: false, message: "Unauthorized" };
        }
        if (!res.ok || !payload.success) {
          throw new Error(payload.message || "Create failed");
        }
        setUsersState((prev) => ({
          ...prev,
          data: [...prev.data, payload.user],
        }));
        return { success: true, user: payload.user };
      } catch (err) {
        return { success: false, message: err.message || "Create failed" };
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      usersState,
      refreshUsers,
      updateUserStatus,
      createManager,
    }),
    [usersState, refreshUsers, updateUserStatus, createManager]
  );

  return (
    <ManagerContext.Provider value={value}>{children}</ManagerContext.Provider>
  );
}

export function useManagerContext() {
  const contextValue = useContext(ManagerContext);
  if (!contextValue) {
    throw new Error("useManagerContext must be used within a ManagerProvider");
  }
  return contextValue;
}
