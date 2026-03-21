function getBulkUploadResult(session) {
  return (
    session?.bulkUploadResult || {
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    }
  );
}

function initializeBulkUploadResult(session) {
  if (!session) return;

  session.bulkUploadResult = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
}

function getSampleCsv() {
  return "name,description,price,quantity,category\nSample Product,Description here,19.99,10,Category1";
}

module.exports = {
  getBulkUploadResult,
  initializeBulkUploadResult,
  getSampleCsv,
};
