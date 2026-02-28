require("dotenv").config(); // Load environment variables first
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./db");
const User = require("./models/User");

// Import Middleware Modules (organized by type)
const {
  // Custom middleware (logging, security)
  requestLogger,
  responseTime,
  startLogRotation,
  securityHeaders,
  contentSecurityPolicy,
  rateLimit,
  preventNoSQLInjection,
  // Error-handling middleware
  notFound,
  errorHandler,
} = require("./middleware");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  },
});
app.set("io", io);
connectDB();

// 1. THIRD-PARTY MIDDLEWARE

// morgan: HTTP request logging
app.use(morgan("dev"));

// express-session: Session management
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);

// cors: Cross-Origin Resource Sharing
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }),
);

// 2. BUILT-IN MIDDLEWARE (Express built-in)

// express.json(): Parse JSON request bodies
app.use(express.json());

// express.urlencoded(): Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// 3. CUSTOM MIDDLEWARE (Application-level usage)

app.use(requestLogger);
app.use(responseTime);
// startLogRotation(); // Disabled: prevents creating log files every 20s

// Security headers
app.use(securityHeaders);
app.use(contentSecurityPolicy);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
);
app.use(preventNoSQLInjection);

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 4. BUILT-IN MIDDLEWARE (Static file serving)

// express.static(): Serve static files from public directory
app.use(express.static("public"));

// Serve legacy asset folders (e.g., /styles) for existing EJS pages
app.use(express.static(__dirname));

// 6. ROUTER-LEVEL MIDDLEWARE (Applied in route files)

// Route imports (Router-level middleware like isAuthenticated,
// isSeller, etc. are defined and used within these route files)
// Route imports
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const managerRoutes = require("./routes/managerRoutes");
const customerRoutes = require("./routes/customerRoutes");
const serviceProviderRoutes = require("./routes/serviceProviderRoutes");
const { router: contactRoutes } = require("./routes/contactRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const profileSettingsRoutes = require("./routes/profileSettingsRoutes");
const cartRoutes = require("./routes/cartRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// Mount routes
app.use("/", profileSettingsRoutes);
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/manager", managerRoutes);
app.use("/customer", customerRoutes);
app.use("/service", serviceProviderRoutes);
app.use("/", contactRoutes);
app.use("/seller", sellerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/bookings", bookingRoutes);
app.use("/", chatRoutes);
app.use("/api/payments", paymentRoutes);

// 8. REACT APP SERVING (for production)

// Serve React app static files
app.use(express.static(path.join(__dirname, "client", "build")));

// Catch-all route for React Router - must be after API routes
app.get("*", (req, res, next) => {
  // Skip API routes and static files
  if (
    req.path.startsWith("/api/") ||
    req.path.includes(".") ||
    req.path === "/login" ||
    req.path === "/signup" ||
    req.path === "/logout" ||
    req.path === "/forgot-password"
  ) {
    return next();
  }

  // Serve React app for all other routes
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// 9. ERROR-HANDLING MIDDLEWARE (Must be last!)

// 404 handler - catches unmatched routes
app.use(notFound);

// Global error handler - handles all errors (has 4 parameters)
app.use(errorHandler);

// Socket.IO basic rooms per customer
io.on("connection", (socket) => {
  socket.on("chat:join", ({ customerId }) => {
    if (customerId) socket.join(`customer_${customerId}`);
  });

  // Service provider joins earnings room
  socket.on("earnings:join", ({ providerId }) => {
    if (providerId) {
      socket.join(`provider_earnings_${providerId}`);
      console.log(`Provider ${providerId} joined earnings room`);
    }
  });

  socket.on("disconnect", () => {});
});

// Make io accessible globally for routes
global.io = io;

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
