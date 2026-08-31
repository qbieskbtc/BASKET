// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { MockERC20 } from "./MockERC20.sol";

contract FeeOnTransferToken is MockERC20 {
    constructor() MockERC20("Fee Token", "FEE") { }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || value == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = value / 100;
        super._update(from, to, value - fee);
        super._update(from, address(0xdead), fee);
    }
}
