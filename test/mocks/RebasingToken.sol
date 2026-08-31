// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { MockERC20 } from "./MockERC20.sol";

contract RebasingToken is MockERC20 {
    constructor() MockERC20("Rebasing Token", "REBASE") { }

    function rebaseVault(address vault, uint256 amount) external {
        _mint(vault, amount);
    }
}

