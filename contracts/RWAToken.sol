// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RWAToken
 * @dev ERC20 token for Real World Asset (Commodities) tokenization
 * Features:
 * - Role-based access control (Admin, Issuer, Investor)
 * - Whitelist-based transfers (compliance)
 * - Pause/Unpause functionality
 * - Asset metadata storage
 */
contract RWAToken is ERC20, ERC20Burnable, AccessControl, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // Whitelist mapping for compliance
    mapping(address => bool) public whitelist;

    // Asset metadata structure
    struct AssetMetadata {
        string commodityType;     // e.g., "GOLD", "SILVER", "OIL"
        string unit;              // e.g., "oz", "g", "barrel"
        uint256 totalQuantity;    // Total physical quantity represented
        string storageLocation;   // Physical storage location
        string certificationHash; // IPFS hash or document reference
        uint256 createdAt;        // Timestamp of creation
        uint256 updatedAt;        // Last update timestamp
    }

    // Asset metadata
    AssetMetadata public assetMetadata;

    // Events
    event WhitelistUpdated(address indexed account, bool status);
    event AssetMetadataUpdated(
        string commodityType,
        string unit,
        uint256 totalQuantity,
        string storageLocation,
        string certificationHash
    );
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);

    /**
     * @dev Constructor to initialize the token with metadata
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param commodityType_ Type of commodity (GOLD, SILVER, OIL, etc.)
     * @param unit_ Unit of measurement
     * @param totalQuantity_ Total physical quantity
     * @param storageLocation_ Physical storage location
     * @param certificationHash_ IPFS/document hash for certification
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory commodityType_,
        string memory unit_,
        uint256 totalQuantity_,
        string memory storageLocation_,
        string memory certificationHash_
    ) ERC20(name_, symbol_) {
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);

        // Whitelist the deployer
        whitelist[msg.sender] = true;
        emit WhitelistUpdated(msg.sender, true);

        // Set initial asset metadata
        assetMetadata = AssetMetadata({
            commodityType: commodityType_,
            unit: unit_,
            totalQuantity: totalQuantity_,
            storageLocation: storageLocation_,
            certificationHash: certificationHash_,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit AssetMetadataUpdated(
            commodityType_,
            unit_,
            totalQuantity_,
            storageLocation_,
            certificationHash_
        );
    }

    // ============ Whitelist Functions ============

    /**
     * @dev Add an address to the whitelist
     * @param account Address to whitelist
     */
    function addToWhitelist(address account) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "RWAToken: zero address");
        require(!whitelist[account], "RWAToken: already whitelisted");

        whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }

    /**
     * @dev Remove an address from the whitelist
     * @param account Address to remove from whitelist
     */
    function removeFromWhitelist(address account) external onlyRole(ADMIN_ROLE) {
        require(whitelist[account], "RWAToken: not whitelisted");

        whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }

    /**
     * @dev Batch add addresses to whitelist
     * @param accounts Array of addresses to whitelist
     */
    function batchAddToWhitelist(address[] calldata accounts) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] != address(0) && !whitelist[accounts[i]]) {
                whitelist[accounts[i]] = true;
                emit WhitelistUpdated(accounts[i], true);
            }
        }
    }

    /**
     * @dev Check if an address is whitelisted
     * @param account Address to check
     * @return bool Whitelist status
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }

    // ============ Minting Functions ============

    /**
     * @dev Mint new tokens (only issuer)
     * @param to Recipient address (must be whitelisted)
     * @param amount Amount to mint
     * @param reason Reason for minting
     */
    function mint(
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        require(whitelist[to], "RWAToken: recipient not whitelisted");
        require(amount > 0, "RWAToken: amount must be greater than 0");

        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    // ============ Burning Functions ============

    /**
     * @dev Burn tokens with reason logging
     * @param amount Amount to burn
     * @param reason Reason for burning
     */
    function burnWithReason(uint256 amount, string calldata reason) external whenNotPaused {
        require(amount > 0, "RWAToken: amount must be greater than 0");

        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, reason);
    }

    // ============ Pause Functions ============

    /**
     * @dev Pause all token transfers (only admin)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers (only admin)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ Metadata Functions ============

    /**
     * @dev Update asset metadata (only admin)
     * @param commodityType_ New commodity type
     * @param unit_ New unit
     * @param totalQuantity_ New total quantity
     * @param storageLocation_ New storage location
     * @param certificationHash_ New certification hash
     */
    function updateAssetMetadata(
        string calldata commodityType_,
        string calldata unit_,
        uint256 totalQuantity_,
        string calldata storageLocation_,
        string calldata certificationHash_
    ) external onlyRole(ADMIN_ROLE) {
        assetMetadata.commodityType = commodityType_;
        assetMetadata.unit = unit_;
        assetMetadata.totalQuantity = totalQuantity_;
        assetMetadata.storageLocation = storageLocation_;
        assetMetadata.certificationHash = certificationHash_;
        assetMetadata.updatedAt = block.timestamp;

        emit AssetMetadataUpdated(
            commodityType_,
            unit_,
            totalQuantity_,
            storageLocation_,
            certificationHash_
        );
    }

    /**
     * @dev Get complete asset metadata
     * @return AssetMetadata struct
     */
    function getAssetMetadata() external view returns (AssetMetadata memory) {
        return assetMetadata;
    }

    // ============ Transfer Override ============

    /**
     * @dev Override _update to enforce whitelist and pause checks
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        // Skip whitelist check for minting (from = 0) and burning (to = 0)
        if (from != address(0) && to != address(0)) {
            require(whitelist[from], "RWAToken: sender not whitelisted");
            require(whitelist[to], "RWAToken: recipient not whitelisted");
        }

        super._update(from, to, value);
    }

    // ============ Role Management Helpers ============

    /**
     * @dev Grant issuer role to an address
     * @param account Address to grant issuer role
     */
    function grantIssuerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, account);
    }

    /**
     * @dev Revoke issuer role from an address
     * @param account Address to revoke issuer role
     */
    function revokeIssuerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, account);
    }

    /**
     * @dev Grant admin role to an address
     * @param account Address to grant admin role
     */
    function grantAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, account);
    }

    /**
     * @dev Revoke admin role from an address
     * @param account Address to revoke admin role
     */
    function revokeAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ADMIN_ROLE, account);
    }
}
