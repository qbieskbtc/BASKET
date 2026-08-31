// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract MockUniswapV3Pool {
    address public token0;
    address public token1;
    uint24 public fee;
    uint128 public liquidity;

    constructor(address token0_, address token1_, uint24 fee_, uint128 liquidity_) {
        token0 = token0_;
        token1 = token1_;
        fee = fee_;
        liquidity = liquidity_;
    }

    function setLiquidity(uint128 liquidity_) external {
        liquidity = liquidity_;
    }
}

