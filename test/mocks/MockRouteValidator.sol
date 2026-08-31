// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IRouteValidator } from "../../src/interfaces/IRouteValidator.sol";

contract MockRouteValidator is IRouteValidator {
    mapping(address => bool) public supported;

    function setSupported(address token, bool value) external {
        supported[token] = value;
    }

    function supportsToken(address token) external view returns (bool) {
        return supported[token];
    }
}

