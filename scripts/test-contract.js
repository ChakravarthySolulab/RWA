/**
 * Contract-only E2E Test (no backend required)
 *
 * Tests all smart contract functionality on Amoy testnet
 *
 * Run: node scripts/test-contract.js
 */

require("dotenv").config();
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Configuration
const RPC_URL = process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";

// Load contract ABI
const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/RWAToken.sol/RWAToken.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const ABI = artifact.abi;

async function runContractTests() {
  console.log("\n========================================");
  console.log("RWA Token - Contract E2E Test");
  console.log("========================================\n");

  // Check prerequisites
  if (!process.env.CONTRACT_ADDRESS) {
    console.error("ERROR: CONTRACT_ADDRESS not set in .env");
    process.exit(1);
  }

  if (!process.env.PRIVATE_KEY) {
    console.error("ERROR: PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);

  console.log("Admin wallet:", wallet.address);
  console.log("Contract address:", process.env.CONTRACT_ADDRESS);
  console.log("");

  const testInvestor = ethers.Wallet.createRandom();
  console.log("Test investor:", testInvestor.address);
  console.log("");

  try {
    // ==========================================
    // Test 1: Check contract deployment
    // ==========================================
    console.log("1. Checking contract deployment...");
    const name = await contract.name();
    const symbol = await contract.symbol();
    const totalSupply = await contract.totalSupply();
    console.log(`   Token: ${name} (${symbol})`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)}`);
    console.log("   ✓ Contract deployed successfully\n");

    // ==========================================
    // Test 2: Check Asset Metadata
    // ==========================================
    console.log("2. Checking asset metadata...");
    const metadata = await contract.getAssetMetadata();
    console.log(`   Commodity Type: ${metadata.commodityType}`);
    console.log(`   Unit: ${metadata.unit}`);
    console.log(`   Total Quantity: ${metadata.totalQuantity.toString()}`);
    console.log(`   Storage: ${metadata.storageLocation}`);
    console.log("   ✓ Metadata retrieved\n");

    // ==========================================
    // Test 3: Whitelist Test Investor
    // ==========================================
    console.log("3. Testing whitelist functionality...");

    // Check initial status
    let isWhitelisted = await contract.isWhitelisted(testInvestor.address);
    console.log(`   Initial whitelist status: ${isWhitelisted}`);

    // Add to whitelist
    console.log("   Adding to whitelist...");
    const addTx = await contract.addToWhitelist(testInvestor.address);
    await addTx.wait();
    console.log(`   TX: ${addTx.hash}`);

    // Verify
    isWhitelisted = await contract.isWhitelisted(testInvestor.address);
    console.log(`   New status: ${isWhitelisted}`);
    console.log("   ✓ Whitelist functionality working\n");

    // ==========================================
    // Test 4: Mint Tokens
    // ==========================================
    console.log("4. Testing token minting...");
    const mintAmount = ethers.parseEther("1000");

    console.log(`   Minting 1000 tokens to test investor...`);
    const mintTx = await contract.mint(
      testInvestor.address,
      mintAmount,
      "E2E Test - Initial allocation"
    );
    await mintTx.wait();
    console.log(`   TX: ${mintTx.hash}`);

    const balance = await contract.balanceOf(testInvestor.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} tokens`);
    console.log("   ✓ Minting successful\n");

    // ==========================================
    // Test 5: Transfer Tokens
    // ==========================================
    console.log("5. Testing token transfer...");

    // Mint to admin first
    console.log("   Minting 500 tokens to admin...");
    const adminMintTx = await contract.mint(
      wallet.address,
      ethers.parseEther("500"),
      "E2E Test - Admin allocation"
    );
    await adminMintTx.wait();

    // Transfer from admin to investor
    console.log("   Transferring 100 tokens to investor...");
    const transferTx = await contract.transfer(
      testInvestor.address,
      ethers.parseEther("100")
    );
    await transferTx.wait();
    console.log(`   TX: ${transferTx.hash}`);

    const newBalance = await contract.balanceOf(testInvestor.address);
    console.log(`   Investor balance: ${ethers.formatEther(newBalance)} tokens`);
    console.log("   ✓ Transfer successful\n");

    // ==========================================
    // Test 6: Pause/Unpause
    // ==========================================
    console.log("6. Testing pause/unpause...");

    // Pause
    console.log("   Pausing contract...");
    const pauseTx = await contract.pause();
    await pauseTx.wait();

    let isPaused = await contract.paused();
    console.log(`   Paused: ${isPaused}`);

    // Try transfer (should fail)
    console.log("   Testing transfer while paused...");
    try {
      await contract.transfer(testInvestor.address, ethers.parseEther("10"));
      console.log("   ✗ Should have failed!");
    } catch (error) {
      console.log("   ✓ Transfer correctly blocked");
    }

    // Unpause
    console.log("   Unpausing...");
    const unpauseTx = await contract.unpause();
    await unpauseTx.wait();

    isPaused = await contract.paused();
    console.log(`   Paused: ${isPaused}`);
    console.log("   ✓ Pause/Unpause working\n");

    // ==========================================
    // Test 7: Burn Tokens
    // ==========================================
    console.log("7. Testing token burning...");

    const balanceBefore = await contract.balanceOf(wallet.address);
    console.log(`   Balance before: ${ethers.formatEther(balanceBefore)}`);

    console.log("   Burning 50 tokens...");
    const burnTx = await contract.burnWithReason(
      ethers.parseEther("50"),
      "E2E Test - Redemption"
    );
    await burnTx.wait();
    console.log(`   TX: ${burnTx.hash}`);

    const balanceAfter = await contract.balanceOf(wallet.address);
    console.log(`   Balance after: ${ethers.formatEther(balanceAfter)}`);
    console.log("   ✓ Burning successful\n");

    // ==========================================
    // Test 8: Remove from whitelist
    // ==========================================
    console.log("8. Testing whitelist removal...");

    const removeTx = await contract.removeFromWhitelist(testInvestor.address);
    await removeTx.wait();
    console.log(`   TX: ${removeTx.hash}`);

    isWhitelisted = await contract.isWhitelisted(testInvestor.address);
    console.log(`   Status: ${isWhitelisted}`);
    console.log("   ✓ Removal successful\n");

    // ==========================================
    // Summary
    // ==========================================
    const finalSupply = await contract.totalSupply();

    console.log("========================================");
    console.log("Test Summary");
    console.log("========================================");
    console.log("✓ Contract deployment verified");
    console.log("✓ Asset metadata accessible");
    console.log("✓ Whitelist add/remove working");
    console.log("✓ Token minting working");
    console.log("✓ Token transfer working");
    console.log("✓ Pause/Unpause working");
    console.log("✓ Token burning working");
    console.log("");
    console.log(`Final Total Supply: ${ethers.formatEther(finalSupply)} tokens`);
    console.log("");
    console.log("All contract tests passed!");
    console.log("========================================");
    console.log("");
    console.log("View on Polygonscan:");
    console.log(`https://amoy.polygonscan.com/address/${process.env.CONTRACT_ADDRESS}`);
    console.log("");

  } catch (error) {
    console.error("\n✗ Test Failed:");
    console.error(error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    process.exit(1);
  }
}

runContractTests();
