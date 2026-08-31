// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IRouteValidator } from "../interfaces/IRouteValidator.sol";
import { ISwapAdapter } from "../interfaces/ISwapAdapter.sol";
import { IQuoterV2 } from "../interfaces/uniswap/IQuoterV2.sol";
import { ISwapRouter } from "../interfaces/uniswap/ISwapRouter.sol";
import { IUniswapV3Factory } from "../interfaces/uniswap/IUniswapV3Factory.sol";
import { IUniswapV3Pool } from "../interfaces/uniswap/IUniswapV3Pool.sol";

contract PonsV3Adapter is ISwapAdapter, IRouteValidator {
    using SafeERC20 for IERC20;

    address public immutable weth;
    IUniswapV3Factory public immutable factory;
    ISwapRouter public immutable swapRouter;
    IQuoterV2 public immutable quoter;
    uint24 public immutable poolFee;

    error ExpiredDeadline();
    error InvalidAddress();
    error InvalidAmount();
    error UnsupportedToken(address token);
    error InvalidPool(address pool);
    error InsufficientOutput(uint256 amountOut, uint256 minAmountOut);

    constructor(
        address weth_,
        address factory_,
        address swapRouter_,
        address quoter_,
        uint24 poolFee_
    ) {
        if (
            weth_ == address(0) || factory_ == address(0) || swapRouter_ == address(0)
                || quoter_ == address(0) || poolFee_ == 0
        ) {
            revert InvalidAddress();
        }

        weth = weth_;
        factory = IUniswapV3Factory(factory_);
        swapRouter = ISwapRouter(swapRouter_);
        quoter = IQuoterV2(quoter_);
        poolFee = poolFee_;
    }

    function isSupportedToken(address token) public view returns (bool) {
        return _validatedPool(token) != address(0);
    }

    function supportsToken(address token) external view returns (bool) {
        return isSupportedToken(token);
    }

    function quoteWETHToToken(address token, uint256 amountIn)
        external
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InvalidAmount();
        _requireSupported(token);
        (amountOut,,,) = quoter.quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: weth,
                tokenOut: token,
                amountIn: amountIn,
                fee: poolFee,
                sqrtPriceLimitX96: 0
            })
        );
    }

    function quoteTokenToWETH(address token, uint256 amountIn)
        external
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InvalidAmount();
        _requireSupported(token);
        (amountOut,,,) = quoter.quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: token,
                tokenOut: weth,
                amountIn: amountIn,
                fee: poolFee,
                sqrtPriceLimitX96: 0
            })
        );
    }

    function swapWETHToToken(
        address token,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        _validateSwap(token, amountIn, minAmountOut, recipient, deadline);

        IERC20(weth).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(weth).forceApprove(address(swapRouter), amountIn);
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: token,
                fee: poolFee,
                recipient: recipient,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20(weth).forceApprove(address(swapRouter), 0);

        if (amountOut < minAmountOut) revert InsufficientOutput(amountOut, minAmountOut);
    }

    function swapTokenToWETH(
        address token,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        _validateSwap(token, amountIn, minAmountOut, recipient, deadline);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(token).forceApprove(address(swapRouter), amountIn);
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: token,
                tokenOut: weth,
                fee: poolFee,
                recipient: recipient,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20(token).forceApprove(address(swapRouter), 0);

        if (amountOut < minAmountOut) revert InsufficientOutput(amountOut, minAmountOut);
    }

    function _validateSwap(
        address token,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) private view {
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (amountIn == 0 || minAmountOut == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidAddress();
        _requireSupported(token);
    }

    function _requireSupported(address token) private view {
        if (_validatedPool(token) == address(0)) revert UnsupportedToken(token);
    }

    function _validatedPool(address token) private view returns (address pool) {
        if (token == address(0) || token == weth) return address(0);

        pool = factory.getPool(weth, token, poolFee);
        if (pool == address(0) || pool.code.length == 0) return address(0);

        try IUniswapV3Pool(pool).fee() returns (uint24 fee_) {
            if (fee_ != poolFee) return address(0);
        } catch {
            return address(0);
        }

        try IUniswapV3Pool(pool).token0() returns (address token0) {
            try IUniswapV3Pool(pool).token1() returns (address token1) {
                if (!((token0 == weth && token1 == token) || (token0 == token && token1 == weth))) {
                    return address(0);
                }
            } catch {
                return address(0);
            }
        } catch {
            return address(0);
        }

        try IUniswapV3Pool(pool).liquidity() returns (uint128 liquidity) {
            if (liquidity == 0) return address(0);
        } catch {
            return address(0);
        }
    }
}
