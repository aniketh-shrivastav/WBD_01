document.addEventListener("DOMContentLoaded", () => {
    loadCart();
  
    // Checkout button handler
    document.getElementById("checkout-btn").addEventListener("click", () => {
      document.getElementById("payment-selection").style.display = "block";
      loadPaymentMethods();
    });
  
    // Confirm payment method
    document.getElementById("confirm-payment").addEventListener("click", () => {
      const selected = document.querySelector("input[name='payment-method']:checked");
      if (!selected) return alert("Please select a payment method.");
  
      const paymentMethod = selected.value === "cod"
        ? "Cash on Delivery"
        : JSON.parse(localStorage.getItem("paymentMethods"))[selected.value];
  
      localStorage.setItem("selectedPaymentMethod", paymentMethod);
      document.getElementById("checkout-section").style.display = "block";
    });
  
    // Booking a service
    document.getElementById("book-service").addEventListener("click", () => {
      window.location.href = "service";
    });
  
    // Placing the order
    document.getElementById("place-order").addEventListener("click", async () => {
      const paymentMethod = localStorage.getItem("selectedPaymentMethod") || "Not Selected";
      const res = await fetch(`/api/cart/place-order/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
  
      if (res.ok) {
        alert("Order placed successfully!");
        window.location.href = "history";
      } else {
        alert("Error placing order.");
      }
    });
  });
  
  // Load cart from server and render it
  async function loadCart() {
    const res = await fetch(`/api/cart/${userId}`);
    const data = await res.json();
    const cart = data.items || [];
  
    const cartContainer = document.getElementById("cart-container");
    const totalSection = document.getElementById("total-section");
    let totalPrice = 0;
  
    cartContainer.innerHTML = "";
    if (cart.length === 0) {
      cartContainer.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
      totalSection.style.display = "none";
      return;
    }
  
    totalSection.style.display = "block";
  
    cart.forEach(item => {
      totalPrice += item.price * item.quantity;
  
      const itemElement = document.createElement("div");
      itemElement.classList.add("cart-item");
      itemElement.innerHTML = `
        <img src="${item.image}" alt="${item.name}">
        <p>${item.name} - ₹${item.price}</p>
        <div>
          <button class="quantity-btn" data-id="${item.productId}" data-action="decrease">−</button>
          <span class="quantity">${item.quantity}</span>
          <button class="quantity-btn" data-id="${item.productId}" data-action="increase">+</button>
        </div>
        <button class="remove" data-id="${item.productId}">Remove</button>
      `;
  
      cartContainer.appendChild(itemElement);
    });
  
    document.getElementById("total-price").textContent = totalPrice.toFixed(2);
  
    // Quantity controls
    document.querySelectorAll(".quantity-btn").forEach(btn => {
      btn.addEventListener("click", async function () {
        const productId = this.dataset.id;
        const action = this.dataset.action;
        await fetch(`/api/cart/update/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, action }),
        });
        loadCart();
      });
    });
  
    // Remove item
    document.querySelectorAll(".remove").forEach(btn => {
      btn.addEventListener("click", async function () {
        const productId = this.dataset.id;
        await fetch(`/api/cart/remove/${userId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        loadCart();
      });
    });
  }
  
  // Load saved payment methods from localStorage
  function loadPaymentMethods() {
    const saved = JSON.parse(localStorage.getItem("paymentMethods")) || [];
    const container = document.getElementById("saved-payments");
    container.innerHTML = "";
    saved.forEach((method, index) => {
      container.innerHTML += `<label><input type="radio" name="payment-method" value="${index}"> ${method}</label>`;
    });
  }
  