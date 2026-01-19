const express = require("express");
const router = express.Router();
const whitelistController = require("../controllers/whitelistController");
const { authenticate, requireRole } = require("../middleware/auth");
const {
  whitelistValidation,
  handleValidationErrors,
} = require("../middleware/validate");

// Public: Check whitelist status
router.get(
  "/:address",
  whitelistValidation.check,
  handleValidationErrors,
  whitelistController.checkWhitelist
);

// Protected routes (admin only)
router.use(authenticate);
router.use(requireRole("admin"));

// Add to whitelist
router.post(
  "/add",
  whitelistValidation.add,
  handleValidationErrors,
  whitelistController.addToWhitelist
);

// Remove from whitelist
router.post(
  "/remove",
  whitelistValidation.remove,
  handleValidationErrors,
  whitelistController.removeFromWhitelist
);

// Batch add to whitelist
router.post("/batch", whitelistController.batchAddToWhitelist);

module.exports = router;
