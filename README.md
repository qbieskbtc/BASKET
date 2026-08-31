# BASKET

BASKET lets anyone create and invest in an onchain index of Robinhood Chain assets.

## Architecture

```text
BasketFactory
  creates
BasketVault ERC-20 share tokens
  hold
component ERC-20 reserves
```

Future routing:

```text
BasketRouter -> ISwapAdapter -> PonsV3Adapter -> Robinhood Chain Uniswap V3
```

## Contract Structure

- `src/BasketFactory.sol`: permissionless basket deployment and registry.
- `src/BasketVault.sol`: ERC-20 basket shares, proportional deposits, and proportional redemption.
- `src/interfaces/IRouteValidator.sol`: route-support interface for Phase 2 adapter validation.
- `src/interfaces/ISwapAdapter.sol`: generic adapter boundary for WETH/component routes.
- `src/adapters/PonsV3Adapter.sol`: initial Robinhood Chain Pons V1 / Uniswap V3 adapter.
- `src/BasketRouter.sol`: one-click ETH buy and ETH redemption router.
- `src/config/RobinhoodConfig.sol`: isolated Robinhood Chain constants.
- `@openzeppelin/contracts`: ERC-20, SafeERC20, and ReentrancyGuard primitives.

## Robinhood Chain

- Mainnet chain ID: `4663`
- Native token: ETH
- RPC: `https://rpc.mainnet.chain.robinhood.com`
- Explorer: `https://robinhoodchain.blockscout.com`
- Testnet chain ID: `46630`
- Testnet RPC: `https://rpc.testnet.chain.robinhood.com`
- Testnet explorer: `https://explorer.testnet.chain.robinhood.com`

## Pons V1 / Uniswap V3 Integration

Reserved for Phase 2:

- Pons V1 factory: `0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB`
- Pons V1 locker: `0x736D76699C26D0d966744cAe304C000d471f7F35`
- Uniswap V3 factory: `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA`
- Swap Router: `0xCaf681a66D020601342297493863E78C959E5cb2`
- Quoter V2: `0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7`
- WETH: `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`

Do not deploy against these constants until bytecode and interfaces are verified.

## Local Development

Install Foundry, then run:

```bash
npm install
forge test
```

## Tests

Tests cover:

- Factory basket creation.
- Duplicate component rejection.
- Invalid weight rejection.
- Component-count rejection.
- Unsupported token rejection via validator.
- First deposit.
- Subsequent deposit.
- Multiple users.
- Proportional redemption.
- Full redemption.
- Rounding behavior.
- Tiny deposit rejection.
- Direct donation behavior.
- Fee-on-transfer token rejection.
- Reentrancy rejection.
- Phase 1 fuzz and invariant runs.
- Router buy/redeem/refund/deadline/slippage/support checks.
- Pons V3 adapter pool validation, quoting, swapping, and fork verification.

## Fork Tests

Robinhood Chain fork tests live in `test/PonsV3Adapter.fork.t.sol`.

```bash
ROBINHOOD_RPC_URL=https://rpc.mainnet.chain.robinhood.com forge test --match-path test/PonsV3Adapter.fork.t.sol -vvv
```

They verify configured bytecode, WETH metadata, V3 factory behavior, a known Pons V1 pool, QuoterV2 behavior, adapter support detection, and a tiny local fork swap simulation.

## Deployment

Deploy first to Robinhood Chain testnet or a mainnet fork after local tests and fork tests are green. Do not deploy without independent review.

## Contract Verification

Use Blockscout verification for Robinhood Chain after deployment. Constructor arguments are the route validator for `BasketFactory` and vault metadata/components for each factory-created `BasketVault`.

## Security Assumptions

See `docs/SECURITY.md` and `docs/SHARE_ACCOUNTING.md`.

## Known Limitations

- No frontend yet.
- No Pons launch indexer yet.
- No automatic rebalancing.
- No `$BASKET` governance token.

## Future Pons V2 Adapter

The router/adapter boundary is reserved so Pons V2 bonding-curve and Uniswap V4 graduation support can be added without putting DEX-specific behavior in `BasketVault`.
