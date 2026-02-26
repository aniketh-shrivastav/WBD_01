import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const SELLER_STATE_STORAGE_KEY = "sellerState";
const STALE_KEYS = ["dashboard", "lastFetched"];

function loadPersistedSellerState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SELLER_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return STALE_KEYS.reduce((acc, key) => {
        if (key in parsed) acc[key] = parsed[key];
        return acc;
      }, {});
    }
  } catch (err) {
    console.warn("Failed to load seller state", err);
  }
  return null;
}

export const fetchSellerDashboard = createAsyncThunk(
  "seller/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/seller/api/dashboard", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return rejectWithValue("Unauthorized");
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("application/json")) {
        return rejectWithValue("Invalid response from server");
      }

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}));
        return rejectWithValue(
          errorPayload?.message || "Failed to load dashboard"
        );
      }

      const payload = await res.json();
      return {
        stats: {
          totalSales: payload.totalSales || 0,
          totalEarnings: payload.totalEarnings || 0,
          totalOrders: payload.totalOrders || 0,
        },
        stockAlerts: payload.stockAlerts || [],
        recentOrders: payload.recentOrders || [],
        statusDistribution: payload.statusDistribution || {},
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

const persisted = loadPersistedSellerState();
const initialState = persisted
  ? {
      ...baseState,
      ...persisted,
      status: persisted.dashboard ? "succeeded" : "idle",
      hydratedFromStorage: true,
    }
  : baseState;

const sellerSlice = createSlice({
  name: "seller",
  initialState,
  reducers: {
    clearSellerError(state) {
      state.error = null;
    },
    clearSellerState: () => ({ ...baseState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellerDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.hydratedFromStorage = false;
      })
      .addCase(fetchSellerDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.dashboard = action.payload;
        state.lastFetched = Date.now();
        state.hydratedFromStorage = false;
      })
      .addCase(fetchSellerDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        state.hydratedFromStorage = false;
      });
  },
});

export const { clearSellerError, clearSellerState } = sellerSlice.actions;
export const selectSellerPersistedState = (state) => ({
  dashboard: state.dashboard,
  lastFetched: state.lastFetched,
});

export default sellerSlice.reducer;
