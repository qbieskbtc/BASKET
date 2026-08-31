// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { BasketFactory } from "../src/BasketFactory.sol";
import { BasketVault } from "../src/BasketVault.sol";
import { TestBase } from "./TestBase.sol";
import { FeeOnTransferToken } from "./mocks/FeeOnTransferToken.sol";
import { FalseReturnToken } from "./mocks/FalseReturnToken.sol";
import { ForceETH } from "./mocks/ForceETH.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { NoReturnToken } from "./mocks/NoReturnToken.sol";
import { RebasingToken } from "./mocks/RebasingToken.sol";
import { ReenteringToken } from "./mocks/ReenteringToken.sol";

contract BasketVaultTest is TestBase {
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    BasketVault internal vault;
    MockERC20 internal tokenA;
    MockERC20 internal tokenB;

    function setUp() public {
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");
        vault = _newVault(address(tokenA), address(tokenB));

        tokenA.mint(alice, 1_000 ether);
        tokenB.mint(alice, 1_000 ether);
        tokenA.mint(bob, 1_000 ether);
        tokenB.mint(bob, 1_000 ether);
    }

    function testFirstDeposit() public {
        _approve(alice, vault, tokenA, tokenB);

        vm.prank(alice);
        uint256 shares = vault.deposit(_amounts(10 ether, 20 ether), 10 ether);

        assertEq(shares, 10 ether);
        assertEq(vault.balanceOf(alice), 10 ether);
        assertEq(tokenA.balanceOf(address(vault)), 10 ether);
        assertEq(tokenB.balanceOf(address(vault)), 20 ether);
    }

    function testSubsequentDepositUsesWeakestProportionalContribution() public {
        _seed();
        _approve(bob, vault, tokenA, tokenB);

        vm.prank(bob);
        uint256 shares = vault.deposit(_amounts(5 ether, 100 ether), 0);

        assertEq(shares, 5 ether);
        assertEq(vault.balanceOf(bob), 5 ether);
        assertEq(tokenA.balanceOf(address(vault)), 15 ether);
        assertEq(tokenB.balanceOf(address(vault)), 30 ether);
        assertEq(tokenB.balanceOf(bob), 990 ether);
    }

    function testMultipleUsersReceiveProportionalShares() public {
        _seed();
        _approve(bob, vault, tokenA, tokenB);

        vm.prank(bob);
        vault.deposit(_amounts(10 ether, 20 ether), 0);

        assertEq(vault.totalSupply(), 20 ether);
        assertEq(vault.balanceOf(alice), 10 ether);
        assertEq(vault.balanceOf(bob), 10 ether);
    }

    function testProportionalRedemption() public {
        _seed();

        vm.prank(alice);
        uint256[] memory amountsOut = vault.redeem(5 ether, _amounts(0, 0));

        assertEq(amountsOut[0], 5 ether);
        assertEq(amountsOut[1], 10 ether);
        assertEq(vault.balanceOf(alice), 5 ether);
    }

    function testFullRedemptionEmptiesVault() public {
        _seed();

        vm.prank(alice);
        vault.redeem(10 ether, _amounts(10 ether, 20 ether));

        assertEq(vault.totalSupply(), 0);
        assertEq(tokenA.balanceOf(address(vault)), 0);
        assertEq(tokenB.balanceOf(address(vault)), 0);
    }

    function testRoundingFavorsVault() public {
        _seed();
        tokenA.mint(address(vault), 1);
        _approve(bob, vault, tokenA, tokenB);

        vm.prank(bob);
        uint256 shares = vault.deposit(_amounts(1 ether, 2 ether), 0);

        assertTrue(shares < 1 ether);
    }

    function testTinyDepositRejected() public {
        _seed();
        _approve(bob, vault, tokenA, tokenB);

        vm.prank(bob);
        vm.expectRevert();
        vault.deposit(_amounts(1, 1), 0);
    }

    function testDonationRaisesRequiredContribution() public {
        _seed();
        tokenA.mint(address(vault), 10 ether);
        _approve(bob, vault, tokenA, tokenB);

        vm.prank(bob);
        uint256 shares = vault.deposit(_amounts(20 ether, 20 ether), 0);

        assertEq(shares, 10 ether);
        assertEq(tokenA.balanceOf(address(vault)), 40 ether);
        assertEq(tokenB.balanceOf(address(vault)), 40 ether);
    }

    function testFeeOnTransferTokenRejected() public {
        FeeOnTransferToken feeToken = new FeeOnTransferToken();
        BasketVault feeVault = _newVault(address(feeToken), address(tokenB));
        feeToken.mint(alice, 100 ether);
        tokenB.mint(alice, 100 ether);
        vm.startPrank(alice);
        feeToken.approve(address(feeVault), type(uint256).max);
        tokenB.approve(address(feeVault), type(uint256).max);
        vm.expectRevert();
        feeVault.deposit(_amounts(10 ether, 10 ether), 0);
        vm.stopPrank();
    }

    function testFalseReturnTokenRejected() public {
        FalseReturnToken falseToken = new FalseReturnToken();
        BasketVault falseVault = _newVault(address(falseToken), address(tokenB));
        falseToken.mint(alice, 100 ether);
        tokenB.mint(alice, 100 ether);

        vm.startPrank(alice);
        falseToken.approve(address(falseVault), type(uint256).max);
        tokenB.approve(address(falseVault), type(uint256).max);
        vm.expectRevert();
        falseVault.deposit(_amounts(10 ether, 10 ether), 0);
        vm.stopPrank();
    }

    function testNoReturnTokenAcceptedWhenBalanceDeltaIsExact() public {
        NoReturnToken noReturnToken = new NoReturnToken();
        BasketVault noReturnVault = _newVault(address(noReturnToken), address(tokenB));
        noReturnToken.mint(alice, 100 ether);
        tokenB.mint(alice, 100 ether);

        vm.startPrank(alice);
        noReturnToken.approve(address(noReturnVault), type(uint256).max);
        tokenB.approve(address(noReturnVault), type(uint256).max);
        uint256 shares = noReturnVault.deposit(_amounts(10 ether, 10 ether), 0);
        vm.stopPrank();

        assertEq(shares, 10 ether);
        assertEq(noReturnVault.balanceOf(alice), 10 ether);
    }

    function testRebasingTokenCanChangeClaimsAndIsUnsupported() public {
        RebasingToken rebasing = new RebasingToken();
        BasketVault rebasingVault = _newVault(address(rebasing), address(tokenB));
        rebasing.mint(alice, 100 ether);
        tokenB.mint(alice, 100 ether);

        vm.startPrank(alice);
        rebasing.approve(address(rebasingVault), type(uint256).max);
        tokenB.approve(address(rebasingVault), type(uint256).max);
        rebasingVault.deposit(_amounts(10 ether, 10 ether), 0);
        vm.stopPrank();

        rebasing.rebaseVault(address(rebasingVault), 5 ether);

        vm.prank(alice);
        uint256[] memory amountsOut = rebasingVault.redeem(10 ether, _amounts(0, 0));
        assertEq(amountsOut[0], 15 ether);
        assertEq(amountsOut[1], 10 ether);
    }

    function testReentrancyAttemptRejected() public {
        ReenteringToken reentering = new ReenteringToken();
        BasketVault reentryVault = _newVault(address(reentering), address(tokenB));
        reentering.setTarget(address(reentryVault));
        reentering.mint(alice, 100 ether);
        tokenB.mint(alice, 100 ether);

        vm.startPrank(alice);
        reentering.approve(address(reentryVault), type(uint256).max);
        tokenB.approve(address(reentryVault), type(uint256).max);
        reentering.setAttack(true);
        vm.expectRevert();
        reentryVault.deposit(_amounts(10 ether, 10 ether), 0);
        vm.stopPrank();
    }

    function testMinSharesOutProtectsDepositor() public {
        _seed();
        _approve(bob, vault, tokenA, tokenB);

        vm.prank(bob);
        vm.expectRevert();
        vault.deposit(_amounts(5 ether, 10 ether), 6 ether);
    }

    function testRedeemMinAmountsOutProtectsHolder() public {
        _seed();

        vm.prank(alice);
        vm.expectRevert();
        vault.redeem(5 ether, _amounts(6 ether, 0));
    }

    function testDepositForMintsSharesToReceiver() public {
        _approve(alice, vault, tokenA, tokenB);

        vm.prank(alice);
        uint256 shares = vault.depositFor(bob, _amounts(10 ether, 20 ether), 0);

        assertEq(shares, 10 ether);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.balanceOf(bob), 10 ether);
    }

    function testRedeemToTransfersComponentsToReceiver() public {
        _seed();

        vm.prank(alice);
        vault.redeemTo(bob, 5 ether, _amounts(0, 0));

        assertEq(tokenA.balanceOf(bob), 1_005 ether);
        assertEq(tokenB.balanceOf(bob), 1_010 ether);
    }

    function testDirectETHTransferRejected() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        (bool success,) = address(vault).call{ value: 1 wei }("");

        assertTrue(!success);
        assertEq(address(vault).balance, 0);
    }

    function testForcedETHCanBeTrappedButDoesNotAffectShares() public {
        _seed();
        ForceETH forceETH = new ForceETH{ value: 1 wei }();

        forceETH.force(payable(address(vault)));

        assertEq(address(vault).balance, 1 wei);
        assertEq(vault.totalSupply(), 10 ether);
    }

    function testNonComponentTokenSentToVaultIsNotRedeemed() public {
        _seed();
        MockERC20 stray = new MockERC20("Stray", "STRAY");
        stray.mint(address(vault), 1 ether);

        vm.prank(alice);
        vault.redeem(10 ether, _amounts(0, 0));

        assertEq(stray.balanceOf(address(vault)), 1 ether);
    }

    function testRepeatedDepositRedeemCannotExtractRoundingProfit(uint256 amountA, uint256 amountB)
        public
    {
        _seed();
        amountA = bound(amountA, 1 ether, 100 ether);
        amountB = bound(amountB, 1 ether, 100 ether);
        _approve(bob, vault, tokenA, tokenB);

        uint256 bobABefore = tokenA.balanceOf(bob);
        uint256 bobBBefore = tokenB.balanceOf(bob);

        vm.startPrank(bob);
        uint256 shares = vault.deposit(_amounts(amountA, amountB), 0);
        vault.redeem(shares, _amounts(0, 0));
        vm.stopPrank();

        assertTrue(tokenA.balanceOf(bob) <= bobABefore);
        assertTrue(tokenB.balanceOf(bob) <= bobBBefore);
    }

    function testFuzzDepositCannotReduceExistingHolderClaim(uint256 amountA, uint256 amountB)
        public
    {
        _seed();
        amountA = bound(amountA, 1 ether, 100 ether);
        amountB = bound(amountB, 1 ether, 100 ether);
        _approve(bob, vault, tokenA, tokenB);

        uint256 aliceClaimABefore =
            (tokenA.balanceOf(address(vault)) * vault.balanceOf(alice)) / vault.totalSupply();
        uint256 aliceClaimBBefore =
            (tokenB.balanceOf(address(vault)) * vault.balanceOf(alice)) / vault.totalSupply();

        vm.prank(bob);
        vault.deposit(_amounts(amountA, amountB), 0);

        uint256 aliceClaimAAfter =
            (tokenA.balanceOf(address(vault)) * vault.balanceOf(alice)) / vault.totalSupply();
        uint256 aliceClaimBAfter =
            (tokenB.balanceOf(address(vault)) * vault.balanceOf(alice)) / vault.totalSupply();

        assertTrue(aliceClaimAAfter >= aliceClaimABefore);
        assertTrue(aliceClaimBAfter >= aliceClaimBBefore);
    }

    function _seed() private {
        _approve(alice, vault, tokenA, tokenB);
        vm.prank(alice);
        vault.deposit(_amounts(10 ether, 20 ether), 0);
    }

    function _newVault(address componentA, address componentB)
        private
        returns (BasketVault created)
    {
        address[] memory components = new address[](2);
        components[0] = componentA;
        components[1] = componentB;

        uint16[] memory weights = new uint16[](2);
        weights[0] = 5_000;
        weights[1] = 5_000;

        BasketFactory factory = new BasketFactory(address(0));
        created = BasketVault(factory.createBasket("PONS 2", "P2", components, weights));
    }

    function _approve(address owner, BasketVault target, MockERC20 first, MockERC20 second)
        private
    {
        vm.startPrank(owner);
        first.approve(address(target), type(uint256).max);
        second.approve(address(target), type(uint256).max);
        vm.stopPrank();
    }

    function _amounts(uint256 a, uint256 b) private pure returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = a;
        amounts[1] = b;
    }
}
