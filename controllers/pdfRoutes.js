const PDFDocument = require("pdfkit");
const path = require("path");
const ServiceBooking = require("../models/serviceBooking");
const {
  findOrderByIdentifier,
  getDisplayOrderId,
} = require("../utils/orderIdUtils");

// ===== Helper: Add Logo & Title =====
function addLogo(doc, title) {
  const logoPath = path.join(__dirname, "../public/images3/logo2.jpg");
  doc.image(logoPath, 50, 40, { width: 80 });
  doc.fontSize(24).text("AutoCustomizer", 150, 50);
  doc.moveDown(2);
  doc.fontSize(20).text(title, { align: "center" });
  doc.moveDown(1);
}

// ===== Helper: Footer =====
function addFooter(doc) {
  doc
    .fontSize(10)
    .fillColor("gray")
    .text(
      "AutoCustomizer © 2025 - All rights reserved",
      50,
      doc.page.height - 40,
      { align: "center", width: doc.page.width - 100 },
    );
}

// ===== Helper: Draw Table =====
function drawTable(doc, startX, startY, rows, colWidths) {
  const rowHeight = 25;
  let y = startY;

  rows.forEach((row, rowIndex) => {
    let x = startX;

    row.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], rowHeight).stroke();
      doc
        .font(rowIndex === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(12)
        .text(cell, x + 5, y + 8, { width: colWidths[i] - 10, align: "left" });
      x += colWidths[i];
    });

    y += rowHeight;
  });

  return y; // Return the ending Y position
}

// ===== ORDER RECEIPT =====
exports.getOrderReceipt = async (req, res) => {
  try {
    const order = await findOrderByIdentifier(req.params.id);
    if (!order) return res.status(404).send("Order not found");

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Order_${getDisplayOrderId(order)}.pdf`,
    );
    doc.pipe(res);

    // Header
    addLogo(doc, "Order Receipt");

    const details = order.deliveryAddressDetails || {};
    const formattedAddress = details.addressLine1
      ? [
          [details.addressLine1, details.addressLine2]
            .filter(Boolean)
            .join(", "),
          [details.landmark, details.city, details.state, details.postalCode]
            .filter(Boolean)
            .join(", "),
          details.country,
        ]
          .filter(Boolean)
          .join(", ")
      : order.deliveryAddress;

    // Order Details Table
    let yPos = drawTable(
      doc,
      50,
      doc.y,
      [
        ["Field", "Details"],
        ["Order ID", getDisplayOrderId(order)],
        ["Placed On", order.placedAt.toLocaleDateString()],
        ["Status", order.orderStatus],
        ["Payment Status", order.paymentStatus],
        ["Delivery Address", formattedAddress],
        ["City", details.city || order.district || "-"],
        ["State", details.state || "-"],
        ["Postal Code", details.postalCode || "-"],
      ],
      [150, 350],
    );

    // Items Table
    const items = [["Item", "Quantity", "Price"]];
    order.items.forEach((item) => {
      items.push([item.name, item.quantity.toString(), `₹${item.price}`]);
    });

    // Calculate subtotal, delivery cost, and tax
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const deliveryCost = Math.round(subtotal * 0.05 * 100) / 100;
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = subtotal + deliveryCost + tax;

    items.push(["Subtotal", "", `₹${subtotal.toFixed(2)}`]);
    items.push(["Delivery Cost (5%)", "", `₹${deliveryCost.toFixed(2)}`]);
    items.push(["Tax (18%)", "", `₹${tax.toFixed(2)}`]);
    items.push(["Grand Total", "", `₹${grandTotal.toFixed(2)}`]);

    drawTable(doc, 50, yPos + 10, items, [250, 100, 150]);

    // Footer
    addFooter(doc);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// ===== SERVICE RECEIPT =====
exports.getServiceReceipt = async (req, res) => {
  try {
    const service = await ServiceBooking.findById(req.params.id).populate(
      "providerId",
    );
    if (!service) return res.status(404).send("Service not found");

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Service_${service._id}.pdf`,
    );
    doc.pipe(res);

    // Header
    addLogo(doc, "Service Receipt");

    // Service Details Table
    drawTable(
      doc,
      50,
      doc.y,
      [
        ["Field", "Details"],
        ["Service ID", service._id],
        ["Booked On", service.createdAt.toLocaleDateString()],
        ["Status", service.status],
        [
          "Provider",
          `${service.providerId.name} | ${service.providerId.phone}`,
        ],
        [
          "Vehicle",
          [service.vehicleMake, service.vehicleModel, service.vehicleVariant]
            .filter(Boolean)
            .join(" ") ||
            service.carModel ||
            "N/A",
        ],
        ["Description", service.description],
        ["Total Cost", `₹${service.totalCost}`],
      ],
      [150, 350],
    );

    // Footer
    addFooter(doc);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
