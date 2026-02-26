const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/product.json");

function getAllProducts() {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data).products;
}

function getProductById(id) {
    const products = getAllProducts();
    return products.find(p => p.id === id);
}

module.exports = { getAllProducts, getProductById };