// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { BasketFactory } from "../src/BasketFactory.sol";
import { BasketRouter } from "../src/BasketRouter.sol";
import { PonsV3Adapter } from "../src/adapters/PonsV3Adapter.sol";
import { RobinhoodConfig } from "../src/config/RobinhoodConfig.sol";

interface Vm {
    function envAddress(string calldata key) external view returns (address);
    function envOr(string calldata key, address defaultValue) external view returns (address);
    function envUint(string calldata key) external view returns (uint256);
}

contract VerifyDeployment {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external view {
        address adapter = vm.envAddress("BASKET_ADAPTER_ADDRESS");
        address router = vm.envAddress("BASKET_ROUTER_ADDRESS");
        address factory = vm.envAddress("BASKET_FACTORY_ADDRESS");

        _requireCode(adapter, "adapter");
        _requireCode(router, "router");
        _requireCode(factory, "factory");

        PonsV3Adapter ponsAdapter = PonsV3Adapter(adapter);
        BasketRouter basketRouter = BasketRouter(payable(router));
        BasketFactory basketFactory = BasketFactory(factory);

        require(address(basketRouter.swapAdapter()) == adapter, "router adapter mismatch");
        require(address(basketRouter.weth()) == ponsAdapter.weth(), "router weth mismatch");
        require(address(basketFactory.routeValidator()) == adapter, "factory validator mismatch");

        if (block.chainid == RobinhoodConfig.MAINNET_CHAIN_ID) {
            require(ponsAdapter.weth() == RobinhoodConfig.WETH, "weth mismatch");
            require(address(ponsAdapter.factory()) == RobinhoodConfig.UNISWAP_V3_FACTORY, "v3 factory mismatch");
            require(address(ponsAdapter.swapRouter()) == RobinhoodConfig.SWAP_ROUTER, "swap router mismatch");
            require(address(ponsAdapter.quoter()) == RobinhoodConfig.QUOTER_V2, "quoter mismatch");
            require(ponsAdapter.poolFee() == RobinhoodConfig.PONS_V1_POOL_FEE, "pool fee mismatch");
        } else if (block.chainid == 46_630) {
            require(ponsAdapter.weth() == vm.envAddress("ROBINHOOD_TESTNET_WETH"), "testnet weth mismatch");
            require(address(ponsAdapter.factory()) == vm.envAddress("ROBINHOOD_TESTNET_V3_FACTORY"), "testnet v3 factory mismatch");
            require(address(ponsAdapter.swapRouter()) == vm.envAddress("ROBINHOOD_TESTNET_SWAP_ROUTER"), "testnet swap router mismatch");
            require(address(ponsAdapter.quoter()) == vm.envAddress("ROBINHOOD_TESTNET_QUOTER"), "testnet quoter mismatch");
            require(ponsAdapter.poolFee() == uint24(vm.envUint("ROBINHOOD_TESTNET_POOL_FEE")), "testnet pool fee mismatch");
        } else {
            revert("Unsupported chain");
        }
    }

    function _requireCode(address target, string memory label) private view {
        require(target != address(0), label);
        require(target.code.length > 0, label);
    }
}
