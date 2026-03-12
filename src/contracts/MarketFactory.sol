// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PredictionMarket.sol";

/**
 * @title MarketFactory
 * @dev Factory para criar novos mercados preditivos
 */
contract MarketFactory {
    address public owner;
    address public usdtToken;
    uint256 public marketCount;
    
    // Mapping de todos os mercados criados
    mapping(uint256 => address) public markets;
    mapping(address => bool) public isValidMarket;
    
    // Lista de admins autorizados
    mapping(address => bool) public admins;
    
    event MarketCreated(
        uint256 indexed marketId,
        address indexed marketAddress,
        string question,
        address creator,
        uint256 endTime
    );
    
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin");
        _;
    }
    
    constructor(address _usdtToken) {
        owner = msg.sender;
        usdtToken = _usdtToken;
        admins[msg.sender] = true; // Owner é admin por padrão
    }
    
    /**
     * @dev Criar novo mercado preditivo
     */
    function createMarket(
        string memory _question,
        string memory _description,
        string[] memory _options,
        uint256 _endTime,
        uint256 _minBet,
        uint256 _maxBet,
        string memory _category,
        string[] memory _tags
    ) external onlyAdmin returns (address marketAddress) {
        require(_endTime > block.timestamp, "End time must be in future");
        require(_options.length >= 2, "At least 2 options required");
        require(_minBet > 0, "Min bet must be > 0");
        require(_maxBet > _minBet, "Max bet must be > min bet");
        
        // Criar novo contrato de mercado
        PredictionMarket newMarket = new PredictionMarket(
            _question,
            _description,
            _options,
            _endTime,
            _minBet,
            _maxBet,
            _category,
            _tags,
            usdtToken,
            msg.sender
        );
        
        marketAddress = address(newMarket);
        
        // Registrar o mercado
        markets[marketCount] = marketAddress;
        isValidMarket[marketAddress] = true;
        
        emit MarketCreated(
            marketCount,
            marketAddress,
            _question,
            msg.sender,
            _endTime
        );
        
        marketCount++;
        
        return marketAddress;
    }
    
    /**
     * @dev Adicionar admin
     */
    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }
    
    /**
     * @dev Remover admin
     */
    function removeAdmin(address _admin) external onlyOwner {
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }
    
    /**
     * @dev Obter todos os mercados
     */
    function getAllMarkets() external view returns (address[] memory) {
        address[] memory allMarkets = new address[](marketCount);
        for (uint256 i = 0; i < marketCount; i++) {
            allMarkets[i] = markets[i];
        }
        return allMarkets;
    }
    
    /**
     * @dev Obter mercados ativos
     */
    function getActiveMarkets() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Contar mercados ativos
        for (uint256 i = 0; i < marketCount; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.isActive()) {
                activeCount++;
            }
        }
        
        // Criar array com mercados ativos
        address[] memory activeMarkets = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < marketCount; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.isActive()) {
                activeMarkets[index] = markets[i];
                index++;
            }
        }
        
        return activeMarkets;
    }
    
    /**
     * @dev Verificar se endereço é admin
     */
    function isAdmin(address _address) external view returns (bool) {
        return admins[_address] || _address == owner;
    }
}