const ServiceBooking = require("../models/serviceBooking");
const User = require("../models/User");

exports.createBooking = async (req, res) => {
  try {
    const {
      providerId,
      selectedServices,
      date,
      phone,
      name,
      carModel,
      carYear,
      address,
      description,
      district,
      paintColor,
      // Extended vehicle details
      registrationNumber,
      vehicleMake,
      vehicleModel,
      vehicleVariant,
      fuelType,
      transmission,
      yearOfManufacture,
      vin,
      currentMileage,
      insuranceProvider,
      insuranceValidTill,
      rcBook,
      insuranceCopy,
      vehiclePhotos,
    } = req.body;

    const customerId = req.user.id;

    // Fetch provider to access service cost
    const provider = await User.findById(providerId);
    if (!provider || !provider.servicesOffered) {
      return res.status(400).json({ error: "Invalid service provider" });
    }

    const isCarPaintingSelected = Array.isArray(selectedServices)
      ? selectedServices.some((s) => {
          const name = String(s || "").toLowerCase();
          return (
            name.includes("car") &&
            (name.includes("paint") || name.includes("painting"))
          );
        })
      : false;

    // Validate paintColor when needed
    let normalizedPaintColor = undefined;
    if (isCarPaintingSelected) {
      const providerColors = Array.isArray(provider.paintColors)
        ? provider.paintColors
            .map((c) =>
              String(c || "")
                .trim()
                .toLowerCase(),
            )
            .filter((c) => /^#[0-9a-f]{6}$/.test(c))
        : [];

      const requested = String(paintColor || "")
        .trim()
        .toLowerCase();

      if (providerColors.length === 0) {
        return res.status(400).json({
          error:
            "This provider hasn't configured paint colors for Car Painting. Please choose a different provider.",
        });
      }

      if (!requested) {
        return res.status(400).json({
          error: "Please select a paint color for Car Paint/Painting.",
        });
      }
      if (!providerColors.includes(requested)) {
        return res.status(400).json({
          error: "Selected paint color is not offered by this provider.",
        });
      }
      normalizedPaintColor = requested;
    }

    // Calculate totalCost from selected services
    let totalCost = 0;
    selectedServices.forEach((serviceName) => {
      const matchedService = provider.servicesOffered.find(
        (s) => s.name === serviceName,
      );
      if (matchedService) {
        totalCost += matchedService.cost;
      }
    });

    const booking = new ServiceBooking({
      customerId,
      providerId,
      selectedServices,
      date,
      phone,
      name,
      carModel,
      carYear,
      address,
      description,
      district,
      paintColor: normalizedPaintColor,
      totalCost,
      // Extended vehicle details
      registrationNumber: registrationNumber || "",
      vehicleMake: vehicleMake || "",
      vehicleModel: vehicleModel || "",
      vehicleVariant: vehicleVariant || "",
      fuelType: fuelType || "",
      transmission: transmission || "",
      yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : null,
      vin: vin || "",
      currentMileage: currentMileage ? Number(currentMileage) : null,
      insuranceProvider: insuranceProvider || "",
      insuranceValidTill: insuranceValidTill || null,
      rcBook: rcBook || "",
      insuranceCopy: insuranceCopy || "",
      vehiclePhotos: Array.isArray(vehiclePhotos)
        ? vehiclePhotos
        : vehiclePhotos
          ? [vehiclePhotos]
          : [],
      statusHistory: [
        {
          from: null,
          to: "Open",
          changedAt: new Date(),
          changedBy: { id: customerId, role: "customer" },
        },
      ],
      costHistory: [
        {
          from: null,
          to: totalCost,
          changedAt: new Date(),
          changedBy: { id: customerId, role: "customer" },
        },
      ],
    });

    await booking.save();
    res.status(200).json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Booking creation failed:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
};
