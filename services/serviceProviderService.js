const dashboardService = require("./serviceProvider/dashboardService");
const bookingService = require("./serviceProvider/bookingService");
const earningsService = require("./serviceProvider/earningsService");
const reviewService = require("./serviceProvider/reviewService");
const profileService = require("./serviceProvider/profileService");
const activityService = require("./serviceProvider/activityService");
const pageService = require("./serviceProvider/pageService");

module.exports = {
  ...dashboardService,
  ...bookingService,
  ...earningsService,
  ...reviewService,
  ...profileService,
  ...activityService,
  ...pageService,
};
