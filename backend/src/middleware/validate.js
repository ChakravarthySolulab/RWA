const { validationResult, body, param, query } = require("express-validator");
const { ethers } = require("ethers");

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// Custom validator for Ethereum addresses
const isEthAddress = (value) => {
  return ethers.isAddress(value);
};

// Auth validation rules
const authValidation = {
  getNonce: [
    param("address")
      .custom(isEthAddress)
      .withMessage("Invalid Ethereum address"),
  ],
  connect: [
    body("address")
      .custom(isEthAddress)
      .withMessage("Invalid Ethereum address"),
    body("signature")
      .isString()
      .notEmpty()
      .withMessage("Signature is required"),
  ],
};

// Asset validation rules
const assetValidation = {
  create: [
    body("name").isString().notEmpty().withMessage("Asset name is required"),
    body("commodityType")
      .isIn(["GOLD", "SILVER", "PLATINUM", "PALLADIUM", "OIL", "GAS", "OTHER"])
      .withMessage("Invalid commodity type"),
    body("quantity")
      .isFloat({ min: 0.001 })
      .withMessage("Quantity must be greater than 0"),
    body("unit")
      .isIn(["oz", "g", "kg", "barrel", "ton", "liter"])
      .withMessage("Invalid unit"),
    body("pricePerUnit")
      .isFloat({ min: 0 })
      .withMessage("Price per unit must be non-negative"),
  ],
  verify: [
    param("id").isMongoId().withMessage("Invalid asset ID"),
    body("status")
      .isIn(["verified", "rejected"])
      .withMessage("Status must be verified or rejected"),
    body("rejectionReason")
      .if(body("status").equals("rejected"))
      .notEmpty()
      .withMessage("Rejection reason is required when rejecting"),
  ],
};

// Token validation rules
const tokenValidation = {
  mint: [
    body("to").custom(isEthAddress).withMessage("Invalid recipient address"),
    body("amount")
      .isFloat({ min: 0.000001 })
      .withMessage("Amount must be greater than 0"),
    body("reason").optional().isString(),
  ],
  burn: [
    body("amount")
      .isFloat({ min: 0.000001 })
      .withMessage("Amount must be greater than 0"),
    body("reason").optional().isString(),
  ],
  balance: [
    param("address")
      .custom(isEthAddress)
      .withMessage("Invalid Ethereum address"),
  ],
};

// Whitelist validation rules
const whitelistValidation = {
  add: [
    body("address")
      .custom(isEthAddress)
      .withMessage("Invalid Ethereum address"),
  ],
  remove: [
    body("address")
      .custom(isEthAddress)
      .withMessage("Invalid Ethereum address"),
  ],
  check: [
    param("address")
      .custom(isEthAddress)
      .withMessage("Invalid Ethereum address"),
  ],
};

module.exports = {
  handleValidationErrors,
  authValidation,
  assetValidation,
  tokenValidation,
  whitelistValidation,
};
