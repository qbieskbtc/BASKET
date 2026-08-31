// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IBasketVault } from "./interfaces/IBasketVault.sol";
import { ISwapAdapter } from "./interfaces/ISwapAdapter.sol";
import { IWETH } from "./interfaces/IWETH.sol";

contract BasketRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISwapAdapter public immutable swapAdapter;
    IWETH public immutable weth;

    struct BuyBasketWithETHParams {
        address vault;
        address recipient;
        uint256 minSharesOut;
        uint256 deadline;
        uint256[] wethAmountsIn;
        uint256[] minComponentAmountsOut;
    }

    struct RedeemBasketToETHParams {
        address vault;
        address recipient;
        uint256 shares;
        uint256 deadline;
        uint256[] minComponentAmountsOut;
        uint256[] minWethAmountsOut;
        uint256 minETHOut;
    }

    event BasketBoughtWithETH(
        address indexed caller,
        address indexed vault,
        address indexed recipient,
        uint256 ethIn,
        uint256 sharesOut
    );
    event BasketRedeemedToETH(
        address indexed caller,
        address indexed vault,
        address indexed recipient,
        uint256 sharesIn,
        uint256 ethOut
    );

    error ExpiredDeadline();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidArrayLength();
    error UnsupportedToken(address token);
    error InsufficientETHOut(uint256 amountOut, uint256 minAmountOut);
    error ETHTransferFailed();

    constructor(address swapAdapter_) {
        if (swapAdapter_ == address(0)) revert InvalidAddress();
        swapAdapter = ISwapAdapter(swapAdapter_);
        weth = IWETH(ISwapAdapter(swapAdapter_).weth());
        if (address(weth) == address(0)) revert InvalidAddress();
    }

    receive() external payable {
        if (msg.sender != address(weth)) revert InvalidAddress();
    }

    function buyBasketWithETH(BuyBasketWithETHParams calldata params)
        external
        payable
        nonReentrant
        returns (uint256 sharesOut)
    {
        _requireLive(params.deadline);
        if (params.vault == address(0) || params.recipient == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert InvalidAmount();

        address[] memory components = IBasketVault(params.vault).components();
        uint256 componentCount = components.length;
        if (
            params.wethAmountsIn.length != componentCount
                || params.minComponentAmountsOut.length != componentCount
        ) {
            revert InvalidArrayLength();
        }

        uint256 totalWethIn;
        uint256[] memory componentAmounts = new uint256[](componentCount);
        uint256[] memory beforeBalances = new uint256[](componentCount);
        for (uint256 i; i < componentCount; ++i) {
            totalWethIn += params.wethAmountsIn[i];
            beforeBalances[i] = IERC20(components[i]).balanceOf(address(this));
        }
        if (totalWethIn == 0 || totalWethIn > msg.value) revert InvalidAmount();

        weth.deposit{ value: msg.value }();

        for (uint256 i; i < componentCount; ++i) {
            uint256 wethAmount = params.wethAmountsIn[i];
            if (wethAmount == 0) revert InvalidAmount();

            if (components[i] == address(weth)) {
                if (wethAmount < params.minComponentAmountsOut[i]) revert InvalidAmount();
                componentAmounts[i] = wethAmount;
            } else {
                if (!swapAdapter.isSupportedToken(components[i])) {
                    revert UnsupportedToken(components[i]);
                }
                IERC20(address(weth)).forceApprove(address(swapAdapter), wethAmount);
                componentAmounts[i] = swapAdapter.swapWETHToToken(
                    components[i],
                    wethAmount,
                    params.minComponentAmountsOut[i],
                    address(this),
                    params.deadline
                );
                IERC20(address(weth)).forceApprove(address(swapAdapter), 0);
            }
        }

        for (uint256 i; i < componentCount; ++i) {
            IERC20(components[i]).forceApprove(params.vault, componentAmounts[i]);
        }
        sharesOut = IBasketVault(params.vault)
            .depositFor(params.recipient, componentAmounts, params.minSharesOut);
        for (uint256 i; i < componentCount; ++i) {
            IERC20(components[i]).forceApprove(params.vault, 0);
        }

        for (uint256 i; i < componentCount; ++i) {
            uint256 leftover = IERC20(components[i]).balanceOf(address(this)) - beforeBalances[i];
            if (leftover > 0) IERC20(components[i]).safeTransfer(params.recipient, leftover);
        }

        _refundWETHAsETH(params.recipient);

        emit BasketBoughtWithETH(msg.sender, params.vault, params.recipient, msg.value, sharesOut);
    }

    function redeemBasketToETH(RedeemBasketToETHParams calldata params)
        external
        nonReentrant
        returns (uint256 ethOut)
    {
        _requireLive(params.deadline);
        if (params.vault == address(0) || params.recipient == address(0)) revert InvalidAddress();
        if (params.shares == 0) revert InvalidAmount();

        address[] memory components = IBasketVault(params.vault).components();
        uint256 componentCount = components.length;
        if (
            params.minComponentAmountsOut.length != componentCount
                || params.minWethAmountsOut.length != componentCount
        ) {
            revert InvalidArrayLength();
        }

        uint256 wethBefore = IERC20(address(weth)).balanceOf(address(this));

        IERC20(params.vault).safeTransferFrom(msg.sender, address(this), params.shares);
        uint256[] memory amountsOut =
            IBasketVault(params.vault).redeem(params.shares, params.minComponentAmountsOut);

        for (uint256 i; i < componentCount; ++i) {
            if (amountsOut[i] == 0) continue;

            if (components[i] == address(weth)) {
                if (amountsOut[i] < params.minWethAmountsOut[i]) {
                    revert InsufficientETHOut(amountsOut[i], params.minWethAmountsOut[i]);
                }
            } else {
                if (!swapAdapter.isSupportedToken(components[i])) {
                    revert UnsupportedToken(components[i]);
                }
                IERC20(components[i]).forceApprove(address(swapAdapter), amountsOut[i]);
                swapAdapter.swapTokenToWETH(
                    components[i],
                    amountsOut[i],
                    params.minWethAmountsOut[i],
                    address(this),
                    params.deadline
                );
                IERC20(components[i]).forceApprove(address(swapAdapter), 0);
            }
        }

        ethOut = IERC20(address(weth)).balanceOf(address(this)) - wethBefore;
        if (ethOut < params.minETHOut) revert InsufficientETHOut(ethOut, params.minETHOut);
        weth.withdraw(ethOut);
        _sendETH(params.recipient, ethOut);

        emit BasketRedeemedToETH(msg.sender, params.vault, params.recipient, params.shares, ethOut);
    }

    function _requireLive(uint256 deadline) private view {
        if (block.timestamp > deadline) revert ExpiredDeadline();
    }

    function _refundWETHAsETH(address recipient) private {
        uint256 wethBalance = IERC20(address(weth)).balanceOf(address(this));
        if (wethBalance == 0) return;

        weth.withdraw(wethBalance);
        _sendETH(recipient, wethBalance);
    }

    function _sendETH(address recipient, uint256 amount) private {
        (bool success,) = recipient.call{ value: amount }("");
        if (!success) revert ETHTransferFailed();
    }
}
