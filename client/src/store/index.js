import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./themeSlice";
import adminReducer, {
  ADMIN_STATE_STORAGE_KEY,
  selectAdminPersistedState,
} from "./adminSlice";
import managerReducer, {
  MANAGER_STATE_STORAGE_KEY,
  selectManagerPersistedState,
} from "./managerSlice";
import customerReducer, {
  CUSTOMER_STATE_STORAGE_KEY,
  selectCustomerPersistedState,
} from "./customerSlice";
import serviceReducer, {
  SERVICE_STATE_STORAGE_KEY,
  selectServicePersistedState,
} from "./serviceSlice";
import sellerReducer, {
  SELLER_STATE_STORAGE_KEY,
  selectSellerPersistedState,
} from "./sellerSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    admin: adminReducer,
    manager: managerReducer,
    customer: customerReducer,
    service: serviceReducer,
    seller: sellerReducer,
  },
});

if (typeof window !== "undefined") {
  store.subscribe(() => {
    const state = store.getState();
    try {
      const adminSnapshot = selectAdminPersistedState(state.admin);
      window.localStorage.setItem(
        ADMIN_STATE_STORAGE_KEY,
        JSON.stringify(adminSnapshot),
      );
    } catch (err) {
      console.warn("Failed to persist admin state", err);
    }

    try {
      const managerSnapshot = selectManagerPersistedState(state.manager);
      window.localStorage.setItem(
        MANAGER_STATE_STORAGE_KEY,
        JSON.stringify(managerSnapshot),
      );
    } catch (err) {
      console.warn("Failed to persist manager state", err);
    }

    try {
      const customerSnapshot = selectCustomerPersistedState(state.customer);
      window.localStorage.setItem(
        CUSTOMER_STATE_STORAGE_KEY,
        JSON.stringify(customerSnapshot),
      );
    } catch (err) {
      console.warn("Failed to persist customer state", err);
    }

    try {
      const serviceSnapshot = selectServicePersistedState(state.service);
      window.localStorage.setItem(
        SERVICE_STATE_STORAGE_KEY,
        JSON.stringify(serviceSnapshot),
      );
    } catch (err) {
      console.warn("Failed to persist service state", err);
    }

    try {
      const sellerSnapshot = selectSellerPersistedState(state.seller);
      window.localStorage.setItem(
        SELLER_STATE_STORAGE_KEY,
        JSON.stringify(sellerSnapshot),
      );
    } catch (err) {
      console.warn("Failed to persist seller state", err);
    }
  });
}
