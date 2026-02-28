import React, { useEffect, useState, useRef } from "react";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/profile.css";
import "../../Css/customer.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function CustomerProfile() {
  useLink("/styles/styles.css");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    district: "",
    carModel: "",
    payments: "",
    profilePicture: "",
    // Vehicle details - Basic
    registrationNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleVariant: "",
    fuelType: "",
    transmission: "",
    // Vehicle details - Technical
    yearOfManufacture: "",
    vin: "",
    currentMileage: "",
    insuranceProvider: "",
    insuranceValidTill: "",
    // Vehicle documents
    rcBook: "",
    insuranceCopy: "",
    vehiclePhotos: [],
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);
  const rcBookInputRef = useRef(null);
  const insuranceCopyInputRef = useRef(null);
  const vehiclePhotosInputRef = useRef(null);
  const [rcBookFile, setRcBookFile] = useState(null);
  const [insuranceCopyFile, setInsuranceCopyFile] = useState(null);
  const [vehiclePhotoFiles, setVehiclePhotoFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState("#333");
  const [userId, setUserId] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/customer/api/profile", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const { user, profile } = await res.json();
        setUserId(user.id);
        setForm({
          name: user.name || "",
          phone: user.phone || "",
          address: profile.address || "",
          district: profile.district || "",
          carModel: profile.carModel || "",
          payments: profile.payments || "",
          profilePicture: profile.profilePicture || "",
          registrationNumber: profile.registrationNumber || "",
          vehicleMake: profile.vehicleMake || "",
          vehicleModel: profile.vehicleModel || "",
          vehicleVariant: profile.vehicleVariant || "",
          fuelType: profile.fuelType || "",
          transmission: profile.transmission || "",
          yearOfManufacture: profile.yearOfManufacture || "",
          vin: profile.vin || "",
          currentMileage: profile.currentMileage || "",
          insuranceProvider: profile.insuranceProvider || "",
          insuranceValidTill: profile.insuranceValidTill
            ? profile.insuranceValidTill.split("T")[0]
            : "",
          rcBook: profile.rcBook || "",
          insuranceCopy: profile.insuranceCopy || "",
          vehiclePhotos: profile.vehiclePhotos || [],
        });
        if (profile.profilePicture) {
          setImagePreview(profile.profilePicture);
        }
      } catch (e) {
        setStatus(e.message);
        setStatusColor("red");
      }
    })();
  }, []);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        setStatus("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
        setStatusColor("red");
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setStatus("Image size should be less than 10MB");
        setStatusColor("red");
        return;
      }

      setProfileImage(file);
      setFileName(file.name);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setStatus("");
    }
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  function showError(name, message) {
    setErrors((e) => ({ ...e, [name]: message }));
  }

  function validateName() {
    const v = form.name.trim();
    const re = /^[A-Za-z\s]{3,}$/;
    if (!re.test(v)) {
      showError(
        "name",
        "Name should contain only letters and spaces (min 3 chars).",
      );
      return false;
    }
    return true;
  }
  function validatePhone() {
    const raw = form.phone.trim();
    const digits = raw.replace(/\D/g, "");
    if (
      digits.length === 10 ||
      (digits.length === 12 && digits.startsWith("91"))
    ) {
      return true;
    }
    showError(
      "phone",
      "Enter a valid 10-digit phone number. You may include +91 or spaces.",
    );
    return false;
  }
  function validateAddress() {
    const v = form.address.trim();
    if (v.length < 5) {
      showError("address", "Address is too short (min 5 characters).");
      return false;
    }
    return true;
  }
  function validateDistrict() {
    const v = form.district.trim();
    const re = /^[A-Za-z\s]{2,}$/;
    if (!re.test(v)) {
      showError(
        "district",
        "District should contain only letters and spaces (no special characters).",
      );
      return false;
    }
    return true;
  }
  function validateCarModel() {
    const v = form.carModel.trim();
    const re = /^[A-Za-z0-9\s\-\/\.]{1,}$/;
    if (v.length === 0) {
      showError("carModel", "Car model cannot be empty.");
      return false;
    }
    if (!re.test(v)) {
      showError("carModel", "Car model contains invalid characters.");
      return false;
    }
    return true;
  }
  function validatePayments() {
    const v = form.payments.trim();
    if (v.length === 0) {
      showError("payments", "Payment method cannot be empty.");
      return false;
    }
    const re = /^[A-Za-z0-9\s\-\&\,\.]{1,}$/;
    if (!re.test(v)) {
      showError("payments", "Payment method contains invalid characters.");
      return false;
    }
    return true;
  }

  function validateAll() {
    setErrors({});
    const ok = [
      validateName(),
      validatePhone(),
      validateAddress(),
      validateDistrict(),
      validateCarModel(),
      validatePayments(),
    ].every(Boolean);
    return ok;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("");
    setStatusColor("#333");
    if (!validateAll()) {
      // focus first error
      const first = document.querySelector(".error-text");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStatus("Saving...");
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("phone", form.phone);
      formData.append("address", form.address);
      formData.append("district", form.district);
      formData.append("carModel", form.carModel);
      formData.append("payments", form.payments);
      // Vehicle details
      formData.append("registrationNumber", form.registrationNumber);
      formData.append("vehicleMake", form.vehicleMake);
      formData.append("vehicleModel", form.vehicleModel);
      formData.append("vehicleVariant", form.vehicleVariant);
      formData.append("fuelType", form.fuelType);
      formData.append("transmission", form.transmission);
      formData.append("yearOfManufacture", form.yearOfManufacture || "");
      formData.append("vin", form.vin);
      formData.append("currentMileage", form.currentMileage || "");
      formData.append("insuranceProvider", form.insuranceProvider);
      formData.append("insuranceValidTill", form.insuranceValidTill || "");

      if (profileImage) {
        formData.append("profilePicture", profileImage);
      }
      if (rcBookFile) {
        formData.append("rcBook", rcBookFile);
      }
      if (insuranceCopyFile) {
        formData.append("insuranceCopy", insuranceCopyFile);
      }
      if (vehiclePhotoFiles.length > 0) {
        vehiclePhotoFiles.forEach((f) => formData.append("vehiclePhotos", f));
      }

      const res = await fetch("/customer/profile", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });
      if (res.status === 401) {
        setStatus("Session expired. Redirecting to login...");
        setStatusColor("red");
        setTimeout(() => (window.location.href = "/login"), 800);
        return;
      }
      if (!res.ok) {
        const maybe = await res.json().catch(() => ({}));
        throw new Error(maybe.message || "Save failed");
      }
      const data = await res.json();
      if (data.profilePicture) {
        setForm((f) => ({ ...f, profilePicture: data.profilePicture }));
        setImagePreview(data.profilePicture);
      }
      setStatus("Profile saved successfully!");
      setStatusColor("green");
      setProfileImage(null);
      setFileName("");
      setRcBookFile(null);
      setInsuranceCopyFile(null);
      setVehiclePhotoFiles([]);
      // Reload to get fresh data (updated photos, docs URLs)
      const reload = await fetch("/customer/api/profile", {
        headers: { Accept: "application/json" },
      });
      if (reload.ok) {
        const { profile: p } = await reload.json();
        setForm((f) => ({
          ...f,
          rcBook: p.rcBook || "",
          insuranceCopy: p.insuranceCopy || "",
          vehiclePhotos: p.vehiclePhotos || [],
        }));
      }
    } catch (err) {
      setStatus(err.message || "Unexpected error");
      setStatusColor("red");
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete your account?",
      )
    )
      return;
    setStatus("Deleting...");
    setStatusColor("#333");
    try {
      const res = await fetch("/customer/delete-profile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Profile deleted.");
      window.location.href = "/logout";
    } catch (e) {
      setStatus(e.message);
      setStatusColor("red");
    }
  }

  return (
    <div className="customer-page">
      <CustomerNav />
      <main className="customer-main">
        <div className="customer-profile-container">
          <a
            className="customer-btn customer-btn-secondary customer-btn-sm"
            href="/customer/index"
            style={{ marginBottom: "24px", display: "inline-flex" }}
          >
            ← Back to Dashboard
          </a>

          {/* Profile Header */}
          <div className="customer-profile-header">
            <div
              className="profile-picture-wrapper"
              style={{ position: "relative", display: "inline-block" }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="customer-profile-avatar"
                />
              ) : (
                <div className="customer-profile-avatar-placeholder">👤</div>
              )}
              <button
                type="button"
                onClick={triggerFileInput}
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "white",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                📷
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <h2 className="customer-profile-name" style={{ color: "white" }}>
              {form.name || "Your Name"}
            </h2>
            {fileName && <p className="customer-profile-email">{fileName}</p>}
          </div>

          {/* Profile Form */}
          <div className="customer-profile-form">
            <form onSubmit={onSubmit}>
              {/* Personal Information Section */}
              <div className="customer-profile-section">
                <h3 className="customer-profile-section-title">
                  <span>👤</span> Personal Information
                </h3>
                <div className="customer-profile-grid">
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="name">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      placeholder="Enter your name"
                      value={form.name || ""}
                      onChange={(e) => setField("name", e.target.value)}
                      onBlur={validateName}
                      className={`customer-input ${errors.name ? "customer-input-error" : ""}`}
                    />
                    {errors.name && (
                      <div className="customer-error-text">{errors.name}</div>
                    )}
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="phone">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      placeholder="Enter your phone number"
                      value={form.phone || ""}
                      onChange={(e) => setField("phone", e.target.value)}
                      onBlur={validatePhone}
                      className={`customer-input ${errors.phone ? "customer-input-error" : ""}`}
                    />
                    {errors.phone && (
                      <div className="customer-error-text">{errors.phone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="customer-profile-section">
                <h3 className="customer-profile-section-title">
                  <span>📍</span> Address Information
                </h3>
                <div className="customer-profile-grid">
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="address">
                      Address
                    </label>
                    <input
                      id="address"
                      name="address"
                      placeholder="Enter your address"
                      value={form.address || ""}
                      onChange={(e) => setField("address", e.target.value)}
                      onBlur={validateAddress}
                      className={`customer-input ${errors.address ? "customer-input-error" : ""}`}
                    />
                    {errors.address && (
                      <div className="customer-error-text">
                        {errors.address}
                      </div>
                    )}
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="district">
                      District
                    </label>
                    <input
                      id="district"
                      name="district"
                      placeholder="Enter your district"
                      value={form.district || ""}
                      onChange={(e) => setField("district", e.target.value)}
                      onBlur={validateDistrict}
                      className={`customer-input ${errors.district ? "customer-input-error" : ""}`}
                    />
                    {errors.district && (
                      <div className="customer-error-text">
                        {errors.district}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle & Payment Section */}
              <div className="customer-profile-section">
                <h3 className="customer-profile-section-title">
                  <span>🚗</span> Vehicle Basic Details
                </h3>
                <div className="customer-profile-grid">
                  <div className="customer-form-group">
                    <label
                      className="customer-label"
                      htmlFor="registrationNumber"
                    >
                      Registration Number
                    </label>
                    <input
                      id="registrationNumber"
                      name="registrationNumber"
                      placeholder="e.g., KA01AB1234"
                      value={form.registrationNumber || ""}
                      onChange={(e) =>
                        setField("registrationNumber", e.target.value)
                      }
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="vehicleMake">
                      Make (Brand)
                    </label>
                    <input
                      id="vehicleMake"
                      name="vehicleMake"
                      placeholder="e.g., Hyundai, Honda, BMW"
                      value={form.vehicleMake || ""}
                      onChange={(e) => setField("vehicleMake", e.target.value)}
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="vehicleModel">
                      Model
                    </label>
                    <input
                      id="vehicleModel"
                      name="vehicleModel"
                      placeholder="e.g., i20, City, X5"
                      value={form.vehicleModel || ""}
                      onChange={(e) => setField("vehicleModel", e.target.value)}
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="vehicleVariant">
                      Variant
                    </label>
                    <input
                      id="vehicleVariant"
                      name="vehicleVariant"
                      placeholder="e.g., Sportz, ZX"
                      value={form.vehicleVariant || ""}
                      onChange={(e) =>
                        setField("vehicleVariant", e.target.value)
                      }
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="fuelType">
                      Fuel Type
                    </label>
                    <select
                      id="fuelType"
                      name="fuelType"
                      value={form.fuelType || ""}
                      onChange={(e) => setField("fuelType", e.target.value)}
                      className="customer-input"
                    >
                      <option value="">Select Fuel Type</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="transmission">
                      Transmission
                    </label>
                    <select
                      id="transmission"
                      name="transmission"
                      value={form.transmission || ""}
                      onChange={(e) => setField("transmission", e.target.value)}
                      className="customer-input"
                    >
                      <option value="">Select Transmission</option>
                      <option value="Manual">Manual</option>
                      <option value="Automatic">Automatic</option>
                    </select>
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="carModel">
                      Car Model (Legacy)
                    </label>
                    <input
                      id="carModel"
                      name="carModel"
                      placeholder="Enter your car model"
                      value={form.carModel || ""}
                      onChange={(e) => setField("carModel", e.target.value)}
                      onBlur={validateCarModel}
                      className={`customer-input ${errors.carModel ? "customer-input-error" : ""}`}
                    />
                    {errors.carModel && (
                      <div className="customer-error-text">
                        {errors.carModel}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle Technical Details */}
              <div className="customer-profile-section">
                <h3 className="customer-profile-section-title">
                  <span>🔧</span> Vehicle Technical Details
                </h3>
                <div className="customer-profile-grid">
                  <div className="customer-form-group">
                    <label
                      className="customer-label"
                      htmlFor="yearOfManufacture"
                    >
                      Year of Manufacture
                    </label>
                    <input
                      id="yearOfManufacture"
                      name="yearOfManufacture"
                      type="number"
                      placeholder="e.g., 2020"
                      min="1980"
                      max={new Date().getFullYear()}
                      value={form.yearOfManufacture || ""}
                      onChange={(e) =>
                        setField("yearOfManufacture", e.target.value)
                      }
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="vin">
                      VIN (Optional)
                    </label>
                    <input
                      id="vin"
                      name="vin"
                      placeholder="Vehicle Identification Number"
                      value={form.vin || ""}
                      onChange={(e) => setField("vin", e.target.value)}
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="currentMileage">
                      Current Mileage (km)
                    </label>
                    <input
                      id="currentMileage"
                      name="currentMileage"
                      type="number"
                      placeholder="e.g., 45000"
                      min="0"
                      value={form.currentMileage || ""}
                      onChange={(e) =>
                        setField("currentMileage", e.target.value)
                      }
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label
                      className="customer-label"
                      htmlFor="insuranceProvider"
                    >
                      Insurance Provider
                    </label>
                    <input
                      id="insuranceProvider"
                      name="insuranceProvider"
                      placeholder="e.g., ICICI Lombard"
                      value={form.insuranceProvider || ""}
                      onChange={(e) =>
                        setField("insuranceProvider", e.target.value)
                      }
                      className="customer-input"
                    />
                  </div>
                  <div className="customer-form-group">
                    <label
                      className="customer-label"
                      htmlFor="insuranceValidTill"
                    >
                      Insurance Valid Till
                    </label>
                    <input
                      id="insuranceValidTill"
                      name="insuranceValidTill"
                      type="date"
                      value={form.insuranceValidTill || ""}
                      onChange={(e) =>
                        setField("insuranceValidTill", e.target.value)
                      }
                      className="customer-input"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Documents Upload Section */}
              <div className="customer-profile-section">
                <h3 className="customer-profile-section-title">
                  <span>📄</span> Vehicle Documents & Photos
                </h3>
                <div className="customer-profile-grid">
                  {/* RC Book */}
                  <div className="customer-form-group">
                    <label className="customer-label">RC Book</label>
                    {form.rcBook && (
                      <div style={{ marginBottom: 8 }}>
                        <a
                          href={form.rcBook}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--customer-primary)",
                            textDecoration: "underline",
                          }}
                        >
                          View Current RC Book
                        </a>
                      </div>
                    )}
                    <input
                      ref={rcBookInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setRcBookFile(file);
                      }}
                      className="customer-input"
                    />
                  </div>
                  {/* Insurance Copy */}
                  <div className="customer-form-group">
                    <label className="customer-label">Insurance Copy</label>
                    {form.insuranceCopy && (
                      <div style={{ marginBottom: 8 }}>
                        <a
                          href={form.insuranceCopy}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--customer-primary)",
                            textDecoration: "underline",
                          }}
                        >
                          View Current Insurance Copy
                        </a>
                      </div>
                    )}
                    <input
                      ref={insuranceCopyInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setInsuranceCopyFile(file);
                      }}
                      className="customer-input"
                    />
                  </div>
                </div>
                {/* Vehicle Photos */}
                <div className="customer-form-group" style={{ marginTop: 16 }}>
                  <label className="customer-label">
                    Vehicle Photos (Front, Rear, Interior - up to 5)
                  </label>
                  {form.vehiclePhotos && form.vehiclePhotos.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      {form.vehiclePhotos.map((url, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          <img
                            src={url}
                            alt={`Vehicle ${idx + 1}`}
                            style={{
                              width: 100,
                              height: 75,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid #ddd",
                            }}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm("Remove this vehicle photo?"))
                                return;
                              try {
                                await fetch("/customer/delete-vehicle-photo", {
                                  method: "DELETE",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Accept: "application/json",
                                  },
                                  body: JSON.stringify({ photoUrl: url }),
                                });
                                setForm((f) => ({
                                  ...f,
                                  vehiclePhotos: f.vehiclePhotos.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }));
                              } catch (e) {
                                alert("Failed to remove photo");
                              }
                            }}
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "#e74c3c",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 12,
                              lineHeight: "22px",
                              textAlign: "center",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={vehiclePhotosInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setVehiclePhotoFiles(files.slice(0, 5));
                    }}
                    className="customer-input"
                  />
                </div>
              </div>

              {/* Payment Section */}
              <div className="customer-profile-section">
                <h3 className="customer-profile-section-title">
                  <span>💳</span> Payment
                </h3>
                <div className="customer-profile-grid">
                  <div className="customer-form-group">
                    <label className="customer-label" htmlFor="payments">
                      Payment Method
                    </label>
                    <input
                      id="payments"
                      name="payments"
                      placeholder="Enter payment details (COD/e-payments)"
                      value={form.payments || ""}
                      onChange={(e) => setField("payments", e.target.value)}
                      onBlur={validatePayments}
                      className={`customer-input ${errors.payments ? "customer-input-error" : ""}`}
                    />
                    {errors.payments && (
                      <div className="customer-error-text">
                        {errors.payments}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {status && (
                <div
                  className={`customer-alert ${statusColor === "green" ? "customer-alert-success" : statusColor === "red" ? "customer-alert-error" : "customer-alert-info"}`}
                  style={{ marginBottom: "24px" }}
                >
                  <div className="customer-alert-content">{status}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <button
                  type="submit"
                  className="customer-btn customer-btn-primary customer-btn-lg"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className="customer-btn customer-btn-secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    const next = encodeURIComponent(
                      `${window.location.origin}/`,
                    );
                    const base =
                      window.location.port === "5173"
                        ? `${window.location.protocol}//${window.location.hostname}:3000`
                        : "";
                    window.location.href = `${base}/logout?next=${next}`;
                  }}
                >
                  Logout
                </button>
                <button
                  type="button"
                  className="customer-btn customer-btn-danger"
                  onClick={onDelete}
                >
                  Delete Account
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <CustomerFooter />
    </div>
  );
}
