const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "certificate",
      "audit_report",
      "insurance",
      "ownership_deed",
      "quality_report",
      "other",
    ],
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  url: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const assetSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    commodityType: {
      type: String,
      enum: ["GOLD", "SILVER", "PLATINUM", "PALLADIUM", "OIL", "GAS", "OTHER"],
      required: true,
    },

    // Physical Attributes
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["oz", "g", "kg", "barrel", "ton", "liter"],
      required: true,
    },
    purity: {
      type: String,
    },
    grade: {
      type: String,
    },

    // Valuation
    pricePerUnit: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    totalValue: {
      type: Number,
    },
    lastValuationDate: {
      type: Date,
    },

    // Storage Information
    storageLocation: {
      facility: String,
      address: String,
      city: String,
      country: String,
    },
    custodian: {
      name: String,
      contact: String,
      licenseNumber: String,
    },

    // Tokenization
    isTokenized: {
      type: Boolean,
      default: false,
    },
    tokenSymbol: {
      type: String,
    },
    totalTokens: {
      type: Number,
    },
    tokensPerUnit: {
      type: Number,
    },

    // Verification
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },

    // Documents
    documents: [documentSchema],
    certificationHash: {
      type: String,
    },

    // Ownership
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Blockchain reference
    contractAddress: {
      type: String,
    },
    creationTxHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total value before save
assetSchema.pre("save", function (next) {
  if (this.quantity && this.pricePerUnit) {
    this.totalValue = this.quantity * this.pricePerUnit;
  }
  next();
});

// Index for searching
assetSchema.index({ commodityType: 1, verificationStatus: 1 });
assetSchema.index({ owner: 1 });

module.exports = mongoose.model("Asset", assetSchema);
