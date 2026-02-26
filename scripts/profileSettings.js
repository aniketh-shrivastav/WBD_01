function enableEdit() {
    document.getElementById("name").disabled = false;
    document.getElementById("email").disabled = false;
    document.getElementById("phone").disabled = false;
    document.getElementById("district").disabled = false;
    document.querySelector(".edit-btn").style.display = "none";
    document.querySelector(".save-btn").style.display = "inline-block";
    document.querySelector(".cancel-btn").style.display = "inline-block";
    document.querySelector(".edit-pass-btn").style.display = "inline-block";
    document.querySelector(".service-input-container").style.display = "block";
    document.querySelector(".add-service-btn").style.display = "inline-block";

    // Show delete buttons
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.style.display = "inline-block";
    });
}    

async function saveChanges() {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const district = document.getElementById("district").value.trim();

    // Collect services and costs
    const serviceItems = document.querySelectorAll(".service-item");
    const servicesOffered = Array.from(serviceItems).map(item => {
        return {
            name: item.querySelector(".service-name").value.trim(),
            cost: parseFloat(item.querySelector(".service-cost").value.trim()) || 0
        };
    });

    const data = {
        name,
        phone,
        district,
        servicesOffered
    };

    console.log("Sending data:", data);

    try {
        const response = await fetch("/profile/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert("Profile updated successfully!");
            location.reload();
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Profile update failed:", error);
        alert("Failed to update profile.");
    }
}


function togglePasswordField() {
    let passwordField = document.getElementById("passwordField");
    passwordField.style.display = passwordField.style.display === "none" ? "block" : "none";
}

function addService() {
    const nameInput = document.getElementById("newService");
    const costInput = document.getElementById("newServiceCost");

    const name = nameInput.value.trim();
    const cost = parseFloat(costInput.value.trim());

    if (name && !isNaN(cost)) {
        const newLi = document.createElement("li");
        newLi.className = "service-item";
        newLi.innerHTML = `
            <input type="text" class="service-name" value="${name}" required>
            <input type="number" class="service-cost" value="${cost}" required>
            <button class="delete-btn" onclick="removeService(this)">Delete</button>
        `;
        document.getElementById("serviceList").appendChild(newLi);

        nameInput.value = "";
        costInput.value = "";
    } else {
        alert("Please enter both a service name and cost.");
    }
}

function removeService(button) {
    button.parentElement.remove();
}

