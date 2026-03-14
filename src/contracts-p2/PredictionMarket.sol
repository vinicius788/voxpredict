// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract PredictionMarket is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct Market {
        uint256 id;
        string question;
        string description;
        string category;
        uint256 endTime;
        uint256 totalYesAmount;
        uint256 totalNoAmount;
        uint8 outcome; // 0=pending, 1=YES, 2=NO, 3=cancelled
        bool resolved;
        address token;
        uint256 minBet;
        uint256 maxBet;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    uint256 public marketCount;
    uint256 public platformFee = 300; // 3% in bps
    address public treasury;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(address => bool) public allowedTokens;

    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint8 outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event MarketCancelled(uint256 indexed marketId);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Treasury nao pode ser address zero");
        treasury = _treasury;
    }

    function createMarket(
        string memory _question,
        string memory _description,
        string memory _category,
        uint256 _endTime,
        address _token,
        uint256 _minBet,
        uint256 _maxBet
    ) external onlyOwner returns (uint256) {
        require(_endTime > block.timestamp + 1 hours, "End time too soon");
        require(allowedTokens[_token], "Token not allowed");
        require(_minBet > 0, "Invalid min bet");
        require(_maxBet >= _minBet, "Invalid max bet");

        marketCount++;
        markets[marketCount] = Market({
            id: marketCount,
            question: _question,
            description: _description,
            category: _category,
            endTime: _endTime,
            totalYesAmount: 0,
            totalNoAmount: 0,
            outcome: 0,
            resolved: false,
            token: _token,
            minBet: _minBet,
            maxBet: _maxBet
        });

        emit MarketCreated(marketCount, _question, _endTime);
        return marketCount;
    }

    function resolveMarket(uint256 _marketId, uint8 _outcome) external onlyOwner {
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market not found");
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.endTime, "Market not ended");
        if (market.totalYesAmount == 0 || market.totalNoAmount == 0) {
            market.outcome = 3;
            market.resolved = true;
            emit MarketCancelled(_marketId);
            return;
        }
        require(_outcome == 1 || _outcome == 2, "Invalid outcome");

        market.outcome = _outcome;
        market.resolved = true;

        uint256 losingPool = _outcome == 1 ? market.totalNoAmount : market.totalYesAmount;
        uint256 fee = (losingPool * platformFee) / 10000;

        if (fee > 0) {
            IERC20(market.token).safeTransfer(treasury, fee);
        }

        emit MarketResolved(_marketId, _outcome);
    }

    function cancelMarket(uint256 _marketId) external onlyOwner {
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market not found");
        require(!market.resolved, "Already resolved");

        market.outcome = 3;
        market.resolved = true;
        emit MarketCancelled(_marketId);
    }

    function placeBet(uint256 _marketId, bool _isYes, uint256 _amount) external nonReentrant whenNotPaused {
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market not found");
        require(!market.resolved, "Market closed");
        require(block.timestamp < market.endTime, "Market ended");
        require(_amount >= market.minBet, "Below minimum");
        require(_amount <= market.maxBet, "Above maximum");

        IERC20(market.token).safeTransferFrom(msg.sender, address(this), _amount);

        Position storage pos = positions[_marketId][msg.sender];
        if (_isYes) {
            pos.yesAmount += _amount;
            market.totalYesAmount += _amount;
        } else {
            pos.noAmount += _amount;
            market.totalNoAmount += _amount;
        }

        emit BetPlaced(_marketId, msg.sender, _isYes, _amount);
    }

    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market not found");
        require(market.resolved, "Not resolved");
        require(market.outcome != 3, "Market cancelled");

        Position storage pos = positions[_marketId][msg.sender];
        require(!pos.claimed, "Already claimed");
        pos.claimed = true;

        uint256 winnings = calculateWinnings(_marketId, msg.sender);
        require(winnings > 0, "No winnings");

        IERC20(market.token).safeTransfer(msg.sender, winnings);
        emit WinningsClaimed(_marketId, msg.sender, winnings);
    }

    function claimRefund(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market not found");
        require(market.outcome == 3, "Market not cancelled");

        Position storage pos = positions[_marketId][msg.sender];
        require(!pos.claimed, "Already claimed");
        pos.claimed = true;

        uint256 refund = pos.yesAmount + pos.noAmount;
        require(refund > 0, "Nothing to refund");

        IERC20(market.token).safeTransfer(msg.sender, refund);
    }

    function calculateWinnings(uint256 _marketId, address _user) public view returns (uint256) {
        Market storage market = markets[_marketId];
        Position storage pos = positions[_marketId][_user];

        if (!market.resolved || market.outcome == 3) return 0;

        uint256 userWinningAmount = market.outcome == 1 ? pos.yesAmount : pos.noAmount;
        if (userWinningAmount == 0) return 0;

        uint256 winningPool = market.outcome == 1 ? market.totalYesAmount : market.totalNoAmount;
        uint256 losingPool = market.outcome == 1 ? market.totalNoAmount : market.totalYesAmount;

        uint256 feeAmount = (losingPool * platformFee) / 10000;
        uint256 distributableLosingPool = losingPool - feeAmount;

        return userWinningAmount + ((userWinningAmount * distributableLosingPool) / winningPool);
    }

    function getOdds(uint256 _marketId) public view returns (uint256 yesOdds, uint256 noOdds) {
        Market storage market = markets[_marketId];
        uint256 yesPool = market.totalYesAmount;
        uint256 noPool = market.totalNoAmount;

        if (yesPool == 0 && noPool == 0) return (20000, 20000);
        if (yesPool == 0) return (0, 10000);
        if (noPool == 0) return (10000, 0);

        uint256 netMultiplier = 10000 - platformFee;
        yesOdds = ((yesPool * 10000) + (noPool * netMultiplier)) / yesPool;
        noOdds = ((noPool * 10000) + (yesPool * netMultiplier)) / noPool;
    }

    function setAllowedToken(address _token, bool _allowed) external onlyOwner {
        allowedTokens[_token] = _allowed;
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Max 10%");
        platformFee = _fee;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury nao pode ser address zero");
        treasury = _treasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
