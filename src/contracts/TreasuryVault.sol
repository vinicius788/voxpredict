// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TreasuryVault
 * @dev Vault para acumular e gerenciar as taxas da plataforma VoxPredict
 */
contract TreasuryVault is ReentrancyGuard, Ownable {
    IERC20 public immutable usdtToken;
    
    // Endereço da Safe da VoxPredict (Ethereum Mainnet)
    address public constant VOXPREDICT_SAFE = 0xe53a041c7308a5a8ECB8d1Ba8e9A8B8C8B8B8f35e;
    
    // Saldos e estatísticas
    uint256 public platformBalance;      // Saldo atual acumulado
    uint256 public totalCollected;      // Total já coletado historicamente
    uint256 public totalWithdrawn;      // Total já sacado para a Safe
    uint256 public lastWithdrawalTime;  // Timestamp do último saque
    
    // Controle de mercados
    mapping(address => bool) public authorizedMarkets;
    uint256 public activeMarketsCount;
    
    // Estatísticas mensais
    mapping(uint256 => uint256) public monthlyRevenue; // ano-mês => receita
    
    // Eventos
    event FeeCollected(
        address indexed market,
        uint256 amount,
        uint256 timestamp
    );
    
    event WithdrawnToSafe(
        uint256 amount,
        address indexed safe,
        uint256 timestamp
    );
    
    event MarketAuthorized(address indexed market);
    event MarketDeauthorized(address indexed market);
    
    modifier onlyAuthorizedMarket() {
        require(authorizedMarkets[msg.sender], "Not authorized market");
        _;
    }
    
    constructor(address _usdtToken) {
        require(_usdtToken != address(0), "Invalid USDT token");
        usdtToken = IERC20(_usdtToken);
    }
    
    /**
     * @dev Coletar taxa de um mercado (chamado automaticamente pelos contratos de mercado)
     */
    function collectFee(uint256 amount) external onlyAuthorizedMarket nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDT do mercado para este contrato
        require(
            usdtToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        // Atualizar saldos
        platformBalance += amount;
        totalCollected += amount;
        
        // Atualizar estatísticas mensais
        uint256 currentMonth = getCurrentMonth();
        monthlyRevenue[currentMonth] += amount;
        
        emit FeeCollected(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Sacar todo o saldo acumulado para a Safe da VoxPredict
     */
    function withdrawToSafe() external onlyOwner nonReentrant {
        uint256 amount = platformBalance;
        require(amount > 0, "No balance to withdraw");
        
        // Zerar saldo
        platformBalance = 0;
        totalWithdrawn += amount;
        lastWithdrawalTime = block.timestamp;
        
        // Transferir para a Safe
        require(
            usdtToken.transfer(VOXPREDICT_SAFE, amount),
            "Transfer to Safe failed"
        );
        
        emit WithdrawnToSafe(amount, VOXPREDICT_SAFE, block.timestamp);
    }
    
    /**
     * @dev Autorizar um mercado a coletar taxas
     */
    function authorizeMarket(address market) external onlyOwner {
        require(market != address(0), "Invalid market address");
        require(!authorizedMarkets[market], "Market already authorized");
        
        authorizedMarkets[market] = true;
        activeMarketsCount++;
        
        emit MarketAuthorized(market);
    }
    
    /**
     * @dev Desautorizar um mercado
     */
    function deauthorizeMarket(address market) external onlyOwner {
        require(authorizedMarkets[market], "Market not authorized");
        
        authorizedMarkets[market] = false;
        if (activeMarketsCount > 0) {
            activeMarketsCount--;
        }
        
        emit MarketDeauthorized(market);
    }
    
    /**
     * @dev Obter receita do mês atual
     */
    function getCurrentMonthRevenue() external view returns (uint256) {
        return monthlyRevenue[getCurrentMonth()];
    }
    
    /**
     * @dev Obter receita de um mês específico
     */
    function getMonthRevenue(uint256 year, uint256 month) external view returns (uint256) {
        require(month >= 1 && month <= 12, "Invalid month");
        uint256 monthKey = year * 100 + month;
        return monthlyRevenue[monthKey];
    }
    
    /**
     * @dev Obter estatísticas completas da tesouraria
     */
    function getTreasuryStats() external view returns (
        uint256 _platformBalance,
        uint256 _totalCollected,
        uint256 _totalWithdrawn,
        uint256 _lastWithdrawalTime,
        uint256 _activeMarkets,
        uint256 _monthlyRevenue
    ) {
        return (
            platformBalance,
            totalCollected,
            totalWithdrawn,
            lastWithdrawalTime,
            activeMarketsCount,
            monthlyRevenue[getCurrentMonth()]
        );
    }
    
    /**
     * @dev Verificar se um mercado está autorizado
     */
    function isMarketAuthorized(address market) external view returns (bool) {
        return authorizedMarkets[market];
    }
    
    /**
     * @dev Obter chave do mês atual (YYYYMM)
     */
    function getCurrentMonth() internal view returns (uint256) {
        // Simplificado - em produção usar biblioteca de data
        uint256 year = 2024; // Placeholder
        uint256 month = 2;   // Placeholder
        return year * 100 + month;
    }
    
    /**
     * @dev Saque de emergência (apenas owner)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev Obter saldo do contrato
     */
    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }
}