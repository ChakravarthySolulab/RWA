const express = require("express");
const router = express.Router();
const complianceController = require("../controllers/complianceController");
const { authenticate, requireRole } = require("../middleware/auth");

// Public: Get contract status
router.get("/status", complianceController.getStatus);

// Protected routes (admin only)
router.use(authenticate);
router.use(requireRole("admin"));

// Pause contract
router.post("/pause", complianceController.pause);

// Unpause contract
router.post("/unpause", complianceController.unpause);

// Grant role
router.post("/roles/grant", complianceController.grantRole);

// Revoke role
router.post("/roles/revoke", complianceController.revokeRole);

module.exports = router;
