function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeDeliveryAddress(input = {}) {
  const normalized = {
    addressLine1: toText(input.addressLine1),
    addressLine2: toText(input.addressLine2),
    landmark: toText(input.landmark),
    city: toText(input.city),
    state: toText(input.state),
    postalCode: toText(input.postalCode),
    country: toText(input.country) || "India",
  };

  return normalized;
}

function validateDeliveryAddress(address, options = {}) {
  const { requireAll = true } = options;
  const value = normalizeDeliveryAddress(address);
  const errors = {};

  if (requireAll || value.addressLine1) {
    if (value.addressLine1.length < 3) {
      errors.addressLine1 = "addressLine1 is required (min 3 characters).";
    }
  }

  if (value.addressLine2 && value.addressLine2.length < 3) {
    errors.addressLine2 =
      "addressLine2 must be at least 3 characters when provided.";
  }

  if (value.landmark && value.landmark.length < 2) {
    errors.landmark = "landmark must be at least 2 characters when provided.";
  }

  if (requireAll || value.city) {
    if (!/^[A-Za-z\s.-]{2,}$/.test(value.city)) {
      errors.city = "city is required and must contain only letters/spaces.";
    }
  }

  if (requireAll || value.state) {
    if (!/^[A-Za-z\s.-]{2,}$/.test(value.state)) {
      errors.state = "state is required and must contain only letters/spaces.";
    }
  }

  if (requireAll || value.postalCode) {
    if (!/^\d{6}$/.test(value.postalCode)) {
      errors.postalCode = "postalCode must be a valid 6-digit code.";
    }
  }

  if (requireAll || value.country) {
    if (value.country.length < 2) {
      errors.country = "country is required.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value,
  };
}

function formatDeliveryAddress(address) {
  const value = normalizeDeliveryAddress(address);
  const line1 = [value.addressLine1, value.addressLine2]
    .filter(Boolean)
    .join(", ");
  const line2 = [value.landmark, value.city, value.state, value.postalCode]
    .filter(Boolean)
    .join(", ");
  return [line1, line2, value.country].filter(Boolean).join(", ");
}

function buildAddressFromLegacy(address, district) {
  return normalizeDeliveryAddress({
    addressLine1: toText(address),
    city: toText(district),
    state: "",
    postalCode: "",
    country: "India",
  });
}

module.exports = {
  normalizeDeliveryAddress,
  validateDeliveryAddress,
  formatDeliveryAddress,
  buildAddressFromLegacy,
};
