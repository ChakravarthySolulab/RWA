require("dotenv").config({ path: "../.env" });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/database");
const eventSync = require("./services/eventSync");

// Import routes
const authRoutes = require("./routes/authRoutes");
const assetRoutes = require("./routes/assetRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const whitelistRoutes = require("./routes/whitelistRoutes");
const complianceRoutes = require("./routes/complianceRoutes");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
};
app.use(cors(corsOptions));

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/whitelist", whitelistRoutes);
app.use("/api/compliance", complianceRoutes);

// API info
app.get("/api", (req, res) => {
  res.json({
    name: "RWA Commodities Tokenization API",
    version: "1.0.0",
    endpoints: {
      auth: {
        "GET /api/auth/nonce/:address": "Get nonce for wallet signing",
        "POST /api/auth/connect": "Connect wallet with signature",
        "GET /api/auth/profile": "Get user profile (authenticated)",
        "PUT /api/auth/profile": "Update user profile (authenticated)",
      },
      assets: {
        "POST /api/assets": "Create new asset",
        "GET /api/assets": "List all assets",
        "GET /api/assets/:id": "Get asset by ID",
        "PUT /api/assets/:id": "Update asset",
        "DELETE /api/assets/:id": "Delete asset",
        "PUT /api/assets/:id/verify": "Verify asset (admin)",
        "POST /api/assets/:id/documents": "Add document to asset",
      },
      tokens: {
        "GET /api/tokens/info": "Get token information",
        "GET /api/tokens/balance/:address": "Get token balance",
        "POST /api/tokens/mint": "Mint tokens (issuer)",
        "POST /api/tokens/burn": "Burn tokens",
        "POST /api/tokens/transfer": "Transfer tokens",
      },
      whitelist: {
        "GET /api/whitelist/:address": "Check whitelist status",
        "POST /api/whitelist/add": "Add to whitelist (admin)",
        "POST /api/whitelist/remove": "Remove from whitelist (admin)",
        "POST /api/whitelist/batch": "Batch add to whitelist (admin)",
      },
      compliance: {
        "GET /api/compliance/status": "Get contract pause status",
        "POST /api/compliance/pause": "Pause contract (admin)",
        "POST /api/compliance/unpause": "Unpause contract (admin)",
        "POST /api/compliance/roles/grant": "Grant role (admin)",
        "POST /api/compliance/roles/revoke": "Revoke role (admin)",
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the server
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`RWA Backend Server`);
      console.log(`========================================`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Port: ${PORT}`);
      console.log(`API Docs: http://localhost:${PORT}/api`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`========================================\n`);
    });

    // Start blockchain event sync if contract is configured
    if (process.env.CONTRACT_ADDRESS) {
      console.log("Starting blockchain event sync...");
      await eventSync.startListening();
    } else {
      console.log("CONTRACT_ADDRESS not set - event sync disabled");
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
