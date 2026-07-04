// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DemoDistributor
/// @notice Simplified demo USDC distributor for the EcoXchange distribution
///         simulation on Base Sepolia. Holds test USDC and pays it out
///         pro-rata to a list of holder wallets. In production this is the
///         ERC-3643 distribution mechanism gated by the identity registry;
///         here shares are passed in directly so the settlement loop can be
///         demonstrated with real testnet transfers.
/// @dev    TESTNET DEMO ONLY. Not the production distribution mechanism.
contract DemoDistributor is Ownable {
    IERC20 public usdc;
    address public oracleBridge;

    struct Distribution {
        uint256 totalAmount;
        uint256 recipientCount;
        uint256 timestamp;
        uint256 periodStart;
    }

    Distribution[] public distributions;

    event DistributionExecuted(
        uint256 indexed distributionId,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 periodStart
    );

    event ShareDistributed(
        uint256 indexed distributionId,
        address indexed recipient,
        uint256 amount
    );

    constructor(address _usdc, address _oracleBridge) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        oracleBridge = _oracleBridge;
    }

    /// @notice Distribute USDC pro-rata to a list of holders
    /// @param recipients Array of holder wallet addresses
    /// @param shares Array of share amounts (basis points out of 10000)
    /// @param totalAmount Total USDC to distribute (in USDC units, 6 decimals)
    /// @param periodStart Unix timestamp of the verified production period
    function distribute(
        address[] calldata recipients,
        uint256[] calldata shares,
        uint256 totalAmount,
        uint256 periodStart
    ) external onlyOwner {
        require(recipients.length == shares.length, "Length mismatch");
        require(recipients.length > 0, "No recipients");

        uint256 distributionId = distributions.length;

        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
        require(totalShares == 10000, "Shares must sum to 10000 bps");

        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 amount = (totalAmount * shares[i]) / 10000;
            require(usdc.transfer(recipients[i], amount), "Transfer failed");
            emit ShareDistributed(distributionId, recipients[i], amount);
        }

        distributions.push(Distribution({
            totalAmount: totalAmount,
            recipientCount: recipients.length,
            timestamp: block.timestamp,
            periodStart: periodStart
        }));

        emit DistributionExecuted(distributionId, totalAmount, recipients.length, periodStart);
    }

    function getDistributionCount() external view returns (uint256) {
        return distributions.length;
    }

    /// @notice Recover leftover test USDC (or any ERC-20 mistakenly sent here).
    ///         Demo escape hatch so faucet USDC is never stranded.
    function withdraw(address _token, uint256 _amount) external onlyOwner {
        require(IERC20(_token).transfer(owner(), _amount), "Withdraw failed");
    }
}
