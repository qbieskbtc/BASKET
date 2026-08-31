// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { BasketVault } from "./BasketVault.sol";
import { IRouteValidator } from "./interfaces/IRouteValidator.sol";

contract BasketFactory {
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_COMPONENTS = 2;
    uint256 public constant MAX_COMPONENTS = 10;

    IRouteValidator public immutable routeValidator;
    address[] private _baskets;

    event BasketCreated(
        address indexed basket,
        address indexed creator,
        string name,
        string symbol,
        address[] components,
        uint16[] weights,
        uint256 timestamp
    );

    error InvalidArrayLength();
    error InvalidComponentCount();
    error InvalidComponent(address component);
    error DuplicateComponent(address component);
    error InvalidWeight();
    error UnsupportedToken(address token);

    constructor(address routeValidator_) {
        routeValidator = IRouteValidator(routeValidator_);
    }

    function createBasket(
        string calldata name,
        string calldata symbol,
        address[] calldata components,
        uint16[] calldata weights
    ) external returns (address basket) {
        _validateComponents(components, weights);

        basket = address(new BasketVault(name, symbol, msg.sender, components, weights));
        _baskets.push(basket);

        emit BasketCreated(basket, msg.sender, name, symbol, components, weights, block.timestamp);
    }

    function allBaskets() external view returns (address[] memory) {
        return _baskets;
    }

    function basketCount() external view returns (uint256) {
        return _baskets.length;
    }

    function basketAt(uint256 index) external view returns (address) {
        return _baskets[index];
    }

    function _validateComponents(address[] calldata components, uint16[] calldata weights)
        private
        view
    {
        if (components.length != weights.length) revert InvalidArrayLength();
        if (components.length < MIN_COMPONENTS || components.length > MAX_COMPONENTS) {
            revert InvalidComponentCount();
        }

        uint256 weightSum;
        for (uint256 i; i < components.length; ++i) {
            address component = components[i];
            if (component == address(0)) revert InvalidComponent(component);
            if (weights[i] == 0) revert InvalidWeight();
            weightSum += weights[i];

            if (address(routeValidator) != address(0) && !routeValidator.supportsToken(component)) {
                revert UnsupportedToken(component);
            }

            for (uint256 j = i + 1; j < components.length; ++j) {
                if (component == components[j]) revert DuplicateComponent(component);
            }
        }

        if (weightSum != BPS) revert InvalidWeight();
    }
}

