import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const MANAGER_STATE_STORAGE_KEY = "managerState";

function loadPersistedManagerState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MANAGER_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        dashboard: parsed.dashboard || null,
        activeProductTab: parsed.activeProductTab || "pending",
        lastFetched:
          typeof parsed.lastFetched === "number" ? parsed.lastFetched : null,
      };
    }
  } catch (err) {
    console.warn("Failed to parse manager state", err);
  }
  return null;
}

const baseState = {
  dashboard: null,
  status: "idle",
  error: null,
  activeProductTab: "pending",
  lastFetched: null,
};

const persisted = loadPersistedManagerState();

const initialState = persisted
  ? {
      ...baseState,
      ...persisted,
      status: persisted.dashboard ? "succeeded" : "idle",
    }
  : { ...baseState };

export const fetchManagerDashboard = createAsyncThunk(
  "manager/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/manager/api/dashboard", {
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
        return rejectWithValue("Failed to load dashboard");
      }
      const data = await res.json();
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

const managerSlice = createSlice({
  name: "manager",
  initialState,
  reducers: {
    setActiveProductTab(state, action) {
      state.activeProductTab = action.payload;
    },
    clearManagerError(state) {
      state.error = null;
    },
    clearManagerState() {
      return { ...baseState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchManagerDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchManagerDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.dashboard = action.payload;
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchManagerDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      });
  },
});

export const { setActiveProductTab, clearManagerState, clearManagerError } =
  managerSlice.actions;

export const selectManagerPersistedState = (state) => ({
  dashboard: state.dashboard,
  activeProductTab: state.activeProductTab,
  lastFetched: state.lastFetched,
});

export default managerSlice.reducer;
