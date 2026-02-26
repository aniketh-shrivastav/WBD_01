import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const SERVICE_STATE_STORAGE_KEY = "serviceState";
const DEFAULT_EARNINGS_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"];
const DEFAULT_EARNINGS_DATA = [0, 0, 0, 0];

function loadPersistedServiceState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SERVICE_STATE_STORAGE_KEY);
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
    console.warn("Failed to parse service state", err);
  }
  return null;
}

async function safeJsonFetch(url, opts = {}, fallbackValue = null) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "include",
      ...opts,
    });
    if (!res.ok) throw new Error("Request failed");
    const data = await res.json();
    return data;
  } catch (err) {
    return fallbackValue;
  }
}

export const fetchServiceDashboard = createAsyncThunk(
  "service/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/service/api/dashboard", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return rejectWithValue("Unauthorized");
      }
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("application/json")) {
        window.location.href = "/login";
        return rejectWithValue("Invalid response");
      }
      if (!res.ok) {
        return rejectWithValue("Failed to fetch dashboard");
      }
      const dashboard = await res.json();

      const earningsRaw = await safeJsonFetch(
        "/service/api/earnings-data?timeRange=1",
        {},
        { labels: DEFAULT_EARNINGS_LABELS, data: DEFAULT_EARNINGS_DATA }
      );
      const activityRaw = await safeJsonFetch(
        "/service/api/recent-activity?limit=5",
        {},
        { activities: [] }
      );

      return {
        serviceLabels: dashboard.serviceLabels || [],
        serviceCounts: dashboard.serviceCounts || [],
        totals: dashboard.totals || {},
        earningsLabels: earningsRaw?.labels?.length
          ? earningsRaw.labels
          : DEFAULT_EARNINGS_LABELS,
        earningsData: Array.isArray(earningsRaw?.data)
          ? earningsRaw.data
          : DEFAULT_EARNINGS_DATA,
        activities: activityRaw?.activities || [],
      };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

const baseState = {
  dashboard: null,
  status: "idle",
  error: null,
  lastFetched: null,
  hydratedFromStorage: false,
};

const persisted = loadPersistedServiceState();
const initialState = persisted
  ? {
      ...baseState,
      ...persisted,
      status: persisted.dashboard ? "succeeded" : "idle",
      hydratedFromStorage: true,
    }
  : baseState;

const serviceSlice = createSlice({
  name: "service",
  initialState,
  reducers: {
    clearServiceError(state) {
      state.error = null;
    },
    clearServiceState() {
      return { ...baseState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.hydratedFromStorage = false;
      })
      .addCase(fetchServiceDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.dashboard = action.payload;
        state.lastFetched = Date.now();
        state.hydratedFromStorage = false;
      })
      .addCase(fetchServiceDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        state.hydratedFromStorage = false;
      });
  },
});

export const { clearServiceError, clearServiceState } = serviceSlice.actions;
export const selectServicePersistedState = (state) => ({
  dashboard: state.dashboard,
  lastFetched: state.lastFetched,
});

export default serviceSlice.reducer;
