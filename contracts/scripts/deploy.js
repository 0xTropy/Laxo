const hre = require("hardhat");

// Currency pairs for prediction markets
const CURRENCY_PAIRS = [
  "USDC/EURC",
  "USDC/JPYC",
  "USDC/BRLA",
  "USDC/MXNB",
  "USDC/QCAD",
  "USDC/AUDF",
  "USDC/KRW1",
  "USDC/PHPC",
  "USDC/ZARU",
  "USDC/USYC"
];

// Target prices (in 8 decimals, e.g., 1e8 = 1.0)
// These are example prices - adjust based on current market rates
const TARGET_PRICES = [
  "100000000",  // 1.0 USDC/EURC
  "15000000000", // 150.0 USDC/JPYC
  "500000000",  // 5.0 USDC/BRLA
  "2000000000", // 20.0 USDC/MXNB
  "140000000",  // 1.4 USDC/QCAD
  "150000000",  // 1.5 USDC/AUDF
  "1300000000", // 13.0 USDC/KRW1
  "5600000000", // 56.0 USDC/PHPC
  "1800000000", // 18.0 USDC/ZARU
  "100000000"   // 1.0 USDC/USYC
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // For Sepolia, we'll use a mock oracle address
  // In production, replace with actual Chainlink/Pyth oracle address
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address; // Placeholder
  
  // Deploy YellowIntegration
  console.log("\n1. Deploying YellowIntegration...");
  const YellowIntegration = await hre.ethers.getContractFactory("YellowIntegration");
  const yellowIntegration = await YellowIntegration.deploy(deployer.address);
  await yellowIntegration.waitForDeployment();
  const yellowIntegrationAddress = await yellowIntegration.getAddress();
  console.log("YellowIntegration deployed to:", yellowIntegrationAddress);

  // Deploy MarketFactory
  console.log("\n2. Deploying MarketFactory...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(oracleAddress, deployer.address);
  await marketFactory.waitForDeployment();
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log("MarketFactory deployed to:", marketFactoryAddress);

  // For testing, deploy a mock USDC token if not on mainnet/testnet with real USDC
  let collateralTokenAddress = process.env.COLLATERAL_TOKEN_ADDRESS;
  
  if (!collateralTokenAddress) {
    console.log("\n3. Deploying MockERC20 (USDC) for testing...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();
    collateralTokenAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", collateralTokenAddress);
  } else {
    console.log("\n3. Using existing collateral token:", collateralTokenAddress);
  }

  // Calculate resolution time (24 hours from now)
  const resolutionTime = Math.floor(Date.now() / 1000) + 86400;

  // Create markets for all currency pairs
  console.log("\n4. Creating prediction markets...");
  const marketAddresses = [];
  
  for (let i = 0; i < CURRENCY_PAIRS.length; i++) {
    console.log(`Creating market for ${CURRENCY_PAIRS[i]}...`);
    
    const tx = await marketFactory.createMarket(
      CURRENCY_PAIRS[i],
      collateralTokenAddress,
      TARGET_PRICES[i],
      resolutionTime
    );
    
    const receipt = await tx.wait();
    const marketAddress = receipt.logs.find(log => {
      try {
        const parsed = marketFactory.interface.parseLog(log);
        return parsed && parsed.name === "MarketCreated";
      } catch {
        return false;
      }
    })?.args?.market || receipt.logs[0].address;
    
    marketAddresses.push(marketAddress);
    console.log(`  ✓ Market created at: ${marketAddress}`);
  }

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("YellowIntegration:", yellowIntegrationAddress);
  console.log("MarketFactory:", marketFactoryAddress);
  console.log("Collateral Token:", collateralTokenAddress);
  console.log("\nMarkets created:");
  marketAddresses.forEach((addr, i) => {
    console.log(`  ${CURRENCY_PAIRS[i]}: ${addr}`);
  });

  // Save deployment addresses to a file
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    yellowIntegration: yellowIntegrationAddress,
    marketFactory: marketFactoryAddress,
    collateralToken: collateralTokenAddress,
    oracle: oracleAddress,
    markets: CURRENCY_PAIRS.reduce((acc, pair, i) => {
      acc[pair] = marketAddresses[i];
      return acc;
    }, {}),
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    `deployments/${network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployments/ directory");

  // Verify contracts on Etherscan (if on Sepolia)
  if (network.chainId === BigInt(11155111)) { // Sepolia
    console.log("\n5. Verifying contracts on Etherscan...");
    console.log("Waiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    try {
      await hre.run("verify:verify", {
        address: yellowIntegrationAddress,
        constructorArguments: [deployer.address],
      });
      console.log("✓ YellowIntegration verified");
    } catch (error) {
      console.log("YellowIntegration verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: marketFactoryAddress,
        constructorArguments: [oracleAddress, deployer.address],
      });
      console.log("✓ MarketFactory verified");
    } catch (error) {
      console.log("MarketFactory verification failed:", error.message);
    }
  }

  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
