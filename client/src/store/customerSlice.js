import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const CUSTOMER_STATE_STORAGE_KEY = "customerState";

function loadPersistedCustomerState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        history: parsed.history || null,
        lastFetched:
          typeof parsed.lastFetched === "number" ? parsed.lastFetched : null,
      };
    }
  } catch (err) {
    console.warn("Failed to load customer state", err);
  }
  return null;
}

export const fetchCustomerHistory = createAsyncThunk(
  "customer/fetchHistory",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/customer/api/history", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return rejectWithValue("Unauthorized");
      }
      if (!res.ok) {
        const message = await res
          .json()
          .catch(() => ({ message: "Failed to load history" }));
        return rejectWithValue(message?.message || "Failed to load history");
      }
      return res.json();
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

const baseState = {
  history: null,
  status: "idle",
  error: null,
  lastFetched: null,
};

const persisted = loadPersistedCustomerState();

const initialState = persisted
  ? {
      ...baseState,
      ...persisted,
      status: persisted.history ? "succeeded" : "idle",
    }
  : baseState;

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    clearCustomerError(state) {
      state.error = null;
    },
    clearCustomerState: () => ({ ...baseState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerHistory.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCustomerHistory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.history = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchCustomerHistory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearCustomerError, clearCustomerState } = customerSlice.actions;

export const selectCustomerHistory = (state) => state.customer.history;
export const selectCustomerStatus = (state) => state.customer.status;
export const selectCustomerError = (state) => state.customer.error;
export const selectCustomerPersistedState = (state) => ({
  history: state.history,
  lastFetched: state.lastFetched,
});

export default customerSlice.reducer;
