// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { MockERC20 } from "./MockERC20.sol";

contract NoReturnToken is MockERC20 {
    constructor() MockERC20("No Return Token", "NORET") { }

    function transfer(address to, uint256 value) public override returns (bool) {
        super.transfer(to, value);
        assembly {
            return(0, 0)
        }
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        super.transferFrom(from, to, value);
        assembly {
            return(0, 0)
        }
    }
}

