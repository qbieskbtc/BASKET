// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ISwapAdapter } from "../../src/interfaces/ISwapAdapter.sol";
import { MockERC20 } from "./MockERC20.sol";
import { MockWETH } from "./MockWETH.sol";

contract MockSwapAdapter is ISwapAdapter {
    using SafeERC20 for IERC20;

    address public immutable weth;
    mapping(address => bool) public supported;
    mapping(address => uint256) public wethToTokenRate;
    mapping(address => uint256) public tokenToWethRate;

    error Expired();
    error Unsupported();
    error InsufficientOutput();
    error ZeroMinimum();

    constructor(address weth_) {
        weth = weth_;
    }

    function setSupported(address token, bool value) external {
        supported[token] = value;
    }

    function setRates(address token, uint256 wethToTokenRate_, uint256 tokenToWethRate_) external {
        wethToTokenRate[token] = wethToTokenRate_;
        tokenToWethRate[token] = tokenToWethRate_;
    }

    function isSupportedToken(address token) external view returns (bool) {
        return supported[token];
    }

    function quoteWETHToToken(address token, uint256 amountIn) external view returns (uint256) {
        return (amountIn * wethToTokenRate[token]) / 1 ether;
    }

    function quoteTokenToWETH(address token, uint256 amountIn) external view returns (uint256) {
        return (amountIn * tokenToWethRate[token]) / 1 ether;
    }

    function swapWETHToToken(
        address token,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert Expired();
        if (!supported[token]) revert Unsupported();
        if (minAmountOut == 0) revert ZeroMinimum();

        amountOut = (amountIn * wethToTokenRate[token]) / 1 ether;
        if (amountOut < minAmountOut) revert InsufficientOutput();

        IERC20(weth).safeTransferFrom(msg.sender, address(this), amountIn);
        MockERC20(token).mint(recipient, amountOut);
    }

    function swapTokenToWETH(
        address token,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert Expired();
        if (!supported[token]) revert Unsupported();
        if (minAmountOut == 0) revert ZeroMinimum();

        amountOut = (amountIn * tokenToWethRate[token]) / 1 ether;
        if (amountOut < minAmountOut) revert InsufficientOutput();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amountIn);
        MockWETH(payable(weth)).mint(recipient, amountOut);
    }
}

