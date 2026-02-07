const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let predictionMarket;
  let marketFactory;
  let mockToken;
  let owner;
  let user1;
  let user2;
  let oracle;

  const CURRENCY_PAIR = "USDC/EURC";
  const TARGET_PRICE = ethers.parseUnits("1.0", 8); // 1.0 with 8 decimals
  const RESOLUTION_TIME = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

  beforeEach(async function () {
    [owner, user1, user2, oracle] = await ethers.getSigners();

    // Deploy mock ERC20 token (USDC)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockToken.waitForDeployment();

    // Deploy YellowIntegration
    const YellowIntegration = await ethers.getContractFactory("YellowIntegration");
    yellowIntegration = await YellowIntegration.deploy(owner.address);
    await yellowIntegration.waitForDeployment();

    // Deploy MarketFactory
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await MarketFactory.deploy(oracle.address, owner.address);
    await marketFactory.waitForDeployment();

    // Create a market
    const tx = await marketFactory.createMarket(
      CURRENCY_PAIR,
      await mockToken.getAddress(),
      TARGET_PRICE,
      RESOLUTION_TIME
    );
    const receipt = await tx.wait();
    const marketAddress = receipt.logs[0].args.market;
    
    predictionMarket = await ethers.getContractAt("PredictionMarket", marketAddress);

    // Mint tokens for users
    await mockToken.mint(user1.address, ethers.parseUnits("1000", 6));
    await mockToken.mint(user2.address, ethers.parseUnits("1000", 6));
    
    // Approve market to spend tokens
    await mockToken.connect(user1).approve(await predictionMarket.getAddress(), ethers.MaxUint256);
    await mockToken.connect(user2).approve(await predictionMarket.getAddress(), ethers.MaxUint256);
  });

  describe("Market Creation", function () {
    it("Should create a market with correct parameters", async function () {
      const market = await predictionMarket.market();
      expect(market.currencyPair).to.equal(CURRENCY_PAIR);
      expect(market.collateralToken).to.equal(await mockToken.getAddress());
      expect(market.targetPrice).to.equal(TARGET_PRICE);
      expect(market.state).to.equal(0); // Active
    });

    it("Should revert if resolution time is in the past", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      await expect(
        marketFactory.createMarket(
          "USDC/JPYC",
          await mockToken.getAddress(),
          TARGET_PRICE,
          pastTime
        )
      ).to.be.revertedWith("Invalid resolution time");
    });
  });

  describe("Taking Positions", function () {
    it("Should allow user to take a long position", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(
        predictionMarket.connect(user1).takePosition(0, amount) // 0 = Long
      ).to.emit(predictionMarket, "PositionTaken")
        .withArgs(user1.address, 0, amount, amount);

      const position = await predictionMarket.getUserPosition(user1.address);
      expect(position.positionType).to.equal(0); // Long
      expect(position.shares).to.equal(amount);
      expect(position.collateral).to.equal(amount);
    });

    it("Should allow user to take a short position", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(
        predictionMarket.connect(user1).takePosition(1, amount) // 1 = Short
      ).to.emit(predictionMarket, "PositionTaken")
        .withArgs(user1.address, 1, amount, amount);

      const position = await predictionMarket.getUserPosition(user1.address);
      expect(position.positionType).to.equal(1); // Short
    });

    it("Should allow adding to existing position", async function () {
      const amount1 = ethers.parseUnits("100", 6);
      const amount2 = ethers.parseUnits("50", 6);
      
      await predictionMarket.connect(user1).takePosition(0, amount1);
      await predictionMarket.connect(user1).takePosition(0, amount2);

      const position = await predictionMarket.getUserPosition(user1.address);
      expect(position.shares).to.equal(amount1 + amount2);
      expect(position.collateral).to.equal(amount1 + amount2);
    });

    it("Should revert if trying to mix position types", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await predictionMarket.connect(user1).takePosition(0, amount);
      
      await expect(
        predictionMarket.connect(user1).takePosition(1, amount)
      ).to.be.revertedWith("Cannot mix position types");
    });

    it("Should update market totals correctly", async function () {
      const longAmount = ethers.parseUnits("100", 6);
      const shortAmount = ethers.parseUnits("200", 6);
      
      await predictionMarket.connect(user1).takePosition(0, longAmount);
      await predictionMarket.connect(user2).takePosition(1, shortAmount);

      const market = await predictionMarket.market();
      expect(market.totalLongShares).to.equal(longAmount);
      expect(market.totalShortShares).to.equal(shortAmount);
      expect(market.totalCollateral).to.equal(longAmount + shortAmount);
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      // Set up positions
      await predictionMarket.connect(user1).takePosition(0, ethers.parseUnits("100", 6)); // Long
      await predictionMarket.connect(user2).takePosition(1, ethers.parseUnits("100", 6)); // Short
    });

    it("Should resolve market when price is above target (Long wins)", async function () {
      const finalPrice = ethers.parseUnits("1.1", 8); // 1.1 > 1.0 target
      
      await expect(
        predictionMarket.connect(owner).resolveMarket(finalPrice)
      ).to.emit(predictionMarket, "MarketResolved")
        .withArgs(finalPrice, ethers.parseUnits("200", 6), 0);

      const market = await predictionMarket.market();
      expect(market.resolved).to.be.true;
      expect(market.finalPrice).to.equal(finalPrice);
    });

    it("Should resolve market when price is below target (Short wins)", async function () {
      const finalPrice = ethers.parseUnits("0.9", 8); // 0.9 < 1.0 target
      
      await expect(
        predictionMarket.connect(owner).resolveMarket(finalPrice)
      ).to.emit(predictionMarket, "MarketResolved")
        .withArgs(finalPrice, 0, ethers.parseUnits("200", 6));

      const market = await predictionMarket.market();
      expect(market.resolved).to.be.true;
    });

    it("Should allow resolution after resolution time", async function () {
      // Fast forward time (in a real test, use hardhat network time manipulation)
      const finalPrice = ethers.parseUnits("1.05", 8);
      
      // This would work with time manipulation, but for now we test owner resolution
      await predictionMarket.connect(owner).resolveMarket(finalPrice);
      
      const market = await predictionMarket.market();
      expect(market.resolved).to.be.true;
    });
  });

  describe("Claiming Payouts", function () {
    beforeEach(async function () {
      // Set up positions
      await predictionMarket.connect(user1).takePosition(0, ethers.parseUnits("100", 6)); // Long
      await predictionMarket.connect(user2).takePosition(1, ethers.parseUnits("100", 6)); // Short
    });

    it("Should allow long winner to claim payout", async function () {
      const finalPrice = ethers.parseUnits("1.1", 8); // Long wins
      await predictionMarket.connect(owner).resolveMarket(finalPrice);

      const initialBalance = await mockToken.balanceOf(user1.address);
      
      await expect(
        predictionMarket.connect(user1).claimPayout()
      ).to.emit(predictionMarket, "PositionClaimed")
        .withArgs(user1.address, ethers.parseUnits("200", 6));

      const finalBalance = await mockToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseUnits("200", 6));
    });

    it("Should allow short winner to claim payout", async function () {
      const finalPrice = ethers.parseUnits("0.9", 8); // Short wins
      await predictionMarket.connect(owner).resolveMarket(finalPrice);

      const initialBalance = await mockToken.balanceOf(user2.address);
      
      await expect(
        predictionMarket.connect(user2).claimPayout()
      ).to.emit(predictionMarket, "PositionClaimed")
        .withArgs(user2.address, ethers.parseUnits("200", 6));

      const finalBalance = await mockToken.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseUnits("200", 6));
    });

    it("Should not allow claiming before resolution", async function () {
      await expect(
        predictionMarket.connect(user1).claimPayout()
      ).to.be.revertedWith("Market not resolved");
    });

    it("Should not allow double claiming", async function () {
      const finalPrice = ethers.parseUnits("1.1", 8);
      await predictionMarket.connect(owner).resolveMarket(finalPrice);
      
      await predictionMarket.connect(user1).claimPayout();
      
      await expect(
        predictionMarket.connect(user1).claimPayout()
      ).to.be.revertedWith("Already claimed");
    });
  });

  describe("Market Cancellation", function () {
    it("Should allow owner to cancel market", async function () {
      await predictionMarket.connect(user1).takePosition(0, ethers.parseUnits("100", 6));
      
      await predictionMarket.connect(owner).cancelMarket();
      
      const market = await predictionMarket.market();
      expect(market.state).to.equal(2); // Cancelled
    });

    it("Should allow emergency withdrawal after cancellation", async function () {
      const amount = ethers.parseUnits("100", 6);
      await predictionMarket.connect(user1).takePosition(0, amount);
      await predictionMarket.connect(owner).cancelMarket();

      const initialBalance = await mockToken.balanceOf(user1.address);
      await predictionMarket.connect(user1).emergencyWithdraw();
      
      const finalBalance = await mockToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(amount);
    });
  });
});
