const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WBD Project API",
      version: "1.0.0",
      description:
        "Full-stack service & product marketplace API — covers authentication, admin, manager, customer, seller, service-provider, booking, cart, payment, chat, notification, and category management endpoints.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication & session management" },
      { name: "Admin", description: "Admin dashboard & management" },
      { name: "Manager", description: "Manager dashboard & management" },
      {
        name: "Customer",
        description: "Customer pages, profile, orders & reviews",
      },
      { name: "Seller", description: "Seller dashboard, products & orders" },
      {
        name: "Service Provider",
        description: "Service provider dashboard, bookings & earnings",
      },
      { name: "Bookings", description: "Service booking creation" },
      { name: "Cart", description: "Shopping cart operations" },
      { name: "Payments", description: "Stripe & mock payment processing" },
      {
        name: "Chat",
        description: "Real-time messaging between customers & managers",
      },
      {
        name: "Notifications",
        description: "Customer notification management",
      },
      { name: "Service Categories", description: "Service category CRUD" },
      { name: "Product Categories", description: "Product category CRUD" },
      { name: "Parts", description: "Parts search & booking linkage" },
      { name: "Contact", description: "Contact form & support tickets" },
      {
        name: "Profile Settings",
        description: "Service provider profile updates",
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string", description: "MongoDB ObjectId" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            role: {
              type: "string",
              enum: [
                "customer",
                "seller",
                "service-provider",
                "manager",
                "admin",
              ],
            },
            createdAt: { type: "string", format: "date-time" },
            suspended: { type: "boolean", default: false },
            businessName: { type: "string" },
            workshopName: { type: "string" },
            profilePicture: { type: "string", format: "uri" },
            address: { type: "string" },
            district: { type: "string" },
            servicesOffered: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  cost: { type: "number" },
                },
              },
            },
            pickupRate: { type: "number", default: 0 },
            dropoffRate: { type: "number", default: 0 },
            paintColors: { type: "array", items: { type: "string" } },
            verificationDocuments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  docType: { type: "string" },
                  docUrl: { type: "string", format: "uri" },
                  fileName: { type: "string" },
                  uploadedAt: { type: "string", format: "date-time" },
                },
              },
            },
            verificationStatus: {
              type: "string",
              enum: ["unverified", "pending", "verified", "rejected"],
            },
            firebaseUid: { type: "string" },
          },
        },
        Product: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            price: { type: "number", minimum: 0 },
            description: { type: "string" },
            category: { type: "string" },
            subcategory: { type: "string" },
            brand: { type: "string" },
            quantity: { type: "integer", minimum: 0 },
            sku: { type: "string", minLength: 6, maxLength: 6 },
            compatibility: { type: "string" },
            image: { type: "string", format: "uri" },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string", format: "uri" },
                  publicId: { type: "string" },
                },
              },
            },
            seller: { type: "string", description: "User ObjectId" },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
            },
            reservedQuantity: { type: "number", default: 0 },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/OrderItem" },
            },
            totalAmount: { type: "number" },
            deliveryAddress: { type: "string" },
            district: { type: "string" },
            useCustomAddress: { type: "boolean" },
            orderStatus: {
              type: "string",
              enum: [
                "pending",
                "confirmed",
                "shipped",
                "delivered",
                "cancelled",
              ],
            },
            paymentStatus: {
              type: "string",
              enum: ["pending", "paid", "failed"],
            },
            placedAt: { type: "string", format: "date-time" },
          },
        },
        OrderItem: {
          type: "object",
          properties: {
            productId: { type: "string" },
            name: { type: "string" },
            price: { type: "number" },
            image: { type: "string" },
            quantity: { type: "number" },
            seller: { type: "string" },
            itemStatus: {
              type: "string",
              enum: [
                "pending",
                "confirmed",
                "shipped",
                "delivered",
                "cancelled",
              ],
            },
            deliveryDate: { type: "string", format: "date-time" },
            deliveryOtp: { type: "string" },
          },
        },
        ServiceBooking: {
          type: "object",
          properties: {
            _id: { type: "string" },
            customerId: { type: "string" },
            providerId: { type: "string" },
            selectedServices: { type: "array", items: { type: "string" } },
            date: { type: "string", format: "date-time" },
            phone: { type: "string" },
            carModel: { type: "string" },
            address: { type: "string" },
            description: { type: "string" },
            district: { type: "string" },
            serviceCategory: { type: "string" },
            totalCost: { type: "number" },
            status: {
              type: "string",
              enum: ["Open", "Confirmed", "Ready", "Completed", "Rejected"],
            },
            rating: { type: "number", minimum: 1, maximum: 5 },
            review: { type: "string" },
            needsPickup: { type: "boolean" },
            needsDropoff: { type: "boolean" },
            pickupCost: { type: "number" },
            dropoffCost: { type: "number" },
            productCost: { type: "number" },
            priceApprovalStatus: {
              type: "string",
              enum: ["none", "pending", "accepted", "rejected"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Cart: {
          type: "object",
          properties: {
            userId: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  name: { type: "string" },
                  price: { type: "number" },
                  image: { type: "string" },
                  quantity: { type: "number" },
                },
              },
            },
          },
        },
        ContactMessage: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            subject: { type: "string", maxLength: 100 },
            message: { type: "string", maxLength: 1000 },
            verifiedUser: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Message: {
          type: "object",
          properties: {
            _id: { type: "string" },
            customerId: { type: "string" },
            senderId: { type: "string" },
            senderRole: { type: "string", enum: ["customer", "manager"] },
            text: { type: "string", maxLength: 2000 },
            attachment: {
              type: "object",
              properties: {
                url: { type: "string" },
                type: { type: "string" },
                name: { type: "string" },
                size: { type: "number" },
                provider: { type: "string", enum: ["local", "cloudinary"] },
              },
            },
            readByCustomer: { type: "boolean" },
            readByManager: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            _id: { type: "string" },
            customerId: { type: "string" },
            type: {
              type: "string",
              enum: [
                "new_order",
                "order_status",
                "new_service",
                "service_status",
                "price_finalized",
                "price_accepted",
                "price_rejected",
                "service_cancelled",
              ],
            },
            title: { type: "string" },
            message: { type: "string" },
            referenceId: { type: "string" },
            referenceModel: {
              type: "string",
              enum: ["Order", "ServiceBooking"],
            },
            read: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CustomerProfile: {
          type: "object",
          properties: {
            userId: { type: "string" },
            address: { type: "string" },
            district: { type: "string" },
            profilePicture: { type: "string", format: "uri" },
            registrationNumber: { type: "string" },
            vehicleMake: { type: "string" },
            vehicleModel: { type: "string" },
            vehicleVariant: { type: "string" },
            fuelType: {
              type: "string",
              enum: ["", "Petrol", "Diesel", "Electric", "Hybrid", "CNG"],
            },
            transmission: { type: "string", enum: ["", "Manual", "Automatic"] },
            yearOfManufacture: { type: "number" },
            vin: { type: "string" },
            currentMileage: { type: "number" },
            insuranceProvider: { type: "string" },
            insuranceValidTill: { type: "string", format: "date" },
          },
        },
        ProductReview: {
          type: "object",
          properties: {
            _id: { type: "string" },
            productId: { type: "string" },
            seller: { type: "string" },
            userId: { type: "string" },
            rating: { type: "number", minimum: 1, maximum: 5 },
            review: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ServiceCategory: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            active: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ProductCategory: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            subcategories: { type: "array", items: { type: "string" } },
            active: { type: "boolean" },
            requiresCompliance: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        SellerProfile: {
          type: "object",
          properties: {
            sellerId: { type: "string" },
            ownerName: { type: "string" },
            address: { type: "string" },
            sellerType: { type: "string", enum: ["individual", "business"] },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
      },
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description:
            "Session-based authentication via express-session cookie",
        },
      },
    },
  },
  apis: ["./routes/swagger-docs.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
