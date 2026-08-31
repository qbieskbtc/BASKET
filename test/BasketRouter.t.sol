// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { BasketFactory } from "../src/BasketFactory.sol";
import { BasketRouter } from "../src/BasketRouter.sol";
import { BasketVault } from "../src/BasketVault.sol";
import { TestBase } from "./TestBase.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockSwapAdapter } from "./mocks/MockSwapAdapter.sol";
import { MockWETH } from "./mocks/MockWETH.sol";

contract BasketRouterTest is TestBase {
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    MockWETH internal weth;
    MockERC20 internal tokenA;
    MockERC20 internal tokenB;
    MockSwapAdapter internal adapter;
    BasketRouter internal router;
    BasketVault internal vault;

    function setUp() public {
        weth = new MockWETH();
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");
        adapter = new MockSwapAdapter(address(weth));
        router = new BasketRouter(address(adapter));
        vault = _newVault(address(tokenA), address(tokenB));

        adapter.setSupported(address(tokenA), true);
        adapter.setSupported(address(tokenB), true);
        adapter.setRates(address(tokenA), 1 ether, 1 ether);
        adapter.setRates(address(tokenB), 1 ether, 1 ether);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(address(weth), 1_000 ether);
    }

    function testBuyBasketWithETHDeliversSharesAndLeavesRouterEmpty() public {
        vm.prank(alice);
        uint256 shares = router.buyBasketWithETH{ value: 2 ether }(
            _buyParams(bob, _amounts(1 ether, 1 ether), _amounts(1 ether, 1 ether), 1 ether)
        );

        assertEq(shares, 1 ether);
        assertEq(vault.balanceOf(bob), 1 ether);
        assertEq(weth.balanceOf(address(router)), 0);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function testBuyBasketUsesCallerProvidedCurrentReserveRatioAndRefundsETH() public {
        _seedVault(10 ether, 20 ether);
        uint256 bobETHBefore = bob.balance;

        vm.prank(alice);
        uint256 shares = router.buyBasketWithETH{ value: 20 ether }(
            _buyParams(bob, _amounts(5 ether, 10 ether), _amounts(5 ether, 10 ether), 5 ether)
        );

        assertEq(shares, 5 ether);
        assertEq(vault.balanceOf(bob), 5 ether);
        assertEq(bob.balance, bobETHBefore + 5 ether);
        assertEq(weth.balanceOf(address(router)), 0);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function testBuyBasketRejectsExpiredDeadline() public {
        BasketRouter.BuyBasketWithETHParams memory params =
            _buyParams(bob, _amounts(1 ether, 1 ether), _amounts(1 ether, 1 ether), 1 ether);
        params.deadline = block.timestamp - 1;

        vm.prank(alice);
        vm.expectRevert();
        router.buyBasketWithETH{ value: 2 ether }(params);
    }

    function testBuyBasketRejectsUnsupportedToken() public {
        adapter.setSupported(address(tokenB), false);

        vm.prank(alice);
        vm.expectRevert();
        router.buyBasketWithETH{ value: 2 ether }(
            _buyParams(bob, _amounts(1 ether, 1 ether), _amounts(1 ether, 1 ether), 1 ether)
        );
    }

    function testBuyBasketRejectsInsufficientComponentOutput() public {
        vm.prank(alice);
        vm.expectRevert();
        router.buyBasketWithETH{ value: 2 ether }(
            _buyParams(bob, _amounts(1 ether, 1 ether), _amounts(2 ether, 1 ether), 1 ether)
        );
    }

    function testRedeemBasketToETHDeliversETHToRecipient() public {
        _seedVault(10 ether, 20 ether);
        vm.prank(alice);
        vault.approve(address(router), 5 ether);
        uint256 bobETHBefore = bob.balance;

        vm.prank(alice);
        uint256 ethOut = router.redeemBasketToETH(
            _redeemParams(
                bob, 5 ether, _amounts(5 ether, 10 ether), _amounts(5 ether, 10 ether), 15 ether
            )
        );

        assertEq(ethOut, 15 ether);
        assertEq(bob.balance, bobETHBefore + 15 ether);
        assertEq(vault.balanceOf(alice), 5 ether);
        assertEq(weth.balanceOf(address(router)), 0);
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function testRedeemBasketToETHRejectsExpiredDeadline() public {
        _seedVault(10 ether, 20 ether);
        vm.prank(alice);
        vault.approve(address(router), 5 ether);
        BasketRouter.RedeemBasketToETHParams memory params =
            _redeemParams(bob, 5 ether, _amounts(0, 0), _amounts(1, 1), 1);
        params.deadline = block.timestamp - 1;

        vm.prank(alice);
        vm.expectRevert();
        router.redeemBasketToETH(params);
    }

    function testRedeemBasketToETHRejectsUnsupportedComponent() public {
        _seedVault(10 ether, 20 ether);
        adapter.setSupported(address(tokenB), false);
        vm.prank(alice);
        vault.approve(address(router), 5 ether);

        vm.prank(alice);
        vm.expectRevert();
        router.redeemBasketToETH(_redeemParams(bob, 5 ether, _amounts(0, 0), _amounts(1, 1), 1));
    }

    function _seedVault(uint256 amountA, uint256 amountB) private {
        tokenA.mint(alice, amountA);
        tokenB.mint(alice, amountB);

        vm.startPrank(alice);
        tokenA.approve(address(vault), type(uint256).max);
        tokenB.approve(address(vault), type(uint256).max);
        vault.deposit(_amounts(amountA, amountB), 0);
        vm.stopPrank();
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

    function _buyParams(
        address recipient,
        uint256[] memory wethAmountsIn,
        uint256[] memory minComponentAmountsOut,
        uint256 minSharesOut
    ) private view returns (BasketRouter.BuyBasketWithETHParams memory params) {
        params = BasketRouter.BuyBasketWithETHParams({
            vault: address(vault),
            recipient: recipient,
            minSharesOut: minSharesOut,
            deadline: block.timestamp + 1,
            wethAmountsIn: wethAmountsIn,
            minComponentAmountsOut: minComponentAmountsOut
        });
    }

    function _redeemParams(
        address recipient,
        uint256 shares,
        uint256[] memory minComponentAmountsOut,
        uint256[] memory minWethAmountsOut,
        uint256 minETHOut
    ) private view returns (BasketRouter.RedeemBasketToETHParams memory params) {
        params = BasketRouter.RedeemBasketToETHParams({
            vault: address(vault),
            recipient: recipient,
            shares: shares,
            deadline: block.timestamp + 1,
            minComponentAmountsOut: minComponentAmountsOut,
            minWethAmountsOut: minWethAmountsOut,
            minETHOut: minETHOut
        });
    }

    function _amounts(uint256 a, uint256 b) private pure returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = a;
        amounts[1] = b;
    }
}
