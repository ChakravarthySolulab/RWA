const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ walletAddress: decoded.walletAddress });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid token. User not found.",
      });
    }

    req.user = user;
    req.walletAddress = decoded.walletAddress;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired.",
      });
    }
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication error.",
    });
  }
};

// Check if user has specific role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

// Check if user is whitelisted
const requireWhitelist = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required.",
    });
  }

  if (!req.user.isWhitelisted) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Wallet not whitelisted.",
    });
  }

  next();
};

// Check if user has approved KYC
const requireKYC = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required.",
    });
  }

  if (req.user.kycStatus !== "approved") {
    return res.status(403).json({
      success: false,
      error: "Access denied. KYC not approved.",
    });
  }

  next();
};

module.exports = {
  authenticate,
  requireRole,
  requireWhitelist,
  requireKYC,
};
