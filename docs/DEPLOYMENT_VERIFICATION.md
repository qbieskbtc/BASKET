# Deployment Verification

Phase 4 deployment uses the existing BASKET architecture:

- `PonsV3Adapter`
- `BasketRouter`
- `BasketFactory`

No custom BASKET ERC-20 is deployed. Basket shares are minted by each `BasketVault`.

## Networks

| Network | Chain ID | RPC environment variable |
| --- | ---: | --- |
| Robinhood Chain mainnet | 4663 | `ROBINHOOD_RPC_URL` |
| Robinhood Chain testnet | 46630 | `ROBINHOOD_TESTNET_RPC_URL` |

## Mainnet Constructor Inputs

`PonsV3Adapter`

| Argument | Value |
| --- | --- |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| Uniswap V3 factory | `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA` |
| Swap router | `0xCaf681a66D020601342297493863E78C959E5cb2` |
| Quoter V2 | `0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7` |
| Pool fee | `10000` |

`BasketRouter`

| Argument | Value |
| --- | --- |
| swapAdapter | deployed `PonsV3Adapter` |

`BasketFactory`

| Argument | Value |
| --- | --- |
| routeValidator | deployed `PonsV3Adapter` |

## Deploy

Dry run:

```bash
ROBINHOOD_RPC_URL=https://rpc.mainnet.chain.robinhood.com \
forge script scripts/DeployBasket.s.sol:DeployBasket --rpc-url "$ROBINHOOD_RPC_URL"
```

Broadcast only after mainnet launch gates are satisfied:

```bash
PRIVATE_KEY=... \
ROBINHOOD_RPC_URL=... \
forge script scripts/DeployBasket.s.sol:DeployBasket \
  --rpc-url "$ROBINHOOD_RPC_URL" \
  --broadcast
```

Testnet requires configured testnet infrastructure:

```bash
PRIVATE_KEY=... \
ROBINHOOD_TESTNET_RPC_URL=... \
ROBINHOOD_TESTNET_WETH=... \
ROBINHOOD_TESTNET_V3_FACTORY=... \
ROBINHOOD_TESTNET_SWAP_ROUTER=... \
ROBINHOOD_TESTNET_QUOTER=... \
ROBINHOOD_TESTNET_POOL_FEE=... \
forge script scripts/DeployBasket.s.sol:DeployBasket \
  --rpc-url "$ROBINHOOD_TESTNET_RPC_URL" \
  --broadcast
```

## Verify Deployed Configuration

After deployment, set:

```bash
BASKET_ADAPTER_ADDRESS=...
BASKET_ROUTER_ADDRESS=...
BASKET_FACTORY_ADDRESS=...
```

Then run:

```bash
forge script scripts/VerifyDeployment.s.sol:VerifyDeployment --rpc-url "$ROBINHOOD_RPC_URL"
```

The verification script checks:

- bytecode exists for adapter, router, and factory
- router `swapAdapter` points at the adapter
- router `weth` matches adapter `weth`
- factory `routeValidator` points at the adapter
- mainnet WETH, V3 factory, swap router, quoter, and pool fee match `RobinhoodConfig`
- testnet infra matches the explicit testnet environment variables

## Deployment Record

Robinhood Chain mainnet deployment is live and the verification script passed.

| Contract | Address | Network | Status |
| --- | --- | --- | --- |
| PonsV3Adapter | `0xd5f575a9d0c4270668ae595b7cbc05f75b75f1f0` | Robinhood Chain mainnet `4663` | Deployed |
| BasketRouter | `0x302a9fa851ce31b5bcea4d6ee21dfb78d0bd16b5` | Robinhood Chain mainnet `4663` | Deployed |
| BasketFactory | `0xa8498c29620794bf6a07a51ecedb6eefcabeca13` | Robinhood Chain mainnet `4663` | Deployed |

| Field | Value |
| --- | --- |
| Deployment transaction | `0x94cc4ee467cace46d2e938f88d0d480ee594ed0937c849dbec5f46d0f4a6f9c1` |
| BasketFactory deployment block | `50554718` |
| Frontend start block | `NEXT_PUBLIC_BASKET_FACTORY_START_BLOCK=50554718` |
| Deployment artifact | `deployments/4663.json` |

## Blockscout Source Verification

Use Blockscout after deployment. Example command shape:

```bash
forge verify-contract \
  --verifier blockscout \
  --verifier-url https://robinhoodchain.blockscout.com/api/ \
  <DEPLOYED_ADDRESS> \
  src/adapters/PonsV3Adapter.sol:PonsV3Adapter \
  --constructor-args <ABI_ENCODED_ARGS>
```

Repeat for:

- `src/BasketRouter.sol:BasketRouter`
- `src/BasketFactory.sol:BasketFactory`

Status: deployment is live; source verification status should be checked in Blockscout before public launch.
