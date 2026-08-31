// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

library RobinhoodConfig {
    uint256 public constant MAINNET_CHAIN_ID = 4663;
    uint24 public constant PONS_V1_POOL_FEE = 10_000;

    address public constant PONS_V1_FACTORY = 0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB;
    address public constant UNISWAP_V3_FACTORY = 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA;
    address public constant SWAP_ROUTER = 0xCaf681a66D020601342297493863E78C959E5cb2;
    address public constant QUOTER_V2 = 0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7;
    address public constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
}
