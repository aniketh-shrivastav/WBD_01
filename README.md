# AutoCustomizer - Car Customization E-Commerce Platform

A full-stack MERN application that connects car enthusiasts with customization parts sellers and professional service providers.

## 📋 Project Overview

AutoCustomizer is a comprehensive online marketplace and service platform for automotive customization. It enables users to:

- **Browse and purchase** car customization parts (exterior, interior, lighting, audio, performance, and more)
- **Book professional services** from certified service providers
- **Manage orders** and track service bookings in real-time
- **Process payments securely** via Stripe integration
- **Connect with sellers and service providers** through built-in chat
- **Access personalized dashboards** for customers, sellers, and service providers

## ✨ Key Features

### 🛍️ E-Commerce Features

- **Product Catalog**: Browse products across multiple categories (Exterior, Interior, Lighting, Audio, Performance, etc.)
- **Shopping Cart**: Add/remove items, manage quantities
- **Order Management**: Place orders, track status, view order history
- **Product Reviews**: Rate and review products
- **Search & Filter**: Find products easily with advanced filtering

### 🔧 Service Booking System

- **Service Providers**: Register as a service provider and offer services
- **Booking Management**: Schedule and manage service appointments
- **Real-time Status Updates**: Track booking status from booking to completion
- **Service Categories**: Multiple service categories for different customization needs

### 💳 Payment Integration

- **Stripe Integration**: Secure payment processing for orders and services
- **Multiple Payment Methods**: Credit cards, debit cards, digital wallets
- **Transaction Tracking**: View payment history and receipts

### 💬 Communication

- **Real-time Chat**: Direct messaging between customers and sellers/service providers
- **Notifications**: Real-time notifications for orders, bookings, and messages using Socket.io
- **Email Notifications**: Automated emails for order confirmations, updates, etc.

### 👤 User Management

- **User Authentication**: Secure JWT-based authentication
- **Role-based Access**: Customer, Seller, Service Provider, Manager, Admin roles
- **Profile Management**: Customize user profiles with personal information
- **Customer Profiles**: Save preferences and order history

### 📊 Dashboards & Analytics

- **Admin Dashboard**: Manage users, products, services, and view analytics
- **Manager Dashboard**: Oversee operations and performance metrics
- **Seller Dashboard**: Manage inventory, sales, and earnings
- **Service Provider Dashboard**: Track bookings, earnings, and customer ratings
- **Customer Dashboard**: View orders, bookings, and saved items

### 📄 Reports & Export

- **PDF Generation**: Generate order invoices and service receipts
- **CSV/Excel Export**: Export order data, payment records, and user information
- **Data Analytics**: View earnings, order statistics, and performance metrics

### 🤖 Additional Features

- **AI Assistant**: Get recommendations and support
- **File Uploads**: Cloudinary integration for product images and user uploads
- **GraphQL API**: Alternative API layer for efficient data queries
- **Admin Controls**: GraphQL-based admin operations
- **Error Logging**: Comprehensive error tracking and logging
- **Security**: CORS, rate limiting, NoSQL injection prevention, security headers

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT, Firebase Admin
- **Payment**: Stripe
- **Real-time**: Socket.io
- **File Upload**: Cloudinary
- **Email**: Nodemailer
- **API Documentation**: Swagger/OpenAPI
- **GraphQL**: Express GraphQL
- **Logging**: Morgan

### Frontend

- **Framework**: React
- **Routing**: React Router v6
- **State Management**: Redux Toolkit
- **Real-time**: Socket.io Client
- **Authentication**: Firebase, JWT
- **Build Tool**: React Scripts
- **Data Visualization**: Chart.js

### Other Tools

- **Data Processing**: ExcelJS, xlsx, csv-parser
- **Security**: bcryptjs
- **Session Management**: Express Session

## 📦 Project Structure

```
├── client/                          # React frontend
│   ├── src/                        # Source code
│   ├── public/                     # Static assets
│   ├── build/                      # Compiled frontend
│   └── package.json
├── config/                          # Configuration files
│   ├── cloudinaryConfig.js         # Cloudinary setup
│   ├── firebaseAdmin.js            # Firebase admin initialization
│   └── swagger.js                  # API documentation
├── controllers/                     # Route handlers (18+ controllers)
│   ├── authController.js           # Authentication logic
│   ├── productCategoryController.js # Product categories
│   ├── cartController.js           # Shopping cart
│   ├── orderController.js          # Order management
│   ├── paymentController.js        # Payment processing
│   ├── serviceProviderController.js# Service provider operations
│   ├── bookingController.js        # Service bookings
│   ├── chatController.js           # Messaging
│   ├── notificationController.js   # Notifications
│   ├── adminController.js          # Admin operations
│   ├── sellerController.js         # Seller operations
│   └── ...
├── models/                          # Mongoose schemas (15+ models)
│   ├── User.js                     # User model
│   ├── Product.js                  # Product model
│   ├── Orders.js                   # Order model
│   ├── ServiceCategory.js          # Service categories
│   ├── serviceBooking.js           # Booking model
│   ├── Message.js                  # Chat messages
│   ├── Notification.js             # Notifications
│   └── ...
├── routes/                          # API routes (15+ route files)
│   ├── authRoutes.js
│   ├── productCategoryRoutes.js
│   ├── cartRoutes.js
│   ├── paymentRoutes.js
│   ├── serviceProviderRoutes.js
│   └── ...
├── middleware/                      # Custom middleware
│   ├── authMiddleware.js           # JWT verification
│   ├── errorMiddleware.js          # Error handling
│   ├── securityMiddleware.js       # Security headers
│   ├── uploadMiddleware.js         # File upload handling
│   └── loggingMiddleware.js        # Request logging
├── services/                        # Business logic
│   ├── adminService.js
│   ├── customerService.js
│   ├── sellerService.js
│   ├── serviceProviderService.js
│   └── ...
├── graphql/                         # GraphQL schema and resolvers
│   └── adminGraphql.js
├── data/                            # JSON data files
├── logs/                            # Application logs
├── public/                          # Static files
├── styles/                          # CSS files
├── views/                           # EJS templates
├── scripts/                         # Utility scripts
├── server.js                        # Main server entry point
├── db.js                            # MongoDB connection
├── package.json
└── .env                            # Environment variables (not in repo)
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (local or MongoDB Atlas)
- **Git**

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd WBD-01
   ```

2. **Install backend dependencies**

   ```bash
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/autocustomizer
   # or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocustomizer

   # Express
   PORT=3000
   NODE_ENV=development

   # JWT
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRY=7d

   # Stripe
   STRIPE_SECRET_KEY=sk_test_your_stripe_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key

   # Firebase
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY=your-firebase-private-key
   FIREBASE_CLIENT_EMAIL=your-firebase-client-email

   # Cloudinary
   CLOUDINARY_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret

   # Nodemailer
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   # Session
   SESSION_SECRET=your-session-secret

   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

5. **Database Setup**

   The application will automatically create necessary collections and default data when you start the server.

### Running the Application

#### **Development Mode**

**Backend** (from root directory):

```bash
npm start
```

The server will run on `http://localhost:3000`

**Frontend** (from client directory):

```bash
cd client
npm start
```

The frontend will run on `http://localhost:5173`

#### **Production Mode**

1. Build the frontend:

   ```bash
   cd client
   npm run build
   cd ..
   ```

2. Set `NODE_ENV=production` in `.env`

3. Start the server:
   ```bash
   npm start
   ```

### Accessing the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/
- **API Documentation (Swagger)**: http://localhost:3000/api-docs
- **GraphQL**: http://localhost:3000/graphql

## 📖 API Documentation

The project includes Swagger/OpenAPI documentation:

```bash
npm start
# Visit http://localhost:3000/api-docs
```

**Main API Routes:**

- `/api/auth` - Authentication endpoints
- `/api/products` - Product endpoints
- `/api/cart` - Shopping cart endpoints
- `/api/orders` - Order management
- `/api/payments` - Payment processing
- `/api/services` - Service endpoints
- `/api/bookings` - Service booking endpoints
- `/api/chat` - Messaging endpoints
- `/api/notifications` - Notification endpoints
- `/api/users` - User management
- `/api/sellers` - Seller operations
- `/api/admin` - Admin operations

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for secure authentication:

1. **User Registration**: Create account with email and password
2. **Login**: Receive JWT token valid for 7 days
3. **Token Storage**: Token stored in localStorage on frontend
4. **Protected Routes**: API routes protected with JWT verification middleware
5. **Firebase Integration**: Additional authentication layer using Firebase Admin SDK

## 🎯 User Roles

- **Customer**: Browse products, place orders, book services, chat with providers
- **Seller**: Manage product inventory, track sales, communicate with customers
- **Service Provider**: Manage service offerings, handle bookings, track earnings
- **Manager**: Oversee operations, view analytics, manage platform
- **Admin**: Full platform control, user management, analytics, system configuration

## 📊 Real-time Features

The application uses Socket.io for real-time updates:

- **Live Notifications**: Order status, booking updates, messages
- **Real-time Chat**: Instant messaging between users
- **Live Earnings Updates**: Service provider earnings dashboard
- **Activity Tracking**: Real-time activity logs

## 🔄 Database Schema Overview

The MongoDB database includes collections for:

- Users, Customer Profiles, Seller Profiles
- Products, Product Categories, Product Reviews
- Orders, Payments, Carts
- Service Categories, Service Bookings
- Messages, Notifications
- Service Provider Data

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running locally or update `MONGODB_URI` for MongoDB Atlas
   - Check connection string format

2. **Port Already in Use**
   - Backend runs on port 3000 by default
   - Frontend runs on port 5173
   - Change ports in code if needed

3. **Missing Dependencies**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **CORS Errors**
   - Ensure `FRONTEND_URL` is correctly set in environment
   - Frontend and backend URLs are whitelisted in CORS config

5. **Stripe Integration**
   - Use Stripe test keys from dashboard
   - Test card: `4242 4242 4242 4242`

## 📝 Environment Variables Reference

| Variable            | Description                    | Example                                    |
| ------------------- | ------------------------------ | ------------------------------------------ |
| `MONGODB_URI`       | Database connection string     | `mongodb://localhost:27017/autocustomizer` |
| `PORT`              | Backend server port            | `3000`                                     |
| `JWT_SECRET`        | Secret key for JWT signing     | `your-secret-key`                          |
| `STRIPE_SECRET_KEY` | Stripe API secret key          | `sk_test_...`                              |
| `CLOUDINARY_NAME`   | Cloudinary cloud name          | `your-cloud-name`                          |
| `EMAIL_USER`        | Sender email for notifications | `your-email@gmail.com`                     |
| `FRONTEND_URL`      | Frontend application URL       | `http://localhost:5173`                    |

## 🚀 Deployment

For production deployment:

1. **Choose a hosting platform**: Heroku, AWS, DigitalOcean, Vercel (frontend), etc.
2. **Update environment variables** on hosting platform
3. **Use MongoDB Atlas** for cloud database
4. **Set `NODE_ENV=production`**
5. **Build frontend**: `npm run build` in client folder
6. **Deploy backend and frontend** separately or as monolith
7. **Configure CORS** for production URLs

## 💡 Key Features in Detail

### Shopping Cart

- Add/remove products
- Update quantities
- Persistent cart storage
- Real-time price calculations

### Order Processing

- Multiple order statuses: Pending, Confirmed, Shipped, Delivered, Cancelled
- Order history and tracking
- Invoice generation (PDF)
- Return management

### Service Bookings

- Schedule appointments with service providers
- Real-time status updates
- Service slot management
- Rating and review system

### Payment Processing

- Secure Stripe integration
- Multiple payment methods
- Transaction tracking
- Refund management

### Admin Panel

- User management
- Product management
- Order analytics
- Revenue tracking
- System configuration

## 📱 Responsive Design

The frontend is built for:

- Desktop browsers
- Tablet devices
- Mobile phones
- Touch-friendly interfaces

## 🔒 Security Features

- JSON Web Token (JWT) authentication
- Password hashing with bcryptjs
- CORS protection
- NoSQL injection prevention
- Rate limiting
- Security headers (CSP, X-Frame-Options, etc.)
- Session management with express-session
- Firebase authentication integration

## 📄 License

This project is licensed under the ISC License.

## 👥 Contributing

Contributions are welcome! Please feel free to:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Contact the development team
- Check existing documentation

## 🗺️ Roadmap

Future enhancements:

- Mobile app (React Native)
- Advanced analytics dashboard
- Loyalty/rewards program
- Multi-language support
- Advanced search with Elasticsearch
- Inventory management system
- Supply chain integration
- Video consultation for services
- Subscription plans

---

**Built with ❤️ using MERN Stack**

Last Updated: 2026
