async function getProfileSettingsPageData(sessionUser) {
  return { user: sessionUser };
}

async function getBookingManagementPageData(sessionUser) {
  return { user: sessionUser };
}

async function getCustomerCommunicationPageData(sessionUser) {
  return { user: sessionUser };
}

module.exports = {
  getProfileSettingsPageData,
  getBookingManagementPageData,
  getCustomerCommunicationPageData,
};
