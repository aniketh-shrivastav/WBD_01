async function getEarningsPayoutsData() {
  return { success: true };
}

async function requestPayout() {
  return { success: true, message: "Payout request submitted" };
}

module.exports = {
  getEarningsPayoutsData,
  requestPayout,
};
