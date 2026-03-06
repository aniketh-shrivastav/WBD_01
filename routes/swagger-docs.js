/**
 * @swagger
 * # ============================
 * # AUTH ROUTES (mounted on /)
 * # ============================
 */

// ─── Auth ────────────────────────────────────────────

/**
 * @swagger
 * /signup:
 *   get:
 *     tags: [Auth]
 *     summary: Render signup page
 *     description: Serves the EJS signup template
 *     responses:
 *       200:
 *         description: HTML signup page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account and sends a 6-digit OTP via email for verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role, phone]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [customer, seller, service-provider, manager, admin]
 *               phone:
 *                 type: string
 *               businessName:
 *                 type: string
 *               workshopName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registration successful, OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 requiresOtp:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 redirect:
 *                   type: string
 *       400:
 *         description: Validation error or user already exists
 */

/**
 * @swagger
 * /login:
 *   get:
 *     tags: [Auth]
 *     summary: Render login page
 *     responses:
 *       200:
 *         description: HTML login page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user
 *     description: Validates credentials and creates a session. Returns role-based redirect URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 role:
 *                   type: string
 *                 redirect:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /logout:
 *   get:
 *     tags: [Auth]
 *     summary: Log out
 *     description: Destroys the session and clears the cookie
 *     responses:
 *       302:
 *         description: Redirect to home or ?next= URL
 */

/**
 * @swagger
 * /api/session:
 *   get:
 *     tags: [Auth]
 *     summary: Get current session info
 *     description: Returns authentication status and user details if logged in
 *     responses:
 *       200:
 *         description: Session information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 */

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: Sends a password reset link via email with a hashed token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset link sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /reset-password/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Validate password reset token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token validity status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     description: Sets a new password using a valid reset token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify signup OTP
 *     description: Verifies the 6-digit OTP sent during signup
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: OTP verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend signup OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Google Sign-In
 *     description: Authenticates using a Firebase ID token. Does NOT register new users — user must already exist.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Google sign-in successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 redirect:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: User not found or invalid token
 */

// ─── Admin ──────────────────────────────────────────

/**
 * @swagger
 * /admin/api/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Admin dashboard data
 *     description: Returns comprehensive admin dashboard stats including user totals, revenue, profit/loss, monthly charts, user growth, rating distribution, highlights, recent users and reviews
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totals:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                 highlights:
 *                   type: object
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                 charts:
 *                   type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 */

/**
 * @swagger
 * /admin/api/manager-dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Read-only manager dashboard view
 *     description: Returns the same data as the manager dashboard, accessible by admin
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Manager dashboard data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 */

/**
 * @swagger
 * /admin/api/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       status:
 *                         type: string
 *                       joined:
 *                         type: string
 */

/**
 * @swagger
 * /admin/api/services:
 *   get:
 *     tags: [Admin]
 *     summary: List all service providers, sellers, and customers
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Services data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serviceProviders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 sellers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 customers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomerProfile'
 */

/**
 * @swagger
 * /admin/api/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List all orders and bookings
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Orders and bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceBooking'
 */

/**
 * @swagger
 * /admin/api/payments:
 *   get:
 *     tags: [Admin]
 *     summary: List all payment data
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Payment data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 serviceOrders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceBooking'
 */

/**
 * @swagger
 * /admin/api/support:
 *   get:
 *     tags: [Admin]
 *     summary: List all support tickets
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Support tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContactMessage'
 */

/**
 * @swagger
 * /admin/api/profile-overview/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get user profile overview
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ObjectId
 *     responses:
 *       200:
 *         description: User profile data
 */

/**
 * @swagger
 * /admin/api/user-analytics/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get user analytics
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ObjectId
 *     responses:
 *       200:
 *         description: Analytics data for the user
 */

/**
 * @swagger
 * /admin/api/service-categories:
 *   get:
 *     tags: [Admin]
 *     summary: List all service categories (admin view)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Service categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceCategory'
 */

/**
 * @swagger
 * /admin/api/product-categories:
 *   get:
 *     tags: [Admin]
 *     summary: List all product categories (admin view)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Product categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductCategory'
 */

// ─── Manager ────────────────────────────────────────

/**
 * @swagger
 * /manager/api/users:
 *   get:
 *     tags: [Manager]
 *     summary: List all users
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /manager/api/services:
 *   get:
 *     tags: [Manager]
 *     summary: List service providers, sellers, and customers
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Service data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serviceProviders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 sellers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 customers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomerProfile'
 */

/**
 * @swagger
 * /manager/api/orders:
 *   get:
 *     tags: [Manager]
 *     summary: List all orders and bookings
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Orders and bookings data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceBooking'
 */

/**
 * @swagger
 * /manager/api/payments:
 *   get:
 *     tags: [Manager]
 *     summary: List payment data
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Payment data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 serviceOrders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceBooking'
 */

/**
 * @swagger
 * /manager/api/support:
 *   get:
 *     tags: [Manager]
 *     summary: List support tickets
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Support tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContactMessage'
 */

/**
 * @swagger
 * /manager/api/dashboard:
 *   get:
 *     tags: [Manager]
 *     summary: Manager dashboard data
 *     description: Returns comprehensive dashboard stats including user counts, earnings, products, monthly revenue, user growth, category analytics, and highlights
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Full dashboard stats
 */

/**
 * @swagger
 * /manager/api/dashboard/report:
 *   get:
 *     tags: [Manager]
 *     summary: Download dashboard PDF report
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: PDF report file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /manager/api/profile-overview/{id}:
 *   get:
 *     tags: [Manager]
 *     summary: Get user profile overview
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile overview data
 */

/**
 * @swagger
 * /manager/api/user-analytics/{id}:
 *   get:
 *     tags: [Manager]
 *     summary: Get user analytics
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User analytics data
 */

/**
 * @swagger
 * /manager/users/suspend/{id}:
 *   post:
 *     tags: [Manager]
 *     summary: Suspend a user account
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User suspended
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */

/**
 * @swagger
 * /manager/users/restore/{id}:
 *   post:
 *     tags: [Manager]
 *     summary: Restore a suspended user
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User restored
 */

/**
 * @swagger
 * /manager/users/create-manager:
 *   post:
 *     tags: [Manager]
 *     summary: Create a new manager account
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phone]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Manager created
 */

/**
 * @swagger
 * /manager/cancel-booking/{id}:
 *   post:
 *     tags: [Manager]
 *     summary: Cancel a service booking
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ObjectId
 *     responses:
 *       200:
 *         description: Booking cancelled
 */

/**
 * @swagger
 * /manager/restore-booking/{id}:
 *   post:
 *     tags: [Manager]
 *     summary: Restore a cancelled booking
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking restored
 */

/**
 * @swagger
 * /manager/products/{id}/approve:
 *   post:
 *     tags: [Manager]
 *     summary: Approve a pending product
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product approved
 */

/**
 * @swagger
 * /manager/products/{id}/reject:
 *   post:
 *     tags: [Manager]
 *     summary: Reject a pending product
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product rejected
 */

/**
 * @swagger
 * /manager/products/{id}/edit:
 *   put:
 *     tags: [Manager]
 *     summary: Edit a product
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 */

/**
 * @swagger
 * /manager/products/{id}:
 *   get:
 *     tags: [Manager]
 *     summary: Get a product by ID
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */

/**
 * @swagger
 * /manager/cancel-order/{orderId}:
 *   post:
 *     tags: [Manager]
 *     summary: Cancel an order
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order cancelled
 */

/**
 * @swagger
 * /manager/restore-order/{orderId}:
 *   post:
 *     tags: [Manager]
 *     summary: Restore a cancelled order
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order restored
 */

/**
 * @swagger
 * /manager/verify-provider/{id}:
 *   post:
 *     tags: [Manager]
 *     summary: Verify or reject a service provider/seller
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [verify, reject]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Provider verification updated
 */

// ─── Customer ───────────────────────────────────────

/**
 * @swagger
 * /customer/api/index:
 *   get:
 *     tags: [Customer]
 *     summary: List approved products
 *     description: Returns approved products with verified sellers sorted first
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Products list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 user:
 *                   type: object
 */

/**
 * @swagger
 * /customer/api/booking:
 *   get:
 *     tags: [Customer]
 *     summary: Get booking page data
 *     description: Returns service providers, services, districts, ratings, and customer profile for the booking page
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Booking page data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uniqueServices:
 *                   type: array
 *                   items:
 *                     type: string
 *                 uniqueDistricts:
 *                   type: array
 *                   items:
 *                     type: string
 *                 serviceProviders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 customerProfile:
 *                   $ref: '#/components/schemas/CustomerProfile'
 *                 serviceCostMap:
 *                   type: object
 *                 ratingsMap:
 *                   type: object
 */

/**
 * @swagger
 * /customer/api/provider/{id}/reviews:
 *   get:
 *     tags: [Customer]
 *     summary: Get reviews for a service provider
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider ObjectId
 *     responses:
 *       200:
 *         description: Provider reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customerName:
 *                         type: string
 *                       rating:
 *                         type: number
 *                       review:
 *                         type: string
 *                       createdAt:
 *                         type: string
 */

/**
 * @swagger
 * /customer/api/cart:
 *   get:
 *     tags: [Customer]
 *     summary: Get cart items
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Cart contents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                       image:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       subtotal:
 *                         type: number
 *                 total:
 *                   type: number
 */

/**
 * @swagger
 * /customer/create-order:
 *   post:
 *     tags: [Customer]
 *     summary: Create orders from cart
 *     description: Creates orders grouped by seller, reduces stock, clears cart, sends notifications
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryAddress:
 *                 type: string
 *               deliveryDistrict:
 *                 type: string
 *     responses:
 *       200:
 *         description: Orders created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 */

/**
 * @swagger
 * /customer/cart/add:
 *   post:
 *     tags: [Customer]
 *     summary: Add product to cart
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: string
 *                 description: Product ID
 *     responses:
 *       200:
 *         description: Product added to cart
 */

/**
 * @swagger
 * /customer/api/order/{id}:
 *   get:
 *     tags: [Customer]
 *     summary: Get order details
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details with status history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 */

/**
 * @swagger
 * /customer/api/service/{id}:
 *   get:
 *     tags: [Customer]
 *     summary: Get service booking details
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details with status/cost history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 booking:
 *                   $ref: '#/components/schemas/ServiceBooking'
 */

/**
 * @swagger
 * /customer/api/history:
 *   get:
 *     tags: [Customer]
 *     summary: Get order and booking history
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Customer history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceBooking'
 *                 upcomingOrders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pastOrders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 */

/**
 * @swagger
 * /customer/order-receipt/{id}:
 *   get:
 *     tags: [Customer]
 *     summary: Download order receipt PDF
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF receipt file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /customer/service-receipt/{id}:
 *   get:
 *     tags: [Customer]
 *     summary: Download service booking receipt PDF
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF receipt file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /customer/cancel-order/{id}:
 *   post:
 *     tags: [Customer]
 *     summary: Cancel a pending order
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order cancelled
 */

/**
 * @swagger
 * /customer/cancel-service/{id}:
 *   post:
 *     tags: [Customer]
 *     summary: Cancel an open service booking
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service booking cancelled
 */

/**
 * @swagger
 * /customer/api/profile:
 *   get:
 *     tags: [Customer]
 *     summary: Get customer profile
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Customer profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                 profile:
 *                   $ref: '#/components/schemas/CustomerProfile'
 */

/**
 * @swagger
 * /customer/profile:
 *   post:
 *     tags: [Customer]
 *     summary: Update customer profile
 *     description: Updates profile including vehicle details and file uploads (profile picture, RC book, insurance copy, vehicle photos via Cloudinary)
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               district:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *               vehicleMake:
 *                 type: string
 *               vehicleModel:
 *                 type: string
 *               vehicleVariant:
 *                 type: string
 *               fuelType:
 *                 type: string
 *                 enum: ["", Petrol, Diesel, Electric, Hybrid, CNG]
 *               transmission:
 *                 type: string
 *                 enum: ["", Manual, Automatic]
 *               yearOfManufacture:
 *                 type: number
 *               vin:
 *                 type: string
 *               currentMileage:
 *                 type: number
 *               insuranceProvider:
 *                 type: string
 *               insuranceValidTill:
 *                 type: string
 *                 format: date
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *               rcBook:
 *                 type: string
 *                 format: binary
 *               insuranceCopy:
 *                 type: string
 *                 format: binary
 *               vehiclePhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 */

/**
 * @swagger
 * /customer/delete-vehicle-photo:
 *   delete:
 *     tags: [Customer]
 *     summary: Remove a vehicle photo
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photoUrl]
 *             properties:
 *               photoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Photo deleted
 */

/**
 * @swagger
 * /customer/delete-profile:
 *   delete:
 *     tags: [Customer]
 *     summary: Delete user account
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User deleted
 */

/**
 * @swagger
 * /customer/product/{id}:
 *   get:
 *     tags: [Customer]
 *     summary: Get product details with reviews
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details with reviews and rating summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *                 ratingSummary:
 *                   type: object
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductReview'
 *                 canReview:
 *                   type: boolean
 *                 userReview:
 *                   $ref: '#/components/schemas/ProductReview'
 */

/**
 * @swagger
 * /customer/product/{id}/review:
 *   post:
 *     tags: [Customer]
 *     summary: Submit or update a product review
 *     description: Must have purchased the product to review it
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 review:
 *                   $ref: '#/components/schemas/ProductReview'
 */

/**
 * @swagger
 * /customer/rate-service/{id}:
 *   post:
 *     tags: [Customer]
 *     summary: Rate a completed service booking
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service rated
 */

// ─── Service Provider ───────────────────────────────

/**
 * @swagger
 * /service/api/dashboard:
 *   get:
 *     tags: [Service Provider]
 *     summary: Service provider dashboard data
 *     description: Returns dashboard data including service labels/counts, earnings, ongoing/completed counts, average rating
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serviceLabels:
 *                   type: array
 *                   items:
 *                     type: string
 *                 serviceCounts:
 *                   type: array
 *                   items:
 *                     type: number
 *                 totals:
 *                   type: object
 *                   properties:
 *                     earnings:
 *                       type: number
 *                     ongoing:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     avgRating:
 *                       type: number
 *                     totalReviews:
 *                       type: number
 */

/**
 * @swagger
 * /service/updateBookingStatus:
 *   post:
 *     tags: [Service Provider]
 *     summary: Update booking status
 *     description: "Update a booking's status: Open→Confirmed/Rejected, Confirmed→Completed/Rejected. Validates price approval and sends notifications."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, newStatus]
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Booking ID
 *               newStatus:
 *                 type: string
 *                 enum: [Confirmed, Rejected, Completed]
 *     responses:
 *       200:
 *         description: Status updated
 */

/**
 * @swagger
 * /service/updateMultipleBookingStatus:
 *   post:
 *     tags: [Service Provider]
 *     summary: Bulk update booking statuses
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderIds, newStatus]
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               newStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Statuses updated
 */

/**
 * @swagger
 * /service/api/earnings-data:
 *   get:
 *     tags: [Service Provider]
 *     summary: Get earnings chart data
 *     description: Returns earnings data with support for weekly and monthly time ranges
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: ["1", "3", "6", "12"]
 *         description: "Time range in months (1=weekly view, 3/6/12=monthly view)"
 *     responses:
 *       200:
 *         description: Earnings data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 labels:
 *                   type: array
 *                   items:
 *                     type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: number
 *                 totalEarnings:
 *                   type: number
 *                 timeRange:
 *                   type: string
 */

/**
 * @swagger
 * /service/api/reviews:
 *   get:
 *     tags: [Service Provider]
 *     summary: Get provider's reviews
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Reviews list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       customerImage:
 *                         type: string
 *                       rating:
 *                         type: number
 *                       reviewText:
 *                         type: string
 *                       createdAt:
 *                         type: string
 */

/**
 * @swagger
 * /service/profile/delete/{id}:
 *   delete:
 *     tags: [Service Provider]
 *     summary: Delete service provider account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account deleted
 */

/**
 * @swagger
 * /service/updateBooking:
 *   put:
 *     tags: [Service Provider]
 *     summary: Update booking status and/or cost
 *     description: If cost changes, triggers price approval workflow and sends customer notification
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *               status:
 *                 type: string
 *               totalCost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Booking updated
 */

/**
 * @swagger
 * /service/updateCost/{id}:
 *   post:
 *     tags: [Service Provider]
 *     summary: Update booking total cost
 *     description: Sets priceApprovalStatus to pending and notifies customer
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [totalCost]
 *             properties:
 *               totalCost:
 *                 type: number
 *     responses:
 *       302:
 *         description: Redirect to booking management
 */

/**
 * @swagger
 * /service/submit-rating/{id}:
 *   post:
 *     tags: [Service Provider]
 *     summary: Submit rating for a booking
 *     description: Sets booking status to Completed and updates provider average rating
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rating submitted
 */

/**
 * @swagger
 * /service/api/profile:
 *   get:
 *     tags: [Service Provider]
 *     summary: Get service provider profile
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Provider profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     district:
 *                       type: string
 *                     servicesOffered:
 *                       type: array
 *                       items:
 *                         type: object
 *                     paintColors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     profilePicture:
 *                       type: string
 *                     pickupRate:
 *                       type: number
 *                     dropoffRate:
 *                       type: number
 *                     verificationStatus:
 *                       type: string
 */

/**
 * @swagger
 * /service/api/recent-activity:
 *   get:
 *     tags: [Service Provider]
 *     summary: Get recent booking activity
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Recent activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 activities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       icon:
 *                         type: string
 *                       text:
 *                         type: string
 *                       timeAgo:
 *                         type: string
 *                       status:
 *                         type: string
 *                       bookingId:
 *                         type: string
 */

/**
 * @swagger
 * /service/api/bookings:
 *   get:
 *     tags: [Service Provider]
 *     summary: Get all provider bookings
 *     description: Returns bookings with full details including vehicle info, linked products, pickup/dropoff info
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Bookings list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceBooking'
 */

/**
 * @swagger
 * /service/api/update-product-cost:
 *   post:
 *     tags: [Service Provider]
 *     summary: Update product cost for a booking
 *     description: Updates the product cost portion and recalculates total. Sends price notification.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, productCost]
 *             properties:
 *               bookingId:
 *                 type: string
 *               productCost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Product cost updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalCost:
 *                   type: number
 *                 productCost:
 *                   type: number
 */

// ─── Seller ─────────────────────────────────────────

/**
 * @swagger
 * /seller/api/dashboard:
 *   get:
 *     tags: [Seller]
 *     summary: Seller dashboard data
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalSales:
 *                   type: number
 *                 totalEarnings:
 *                   type: number
 *                 totalOrders:
 *                   type: number
 *                 stockAlerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                 statusDistribution:
 *                   type: object
 */

/**
 * @swagger
 * /seller/profileSettings:
 *   get:
 *     tags: [Seller]
 *     summary: Get seller profile settings
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Seller profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 profile:
 *                   type: object
 *                 docTypesIndividual:
 *                   type: array
 *                   items:
 *                     type: string
 *                 docTypesBusiness:
 *                   type: array
 *                   items:
 *                     type: string
 *   post:
 *     tags: [Seller]
 *     summary: Update seller profile
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               phone:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               address:
 *                 type: string
 *               sellerType:
 *                 type: string
 *                 enum: [individual, business]
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 */

/**
 * @swagger
 * /seller/api/orders:
 *   get:
 *     tags: [Seller]
 *     summary: Get seller's orders
 *     description: Returns all orders containing items sold by this seller
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Seller orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       uniqueId:
 *                         type: string
 *                       orderId:
 *                         type: string
 *                       productId:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       deliveryAddress:
 *                         type: string
 *                       district:
 *                         type: string
 *                       status:
 *                         type: string
 *                       placedAt:
 *                         type: string
 */

/**
 * @swagger
 * /seller/api/reviews:
 *   get:
 *     tags: [Seller]
 *     summary: Get seller's product reviews
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Reviews with per-product summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductReview'
 *                 summaries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       totalReviews:
 *                         type: number
 *                       avgRating:
 *                         type: number
 */

/**
 * @swagger
 * /seller/add-product:
 *   post:
 *     tags: [Seller]
 *     summary: Add a new product
 *     description: Uploads images to Cloudinary. Product starts as "pending".
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, description, category, brand, quantity, sku]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               brand:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               sku:
 *                 type: string
 *               compatibility:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       200:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 */

/**
 * @swagger
 * /seller/api/products:
 *   get:
 *     tags: [Seller]
 *     summary: List seller's products
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Products list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */

/**
 * @swagger
 * /seller/delete-product/{id}:
 *   post:
 *     tags: [Seller]
 *     summary: Delete a product
 *     description: Removes from Cloudinary and all carts
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */

/**
 * @swagger
 * /seller/update-stock/{id}:
 *   post:
 *     tags: [Seller]
 *     summary: Add stock to a product
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to add
 *     responses:
 *       200:
 *         description: Stock updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 newQuantity:
 *                   type: number
 */

/**
 * @swagger
 * /seller/orders/{orderId}/status:
 *   post:
 *     tags: [Seller]
 *     summary: Update order item status
 *     description: Handles per-item or whole-order status updates. Generates delivery OTP on "shipped", verifies OTP on "delivered".
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newStatus]
 *             properties:
 *               newStatus:
 *                 type: string
 *                 enum: [confirmed, shipped, delivered, cancelled]
 *               productId:
 *                 type: string
 *               itemIndex:
 *                 type: number
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *               otp:
 *                 type: string
 *                 description: Required for delivered status
 *     responses:
 *       200:
 *         description: Status updated
 */

/**
 * @swagger
 * /seller/orders/{orderId}/delivery-date:
 *   post:
 *     tags: [Seller]
 *     summary: Update delivery date for an order item
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemIndex, deliveryDate]
 *             properties:
 *               itemIndex:
 *                 type: integer
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Delivery date updated
 */

/**
 * @swagger
 * /seller/upload-document:
 *   post:
 *     tags: [Seller]
 *     summary: Upload verification document
 *     description: Uploads to Cloudinary and sets verificationStatus to pending
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [docType, document]
 *             properties:
 *               docType:
 *                 type: string
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 verificationDocuments:
 *                   type: array
 *                   items:
 *                     type: object
 *                 verificationStatus:
 *                   type: string
 */

/**
 * @swagger
 * /seller/delete-document/{docType}:
 *   delete:
 *     tags: [Seller]
 *     summary: Delete a verification document
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: docType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted
 */

/**
 * @swagger
 * /seller/edit-product/{id}:
 *   put:
 *     tags: [Seller]
 *     summary: Edit a product
 *     description: Updates product details and optionally replaces images. Resets status to pending.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               brand:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               sku:
 *                 type: string
 *               compatibility:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated
 */

/**
 * @swagger
 * /seller/bulk-upload/sample-csv:
 *   get:
 *     tags: [Seller]
 *     summary: Download sample CSV template for bulk upload
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /seller/bulk-upload:
 *   post:
 *     tags: [Seller]
 *     summary: Bulk upload products from CSV
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file
 *     responses:
 *       302:
 *         description: Redirect to bulk upload result page
 */

/**
 * @swagger
 * /seller/api/bulk-upload-result:
 *   get:
 *     tags: [Seller]
 *     summary: Get bulk upload result
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Bulk upload result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: number
 *                     skipped:
 *                       type: number
 *                     failed:
 *                       type: number
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 */

/**
 * @swagger
 * /seller/request-payout:
 *   post:
 *     tags: [Seller]
 *     summary: Request a payout
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Payout requested
 */

// ─── Bookings ───────────────────────────────────────

/**
 * @swagger
 * /bookings/create-booking:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a service booking
 *     description: Calculates total cost from provider's services. Validates paint color for car painting. Includes pickup/dropoff costs and stores full vehicle details.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [providerId, selectedServices, date, phone, address, description, district]
 *             properties:
 *               providerId:
 *                 type: string
 *               selectedServices:
 *                 type: array
 *                 items:
 *                   type: string
 *               date:
 *                 type: string
 *                 format: date
 *               phone:
 *                 type: string
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               description:
 *                 type: string
 *               district:
 *                 type: string
 *               paintColor:
 *                 type: string
 *               needsPickup:
 *                 type: boolean
 *               needsDropoff:
 *                 type: boolean
 *               serviceCategory:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *               vehicleMake:
 *                 type: string
 *               vehicleModel:
 *                 type: string
 *               vehicleVariant:
 *                 type: string
 *               fuelType:
 *                 type: string
 *               transmission:
 *                 type: string
 *               yearOfManufacture:
 *                 type: number
 *               vin:
 *                 type: string
 *               currentMileage:
 *                 type: number
 *               insuranceProvider:
 *                 type: string
 *               insuranceValidTill:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 booking:
 *                   $ref: '#/components/schemas/ServiceBooking'
 *       400:
 *         description: Validation error
 */

// ─── Cart ───────────────────────────────────────────

/**
 * @swagger
 * /api/cart/{userId}:
 *   get:
 *     tags: [Cart]
 *     summary: Get cart contents
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cart data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 */

/**
 * @swagger
 * /api/cart/remove/{userId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item removed
 */

/**
 * @swagger
 * /api/cart/place-order/{userId}:
 *   post:
 *     tags: [Cart]
 *     summary: Place order from cart
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order placed
 */

/**
 * @swagger
 * /api/cart/update/{userId}:
 *   put:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     description: Increase or decrease item quantity. Validates stock availability.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, action]
 *             properties:
 *               productId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [increase, decrease]
 *     responses:
 *       200:
 *         description: Cart updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 */

// ─── Chat ───────────────────────────────────────────

/**
 * @swagger
 * /chat/customers:
 *   get:
 *     tags: [Chat]
 *     summary: List chat customers (manager only)
 *     description: Returns customers who have chat threads with latest message preview
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Customer list with chat info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customerId:
 *                         type: string
 *                       customer:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                       lastMessage:
 *                         type: string
 *                       lastAt:
 *                         type: string
 */

/**
 * @swagger
 * /chat/customers/search:
 *   get:
 *     tags: [Chat]
 *     summary: Search customers for chat
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Search results
 */

/**
 * @swagger
 * /chat/customer/{customerId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get chat messages
 *     description: Retrieves messages for a customer thread. Marks opposite-role messages as read.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 200
 *     responses:
 *       200:
 *         description: Messages list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *   post:
 *     tags: [Chat]
 *     summary: Send a text message
 *     description: Posts a message and broadcasts via Socket.IO
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 */

/**
 * @swagger
 * /chat/customer/{customerId}/attachments:
 *   post:
 *     tags: [Chat]
 *     summary: Upload file attachment to chat
 *     description: Uploads via Cloudinary with local storage fallback
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attachment sent
 */

/**
 * @swagger
 * /chat/customer/{customerId}/messages/{messageId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Delete a chat message
 *     description: Only the message owner or a manager can delete
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deletedId:
 *                   type: string
 */

/**
 * @swagger
 * /chat/unread-count:
 *   get:
 *     tags: [Chat]
 *     summary: Get unread message count
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 */

// ─── Payments ───────────────────────────────────────

/**
 * @swagger
 * /api/payments/create-checkout-session:
 *   post:
 *     tags: [Payments]
 *     summary: Create a checkout session
 *     description: Creates a Stripe or mock checkout session depending on configuration
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, price, quantity]
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: integer
 *                     image:
 *                       type: string
 *                     description:
 *                       type: string
 *                     productId:
 *                       type: string
 *               orderId:
 *                 type: string
 *               successUrl:
 *                 type: string
 *               cancelUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                 url:
 *                   type: string
 *                 mode:
 *                   type: string
 *                   enum: [stripe, mock]
 */

/**
 * @swagger
 * /api/payments/mock-session/{sessionId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get mock payment session details
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mock session details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalAmount:
 *                       type: number
 *                     status:
 *                       type: string
 */

/**
 * @swagger
 * /api/payments/mock-payment/{sessionId}:
 *   post:
 *     tags: [Payments]
 *     summary: Process mock credit card payment
 *     description: "Simulates credit card processing. Card 4000000000000002 triggers decline."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cardNumber, expiryDate, cvv, cardName]
 *             properties:
 *               cardNumber:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 description: Format MM/YY
 *               cvv:
 *                 type: string
 *               cardName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                 redirectUrl:
 *                   type: string
 */

/**
 * @swagger
 * /api/payments/verify-session/{sessionId}:
 *   get:
 *     tags: [Payments]
 *     summary: Verify payment session status
 *     description: Works for both Stripe and mock sessions
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment session status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paymentStatus:
 *                   type: string
 *                 customerEmail:
 *                   type: string
 *                 amountTotal:
 *                   type: number
 *                 mode:
 *                   type: string
 */

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Stripe webhook endpoint
 *     description: Receives Stripe payment events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event received
 */

/**
 * @swagger
 * /api/payments/config:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment configuration
 *     responses:
 *       200:
 *         description: Payment config
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publishableKey:
 *                   type: string
 *                 stripeEnabled:
 *                   type: boolean
 *                 mockEnabled:
 *                   type: boolean
 */

// ─── Contact ────────────────────────────────────────

/**
 * @swagger
 * /contactus:
 *   post:
 *     tags: [Contact]
 *     summary: Submit contact form
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *                 maxLength: 100
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       302:
 *         description: Redirect to /contactus?submitted=true
 */

/**
 * @swagger
 * /support/respond/{id}:
 *   delete:
 *     tags: [Contact]
 *     summary: Delete a support ticket
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket deleted
 */

// ─── Profile Settings (Service Provider) ────────────

/**
 * @swagger
 * /profile/update:
 *   post:
 *     tags: [Profile Settings]
 *     summary: Update service provider profile
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               district:
 *                 type: string
 *               servicesOffered:
 *                 type: string
 *                 description: JSON array of {name, cost} objects
 *               paintColors:
 *                 type: string
 *                 description: JSON array of hex color strings
 *               pickupRate:
 *                 type: number
 *               dropoffRate:
 *                 type: number
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 */

/**
 * @swagger
 * /profile/upload-document:
 *   post:
 *     tags: [Profile Settings]
 *     summary: Upload verification document
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [docType, document]
 *             properties:
 *               docType:
 *                 type: string
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded
 */

/**
 * @swagger
 * /profile/delete-document/{docType}:
 *   delete:
 *     tags: [Profile Settings]
 *     summary: Delete a verification document
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: docType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted
 */

// ─── Service Categories ─────────────────────────────

/**
 * @swagger
 * /api/service-categories/active:
 *   get:
 *     tags: [Service Categories]
 *     summary: Get active service categories
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Active categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceCategory'
 */

/**
 * @swagger
 * /api/service-categories:
 *   get:
 *     tags: [Service Categories]
 *     summary: Get all service categories (manager)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: All categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceCategory'
 *   post:
 *     tags: [Service Categories]
 *     summary: Create a service category
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   $ref: '#/components/schemas/ServiceCategory'
 */

/**
 * @swagger
 * /api/service-categories/{id}:
 *   put:
 *     tags: [Service Categories]
 *     summary: Update a service category
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *   delete:
 *     tags: [Service Categories]
 *     summary: Delete a service category
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 */

// ─── Product Categories ─────────────────────────────

/**
 * @swagger
 * /api/product-categories/active:
 *   get:
 *     tags: [Product Categories]
 *     summary: Get active product categories
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Active product categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductCategory'
 */

/**
 * @swagger
 * /api/product-categories:
 *   get:
 *     tags: [Product Categories]
 *     summary: Get all product categories (manager)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: All product categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductCategory'
 *   post:
 *     tags: [Product Categories]
 *     summary: Create a product category
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               subcategories:
 *                 type: array
 *                 items:
 *                   type: string
 *               requiresCompliance:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category created
 */

/**
 * @swagger
 * /api/product-categories/{id}:
 *   put:
 *     tags: [Product Categories]
 *     summary: Update a product category
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               active:
 *                 type: boolean
 *               subcategories:
 *                 type: array
 *                 items:
 *                   type: string
 *               requiresCompliance:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *   delete:
 *     tags: [Product Categories]
 *     summary: Delete a product category
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 */

/**
 * @swagger
 * /api/product-categories/{id}/subcategory:
 *   post:
 *     tags: [Product Categories]
 *     summary: Add a subcategory
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subcategory]
 *             properties:
 *               subcategory:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subcategory added
 */

/**
 * @swagger
 * /api/product-categories/{id}/subcategory/{subIndex}:
 *   delete:
 *     tags: [Product Categories]
 *     summary: Remove a subcategory by index
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: subIndex
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subcategory removed
 */

// ─── Notifications ──────────────────────────────────

/**
 * @swagger
 * /customer/api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get paginated notifications
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Notifications page
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 total:
 *                   type: number
 *                 unreadCount:
 *                   type: number
 *                 page:
 *                   type: number
 *                 totalPages:
 *                   type: number
 */

/**
 * @swagger
 * /customer/api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 */

/**
 * @swagger
 * /customer/api/notifications/mark-all-read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */

/**
 * @swagger
 * /customer/api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */

/**
 * @swagger
 * /customer/api/notifications/{id}/accept-price:
 *   post:
 *     tags: [Notifications]
 *     summary: Accept proposed service price
 *     description: Accepts the proposed price, updates booking, and notifies provider via Socket.IO
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Price accepted
 */

/**
 * @swagger
 * /customer/api/notifications/{id}/reject-price:
 *   post:
 *     tags: [Notifications]
 *     summary: Reject proposed service price
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Price rejected
 */

/**
 * @swagger
 * /customer/api/notifications/{id}/cancel-service:
 *   post:
 *     tags: [Notifications]
 *     summary: Cancel service from notification
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service cancelled
 */

/**
 * @swagger
 * /customer/api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 */

// ─── Parts ──────────────────────────────────────────

/**
 * @swagger
 * /api/parts/search:
 *   get:
 *     tags: [Parts]
 *     summary: Search product catalog for parts
 *     description: Returns approved products with available stock for service providers
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *       - in: query
 *         name: compatibility
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 products:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Product'
 *                       - type: object
 *                         properties:
 *                           availableStock:
 *                             type: number
 */

/**
 * @swagger
 * /api/parts/link:
 *   post:
 *     tags: [Parts]
 *     summary: Link a product to a booking
 *     description: Reserves stock and recalculates booking total. Sets price approval to pending.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, productId]
 *             properties:
 *               bookingId:
 *                 type: string
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 default: 1
 *               installationRequired:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Product linked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 linkedProducts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalCost:
 *                   type: number
 *                 productCost:
 *                   type: number
 */

/**
 * @swagger
 * /api/parts/unlink:
 *   post:
 *     tags: [Parts]
 *     summary: Unlink a product from a booking
 *     description: Releases reserved stock and recalculates booking total
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, productId]
 *             properties:
 *               bookingId:
 *                 type: string
 *               productId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product unlinked
 */

/**
 * @swagger
 * /api/parts/allocation-status:
 *   put:
 *     tags: [Parts]
 *     summary: Update product allocation status
 *     description: "Transitions: reserved→allocated→installed (consumes stock), or →returned (releases reservation)"
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, productId, status]
 *             properties:
 *               bookingId:
 *                 type: string
 *               productId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [reserved, allocated, installed, returned]
 *     responses:
 *       200:
 *         description: Allocation status updated
 */

/**
 * @swagger
 * /api/parts/booking/{bookingId}:
 *   get:
 *     tags: [Parts]
 *     summary: Get linked products for a booking
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Linked products with details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 linkedProducts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 productCost:
 *                   type: number
 *                 totalCost:
 *                   type: number
 */
