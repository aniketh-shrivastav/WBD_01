const path = require("path");
const { getApiDashboard } = require("./apiService");

exports.getDashboard = async (req, res) => {
  try {
    // Use the API service to get stats
    await getApiDashboard(req, res);
  } catch (err) {
    console.error("Admin dashboard error", err);
    res.status(500).json({ error: "Failed to load admin dashboard" });
  }
};

exports.getDashboardHtml = async (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "../../public/admin/dashboard.html"));
  } catch (err) {
    console.error("Admin dashboard HTML error", err);
    res.status(500).send("Failed to load dashboard");
  }
};
