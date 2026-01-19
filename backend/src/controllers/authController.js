const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { verifySignature } = require("../config/blockchain");

// Get nonce for wallet address (for MetaMask signing)
const getNonce = async (req, res) => {
  try {
    const { address } = req.params;

    // Find or create user
    const user = await User.findOrCreateByWallet(address);

    // Generate new nonce
    const nonce = user.generateNonce();
    await user.save();

    res.json({
      success: true,
      data: {
        nonce,
        message: `Sign this message to authenticate with RWA Platform. Nonce: ${nonce}`,
      },
    });
  } catch (error) {
    console.error("Get nonce error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate nonce",
    });
  }
};

// Connect wallet (verify signature and issue JWT)
const connect = async (req, res) => {
  try {
    const { address, signature } = req.body;

    // Find user
    const user = await User.findOne({ walletAddress: address.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found. Please get a nonce first.",
      });
    }

    // Create message that was signed
    const message = `Sign this message to authenticate with RWA Platform. Nonce: ${user.nonce}`;

    // Verify signature
    const isValid = verifySignature(message, signature, address);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
      });
    }

    // Generate new nonce for next login
    user.generateNonce();
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      {
        walletAddress: user.walletAddress,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          walletAddress: user.walletAddress,
          role: user.role,
          isWhitelisted: user.isWhitelisted,
          kycStatus: user.kycStatus,
        },
      },
    });
  } catch (error) {
    console.error("Connect wallet error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to authenticate",
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        walletAddress: req.user.walletAddress,
        role: req.user.role,
        isWhitelisted: req.user.isWhitelisted,
        kycStatus: req.user.kycStatus,
        profile: req.user.profile,
        lastLogin: req.user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get profile",
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, country } = req.body;

    req.user.profile = {
      ...req.user.profile,
      name,
      email,
      phone,
      country,
    };

    await req.user.save();

    res.json({
      success: true,
      data: {
        profile: req.user.profile,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
};

module.exports = {
  getNonce,
  connect,
  getProfile,
  updateProfile,
};
