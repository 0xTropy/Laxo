const hre = require("hardhat");

/**
 * Deploy contracts to Arc Testnet
 * Arc uses USDC as native gas token (Chain ID: 5042002)
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts to Arc Testnet with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "USDC");

  // Deploy YellowIntegration
  console.log("\n1. Deploying YellowIntegration...");
  const YellowIntegration = await hre.ethers.getContractFactory("YellowIntegration");
  const yellowIntegration = await YellowIntegration.deploy();
  await yellowIntegration.waitForDeployment();
  const yellowIntegrationAddress = await yellowIntegration.getAddress();
  console.log("YellowIntegration deployed to:", yellowIntegrationAddress);

  // Deploy PriceOracle (mock for now)
  console.log("\n2. Deploying PriceOracle...");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("PriceOracle deployed to:", priceOracleAddress);

  // Deploy MockERC20 for USDC (if needed)
  console.log("\n3. Deploying MockERC20 (USDC) for testing...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", mockUSDCAddress);

  // Deploy MarketFactory
  console.log("\n4. Deploying MarketFactory...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    yellowIntegrationAddress,
    priceOracleAddress,
    mockUSDCAddress
  );
  await marketFactory.waitForDeployment();
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log("MarketFactory deployed to:", marketFactoryAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: "arcTestnet",
    chainId: 5042002,
    deployer: deployer.address,
    contracts: {
      YellowIntegration: yellowIntegrationAddress,
      PriceOracle: priceOracleAddress,
      MockERC20: mockUSDCAddress,
      MarketFactory: marketFactoryAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n✅ Deployment complete!");
  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));

  // Note: Arc uses USDC as gas, so transactions are paid in USDC
  console.log("\n⚠️  Note: Arc uses USDC as native gas token");
  console.log("   Make sure you have USDC in your wallet for gas fees");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
