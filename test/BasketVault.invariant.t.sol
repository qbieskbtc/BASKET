// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { BasketFactory } from "../src/BasketFactory.sol";
import { BasketVault } from "../src/BasketVault.sol";
import { TestBase } from "./TestBase.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract BasketVaultHandler is TestBase {
    BasketVault public vault;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address[] private _holders;
    mapping(address => bool) private _seenHolder;

    uint256 public successfulDeposits;
    uint256 public successfulRedemptions;

    constructor(BasketVault vault_, MockERC20 tokenA_, MockERC20 tokenB_) {
        vault = vault_;
        tokenA = tokenA_;
        tokenB = tokenB_;
    }

    function deposit(uint8 actorSeed, uint96 rawAmountA, uint96 rawAmountB) external {
        address actor = _actor(actorSeed);
        uint256 amountA = bound(uint256(rawAmountA), 1, 1_000 ether);
        uint256 amountB = bound(uint256(rawAmountB), 1, 1_000 ether);

        tokenA.mint(actor, amountA);
        tokenB.mint(actor, amountB);

        vm.startPrank(actor);
        tokenA.approve(address(vault), type(uint256).max);
        tokenB.approve(address(vault), type(uint256).max);
        try vault.deposit(_amounts(amountA, amountB), 0) returns (uint256 shares) {
            if (shares > 0) {
                _trackHolder(actor);
                successfulDeposits += 1;
            }
        } catch { }
        vm.stopPrank();
    }

    function redeem(uint8 actorSeed, uint96 rawShares) external {
        address actor = _actor(actorSeed);
        uint256 balance = vault.balanceOf(actor);
        if (balance == 0) return;

        uint256 shares = bound(uint256(rawShares), 1, balance);
        vm.prank(actor);
        try vault.redeem(shares, _amounts(0, 0)) {
            successfulRedemptions += 1;
        } catch { }
    }

    function donate(uint8 tokenSeed, uint96 rawAmount) external {
        uint256 amount = bound(uint256(rawAmount), 1, 100 ether);
        if (tokenSeed % 2 == 0) {
            tokenA.mint(address(vault), amount);
        } else {
            tokenB.mint(address(vault), amount);
        }
    }

    function zeroValueOperations(uint8 actorSeed) external {
        address actor = _actor(actorSeed);
        vm.startPrank(actor);
        try vault.deposit(_amounts(0, 0), 0) { } catch { }
        try vault.redeem(0, _amounts(0, 0)) { } catch { }
        vm.stopPrank();
    }

    function holderCount() external view returns (uint256) {
        return _holders.length;
    }

    function holderAt(uint256 index) external view returns (address) {
        return _holders[index];
    }

    function _trackHolder(address holder) private {
        if (_seenHolder[holder]) return;
        _seenHolder[holder] = true;
        _holders.push(holder);
    }

    function _actor(uint8 seed) private pure returns (address) {
        return address(uint160(0x1000 + (seed % 8)));
    }

    function _amounts(uint256 a, uint256 b) private pure returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = a;
        amounts[1] = b;
    }
}

contract BasketVaultInvariantTest is TestBase {
    BasketVault internal vault;
    MockERC20 internal tokenA;
    MockERC20 internal tokenB;
    BasketVaultHandler internal handler;

    function setUp() public {
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");

        address[] memory components = new address[](2);
        components[0] = address(tokenA);
        components[1] = address(tokenB);

        uint16[] memory weights = new uint16[](2);
        weights[0] = 5_000;
        weights[1] = 5_000;

        BasketFactory factory = new BasketFactory(address(0));
        vault = BasketVault(factory.createBasket("PONS 2", "P2", components, weights));

        handler = new BasketVaultHandler(vault, tokenA, tokenB);
    }

    function targetContracts() public view returns (address[] memory targets) {
        targets = new address[](1);
        targets[0] = address(handler);
    }

    function invariant_TotalHolderClaimsNeverExceedAssetsHeld() public view {
        uint256 supply = vault.totalSupply();
        uint256 vaultA = tokenA.balanceOf(address(vault));
        uint256 vaultB = tokenB.balanceOf(address(vault));
        uint256 owedA;
        uint256 owedB;

        uint256 count = handler.holderCount();
        for (uint256 i; i < count; ++i) {
            address holder = handler.holderAt(i);
            uint256 shares = vault.balanceOf(holder);
            if (supply > 0) {
                owedA += (vaultA * shares) / supply;
                owedB += (vaultB * shares) / supply;
            }
        }

        assertTrue(owedA <= vaultA);
        assertTrue(owedB <= vaultB);
    }

    function invariant_SumTrackedSharesNeverExceedsTotalSupply() public view {
        uint256 trackedShares;
        uint256 count = handler.holderCount();
        for (uint256 i; i < count; ++i) {
            trackedShares += vault.balanceOf(handler.holderAt(i));
        }

        assertTrue(trackedShares <= vault.totalSupply());
    }

    function invariant_ZeroSupplyHasNoTrackedShares() public view {
        if (vault.totalSupply() != 0) return;

        uint256 count = handler.holderCount();
        for (uint256 i; i < count; ++i) {
            assertEq(vault.balanceOf(handler.holderAt(i)), 0);
        }
    }
}
