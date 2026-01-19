const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Transaction identification
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    blockNumber: {
      type: Number,
      required: true,
    },
    blockTimestamp: {
      type: Date,
    },

    // Event type
    eventType: {
      type: String,
      enum: [
        "Transfer",
        "Mint",
        "Burn",
        "WhitelistUpdated",
        "Paused",
        "Unpaused",
        "RoleGranted",
        "RoleRevoked",
        "AssetMetadataUpdated",
      ],
      required: true,
    },

    // Addresses involved
    from: {
      type: String,
      lowercase: true,
    },
    to: {
      type: String,
      lowercase: true,
    },

    // Token details
    amount: {
      type: String,
    },
    amountFormatted: {
      type: Number,
    },

    // Whitelist specific
    whitelistStatus: {
      type: Boolean,
    },

    // Role specific
    role: {
      type: String,
    },
    account: {
      type: String,
      lowercase: true,
    },

    // Additional data
    reason: {
      type: String,
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Processing status
    processed: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
transactionSchema.index({ eventType: 1, createdAt: -1 });
transactionSchema.index({ from: 1, createdAt: -1 });
transactionSchema.index({ to: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
