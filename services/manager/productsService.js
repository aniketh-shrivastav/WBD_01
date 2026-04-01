const Product = require("../../models/Product");

async function approveProduct(req, res) {
  try {
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true },
    );

    if (!product) {
      if (wantsJson)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      return res.status(404).send("Product not found");
    }

    if (wantsJson) return res.json({ success: true, product });
    if (req.query.from === "static")
      return res.redirect("/manager/dashboard.html");
    res.redirect("/manager/dashboard");
  } catch (err) {
    console.error(err);
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    if (wantsJson)
      return res
        .status(500)
        .json({ success: false, message: "Error approving product" });
    res.status(500).send("Error approving product");
  }
}

async function rejectProduct(req, res) {
  try {
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    );

    if (!product) {
      if (wantsJson)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      return res.status(404).send("Product not found");
    }

    if (wantsJson) return res.json({ success: true, product });
    if (req.query.from === "static")
      return res.redirect("/manager/dashboard.html");
    res.redirect("/manager/dashboard");
  } catch (err) {
    console.error(err);
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    if (wantsJson)
      return res
        .status(500)
        .json({ success: false, message: "Error rejecting product" });
    res.status(500).send("Error rejecting product");
  }
}

async function editProduct(req, res) {
  try {
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;

    const {
      name,
      price,
      description,
      category,
      brand,
      quantity,
      compatibility,
    } = req.body;

    if (
      !name ||
      price === undefined ||
      !description ||
      !category ||
      !brand ||
      quantity === undefined
    ) {
      if (wantsJson)
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      return res.status(400).send("Missing required fields");
    }

    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      if (wantsJson)
        return res
          .status(400)
          .json({ success: false, message: "Invalid price value" });
      return res.status(400).send("Invalid price value");
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      if (wantsJson)
        return res
          .status(400)
          .json({ success: false, message: "Invalid quantity value" });
      return res.status(400).send("Invalid quantity value");
    }

    const updateData = {
      name: name.trim().toUpperCase(),
      price: parsedPrice,
      description: description.trim(),
      category: category.trim().toUpperCase(),
      brand: brand.trim(),
      quantity: parsedQuantity,
    };

    if (compatibility !== undefined)
      updateData.compatibility = compatibility.trim();

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).populate("seller", "name email");

    if (!product) {
      if (wantsJson)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      return res.status(404).send("Product not found");
    }

    if (wantsJson) return res.json({ success: true, product });
    if (req.query.from === "static")
      return res.redirect("/manager/dashboard.html");
    res.redirect("/manager/dashboard");
  } catch (err) {
    console.error("Error editing product:", err);
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    if (wantsJson)
      return res
        .status(500)
        .json({ success: false, message: "Error editing product" });
    res.status(500).send("Error editing product");
  }
}

async function getProduct(req, res) {
  try {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "name email",
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    return res.json({ success: true, product });
  } catch (err) {
    console.error("Error fetching product:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching product" });
  }
}

module.exports = {
  approveProduct,
  rejectProduct,
  editProduct,
  getProduct,
};
