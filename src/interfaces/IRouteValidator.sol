// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IRouteValidator {
    function supportsToken(address token) external view returns (bool);
}

