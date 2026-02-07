const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MarketFactory", function () {
  let marketFactory;
  let mockToken;
  let owner;
  let user1;
  let oracle;

  const RESOLUTION_TIME = Math.floor(Date.now() / 1000) + 86400;

  beforeEach(async function () {
    [owner, user1, oracle] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockToken.waitForDeployment();

    // Deploy MarketFactory
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await MarketFactory.deploy(oracle.address, owner.address);
    await marketFactory.waitForDeployment();
  });

  describe("Market Creation", function () {
    it("Should create a single market", async function () {
      const currencyPair = "USDC/EURC";
      const targetPrice = ethers.parseUnits("1.0", 8);
      
      await expect(
        marketFactory.createMarket(
          currencyPair,
          await mockToken.getAddress(),
          targetPrice,
          RESOLUTION_TIME
        )
      ).to.emit(marketFactory, "MarketCreated");

      const markets = await marketFactory.getAllMarkets();
      expect(markets.length).to.equal(1);
    });

    it("Should create multiple markets for different currency pairs", async function () {
      const currencyPairs = ["USDC/EURC", "USDC/JPYC", "USDC/BRLA"];
      const targetPrices = [
        ethers.parseUnits("1.0", 8),
        ethers.parseUnits("150.0", 8),
        ethers.parseUnits("5.0", 8)
      ];

      const marketAddresses = await marketFactory.createMultipleMarkets(
        currencyPairs,
        await mockToken.getAddress(),
        targetPrices,
        RESOLUTION_TIME
      );

      expect(marketAddresses.length).to.equal(3);
      
      const allMarkets = await marketFactory.getAllMarkets();
      expect(allMarkets.length).to.equal(3);
    });

    it("Should track markets by currency pair", async function () {
      const currencyPair = "USDC/EURC";
      const targetPrice = ethers.parseUnits("1.0", 8);
      
      await marketFactory.createMarket(
        currencyPair,
        await mockToken.getAddress(),
        targetPrice,
        RESOLUTION_TIME
      );
      
      await marketFactory.createMarket(
        currencyPair,
        await mockToken.getAddress(),
        ethers.parseUnits("1.1", 8),
        RESOLUTION_TIME
      );

      const markets = await marketFactory.getMarketsByCurrencyPair(currencyPair);
      expect(markets.length).to.equal(2);
    });
  });

  describe("Market Queries", function () {
    beforeEach(async function () {
      // Create some markets
      await marketFactory.createMarket(
        "USDC/EURC",
        await mockToken.getAddress(),
        ethers.parseUnits("1.0", 8),
        RESOLUTION_TIME
      );
      
      await marketFactory.createMarket(
        "USDC/JPYC",
        await mockToken.getAddress(),
        ethers.parseUnits("150.0", 8),
        RESOLUTION_TIME
      );
    });

    it("Should return correct market count", async function () {
      const count = await marketFactory.getMarketCount();
      expect(count).to.equal(2);
    });

    it("Should return all markets", async function () {
      const markets = await marketFactory.getAllMarkets();
      expect(markets.length).to.equal(2);
    });
  });

  describe("Oracle Management", function () {
    it("Should allow owner to update oracle", async function () {
      const newOracle = ethers.Wallet.createRandom().address;
      
      await expect(
        marketFactory.connect(owner).setOracle(newOracle)
      ).to.emit(marketFactory, "OracleUpdated")
        .withArgs(newOracle);

      expect(await marketFactory.oracle()).to.equal(newOracle);
    });

    it("Should not allow non-owner to update oracle", async function () {
      const newOracle = ethers.Wallet.createRandom().address;
      
      await expect(
        marketFactory.connect(user1).setOracle(newOracle)
      ).to.be.revertedWithCustomError(marketFactory, "OwnableUnauthorizedAccount");
    });
  });
});
