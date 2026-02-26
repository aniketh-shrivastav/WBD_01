document.addEventListener("DOMContentLoaded", function () {
  function toggleMenu() {
      document.getElementById("mobileMenu").classList.toggle("show");
  }

  const serviceSelect = document.getElementById("service");
  const providerSelect = document.getElementById("service-provider");
  const phoneInput = document.getElementById("phone");
  const bookingForm = document.getElementById("booking-form");

  // Fetch service providers from the backend (already passed via EJS)
  const serviceProviders = JSON.parse('<%= JSON.stringify(serviceProviders) %>');

  serviceSelect.addEventListener("change", function () {
      const selectedServices = Array.from(serviceSelect.selectedOptions).map(option => option.value);

      // Filter providers offering at least one selected service
      const filteredProviders = serviceProviders.filter(provider =>
          provider.servicesOffered.some(service => selectedServices.includes(service))
      );

      // Enable & populate service provider dropdown
      providerSelect.innerHTML = '<option value="">Select Service Provider</option>';
      filteredProviders.forEach(provider => {
          providerSelect.innerHTML += `<option value="${provider._id}">${provider.name}</option>`;
      });

      providerSelect.disabled = filteredProviders.length === 0;
  });

  bookingForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const selectedServices = Array.from(serviceSelect.selectedOptions).map(option => option.value);
      const date = document.getElementById("date").value;
      const provider = providerSelect.value;
      const phone = phoneInput.value;

      // Phone number validation
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
          alert("Please enter a valid 10-digit phone number.");
          return;
      }

      if (!provider) {
          alert("Please select a service provider.");
          return;
      }

      let upcomingServices = JSON.parse(localStorage.getItem("upcomingServices")) || [];

      selectedServices.forEach(service => {
          upcomingServices.push({
              service: service,
              date: date,
              provider: provider,
              phone: phone
          });
      });

      localStorage.setItem("upcomingServices", JSON.stringify(upcomingServices));

      alert("Services booked successfully!");
      window.location.href = "history";
  });
});