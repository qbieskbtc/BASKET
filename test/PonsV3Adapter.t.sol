// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { PonsV3Adapter } from "../src/adapters/PonsV3Adapter.sol";
import { TestBase } from "./TestBase.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockQuoterV2 } from "./mocks/MockQuoterV2.sol";
import { MockUniswapV3Factory } from "./mocks/MockUniswapV3Factory.sol";
import { MockUniswapV3Pool } from "./mocks/MockUniswapV3Pool.sol";
import { MockV3SwapRouter } from "./mocks/MockV3SwapRouter.sol";
import { MockWETH } from "./mocks/MockWETH.sol";

contract PonsV3AdapterTest is TestBase {
    uint24 internal constant FEE = 10_000;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    MockWETH internal weth;
    MockERC20 internal token;
    MockUniswapV3Factory internal factory;
    MockUniswapV3Pool internal pool;
    MockV3SwapRouter internal router;
    MockQuoterV2 internal quoter;
    PonsV3Adapter internal adapter;

    function setUp() public {
        weth = new MockWETH();
        token = new MockERC20("Pons Token", "PONS");
        factory = new MockUniswapV3Factory();
        pool = new MockUniswapV3Pool(address(weth), address(token), FEE, 1_000);
        router = new MockV3SwapRouter(address(weth));
        quoter = new MockQuoterV2();
        adapter = new PonsV3Adapter(
            address(weth), address(factory), address(router), address(quoter), FEE
        );

        factory.setPool(address(weth), address(token), FEE, address(pool));
        router.setRate(address(weth), address(token), FEE, 2 ether);
        router.setRate(address(token), address(weth), FEE, 0.5 ether);
        quoter.setRate(address(weth), address(token), FEE, 2 ether);
        quoter.setRate(address(token), address(weth), FEE, 0.5 ether);

        vm.deal(address(weth), 1_000 ether);
    }

    function testDetectsSupportedToken() public view {
        assertTrue(adapter.isSupportedToken(address(token)));
        assertTrue(adapter.supportsToken(address(token)));
    }

    function testRejectsMissingPool() public {
        MockERC20 other = new MockERC20("Other", "OTHER");

        assertTrue(!adapter.isSupportedToken(address(other)));
    }

    function testRejectsZeroLiquidityPool() public {
        pool.setLiquidity(0);

        assertTrue(!adapter.isSupportedToken(address(token)));
    }

    function testRejectsMalformedPool() public {
        MockERC20 other = new MockERC20("Other", "OTHER");
        MockUniswapV3Pool malformed =
            new MockUniswapV3Pool(address(weth), address(other), FEE, 1_000);
        factory.setPool(address(weth), address(token), FEE, address(malformed));

        assertTrue(!adapter.isSupportedToken(address(token)));
    }

    function testQuotesBothDirections() public {
        uint256 tokenOut = adapter.quoteWETHToToken(address(token), 1 ether);
        uint256 wethOut = adapter.quoteTokenToWETH(address(token), 2 ether);

        assertEq(tokenOut, 2 ether);
        assertEq(wethOut, 1 ether);
    }

    function testSwapsWETHToToken() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        weth.deposit{ value: 1 ether }();
        weth.approve(address(adapter), 1 ether);
        uint256 amountOut =
            adapter.swapWETHToToken(address(token), 1 ether, 2 ether, bob, block.timestamp + 1);
        vm.stopPrank();

        assertEq(amountOut, 2 ether);
        assertEq(token.balanceOf(bob), 2 ether);
    }

    function testSwapsTokenToWETH() public {
        token.mint(alice, 2 ether);
        vm.startPrank(alice);
        token.approve(address(adapter), 2 ether);
        uint256 amountOut =
            adapter.swapTokenToWETH(address(token), 2 ether, 1 ether, bob, block.timestamp + 1);
        vm.stopPrank();

        assertEq(amountOut, 1 ether);
        assertEq(weth.balanceOf(bob), 1 ether);
    }

    function testRejectsExpiredSwap() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        weth.deposit{ value: 1 ether }();
        weth.approve(address(adapter), 1 ether);
        vm.expectRevert();
        adapter.swapWETHToToken(address(token), 1 ether, 1 ether, bob, block.timestamp - 1);
        vm.stopPrank();
    }

    function testRejectsZeroMinimumOutput() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        weth.deposit{ value: 1 ether }();
        weth.approve(address(adapter), 1 ether);
        vm.expectRevert();
        adapter.swapWETHToToken(address(token), 1 ether, 0, bob, block.timestamp + 1);
        vm.stopPrank();
    }
}
