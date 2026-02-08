// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PredictionMarket
 * @notice A prediction market contract for forex currency pairs with oracle-based resolution
 * @dev Supports ERC-7824 state channel integration for off-chain transactions
 */
contract PredictionMarket is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Market states
    enum MarketState {
        Active,
        Resolved,
        Cancelled
    }

    // Position types
    enum PositionType {
        Long,  // Betting price will go up
        Short  // Betting price will go down
    }

    struct Market {
        string currencyPair;        // e.g., "USDC/EURC"
        address collateralToken;    // USDC or other stablecoin
        uint256 targetPrice;        // Price to predict (in 8 decimals, e.g., 1e8 = 1.0)
        uint256 resolutionTime;     // Timestamp when market resolves
        MarketState state;          // Current market state
        uint256 totalLongShares;    // Total shares for long positions
        uint256 totalShortShares;   // Total shares for short positions
        uint256 totalCollateral;    // Total collateral deposited
        bool resolved;              // Whether market has been resolved
        int256 finalPrice;          // Final resolved price (negative if not resolved)
    }

    struct Position {
        PositionType positionType;
        uint256 shares;
        uint256 collateral;
        bool claimed;
    }

    // Market data
    Market public market;
    
    // User positions: user => position
    mapping(address => Position) public positions;
    
    // Oracle address (can be Chainlink, Pyth, or custom oracle)
    address public oracle;
    
    // Events
    event MarketCreated(
        string indexed currencyPair,
        address indexed collateralToken,
        uint256 targetPrice,
        uint256 resolutionTime
    );
    
    event PositionTaken(
        address indexed user,
        PositionType positionType,
        uint256 shares,
        uint256 collateral
    );
    
    event MarketResolved(
        int256 finalPrice,
        uint256 longPayout,
        uint256 shortPayout
    );
    
    event PositionClaimed(
        address indexed user,
        uint256 payout
    );

    /**
     * @notice Constructor to create a new prediction market
     * @param _currencyPair The currency pair being predicted (e.g., "USDC/EURC")
     * @param _collateralToken Address of the collateral token (USDC, EURC, etc.)
     * @param _targetPrice The target price to predict (in 8 decimals)
     * @param _resolutionTime Unix timestamp when market resolves
     * @param _oracle Address of the price oracle contract
     * @param _owner Owner of the market (can resolve/update oracle)
     */
    constructor(
        string memory _currencyPair,
        address _collateralToken,
        uint256 _targetPrice,
        uint256 _resolutionTime,
        address _oracle,
        address _owner
    ) Ownable(_owner) {
        require(_collateralToken != address(0), "Invalid collateral token");
        require(_resolutionTime > block.timestamp, "Invalid resolution time");
        require(_oracle != address(0), "Invalid oracle");
        
        market = Market({
            currencyPair: _currencyPair,
            collateralToken: _collateralToken,
            targetPrice: _targetPrice,
            resolutionTime: _resolutionTime,
            state: MarketState.Active,
            totalLongShares: 0,
            totalShortShares: 0,
            totalCollateral: 0,
            resolved: false,
            finalPrice: -1
        });
        
        oracle = _oracle;
        
        emit MarketCreated(_currencyPair, _collateralToken, _targetPrice, _resolutionTime);
    }

    /**
     * @notice Take a position in the market (Long or Short)
     * @param _positionType Long (price up) or Short (price down)
     * @param _amount Amount of collateral to deposit
     */
    function takePosition(
        PositionType _positionType,
        uint256 _amount
    ) external nonReentrant {
        require(market.state == MarketState.Active, "Market not active");
        require(block.timestamp < market.resolutionTime, "Market closed");
        require(_amount > 0, "Amount must be greater than 0");
        
        IERC20 collateral = IERC20(market.collateralToken);
        
        // Transfer collateral from user
        collateral.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Calculate shares (1:1 for simplicity, can be adjusted)
        uint256 shares = _amount;
        
        // Update user position
        Position storage userPosition = positions[msg.sender];
        if (userPosition.shares == 0) {
            // New position
            userPosition.positionType = _positionType;
            userPosition.shares = shares;
            userPosition.collateral = _amount;
        } else {
            // Add to existing position (must be same type)
            require(userPosition.positionType == _positionType, "Cannot mix position types");
            userPosition.shares += shares;
            userPosition.collateral += _amount;
        }
        
        // Update market totals
        if (_positionType == PositionType.Long) {
            market.totalLongShares += shares;
        } else {
            market.totalShortShares += shares;
        }
        market.totalCollateral += _amount;
        
        emit PositionTaken(msg.sender, _positionType, shares, _amount);
    }

    /**
     * @notice Resolve the market using oracle price
     * @dev Can be called by owner or after resolution time
     * @param _finalPrice Final price from oracle (in 8 decimals)
     */
    function resolveMarket(int256 _finalPrice) external {
        require(
            msg.sender == owner() || block.timestamp >= market.resolutionTime,
            "Not authorized or too early"
        );
        require(market.state == MarketState.Active, "Market already resolved");
        require(_finalPrice >= 0, "Invalid price");
        
        market.state = MarketState.Resolved;
        market.resolved = true;
        market.finalPrice = _finalPrice;
        
        // Calculate payouts
        uint256 longPayout = 0;
        uint256 shortPayout = 0;
        
        if (uint256(_finalPrice) >= market.targetPrice) {
            // Long wins
            longPayout = market.totalCollateral;
        } else {
            // Short wins
            shortPayout = market.totalCollateral;
        }
        
        emit MarketResolved(_finalPrice, longPayout, shortPayout);
    }
    
    /**
     * @notice Auto-resolve market using oracle
     * @dev Fetches price from oracle and resolves automatically
     */
    function autoResolveMarket() external {
        require(
            msg.sender == owner() || block.timestamp >= market.resolutionTime,
            "Not authorized or too early"
        );
        require(market.state == MarketState.Active, "Market already resolved");
        require(oracle != address(0), "Oracle not set");
        
        // Get price from oracle
        // Note: This requires implementing IPriceOracle interface
        // For now, this is a placeholder - implement based on your oracle choice
        // Example with interface:
        // IPriceOracle priceOracle = IPriceOracle(oracle);
        // (uint256 price, uint256 timestamp) = priceOracle.getPrice(market.currencyPair);
        // resolveMarket(int256(price));
        
        // For demo, we'll require manual resolution with price
        revert("Use resolveMarket() with price parameter");
    }

    /**
     * @notice Claim payout for a resolved position
     */
    function claimPayout() external nonReentrant {
        require(market.resolved, "Market not resolved");
        
        Position storage userPosition = positions[msg.sender];
        require(userPosition.shares > 0, "No position");
        require(!userPosition.claimed, "Already claimed");
        
        uint256 payout = 0;
        bool isWinner = false;
        
        if (market.finalPrice >= int256(market.targetPrice)) {
            // Long wins
            if (userPosition.positionType == PositionType.Long) {
                isWinner = true;
            }
        } else {
            // Short wins
            if (userPosition.positionType == PositionType.Short) {
                isWinner = true;
            }
        }
        
        if (isWinner && market.totalCollateral > 0) {
            // Calculate proportional payout
            uint256 totalShares = userPosition.positionType == PositionType.Long
                ? market.totalLongShares
                : market.totalShortShares;
            
            if (totalShares > 0) {
                payout = (market.totalCollateral * userPosition.shares) / totalShares;
            }
        }
        
        userPosition.claimed = true;
        
        if (payout > 0) {
            IERC20(market.collateralToken).safeTransfer(msg.sender, payout);
        }
        
        emit PositionClaimed(msg.sender, payout);
    }

    /**
     * @notice Get user position details
     */
    function getUserPosition(address _user) external view returns (
        PositionType positionType,
        uint256 shares,
        uint256 collateral,
        bool claimed
    ) {
        Position memory pos = positions[_user];
        return (pos.positionType, pos.shares, pos.collateral, pos.claimed);
    }

    /**
     * @notice Update oracle address (owner only)
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        oracle = _oracle;
    }

    /**
     * @notice Cancel market and refund all positions (owner only, emergency)
     */
    function cancelMarket() external onlyOwner {
        require(market.state == MarketState.Active, "Market not active");
        market.state = MarketState.Cancelled;
    }

    /**
     * @notice Emergency withdraw for cancelled markets
     */
    function emergencyWithdraw() external nonReentrant {
        require(market.state == MarketState.Cancelled, "Market not cancelled");
        
        Position storage userPosition = positions[msg.sender];
        require(userPosition.collateral > 0, "No collateral to withdraw");
        require(!userPosition.claimed, "Already withdrawn");
        
        uint256 amount = userPosition.collateral;
        userPosition.claimed = true;
        
        IERC20(market.collateralToken).safeTransfer(msg.sender, amount);
    }
}
