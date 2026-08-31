// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IBasketVault {
    function components() external view returns (address[] memory);
    function depositFor(address receiver, uint256[] calldata maxAmountsIn, uint256 minSharesOut)
        external
        returns (uint256 shares);
    function redeem(uint256 shares, uint256[] calldata minAmountsOut)
        external
        returns (uint256[] memory amountsOut);
}

