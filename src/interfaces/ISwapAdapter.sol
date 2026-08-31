// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ISwapAdapter {
    function weth() external view returns (address);
    function isSupportedToken(address token) external view returns (bool);
    function quoteWETHToToken(address token, uint256 amountIn) external returns (uint256 amountOut);
    function quoteTokenToWETH(address token, uint256 amountIn) external returns (uint256 amountOut);

    function swapWETHToToken(
        address token,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);

    function swapTokenToWETH(
        address token,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);
}

