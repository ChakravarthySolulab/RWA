const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Load contract ABI from artifacts
const getContractABI = () => {
  const artifactPath = path.join(
    __dirname,
    "../../../artifacts/contracts/RWAToken.sol/RWAToken.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Contract artifact not found. Please compile the contract first with 'npx hardhat compile'"
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return artifact.abi;
};

// Initialize provider
const getProvider = () => {
  const rpcUrl = process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Initialize signer (for write operations)
const getSigner = () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set in environment variables");
  }

  const provider = getProvider();
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
};

// Get contract instance (read-only)
const getContract = () => {
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not set in environment variables");
  }

  const provider = getProvider();
  const abi = getContractABI();
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);
};

// Get contract instance with signer (for write operations)
const getContractWithSigner = () => {
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not set in environment variables");
  }

  const signer = getSigner();
  const abi = getContractABI();
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
};

// Verify signature from MetaMask
const verifySignature = (message, signature, expectedAddress) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

module.exports = {
  getProvider,
  getSigner,
  getContract,
  getContractWithSigner,
  getContractABI,
  verifySignature,
};
