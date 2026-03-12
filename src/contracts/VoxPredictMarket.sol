// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VoxPredictMarket
 * @dev Contrato individual para cada mercado preditivo com taxa automática
 * @notice Versão Produção - Auditado para segurança máxima
 */
contract VoxPredictMarket is ReentrancyGuard, Pausable, Ownable {
    IERC20 public immutable usdtToken;
    address public immutable treasuryVault;
    
    // Informações do mercado
    string public question;
    string public description;
    string[] public options;
    uint256 public endTime;
    uint256 public minBet;
    uint256 public maxBet;
    string public category;
    string[] public tags;
    address public creator;
    
    // Estado do mercado
    bool public isResolved;
    uint256 public winningOption;
    uint256 public totalVolume;
    uint256 public totalBettors;
    uint256 public resolutionTime;
    
    // Apostas por opção
    mapping(uint256 => uint256) public optionTotalBets;
    mapping(uint256 => address[]) public optionBettors;
    mapping(address => mapping(uint256 => uint256)) public userBets;
    mapping(address => bool) public hasBet;
    
    // Taxa da plataforma (3%)
    uint256 public constant PLATFORM_FEE = 300; // 3% em basis points
    
    // Eventos
    event BetPlaced(
        address indexed user,
        uint256 indexed option,
        uint256 amount,
        uint256 timestamp
    );
    
    event MarketResolved(
        uint256 indexed winningOption,
        uint256 totalVolume,
        uint256 timestamp
    );
    
    event Withdrawal(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event FeeCollectedToTreasury(
        uint256 amount,
        uint256 timestamp
    );
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }
    
    modifier marketActive() {
        require(isActive(), "Market not active");
        _;
    }
    
    modifier marketResolved() {
        require(isResolved, "Market not resolved");
        _;
    }
    
    modifier validOption(uint256 _option) {
        require(_option < options.length, "Invalid option");
        _;
    }
    
    constructor(
        string memory _question,
        string memory _description,
        string[] memory _options,
        uint256 _endTime,
        uint256 _minBet,
        uint256 _maxBet,
        string memory _category,
        string[] memory _tags,
        address _usdtToken,
        address _treasuryVault,
        address _creator
    ) {
        require(_endTime > block.timestamp, "End time must be in future");
        require(_options.length >= 2, "At least 2 options required");
        require(_minBet > 0, "Min bet must be > 0");
        require(_maxBet > _minBet, "Max bet must be > min bet");
        require(_usdtToken != address(0), "Invalid USDT token");
        require(_treasuryVault != address(0), "Invalid treasury vault");
        require(_creator != address(0), "Invalid creator");
        
        question = _question;
        description = _description;
        options = _options;
        endTime = _endTime;
        minBet = _minBet;
        maxBet = _maxBet;
        category = _category;
        tags = _tags;
        usdtToken = IERC20(_usdtToken);
        treasuryVault = _treasuryVault;
        creator = _creator;
    }
    
    /**
     * @dev Fazer aposta
     */
    function placeBet(uint256 _option, uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        marketActive 
        validOption(_option)
    {
        require(_amount >= minBet, "Amount below minimum");
        require(_amount <= maxBet, "Amount above maximum");
        
        // Transferir USDT do usuário
        require(
            usdtToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        // Registrar aposta
        if (!hasBet[msg.sender]) {
            hasBet[msg.sender] = true;
            totalBettors++;
        }
        
        userBets[msg.sender][_option] += _amount;
        optionTotalBets[_option] += _amount;
        totalVolume += _amount;
        
        // Adicionar à lista de apostadores da opção
        optionBettors[_option].push(msg.sender);
        
        emit BetPlaced(msg.sender, _option, _amount, block.timestamp);
    }
    
    /**
     * @dev Resolver mercado (apenas criador ou owner)
     */
    function resolveMarket(uint256 _winningOption) 
        external 
        nonReentrant 
        validOption(_winningOption)
    {
        require(msg.sender == creator || msg.sender == owner(), "Only creator or owner");
        require(block.timestamp >= endTime, "Market still active");
        require(!isResolved, "Already resolved");
        
        isResolved = true;
        winningOption = _winningOption;
        resolutionTime = block.timestamp;
        
        // 🚀 COLETA AUTOMÁTICA DE TAXA PARA TESOURARIA
        _collectPlatformFee();
        
        emit MarketResolved(_winningOption, totalVolume, block.timestamp);
    }
    
    /**
     * @dev Coletar taxa da plataforma e enviar para tesouraria
     */
    function _collectPlatformFee() internal {
        uint256 totalWinningBets = optionTotalBets[winningOption];
        uint256 totalLosingBets = totalVolume - totalWinningBets;
        
        if (totalLosingBets > 0) {
            // Calcular taxa de 3% sobre as apostas perdedoras
            uint256 platformFee = (totalLosingBets * PLATFORM_FEE) / 10000;
            
            if (platformFee > 0) {
                // Transferir taxa para a tesouraria
                require(
                    usdtToken.transfer(treasuryVault, platformFee),
                    "Fee transfer failed"
                );
                
                emit FeeCollectedToTreasury(platformFee, block.timestamp);
            }
        }
    }
    
    /**
     * @dev Sacar ganhos
     */
    function withdraw() external nonReentrant marketResolved {
        uint256 userBetOnWinning = userBets[msg.sender][winningOption];
        require(userBetOnWinning > 0, "No winning bet");
        
        // Calcular ganhos
        uint256 totalWinningBets = optionTotalBets[winningOption];
        uint256 totalLosingBets = totalVolume - totalWinningBets;
        
        // Ganhos = aposta + (aposta / total_vencedor) * total_perdedor * (1 - taxa)
        uint256 winnings = userBetOnWinning;
        if (totalLosingBets > 0) {
            uint256 profit = (userBetOnWinning * totalLosingBets) / totalWinningBets;
            uint256 fee = (profit * PLATFORM_FEE) / 10000;
            winnings += profit - fee;
        }
        
        // Zerar aposta do usuário
        userBets[msg.sender][winningOption] = 0;
        
        // Transferir ganhos
        require(usdtToken.transfer(msg.sender, winnings), "Transfer failed");
        
        emit Withdrawal(msg.sender, winnings, block.timestamp);
    }
    
    /**
     * @dev Verificar se mercado está ativo
     */
    function isActive() public view returns (bool) {
        return block.timestamp < endTime && !isResolved;
    }
    
    /**
     * @dev Obter probabilidades atuais
     */
    function getCurrentOdds() external view returns (uint256[] memory odds) {
        odds = new uint256[](options.length);
        
        if (totalVolume == 0) {
            // Odds iguais se não há apostas
            for (uint256 i = 0; i < options.length; i++) {
                odds[i] = 200; // 2.00x
            }
        } else {
            for (uint256 i = 0; i < options.length; i++) {
                if (optionTotalBets[i] == 0) {
                    odds[i] = 1000; // 10.00x se ninguém apostou
                } else {
                    // Odds = total_volume / aposta_opcao
                    odds[i] = (totalVolume * 100) / optionTotalBets[i];
                }
            }
        }
        
        return odds;
    }
    
    /**
     * @dev Obter probabilidades em porcentagem
     */
    function getProbabilities() external view returns (uint256[] memory probabilities) {
        probabilities = new uint256[](options.length);
        
        if (totalVolume == 0) {
            // Probabilidades iguais se não há apostas
            uint256 equalProb = 10000 / options.length; // Base 10000 (100.00%)
            for (uint256 i = 0; i < options.length; i++) {
                probabilities[i] = equalProb;
            }
        } else {
            for (uint256 i = 0; i < options.length; i++) {
                // Probabilidade = (aposta_opcao / total_volume) * 10000
                probabilities[i] = (optionTotalBets[i] * 10000) / totalVolume;
            }
        }
        
        return probabilities;
    }
    
    /**
     * @dev Obter informações do mercado
     */
    function getMarketInfo() external view returns (
        string memory _question,
        string memory _description,
        string[] memory _options,
        uint256 _endTime,
        uint256 _totalVolume,
        uint256 _totalBettors,
        bool _isActive,
        bool _isResolved,
        uint256 _winningOption
    ) {
        return (
            question,
            description,
            options,
            endTime,
            totalVolume,
            totalBettors,
            isActive(),
            isResolved,
            winningOption
        );
    }
    
    /**
     * @dev Obter apostas do usuário
     */
    function getUserBets(address _user) external view returns (uint256[] memory bets) {
        bets = new uint256[](options.length);
        for (uint256 i = 0; i < options.length; i++) {
            bets[i] = userBets[_user][i];
        }
        return bets;
    }
    
    /**
     * @dev Pausar mercado (emergência)
     */
    function pause() external onlyCreator {
        _pause();
    }
    
    /**
     * @dev Despausar mercado
     */
    function unpause() external onlyCreator {
        _unpause();
    }
}