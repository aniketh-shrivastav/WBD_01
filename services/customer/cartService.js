const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const { createError } = require("./helpers");

async function getCartPageData(userId) {
  const cart = await Cart.findOne({ userId });
  return { items: cart?.items || [] };
}

async function getCartApiData(userId) {
  const cart = await Cart.findOne({ userId });

  const items = (cart?.items || []).map((it) => ({
    productId: it.productId,
    name: it.name,
    price: it.price,
    image: it.image,
    quantity: it.quantity,
    subtotal: it.price * it.quantity,
  }));

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  return { items, total };
}

async function addToCart(userId, itemId, fallbackItemId) {
  const lookupId = itemId || fallbackItemId;

  if (!lookupId) {
    throw createError(400, "Product id is required");
  }

  const product = await Product.findById(lookupId);
  if (!product) {
    throw createError(404, "Product not found");
  }

  const { name, price, image } = product;
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  const productIdStr = String(product._id);
  const existingItem = cart.items.find(
    (item) => String(item.productId) === productIdStr,
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.items.push({
      productId: productIdStr,
      name,
      price,
      image,
      quantity: 1,
    });
  }

  await cart.save();
}

module.exports = {
  getCartPageData,
  getCartApiData,
  addToCart,
};
