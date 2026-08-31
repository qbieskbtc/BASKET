// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { MockERC20 } from "./MockERC20.sol";

contract FalseReturnToken is MockERC20 {
    constructor() MockERC20("False Return Token", "FALSE") { }

    function transfer(address to, uint256 value) public override returns (bool) {
        super.transfer(to, value);
        return false;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        super.transferFrom(from, to, value);
        return false;
    }
}

