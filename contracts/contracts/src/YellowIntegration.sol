// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title YellowIntegration
 * @notice Helper contract for ERC-7824 state channel integration with Yellow Network
 * @dev This contract handles on-chain settlement for off-chain state channel transactions
 * 
 * ERC-7824 (Nitrolite) allows off-chain transactions through state channels.
 * This contract provides the on-chain settlement layer for prediction market positions
 * that were created off-chain via Yellow SDK.
 */
contract YellowIntegration is Ownable, ReentrancyGuard {
    // Mapping: sessionId => settlement data
    mapping(bytes32 => SettlementData) public settlements;
    
    // Mapping: user => active session IDs
    mapping(address => bytes32[]) public userSessions;
    
    // Events for Yellow Network integration
    event OffChainPositionCreated(
        bytes32 indexed sessionId,
        address indexed user,
        address indexed market,
        uint256 amount,
        uint256 timestamp
    );
    
    event SettlementFinalized(
        bytes32 indexed sessionId,
        address indexed user,
        address indexed market,
        uint256 payout,
        bool success
    );
    
    event SessionClosed(
        bytes32 indexed sessionId,
        address indexed user
    );

    struct SettlementData {
        address user;
        address market;
        uint256 amount;
        uint256 timestamp;
        bool finalized;
        uint256 payout;
    }

    /**
     * @notice Record an off-chain position created via Yellow SDK
     * @param _sessionId Unique session identifier from Yellow Network
     * @param _market Address of the prediction market
     * @param _amount Amount of the position
     */
    function recordOffChainPosition(
        bytes32 _sessionId,
        address _market,
        uint256 _amount
    ) external {
        require(_market != address(0), "Invalid market");
        require(_amount > 0, "Invalid amount");
        require(settlements[_sessionId].user == address(0), "Session already exists");
        
        settlements[_sessionId] = SettlementData({
            user: msg.sender,
            market: _market,
            amount: _amount,
            timestamp: block.timestamp,
            finalized: false,
            payout: 0
        });
        
        userSessions[msg.sender].push(_sessionId);
        
        emit OffChainPositionCreated(_sessionId, msg.sender, _market, _amount, block.timestamp);
    }

    /**
     * @notice Finalize settlement for an off-chain position
     * @param _sessionId Session identifier
     * @param _payout Payout amount (0 if position lost)
     * @param _signature Signature from Yellow Network confirming settlement
     */
    function finalizeSettlement(
        bytes32 _sessionId,
        uint256 _payout,
        bytes memory _signature
    ) external nonReentrant {
        SettlementData storage settlement = settlements[_sessionId];
        require(settlement.user != address(0), "Session not found");
        require(!settlement.finalized, "Already finalized");
        
        // In a production system, you would verify the signature from Yellow Network
        // For now, we'll allow the user to finalize their own settlement
        // In production, this should be called by a trusted Yellow Network operator
        
        settlement.finalized = true;
        settlement.payout = _payout;
        
        emit SettlementFinalized(
            _sessionId,
            settlement.user,
            settlement.market,
            _payout,
            true
        );
    }

    /**
     * @notice Close a session (cleanup)
     * @param _sessionId Session identifier
     */
    function closeSession(bytes32 _sessionId) external {
        SettlementData storage settlement = settlements[_sessionId];
        require(settlement.user == msg.sender, "Not your session");
        require(settlement.finalized, "Settlement not finalized");
        
        emit SessionClosed(_sessionId, msg.sender);
    }

    /**
     * @notice Get settlement data for a session
     */
    function getSettlement(bytes32 _sessionId) external view returns (
        address user,
        address market,
        uint256 amount,
        uint256 timestamp,
        bool finalized,
        uint256 payout
    ) {
        SettlementData memory settlement = settlements[_sessionId];
        return (
            settlement.user,
            settlement.market,
            settlement.amount,
            settlement.timestamp,
            settlement.finalized,
            settlement.payout
        );
    }

    /**
     * @notice Get all sessions for a user
     */
    function getUserSessions(address _user) external view returns (bytes32[] memory) {
        return userSessions[_user];
    }

    /**
     * @notice Verify a signature (placeholder for Yellow Network signature verification)
     * @dev In production, this would verify signatures from Yellow Network Clearnodes
     */
    function verifyYellowSignature(
        bytes32 _messageHash,
        bytes memory _signature,
        address _signer
    ) public pure returns (bool) {
        // Placeholder implementation
        // In production, implement EIP-712 signature verification
        // for Yellow Network Clearnode signatures
        return true;
    }
}
