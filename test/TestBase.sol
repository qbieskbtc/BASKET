// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface Vm {
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function expectRevert() external;
    function deal(address who, uint256 newBalance) external;
    function assume(bool condition) external;
    function envOr(string calldata key, string calldata defaultValue)
        external
        view
        returns (string memory);
    function createSelectFork(string calldata urlOrAlias) external returns (uint256 forkId);
}

abstract contract TestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 actual, uint256 expected) internal pure {
        if (actual != expected) {
            revert(string(abi.encodePacked("uint mismatch")));
        }
    }

    function assertEq(address actual, address expected) internal pure {
        if (actual != expected) {
            revert(string(abi.encodePacked("address mismatch")));
        }
    }

    function assertTrue(bool value) internal pure {
        if (!value) revert("assert true failed");
    }

    function bound(uint256 x, uint256 min, uint256 max) internal pure returns (uint256) {
        if (max < min) revert("bad bound");
        uint256 size = max - min + 1;
        return min + (x % size);
    }
}
