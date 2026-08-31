// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { PonsV3Adapter } from "../src/adapters/PonsV3Adapter.sol";
import { RobinhoodConfig } from "../src/config/RobinhoodConfig.sol";
import { TestBase } from "./TestBase.sol";
import { IWETH } from "../src/interfaces/IWETH.sol";
import { IQuoterV2 } from "../src/interfaces/uniswap/IQuoterV2.sol";
import { IUniswapV3Factory } from "../src/interfaces/uniswap/IUniswapV3Factory.sol";
import { IUniswapV3Pool } from "../src/interfaces/uniswap/IUniswapV3Pool.sol";

contract PonsV3AdapterForkTest is TestBase {
    address internal constant KNOWN_PONS_V1_TOKEN = 0x055650555Be80649397084Cd3f8a09b4350e8612;
    address internal constant KNOWN_PONS_V1_POOL = 0x8f4F723f10fc7bAD28742d25c91158C728557C4c;

    function testForkVerifiesConfiguredContractsHaveBytecode() public {
        if (!_selectFork()) return;

        assertEq(block.chainid, RobinhoodConfig.MAINNET_CHAIN_ID);
        assertTrue(RobinhoodConfig.PONS_V1_FACTORY.code.length > 0);
        assertTrue(RobinhoodConfig.UNISWAP_V3_FACTORY.code.length > 0);
        assertTrue(RobinhoodConfig.SWAP_ROUTER.code.length > 0);
        assertTrue(RobinhoodConfig.QUOTER_V2.code.length > 0);
        assertTrue(RobinhoodConfig.WETH.code.length > 0);
    }

    function testForkWETHMetadataResponds() public {
        if (!_selectFork()) return;

        assertTrue(IERC20Metadata(RobinhoodConfig.WETH).decimals() > 0);
        assertTrue(bytes(IERC20Metadata(RobinhoodConfig.WETH).symbol()).length > 0);
        assertTrue(IERC20Metadata(RobinhoodConfig.WETH).totalSupply() >= 0);
    }

    function testForkV3FactoryGetPoolResponds() public {
        if (!_selectFork()) return;

        address pool = IUniswapV3Factory(RobinhoodConfig.UNISWAP_V3_FACTORY)
            .getPool(
                RobinhoodConfig.WETH,
                address(0x0000000000000000000000000000000000000001),
                RobinhoodConfig.PONS_V1_POOL_FEE
            );
        assertEq(pool, address(0));
    }

    function testForkKnownPonsV1PoolMatchesExpectedShape() public {
        if (!_selectFork()) return;

        address pool = IUniswapV3Factory(RobinhoodConfig.UNISWAP_V3_FACTORY)
            .getPool(RobinhoodConfig.WETH, KNOWN_PONS_V1_TOKEN, RobinhoodConfig.PONS_V1_POOL_FEE);

        assertEq(pool, KNOWN_PONS_V1_POOL);
        assertEq(IUniswapV3Pool(pool).fee(), RobinhoodConfig.PONS_V1_POOL_FEE);
        assertTrue(IUniswapV3Pool(pool).liquidity() > 0);
        assertTrue(
            (IUniswapV3Pool(pool).token0() == RobinhoodConfig.WETH
                    && IUniswapV3Pool(pool).token1() == KNOWN_PONS_V1_TOKEN)
                || (IUniswapV3Pool(pool).token0() == KNOWN_PONS_V1_TOKEN
                    && IUniswapV3Pool(pool).token1() == RobinhoodConfig.WETH)
        );
    }

    function testForkAdapterDeploysAndRejectsUnknownToken() public {
        if (!_selectFork()) return;

        PonsV3Adapter adapter = new PonsV3Adapter(
            RobinhoodConfig.WETH,
            RobinhoodConfig.UNISWAP_V3_FACTORY,
            RobinhoodConfig.SWAP_ROUTER,
            RobinhoodConfig.QUOTER_V2,
            RobinhoodConfig.PONS_V1_POOL_FEE
        );

        assertTrue(!adapter.isSupportedToken(address(0x0000000000000000000000000000000000000001)));
    }

    function testForkAdapterSupportsKnownPonsV1TokenAndQuotes() public {
        if (!_selectFork()) return;

        PonsV3Adapter adapter = _adapter();
        assertTrue(adapter.isSupportedToken(KNOWN_PONS_V1_TOKEN));

        uint256 amountOut = adapter.quoteWETHToToken(KNOWN_PONS_V1_TOKEN, 0.0001 ether);
        assertTrue(amountOut > 0);

        (uint256 directQuote,,,) = IQuoterV2(RobinhoodConfig.QUOTER_V2)
            .quoteExactInputSingle(
                IQuoterV2.QuoteExactInputSingleParams({
                    tokenIn: RobinhoodConfig.WETH,
                    tokenOut: KNOWN_PONS_V1_TOKEN,
                    amountIn: 0.0001 ether,
                    fee: RobinhoodConfig.PONS_V1_POOL_FEE,
                    sqrtPriceLimitX96: 0
                })
            );
        assertEq(amountOut, directQuote);
    }

    function testForkAdapterSimulatesTinySwapAgainstKnownPonsV1Pool() public {
        if (!_selectFork()) return;

        PonsV3Adapter adapter = _adapter();
        uint256 amountIn = 0.0001 ether;
        uint256 quoteOut = adapter.quoteWETHToToken(KNOWN_PONS_V1_TOKEN, amountIn);
        uint256 minOut = (quoteOut * 90) / 100;

        vm.deal(address(this), amountIn);
        IWETH(RobinhoodConfig.WETH).deposit{ value: amountIn }();
        IERC20(RobinhoodConfig.WETH).approve(address(adapter), amountIn);

        uint256 amountOut = adapter.swapWETHToToken(
            KNOWN_PONS_V1_TOKEN, amountIn, minOut, address(this), block.timestamp + 60
        );

        assertTrue(amountOut >= minOut);
        assertTrue(IERC20(KNOWN_PONS_V1_TOKEN).balanceOf(address(this)) >= amountOut);
    }

    function _adapter() private returns (PonsV3Adapter) {
        return new PonsV3Adapter(
            RobinhoodConfig.WETH,
            RobinhoodConfig.UNISWAP_V3_FACTORY,
            RobinhoodConfig.SWAP_ROUTER,
            RobinhoodConfig.QUOTER_V2,
            RobinhoodConfig.PONS_V1_POOL_FEE
        );
    }

    function _selectFork() private returns (bool) {
        string memory rpcUrl = vm.envOr("ROBINHOOD_RPC_URL", "");
        if (bytes(rpcUrl).length == 0) return false;
        vm.createSelectFork(rpcUrl);
        return true;
    }
}
