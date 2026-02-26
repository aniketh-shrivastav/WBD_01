document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const signupContainer = document.getElementById("signupContainer");
  const toggleAuthButton = document.getElementById("toggleAuth");
  const userTypeSelect = document.getElementById("userType");

  const signupForms = {
    customer: document.getElementById("customerSignup"),
    seller: document.getElementById("sellerSignup"),
    "service-provider": document.getElementById("serviceProviderSignup"),
    manager: document.getElementById("managerSignup"),
  };

  let isLoginView = true;

  // Toggle login/signup view
  if (toggleAuthButton) {
    toggleAuthButton.addEventListener("click", () => {
      isLoginView = !isLoginView;
      loginForm.classList.toggle("hidden");
      signupContainer.classList.toggle("hidden");
      toggleAuthButton.textContent = isLoginView
        ? "Need an account? Sign up"
        : "Already have an account? Log in";
    });
  }

  // Show the appropriate signup form
  userTypeSelect.addEventListener("change", showSelectedForm);

  function showSelectedForm() {
    const selectedType = userTypeSelect.value;
    Object.values(signupForms).forEach((form) => form.classList.add("hidden"));
    signupForms[selectedType]?.classList.remove("hidden");
  }

  showSelectedForm(); // Show initial on page load

  // Handle login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          window.location.href = "/users";
        } else {
          alert(data.message || "Invalid credentials.");
        }
      } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login.");
      }
    });
  }

  // Handle signup
  document.querySelectorAll(".signup-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const userType = userTypeSelect.value;

      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");

      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      let userData = { role: userType };

      if (userType === "customer") {
        userData = {
          ...userData,
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password"),
        };
      } else if (userType === "seller") {
        userData = {
          ...userData,
          businessName: formData.get("businessName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password"),
        };
      } else if (userType === "service-provider") {
        userData = {
          ...userData,
          workshopName: formData.get("workshopName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password"),
        };
      } else if (userType === "manager") {
        userData = {
          ...userData,
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password"),
        };
      }

      // Basic frontend validation
      const hasEmptyField = Object.entries(userData).some(([key, value]) => {
        // Skip role since it's always selected
        if (key === "role") return false;
        return !value || value.trim() === "";
      });

      if (
        userData.name &&
        (/^\s/.test(userData.name) ||
          !/^[A-Za-z\s.-]+$/.test(userData.name.trim()))
      ) {
        alert(
          "Name should not start with spaces or contain numbers/special characters.",
        );
        return;
      }

      if (
        userData.businessName &&
        (/^\s/.test(userData.businessName) ||
          !/^[A-Za-z\s.-]+$/.test(userData.businessName.trim()))
      ) {
        alert(
          "Business name should not start with spaces or contain numbers/special characters.",
        );
        return;
      }

      if (
        userData.workshopName &&
        (/^\s/.test(userData.workshopName) ||
          !/^[A-Za-z\s.-]+$/.test(userData.workshopName.trim()))
      ) {
        alert(
          "Workshop name should not start with spaces or contain numbers/special characters.",
        );
        return;
      }

      if (userData.phone && !/^\d{10}$/.test(userData.phone.trim())) {
        alert("Phone number must be 10 digits.");
        return;
      }
      if (userData.email && /[A-Z]/.test(userData.email)) {
        alert("Email must not contain uppercase letters.");
        return;
      }

      try {
        const response = await fetch("/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(userData),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          alert(result.message || "Signup successful!");
          window.location.href = "/login";
        } else {
          alert(result.message || "Signup failed. Please try again.");
        }
      } catch (error) {
        console.error("Signup error:", error);
        alert("An error occurred during registration.");
      }
    });
  });
});
