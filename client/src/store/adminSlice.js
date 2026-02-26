import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const ADMIN_STATE_STORAGE_KEY = "adminState";

function loadPersistedAdminState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        dashboard: parsed.dashboard || null,
        lastFetched:
          typeof parsed.lastFetched === "number" ? parsed.lastFetched : null,
      };
    }
  } catch (err) {
    console.warn("Failed to parse admin state", err);
  }
  return null;
}

const baseState = {
  dashboard: null,
  status: "idle",
  error: null,
  lastFetched: null,
};

const persisted = loadPersistedAdminState();

const initialState = persisted
  ? {
      ...baseState,
      ...persisted,
      status: persisted.dashboard ? "succeeded" : "idle",
    }
  : { ...baseState };

export const fetchAdminDashboard = createAsyncThunk(
  "admin/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/admin/api/dashboard", {
        headers: { Accept: "application/json" },
      });
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return rejectWithValue("Unauthorized");
      }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        window.location.href = "/login";
        return rejectWithValue("Invalid response");
      }
      if (!res.ok) {
        return rejectWithValue("Failed to load admin dashboard");
      }
      const data = await res.json();
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  },
);

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearAdminError(state) {
      state.error = null;
    },
    clearAdminState() {
      return { ...baseState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAdminDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.dashboard = action.payload;
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAdminDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearAdminError, clearAdminState } = adminSlice.actions;

export const selectAdminPersistedState = (state) => ({
  dashboard: state.dashboard,
  lastFetched: state.lastFetched,
});

export default adminSlice.reducer;
