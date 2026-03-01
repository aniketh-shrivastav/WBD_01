import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Chart from "chart.js/auto";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

/* ── helpers ── */
function fmtMoney(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return "₹0";
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}
function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d);
  }
}

const COLORS = [
  "#4299e1",
  "#48bb78",
  "#ed8936",
  "#9f7aea",
  "#f56565",
  "#38b2ac",
  "#d69e2e",
  "#e53e3e",
  "#667eea",
  "#fc8181",
];
const BG_ALPHA = (hex, a = 0.75) =>
  hex +
  Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");

/* ── reusable card ── */
function StatCard({ label, value, sub, color = "#4299e1" }) {
  return (
    <div
      className="analytics-stat-card"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="analytics-stat-value">{value}</div>
      <div className="analytics-stat-label">{label}</div>
      {sub && <div className="analytics-stat-sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="analytics-section">
      <h2 className="analytics-section-title">{title}</h2>
      {children}
    </section>
  );
}

/* ── chart hook ── */
function useChart(ref, config) {
  const chartRef = useRef(null);
  useEffect(() => {
    chartRef.current?.destroy?.();
    if (!ref.current || !config) return;
    chartRef.current = new Chart(ref.current, config);
    return () => {
      chartRef.current?.destroy?.();
    };
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ================================================================
   CUSTOMER ANALYTICS
   ================================================================ */
function CustomerAnalytics({ d }) {
  const {
    summary: s,
    monthlySpending,
    orderStatusDist,
    bookingStatusDist,
    topProviders,
    topSellers,
  } = d;

  const spendBarRef = useRef(null);
  const orderPieRef = useRef(null);
  const bookingPieRef = useRef(null);
  const cumulativeRef = useRef(null);

  const spendBarCfg = React.useMemo(() => {
    if (!monthlySpending?.length) return null;
    return {
      type: "bar",
      data: {
        labels: monthlySpending.map((m) => m.label),
        datasets: [
          {
            label: "Orders",
            data: monthlySpending.map((m) => m.orders),
            backgroundColor: "#4299e1",
            borderRadius: 4,
          },
          {
            label: "Services",
            data: monthlySpending.map((m) => m.services),
            backgroundColor: "#48bb78",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Monthly Spending Breakdown" },
        },
        scales: { y: { beginAtZero: true } },
      },
    };
  }, [monthlySpending]);

  const orderPieCfg = React.useMemo(() => {
    if (!orderStatusDist) return null;
    const labels = Object.keys(orderStatusDist);
    return {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: labels.map((l) => orderStatusDist[l]),
            backgroundColor: COLORS.slice(0, labels.length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Order Status Distribution" },
          legend: { position: "bottom" },
        },
      },
    };
  }, [orderStatusDist]);

  const bookingPieCfg = React.useMemo(() => {
    if (!bookingStatusDist) return null;
    const labels = Object.keys(bookingStatusDist);
    return {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: labels.map((l) => bookingStatusDist[l]),
            backgroundColor: COLORS.slice(0, labels.length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Booking Status Distribution" },
          legend: { position: "bottom" },
        },
      },
    };
  }, [bookingStatusDist]);

  const cumulativeCfg = React.useMemo(() => {
    if (!monthlySpending?.length) return null;
    let cum = 0;
    const cumData = monthlySpending.map((m) => {
      cum += m.total;
      return cum;
    });
    return {
      type: "line",
      data: {
        labels: monthlySpending.map((m) => m.label),
        datasets: [
          {
            label: "Cumulative Spend",
            data: cumData,
            borderColor: "#9f7aea",
            backgroundColor: "rgba(159,122,234,0.1)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Cumulative Spending Trend" },
        },
        scales: { y: { beginAtZero: true } },
      },
    };
  }, [monthlySpending]);

  useChart(spendBarRef, spendBarCfg);
  useChart(orderPieRef, orderPieCfg);
  useChart(bookingPieRef, bookingPieCfg);
  useChart(cumulativeRef, cumulativeCfg);

  return (
    <>
      {/* Summary Cards */}
      <div className="analytics-cards-grid">
        <StatCard
          label="Total Spent"
          value={fmtMoney(s.totalSpent)}
          color="#4299e1"
        />
        <StatCard
          label="Order Spend"
          value={fmtMoney(s.totalOrderSpend)}
          sub={`${s.totalOrders} orders`}
          color="#48bb78"
        />
        <StatCard
          label="Service Spend"
          value={fmtMoney(s.totalServiceSpend)}
          sub={`${s.totalBookings} bookings`}
          color="#ed8936"
        />
        <StatCard
          label="Member Since"
          value={fmtDate(d.memberSince)}
          color="#9f7aea"
        />
        <StatCard
          label="First Activity"
          value={fmtDate(d.firstActivity)}
          color="#38b2ac"
        />
        <StatCard
          label="Last Activity"
          value={fmtDate(d.lastActivity)}
          color="#f56565"
        />
      </div>

      {/* Monthly Spending Bar */}
      <Section title="Monthly Spending (Orders vs Services)">
        <div className="analytics-chart-container">
          <canvas ref={spendBarRef} />
        </div>
      </Section>

      {/* Cumulative Line */}
      <Section title="Cumulative Spending Trend">
        <div className="analytics-chart-container">
          <canvas ref={cumulativeRef} />
        </div>
      </Section>

      {/* Pie charts side by side */}
      <div className="analytics-chart-row">
        <Section title="Order Status">
          <div className="analytics-chart-container-sm">
            <canvas ref={orderPieRef} />
          </div>
          <div className="analytics-dist-numbers">
            {Object.entries(orderStatusDist || {}).map(([k, v]) => (
              <div key={k} className="analytics-dist-row">
                <span className="analytics-dist-label">{k}</span>
                <span className="analytics-dist-val">{v}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Booking Status">
          <div className="analytics-chart-container-sm">
            <canvas ref={bookingPieRef} />
          </div>
          <div className="analytics-dist-numbers">
            {Object.entries(bookingStatusDist || {}).map(([k, v]) => (
              <div key={k} className="analytics-dist-row">
                <span className="analytics-dist-label">{k}</span>
                <span className="analytics-dist-val">{v}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Top Providers */}
      {topProviders?.length > 0 && (
        <Section title="Top Service Providers (by Spend)">
          <table className="table analytics-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Provider</th>
                <th>Email</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {topProviders.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td>{fmtMoney(p.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Top Sellers */}
      {topSellers?.length > 0 && (
        <Section title="Top Sellers (by Spend)">
          <table className="table analytics-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Seller</th>
                <th>Email</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {topSellers.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{fmtMoney(s.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </>
  );
}

/* ================================================================
   SELLER ANALYTICS
   ================================================================ */
function SellerAnalytics({ d }) {
  const {
    summary: s,
    monthlyBreakdown,
    itemStatusDist,
    categoryDist,
    topCategories,
    topProducts,
    topCustomers,
  } = d;

  const revenueBarRef = useRef(null);
  const commissionLineRef = useRef(null);
  const statusPieRef = useRef(null);
  const categoryPieRef = useRef(null);
  const catRevenueBarRef = useRef(null);

  const revBarCfg = React.useMemo(() => {
    if (!monthlyBreakdown?.length) return null;
    return {
      type: "bar",
      data: {
        labels: monthlyBreakdown.map((m) => m.label),
        datasets: [
          {
            label: "Revenue",
            data: monthlyBreakdown.map((m) => m.revenue),
            backgroundColor: "#4299e1",
            borderRadius: 4,
          },
          {
            label: "Commission (20%)",
            data: monthlyBreakdown.map((m) => m.commission),
            backgroundColor: "#f56565",
            borderRadius: 4,
          },
          {
            label: "After Commission",
            data: monthlyBreakdown.map((m) => m.afterCommission),
            backgroundColor: "#48bb78",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Monthly Revenue & Commission" },
        },
        scales: { y: { beginAtZero: true } },
      },
    };
  }, [monthlyBreakdown]);

  const commLineCfg = React.useMemo(() => {
    if (!monthlyBreakdown?.length) return null;
    let cumRev = 0,
      cumComm = 0;
    const cumRevData = monthlyBreakdown.map((m) => {
      cumRev += m.revenue;
      return cumRev;
    });
    const cumCommData = monthlyBreakdown.map((m) => {
      cumComm += m.commission;
      return cumComm;
    });
    return {
      type: "line",
      data: {
        labels: monthlyBreakdown.map((m) => m.label),
        datasets: [
          {
            label: "Cumulative Revenue",
            data: cumRevData,
            borderColor: "#4299e1",
            tension: 0.3,
            fill: false,
          },
          {
            label: "Cumulative Commission",
            data: cumCommData,
            borderColor: "#f56565",
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Cumulative Revenue & Commission Trend",
          },
        },
        scales: { y: { beginAtZero: true } },
      },
    };
  }, [monthlyBreakdown]);

  const statusPieCfg = React.useMemo(() => {
    if (!itemStatusDist) return null;
    const labels = Object.keys(itemStatusDist);
    return {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: labels.map((l) => itemStatusDist[l]),
            backgroundColor: COLORS.slice(0, labels.length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Order Item Status Distribution" },
          legend: { position: "bottom" },
        },
      },
    };
  }, [itemStatusDist]);

  const catPieCfg = React.useMemo(() => {
    if (!categoryDist) return null;
    const labels = Object.keys(categoryDist);
    return {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: labels.map((l) => categoryDist[l]),
            backgroundColor: COLORS.slice(0, labels.length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Product Category Distribution" },
          legend: { position: "bottom" },
        },
      },
    };
  }, [categoryDist]);

  const catRevBarCfg = React.useMemo(() => {
    if (!topCategories?.length) return null;
    return {
      type: "bar",
      data: {
        labels: topCategories.map((c) => c.category),
        datasets: [
          {
            label: "Revenue",
            data: topCategories.map((c) => c.revenue),
            backgroundColor: COLORS.slice(0, topCategories.length),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: "y",
        plugins: {
          title: { display: true, text: "Top Categories by Revenue" },
          legend: { display: false },
        },
      },
    };
  }, [topCategories]);

  useChart(revenueBarRef, revBarCfg);
  useChart(commissionLineRef, commLineCfg);
  useChart(statusPieRef, statusPieCfg);
  useChart(categoryPieRef, catPieCfg);
  useChart(catRevenueBarRef, catRevBarCfg);

  return (
    <>
      <div className="analytics-cards-grid">
        <StatCard
          label="Total Revenue"
          value={fmtMoney(s.totalRevenue)}
          color="#4299e1"
        />
        <StatCard
          label="Commission Paid (20%)"
          value={fmtMoney(s.totalCommission)}
          color="#f56565"
        />
        <StatCard
          label="After Commission"
          value={fmtMoney(s.totalAfterCommission)}
          color="#48bb78"
        />
        <StatCard
          label="Total Orders"
          value={s.totalOrders}
          sub={`${s.deliveredCount} delivered`}
          color="#ed8936"
        />
        <StatCard label="Items Sold" value={s.totalItemsSold} color="#9f7aea" />
        <StatCard
          label="Products Listed"
          value={s.totalProducts}
          color="#38b2ac"
        />
        <StatCard
          label="Member Since"
          value={fmtDate(d.memberSince)}
          color="#d69e2e"
        />
        <StatCard
          label="First Activity"
          value={fmtDate(d.firstActivity)}
          color="#667eea"
        />
        <StatCard
          label="Last Activity"
          value={fmtDate(d.lastActivity)}
          color="#e53e3e"
        />
      </div>

      <Section title="Monthly Revenue & Commission">
        <div className="analytics-chart-container">
          <canvas ref={revenueBarRef} />
        </div>
        {/* Monthly numbers table */}
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table analytics-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Commission</th>
                <th>After Commission</th>
              </tr>
            </thead>
            <tbody>
              {(monthlyBreakdown || []).map((m, i) => (
                <tr key={i}>
                  <td>{m.label}</td>
                  <td>{fmtMoney(m.revenue)}</td>
                  <td>{fmtMoney(m.commission)}</td>
                  <td>{fmtMoney(m.afterCommission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Cumulative Revenue & Commission Trend">
        <div className="analytics-chart-container">
          <canvas ref={commissionLineRef} />
        </div>
      </Section>

      <div className="analytics-chart-row">
        <Section title="Item Status Distribution">
          <div className="analytics-chart-container-sm">
            <canvas ref={statusPieRef} />
          </div>
          <div className="analytics-dist-numbers">
            {Object.entries(itemStatusDist || {}).map(([k, v]) => (
              <div key={k} className="analytics-dist-row">
                <span className="analytics-dist-label">{k}</span>
                <span className="analytics-dist-val">{v}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Product Categories">
          <div className="analytics-chart-container-sm">
            <canvas ref={categoryPieRef} />
          </div>
          <div className="analytics-dist-numbers">
            {Object.entries(categoryDist || {}).map(([k, v]) => (
              <div key={k} className="analytics-dist-row">
                <span className="analytics-dist-label">{k}</span>
                <span className="analytics-dist-val">{v} products</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Top Categories by Revenue">
        <div className="analytics-chart-container">
          <canvas ref={catRevenueBarRef} />
        </div>
      </Section>

      {topProducts?.length > 0 && (
        <Section title="Top Products by Units Sold">
          <table className="table analytics-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Units Sold</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.unitsSold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {topCustomers?.length > 0 && (
        <Section title="Top Customers">
          <table className="table analytics-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{fmtMoney(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </>
  );
}

/* ================================================================
   SERVICE PROVIDER ANALYTICS
   ================================================================ */
function ProviderAnalytics({ d }) {
  const {
    summary: s,
    monthlyBreakdown,
    statusDist,
    topServices,
    topServicesByRevenue,
    topCustomerRelationships,
  } = d;

  const earningsBarRef = useRef(null);
  const commLineRef = useRef(null);
  const statusPieRef = useRef(null);
  const svcBarRef = useRef(null);
  const svcRevBarRef = useRef(null);

  const earnBarCfg = React.useMemo(() => {
    if (!monthlyBreakdown?.length) return null;
    return {
      type: "bar",
      data: {
        labels: monthlyBreakdown.map((m) => m.label),
        datasets: [
          {
            label: "Earnings",
            data: monthlyBreakdown.map((m) => m.earnings),
            backgroundColor: "#4299e1",
            borderRadius: 4,
          },
          {
            label: "Commission (20%)",
            data: monthlyBreakdown.map((m) => m.commission),
            backgroundColor: "#f56565",
            borderRadius: 4,
          },
          {
            label: "After Commission",
            data: monthlyBreakdown.map((m) => m.afterCommission),
            backgroundColor: "#48bb78",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Monthly Earnings & Commission" },
        },
        scales: { y: { beginAtZero: true } },
      },
    };
  }, [monthlyBreakdown]);

  const commLineCfg = React.useMemo(() => {
    if (!monthlyBreakdown?.length) return null;
    let cumEarn = 0,
      cumComm = 0;
    const cumEarnData = monthlyBreakdown.map((m) => {
      cumEarn += m.earnings;
      return cumEarn;
    });
    const cumCommData = monthlyBreakdown.map((m) => {
      cumComm += m.commission;
      return cumComm;
    });
    return {
      type: "line",
      data: {
        labels: monthlyBreakdown.map((m) => m.label),
        datasets: [
          {
            label: "Cumulative Earnings",
            data: cumEarnData,
            borderColor: "#4299e1",
            tension: 0.3,
            fill: false,
          },
          {
            label: "Cumulative Commission",
            data: cumCommData,
            borderColor: "#f56565",
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Cumulative Earnings & Commission Trend",
          },
        },
        scales: { y: { beginAtZero: true } },
      },
    };
  }, [monthlyBreakdown]);

  const statusPieCfg = React.useMemo(() => {
    if (!statusDist) return null;
    const labels = Object.keys(statusDist);
    return {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: labels.map((l) => statusDist[l]),
            backgroundColor: COLORS.slice(0, labels.length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Booking Status Distribution" },
          legend: { position: "bottom" },
        },
      },
    };
  }, [statusDist]);

  const svcBarCfg = React.useMemo(() => {
    if (!topServices?.length) return null;
    return {
      type: "bar",
      data: {
        labels: topServices.map((s) => s.name),
        datasets: [
          {
            label: "Bookings",
            data: topServices.map((s) => s.count),
            backgroundColor: COLORS.slice(0, topServices.length),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: "y",
        plugins: {
          title: { display: true, text: "Top Services by Booking Count" },
          legend: { display: false },
        },
      },
    };
  }, [topServices]);

  const svcRevBarCfg = React.useMemo(() => {
    if (!topServicesByRevenue?.length) return null;
    return {
      type: "bar",
      data: {
        labels: topServicesByRevenue.map((s) => s.name),
        datasets: [
          {
            label: "Revenue",
            data: topServicesByRevenue.map((s) => s.revenue),
            backgroundColor: COLORS.slice(0, topServicesByRevenue.length),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: "y",
        plugins: {
          title: { display: true, text: "Top Services by Revenue" },
          legend: { display: false },
        },
      },
    };
  }, [topServicesByRevenue]);

  useChart(earningsBarRef, earnBarCfg);
  useChart(commLineRef, commLineCfg);
  useChart(statusPieRef, statusPieCfg);
  useChart(svcBarRef, svcBarCfg);
  useChart(svcRevBarRef, svcRevBarCfg);

  return (
    <>
      <div className="analytics-cards-grid">
        <StatCard
          label="Total Earnings"
          value={fmtMoney(s.totalEarnings)}
          color="#4299e1"
        />
        <StatCard
          label="Commission Paid (20%)"
          value={fmtMoney(s.totalCommission)}
          color="#f56565"
        />
        <StatCard
          label="After Commission"
          value={fmtMoney(s.totalAfterCommission)}
          color="#48bb78"
        />
        <StatCard
          label="Total Bookings"
          value={s.totalBookings}
          sub={`${s.completedBookings} completed`}
          color="#ed8936"
        />
        <StatCard
          label="Avg Rating"
          value={s.avgRating != null ? `${s.avgRating} / 5` : "N/A"}
          sub={`${s.totalReviews} reviews`}
          color="#d69e2e"
        />
        <StatCard
          label="Member Since"
          value={fmtDate(d.memberSince)}
          color="#9f7aea"
        />
        <StatCard
          label="First Activity"
          value={fmtDate(d.firstActivity)}
          color="#38b2ac"
        />
        <StatCard
          label="Last Activity"
          value={fmtDate(d.lastActivity)}
          color="#e53e3e"
        />
      </div>

      <Section title="Monthly Earnings & Commission">
        <div className="analytics-chart-container">
          <canvas ref={earningsBarRef} />
        </div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table analytics-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Earnings</th>
                <th>Commission</th>
                <th>After Commission</th>
              </tr>
            </thead>
            <tbody>
              {(monthlyBreakdown || []).map((m, i) => (
                <tr key={i}>
                  <td>{m.label}</td>
                  <td>{fmtMoney(m.earnings)}</td>
                  <td>{fmtMoney(m.commission)}</td>
                  <td>{fmtMoney(m.afterCommission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Cumulative Earnings & Commission Trend">
        <div className="analytics-chart-container">
          <canvas ref={commLineRef} />
        </div>
      </Section>

      <div className="analytics-chart-row">
        <Section title="Booking Status">
          <div className="analytics-chart-container-sm">
            <canvas ref={statusPieRef} />
          </div>
          <div className="analytics-dist-numbers">
            {Object.entries(statusDist || {}).map(([k, v]) => (
              <div key={k} className="analytics-dist-row">
                <span className="analytics-dist-label">{k}</span>
                <span className="analytics-dist-val">{v}</span>
              </div>
            ))}
          </div>
        </Section>
        <div>
          <Section title="Top Services (Count)">
            <div className="analytics-chart-container-sm">
              <canvas ref={svcBarRef} />
            </div>
          </Section>
        </div>
      </div>

      <Section title="Top Services by Revenue">
        <div className="analytics-chart-container">
          <canvas ref={svcRevBarRef} />
        </div>
      </Section>

      {topCustomerRelationships?.length > 0 && (
        <Section title="Top Customer Relationships">
          <table className="table analytics-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Bookings</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {topCustomerRelationships.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.bookings}</td>
                  <td>{fmtMoney(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function UserAnalytics() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const resp = await fetch(`/manager/api/user-analytics/${id}`, {
          headers: { Accept: "application/json" },
        });
        if (resp.status === 401 || resp.status === 403) {
          window.location.href = "/login";
          return;
        }
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(j?.error || "Failed to load analytics");
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const navLinks = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Link to={`/manager/profiles/${id}`} className="analytics-back-btn">
        Back to Profile
      </Link>
      <Link
        to="/manager/profiles"
        className="analytics-back-btn"
        style={{ background: "#374151" }}
      >
        All Profiles
      </Link>
    </div>
  );

  if (loading)
    return (
      <>
        <div className="navbar">
          <div className="logo">
            <h2>Manager's Panel</h2>
          </div>
          <ManagerNav />
        </div>
        <div className="main-content">
          <p>Loading analytics...</p>
        </div>
      </>
    );

  if (error)
    return (
      <>
        <div className="navbar">
          <div className="logo">
            <h2>Manager's Panel</h2>
          </div>
          <ManagerNav />
        </div>
        <div className="main-content">
          <p style={{ color: "#e74c3c" }}>{error}</p>
          <div style={{ marginTop: 12 }}>{navLinks}</div>
        </div>
      </>
    );

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <h2>Manager's Panel</h2>
        </div>
        <ManagerNav />
      </div>
      <div className="main-content">
        {/* Page header */}
        <section
          className="analytics-section"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h1 className="analytics-page-title">
              {data.userName} — {data.role} Analytics
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Comprehensive performance & financial breakdown
            </p>
          </div>
          {navLinks}
        </section>

        {data.role === "Customer" && <CustomerAnalytics d={data} />}
        {data.role === "Seller" && <SellerAnalytics d={data} />}
        {data.role === "Service Provider" && <ProviderAnalytics d={data} />}
      </div>
    </>
  );
}
