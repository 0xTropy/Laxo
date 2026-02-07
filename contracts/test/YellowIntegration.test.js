const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YellowIntegration", function () {
  let yellowIntegration;
  let mockMarket;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy YellowIntegration
    const YellowIntegration = await ethers.getContractFactory("YellowIntegration");
    yellowIntegration = await YellowIntegration.deploy(owner.address);
    await yellowIntegration.waitForDeployment();

    // Deploy mock market
    const MockMarket = await ethers.getContractFactory("MockMarket");
    mockMarket = await MockMarket.deploy();
    await mockMarket.waitForDeployment();
  });

  describe("Off-chain Position Recording", function () {
    it("Should record an off-chain position", async function () {
      const sessionId = ethers.id("test-session-1");
      const amount = ethers.parseUnits("100", 6);
      
      await expect(
        yellowIntegration.connect(user1).recordOffChainPosition(
          sessionId,
          await mockMarket.getAddress(),
          amount
        )
      ).to.emit(yellowIntegration, "OffChainPositionCreated");

      const settlement = await yellowIntegration.getSettlement(sessionId);
      expect(settlement.user).to.equal(user1.address);
      expect(settlement.market).to.equal(await mockMarket.getAddress());
      expect(settlement.amount).to.equal(amount);
      expect(settlement.finalized).to.be.false;
    });

    it("Should track user sessions", async function () {
      const sessionId1 = ethers.id("session-1");
      const sessionId2 = ethers.id("session-2");
      const amount = ethers.parseUnits("100", 6);
      
      await yellowIntegration.connect(user1).recordOffChainPosition(
        sessionId1,
        await mockMarket.getAddress(),
        amount
      );
      
      await yellowIntegration.connect(user1).recordOffChainPosition(
        sessionId2,
        await mockMarket.getAddress(),
        amount
      );

      const sessions = await yellowIntegration.getUserSessions(user1.address);
      expect(sessions.length).to.equal(2);
      expect(sessions[0]).to.equal(sessionId1);
      expect(sessions[1]).to.equal(sessionId2);
    });

    it("Should revert if session already exists", async function () {
      const sessionId = ethers.id("test-session");
      const amount = ethers.parseUnits("100", 6);
      
      await yellowIntegration.connect(user1).recordOffChainPosition(
        sessionId,
        await mockMarket.getAddress(),
        amount
      );
      
      await expect(
        yellowIntegration.connect(user1).recordOffChainPosition(
          sessionId,
          await mockMarket.getAddress(),
          amount
        )
      ).to.be.revertedWith("Session already exists");
    });
  });

  describe("Settlement Finalization", function () {
    beforeEach(async function () {
      const sessionId = ethers.id("test-session");
      const amount = ethers.parseUnits("100", 6);
      
      await yellowIntegration.connect(user1).recordOffChainPosition(
        sessionId,
        await mockMarket.getAddress(),
        amount
      );
    });

    it("Should finalize settlement", async function () {
      const sessionId = ethers.id("test-session");
      const payout = ethers.parseUnits("150", 6);
      const signature = "0x00"; // Mock signature
      
      await expect(
        yellowIntegration.connect(user1).finalizeSettlement(sessionId, payout, signature)
      ).to.emit(yellowIntegration, "SettlementFinalized")
        .withArgs(sessionId, user1.address, await mockMarket.getAddress(), payout, true);

      const settlement = await yellowIntegration.getSettlement(sessionId);
      expect(settlement.finalized).to.be.true;
      expect(settlement.payout).to.equal(payout);
    });

    it("Should not allow double finalization", async function () {
      const sessionId = ethers.id("test-session");
      const payout = ethers.parseUnits("150", 6);
      const signature = "0x00";
      
      await yellowIntegration.connect(user1).finalizeSettlement(sessionId, payout, signature);
      
      await expect(
        yellowIntegration.connect(user1).finalizeSettlement(sessionId, payout, signature)
      ).to.be.revertedWith("Already finalized");
    });
  });

  describe("Session Management", function () {
    it("Should allow closing a finalized session", async function () {
      const sessionId = ethers.id("test-session");
      const amount = ethers.parseUnits("100", 6);
      
      await yellowIntegration.connect(user1).recordOffChainPosition(
        sessionId,
        await mockMarket.getAddress(),
        amount
      );
      
      await yellowIntegration.connect(user1).finalizeSettlement(sessionId, 0, "0x00");
      
      await expect(
        yellowIntegration.connect(user1).closeSession(sessionId)
      ).to.emit(yellowIntegration, "SessionClosed")
        .withArgs(sessionId, user1.address);
    });

    it("Should not allow closing non-finalized session", async function () {
      const sessionId = ethers.id("test-session");
      const amount = ethers.parseUnits("100", 6);
      
      await yellowIntegration.connect(user1).recordOffChainPosition(
        sessionId,
        await mockMarket.getAddress(),
        amount
      );
      
      await expect(
        yellowIntegration.connect(user1).closeSession(sessionId)
      ).to.be.revertedWith("Settlement not finalized");
    });
  });
});

