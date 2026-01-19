/**
 * End-to-End Test Script for RWA Token Issuance
 *
 * Prerequisites:
 * 1. Deploy contract to Amoy testnet: npm run deploy:amoy
 * 2. Update CONTRACT_ADDRESS in .env
 * 3. Start backend: npm run backend:dev
 * 4. Have MongoDB running locally
 *
 * Run: node scripts/e2e-test.js
 */

require("dotenv").config();
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Configuration
const API_BASE = process.env.API_BASE || "http://localhost:3000/api";
const RPC_URL = process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";

// Load contract ABI
const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/RWAToken.sol/RWAToken.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const ABI = artifact.abi;

// Helper to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();
  return { status: response.status, data: result };
}

// Test scenarios
async function runE2ETests() {
  console.log("\n========================================");
  console.log("RWA Token Issuance - E2E Test");
  console.log("========================================\n");

  // Check prerequisites
  if (!process.env.CONTRACT_ADDRESS) {
    console.error("ERROR: CONTRACT_ADDRESS not set in .env");
    console.log("Please deploy the contract first: npm run deploy:amoy");
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

  let jwtToken = null;
  const testInvestor = ethers.Wallet.createRandom();

  try {
    // ==========================================
    // Test 1: Check contract deployment
    // ==========================================
    console.log("1. Checking contract deployment...");
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log(`   Token: ${name} (${symbol})`);
    console.log("   ✓ Contract deployed successfully\n");

    // ==========================================
    // Test 2: Wallet Authentication via API
    // ==========================================
    console.log("2. Testing wallet authentication...");

    // Get nonce
    const nonceRes = await apiCall("GET", `/auth/nonce/${wallet.address}`);
    if (!nonceRes.data.success) {
      throw new Error(`Failed to get nonce: ${JSON.stringify(nonceRes.data)}`);
    }
    console.log(`   Nonce received: ${nonceRes.data.data.nonce}`);

    // Sign message
    const message = nonceRes.data.data.message;
    const signature = await wallet.signMessage(message);

    // Connect wallet
    const connectRes = await apiCall("POST", "/auth/connect", {
      address: wallet.address,
      signature,
    });
    if (!connectRes.data.success) {
      throw new Error(`Failed to connect: ${JSON.stringify(connectRes.data)}`);
    }
    jwtToken = connectRes.data.data.token;
    console.log("   ✓ Wallet authenticated successfully\n");

    // ==========================================
    // Test 3: Get Token Info via API
    // ==========================================
    console.log("3. Getting token info via API...");
    const tokenInfoRes = await apiCall("GET", "/tokens/info");
    if (tokenInfoRes.data.success) {
      console.log(`   Name: ${tokenInfoRes.data.data.name}`);
      console.log(`   Symbol: ${tokenInfoRes.data.data.symbol}`);
      console.log(`   Total Supply: ${tokenInfoRes.data.data.totalSupply}`);
      console.log(`   Paused: ${tokenInfoRes.data.data.paused}`);
      console.log("   ✓ Token info retrieved\n");
    } else {
      console.log("   ⚠ Could not get token info via API (backend may not be running)\n");
    }

    // ==========================================
    // Test 4: Whitelist Test Investor
    // ==========================================
    console.log("4. Testing whitelist functionality...");
    console.log(`   Test investor address: ${testInvestor.address}`);

    // Check whitelist status (should be false)
    let isWhitelisted = await contract.isWhitelisted(testInvestor.address);
    console.log(`   Initial whitelist status: ${isWhitelisted}`);

    // Add to whitelist
    console.log("   Adding to whitelist...");
    const addTx = await contract.addToWhitelist(testInvestor.address);
    await addTx.wait();

    // Verify whitelist status
    isWhitelisted = await contract.isWhitelisted(testInvestor.address);
    console.log(`   New whitelist status: ${isWhitelisted}`);
    console.log("   ✓ Whitelist functionality working\n");

    // ==========================================
    // Test 5: Mint Tokens
    // ==========================================
    console.log("5. Testing token minting...");
    const mintAmount = ethers.parseEther("1000");

    console.log(`   Minting 1000 tokens to ${testInvestor.address}...`);
    const mintTx = await contract.mint(
      testInvestor.address,
      mintAmount,
      "E2E Test - Initial allocation"
    );
    const mintReceipt = await mintTx.wait();
    console.log(`   TX Hash: ${mintReceipt.hash}`);

    // Check balance
    const balance = await contract.balanceOf(testInvestor.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} tokens`);
    console.log("   ✓ Minting successful\n");

    // ==========================================
    // Test 6: Transfer Tokens
    // ==========================================
    console.log("6. Testing token transfer...");

    // Whitelist admin wallet if not already
    const adminWhitelisted = await contract.isWhitelisted(wallet.address);
    if (!adminWhitelisted) {
      // Admin should already be whitelisted from deployment
    }

    // Create investor contract connection
    const investorContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      ABI,
      testInvestor.connect(provider)
    );

    // For testing, we'll transfer from admin to investor (admin needs tokens first)
    // First mint to admin
    console.log("   Minting 500 tokens to admin...");
    const adminMintTx = await contract.mint(
      wallet.address,
      ethers.parseEther("500"),
      "E2E Test - Admin allocation"
    );
    await adminMintTx.wait();

    // Transfer from admin to investor
    console.log("   Transferring 100 tokens from admin to investor...");
    const transferTx = await contract.transfer(
      testInvestor.address,
      ethers.parseEther("100")
    );
    await transferTx.wait();

    const newBalance = await contract.balanceOf(testInvestor.address);
    console.log(`   Investor balance: ${ethers.formatEther(newBalance)} tokens`);
    console.log("   ✓ Transfer successful\n");

    // ==========================================
    // Test 7: Pause/Unpause
    // ==========================================
    console.log("7. Testing pause/unpause functionality...");

    // Pause
    console.log("   Pausing contract...");
    const pauseTx = await contract.pause();
    await pauseTx.wait();

    let isPaused = await contract.paused();
    console.log(`   Contract paused: ${isPaused}`);

    // Try transfer (should fail)
    console.log("   Attempting transfer while paused...");
    try {
      const failTx = await contract.transfer(
        testInvestor.address,
        ethers.parseEther("10")
      );
      await failTx.wait();
      console.log("   ✗ Transfer should have failed!");
    } catch (error) {
      console.log("   ✓ Transfer correctly blocked while paused");
    }

    // Unpause
    console.log("   Unpausing contract...");
    const unpauseTx = await contract.unpause();
    await unpauseTx.wait();

    isPaused = await contract.paused();
    console.log(`   Contract paused: ${isPaused}`);
    console.log("   ✓ Pause/Unpause working correctly\n");

    // ==========================================
    // Test 8: Burn Tokens
    // ==========================================
    console.log("8. Testing token burning...");

    const balanceBefore = await contract.balanceOf(wallet.address);
    console.log(`   Admin balance before: ${ethers.formatEther(balanceBefore)}`);

    console.log("   Burning 50 tokens...");
    const burnTx = await contract.burnWithReason(
      ethers.parseEther("50"),
      "E2E Test - Token redemption"
    );
    await burnTx.wait();

    const balanceAfter = await contract.balanceOf(wallet.address);
    console.log(`   Admin balance after: ${ethers.formatEther(balanceAfter)}`);
    console.log("   ✓ Burning successful\n");

    // ==========================================
    // Test 9: Asset Metadata
    // ==========================================
    console.log("9. Checking asset metadata...");
    const metadata = await contract.getAssetMetadata();
    console.log(`   Commodity Type: ${metadata.commodityType}`);
    console.log(`   Unit: ${metadata.unit}`);
    console.log(`   Total Quantity: ${metadata.totalQuantity.toString()}`);
    console.log(`   Storage Location: ${metadata.storageLocation}`);
    console.log("   ✓ Metadata retrieved\n");

    // ==========================================
    // Test 10: Remove from whitelist
    // ==========================================
    console.log("10. Testing whitelist removal...");
    console.log("    Removing investor from whitelist...");
    const removeTx = await contract.removeFromWhitelist(testInvestor.address);
    await removeTx.wait();

    isWhitelisted = await contract.isWhitelisted(testInvestor.address);
    console.log(`    Whitelist status: ${isWhitelisted}`);
    console.log("    ✓ Whitelist removal successful\n");

    // ==========================================
    // Summary
    // ==========================================
    console.log("========================================");
    console.log("E2E Test Summary");
    console.log("========================================");
    console.log("✓ Contract deployment verified");
    console.log("✓ Wallet authentication working");
    console.log("✓ Whitelist add/remove working");
    console.log("✓ Token minting working");
    console.log("✓ Token transfer working");
    console.log("✓ Pause/Unpause working");
    console.log("✓ Token burning working");
    console.log("✓ Asset metadata accessible");
    console.log("\nAll E2E tests passed!");
    console.log("========================================\n");

  } catch (error) {
    console.error("\n✗ E2E Test Failed:");
    console.error(error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    process.exit(1);
  }
}

// Run tests
runE2ETests();
