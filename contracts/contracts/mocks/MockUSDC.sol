// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice 6-decimal ERC-20 stand-in for Circle test USDC, used only in the
///         local hardhat test suite. On Base Sepolia the real Circle test
///         USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e) is used instead.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
