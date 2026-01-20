const { ethers } = require("ethers");
const { getContract, getProvider } = require("../config/blockchain");
const { Transaction, User } = require("../models");

/**
 * Event Sync Service - Uses polling instead of filters
 * This is more reliable with public RPC endpoints like Polygon Amoy
 */
class EventSyncService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.isRunning = false;
    this.lastProcessedBlock = 0;
    this.pollingInterval = null;
    this.POLLING_INTERVAL_MS = 15000; // 15 seconds
    this.BLOCKS_PER_QUERY = 100; // Query 100 blocks at a time
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

  // Start polling for events (more reliable than filters)
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
    console.log("Starting blockchain event polling...");
    console.log(`Polling interval: ${this.POLLING_INTERVAL_MS / 1000}s`);

    // Start polling
    this.pollEvents();
    this.pollingInterval = setInterval(() => {
      this.pollEvents();
    }, this.POLLING_INTERVAL_MS);

    console.log("Event polling started successfully");
  }

  // Poll for new events
  async pollEvents() {
    try {
      const currentBlock = await this.provider.getBlockNumber();

      if (currentBlock <= this.lastProcessedBlock) {
        return; // No new blocks
      }

      const fromBlock = this.lastProcessedBlock + 1;
      const toBlock = Math.min(fromBlock + this.BLOCKS_PER_QUERY - 1, currentBlock);

      // Query all events in the block range
      await this.queryEvents(fromBlock, toBlock);

      this.lastProcessedBlock = toBlock;
    } catch (error) {
      // Silently handle polling errors to avoid spam
      if (!error.message.includes("filter not found")) {
        console.error("Error polling events:", error.message);
      }
    }
  }

  // Query events in a block range
  async queryEvents(fromBlock, toBlock) {
    try {
      // Query Transfer events
      const transferFilter = this.contract.filters.Transfer();
      const transferEvents = await this.contract.queryFilter(transferFilter, fromBlock, toBlock);
      for (const event of transferEvents) {
        await this.processTransferEvent(event);
      }

      // Query TokensMinted events
      const mintFilter = this.contract.filters.TokensMinted();
      const mintEvents = await this.contract.queryFilter(mintFilter, fromBlock, toBlock);
      for (const event of mintEvents) {
        await this.processMintEvent(event);
      }

      // Query TokensBurned events
      const burnFilter = this.contract.filters.TokensBurned();
      const burnEvents = await this.contract.queryFilter(burnFilter, fromBlock, toBlock);
      for (const event of burnEvents) {
        await this.processBurnEvent(event);
      }

      // Query WhitelistUpdated events
      const whitelistFilter = this.contract.filters.WhitelistUpdated();
      const whitelistEvents = await this.contract.queryFilter(whitelistFilter, fromBlock, toBlock);
      for (const event of whitelistEvents) {
        await this.processWhitelistEvent(event);
      }

      // Query Paused/Unpaused events
      const pausedFilter = this.contract.filters.Paused();
      const pausedEvents = await this.contract.queryFilter(pausedFilter, fromBlock, toBlock);
      for (const event of pausedEvents) {
        await this.processPauseEvent(event, true);
      }

      const unpausedFilter = this.contract.filters.Unpaused();
      const unpausedEvents = await this.contract.queryFilter(unpausedFilter, fromBlock, toBlock);
      for (const event of unpausedEvents) {
        await this.processPauseEvent(event, false);
      }

    } catch (error) {
      // Silently handle query errors
      if (!error.message.includes("filter not found")) {
        console.error("Error querying events:", error.message);
      }
    }
  }

  // Stop polling
  stopListening() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("Event polling stopped");
    }
    this.isRunning = false;
  }

  // Process Transfer event
  async processTransferEvent(event) {
    try {
      const txHash = event.transactionHash;

      // Check if already processed
      const exists = await Transaction.findOne({ txHash, eventType: "Transfer" });
      if (exists) return;

      const [from, to, value] = event.args;
      const block = await this.provider.getBlock(event.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.blockNumber,
        blockTimestamp: block ? new Date(block.timestamp * 1000) : new Date(),
        eventType: "Transfer",
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        amount: value.toString(),
        amountFormatted: parseFloat(ethers.formatEther(value)),
        rawData: { from, to, value: value.toString() },
      });

      console.log(`Transfer event processed: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("Error processing transfer event:", error.message);
    }
  }

  // Process Mint event
  async processMintEvent(event) {
    try {
      const txHash = event.transactionHash;

      const exists = await Transaction.findOne({ txHash, eventType: "Mint" });
      if (exists) return;

      const [to, amount, reason] = event.args;
      const block = await this.provider.getBlock(event.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.blockNumber,
        blockTimestamp: block ? new Date(block.timestamp * 1000) : new Date(),
        eventType: "Mint",
        to: to.toLowerCase(),
        amount: amount.toString(),
        amountFormatted: parseFloat(ethers.formatEther(amount)),
        reason,
        rawData: { to, amount: amount.toString(), reason },
      });

      console.log(`Mint event processed: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("Error processing mint event:", error.message);
    }
  }

  // Process Burn event
  async processBurnEvent(event) {
    try {
      const txHash = event.transactionHash;

      const exists = await Transaction.findOne({ txHash, eventType: "Burn" });
      if (exists) return;

      const [from, amount, reason] = event.args;
      const block = await this.provider.getBlock(event.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.blockNumber,
        blockTimestamp: block ? new Date(block.timestamp * 1000) : new Date(),
        eventType: "Burn",
        from: from.toLowerCase(),
        amount: amount.toString(),
        amountFormatted: parseFloat(ethers.formatEther(amount)),
        reason,
        rawData: { from, amount: amount.toString(), reason },
      });

      console.log(`Burn event processed: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("Error processing burn event:", error.message);
    }
  }

  // Process Whitelist event
  async processWhitelistEvent(event) {
    try {
      const txHash = event.transactionHash;

      const exists = await Transaction.findOne({ txHash, eventType: "WhitelistUpdated" });
      if (exists) return;

      const [account, status] = event.args;
      const block = await this.provider.getBlock(event.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.blockNumber,
        blockTimestamp: block ? new Date(block.timestamp * 1000) : new Date(),
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

      console.log(`Whitelist event processed: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("Error processing whitelist event:", error.message);
    }
  }

  // Process Pause/Unpause event
  async processPauseEvent(event, paused) {
    try {
      const txHash = event.transactionHash;
      const eventType = paused ? "Paused" : "Unpaused";

      const exists = await Transaction.findOne({ txHash, eventType });
      if (exists) return;

      const [account] = event.args;
      const block = await this.provider.getBlock(event.blockNumber);

      await Transaction.create({
        txHash,
        blockNumber: event.blockNumber,
        blockTimestamp: block ? new Date(block.timestamp * 1000) : new Date(),
        eventType,
        account: account.toLowerCase(),
        rawData: { account, paused },
      });

      console.log(`${eventType} event processed: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("Error processing pause event:", error.message);
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
