const express = require("express");
const router = express.Router();
const assetController = require("../controllers/assetController");
const { authenticate, requireRole } = require("../middleware/auth");
const {
  assetValidation,
  handleValidationErrors,
} = require("../middleware/validate");

// All routes require authentication
router.use(authenticate);

// Create new asset
router.post(
  "/",
  assetValidation.create,
  handleValidationErrors,
  assetController.createAsset
);

// Get all assets
router.get("/", assetController.getAssets);

// Get asset by ID
router.get("/:id", assetController.getAssetById);

// Update asset
router.put("/:id", assetController.updateAsset);

// Delete asset
router.delete("/:id", assetController.deleteAsset);

// Verify asset (admin only)
router.put(
  "/:id/verify",
  requireRole("admin"),
  assetValidation.verify,
  handleValidationErrors,
  assetController.verifyAsset
);

// Add document to asset
router.post("/:id/documents", assetController.addDocument);

module.exports = router;
