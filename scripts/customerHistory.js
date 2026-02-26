function toggleMenu() {
  document.getElementById("mobileMenu").classList.toggle("show");
}

document.addEventListener("DOMContentLoaded", function () {
  displayOrders();
  displayServices();

  // Search functionality
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");

  function filterItems() {
      const searchValue = searchInput.value.toLowerCase();
      const allItems = document.querySelectorAll(".history-item");

      allItems.forEach(item => {
          const itemText = item.textContent.toLowerCase();
          if (itemText.includes(searchValue)) {
              item.style.display = "flex";
          } else {
              item.style.display = "none";
          }
      });
  }

  searchInput.addEventListener("input", filterItems);
  searchBtn.addEventListener("click", filterItems);
});

// function displayOrders() {
// let upcomingOrders = JSON.parse(localStorage.getItem("upcomingOrders")) || [];
// let pastOrders = JSON.parse(localStorage.getItem("pastOrders")) || [];

// const upcomingOrdersHtml = upcomingOrders.map(order => {
// // Get item names from the cart
// const itemNames = order.cart.map(item => item.name).join(", ");

// return `<li class="history-item part">
//   <div class="item-details">
//       <h3>${itemNames || "Order"}</h3>
//       <p>Expected Delivery: ${order.arrival || "Processing"}</p>
//       <p>Payment Method: ${order.paymentMethod}</p>
//   </div>
// </li>`;
// }).join("");

// const pastOrdersHtml = pastOrders.map(o => 
// `<li class="history-item part">
//   <div class="item-details">
//       <h3>${o.item}</h3>
//       <p>Status: Delivered</p>
//   </div>
//   <button onclick="review('${o.item}')" class="review-btn">Review</button>
// </li>`
// ).join("");

// document.getElementById("upcoming-orders").innerHTML = upcomingOrdersHtml || "<p class='no-items'>No upcoming orders</p>";
// document.getElementById("past-orders").innerHTML = pastOrdersHtml || "<p class='no-items'>No past orders</p>";
// }

// function displayServices() {
//   let upcomingServices = JSON.parse(localStorage.getItem("upcomingServices")) || [];
//   let pastServices = JSON.parse(localStorage.getItem("pastServices")) || [];

//   const upcomingServicesHtml = upcomingServices.map((s, index) => 
//       `<li class="history-item part">
//           <div class="item-details">
//               <h3>${s.service}</h3>
//               <p>Scheduled on: ${s.date}</p>
//           </div>
//           <button onclick="completeService(${index})" class="complete-btn">Mark as Completed</button>
//       </li>`
//   ).join("");
  
//   const pastServicesHtml = pastServices.map(s => 
//       `<li class="history-item part">
//           <div class="item-details">
//               <h3>${s.service}</h3>
//               <p>Status: Completed</p>
//           </div>
//           <button onclick="reviewService('${s.service}')" class="rate-btn">Rate</button>
//       </li>`
//   ).join("");

//   document.getElementById("upcoming-services").innerHTML = upcomingServicesHtml || "<p class='no-items'>No upcoming services</p>";
//   document.getElementById("past-services").innerHTML = pastServicesHtml || "<p class='no-items'>No past services</p>";
// }

function completeService(index) {
  let upcomingServices = JSON.parse(localStorage.getItem("upcomingServices")) || [];
  let pastServices = JSON.parse(localStorage.getItem("pastServices")) || [];

  let completedService = upcomingServices.splice(index, 1)[0];
  pastServices.push(completedService);

  localStorage.setItem("upcomingServices", JSON.stringify(upcomingServices));
  localStorage.setItem("pastServices", JSON.stringify(pastServices));
  displayServices();
}

function review(item) {
  let reviewText = prompt(`Leave a review for ${item}:`);
  if (reviewText) alert("Review submitted!");
}

function reviewService(service) {
  let rating = prompt(`Rate ${service} (1-5 stars):`);
  if (rating && rating >= 1 && rating <= 5) {
      alert(`You rated ${service} ${rating} stars!`);
  } else {
      alert("Invalid rating. Please enter a number between 1 and 5.");
  }
}

function openRatingModal(bookingId) {
  document.getElementById('ratingModal').style.display = 'flex';
  document.getElementById('bookingId').value = bookingId;
}

function closeRatingModal() {
  document.getElementById('ratingModal').style.display = 'none';
  document.getElementById('ratingForm').reset();
}

document.getElementById('ratingForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const bookingId = document.getElementById('bookingId').value;
  const rating = document.getElementById('rating').value;
  const review = document.getElementById('review').value;

  try {
    const res = await fetch(`/customer/rate-service/${bookingId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating, review })
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeRatingModal();
      window.location.reload(); // refresh to reflect rating
    } else {
      alert('Failed to submit rating.');
    }
  } catch (err) {
    console.error(err);
    alert('Error submitting rating.');
  }
});