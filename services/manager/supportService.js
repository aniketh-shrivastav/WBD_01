const path = require("path");

function getSupportHtml(req, res) {
  res.sendFile(
    path.join(__dirname, "..", "..", "public", "manager", "support.html"),
  );
}

module.exports = {
  getSupportHtml,
};
