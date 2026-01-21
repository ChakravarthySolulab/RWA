/**
 * Generate Signature for API Authentication
 *
 * Usage: node scripts/generate-signature.js <nonce>
 *
 * This script signs the authentication message with your private key
 * and outputs the signature to use with /api/auth/connect
 */

require("dotenv").config();
const { ethers } = require("ethers");

async function generateSignature() {
  const nonce = process.argv[2];

  if (!nonce) {
    console.log("Usage: node scripts/generate-signature.js <nonce>");
    console.log("Example: node scripts/generate-signature.js 704355");
    process.exit(1);
  }

  if (!process.env.PRIVATE_KEY) {
    console.error("PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const message = `Sign this message to authenticate with RWA Platform. Nonce: ${nonce}`;

  console.log("\n========================================");
  console.log("Signature Generator");
  console.log("========================================\n");
  console.log("Wallet Address:", wallet.address);
  console.log("Message:", message);
  console.log("");

  const signature = await wallet.signMessage(message);

  console.log("Signature:", signature);
  console.log("");
  console.log("========================================");
  console.log("Postman Request Body (copy this):");
  console.log("========================================");
  console.log(JSON.stringify({
    address: wallet.address,
    signature: signature
  }, null, 2));
  console.log("");
  console.log("========================================");
  console.log("cURL Command:");
  console.log("========================================");
  console.log(`curl -X POST http://localhost:3000/api/auth/connect \\
  -H "Content-Type: application/json" \\
  -d '{"address":"${wallet.address}","signature":"${signature}"}'`);
  console.log("");
}

generateSignature().catch(console.error);
