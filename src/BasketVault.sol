// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BasketVault is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_COMPONENTS = 10;

    address public immutable factory;
    address public immutable creator;
    uint256 public immutable creationTimestamp;

    address[] private _components;
    uint16[] private _targetWeights;

    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    event Deposited(address indexed caller, address indexed receiver, uint256 shares);
    event Redeemed(address indexed caller, address indexed receiver, uint256 shares);

    error InvalidArrayLength();
    error InvalidComponentCount();
    error InvalidComponent(address component);
    error DuplicateComponent(address component);
    error InvalidReceiver(address receiver);
    error InvalidWeight();
    error InvalidShareAmount();
    error InsufficientSharesOut(uint256 shares, uint256 minSharesOut);
    error TransferAmountMismatch(address token, uint256 expected, uint256 received);

    constructor(
        string memory name_,
        string memory symbol_,
        address creator_,
        address[] memory components_,
        uint16[] memory targetWeights_
    ) ERC20(name_, symbol_) {
        if (components_.length != targetWeights_.length) {
            revert InvalidArrayLength();
        }
        if (components_.length < 2 || components_.length > MAX_COMPONENTS) {
            revert InvalidComponentCount();
        }

        uint256 weightSum;
        for (uint256 i; i < components_.length; ++i) {
            if (components_[i] == address(0)) revert InvalidComponent(components_[i]);
            if (targetWeights_[i] == 0) revert InvalidWeight();
            weightSum += targetWeights_[i];
            for (uint256 j = i + 1; j < components_.length; ++j) {
                if (components_[i] == components_[j]) revert DuplicateComponent(components_[i]);
            }
            _components.push(components_[i]);
            _targetWeights.push(targetWeights_[i]);
        }
        if (weightSum != BPS) revert InvalidWeight();

        factory = msg.sender;
        creator = creator_;
        creationTimestamp = block.timestamp;
    }

    function components() external view returns (address[] memory) {
        return _components;
    }

    function targetWeights() external view returns (uint16[] memory) {
        return _targetWeights;
    }

    function componentCount() external view returns (uint256) {
        return _components.length;
    }

    function getComponent(uint256 index) external view returns (address) {
        return _components[index];
    }

    function getTargetWeight(uint256 index) external view returns (uint16) {
        return _targetWeights[index];
    }

    function deposit(uint256[] calldata maxAmountsIn, uint256 minSharesOut)
        external
        nonReentrant
        returns (uint256 shares)
    {
        shares = _depositFor(msg.sender, maxAmountsIn, minSharesOut);
    }

    function depositFor(address receiver, uint256[] calldata maxAmountsIn, uint256 minSharesOut)
        public
        nonReentrant
        returns (uint256 shares)
    {
        shares = _depositFor(receiver, maxAmountsIn, minSharesOut);
    }

    function _depositFor(address receiver, uint256[] calldata maxAmountsIn, uint256 minSharesOut)
        private
        returns (uint256 shares)
    {
        if (receiver == address(0)) revert InvalidReceiver(receiver);
        if (maxAmountsIn.length != _components.length) revert InvalidArrayLength();

        uint256 supply = totalSupply();
        uint256[] memory requiredAmounts = new uint256[](_components.length);

        if (supply == 0) {
            shares = type(uint256).max;
            for (uint256 i; i < maxAmountsIn.length; ++i) {
                if (maxAmountsIn[i] == 0) revert InvalidShareAmount();
                requiredAmounts[i] = maxAmountsIn[i];
                if (maxAmountsIn[i] < shares) shares = maxAmountsIn[i];
            }
        } else {
            shares = type(uint256).max;
            for (uint256 i; i < maxAmountsIn.length; ++i) {
                uint256 reserve = IERC20(_components[i]).balanceOf(address(this));
                if (reserve == 0 || maxAmountsIn[i] == 0) revert InvalidShareAmount();
                uint256 candidateShares = (maxAmountsIn[i] * supply) / reserve;
                if (candidateShares < shares) shares = candidateShares;
            }
            if (shares == 0) revert InvalidShareAmount();

            for (uint256 i; i < maxAmountsIn.length; ++i) {
                uint256 reserve = IERC20(_components[i]).balanceOf(address(this));
                requiredAmounts[i] = _ceilDiv(shares * reserve, supply);
                if (requiredAmounts[i] == 0 || requiredAmounts[i] > maxAmountsIn[i]) {
                    revert InvalidShareAmount();
                }
            }
        }

        if (shares < minSharesOut) revert InsufficientSharesOut(shares, minSharesOut);

        for (uint256 i; i < requiredAmounts.length; ++i) {
            IERC20 token = IERC20(_components[i]);
            uint256 beforeBalance = token.balanceOf(address(this));
            token.safeTransferFrom(msg.sender, address(this), requiredAmounts[i]);
            uint256 received = token.balanceOf(address(this)) - beforeBalance;
            if (received != requiredAmounts[i]) {
                revert TransferAmountMismatch(_components[i], requiredAmounts[i], received);
            }
        }

        totalDeposits += 1;
        _mint(receiver, shares);
        emit Deposited(msg.sender, receiver, shares);
    }

    function previewDeposit(uint256[] calldata maxAmountsIn)
        external
        view
        returns (uint256 shares, uint256[] memory requiredAmounts)
    {
        if (maxAmountsIn.length != _components.length) revert InvalidArrayLength();

        uint256 supply = totalSupply();
        requiredAmounts = new uint256[](_components.length);

        if (supply == 0) {
            shares = type(uint256).max;
            for (uint256 i; i < maxAmountsIn.length; ++i) {
                if (maxAmountsIn[i] == 0) revert InvalidShareAmount();
                requiredAmounts[i] = maxAmountsIn[i];
                if (maxAmountsIn[i] < shares) shares = maxAmountsIn[i];
            }
            return (shares, requiredAmounts);
        }

        shares = type(uint256).max;
        for (uint256 i; i < maxAmountsIn.length; ++i) {
            uint256 reserve = IERC20(_components[i]).balanceOf(address(this));
            if (reserve == 0 || maxAmountsIn[i] == 0) revert InvalidShareAmount();
            uint256 candidateShares = (maxAmountsIn[i] * supply) / reserve;
            if (candidateShares < shares) shares = candidateShares;
        }
        if (shares == 0) revert InvalidShareAmount();

        for (uint256 i; i < maxAmountsIn.length; ++i) {
            uint256 reserve = IERC20(_components[i]).balanceOf(address(this));
            requiredAmounts[i] = _ceilDiv(shares * reserve, supply);
        }
    }

    function redeem(uint256 shares, uint256[] calldata minAmountsOut)
        external
        nonReentrant
        returns (uint256[] memory amountsOut)
    {
        amountsOut = _redeemTo(msg.sender, shares, minAmountsOut);
    }

    function redeemTo(address receiver, uint256 shares, uint256[] calldata minAmountsOut)
        public
        nonReentrant
        returns (uint256[] memory amountsOut)
    {
        amountsOut = _redeemTo(receiver, shares, minAmountsOut);
    }

    function _redeemTo(address receiver, uint256 shares, uint256[] calldata minAmountsOut)
        private
        returns (uint256[] memory amountsOut)
    {
        if (receiver == address(0)) revert InvalidReceiver(receiver);
        if (shares == 0 || shares > balanceOf(msg.sender)) revert InvalidShareAmount();
        if (minAmountsOut.length != _components.length) revert InvalidArrayLength();

        uint256 supply = totalSupply();
        amountsOut = new uint256[](_components.length);

        _burn(msg.sender, shares);

        for (uint256 i; i < _components.length; ++i) {
            IERC20 token = IERC20(_components[i]);
            uint256 amount = (token.balanceOf(address(this)) * shares) / supply;
            if (amount < minAmountsOut[i]) {
                revert InsufficientSharesOut(amount, minAmountsOut[i]);
            }
            amountsOut[i] = amount;
            token.safeTransfer(receiver, amount);
        }

        totalWithdrawals += 1;
        emit Redeemed(msg.sender, receiver, shares);
    }

    function _ceilDiv(uint256 a, uint256 b) private pure returns (uint256) {
        return a == 0 ? 0 : ((a - 1) / b) + 1;
    }
}
