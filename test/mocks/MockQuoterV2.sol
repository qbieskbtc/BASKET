// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IQuoterV2 } from "../../src/interfaces/uniswap/IQuoterV2.sol";

contract MockQuoterV2 is IQuoterV2 {
    mapping(bytes32 => uint256) public rates;

    function setRate(address tokenIn, address tokenOut, uint24 fee, uint256 rate) external {
        rates[keccak256(abi.encode(tokenIn, tokenOut, fee))] = rate;
    }

    function quoteExactInputSingle(QuoteExactInputSingleParams calldata params)
        external
        view
        returns (
            uint256 amountOut,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        )
    {
        uint256 rate = rates[keccak256(abi.encode(params.tokenIn, params.tokenOut, params.fee))];
        amountOut = (params.amountIn * rate) / 1 ether;
        sqrtPriceX96After = 0;
        initializedTicksCrossed = 0;
        gasEstimate = 100_000;
    }
}

