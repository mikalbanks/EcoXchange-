// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DemoOracleBridge
/// @notice Simplified demo oracle bridge for the EcoXchange distribution
///         simulation on Base Sepolia. In production this write path is a
///         Chainlink Functions consumer; here the owner (demo deployer)
///         writes verification-engine output directly so the end-to-end
///         verification -> oracle -> distribution loop can be demonstrated
///         with real testnet transactions.
/// @dev    TESTNET DEMO ONLY. Not the production oracle mechanism.
contract DemoOracleBridge is Ownable {
    struct ProductionRecord {
        uint256 periodStart;   // Unix timestamp of period start
        uint256 verifiedKwh;   // Verified kWh for the period
        uint256 expectedKwh;   // Expected kWh from physics model
        int256 deviationBps;   // Deviation in basis points (e.g., -300 = -3.0%)
        string engineVersion;  // e.g., "v2.0.0"
        string verdict;        // "VERIFIED" or "FLAGGED"
        uint256 timestamp;     // When this record was written
    }

    mapping(uint256 => ProductionRecord) public records; // periodStart => record
    uint256 public recordCount;
    uint256 public lastWriteTimestamp;

    event ProductionVerified(
        uint256 indexed periodStart,
        uint256 verifiedKwh,
        string verdict,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    function writeVerifiedProduction(
        uint256 _periodStart,
        uint256 _verifiedKwh,
        uint256 _expectedKwh,
        int256 _deviationBps,
        string calldata _engineVersion,
        string calldata _verdict
    ) external onlyOwner {
        records[_periodStart] = ProductionRecord({
            periodStart: _periodStart,
            verifiedKwh: _verifiedKwh,
            expectedKwh: _expectedKwh,
            deviationBps: _deviationBps,
            engineVersion: _engineVersion,
            verdict: _verdict,
            timestamp: block.timestamp
        });
        recordCount++;
        lastWriteTimestamp = block.timestamp;

        emit ProductionVerified(_periodStart, _verifiedKwh, _verdict, block.timestamp);
    }

    function getRecord(uint256 _periodStart) external view returns (ProductionRecord memory) {
        return records[_periodStart];
    }
}
