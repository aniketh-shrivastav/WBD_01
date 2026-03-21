const sellerService = require("../services/sellerService");
const { createNotification } = require("./notificationController");

function wantsJson(req) {
  return (
    (req.headers.accept || "").includes("application/json") ||
    (req.headers["content-type"] || "").includes("application/json")
  );
}

exports.getDashboard = async (req, res) => {
  try {
    const data = await sellerService.getDashboardData(req.user.id);

    console.log(
      `[Dashboard] Seller ${String(req.user.id)}: Total Earnings = ${data.totalEarnings} from ${data.deliveredItemsCount} delivered items`,
    );

    return res.json({
      success: true,
      totalSales: data.totalSales,
      totalEarnings: data.totalEarnings,
      totalOrders: data.totalOrders,
      stockAlerts: data.stockAlerts,
      recentOrders: data.recentOrders,
      statusDistribution: data.statusDistribution,
    });
  } catch (err) {
    console.error("Seller dashboard API error", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load dashboard" });
  }
};

exports.getProfileSettings = async (req, res) => {
  try {
    const data = await sellerService.getProfileSettingsData(
      req.user.id,
      req.session.user,
    );

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("Profile settings GET API error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateProfileSettings = async (req, res) => {
  try {
    const result = await sellerService.updateProfileSettings(
      req.user.id,
      req.body,
      req.file,
    );

    if (result.profilePicture) {
      req.session.user.profilePicture = result.profilePicture;
    }

    return res.json({
      success: true,
      message: "Profile updated",
      profilePicture: result.profilePicture,
    });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error("Profile settings POST API error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await sellerService.getOrdersData(req.user.id);
    return res.json({ success: true, orders });
  } catch (err) {
    console.error("Seller orders API error", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load orders" });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const data = await sellerService.getReviewsData(req.user.id);
    return res.json({
      success: true,
      reviews: data.reviews,
      summaries: data.summaries,
    });
  } catch (err) {
    console.error("Seller reviews API error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load reviews" });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const product = await sellerService.addProduct(
      req.user.id,
      req.body,
      req.files,
    );

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    const msg =
      error?.message || error?.error?.message || "Unknown error adding product";

    console.error("Error adding product:", msg);
    console.error("Full Error Object:", JSON.stringify(error, null, 2));

    if (error.status) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    if (error.name === "ValidationError") {
      return res
        .status(400)
        .send(
          Object.fromEntries(
            Object.entries(error.errors).map(([field, errObj]) => [
              field,
              errObj.message,
            ]),
          ),
        );
    }

    if (error.message && error.message.includes("api_key")) {
      return res
        .status(500)
        .send(
          "Cloudinary configuration error: Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.",
        );
    }

    return res
      .status(500)
      .send(msg || `Internal Server Error: ${error.message}`);
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await sellerService.getProducts(req.user.id);
    return res.json({ success: true, products });
  } catch (err) {
    console.error("Error fetching products for seller:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load products" });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const newQuantity = await sellerService.updateStock(
      req.params.id,
      req.user.id,
      req.body.quantity,
    );

    return res.json({
      success: true,
      message: `Stock updated. New quantity: ${newQuantity}`,
      newQuantity,
    });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error("Error updating stock:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update stock" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await sellerService.deleteProduct(req.params.id, req.user.id);

    if (wantsJson(req)) {
      return res.json({ success: true });
    }

    return res.redirect("/seller/productmanagement");
  } catch (err) {
    if (err.status) {
      if (wantsJson(req)) {
        return res
          .status(err.status)
          .json({ success: false, message: err.message });
      }
      return res.status(err.status).send(err.message);
    }

    console.error("Error deleting product:", err);

    if (wantsJson(req)) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete product" });
    }

    return res.status(500).send("Failed to delete product");
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const result = await sellerService.updateOrderStatus({
      orderId: req.params.orderId,
      newStatus: req.body.newStatus,
      productId: req.body.productId,
      itemIndex: req.body.itemIndex,
      deliveryDate: req.body.deliveryDate,
      otp: req.body.otp,
      sellerId: req.user.id,
      actorId: req.session.user?.id,
    });

    if (result.notifyCustomer) {
      try {
        const io = req.app.get("io");
        await createNotification(
          {
            customerId: result.notifyCustomer.customerId,
            type: "order_status",
            title: result.notifyCustomer.title,
            message: result.notifyCustomer.message,
            referenceId: result.notifyCustomer.orderId,
            referenceModel: "Order",
          },
          io,
        );
      } catch (notificationError) {
        console.error(
          "Failed to create order status notification:",
          notificationError,
        );
      }
    }

    return res.json({ success: true, message: result.message });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateDeliveryDate = async (req, res) => {
  try {
    await sellerService.updateDeliveryDate({
      orderId: req.params.orderId,
      itemIndex: req.body.itemIndex,
      deliveryDate: req.body.deliveryDate,
      productId: req.body.productId,
      sellerId: req.user?.id || req.session?.user?.id,
    });

    return res.json({
      success: true,
      message: "Delivery date updated successfully",
    });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getBulkUploadResult = (req, res) => {
  const result = sellerService.getBulkUploadResult(req.session);
  return res.json({ success: true, result });
};

exports.getDashboardApi = exports.getDashboard;
exports.postProfileSettings = exports.updateProfileSettings;
exports.getApiProfileSettings = exports.getProfileSettings;
exports.postApiProfileSettings = exports.updateProfileSettings;
exports.getApiOrders = exports.getOrders;
exports.getApiReviews = exports.getReviews;
exports.getProductManagement = exports.getProducts;
exports.getApiProducts = exports.getProducts;
exports.getApiBulkUploadResult = exports.getBulkUploadResult;

exports.uploadVerificationDocument = async (req, res) => {
  try {
    const user = await sellerService.uploadVerificationDocument(
      req.user.id,
      req.body.docType,
      req.file,
    );

    return res.json({
      success: true,
      message: "Document uploaded successfully",
      verificationDocuments: user.verificationDocuments,
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    console.error("Error uploading seller verification document:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error uploading document" });
  }
};

exports.deleteVerificationDocument = async (req, res) => {
  try {
    const user = await sellerService.deleteVerificationDocument(
      req.user.id,
      req.params.docType,
    );

    return res.json({
      success: true,
      message: "Document deleted",
      verificationDocuments: user.verificationDocuments,
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    console.error("Error deleting seller verification document:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error deleting document" });
  }
};

exports.editProduct = async (req, res) => {
  try {
    const product = await sellerService.editProduct(
      req.params.id,
      req.user.id,
      req.body,
      req.files,
    );

    return res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error("Error editing product:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update product" });
  }
};

exports.getEarningsPayouts = async (req, res) => {
  try {
    await sellerService.getEarningsPayoutsData();
    return res.render("seller/earnings-payouts", { user: req.session.user });
  } catch (err) {
    console.error("Error loading earnings page:", err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const result = await sellerService.requestPayout();
    return res.json(result);
  } catch (err) {
    console.error("Error requesting payout:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getBulkUpload = (req, res) => {
  return res.render("seller/bulk-upload", { user: req.session.user });
};

exports.downloadSampleCsv = (req, res) => {
  const sampleCsv = sellerService.getSampleCsv();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=sample-products.csv",
  );
  return res.send(sampleCsv);
};

exports.postBulkUpload = async (req, res) => {
  try {
    sellerService.initializeBulkUploadResult(req.session);
    return res.redirect("/seller/bulk-upload/result");
  } catch (err) {
    console.error("Error processing bulk upload:", err);
    return res.status(500).send("Error processing upload");
  }
};
