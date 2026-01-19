const express = require("express");
const router = express.Router();
const tokenController = require("../controllers/tokenController");
const { authenticate, requireRole } = require("../middleware/auth");
const {
  tokenValidation,
  handleValidationErrors,
} = require("../middleware/validate");

// Public routes
router.get("/info", tokenController.getTokenInfo);
router.get(
  "/balance/:address",
  tokenValidation.balance,
  handleValidationErrors,
  tokenController.getBalance
);

// Protected routes
router.use(authenticate);

// Mint tokens (issuer only)
router.post(
  "/mint",
  requireRole("admin", "issuer"),
  tokenValidation.mint,
  handleValidationErrors,
  tokenController.mint
);

// Burn tokens
router.post(
  "/burn",
  tokenValidation.burn,
  handleValidationErrors,
  tokenController.burn
);

// Transfer tokens
router.post("/transfer", tokenController.transfer);

module.exports = router;
