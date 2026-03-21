const Product = require("../../models/Product");
const Cart = require("../../models/Cart");
const cloudinary = require("../../config/cloudinaryConfig");
const {
  createError,
  isValidObjectId,
  uploadProductImages,
} = require("./helpers");

async function addProduct(sellerId, body, files) {
  const {
    name,
    price,
    description,
    category,
    subcategory,
    brand,
    quantity,
    sku,
    compatibility,
  } = body;

  if (!files || files.length === 0) {
    throw createError(400, "At least one product image required.");
  }

  const uploadedImages = await uploadProductImages(files);

  const newProduct = new Product({
    name,
    price,
    description,
    category,
    subcategory: subcategory || "",
    brand,
    quantity,
    sku,
    compatibility,
    image: uploadedImages[0].url,
    imagePublicId: uploadedImages[0].publicId,
    images: uploadedImages,
    seller: sellerId,
  });

  await newProduct.save();

  return newProduct;
}

async function getProducts(sellerId) {
  return Product.find({ seller: sellerId }).lean();
}

async function updateStock(productId, sellerId, quantity) {
  if (!isValidObjectId(productId)) {
    throw createError(400, "Invalid product id");
  }

  const addQty = Number(quantity);
  if (!Number.isInteger(addQty) || addQty < 1) {
    throw createError(400, "Quantity must be a positive integer");
  }

  const product = await Product.findOne({ _id: productId, seller: sellerId });
  if (!product) {
    throw createError(404, "Product not found");
  }

  product.quantity += addQty;
  await product.save();

  return product.quantity;
}

async function deleteProduct(productId, sellerId) {
  if (!isValidObjectId(productId)) {
    throw createError(400, "Invalid product id");
  }

  const product = await Product.findOne({ _id: productId, seller: sellerId });
  if (!product) {
    throw createError(404, "Product not found");
  }

  if (product.imagePublicId) {
    try {
      await cloudinary.uploader.destroy(product.imagePublicId);
    } catch (err) {
      console.warn("Cloudinary delete failed:", err.message);
    }
  }

  await Product.deleteOne({ _id: productId });
  await Cart.updateMany(
    { "items.productId": productId },
    { $pull: { items: { productId } } },
  );
}

async function editProduct(productId, sellerId, body, files) {
  if (!isValidObjectId(productId)) {
    throw createError(400, "Invalid product id");
  }

  const product = await Product.findOne({ _id: productId, seller: sellerId });
  if (!product) {
    throw createError(404, "Product not found");
  }

  const {
    name,
    price,
    description,
    category,
    subcategory,
    brand,
    quantity,
    sku,
    compatibility,
  } = body;

  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = Number(price);
  if (description !== undefined) product.description = description;
  if (category !== undefined) product.category = category;
  if (subcategory !== undefined) product.subcategory = subcategory;
  if (brand !== undefined) product.brand = brand;
  if (quantity !== undefined) product.quantity = Number(quantity);
  if (sku !== undefined) product.sku = sku;
  if (compatibility !== undefined) product.compatibility = compatibility;

  if (files && files.length > 0) {
    const uploadedImages = await uploadProductImages(files);

    if (product.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(product.imagePublicId);
      } catch (error) {
        console.warn("Cloudinary delete failed:", error.message);
      }
    }

    product.image = uploadedImages[0].url;
    product.imagePublicId = uploadedImages[0].publicId;
    product.images = uploadedImages;
  }

  product.status = "pending";

  await product.save();
  return product;
}

module.exports = {
  addProduct,
  getProducts,
  updateStock,
  deleteProduct,
  editProduct,
};
