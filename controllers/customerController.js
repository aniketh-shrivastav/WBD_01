const path = require("path");
const cloudinary = require("../config/cloudinaryConfig");
const fs = require("fs");

const User = require("../models/User");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const ProductReview = require("../models/ProductReview");
const CustomerProfile = require("../models/CustomerProfile");
const mongoose = require("mongoose");
const ServiceBooking = require("../models/serviceBooking");
const Order = require("../models/Orders");

// GET /customer/index
exports.getIndex = async (req, res) => {
  try {
    const products = await Product.find({ status: "approved" });
    res.render("customer/index", {
      products,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.render("customer/index", {
      products: [],
      user: req.session.user,
      error: "Failed to load products",
    });
  }
};

// API endpoint for customer index
exports.getIndexApi = async (req, res) => {
  try {
    const products = await Product.find({ status: "approved" }).populate(
      "seller",
      "verificationStatus",
    );
    // Sort: verified sellers first, then rest
    products.sort((a, b) => {
      const aVerified = a.seller?.verificationStatus === "verified" ? 0 : 1;
      const bVerified = b.seller?.verificationStatus === "verified" ? 0 : 1;
      return aVerified - bVerified;
    });
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
  try {
    const customerId = req.session.user.id;

    const customerProfile = await CustomerProfile.findOne({
      userId: customerId,
    });

    const serviceProvidersData = await User.find(
      {
        role: "service-provider",
        suspended: { $ne: true },
        servicesOffered: {
          $elemMatch: {
            name: { $exists: true, $ne: "" },
            cost: { $gt: 0 },
          },
        },
      },
      "name servicesOffered district paintColors pickupRate dropoffRate",
    );

    const uniqueServicesSet = new Set();
    const uniqueDistrictsSet = new Set();
    const serviceProviders = [];
    const serviceCostMap = {};

    serviceProvidersData.forEach((provider) => {
      const services = Array.isArray(provider.servicesOffered)
        ? provider.servicesOffered
            .map((s) => ({
              name: String(s?.name || "").trim(),
              cost: Number(s?.cost),
            }))
            .filter((s) => s.name && !isNaN(s.cost) && s.cost > 0)
        : [];

      if (services.length === 0) return;

      services.forEach((service) => {
        uniqueServicesSet.add(service.name);
        if (!serviceCostMap[service.name]) {
          serviceCostMap[service.name] = service.cost;
        }
      });
      if (provider.district) uniqueDistrictsSet.add(provider.district);
      serviceProviders.push({
        ...provider.toObject(),
        servicesOffered: services,
      });
    });

    const uniqueServices = Array.from(uniqueServicesSet).sort((a, b) =>
      a.localeCompare(b),
    );
    const uniqueDistricts = Array.from(uniqueDistrictsSet).sort((a, b) =>
      a.localeCompare(b),
    );

    res.render("customer/booking", {
      uniqueServices,
      uniqueDistricts,
      serviceProviders,
      customerProfile,
      selectedServiceType: "",
      selectedDistrict: "",
      serviceCostMap: JSON.stringify(serviceCostMap),
    });
  } catch (error) {
    console.error("Error rendering booking page:", error);
    res.status(500).send("Error loading booking page");
  }
};

// JSON API for booking static page
exports.getBookingApi = async (req, res) => {
  try {
    const customerId = req.session.user.id;
    const customerProfile = await CustomerProfile.findOne({
      userId: customerId,
    });

    const serviceProvidersData = await User.find(
      {
        role: "service-provider",
        suspended: { $ne: true },
        servicesOffered: {
          $elemMatch: {
            name: { $exists: true, $ne: "" },
            cost: { $gt: 0 },
          },
        },
      },
      "name servicesOffered district paintColors pickupRate dropoffRate verificationStatus",
    );

    const uniqueServicesSet = new Set();
    const uniqueDistrictsSet = new Set();
    const serviceProviders = [];
    const serviceCostMap = {};

    serviceProvidersData.forEach((provider) => {
      const services = Array.isArray(provider.servicesOffered)
        ? provider.servicesOffered
            .map((s) => ({
              name: String(s?.name || "").trim(),
              cost: Number(s?.cost),
            }))
            .filter((s) => s.name && !isNaN(s.cost) && s.cost > 0)
        : [];

      if (services.length === 0) return;

      services.forEach((service) => {
        uniqueServicesSet.add(service.name);
        if (!serviceCostMap[service.name]) {
          serviceCostMap[service.name] = service.cost;
        }
      });
      if (provider.district) uniqueDistrictsSet.add(provider.district);
      serviceProviders.push({
        ...provider.toObject(),
        servicesOffered: services,
      });
    });

    const uniqueServices = Array.from(uniqueServicesSet).sort((a, b) =>
      a.localeCompare(b),
    );
    const uniqueDistricts = Array.from(uniqueDistrictsSet).sort((a, b) =>
      a.localeCompare(b),
    );

    // Aggregate ratings and review counts per provider
    const providerIds = serviceProviders.map((p) => p?._id).filter(Boolean);
    let ratingsMap = {};
    if (providerIds.length > 0) {
      try {
        const agg = await ServiceBooking.aggregate([
          { $match: { providerId: { $in: providerIds } } },
          { $match: { rating: { $exists: true } } },
          {
            $group: {
              _id: "$providerId",
              avgRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
            },
          },
        ]);
        ratingsMap = Object.fromEntries(
          agg.map((r) => [
            String(r._id),
            {
              avgRating: Number(r.avgRating?.toFixed?.(1) || 0),
              totalReviews: r.totalReviews || 0,
            },
          ]),
        );
      } catch (e) {
        ratingsMap = {};
      }
    }

    res.json({
      uniqueServices,
      uniqueDistricts,
      serviceProviders,
      customerProfile,
      selectedServiceType: "",
      selectedDistrict: "",
      serviceCostMap,
      ratingsMap,
    });
  } catch (err) {
    console.error("Booking API error:", err);
    res.status(500).json({ error: "Failed to load booking data" });
  }
};

// Reviews for a specific service provider
exports.getProviderReviews = async (req, res) => {
  try {
    const providerId = req.params.id;
    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid provider id" });
    }

    const reviews = await ServiceBooking.find({
      providerId: providerId,
      rating: { $exists: true },
    })
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const shaped = reviews.map((r) => ({
      _id: r._id,
      customerName: r.customerId?.name || "Customer",
      rating: r.rating,
      review: r.review || "",
      createdAt: r.createdAt,
    }));

    return res.json({ success: true, reviews: shaped });
  } catch (err) {
    console.error("Provider reviews API error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load reviews" });
  }
};

// GET /customer/cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.user.id });
    res.render("customer/cart", {
      user: req.session.user,
      items: cart?.items || [],
    });
  } catch (err) {
    console.error("Cart fetch error:", err.message);
    res.render("customer/cart", {
      user: req.session.user,
      items: [],
      error: "Failed to load cart",
    });
  }
};

// JSON API for cart static page
exports.getCartApi = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.user.id });
    const items = (cart?.items || []).map((it) => ({
      productId: it.productId,
      name: it.name,
      price: it.price,
      image: it.image,
      quantity: it.quantity,
      subtotal: it.price * it.quantity,
    }));
    const total = items.reduce((sum, i) => sum + i.subtotal, 0);
    res.json({ user: req.session.user, items, total });
  } catch (err) {
    console.error("Cart API error:", err);
    res.status(500).json({ error: "Failed to load cart" });
  }
};

// POST /customer/cart/add
exports.addToCart = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.body;
    console.log("[cart/add] raw body:", req.body);
    console.log("[cart/add] received id:", id);
    let lookupId = id;
    if (!lookupId && req.body._id) lookupId = req.body._id;
    const product = await Product.findById(lookupId);
    console.log("Incoming cart item:", {
      requested: id,
      usedId: lookupId,
      productFound: !!product,
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const { name, price, image } = product;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.productId === id.toString(),
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId: id.toString(),
        name,
        price,
        image,
        quantity: 1,
      });
    }

    await cart.save();
    console.log("Cart after add:", cart.items);
    res.json({ success: true });
  } catch (error) {
    console.error("Cart add error:", error.message);
    res.status(500).json({ success: false, message: "Error adding to cart" });
  }
};

// GET /customer/history
exports.getHistory = async (req, res) => {
  const customerId = req.session.user.id;

  try {
    const bookings = await ServiceBooking.find({ customerId })
      .populate("providerId")
      .sort({ createdAt: -1 });

    const enrichedBookings = bookings.map((booking) => {
      const provider = booking.providerId;
      const servicesOffered = provider?.servicesOffered || [];

      const costMap = {};
      servicesOffered.forEach((s) => {
        costMap[s.name] = s.cost;
      });

      let totalCost = booking.totalCost;
      if (!totalCost || totalCost === 0) {
        totalCost = (booking.selectedServices || []).reduce((sum, service) => {
          return sum + (costMap[service] || 0);
        }, 0);
      }

      return {
        ...booking.toObject(),
        totalCost,
      };
    });

    const orders = await Order.find({ userId: customerId }).sort({
      placedAt: -1,
    });

    const upcomingOrders = orders.filter((o) =>
      ["pending", "confirmed", "shipped"].includes(o.orderStatus),
    );
    const pastOrders = orders.filter((o) =>
      ["delivered", "cancelled"].includes(o.orderStatus),
    );

    res.render("customer/history", {
      bookings: enrichedBookings,
      upcomingOrders,
      pastOrders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// JSON API for history static page
exports.getHistoryApi = async (req, res) => {
  const customerId = req.session.user.id;
  try {
    const bookings = await ServiceBooking.find({ customerId })
      .populate("providerId")
      .sort({ createdAt: -1 })
      .lean();

    const enrichedBookings = bookings.map((b) => {
      const provider = b.providerId;
      const servicesOffered = provider?.servicesOffered || [];
      const costMap = {};
      servicesOffered.forEach((s) => {
        costMap[s.name] = s.cost;
      });
      let totalCost = b.totalCost;
      if (!totalCost || totalCost === 0) {
        totalCost = (b.selectedServices || []).reduce(
          (sum, svc) => sum + (costMap[svc] || 0),
          0,
        );
      }
      return {
        ...b,
        totalCost,
        statusHistory: b.statusHistory || [],
        costHistory: b.costHistory || [],
      };
    });

    const orders = await Order.find({ userId: customerId })
      .populate("items.seller", "name email")
      .sort({ placedAt: -1 })
      .lean();

    const upcomingOrders = orders.filter((o) =>
      ["pending", "confirmed", "shipped"].includes(o.orderStatus),
    );
    const pastOrders = orders.filter((o) =>
      ["delivered", "cancelled"].includes(o.orderStatus),
    );

    res.json({ bookings: enrichedBookings, upcomingOrders, pastOrders });
  } catch (err) {
    console.error("History API error:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
};

// Order details with status history
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user.id,
    })
      .populate("items.seller", "name email")
      .lean();

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
    const booking = await ServiceBooking.findOne({
      _id: req.params.id,
      customerId: req.session.user.id,
    })
      .populate("providerId", "name email phone")
      .lean();

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
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user.id,
    });
    if (!order || order.orderStatus !== "pending") {
      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot cancel this order." });
      }
      return res.status(400).send("Cannot cancel this order.");
    }

    await Order.findByIdAndDelete(order._id);
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
    const booking = await ServiceBooking.findOne({
      _id: req.params.id,
      customerId: req.session.user.id,
    });
    if (!booking || booking.status !== "Open") {
      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot cancel this service." });
      }
      return res.status(400).send("Cannot cancel this service.");
    }

    await ServiceBooking.findByIdAndDelete(booking._id);
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
  try {
    const userId = req.session.user.id;

    const user = await User.findById(userId);
    let profile = await CustomerProfile.findOne({ userId });

    if (!profile) {
      profile = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: "",
        district: "",
        payments: "",
      };
    }

    res.render("customer/profile", { user, profile });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error loading profile");
  }
};

// JSON API for profile static page
exports.getProfileApi = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    let profile = await CustomerProfile.findOne({ userId });
    if (!profile) {
      profile = {
        address: "",
        district: "",
        payments: "",
      };
    }
    res.json({
      user: { id: user.id, name: user.name, phone: user.phone },
      profile,
    });
  } catch (err) {
    console.error("Profile API error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
};

// POST /customer/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      name,
      phone,
      address,
      district,
      payments,
      registrationNumber,
      vehicleMake,
      vehicleModel,
      vehicleVariant,
      fuelType,
      transmission,
      yearOfManufacture,
      vin,
      currentMileage,
      insuranceProvider,
      insuranceValidTill,
    } = req.body;

    await User.findByIdAndUpdate(userId, { name, phone }, { new: true });

    const updateData = {
      address,
      district,
      payments,
      registrationNumber: registrationNumber || "",
      vehicleMake: vehicleMake || "",
      vehicleModel: vehicleModel || "",
      vehicleVariant: vehicleVariant || "",
      fuelType: fuelType || "",
      transmission: transmission || "",
      yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : null,
      vin: vin || "",
      currentMileage: currentMileage ? Number(currentMileage) : null,
      insuranceProvider: insuranceProvider || "",
      insuranceValidTill: insuranceValidTill || null,
    };

    // Handle profile picture upload to Cloudinary
    if (req.files && req.files.profilePicture && req.files.profilePicture[0]) {
      const file = req.files.profilePicture[0];
      try {
        const uploadRes = await cloudinary.uploader.upload(file.path, {
          folder: "customer_profiles",
          resource_type: "image",
          timeout: 120000,
        });
        updateData.profilePicture = uploadRes.secure_url;
        fs.unlinkSync(file.path);
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new Error("Failed to upload profile picture");
      }
    } else if (req.file) {
      // Backward compat for single upload
      try {
        const uploadRes = await cloudinary.uploader.upload(req.file.path, {
          folder: "customer_profiles",
          resource_type: "image",
          timeout: 120000,
        });
        updateData.profilePicture = uploadRes.secure_url;
        fs.unlinkSync(req.file.path);
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
        if (req.file.path && fs.existsSync(req.file.path))
          fs.unlinkSync(req.file.path);
        throw new Error("Failed to upload profile picture");
      }
    }

    // Handle RC Book upload
    if (req.files && req.files.rcBook && req.files.rcBook[0]) {
      const file = req.files.rcBook[0];
      try {
        const uploadRes = await cloudinary.uploader.upload(file.path, {
          folder: "customer_vehicle_docs",
          resource_type: "image",
          timeout: 120000,
        });
        updateData.rcBook = uploadRes.secure_url;
        fs.unlinkSync(file.path);
      } catch (uploadErr) {
        console.error("RC Book upload error:", uploadErr);
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }

    // Handle Insurance Copy upload
    if (req.files && req.files.insuranceCopy && req.files.insuranceCopy[0]) {
      const file = req.files.insuranceCopy[0];
      try {
        const uploadRes = await cloudinary.uploader.upload(file.path, {
          folder: "customer_vehicle_docs",
          resource_type: "image",
          timeout: 120000,
        });
        updateData.insuranceCopy = uploadRes.secure_url;
        fs.unlinkSync(file.path);
      } catch (uploadErr) {
        console.error("Insurance copy upload error:", uploadErr);
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }

    // Handle Vehicle Photos upload (multiple)
    if (
      req.files &&
      req.files.vehiclePhotos &&
      req.files.vehiclePhotos.length > 0
    ) {
      const urls = [];
      for (const file of req.files.vehiclePhotos) {
        try {
          const uploadRes = await cloudinary.uploader.upload(file.path, {
            folder: "customer_vehicle_photos",
            resource_type: "image",
            timeout: 120000,
          });
          urls.push(uploadRes.secure_url);
          fs.unlinkSync(file.path);
        } catch (uploadErr) {
          console.error("Vehicle photo upload error:", uploadErr);
          if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
      }
      // Append to existing photos
      const existing = await CustomerProfile.findOne({ userId });
      updateData.vehiclePhotos = [...(existing?.vehiclePhotos || []), ...urls];
    }

    await CustomerProfile.findOneAndUpdate({ userId }, updateData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        profilePicture: updateData.profilePicture,
      });
    }
    res.redirect("/customer/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(500).json({
        success: false,
        message: error.message || "Error updating profile",
      });
    }
    res.status(500).send("Error updating profile");
  }
};

// DELETE /customer/delete-vehicle-photo
exports.deleteVehiclePhoto = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { photoUrl } = req.body;
    if (!photoUrl)
      return res
        .status(400)
        .json({ success: false, message: "Photo URL required" });
    await CustomerProfile.findOneAndUpdate(
      { userId },
      { $pull: { vehiclePhotos: photoUrl } },
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Delete vehicle photo error:", err);
    res.status(500).json({ success: false, message: "Failed to delete photo" });
  }
};

// DELETE /customer/delete-profile
exports.deleteProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /customer/product/:id
exports.getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "name",
    );
    if (!product || product.status !== "approved") {
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

    const productId = product._id;
    const userId = req.session.user?.id;

    const ratingAgg = await ProductReview.aggregate([
      { $match: { productId: productId } },
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    const ratingSummary = {
      avgRating: Number(ratingAgg[0]?.avgRating?.toFixed?.(1) || 0),
      totalReviews: ratingAgg[0]?.totalReviews || 0,
    };

    const reviews = await ProductReview.find({ productId: productId })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Check verified purchase status for each reviewer
    const reviewsWithVerification = await Promise.all(
      reviews.map(async (review) => {
        const reviewerId = review.userId?._id || review.userId;
        const hasVerifiedPurchase = reviewerId
          ? await Order.exists({
              userId: reviewerId,
              $or: [
                {
                  items: {
                    $elemMatch: {
                      productId: productId,
                      $or: [
                        { itemStatus: "delivered" },
                        { itemStatus: { $exists: false } },
                      ],
                    },
                  },
                },
                {
                  orderStatus: "delivered",
                  "items.productId": productId,
                },
              ],
            })
          : false;
        return { ...review, verifiedPurchase: Boolean(hasVerifiedPurchase) };
      }),
    );

    const existingReview = userId
      ? await ProductReview.findOne({ productId: productId, userId }).lean()
      : null;

    const hasPurchased = userId
      ? await Order.exists({
          userId,
          $or: [
            {
              items: {
                $elemMatch: {
                  productId: productId,
                  $or: [
                    { itemStatus: "delivered" },
                    { itemStatus: { $exists: false } },
                  ],
                },
              },
            },
            {
              orderStatus: "delivered",
              "items.productId": productId,
            },
          ],
        })
      : false;

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        product,
        user: req.session.user,
        ratingSummary,
        reviews: reviewsWithVerification,
        canReview: Boolean(hasPurchased),
        userReview: existingReview || null,
      });
    }

    res.render("customer/productDetails", {
      product,
      user: req.session.user,
      ratingSummary,
      reviews: reviewsWithVerification,
      canReview: Boolean(hasPurchased),
      userReview: existingReview || null,
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
  const { rating, review } = req.body;
  const productId = req.params.id;
  const userId = req.session.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== "approved") {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const parsedRating = Number(rating);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Rating must be 1-5" });
    }

    const hasPurchased = await Order.exists({
      userId,
      $or: [
        {
          items: {
            $elemMatch: {
              productId: productId,
              $or: [
                { itemStatus: "delivered" },
                { itemStatus: { $exists: false } },
              ],
            },
          },
        },
        { orderStatus: "delivered", "items.productId": productId },
      ],
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: "You can only review products you have purchased",
      });
    }

    const updated = await ProductReview.findOneAndUpdate(
      { productId, userId },
      {
        productId,
        userId,
        seller: product.seller,
        rating: parsedRating,
        review: review || "",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({
      success: true,
      message: "Review saved",
      review: updated,
    });
  } catch (err) {
    console.error("Review submit error:", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "You already reviewed this product" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit review" });
  }
};

// POST /customer/rate-service/:id
exports.rateService = async (req, res) => {
  const { rating, review } = req.body;
  const bookingId = req.params.id;

  try {
    const booking = await ServiceBooking.findById(bookingId);

    if (!booking || booking.customerId.toString() !== req.session.user.id) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "Ready") {
      return res.status(400).json({
        success: false,
        message: "You can only rate completed services",
      });
    }

    booking.rating = Number(rating);
    booking.review = review || "";
    await booking.save();

    return res
      .status(200)
      .json({ success: true, message: "Thank you for your rating!" });
  } catch (err) {
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
  res.render("customer/payment");
};

exports.getPurchase = (req, res) => {
  res.render("customer/purchase");
};

exports.getReviews = (req, res) => {
  res.render("customer/reviews");
};

exports.getSearch = (req, res) => {
  res.render("customer/search");
};

exports.getService = (req, res) => {
  res.render("customer/service");
};

// Aliases for route compatibility
exports.getApiIndex = exports.getIndexApi;
exports.getApiBooking = exports.getBookingApi;
exports.getApiCart = exports.getCartApi;
exports.getApiHistory = exports.getHistoryApi;
exports.getApiProfile = exports.getProfileApi;
