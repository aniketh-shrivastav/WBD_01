const ContactMessage = require("../models/ContactMessage");
const User = require("../models/User");

// Contact Us Submission
exports.submitContact = async (req, res) => {
  const { name, email, subject, message } = req.body;
  const nameRegex = /^[A-Za-z\s.-]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!nameRegex.test(name)) return res.status(400).send("Invalid name");
  if (!emailRegex.test(email) || /[A-Z]/.test(email))
    return res.status(400).send("Invalid email format");

  try {
    const user = await User.findOne({ email });

    const newMessage = new ContactMessage({
      name,
      email,
      subject,
      message,
      verifiedUser: !!user,
    });

    await newMessage.save();

    console.log(
      `Message received from ${name} (${email}) - Verified: ${!!user}`,
    );

    res.redirect("/contactus?submitted=true");
  } catch (err) {
    console.error("Contact form submission failed:", err);
    res.status(500).send("Failed to submit");
  }
};

// Manager view for submitted messages
exports.getManagerSupport = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }); // recent first
    res.render("manager/support", { submissions: messages });
  } catch (err) {
    console.error("Error loading support data:", err);
    res.status(500).send("Error loading support data");
  }
};

// Delete a support ticket
exports.deleteTicket = async (req, res) => {
  console.log("Delete request received for ID:", req.params.id);
  try {
    const { id } = req.params;
    const deleted = await ContactMessage.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ message: "Ticket deleted" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};
