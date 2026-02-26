import React, { useMemo, useState } from "react";
import "../Css/auth.css";
import { useNavigate } from "react-router-dom";

const nameRegex = /^[A-Za-z\s.-]+$/;
const phoneRegex = /^\d{10}$/;

function validateEmail(email) {
  if (!email) return "Email is required";
  const atCount = (email.match(/@/g) || []).length;
  if (atCount === 0) return "Email must contain @ symbol";
  if (atCount > 1) return "Email can only contain one @ symbol";
  if (email[0] === "@") return "Email cannot start with @ symbol";
  if (email[email.length - 1] === "@") return "Email cannot end with @ symbol";

  const [local, domain] = email.split("@");
  if (!local) return "Email must have text before @ symbol";
  if (local.length > 64) return "Local part (before @) too long (max 64 chars)";
  if (local[0] === ".") return "Local part cannot start with a dot";
  if (local[local.length - 1] === ".")
    return "Local part cannot end with a dot";
  if (local.includes("..")) return "Local part cannot contain consecutive dots";
  if (!/^[A-Za-z0-9._%+\-]+$/.test(local))
    return "Local part has invalid characters (allowed: letters, numbers, . _ % + -)";

  if (!domain) return "Email must have domain after @ symbol";
  if (domain.length > 255) return "Domain part too long (max 255 chars)";
  if (domain[0] === ".") return "Email domain cannot start with a dot";
  if (domain[domain.length - 1] === ".")
    return "Email domain cannot end with a dot";
  if (!domain.includes(".")) return "Email domain must contain a dot (.)";
  if (domain.includes("..")) return "Domain cannot contain consecutive dots";
  if (!/^[A-Za-z0-9.-]+$/.test(domain))
    return "Email domain contains invalid characters (letters, numbers, - and . only)";
  const domainParts = domain.split(".");
  if (domainParts.some((p) => p.length === 0))
    return "Email domain cannot have empty labels (e.g. ..)";
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2)
    return "Email domain extension must be at least 2 characters";
  if (!/^[A-Za-z]{2,}$/.test(tld))
    return "Email domain extension must contain only letters";
  if (email.includes(" ")) return "Email cannot contain spaces";
  return null;
}

export default function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState("customer");
  const [values, setValues] = useState({
    // customer
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // seller
    businessName: "",
    // service provider
    workshopName: "",
  });
  const [errors, setErrors] = useState({});
  const passwordRules = useMemo(
    () => [
      {
        test: (v) => v.length >= 6,
        msg: "Password must be at least 6 characters long",
      },
    ],
    [],
  );

  const fieldsForRole = {
    customer: [
      { name: "name", type: "text", placeholder: "Full Name" },
      { name: "email", type: "email", placeholder: "Email Address" },
      { name: "phone", type: "tel", placeholder: "Phone Number" },
      { name: "password", type: "password", placeholder: "Password" },
      {
        name: "confirmPassword",
        type: "password",
        placeholder: "Retype Password",
      },
    ],
    seller: [
      { name: "businessName", type: "text", placeholder: "Business Name" },
      { name: "email", type: "email", placeholder: "Business Email" },
      { name: "phone", type: "tel", placeholder: "Business Phone" },
      { name: "password", type: "password", placeholder: "Password" },
      {
        name: "confirmPassword",
        type: "password",
        placeholder: "Retype Password",
      },
    ],
    "service-provider": [
      { name: "workshopName", type: "text", placeholder: "Workshop Name" },
      { name: "email", type: "email", placeholder: "Workshop Email" },
      { name: "phone", type: "tel", placeholder: "Workshop Phone" },
      { name: "password", type: "password", placeholder: "Password" },
      {
        name: "confirmPassword",
        type: "password",
        placeholder: "Retype Password",
      },
    ],
    manager: [
      { name: "name", type: "text", placeholder: "Full Name" },
      { name: "email", type: "email", placeholder: "Manager Email" },
      { name: "phone", type: "tel", placeholder: "Phone Number" },
      { name: "password", type: "password", placeholder: "Password" },
      {
        name: "confirmPassword",
        type: "password",
        placeholder: "Retype Password",
      },
    ],
    admin: [
      { name: "name", type: "text", placeholder: "Full Name" },
      { name: "email", type: "email", placeholder: "Admin Email" },
      { name: "phone", type: "tel", placeholder: "Phone Number" },
      { name: "password", type: "password", placeholder: "Password" },
      {
        name: "confirmPassword",
        type: "password",
        placeholder: "Retype Password",
      },
    ],
  };

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function setFieldError(name, msg) {
    setErrors((e) => ({ ...e, [name]: msg }));
  }

  function validateField(name, value) {
    const trimmed = (value ?? "").toString().trim();
    if (!trimmed) return `${name} is required`;

    if (
      ["name", "businessName", "workshopName"].includes(name) &&
      !nameRegex.test(trimmed)
    ) {
      return "Name can only contain letters, spaces, . and -";
    }
    if (name === "email") {
      const emailErr = validateEmail(trimmed);
      if (emailErr) return emailErr;
    }
    if (name === "phone" && !phoneRegex.test(trimmed))
      return "Phone number must be exactly 10 digits";
    if (name === "password") {
      for (const r of passwordRules) if (!r.test(trimmed)) return r.msg;
    }
    if (name === "confirmPassword") {
      if (values.password !== trimmed)
        return "Passwords do not match. Please re-enter your password";
    }
    return null;
  }

  function validateAll() {
    const fields = fieldsForRole[role] || [];
    const nextErrors = {};
    for (const f of fields) {
      const msg = validateField(f.name, values[f.name]);
      if (msg) nextErrors[f.name] = msg;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validateAll()) return;

    const payload = { role };
    for (const [k, v] of Object.entries(values)) {
      if (k === "confirmPassword") continue;
      if (fieldsForRole[role].some((f) => f.name === k))
        payload[k] = (v ?? "").toString().trim();
    }

    try {
      const res = await fetch("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.redirect) {
          // Let the SPA navigate to OTP verification when required
          navigate(data.redirect.replace(/^https?:\/\/[^/]+/, ""));
        } else {
          navigate("/login");
        }
      } else {
        const msg = data.message || "Signup failed. Please try again.";
        // Attach field-specific error if we can guess
        if (/email/i.test(msg)) setFieldError("email", msg);
        else if (/phone/i.test(msg)) setFieldError("phone", msg);
        else if (/name/i.test(msg)) {
          const nameKey =
            role === "seller"
              ? "businessName"
              : role === "service-provider"
                ? "workshopName"
                : "name";
          setFieldError(nameKey, msg);
        } else {
          alert(msg);
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("An error occurred during registration.");
    }
  }

  const titleByRole = {
    customer: "Register as Customer",
    seller: "Register as Seller",
    "service-provider": "Register as Service Provider",
    manager: "Register as Manager",
    admin: "Register as Admin",
  };

  return (
    <div className="container auth-page">
      <div className="auth-wrapper">
        <div className="auth-brand">
          <h1>AutoCustomizer</h1>
          <p>Your one-stop platform for all car customization needs</p>
          <div className="brand-image">
            <img
              src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80"
              alt="Car customization"
            />
          </div>
        </div>
        <div className="auth-panel">
          <div className="auth-topbar">
            <button
              className="back-btn"
              type="button"
              onClick={() => navigate("/")}
            >
              ⟵ Back to Dashboard
            </button>
          </div>
          <h2>Create an Account</h2>

          <label htmlFor="userType">Select User Type</label>
          <select
            id="userType"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="customer">Customer</option>
            <option value="seller">Seller</option>
            <option value="service-provider">Service Provider</option>
            <option value="admin">Admin</option>
          </select>

          <form
            onSubmit={onSubmit}
            className="auth-form signup-form"
            noValidate
          >
            {fieldsForRole[role].map((f) => (
              <div className="form-group" key={f.name}>
                {f.name === "confirmPassword" ? (
                  <label htmlFor={f.name}>Retype Password</label>
                ) : null}
                <input
                  id={f.name}
                  name={f.name}
                  type={f.type}
                  required
                  placeholder={f.placeholder}
                  value={values[f.name] || ""}
                  onBlur={(e) => {
                    const msg = validateField(f.name, e.target.value);
                    setFieldError(f.name, msg || undefined);
                  }}
                  onChange={(e) => setField(f.name, e.target.value)}
                  className={errors[f.name] ? "invalid" : undefined}
                  aria-describedby={
                    errors[f.name] ? `${f.name}-err` : undefined
                  }
                />
                <span
                  className="error-msg"
                  id={`${f.name}-err`}
                  data-for={f.name}
                >
                  {errors[f.name] || ""}
                </span>
              </div>
            ))}
            <div className="auth-actions">
              <button type="submit" className="submit-btn">
                {titleByRole[role]}
              </button>
            </div>
          </form>

          <p className="auth-extra">
            Already have an account? <a href="/login">Login here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
