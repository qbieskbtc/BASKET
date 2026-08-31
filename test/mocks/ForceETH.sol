// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract ForceETH {
    constructor() payable { }

    function force(address payable target) external {
        selfdestruct(target);
    }
}
