// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @dev Token USDT para testes (apenas testnet)
 */
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDT
    }
    
    function decimals() public pure override returns (uint8) {
        return 6; // USDT tem 6 decimais
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function faucet() external {
        _mint(msg.sender, 1000 * 10**6); // 1000 USDT grátis
    }
}