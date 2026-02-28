import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Chart from "chart.js/auto";
import { fetchServiceDashboard } from "../../store/serviceSlice";
import ServiceNav from "../../components/ServiceNav";
import ServiceFooter from "../../components/ServiceFooter";
import "../../Css/service.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

const STALE_AFTER_MS = 1000 * 60 * 5;
const FALLBACK_EARNINGS_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"];
const FALLBACK_EARNINGS_DATA = [0, 0, 0, 0];

export default function ServiceDashboard() {
  // Match legacy CSS and icons
  useLink("/styles/dashboardService.css");
  useLink(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
  );

  const dispatch = useDispatch();
  const { dashboard, status, error, lastFetched, hydratedFromStorage } =
    useSelector((state) => state.service);
  const hasData = Boolean(dashboard);
  const loading = !hasData && (status === "loading" || status === "idle");
  const refreshing = hasData && status === "loading";
  const lastUpdatedText = lastFetched
    ? `Last updated ${new Date(lastFetched).toLocaleString()}${
        refreshing ? " • Refreshing..." : ""
      }`
    : loading
      ? "Loading dashboard..."
      : "Data will refresh shortly.";
  const refreshDisabled = status === "loading";
  const serviceLabels = dashboard?.serviceLabels || [];
  const serviceCounts = dashboard?.serviceCounts || [];
  const earningsLabels = dashboard?.earningsLabels || FALLBACK_EARNINGS_LABELS;
  const earningsData = dashboard?.earningsData || FALLBACK_EARNINGS_DATA;
  const activities = dashboard?.activities || [];
  const totals = dashboard?.totals || {
    earnings: 0,
    ongoing: 0,
    completed: 0,
    avgRating: "N/A",
    totalReviews: 0,
  };

  const pieRef = useRef(null);
  const barRef = useRef(null);
  const pieChart = useRef(null);
  const barChart = useRef(null);
  const socketRef = useRef(null);

  // When data is coming from persisted cache, immediately fetch the
  // server-authoritative snapshot so different providers don't see stale data.
  useEffect(() => {
    if (hydratedFromStorage) {
      dispatch(fetchServiceDashboard());
    }
  }, [dispatch, hydratedFromStorage]);

  useEffect(() => {
    const shouldFetch =
      status === "idle" ||
      !lastFetched ||
      Date.now() - lastFetched > STALE_AFTER_MS;
    if (shouldFetch) {
      dispatch(fetchServiceDashboard());
    }
  }, [dispatch, status, lastFetched]);

  useEffect(() => {
    // Build charts when data available
    if (!pieRef.current || !barRef.current) return;

    // Cleanup previous instances
    if (pieChart.current) pieChart.current.destroy();
    if (barChart.current) barChart.current.destroy();

    try {
      const pieCtx = pieRef.current.getContext("2d");
      pieChart.current = new Chart(pieCtx, {
        type: "pie",
        data: {
          labels: serviceLabels,
          datasets: [
            {
              data: serviceCounts,
              backgroundColor: [
                "rgba(26,188,156,0.85)",
                "rgba(52,152,219,0.85)",
                "rgba(155,89,182,0.85)",
                "rgba(241,196,15,0.85)",
                "rgba(231,76,60,0.85)",
                "rgba(46,204,113,0.85)",
                "rgba(230,126,34,0.85)",
              ],
              hoverOffset: 8,
              borderColor: "rgba(15,42,68,0.06)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#213040" },
            },
          },
        },
      });

      const barCtx = barRef.current.getContext("2d");
      barChart.current = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: earningsLabels,
          datasets: [
            {
              label: "Earnings",
              data: earningsData,
              backgroundColor: "rgba(26,188,156,0.75)",
              borderColor: "rgba(13,139,122,0.45)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Earnings (₹)" },
              ticks: { color: "#213040" },
              grid: { color: "rgba(15,42,68,0.06)" },
            },
            x: {
              title: { display: true, text: "Weeks" },
              ticks: { color: "#213040" },
              grid: { color: "rgba(15,42,68,0.04)" },
            },
          },
          plugins: {
            title: {
              display: true,
              text: "Monthly Earnings Overview (Weekly Basis)",
              color: "#213040",
            },
          },
        },
      });
    } catch (e) {
      // ignore chart errors in case DOM not ready
    }

    return () => {
      if (pieChart.current) pieChart.current.destroy();
      if (barChart.current) barChart.current.destroy();
    };
  }, [serviceLabels, serviceCounts, earningsLabels, earningsData]);

  // Initialize Socket.io for real-time updates
  useEffect(() => {
    if (typeof io === "undefined") return; // Socket.io not available

    const socket = io();
    socketRef.current = socket;

    const refresh = () => dispatch(fetchServiceDashboard());

    socket.on("earnings:updated", refresh);
    socket.on("activity:updated", refresh);

    return () => {
      socket.off("earnings:updated", refresh);
      socket.off("activity:updated", refresh);
      socket.disconnect();
    };
  }, [dispatch]);

  return (
    <div className="service-page">
      <ServiceNav />
      <main className="service-main">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>Welcome! Here's your daily overview.</h2>
            <div className="dashboard-status sp-dashboard-status">
              <span className="sp-last-updated">{lastUpdatedText}</span>
              <button
                className="btn"
                onClick={() => dispatch(fetchServiceDashboard())}
                disabled={refreshDisabled}
              >
                {refreshDisabled ? "Refreshing..." : "↻ Refresh Data"}
              </button>
            </div>
          </div>

          {loading && !hasData ? (
            <div className="sp-state-message">
              <div className="sp-spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          ) : !hasData && error ? (
            <div className="sp-state-message sp-state-error">
              <p>⚠️ {error}</p>
            </div>
          ) : (
            <>
              <div className="cards" id="metricCards">
                <div className="card">
                  <div className="card-icon">
                    <i className="fas fa-rupee-sign"></i>
                  </div>
                  <div className="card-content">
                    <h2>Total Earnings</h2>
                    <p className="amount" id="earningsValue">
                      ₹{totals.earnings || 0}
                    </p>
                    <p className="subtext">After 20% commission</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon">
                    <i className="fas fa-tools"></i>
                  </div>
                  <div className="card-content">
                    <h2>Confirmed Services</h2>
                    <p className="amount" id="ongoingValue">
                      {totals.ongoing || 0}
                    </p>
                    <p className="subtext">Currently active</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="card-content">
                    <h2>Ready for Delivery</h2>
                    <p className="amount" id="completedValue">
                      {totals.completed || 0}
                    </p>
                    <p className="subtext">Total completed</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon">
                    <i className="fas fa-smile"></i>
                  </div>
                  <div className="card-content">
                    <h2>Customer Satisfaction</h2>
                    <p className="amount" id="ratingValue">
                      {totals.avgRating ?? "N/A"}
                    </p>
                    <p className="subtext" id="reviewsValue">
                      Based on {totals.totalReviews || 0} reviews
                    </p>
                  </div>
                </div>
              </div>

              <div className="charts">
                <div className="chart-card">
                  <h2>Service Distribution</h2>
                  <div className="chart-wrapper" style={{ height: 300 }}>
                    <canvas ref={pieRef} id="servicePieChart"></canvas>
                  </div>
                </div>
                <div className="chart-card">
                  <h2>Monthly Earnings Overview (Weekly Basis)</h2>
                  <div className="chart-wrapper" style={{ height: 300 }}>
                    <canvas ref={barRef} id="earningsBarChart"></canvas>
                  </div>
                </div>
              </div>

              <div className="recent-activity">
                <h2>Recent Activity</h2>
                <ul className="activity-list" id="activityList">
                  {activities.length > 0 ? (
                    activities.map((a, idx) => (
                      <li key={idx}>
                        <i className={`fas ${a.icon}`}></i>
                        <span>{a.text}</span>
                        <span className="time">{a.timeAgo}</span>
                      </li>
                    ))
                  ) : (
                    <li>
                      <i className="fas fa-info-circle"></i>
                      <span>No recent activity</span>
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {error ? <div className="sp-error-toast">{error}</div> : null}

        {/* Minor visual guardrails to ensure activity text is visible regardless of global theme overrides */}
        <style>{`
        .activity-list span { color: #0f2944; }
        .activity-list .time { color: #666; }
      `}</style>
      </main>
      <ServiceFooter />
    </div>
  );
}
