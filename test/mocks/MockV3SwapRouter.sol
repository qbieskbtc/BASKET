// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ISwapRouter } from "../../src/interfaces/uniswap/ISwapRouter.sol";
import { MockERC20 } from "./MockERC20.sol";
import { MockWETH } from "./MockWETH.sol";

contract MockV3SwapRouter is ISwapRouter {
    using SafeERC20 for IERC20;

    address public immutable weth;
    mapping(bytes32 => uint256) public rates;

    constructor(address weth_) {
        weth = weth_;
    }

    function setRate(address tokenIn, address tokenOut, uint24 fee, uint256 rate) external {
        rates[keccak256(abi.encode(tokenIn, tokenOut, fee))] = rate;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        uint256 rate = rates[keccak256(abi.encode(params.tokenIn, params.tokenOut, params.fee))];
        amountOut = (params.amountIn * rate) / 1 ether;
        require(amountOut >= params.amountOutMinimum, "TOO_LITTLE_RECEIVED");

        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        if (params.tokenOut == weth) {
            MockWETH(payable(weth)).mint(params.recipient, amountOut);
        } else {
            MockERC20(params.tokenOut).mint(params.recipient, amountOut);
        }
    }
}

