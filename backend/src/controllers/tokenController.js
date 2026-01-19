const { ethers } = require("ethers");
const { getContract, getContractWithSigner } = require("../config/blockchain");

// Mint tokens
const mint = async (req, res) => {
  try {
    const { to, amount, reason } = req.body;

    const contract = getContractWithSigner();

    // Convert amount to wei (18 decimals)
    const amountWei = ethers.parseEther(amount.toString());

    // Send mint transaction
    const tx = await contract.mint(to, amountWei, reason || "Minted via API");

    // Wait for confirmation
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        to,
        amount: amount.toString(),
        reason: reason || "Minted via API",
      },
    });
  } catch (error) {
    console.error("Mint error:", error);

    // Parse common errors
    let errorMessage = "Failed to mint tokens";
    if (error.message.includes("recipient not whitelisted")) {
      errorMessage = "Recipient address is not whitelisted";
    } else if (error.message.includes("AccessControlUnauthorizedAccount")) {
      errorMessage = "Unauthorized: Issuer role required";
    } else if (error.message.includes("EnforcedPause")) {
      errorMessage = "Contract is paused";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

// Burn tokens
const burn = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const contract = getContractWithSigner();

    // Convert amount to wei (18 decimals)
    const amountWei = ethers.parseEther(amount.toString());

    // Send burn transaction
    const tx = await contract.burnWithReason(amountWei, reason || "Burned via API");

    // Wait for confirmation
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount: amount.toString(),
        reason: reason || "Burned via API",
      },
    });
  } catch (error) {
    console.error("Burn error:", error);

    let errorMessage = "Failed to burn tokens";
    if (error.message.includes("EnforcedPause")) {
      errorMessage = "Contract is paused";
    } else if (error.message.includes("ERC20InsufficientBalance")) {
      errorMessage = "Insufficient balance";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

// Get token balance
const getBalance = async (req, res) => {
  try {
    const { address } = req.params;

    const contract = getContract();

    const balanceWei = await contract.balanceOf(address);
    const balance = ethers.formatEther(balanceWei);

    res.json({
      success: true,
      data: {
        address,
        balance,
        balanceWei: balanceWei.toString(),
      },
    });
  } catch (error) {
    console.error("Get balance error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get balance",
      details: error.message,
    });
  }
};

// Get token info
const getTokenInfo = async (req, res) => {
  try {
    const contract = getContract();

    const [name, symbol, totalSupply, paused, metadata] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
      contract.paused(),
      contract.getAssetMetadata(),
    ]);

    res.json({
      success: true,
      data: {
        name,
        symbol,
        totalSupply: ethers.formatEther(totalSupply),
        totalSupplyWei: totalSupply.toString(),
        paused,
        metadata: {
          commodityType: metadata.commodityType,
          unit: metadata.unit,
          totalQuantity: metadata.totalQuantity.toString(),
          storageLocation: metadata.storageLocation,
          certificationHash: metadata.certificationHash,
          createdAt: new Date(Number(metadata.createdAt) * 1000).toISOString(),
          updatedAt: new Date(Number(metadata.updatedAt) * 1000).toISOString(),
        },
        contractAddress: process.env.CONTRACT_ADDRESS,
      },
    });
  } catch (error) {
    console.error("Get token info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get token info",
      details: error.message,
    });
  }
};

// Transfer tokens
const transfer = async (req, res) => {
  try {
    const { to, amount } = req.body;

    const contract = getContractWithSigner();

    const amountWei = ethers.parseEther(amount.toString());

    const tx = await contract.transfer(to, amountWei);
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        to,
        amount: amount.toString(),
      },
    });
  } catch (error) {
    console.error("Transfer error:", error);

    let errorMessage = "Failed to transfer tokens";
    if (error.message.includes("sender not whitelisted")) {
      errorMessage = "Sender address is not whitelisted";
    } else if (error.message.includes("recipient not whitelisted")) {
      errorMessage = "Recipient address is not whitelisted";
    } else if (error.message.includes("EnforcedPause")) {
      errorMessage = "Contract is paused";
    } else if (error.message.includes("ERC20InsufficientBalance")) {
      errorMessage = "Insufficient balance";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

module.exports = {
  mint,
  burn,
  getBalance,
  getTokenInfo,
  transfer,
};
