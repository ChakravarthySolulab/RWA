const hre = require("hardhat");

async function main() {
  console.log("Deploying RWAToken to", hre.network.name, "...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Token configuration
  const tokenConfig = {
    name: "Gold Commodity Token",
    symbol: "GLDT",
    commodityType: "GOLD",
    unit: "oz",
    totalQuantity: 10000, // 10,000 oz of gold
    storageLocation: "Secure Vault, London, UK",
    certificationHash: "QmInitialCertificationHashPlaceholder",
  };

  console.log("Token Configuration:");
  console.log("  Name:", tokenConfig.name);
  console.log("  Symbol:", tokenConfig.symbol);
  console.log("  Commodity Type:", tokenConfig.commodityType);
  console.log("  Unit:", tokenConfig.unit);
  console.log("  Total Quantity:", tokenConfig.totalQuantity);
  console.log("  Storage Location:", tokenConfig.storageLocation);
  console.log("  Certification Hash:", tokenConfig.certificationHash);
  console.log("");

  // Deploy the contract
  const RWAToken = await hre.ethers.getContractFactory("RWAToken");
  const token = await RWAToken.deploy(
    tokenConfig.name,
    tokenConfig.symbol,
    tokenConfig.commodityType,
    tokenConfig.unit,
    tokenConfig.totalQuantity,
    tokenConfig.storageLocation,
    tokenConfig.certificationHash
  );

  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  console.log("RWAToken deployed to:", contractAddress);

  // Verify roles
  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
  const ADMIN_ROLE = await token.ADMIN_ROLE();
  const ISSUER_ROLE = await token.ISSUER_ROLE();

  console.log("\nRoles verified:");
  console.log(
    "  DEFAULT_ADMIN_ROLE:",
    await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)
  );
  console.log(
    "  ADMIN_ROLE:",
    await token.hasRole(ADMIN_ROLE, deployer.address)
  );
  console.log(
    "  ISSUER_ROLE:",
    await token.hasRole(ISSUER_ROLE, deployer.address)
  );

  console.log("\nDeployer whitelisted:", await token.isWhitelisted(deployer.address));

  // Output for .env file
  console.log("\n========================================");
  console.log("Add to your .env file:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log("========================================\n");

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("To verify the contract on Polygonscan, run:");
    console.log(
      `npx hardhat verify --network ${hre.network.name} ${contractAddress} "${tokenConfig.name}" "${tokenConfig.symbol}" "${tokenConfig.commodityType}" "${tokenConfig.unit}" ${tokenConfig.totalQuantity} "${tokenConfig.storageLocation}" "${tokenConfig.certificationHash}"`
    );
  }

  return { token, contractAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
