const { ethers } = require("ethers");
const { getContract, getProvider } = require("../config/blockchain");
const { Transaction, User } = require("../models");

class EventSyncService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.isRunning = false;
    this.lastProcessedBlock = 0;
  }

  async initialize() {
    try {
      this.provider = getProvider();
      this.contract = getContract();

      // Get current block number
      this.lastProcessedBlock = await this.provider.getBlockNumber();
      console.log(`Event sync initialized at block ${this.lastProcessedBlock}`);

      return true;
    } catch (error) {
      console.error("Failed to initialize event sync:", error.message);
      return false;
    }
  }

  // Start listening for events
  async startListening() {
    if (this.isRunning) {
      console.log("Event sync is already running");
      return;
    }

    if (!this.contract) {
      const initialized = await this.initialize();
      if (!initialized) {
        console.error("Cannot start event sync - initialization failed");
        return;
      }
    }

    this.isRunning = true;
    console.log("Starting blockchain event listeners...");

    // Listen for Transfer events
    this.contract.on("Transfer", async (from, to, value, event) => {
      await this.processTransferEvent(from, to, value, event);
    });

    // Listen for TokensMinted events
    this.contract.on("TokensMinted", async (to, amount, reason, event) => {
      await this.processMintEvent(to, amount, reason, event);
    });

    // Listen for TokensBurned events
    this.contract.on("TokensBurned", async (from, amount, reason, event) => {
      await this.processBurnEvent(from, amount, reason, event);
    });

    // Listen for WhitelistUpdated events
    this.contract.on("WhitelistUpdated", async (account, status, event) => {
      await this.processWhitelistEvent(account, status, event);
    });

    // Listen for Paused event
    this.contract.on("Paused", async (account, event) => {
      await this.processPauseEvent(account, true, event);
    });

    // Listen for Unpaused event
    this.contract.on("Unpaused", async (account, event) => {
      await this.processPauseEvent(account, false, event);
    });

    // Listen for RoleGranted events
    this.contract.on("RoleGranted", async (role, account, sender, event) => {
      await this.processRoleEvent(role, account, sender, true, event);
    });

    // Listen for RoleRevoked events
    this.contract.on("RoleRevoked", async (role, account, sender, event) => {
      await this.processRoleEvent(role, account, sender, false, event);
    });

    // Listen for AssetMetadataUpdated events
    this.contract.on(
      "AssetMetadataUpdated",
      async (commodityType, unit, totalQuantity, storageLocation, certificationHash, event) => {
        await this.processMetadataEvent(
          commodityType,
          unit,
          totalQuantity,
          storageLocation,
          certificationHash,
          event
        );
      }
    );

    console.log("Event listeners started successfully");
  }

  // Stop listening for events
  stopListening() {
    if (this.contract) {
      this.contract.removeAllListeners();
      console.log("Event listeners stopped");
    }
    this.isRunning = false;
  }

  // Process Transfer event
  async processTransferEvent(from, to, value, event) {
    try {
      const txHash = event.log.transactionHash;

      // Check if already processed
      const exists = await Transaction.findOne({ txHash });
      if (exists) return;

      const block = await this.provider.getBlock(event.log.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.log.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        eventType: "Transfer",
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        amount: value.toString(),
        amountFormatted: parseFloat(ethers.formatEther(value)),
        rawData: {
          from,
          to,
          value: value.toString(),
        },
      });

      console.log(`Transfer event processed: ${txHash}`);
    } catch (error) {
      console.error("Error processing transfer event:", error);
    }
  }

  // Process Mint event
  async processMintEvent(to, amount, reason, event) {
    try {
      const txHash = event.log.transactionHash;

      const exists = await Transaction.findOne({ txHash, eventType: "Mint" });
      if (exists) return;

      const block = await this.provider.getBlock(event.log.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.log.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        eventType: "Mint",
        to: to.toLowerCase(),
        amount: amount.toString(),
        amountFormatted: parseFloat(ethers.formatEther(amount)),
        reason,
        rawData: { to, amount: amount.toString(), reason },
      });

      console.log(`Mint event processed: ${txHash}`);
    } catch (error) {
      console.error("Error processing mint event:", error);
    }
  }

  // Process Burn event
  async processBurnEvent(from, amount, reason, event) {
    try {
      const txHash = event.log.transactionHash;

      const exists = await Transaction.findOne({ txHash, eventType: "Burn" });
      if (exists) return;

      const block = await this.provider.getBlock(event.log.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.log.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        eventType: "Burn",
        from: from.toLowerCase(),
        amount: amount.toString(),
        amountFormatted: parseFloat(ethers.formatEther(amount)),
        reason,
        rawData: { from, amount: amount.toString(), reason },
      });

      console.log(`Burn event processed: ${txHash}`);
    } catch (error) {
      console.error("Error processing burn event:", error);
    }
  }

  // Process Whitelist event
  async processWhitelistEvent(account, status, event) {
    try {
      const txHash = event.log.transactionHash;

      const exists = await Transaction.findOne({ txHash, eventType: "WhitelistUpdated" });
      if (exists) return;

      const block = await this.provider.getBlock(event.log.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.log.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        eventType: "WhitelistUpdated",
        account: account.toLowerCase(),
        whitelistStatus: status,
        rawData: { account, status },
      });

      // Update user whitelist status in database
      await User.findOneAndUpdate(
        { walletAddress: account.toLowerCase() },
        { isWhitelisted: status }
      );

      console.log(`Whitelist event processed: ${txHash}`);
    } catch (error) {
      console.error("Error processing whitelist event:", error);
    }
  }

  // Process Pause/Unpause event
  async processPauseEvent(account, paused, event) {
    try {
      const txHash = event.log.transactionHash;
      const eventType = paused ? "Paused" : "Unpaused";

      const exists = await Transaction.findOne({ txHash, eventType });
      if (exists) return;

      const block = await this.provider.getBlock(event.log.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.log.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        eventType,
        account: account.toLowerCase(),
        rawData: { account, paused },
      });

      console.log(`${eventType} event processed: ${txHash}`);
    } catch (error) {
      console.error("Error processing pause event:", error);
    }
  }

  // Process Role event
  async processRoleEvent(role, account, sender, granted, event) {
    try {
      const txHash = event.log.transactionHash;
      const eventType = granted ? "RoleGranted" : "RoleRevoked";

      const exists = await Transaction.findOne({ txHash, eventType, account: account.toLowerCase() });
      if (exists) return;

      const block = await this.provider.getBlock(event.log.blockNumber);

      // Decode role name
      let roleName = role;
      const ADMIN_ROLE = ethers.id("ADMIN_ROLE");
      const ISSUER_ROLE = ethers.id("ISSUER_ROLE");

      if (role === ADMIN_ROLE) roleName = "ADMIN_ROLE";
      else if (role === ISSUER_ROLE) roleName = "ISSUER_ROLE";
      else if (role === ethers.ZeroHash) roleName = "DEFAULT_ADMIN_ROLE";

      await Transaction.create({
        txHash,
        blockNumber: event.log.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        eventType,
        account: account.toLowerCase(),
        from: sender.toLowerCase(),
        role: roleName,
        rawData: { role, account, sender, granted },
      });

      console.log(`${eventType} event processed: ${txHash}`);
    } catch (error) {
      console.error("Error processing role event:", error);
    }
  }

  // Process Metadata event
  async processMetadataEvent(commodityType, unit, totalQuantity, storageLocation, certificationHash, event) {
    try {
      const txHash = event.log.transactionHash;

      const exists = await Transaction.findOne({ txHash, eventType: "AssetMetadataUpdated" });
      if (exists) return;

      const block = await this.provider.getBlock(event.log.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.log.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        eventType: "AssetMetadataUpdated",
        rawData: {
          commodityType,
          unit,
          totalQuantity: totalQuantity.toString(),
          storageLocation,
          certificationHash,
        },
      });

      console.log(`AssetMetadataUpdated event processed: ${txHash}`);
    } catch (error) {
      console.error("Error processing metadata event:", error);
    }
  }

  // Get recent transactions
  async getRecentTransactions(options = {}) {
    const { eventType, limit = 50, page = 1 } = options;

    const filter = {};
    if (eventType) filter.eventType = eventType;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ blockTimestamp: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

// Export singleton instance
module.exports = new EventSyncService();
