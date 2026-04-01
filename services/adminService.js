// Admin Service Aggregator
// Re-exports all admin feature modules

const apiService = require("./admin/apiService");
const dashboardService = require("./admin/dashboardService");

module.exports = {
  ...apiService,
  ...dashboardService,
};
