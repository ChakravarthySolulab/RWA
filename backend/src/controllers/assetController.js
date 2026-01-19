const { Asset } = require("../models");

// Create a new asset
const createAsset = async (req, res) => {
  try {
    const {
      name,
      description,
      commodityType,
      quantity,
      unit,
      purity,
      grade,
      pricePerUnit,
      currency,
      storageLocation,
      custodian,
      documents,
      certificationHash,
    } = req.body;

    const asset = new Asset({
      name,
      description,
      commodityType,
      quantity,
      unit,
      purity,
      grade,
      pricePerUnit,
      currency: currency || "USD",
      storageLocation,
      custodian,
      documents: documents || [],
      certificationHash,
      owner: req.user._id,
      verificationStatus: "pending",
    });

    await asset.save();

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Create asset error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create asset",
    });
  }
};

// Get all assets (with filters)
const getAssets = async (req, res) => {
  try {
    const {
      commodityType,
      verificationStatus,
      owner,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (commodityType) filter.commodityType = commodityType;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (owner) filter.owner = owner;

    // Non-admin users can only see their own assets and verified assets
    if (req.user.role !== "admin") {
      filter.$or = [{ owner: req.user._id }, { verificationStatus: "verified" }];
    }

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      Asset.find(filter)
        .populate("owner", "walletAddress profile.name")
        .populate("verifiedBy", "walletAddress profile.name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Asset.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get assets error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get assets",
    });
  }
};

// Get single asset by ID
const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id)
      .populate("owner", "walletAddress profile.name")
      .populate("verifiedBy", "walletAddress profile.name");

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found",
      });
    }

    // Check access
    if (
      req.user.role !== "admin" &&
      asset.owner._id.toString() !== req.user._id.toString() &&
      asset.verificationStatus !== "verified"
    ) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Get asset by ID error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get asset",
    });
  }
};

// Update asset (owner only, before verification)
const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found",
      });
    }

    // Check ownership
    if (asset.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You are not the owner.",
      });
    }

    // Can only update if not yet verified
    if (asset.verificationStatus === "verified") {
      return res.status(400).json({
        success: false,
        error: "Cannot update verified asset",
      });
    }

    const allowedUpdates = [
      "name",
      "description",
      "quantity",
      "purity",
      "grade",
      "pricePerUnit",
      "storageLocation",
      "custodian",
      "documents",
      "certificationHash",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        asset[field] = req.body[field];
      }
    });

    // Reset verification status if modified
    asset.verificationStatus = "pending";

    await asset.save();

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Update asset error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update asset",
    });
  }
};

// Verify asset (admin only)
const verifyAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found",
      });
    }

    if (asset.verificationStatus === "verified") {
      return res.status(400).json({
        success: false,
        error: "Asset is already verified",
      });
    }

    asset.verificationStatus = status;
    asset.verifiedBy = req.user._id;
    asset.verifiedAt = new Date();

    if (status === "rejected") {
      asset.rejectionReason = rejectionReason;
    }

    await asset.save();

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Verify asset error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify asset",
    });
  }
};

// Add document to asset
const addDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, hash, url } = req.body;

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found",
      });
    }

    // Check ownership
    if (asset.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    asset.documents.push({
      name,
      type,
      hash,
      url,
      uploadedAt: new Date(),
    });

    await asset.save();

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Add document error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add document",
    });
  }
};

// Delete asset (owner only, before verification)
const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found",
      });
    }

    // Check ownership
    if (asset.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Cannot delete tokenized assets
    if (asset.isTokenized) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete tokenized asset",
      });
    }

    await Asset.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    console.error("Delete asset error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete asset",
    });
  }
};

module.exports = {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  verifyAsset,
  addDocument,
  deleteAsset,
};
