const catalogService = require("./customer/catalogService");
const bookingService = require("./customer/bookingService");
const cartService = require("./customer/cartService");
const historyService = require("./customer/historyService");
const profileService = require("./customer/profileService");

module.exports = {
  ...catalogService,
  ...bookingService,
  ...cartService,
  ...historyService,
  ...profileService,
};
