const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    nonce: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["investor", "admin", "issuer"],
      default: "investor",
    },
    isWhitelisted: {
      type: Boolean,
      default: false,
    },
    kycStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    profile: {
      name: String,
      email: String,
      phone: String,
      country: String,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Generate a random nonce for signature
userSchema.methods.generateNonce = function () {
  this.nonce = Math.floor(Math.random() * 1000000).toString();
  return this.nonce;
};

// Static method to find or create user by wallet address
userSchema.statics.findOrCreateByWallet = async function (walletAddress) {
  let user = await this.findOne({ walletAddress: walletAddress.toLowerCase() });

  if (!user) {
    user = new this({
      walletAddress: walletAddress.toLowerCase(),
      nonce: Math.floor(Math.random() * 1000000).toString(),
    });
    await user.save();
  }

  return user;
};

module.exports = mongoose.model("User", userSchema);
