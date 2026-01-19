const { getContract, getContractWithSigner } = require("../config/blockchain");
const { User } = require("../models");

// Add address to whitelist
const addToWhitelist = async (req, res) => {
  try {
    const { address } = req.body;

    const contract = getContractWithSigner();

    // Check if already whitelisted
    const isWhitelisted = await contract.isWhitelisted(address);
    if (isWhitelisted) {
      return res.status(400).json({
        success: false,
        error: "Address is already whitelisted",
      });
    }

    // Add to blockchain whitelist
    const tx = await contract.addToWhitelist(address);
    const receipt = await tx.wait();

    // Update user in database
    await User.findOneAndUpdate(
      { walletAddress: address.toLowerCase() },
      { isWhitelisted: true },
      { upsert: false }
    );

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        address,
        whitelisted: true,
      },
    });
  } catch (error) {
    console.error("Add to whitelist error:", error);

    let errorMessage = "Failed to add to whitelist";
    if (error.message.includes("AccessControlUnauthorizedAccount")) {
      errorMessage = "Unauthorized: Admin role required";
    } else if (error.message.includes("zero address")) {
      errorMessage = "Cannot whitelist zero address";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

// Remove address from whitelist
const removeFromWhitelist = async (req, res) => {
  try {
    const { address } = req.body;

    const contract = getContractWithSigner();

    // Check if whitelisted
    const isWhitelisted = await contract.isWhitelisted(address);
    if (!isWhitelisted) {
      return res.status(400).json({
        success: false,
        error: "Address is not whitelisted",
      });
    }

    // Remove from blockchain whitelist
    const tx = await contract.removeFromWhitelist(address);
    const receipt = await tx.wait();

    // Update user in database
    await User.findOneAndUpdate(
      { walletAddress: address.toLowerCase() },
      { isWhitelisted: false },
      { upsert: false }
    );

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        address,
        whitelisted: false,
      },
    });
  } catch (error) {
    console.error("Remove from whitelist error:", error);

    let errorMessage = "Failed to remove from whitelist";
    if (error.message.includes("AccessControlUnauthorizedAccount")) {
      errorMessage = "Unauthorized: Admin role required";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

// Batch add addresses to whitelist
const batchAddToWhitelist = async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Addresses must be a non-empty array",
      });
    }

    const contract = getContractWithSigner();

    // Batch add to blockchain
    const tx = await contract.batchAddToWhitelist(addresses);
    const receipt = await tx.wait();

    // Update users in database
    await User.updateMany(
      { walletAddress: { $in: addresses.map((a) => a.toLowerCase()) } },
      { isWhitelisted: true }
    );

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        addresses,
        count: addresses.length,
      },
    });
  } catch (error) {
    console.error("Batch whitelist error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to batch whitelist",
      details: error.message,
    });
  }
};

// Check if address is whitelisted
const checkWhitelist = async (req, res) => {
  try {
    const { address } = req.params;

    const contract = getContract();

    const isWhitelisted = await contract.isWhitelisted(address);

    res.json({
      success: true,
      data: {
        address,
        isWhitelisted,
      },
    });
  } catch (error) {
    console.error("Check whitelist error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check whitelist status",
      details: error.message,
    });
  }
};

module.exports = {
  addToWhitelist,
  removeFromWhitelist,
  batchAddToWhitelist,
  checkWhitelist,
};
