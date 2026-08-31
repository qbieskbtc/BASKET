# Progress

## Phase 1

Completed:

- Created Foundry-compatible project layout.
- Documented architecture and share-accounting model.
- Implemented `BasketFactory`.
- Implemented `BasketVault` ERC-20 shares with proportional component deposits and redemption.
- Integrated pinned `@openzeppelin/contracts`.
- Added mock contracts and Foundry tests for core paths.

Tests passing:

- `forge test -vvv`
- included in current 52-test suite.

Current limitations:

- Route validation is represented by `IRouteValidator`; production Pons V3 validation lands in Phase 2.
- ETH routing is intentionally deferred.

Next tasks:

- Continue external review before frontend integration.

## Phase 2

Completed:

- Added `ISwapAdapter`.
- Added `PonsV3Adapter` with pool existence, pair, fee-tier, and nonzero-liquidity validation.
- Added `BasketRouter` for ETH-to-basket and basket-to-ETH flows.
- Isolated Robinhood Chain addresses in `src/config/RobinhoodConfig.sol`.
- Added `docs/ROUTER_ACCOUNTING.md`.
- Added router unit tests.
- Added adapter unit tests.
- Added Robinhood Chain fork tests.

Tests passing:

- `forge test -vvv`
- 52 passed, 0 failed, 0 skipped.
- Robinhood fork: `ROBINHOOD_RPC_URL=https://rpc.mainnet.chain.robinhood.com forge test --match-path test/PonsV3Adapter.fork.t.sol -vvv`
- 7 fork tests passed, 0 failed, 0 skipped.

Findings:

- Fork testing found the deployed Pons-used swap router has the `SwapRouter02` exact-input-single shape without a `deadline` field. The adapter was updated to match that ABI while still enforcing deadlines before external calls.
- Verified a real Pons V1 launch pool from factory logs:
  - token: `0x055650555Be80649397084Cd3f8a09b4350e8612`
  - pool: `0x8f4F723f10fc7bAD28742d25c91158C728557C4c`

Current limitations:

- Router requires caller-provided per-component WETH allocations.
- No frontend quote UX yet.
- No automated Pons launch indexer yet.

## Phase 3

Completed:

- Added a production-oriented Next.js frontend with TypeScript, Tailwind, wagmi, viem, and injected wallet support.
- Added the supplied BASKET logo to `public/basket-logo.png` and used it in the navigation.
- Added Robinhood Chain configuration, Blockscout links, contract address validation, and real ABIs imported from Foundry artifacts.
- Added live-read surfaces for factory indexes, basket summaries, vault composition, ERC-20 metadata, and Pons launch discovery from onchain factory logs.
- Added pages for `/`, `/explore`, `/create`, `/basket/[address]`, and `/docs`.
- Added create-index transaction simulation/sign/receipt handling with `BasketCreated` event parsing.
- Added basket redeem flows with simulation before wallet signature.
- Kept unavailable market metrics as explicit empty states instead of fake data.
- Disabled initialized-basket ETH buys in the UI until a proportional quote engine is available, because target weights are not a safe proxy for current vault composition.
- Reworked wallet UX so navigation only shows connect/disconnect/address states; Robinhood Chain switching now happens automatically when a write action starts, with an explicit retryable wrong-network state if switching fails.
- Split Pons token discovery from routability with reusable `resolveToken(address)` support for direct pasted contract validation.
- Expanded Pons discovery to scan V1 and verified V2 factory events from real start blocks, batch metadata reads through multicall, cache/persist the local directory, and label route availability separately from token validity.
- Rebuilt the asset selector around one universal search/address input, recent Pons rows, direct ERC-20 validation results, route status, and a clean selected-token stack.

Checks passing:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `/Users/griffinbiesk/.foundry/bin/forge test -vvv`
- 52 contract tests passed, 0 failed, 0 skipped.

Current limitations:

- Frontend requires `NEXT_PUBLIC_BASKET_FACTORY_ADDRESS` and `NEXT_PUBLIC_BASKET_ROUTER_ADDRESS` to show deployed BASKET data and enable router-backed writes.
- Pons launch discovery is direct RPC log discovery, not a durable indexed backend.
- ETH buy UX is available only for uninitialized baskets. Initialized basket buys remain disabled until the frontend or backend can quote caller-provided per-component WETH allocations from live reserves.
- V2 Pons tokens are discoverable and selectable, but the current installed production adapter is still V1/Uniswap V3-oriented; V2 routability remains unsupported unless a configured adapter reports support.
- No deployment was performed.

## Phase 4

Completed:

- Added `scripts/DeployBasket.s.sol` for `PonsV3Adapter`, `BasketRouter`, and `BasketFactory`.
- Added `scripts/VerifyDeployment.s.sol` to validate deployed bytecode and adapter/router/factory relationships.
- Added `supportsToken(address)` to `PonsV3Adapter` so it can serve as the factory route validator and the router swap adapter.
- Added typed frontend deployment config in `lib/contracts/deployments.ts`.
- Added event-based `BasketCreated` discovery when `NEXT_PUBLIC_BASKET_FACTORY_START_BLOCK` is configured.
- Hardened direct basket URL loading so non-vault addresses render an index-not-found state instead of a runtime failure.
- Added user share balance, ownership percentage, and proportional underlying claim display to basket pages.
- Added quote-driven buy and redeem-to-ETH previews with nonzero slippage protection.
- Added raw component redemption previews based on exact vault accounting.
- Added router allowance handling for redeem-to-ETH.
- Added `docs/DEPLOYMENT_VERIFICATION.md`.
- Added `docs/E2E_TEST.md`.
- Found an additional live Pons V1 token candidate for E2E testing:
  - `BANKERS`: `0x97133372cC4391A4F6889b4d52387649B76BC7EC`
  - pool: `0x2D0edeF70886383C395D8207Bf22B8c29c974a7c`

Checks passing:

- `/Users/griffinbiesk/.foundry/bin/forge test -vvv`
- 52 contract tests passed, 0 failed, 0 skipped.
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- HTTP smoke tests returned 200 for `/`, `/create`, `/explore`, `/docs`, and `/basket/0x055650555Be80649397084Cd3f8a09b4350e8612`.
- Browser viewport smoke tests passed on desktop and mobile with no visible error overlay and no captured console errors.
- Mainnet deployment script dry run succeeded without broadcast.

Current limitations:

- No BASKET contracts have been broadcast/deployed from this workspace.
- No Blockscout source verification was attempted because there are no deployed BASKET addresses yet.
- Full lifecycle E2E transaction hashes remain pending until a deployed factory/router/adapter and funded test wallet are available.
- Testnet E2E depends on usable Robinhood testnet WETH/V3/router/quoter/Pons liquidity addresses.
