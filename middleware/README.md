# Middleware Documentation

This directory contains all middleware functions organized by type and purpose.

## 📁 File Structure

```
middleware/
├── index.js                    # Central export file
├── authMiddleware.js           # Authentication & Authorization
├── validationMiddleware.js     # Input validation
├── loggingMiddleware.js        # Request logging & performance
├── securityMiddleware.js       # Security features
├── uploadMiddleware.js         # File upload handling (multer)
├── staticProtectionMiddleware.js # Static file protection
└── errorMiddleware.js          # Error handling
```

## 🏷️ The 6 Types of Express Middleware

### 1. Application-level Middleware

Bound to the app instance using `app.use()` or `app.METHOD()`.

**Files:** `staticProtectionMiddleware.js`, `loggingMiddleware.js`, `securityMiddleware.js`

**Example usage in server.js:**

```javascript
const { securityHeaders, protectManagerFiles } = require("./middleware");

app.use(securityHeaders); // Runs on every request
app.use("/manager", protectManagerFiles); // Runs on /manager routes
```

### 2. Router-level Middleware

Bound to an instance of `express.Router()`.

**Files:** `authMiddleware.js`

**Example usage in routes:**

```javascript
const { isAuthenticated, isSeller } = require("../middleware");

router.get("/dashboard", isAuthenticated, isSeller, (req, res) => { ... });
```

### 3. Built-in Middleware

Express built-in functions (no separate file needed).

**Used in server.js:**

```javascript
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded()); // Parse URL-encoded bodies
app.use(express.static("public")); // Serve static files
```

### 4. Third-party Middleware

External npm packages.

**Files:** `uploadMiddleware.js` (wraps multer)

**Used in server.js:**

```javascript
const cors = require("cors");
const session = require("express-session");

app.use(cors({ origin: [...], credentials: true }));
app.use(session({ secret: "...", ... }));
```

### 5. Error-handling Middleware

Has signature `(err, req, res, next)` - must have 4 parameters.

**Files:** `errorMiddleware.js`, `uploadMiddleware.js` (handleUploadError)

**Example usage (must be last):**

```javascript
const { notFound, errorHandler } = require("./middleware");

app.use(notFound); // Creates 404 error
app.use(errorHandler); // Handles all errors
```

### 6. Custom Middleware

User-defined middleware for specific functionality.

**Files:** All files in this directory are custom middleware

---

## 📦 Available Exports

### Authentication (`authMiddleware.js`)

| Export                    | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `isAuthenticated`         | Verifies user session exists                    |
| `isManager`               | Checks for manager role                         |
| `isSeller`                | Checks for seller role                          |
| `isCustomer`              | Checks for customer role                        |
| `isServiceProvider`       | Checks for service-provider role                |
| `managerOnly`             | Combined `[isAuthenticated, isManager]`         |
| `sellerOnly`              | Combined `[isAuthenticated, isSeller]`          |
| `customerOnly`            | Combined `[isAuthenticated, isCustomer]`        |
| `serviceOnly`             | Combined `[isAuthenticated, isServiceProvider]` |
| `requireRole(role, name)` | Factory for custom role middleware              |
| `wantsJSON(req)`          | Helper to detect JSON requests                  |

### Validation (`validationMiddleware.js`)

| Export                              | Description                   |
| ----------------------------------- | ----------------------------- |
| `validateObjectId(param)`           | Validates MongoDB ObjectId    |
| `validateRequiredFields(fields)`    | Checks required fields exist  |
| `sanitizeFields(fields)`            | Trims whitespace from strings |
| `validateEmail(field)`              | Validates email format        |
| `validateNumericRange(field, opts)` | Validates number range        |

### Logging (`loggingMiddleware.js`)

| Export             | Description                       |
| ------------------ | --------------------------------- |
| `requestLogger`    | Logs incoming requests            |
| `responseTime`     | Tracks response time              |
| `debugLogger`      | Detailed debug logging (dev only) |
| `apiAnalytics`     | Counts API requests               |
| `getAnalytics()`   | Gets analytics data               |
| `resetAnalytics()` | Resets analytics                  |

### Security (`securityMiddleware.js`)

| Export                  | Description                |
| ----------------------- | -------------------------- |
| `rateLimit(options)`    | Rate limiting factory      |
| `securityHeaders`       | Adds security headers      |
| `contentSecurityPolicy` | Adds CSP header            |
| `sanitizeInput(fields)` | XSS prevention             |
| `preventNoSQLInjection` | NoSQL injection protection |

### File Upload (`uploadMiddleware.js`)

| Export                 | Description               |
| ---------------------- | ------------------------- |
| `uploadImageToDisk`    | Image upload to disk      |
| `uploadImageToMemory`  | Image upload to memory    |
| `uploadDocumentToDisk` | Document upload to disk   |
| `uploadGeneric`        | Generic file upload       |
| `handleUploadError`    | Error handler for uploads |
| `cleanupUpload(path)`  | Cleanup uploaded file     |
| `UPLOAD_DIR`           | Upload directory path     |

### Static Protection (`staticProtectionMiddleware.js`)

| Export                           | Description                  |
| -------------------------------- | ---------------------------- |
| `protectManagerFiles`            | Protect /manager HTML files  |
| `protectCustomerFiles`           | Protect /customer HTML files |
| `protectServiceFiles`            | Protect /service HTML files  |
| `protectSellerFiles`             | Protect /seller HTML files   |
| `protectStaticFiles(role, name)` | Factory function             |

### Error Handling (`errorMiddleware.js`)

| Export         | Description          |
| -------------- | -------------------- |
| `notFound`     | Creates 404 errors   |
| `errorHandler` | Global error handler |

---

## 🔧 Usage Examples

### Import specific middleware

```javascript
const { isAuthenticated, isSeller } = require("../middleware");
```

### Import module groups

```javascript
const { auth, security, upload } = require("../middleware");

// Use as:
auth.isAuthenticated;
security.rateLimit({ maxRequests: 100 });
upload.uploadImageToMemory.single("image");
```

### Apply rate limiting to a route

```javascript
const { rateLimit } = require("../middleware");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: "Too many login attempts"
});

router.post("/login", loginLimiter, (req, res) => { ... });
```

### Validate request body

```javascript
const { validateRequiredFields, sanitizeFields } = require("../middleware");

router.post("/create",
  sanitizeFields(["name", "email"]),
  validateRequiredFields(["name", "email", "password"]),
  (req, res) => { ... }
);
```
