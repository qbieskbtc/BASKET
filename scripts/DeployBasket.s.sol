// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { BasketFactory } from "../src/BasketFactory.sol";
import { BasketRouter } from "../src/BasketRouter.sol";
import { PonsV3Adapter } from "../src/adapters/PonsV3Adapter.sol";
import { RobinhoodConfig } from "../src/config/RobinhoodConfig.sol";

interface Vm {
    function envUint(string calldata key) external view returns (uint256);
    function envAddress(string calldata key) external view returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployBasket {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    struct NetworkConfig {
        address weth;
        address v3Factory;
        address swapRouter;
        address quoter;
        uint24 poolFee;
    }

    function run()
        external
        returns (PonsV3Adapter adapter, BasketRouter router, BasketFactory factory)
    {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        NetworkConfig memory config = _networkConfig();

        vm.startBroadcast(privateKey);
        adapter = new PonsV3Adapter(
            config.weth,
            config.v3Factory,
            config.swapRouter,
            config.quoter,
            config.poolFee
        );
        router = new BasketRouter(address(adapter));
        factory = new BasketFactory(address(adapter));
        vm.stopBroadcast();
    }

    function _networkConfig() private view returns (NetworkConfig memory config) {
        if (block.chainid == RobinhoodConfig.MAINNET_CHAIN_ID) {
            return NetworkConfig({
                weth: RobinhoodConfig.WETH,
                v3Factory: RobinhoodConfig.UNISWAP_V3_FACTORY,
                swapRouter: RobinhoodConfig.SWAP_ROUTER,
                quoter: RobinhoodConfig.QUOTER_V2,
                poolFee: RobinhoodConfig.PONS_V1_POOL_FEE
            });
        }

        if (block.chainid == 46_630) {
            return NetworkConfig({
                weth: vm.envAddress("ROBINHOOD_TESTNET_WETH"),
                v3Factory: vm.envAddress("ROBINHOOD_TESTNET_V3_FACTORY"),
                swapRouter: vm.envAddress("ROBINHOOD_TESTNET_SWAP_ROUTER"),
                quoter: vm.envAddress("ROBINHOOD_TESTNET_QUOTER"),
                poolFee: uint24(vm.envUint("ROBINHOOD_TESTNET_POOL_FEE"))
            });
        }

        revert("Unsupported chain");
    }
}
