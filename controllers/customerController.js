const path = require("path");
const customerService = require("../services/customerService");

const reactIndexPath = path.join(
  __dirname,
  "..",
  "client",
  "build",
  "index.html",
);

// GET /customer/index
exports.getIndex = async (req, res) => {
  return res.sendFile(reactIndexPath);
};

// API endpoint for customer index
exports.getIndexApi = async (req, res) => {
  try {
    const { products } = await customerService.getIndexApiData();
    res.json({
      products,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Customer index API error:", err);
    res.status(500).json({ error: "Failed to load products" });
  }
};

// GET /customer/booking
exports.getBooking = async (req, res) => {
  return res.sendFile(reactIndexPath);
};

// JSON API for booking static page
exports.getBookingApi = async (req, res) => {
  try {
    const customerId = req.session.user.id;
    const data = await customerService.getBookingData(customerId, true);

    res.json({
      uniqueServices: data.uniqueServices,
      uniqueDistricts: data.uniqueDistricts,
      serviceProviders: data.serviceProviders,
      customerProfile: data.customerProfile,
      selectedServiceType: data.selectedServiceType,
      selectedDistrict: data.selectedDistrict,
      serviceCostMap: data.serviceCostMap,
      ratingsMap: data.ratingsMap,
    });
  } catch (err) {
    console.error("Booking API error:", err);
    res.status(500).json({ error: "Failed to load booking data" });
  }
};

// Reviews for a specific service provider
exports.getProviderReviews = async (req, res) => {
  try {
    const reviews = await customerService.getProviderReviews(req.params.id);
    return res.json({ success: true, reviews });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }

    console.error("Provider reviews API error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load reviews" });
  }
};

// GET /customer/cart
exports.getCart = async (req, res) => {
  return res.sendFile(reactIndexPath);
};

// JSON API for cart static page
exports.getCartApi = async (req, res) => {
  try {
    const data = await customerService.getCartApiData(req.session.user.id);
    res.json({ user: req.session.user, ...data });
  } catch (err) {
    console.error("Cart API error:", err);
    res.status(500).json({ error: "Failed to load cart" });
  }
};

// POST /customer/cart/add
exports.addToCart = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id, _id } = req.body;

    await customerService.addToCart(userId, id, _id);
    res.json({ success: true });
  } catch (error) {
    if (error.status === 404) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (error.status === 400) {
      return res
        .status(400)
        .json({ success: false, message: error.message || "Invalid request" });
    }

    console.error("Cart add error:", error.message);
    res.status(500).json({ success: false, message: "Error adding to cart" });
  }
};

// GET /customer/history
exports.getHistory = async (req, res) => {
  return res.sendFile(reactIndexPath);
};

// JSON API for history static page
exports.getHistoryApi = async (req, res) => {
  const customerId = req.session.user.id;

  try {
    const data = await customerService.getHistoryData(customerId, true);
    res.json(data);
  } catch (err) {
    console.error("History API error:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
};

// Order details with status history
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await customerService.getOrderDetails(
      req.params.id,
      req.session.user.id,
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error("Order details error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load order details" });
  }
};

// Service booking details with status/cost history
exports.getServiceDetails = async (req, res) => {
  try {
    const booking = await customerService.getServiceDetails(
      req.params.id,
      req.session.user.id,
    );

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Service booking not found" });
    }

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("Service details error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load service details" });
  }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
  try {
    const result = await customerService.cancelOrder(
      req.params.id,
      req.session.user.id,
    );

    if (!result.success) {
      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res
          .status(400)
          .json({ success: false, message: result.message });
      }
      return res.status(400).send(result.message);
    }

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({ success: true });
    }

    res.redirect("/customer/history");
  } catch (err) {
    console.error("Cancel order error:", err);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
    res.status(500).send("Server error");
  }
};

// Cancel Service Booking
exports.cancelService = async (req, res) => {
  try {
    const result = await customerService.cancelService(
      req.params.id,
      req.session.user.id,
    );

    if (!result.success) {
      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res
          .status(400)
          .json({ success: false, message: result.message });
      }
      return res.status(400).send(result.message);
    }

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({ success: true });
    }

    res.redirect("/customer/history");
  } catch (err) {
    console.error("Cancel service error:", err);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
    res.status(500).send("Server error");
  }
};

// GET /customer/profile
exports.getProfile = async (req, res) => {
  return res.sendFile(reactIndexPath);
};

// JSON API for profile static page
exports.getProfileApi = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const data = await customerService.getProfileApiData(userId);
    res.json(data);
  } catch (err) {
    console.error("Profile API error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
};

// POST /customer/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const result = await customerService.updateProfile(
      userId,
      req.body,
      req.files,
      req.file,
    );

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        profilePicture: result.profilePicture,
      });
    }

    res.redirect("/customer/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Error updating profile",
        errors: error.details || undefined,
      });
    }
    res.status(error.status || 500).send("Error updating profile");
  }
};

// DELETE /customer/delete-vehicle-photo
exports.deleteVehiclePhoto = async (req, res) => {
  try {
    const userId = req.session.user.id;
    await customerService.deleteVehiclePhoto(userId, req.body.photoUrl);
    res.json({ success: true });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }

    console.error("Delete vehicle photo error:", err);
    res.status(500).json({ success: false, message: "Failed to delete photo" });
  }
};

// DELETE /customer/delete-profile
exports.deleteProfile = async (req, res) => {
  try {
    await customerService.deleteProfile(req.body.userId);
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ message: err.message });
    }

    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /customer/product/:id
exports.getProductDetails = async (req, res) => {
  try {
    const wantsJson =
      req.headers.accept && req.headers.accept.includes("application/json");

    if (!wantsJson) {
      return res.sendFile(reactIndexPath);
    }

    const data = await customerService.getProductDetails(
      req.params.id,
      req.session.user?.id,
    );

    if (!data) {
      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
      return res.status(404).send("Product not found");
    }

    return res.json({
      success: true,
      product: data.product,
      user: req.session.user,
      ratingSummary: data.ratingSummary,
      reviews: data.reviews,
      canReview: data.canReview,
      userReview: data.userReview,
    });
  } catch (error) {
    console.error("Product detail fetch error:", error);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res
        .status(500)
        .json({ success: false, message: "Error fetching product details" });
    }
    res.status(500).send("Error fetching product details");
  }
};

// POST /customer/product/:id/review
exports.submitProductReview = async (req, res) => {
  try {
    const updated = await customerService.submitProductReview(
      req.params.id,
      req.session.user?.id,
      req.body.rating,
      req.body.review,
    );

    return res.json({
      success: true,
      message: "Review saved",
      review: updated,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "You already reviewed this product" });
    }

    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error("Review submit error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit review" });
  }
};

// POST /customer/rate-service/:id
exports.rateService = async (req, res) => {
  try {
    await customerService.rateService(
      req.params.id,
      req.session.user.id,
      req.body.rating,
      req.body.review,
    );

    return res
      .status(200)
      .json({ success: true, message: "Thank you for your rating!" });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while submitting the rating.",
    });
  }
};

// Static HTML page handlers
exports.getIndexHtml = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "customer", "index.html"));
};

exports.getBookingHtml = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "public", "customer", "booking.html"),
  );
};

exports.getCartHtml = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "customer", "cart.html"));
};

exports.getHistoryHtml = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "public", "customer", "history.html"),
  );
};

exports.getProfileHtml = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "public", "customer", "profile.html"),
  );
};

exports.getPayment = (req, res) => {
  return res.sendFile(reactIndexPath);
};

exports.getPurchase = (req, res) => {
  return res.sendFile(reactIndexPath);
};

exports.getReviews = (req, res) => {
  return res.sendFile(reactIndexPath);
};

exports.getSearch = (req, res) => {
  return res.sendFile(reactIndexPath);
};

exports.getService = (req, res) => {
  return res.sendFile(reactIndexPath);
};

exports.searchProductsApi = async (req, res) => {
  try {
    const result = await customerService.searchProducts({
      q: req.query.q,
      category: req.query.category,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    return res.json({
      success: true,
      engine: result.engine,
      total: result.total,
      products: result.products,
    });
  } catch (err) {
    console.error("Product search API error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to search products" });
  }
};

// Aliases for route compatibility
exports.getApiIndex = exports.getIndexApi;
exports.getApiBooking = exports.getBookingApi;
exports.getApiCart = exports.getCartApi;
exports.getApiHistory = exports.getHistoryApi;
exports.getApiProfile = exports.getProfileApi;
