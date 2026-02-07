// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PredictionMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MarketFactory
 * @notice Factory contract to create and manage multiple prediction markets
 */
contract MarketFactory is Ownable {
    // Array of all created markets
    address[] public markets;
    
    // Mapping: currency pair => market addresses
    mapping(string => address[]) public marketsByCurrencyPair;
    
    // Oracle address (can be updated)
    address public oracle;
    
    // Events
    event MarketCreated(
        address indexed market,
        string indexed currencyPair,
        address indexed collateralToken,
        uint256 targetPrice,
        uint256 resolutionTime
    );
    
    event OracleUpdated(address indexed newOracle);

    constructor(address _oracle, address _owner) Ownable(_owner) {
        require(_oracle != address(0), "Invalid oracle");
        oracle = _oracle;
    }

    /**
     * @notice Create a new prediction market
     * @param _currencyPair The currency pair (e.g., "USDC/EURC")
     * @param _collateralToken Address of collateral token
     * @param _targetPrice Target price in 8 decimals
     * @param _resolutionTime Unix timestamp for resolution
     * @return marketAddress Address of the newly created market
     */
    function createMarket(
        string memory _currencyPair,
        address _collateralToken,
        uint256 _targetPrice,
        uint256 _resolutionTime
    ) external returns (address marketAddress) {
        PredictionMarket market = new PredictionMarket(
            _currencyPair,
            _collateralToken,
            _targetPrice,
            _resolutionTime,
            oracle,
            msg.sender
        );
        
        marketAddress = address(market);
        markets.push(marketAddress);
        marketsByCurrencyPair[_currencyPair].push(marketAddress);
        
        emit MarketCreated(
            marketAddress,
            _currencyPair,
            _collateralToken,
            _targetPrice,
            _resolutionTime
        );
        
        return marketAddress;
    }

    /**
     * @notice Create multiple markets for different currency pairs
     * @param _currencyPairs Array of currency pair strings
     * @param _collateralToken Address of collateral token (same for all)
     * @param _targetPrices Array of target prices
     * @param _resolutionTime Unix timestamp for resolution (same for all)
     * @return marketAddresses Array of created market addresses
     */
    function createMultipleMarkets(
        string[] memory _currencyPairs,
        address _collateralToken,
        uint256[] memory _targetPrices,
        uint256 _resolutionTime
    ) external returns (address[] memory marketAddresses) {
        require(
            _currencyPairs.length == _targetPrices.length,
            "Arrays length mismatch"
        );
        
        marketAddresses = new address[](_currencyPairs.length);
        
        for (uint256 i = 0; i < _currencyPairs.length; i++) {
            marketAddresses[i] = createMarket(
                _currencyPairs[i],
                _collateralToken,
                _targetPrices[i],
                _resolutionTime
            );
        }
        
        return marketAddresses;
    }

    /**
     * @notice Get all markets
     * @return Array of all market addresses
     */
    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }

    /**
     * @notice Get markets for a specific currency pair
     * @param _currencyPair The currency pair to query
     * @return Array of market addresses for that pair
     */
    function getMarketsByCurrencyPair(
        string memory _currencyPair
    ) external view returns (address[] memory) {
        return marketsByCurrencyPair[_currencyPair];
    }

    /**
     * @notice Get total number of markets
     * @return Number of markets created
     */
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    /**
     * @notice Update oracle address (owner only)
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }
}
