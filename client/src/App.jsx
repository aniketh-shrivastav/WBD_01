import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyOtp from "./pages/VerifyOtp";

import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerUsers from "./pages/manager/Users";
import Profiles from "./pages/manager/Profiles";
import ManagerProfileOverview from "./pages/manager/ProfileOverview";
import ManagerOrders from "./pages/manager/Orders";
import Payments from "./pages/manager/Payments";
import Support from "./pages/manager/Support";
import ManagerChat from "./pages/manager/Chat";
import ServiceCategories from "./pages/manager/ServiceCategories";
import ProductCategories from "./pages/manager/ProductCategories";

import AdminDashboard from "./pages/admin/Dashboard";

import AllIndex from "./pages/all/Index";
import FAQ from "./pages/all/FAQ";
import ContactUs from "./pages/all/ContactUs";

import CustomerIndex from "./pages/customer/Index";
import CustomerBooking from "./pages/customer/Booking";
import CustomerHistory from "./pages/customer/History";
import CustomerCart from "./pages/customer/Cart";
import CustomerProfile from "./pages/customer/Profile";
import CustomerChat from "./pages/customer/Chat";
import ProductDetails from "./pages/customer/ProductDetails";
import OrderDetails from "./pages/customer/OrderDetails";
import ServiceDetails from "./pages/customer/ServiceDetails";
import PaymentSuccess from "./pages/customer/PaymentSuccess";
import MockCheckout from "./pages/customer/MockCheckout";
import CustomerAlerts from "./pages/customer/Alerts";

import ServiceDashboard from "./pages/service/DashboardService";
import ServiceProfileSettings from "./pages/service/ProfileSettings";
import ServiceBookingManagement from "./pages/service/BookingManagement";
import ServiceReviews from "./pages/service/Reviews";

import SellerDashboard from "./pages/seller/Dashboard";
import SellerProfileSettings from "./pages/seller/ProfileSettings";
import SellerProductManagement from "./pages/seller/ProductManagement";
import SellerOrders from "./pages/seller/Orders";
import SellerReviews from "./pages/seller/Reviews";

import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";

// ------------------------------------------

function useSession() {
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/session", {
          headers: { Accept: "application/json" },
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setState({ loading: false, user: j?.user || null });
      } catch {
        if (!cancelled) setState({ loading: false, user: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function RequireRole({ role, children }) {
  const { loading, user } = useSession();

  if (loading) return null; // optionally show spinner
  if (!user) return <Navigate to="/login" replace />;
  if (role) {
    if (role === "admin" && !["admin", "manager"].includes(user.role)) {
      return <Navigate to="/login" replace />;
    }
    if (role !== "admin" && user.role !== role) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

// ------------------------------------------

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<AllIndex />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contactus" element={<ContactUs />} />

      {/* Admin (protected) */}
      <Route
        path="/admin/dashboard"
        element={
          <RequireRole role="admin">
            <AdminDashboard />
          </RequireRole>
        }
      />

      {/* Customer (protected) */}
      <Route
        path="/customer/index"
        element={
          <RequireRole role="customer">
            <CustomerIndex />
          </RequireRole>
        }
      />
      <Route
        path="/customer/booking"
        element={
          <RequireRole role="customer">
            <CustomerBooking />
          </RequireRole>
        }
      />
      <Route
        path="/customer/history"
        element={
          <RequireRole role="customer">
            <CustomerHistory />
          </RequireRole>
        }
      />
      <Route
        path="/customer/cart"
        element={
          <RequireRole role="customer">
            <CustomerCart />
          </RequireRole>
        }
      />
      <Route
        path="/customer/profile"
        element={
          <RequireRole role="customer">
            <CustomerProfile />
          </RequireRole>
        }
      />
      <Route
        path="/customer/chat"
        element={
          <RequireRole role="customer">
            <CustomerChat />
          </RequireRole>
        }
      />
      <Route
        path="/customer/product/:id"
        element={
          <RequireRole role="customer">
            <ProductDetails />
          </RequireRole>
        }
      />
      <Route
        path="/customer/order/:id"
        element={
          <RequireRole role="customer">
            <OrderDetails />
          </RequireRole>
        }
      />
      <Route
        path="/customer/service/:id"
        element={
          <RequireRole role="customer">
            <ServiceDetails />
          </RequireRole>
        }
      />
      <Route
        path="/customer/payment-success"
        element={
          <RequireRole role="customer">
            <PaymentSuccess />
          </RequireRole>
        }
      />
      <Route
        path="/customer/mock-checkout"
        element={
          <RequireRole role="customer">
            <MockCheckout />
          </RequireRole>
        }
      />
      <Route
        path="/customer/alerts"
        element={
          <RequireRole role="customer">
            <CustomerAlerts />
          </RequireRole>
        }
      />

      {/* Service Provider */}
      <Route
        path="/service/dashboard"
        element={
          <RequireRole role="service-provider">
            <ServiceDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/service/dashboardService"
        element={
          <RequireRole role="service-provider">
            <ServiceDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/service/profileSettings"
        element={
          <RequireRole role="service-provider">
            <ServiceProfileSettings />
          </RequireRole>
        }
      />
      <Route
        path="/service/profileSettings.html"
        element={
          <RequireRole role="service-provider">
            <ServiceProfileSettings />
          </RequireRole>
        }
      />
      <Route
        path="/service/bookingManagement"
        element={
          <RequireRole role="service-provider">
            <ServiceBookingManagement />
          </RequireRole>
        }
      />
      <Route
        path="/service/bookingManagement.html"
        element={
          <RequireRole role="service-provider">
            <ServiceBookingManagement />
          </RequireRole>
        }
      />
      <Route
        path="/service/reviews"
        element={
          <RequireRole role="service-provider">
            <ServiceReviews />
          </RequireRole>
        }
      />
      <Route
        path="/service/reviews.html"
        element={
          <RequireRole role="service-provider">
            <ServiceReviews />
          </RequireRole>
        }
      />

      {/* Manager (protected) */}
      <Route
        path="/manager/dashboard"
        element={
          <RequireRole role="manager">
            <ManagerDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/manager/users"
        element={
          <RequireRole role="manager">
            <ManagerUsers />
          </RequireRole>
        }
      />
      <Route
        path="/manager/profiles"
        element={
          <RequireRole role="manager">
            <Profiles />
          </RequireRole>
        }
      />
      <Route
        path="/manager/profiles/:id"
        element={
          <RequireRole role="manager">
            <ManagerProfileOverview />
          </RequireRole>
        }
      />
      <Route
        path="/manager/orders"
        element={
          <RequireRole role="manager">
            <ManagerOrders />
          </RequireRole>
        }
      />
      <Route
        path="/manager/service-categories"
        element={
          <RequireRole role="manager">
            <ServiceCategories />
          </RequireRole>
        }
      />
      <Route
        path="/manager/product-categories"
        element={
          <RequireRole role="manager">
            <ProductCategories />
          </RequireRole>
        }
      />
      <Route
        path="/manager/payments"
        element={
          <RequireRole role="manager">
            <Payments />
          </RequireRole>
        }
      />
      <Route
        path="/manager/support"
        element={
          <RequireRole role="manager">
            <Support />
          </RequireRole>
        }
      />
      <Route
        path="/manager/chat"
        element={
          <RequireRole role="manager">
            <ManagerChat />
          </RequireRole>
        }
      />

      {/* Seller */}
      <Route
        path="/seller/reviews"
        element={
          <RequireRole role="seller">
            <SellerReviews />
          </RequireRole>
        }
      />

      {/* Seller */}
      <Route
        path="/seller/dashboard"
        element={
          <RequireRole role="seller">
            <SellerDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/seller/dashboard.html"
        element={
          <RequireRole role="seller">
            <SellerDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/seller/profileSettings"
        element={
          <RequireRole role="seller">
            <SellerProfileSettings />
          </RequireRole>
        }
      />
      <Route
        path="/seller/profileSettings.html"
        element={
          <RequireRole role="seller">
            <SellerProfileSettings />
          </RequireRole>
        }
      />
      <Route
        path="/seller/productmanagement"
        element={
          <RequireRole role="seller">
            <SellerProductManagement />
          </RequireRole>
        }
      />
      <Route
        path="/seller/productManagement.html"
        element={
          <RequireRole role="seller">
            <SellerProductManagement />
          </RequireRole>
        }
      />
      <Route
        path="/seller/orders"
        element={
          <RequireRole role="seller">
            <SellerOrders />
          </RequireRole>
        }
      />
      <Route
        path="/seller/orders.html"
        element={
          <RequireRole role="seller">
            <SellerOrders />
          </RequireRole>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
