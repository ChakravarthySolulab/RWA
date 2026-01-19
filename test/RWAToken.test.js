const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("RWAToken", function () {
  // Test fixture for deployment
  async function deployRWATokenFixture() {
    const [owner, admin, issuer, investor1, investor2, nonWhitelisted] =
      await ethers.getSigners();

    const RWAToken = await ethers.getContractFactory("RWAToken");
    const token = await RWAToken.deploy(
      "Gold Token",
      "GLDT",
      "GOLD",
      "oz",
      1000,
      "Vault A, London",
      "QmHash123456789"
    );

    // Get role hashes
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const ADMIN_ROLE = await token.ADMIN_ROLE();
    const ISSUER_ROLE = await token.ISSUER_ROLE();

    return {
      token,
      owner,
      admin,
      issuer,
      investor1,
      investor2,
      nonWhitelisted,
      DEFAULT_ADMIN_ROLE,
      ADMIN_ROLE,
      ISSUER_ROLE,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployRWATokenFixture);

      expect(await token.name()).to.equal("Gold Token");
      expect(await token.symbol()).to.equal("GLDT");
    });

    it("Should assign roles to deployer", async function () {
      const { token, owner, DEFAULT_ADMIN_ROLE, ADMIN_ROLE, ISSUER_ROLE } =
        await loadFixture(deployRWATokenFixture);

      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(ISSUER_ROLE, owner.address)).to.be.true;
    });

    it("Should whitelist the deployer", async function () {
      const { token, owner } = await loadFixture(deployRWATokenFixture);

      expect(await token.isWhitelisted(owner.address)).to.be.true;
    });

    it("Should set correct asset metadata", async function () {
      const { token } = await loadFixture(deployRWATokenFixture);

      const metadata = await token.getAssetMetadata();
      expect(metadata.commodityType).to.equal("GOLD");
      expect(metadata.unit).to.equal("oz");
      expect(metadata.totalQuantity).to.equal(1000);
      expect(metadata.storageLocation).to.equal("Vault A, London");
      expect(metadata.certificationHash).to.equal("QmHash123456789");
    });

    it("Should start unpaused", async function () {
      const { token } = await loadFixture(deployRWATokenFixture);

      expect(await token.paused()).to.be.false;
    });
  });

  describe("Whitelisting", function () {
    it("Should allow admin to add address to whitelist", async function () {
      const { token, owner, investor1 } = await loadFixture(
        deployRWATokenFixture
      );

      await expect(token.addToWhitelist(investor1.address))
        .to.emit(token, "WhitelistUpdated")
        .withArgs(investor1.address, true);

      expect(await token.isWhitelisted(investor1.address)).to.be.true;
    });

    it("Should allow admin to remove address from whitelist", async function () {
      const { token, owner, investor1 } = await loadFixture(
        deployRWATokenFixture
      );

      await token.addToWhitelist(investor1.address);
      await expect(token.removeFromWhitelist(investor1.address))
        .to.emit(token, "WhitelistUpdated")
        .withArgs(investor1.address, false);

      expect(await token.isWhitelisted(investor1.address)).to.be.false;
    });

    it("Should reject non-admin adding to whitelist", async function () {
      const { token, investor1, investor2, ADMIN_ROLE } = await loadFixture(
        deployRWATokenFixture
      );

      await expect(
        token.connect(investor1).addToWhitelist(investor2.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should reject adding zero address to whitelist", async function () {
      const { token } = await loadFixture(deployRWATokenFixture);

      await expect(
        token.addToWhitelist(ethers.ZeroAddress)
      ).to.be.revertedWith("RWAToken: zero address");
    });

    it("Should reject adding already whitelisted address", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await token.addToWhitelist(investor1.address);
      await expect(
        token.addToWhitelist(investor1.address)
      ).to.be.revertedWith("RWAToken: already whitelisted");
    });

    it("Should allow batch whitelisting", async function () {
      const { token, investor1, investor2 } = await loadFixture(
        deployRWATokenFixture
      );

      await token.batchAddToWhitelist([investor1.address, investor2.address]);

      expect(await token.isWhitelisted(investor1.address)).to.be.true;
      expect(await token.isWhitelisted(investor2.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow issuer to mint to whitelisted address", async function () {
      const { token, owner, investor1 } = await loadFixture(
        deployRWATokenFixture
      );

      await token.addToWhitelist(investor1.address);

      await expect(
        token.mint(investor1.address, ethers.parseEther("100"), "Initial allocation")
      )
        .to.emit(token, "TokensMinted")
        .withArgs(investor1.address, ethers.parseEther("100"), "Initial allocation");

      expect(await token.balanceOf(investor1.address)).to.equal(
        ethers.parseEther("100")
      );
    });

    it("Should reject minting to non-whitelisted address", async function () {
      const { token, nonWhitelisted } = await loadFixture(
        deployRWATokenFixture
      );

      await expect(
        token.mint(nonWhitelisted.address, ethers.parseEther("100"), "Test")
      ).to.be.revertedWith("RWAToken: recipient not whitelisted");
    });

    it("Should reject non-issuer minting", async function () {
      const { token, investor1, investor2 } = await loadFixture(
        deployRWATokenFixture
      );

      await token.addToWhitelist(investor2.address);

      await expect(
        token.connect(investor1).mint(investor2.address, ethers.parseEther("100"), "Test")
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should reject minting zero amount", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await token.addToWhitelist(investor1.address);

      await expect(
        token.mint(investor1.address, 0, "Test")
      ).to.be.revertedWith("RWAToken: amount must be greater than 0");
    });

    it("Should reject minting when paused", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await token.addToWhitelist(investor1.address);
      await token.pause();

      await expect(
        token.mint(investor1.address, ethers.parseEther("100"), "Test")
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Burning", function () {
    it("Should allow token holder to burn their tokens", async function () {
      const { token, owner, investor1 } = await loadFixture(
        deployRWATokenFixture
      );

      await token.addToWhitelist(investor1.address);
      await token.mint(investor1.address, ethers.parseEther("100"), "Initial");

      await expect(
        token.connect(investor1).burnWithReason(ethers.parseEther("50"), "Redemption")
      )
        .to.emit(token, "TokensBurned")
        .withArgs(investor1.address, ethers.parseEther("50"), "Redemption");

      expect(await token.balanceOf(investor1.address)).to.equal(
        ethers.parseEther("50")
      );
    });

    it("Should reject burning zero amount", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await token.addToWhitelist(investor1.address);
      await token.mint(investor1.address, ethers.parseEther("100"), "Initial");

      await expect(
        token.connect(investor1).burnWithReason(0, "Test")
      ).to.be.revertedWith("RWAToken: amount must be greater than 0");
    });

    it("Should reject burning when paused", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await token.addToWhitelist(investor1.address);
      await token.mint(investor1.address, ethers.parseEther("100"), "Initial");
      await token.pause();

      await expect(
        token.connect(investor1).burnWithReason(ethers.parseEther("50"), "Test")
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Transfers", function () {
    it("Should allow transfer between whitelisted addresses", async function () {
      const { token, investor1, investor2 } = await loadFixture(
        deployRWATokenFixture
      );

      await token.addToWhitelist(investor1.address);
      await token.addToWhitelist(investor2.address);
      await token.mint(investor1.address, ethers.parseEther("100"), "Initial");

      await token
        .connect(investor1)
        .transfer(investor2.address, ethers.parseEther("50"));

      expect(await token.balanceOf(investor1.address)).to.equal(
        ethers.parseEther("50")
      );
      expect(await token.balanceOf(investor2.address)).to.equal(
        ethers.parseEther("50")
      );
    });

    it("Should reject transfer from non-whitelisted sender", async function () {
      const { token, owner, investor1, nonWhitelisted } = await loadFixture(
        deployRWATokenFixture
      );

      // Give tokens to owner (who is whitelisted)
      await token.mint(owner.address, ethers.parseEther("100"), "Initial");

      // Transfer to investor1
      await token.addToWhitelist(investor1.address);
      await token.transfer(investor1.address, ethers.parseEther("100"));

      // Remove investor1 from whitelist
      await token.removeFromWhitelist(investor1.address);

      // Try to transfer from non-whitelisted investor1
      await token.addToWhitelist(nonWhitelisted.address);
      await expect(
        token.connect(investor1).transfer(nonWhitelisted.address, ethers.parseEther("50"))
      ).to.be.revertedWith("RWAToken: sender not whitelisted");
    });

    it("Should reject transfer to non-whitelisted recipient", async function () {
      const { token, investor1, nonWhitelisted } = await loadFixture(
        deployRWATokenFixture
      );

      await token.addToWhitelist(investor1.address);
      await token.mint(investor1.address, ethers.parseEther("100"), "Initial");

      await expect(
        token
          .connect(investor1)
          .transfer(nonWhitelisted.address, ethers.parseEther("50"))
      ).to.be.revertedWith("RWAToken: recipient not whitelisted");
    });

    it("Should reject transfer when paused", async function () {
      const { token, investor1, investor2 } = await loadFixture(
        deployRWATokenFixture
      );

      await token.addToWhitelist(investor1.address);
      await token.addToWhitelist(investor2.address);
      await token.mint(investor1.address, ethers.parseEther("100"), "Initial");
      await token.pause();

      await expect(
        token
          .connect(investor1)
          .transfer(investor2.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow admin to pause", async function () {
      const { token } = await loadFixture(deployRWATokenFixture);

      await token.pause();
      expect(await token.paused()).to.be.true;
    });

    it("Should allow admin to unpause", async function () {
      const { token } = await loadFixture(deployRWATokenFixture);

      await token.pause();
      await token.unpause();
      expect(await token.paused()).to.be.false;
    });

    it("Should reject non-admin pausing", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await expect(
        token.connect(investor1).pause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should reject non-admin unpausing", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await token.pause();

      await expect(
        token.connect(investor1).unpause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Role Management", function () {
    it("Should allow default admin to grant issuer role", async function () {
      const { token, issuer, ISSUER_ROLE } = await loadFixture(
        deployRWATokenFixture
      );

      await token.grantIssuerRole(issuer.address);
      expect(await token.hasRole(ISSUER_ROLE, issuer.address)).to.be.true;
    });

    it("Should allow default admin to revoke issuer role", async function () {
      const { token, issuer, ISSUER_ROLE } = await loadFixture(
        deployRWATokenFixture
      );

      await token.grantIssuerRole(issuer.address);
      await token.revokeIssuerRole(issuer.address);
      expect(await token.hasRole(ISSUER_ROLE, issuer.address)).to.be.false;
    });

    it("Should allow default admin to grant admin role", async function () {
      const { token, admin, ADMIN_ROLE } = await loadFixture(
        deployRWATokenFixture
      );

      await token.grantAdminRole(admin.address);
      expect(await token.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should allow default admin to revoke admin role", async function () {
      const { token, admin, ADMIN_ROLE } = await loadFixture(
        deployRWATokenFixture
      );

      await token.grantAdminRole(admin.address);
      await token.revokeAdminRole(admin.address);
      expect(await token.hasRole(ADMIN_ROLE, admin.address)).to.be.false;
    });

    it("Should reject non-default-admin granting roles", async function () {
      const { token, investor1, investor2 } = await loadFixture(
        deployRWATokenFixture
      );

      await expect(
        token.connect(investor1).grantIssuerRole(investor2.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Metadata Management", function () {
    it("Should allow admin to update metadata", async function () {
      const { token } = await loadFixture(deployRWATokenFixture);

      await expect(
        token.updateAssetMetadata(
          "SILVER",
          "kg",
          500,
          "Vault B, NYC",
          "QmNewHash789"
        )
      )
        .to.emit(token, "AssetMetadataUpdated")
        .withArgs("SILVER", "kg", 500, "Vault B, NYC", "QmNewHash789");

      const metadata = await token.getAssetMetadata();
      expect(metadata.commodityType).to.equal("SILVER");
      expect(metadata.unit).to.equal("kg");
      expect(metadata.totalQuantity).to.equal(500);
    });

    it("Should reject non-admin updating metadata", async function () {
      const { token, investor1 } = await loadFixture(deployRWATokenFixture);

      await expect(
        token
          .connect(investor1)
          .updateAssetMetadata("SILVER", "kg", 500, "Vault B", "QmHash")
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete token lifecycle", async function () {
      const { token, owner, investor1, investor2 } = await loadFixture(
        deployRWATokenFixture
      );

      // 1. Whitelist investors
      await token.addToWhitelist(investor1.address);
      await token.addToWhitelist(investor2.address);

      // 2. Mint tokens
      await token.mint(investor1.address, ethers.parseEther("1000"), "Initial allocation");

      // 3. Transfer between investors
      await token.connect(investor1).transfer(investor2.address, ethers.parseEther("400"));

      expect(await token.balanceOf(investor1.address)).to.equal(ethers.parseEther("600"));
      expect(await token.balanceOf(investor2.address)).to.equal(ethers.parseEther("400"));

      // 4. Burn tokens
      await token.connect(investor2).burnWithReason(ethers.parseEther("100"), "Redemption");
      expect(await token.balanceOf(investor2.address)).to.equal(ethers.parseEther("300"));

      // 5. Pause contract
      await token.pause();

      // 6. Verify transfers blocked
      await expect(
        token.connect(investor1).transfer(investor2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");

      // 7. Unpause and verify transfers work
      await token.unpause();
      await token.connect(investor1).transfer(investor2.address, ethers.parseEther("100"));
      expect(await token.balanceOf(investor2.address)).to.equal(ethers.parseEther("400"));
    });
  });
});
