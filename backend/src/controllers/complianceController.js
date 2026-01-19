const { getContract, getContractWithSigner } = require("../config/blockchain");

// Pause contract
const pause = async (req, res) => {
  try {
    const contract = getContractWithSigner();

    // Check if already paused
    const isPaused = await contract.paused();
    if (isPaused) {
      return res.status(400).json({
        success: false,
        error: "Contract is already paused",
      });
    }

    // Pause the contract
    const tx = await contract.pause();
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        paused: true,
        message: "Contract has been paused. All transfers are now blocked.",
      },
    });
  } catch (error) {
    console.error("Pause error:", error);

    let errorMessage = "Failed to pause contract";
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

// Unpause contract
const unpause = async (req, res) => {
  try {
    const contract = getContractWithSigner();

    // Check if already unpaused
    const isPaused = await contract.paused();
    if (!isPaused) {
      return res.status(400).json({
        success: false,
        error: "Contract is not paused",
      });
    }

    // Unpause the contract
    const tx = await contract.unpause();
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        paused: false,
        message: "Contract has been unpaused. Transfers are now enabled.",
      },
    });
  } catch (error) {
    console.error("Unpause error:", error);

    let errorMessage = "Failed to unpause contract";
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

// Get contract pause status
const getStatus = async (req, res) => {
  try {
    const contract = getContract();

    const isPaused = await contract.paused();

    res.json({
      success: true,
      data: {
        paused: isPaused,
        status: isPaused ? "paused" : "active",
        message: isPaused
          ? "Contract is paused. All transfers are blocked."
          : "Contract is active. Transfers are enabled.",
      },
    });
  } catch (error) {
    console.error("Get status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get contract status",
      details: error.message,
    });
  }
};

// Grant role
const grantRole = async (req, res) => {
  try {
    const { role, address } = req.body;

    const contract = getContractWithSigner();

    let tx;
    if (role === "issuer") {
      tx = await contract.grantIssuerRole(address);
    } else if (role === "admin") {
      tx = await contract.grantAdminRole(address);
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid role. Must be 'issuer' or 'admin'",
      });
    }

    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        role,
        address,
        granted: true,
      },
    });
  } catch (error) {
    console.error("Grant role error:", error);

    let errorMessage = "Failed to grant role";
    if (error.message.includes("AccessControlUnauthorizedAccount")) {
      errorMessage = "Unauthorized: DEFAULT_ADMIN_ROLE required";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

// Revoke role
const revokeRole = async (req, res) => {
  try {
    const { role, address } = req.body;

    const contract = getContractWithSigner();

    let tx;
    if (role === "issuer") {
      tx = await contract.revokeIssuerRole(address);
    } else if (role === "admin") {
      tx = await contract.revokeAdminRole(address);
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid role. Must be 'issuer' or 'admin'",
      });
    }

    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        role,
        address,
        revoked: true,
      },
    });
  } catch (error) {
    console.error("Revoke role error:", error);

    let errorMessage = "Failed to revoke role";
    if (error.message.includes("AccessControlUnauthorizedAccount")) {
      errorMessage = "Unauthorized: DEFAULT_ADMIN_ROLE required";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

module.exports = {
  pause,
  unpause,
  getStatus,
  grantRole,
  revokeRole,
};
