const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const {
  authValidation,
  handleValidationErrors,
} = require("../middleware/validate");

// Get nonce for wallet address
router.get(
  "/nonce/:address",
  authValidation.getNonce,
  handleValidationErrors,
  authController.getNonce
);

// Connect wallet (verify signature)
router.post(
  "/connect",
  authValidation.connect,
  handleValidationErrors,
  authController.connect
);

// Get current user profile (authenticated)
router.get("/profile", authenticate, authController.getProfile);

// Update user profile (authenticated)
router.put("/profile", authenticate, authController.updateProfile);

module.exports = router;
