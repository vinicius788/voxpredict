// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title VoxPredict Vault Contract
 * @dev Secure vault for prediction market operations with operational locks
 */
contract VoxPredictVault is ReentrancyGuard, Ownable, Pausable {
    IERC20 public immutable usdtToken;
    
    // User states
    mapping(address => uint256) public lockedBalance;
    mapping(address => bool) public isInPrediction;
    mapping(address => uint256) public lastPredictionTime;
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalWithdrawn;
    
    // Prediction tracking
    mapping(address => bytes32[]) public userPredictions;
    mapping(bytes32 => PredictionData) public predictions;
    
    struct PredictionData {
        address user;
        uint256 amount;
        string marketId;
        bool isActive;
        uint256 timestamp;
        bool outcome; // true for SIM, false for NAO
    }
    
    // Events
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawal(address indexed user, uint256 amount, uint256 timestamp);
    event PredictionMade(address indexed user, bytes32 indexed predictionId, uint256 amount, string marketId);
    event PredictionResolved(bytes32 indexed predictionId, bool won, uint256 payout);
    event UserUnlocked(address indexed user, uint256 timestamp);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    
    // Constants
    uint256 public constant MIN_DEPOSIT = 5 * 10**6; // 5 USDT (6 decimals)
    uint256 public constant MAX_DEPOSIT = 10000 * 10**6; // 10,000 USDT
    uint256 public constant PREDICTION_COOLDOWN = 1 hours;
    
    // Admin settings
    uint256 public platformFee = 300; // 3% (basis points)
    address public feeRecipient;
    bool public emergencyMode = false;
    
    modifier notInPrediction() {
        require(!isInPrediction[msg.sender], "User has active prediction");
        _;
    }
    
    modifier inPrediction() {
        require(isInPrediction[msg.sender], "User has no active prediction");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        require(amount >= MIN_DEPOSIT, "Amount below minimum");
        require(amount <= MAX_DEPOSIT, "Amount above maximum");
        _;
    }
    
    modifier cooldownPassed() {
        require(
            block.timestamp >= lastPredictionTime[msg.sender] + PREDICTION_COOLDOWN,
            "Cooldown period not passed"
        );
        _;
    }
    
    constructor(address _usdtToken, address _feeRecipient) {
        require(_usdtToken != address(0), "Invalid USDT token address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        usdtToken = IERC20(_usdtToken);
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Deposit USDT and lock user for prediction
     */
    function deposit(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        notInPrediction 
        validAmount(amount)
        cooldownPassed
    {
        require(usdtToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        lockedBalance[msg.sender] += amount;
        totalDeposited[msg.sender] += amount;
        isInPrediction[msg.sender] = true;
        lastPredictionTime[msg.sender] = block.timestamp;
        
        emit Deposit(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Make a prediction (only callable by admin/oracle)
     */
    function makePrediction(
        address user,
        uint256 amount,
        string calldata marketId,
        bool outcome
    ) external onlyOwner returns (bytes32 predictionId) {
        require(isInPrediction[user], "User not in prediction state");
        require(lockedBalance[user] >= amount, "Insufficient locked balance");
        
        predictionId = keccak256(abi.encodePacked(user, marketId, block.timestamp, amount));
        
        predictions[predictionId] = PredictionData({
            user: user,
            amount: amount,
            marketId: marketId,
            isActive: true,
            timestamp: block.timestamp,
            outcome: outcome
        });
        
        userPredictions[user].push(predictionId);
        
        emit PredictionMade(user, predictionId, amount, marketId);
        
        return predictionId;
    }
    
    /**
     * @dev Resolve prediction and unlock user
     */
    function resolvePrediction(
        bytes32 predictionId,
        bool won,
        uint256 payout
    ) external onlyOwner nonReentrant {
        PredictionData storage prediction = predictions[predictionId];
        require(prediction.isActive, "Prediction not active");
        
        address user = prediction.user;
        uint256 amount = prediction.amount;
        
        prediction.isActive = false;
        
        if (won) {
            // User won - add payout to locked balance
            lockedBalance[user] = lockedBalance[user] - amount + payout;
        } else {
            // User lost - deduct amount from locked balance
            lockedBalance[user] -= amount;
            
            // Transfer fee to platform
            uint256 fee = (amount * platformFee) / 10000;
            if (fee > 0) {
                require(usdtToken.transfer(feeRecipient, fee), "Fee transfer failed");
            }
        }
        
        // Unlock user for withdrawal
        isInPrediction[user] = false;
        
        emit PredictionResolved(predictionId, won, payout);
        emit UserUnlocked(user, block.timestamp);
    }
    
    /**
     * @dev Withdraw available balance
     */
    function withdraw() external nonReentrant whenNotPaused notInPrediction {
        uint256 amount = lockedBalance[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        lockedBalance[msg.sender] = 0;
        totalWithdrawn[msg.sender] += amount;
        
        require(usdtToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawal(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Emergency withdrawal (only in emergency mode)
     */
    function emergencyWithdraw() external nonReentrant {
        require(emergencyMode, "Emergency mode not active");
        
        uint256 amount = lockedBalance[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        lockedBalance[msg.sender] = 0;
        isInPrediction[msg.sender] = false;
        
        require(usdtToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit EmergencyWithdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Admin function to unlock user (emergency)
     */
    function unlockUser(address user) external onlyOwner {
        isInPrediction[user] = false;
        emit UserUnlocked(user, block.timestamp);
    }
    
    /**
     * @dev Admin function to set platform fee
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        platformFee = _fee;
    }
    
    /**
     * @dev Admin function to set fee recipient
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Admin function to toggle emergency mode
     */
    function setEmergencyMode(bool _emergencyMode) external onlyOwner {
        emergencyMode = _emergencyMode;
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // View functions
    function getUserPredictions(address user) external view returns (bytes32[] memory) {
        return userPredictions[user];
    }
    
    function getUserStats(address user) external view returns (
        uint256 locked,
        bool inPrediction,
        uint256 totalDep,
        uint256 totalWith,
        uint256 lastPred,
        uint256 predictionCount
    ) {
        return (
            lockedBalance[user],
            isInPrediction[user],
            totalDeposited[user],
            totalWithdrawn[user],
            lastPredictionTime[user],
            userPredictions[user].length
        );
    }
    
    function canDeposit(address user) external view returns (bool) {
        return !isInPrediction[user] && 
               block.timestamp >= lastPredictionTime[user] + PREDICTION_COOLDOWN;
    }
    
    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }
}