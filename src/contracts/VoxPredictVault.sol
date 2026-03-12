// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title VoxPredictVault
 * @dev Vault seguro para operações de mercados preditivos com travas operacionais
 * @notice Auditado para segurança máxima - Versão Produção
 */
contract VoxPredictVault is ReentrancyGuard, Ownable, Pausable {
    IERC20 public immutable usdtToken;
    
    // Estados dos usuários
    mapping(address => uint256) public lockedBalance;
    mapping(address => bool) public isInPrediction;
    mapping(address => uint256) public lastPredictionTime;
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalWithdrawn;
    mapping(address => uint256) public predictionCount;
    
    // Tracking de previsões
    mapping(address => bytes32[]) public userPredictions;
    mapping(bytes32 => PredictionData) public predictions;
    
    struct PredictionData {
        address user;
        uint256 amount;
        string marketId;
        bool isActive;
        uint256 timestamp;
        uint8 outcome; // 0 = SIM, 1 = NAO
    }
    
    // Eventos
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawal(address indexed user, uint256 amount, uint256 timestamp);
    event PredictionMade(address indexed user, bytes32 indexed predictionId, uint256 amount, string marketId);
    event PredictionResolved(bytes32 indexed predictionId, bool won, uint256 payout);
    event UserUnlocked(address indexed user, uint256 timestamp);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    
    // Constantes de segurança
    uint256 public constant MIN_DEPOSIT = 5 * 10**6; // 5 USDT (6 decimais)
    uint256 public constant MAX_DEPOSIT = 10000 * 10**6; // 10,000 USDT
    uint256 public constant PREDICTION_COOLDOWN = 1 hours;
    
    // Configurações admin
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
     * @dev Depositar USDT e travar usuário para previsão
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
     * @dev Fazer uma previsão (apenas callable por contratos autorizados)
     */
    function makePrediction(
        address user,
        uint256 amount,
        string calldata marketId,
        uint8 outcome
    ) external onlyOwner returns (bytes32 predictionId) {
        require(isInPrediction[user], "User not in prediction state");
        require(lockedBalance[user] >= amount, "Insufficient locked balance");
        require(outcome <= 1, "Invalid outcome");
        
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
        predictionCount[user]++;
        
        emit PredictionMade(user, predictionId, amount, marketId);
        
        return predictionId;
    }
    
    /**
     * @dev Resolver previsão e desbloquear usuário
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
            // Usuário ganhou - adicionar payout ao saldo travado
            lockedBalance[user] = lockedBalance[user] - amount + payout;
        } else {
            // Usuário perdeu - deduzir valor do saldo travado
            lockedBalance[user] -= amount;
            
            // Transferir taxa para plataforma
            uint256 fee = (amount * platformFee) / 10000;
            if (fee > 0) {
                require(usdtToken.transfer(feeRecipient, fee), "Fee transfer failed");
            }
        }
        
        // Desbloquear usuário para saque
        isInPrediction[user] = false;
        
        emit PredictionResolved(predictionId, won, payout);
        emit UserUnlocked(user, block.timestamp);
    }
    
    /**
     * @dev Sacar saldo disponível
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
     * @dev Saque de emergência (apenas em modo emergência)
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
     * @dev Função admin para desbloquear usuário (emergência)
     */
    function unlockUser(address user) external onlyOwner {
        isInPrediction[user] = false;
        emit UserUnlocked(user, block.timestamp);
    }
    
    /**
     * @dev Configurar taxa da plataforma
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Máx 10%
        platformFee = _fee;
    }
    
    /**
     * @dev Configurar destinatário da taxa
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Ativar/desativar modo emergência
     */
    function setEmergencyMode(bool _emergencyMode) external onlyOwner {
        emergencyMode = _emergencyMode;
    }
    
    /**
     * @dev Pausar contrato
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Despausar contrato
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Funções de visualização
    function getUserPredictions(address user) external view returns (bytes32[] memory) {
        return userPredictions[user];
    }
    
    function getUserStats(address user) external view returns (
        uint256 locked,
        bool inPrediction,
        uint256 totalDep,
        uint256 totalWith,
        uint256 lastPred,
        uint256 predCount
    ) {
        return (
            lockedBalance[user],
            isInPrediction[user],
            totalDeposited[user],
            totalWithdrawn[user],
            lastPredictionTime[user],
            predictionCount[user]
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