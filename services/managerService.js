const apiService = require("./manager/apiService");
const dashboardService = require("./manager/dashboardService");
const usersService = require("./manager/usersService");
const analyticsService = require("./manager/analyticsService");
const servicesService = require("./manager/servicesService");
const ordersService = require("./manager/ordersService");
const productsService = require("./manager/productsService");
const paymentsService = require("./manager/paymentsService");
const profileService = require("./manager/profileService");
const supportService = require("./manager/supportService");

module.exports = {
  ...apiService,
  ...dashboardService,
  ...usersService,
  ...analyticsService,
  ...servicesService,
  ...ordersService,
  ...productsService,
  ...paymentsService,
  ...profileService,
  ...supportService,
};
