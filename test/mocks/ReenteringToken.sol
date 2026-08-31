// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { MockERC20 } from "./MockERC20.sol";

interface IReentryTarget {
    function deposit(uint256[] calldata maxAmountsIn, uint256 minSharesOut)
        external
        returns (uint256);
}

contract ReenteringToken is MockERC20 {
    IReentryTarget public target;
    bool public attack;

    constructor() MockERC20("Reentering Token", "REENT") { }

    function setTarget(address target_) external {
        target = IReentryTarget(target_);
    }

    function setAttack(bool attack_) external {
        attack = attack_;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (attack) {
            uint256[] memory amounts = new uint256[](2);
            amounts[0] = 1 ether;
            amounts[1] = 1 ether;
            target.deposit(amounts, 0);
        }
        return super.transferFrom(from, to, value);
    }
}

