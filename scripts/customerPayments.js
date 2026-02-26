document.addEventListener("DOMContentLoaded", function () {
  loadPaymentMethods();
});

function loadPaymentMethods() {
  let savedPayments = JSON.parse(localStorage.getItem("paymentMethods")) || [];
  let paymentList = document.getElementById("payment-methods");
  paymentList.innerHTML = "";

  if (savedPayments.length === 0) {
      paymentList.innerHTML = "<p>No saved payment methods.</p>";
      return;
  }

  savedPayments.forEach((payment, index) => {
      let li = document.createElement("li");
      li.innerHTML = `${payment} <button class="remove" data-index="${index}">Remove</button>`;
      paymentList.appendChild(li);
  });

  document.querySelectorAll(".remove").forEach(button => {
      button.addEventListener("click", function () {
          let index = this.getAttribute("data-index");
          savedPayments.splice(index, 1);
          localStorage.setItem("paymentMethods", JSON.stringify(savedPayments));
          loadPaymentMethods();
      });
  });
}

document.getElementById("payment-form").addEventListener("submit", function(event) {
  event.preventDefault();
  
  let cardNumber = document.getElementById("card-number").value;
  let expiry = document.getElementById("expiry").value;
  let cvv = document.getElementById("cvv").value;

  if (!cardNumber || !expiry || !cvv) {
      alert("Please fill in all payment details.");
      return;
  }

  let maskedCard = `Visa - **** ${cardNumber.slice(-4)} (Exp: ${expiry})`;
  let savedPayments = JSON.parse(localStorage.getItem("paymentMethods")) || [];
  savedPayments.push(maskedCard);
  localStorage.setItem("paymentMethods", JSON.stringify(savedPayments));

  alert("Payment method saved successfully!");
  loadPaymentMethods();
  document.getElementById("payment-form").reset();
});