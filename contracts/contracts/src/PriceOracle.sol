// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PriceOracle
 * @notice Simple price oracle interface for forex pairs
 * @dev Can be implemented with Pyth Network, Chainlink, or custom oracle
 */
interface IPriceOracle {
    /**
     * @notice Get the latest price for a currency pair
     * @param _currencyPair The currency pair (e.g., "EUR/USD", "JPY/USD")
     * @return price The price in 8 decimals (e.g., 1e8 = 1.0)
     * @return timestamp The timestamp when price was last updated
     */
    function getPrice(string memory _currencyPair) external view returns (uint256 price, uint256 timestamp);
    
    /**
     * @notice Check if price feed is available for a pair
     * @param _currencyPair The currency pair to check
     * @return available Whether price feed is available
     */
    function isPriceFeedAvailable(string memory _currencyPair) external view returns (bool available);
}

/**
 * @title MockPriceOracle
 * @notice Mock oracle for testing/demo purposes
 * @dev Returns mock prices - replace with real oracle in production
 */
contract MockPriceOracle is IPriceOracle {
    // Mock prices in 8 decimals
    mapping(string => uint256) private prices;
    mapping(string => uint256) private timestamps;
    
    constructor() {
        // Initialize with mock prices (in 8 decimals)
        prices["EUR/USD"] = 100000000;      // 1.0
        prices["JPY/USD"] = 15000000000;    // 150.0
        prices["BRL/USD"] = 500000000;      // 5.0
        prices["MXN/USD"] = 2000000000;     // 20.0
        prices["CAD/USD"] = 140000000;      // 1.4
        prices["AUD/USD"] = 150000000;      // 1.5
        prices["KRW/USD"] = 1300000000;     // 13.0
        prices["PHP/USD"] = 5600000000;     // 56.0
        prices["ZAR/USD"] = 1800000000;     // 18.0
        
        // Set all timestamps to now
        uint256 now_ = block.timestamp;
        timestamps["EUR/USD"] = now_;
        timestamps["JPY/USD"] = now_;
        timestamps["BRL/USD"] = now_;
        timestamps["MXN/USD"] = now_;
        timestamps["CAD/USD"] = now_;
        timestamps["AUD/USD"] = now_;
        timestamps["KRW/USD"] = now_;
        timestamps["PHP/USD"] = now_;
        timestamps["ZAR/USD"] = now_;
    }
    
    function getPrice(string memory _currencyPair) external view override returns (uint256 price, uint256 timestamp) {
        price = prices[_currencyPair];
        require(price > 0, "Price feed not available");
        timestamp = timestamps[_currencyPair];
    }
    
    function isPriceFeedAvailable(string memory _currencyPair) external view override returns (bool available) {
        available = prices[_currencyPair] > 0;
    }
    
    /**
     * @notice Update price (for testing/demo)
     * @dev In production, this would be called by oracle network
     */
    function updatePrice(string memory _currencyPair, uint256 _price) external {
        prices[_currencyPair] = _price;
        timestamps[_currencyPair] = block.timestamp;
    }
    
    /**
     * @notice Add some randomness to prices (for demo)
     * @dev Simulates price movement
     */
    function simulatePriceMovement(string memory _currencyPair, int256 _changePercent) external {
        uint256 currentPrice = prices[_currencyPair];
        require(currentPrice > 0, "Price feed not available");
        
        // Calculate new price with change
        int256 change = (int256(currentPrice) * _changePercent) / 10000; // _changePercent in basis points
        int256 newPrice = int256(currentPrice) + change;
        require(newPrice > 0, "Price cannot be negative");
        
        prices[_currencyPair] = uint256(newPrice);
        timestamps[_currencyPair] = block.timestamp;
    }
}
