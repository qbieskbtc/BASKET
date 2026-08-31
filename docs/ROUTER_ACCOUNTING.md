# Router Accounting

`BasketRouter` is separate from `BasketVault` because one-sided ETH joins are a routing problem, not vault accounting.

## Core Constraint

For an existing basket:

```text
TARGET WEIGHTS != CURRENT VAULT COMPOSITION
```

Target weights describe intended allocation and creation metadata. Current reserves determine the proportional component amounts required to mint shares without diluting existing holders.

## Buy Flow

The router accepts `BuyBasketWithETHParams`:

- `vault`
- `recipient`
- `minSharesOut`
- `deadline`
- `wethAmountsIn[]`
- `minComponentAmountsOut[]`

The caller supplies per-component WETH allocations. This is intentional: Phase 2 does not solve the one-sided join optimization onchain with manipulable spot prices. A frontend or offchain quote flow can propose allocations, but the router enforces component-level minimum outputs and the vault enforces proportional deposit accounting.

Flow:

1. Receive ETH.
2. Wrap ETH to WETH.
3. For each component:
   - if the component is WETH, keep the allocated WETH as that component
   - otherwise verify adapter support and swap WETH to the component with explicit min output
4. Approve the vault only for obtained component amounts.
5. Call `depositFor(recipient, componentAmounts, minSharesOut)`.
6. Clear vault approvals.
7. Refund leftover component dust to the recipient.
8. Unwrap and refund leftover WETH/ETH to the recipient.

If the caller provides component amounts that do not satisfy the vault's current proportional deposit ratio, the vault reverts and the whole transaction reverts, including prior swaps.

## Redeem Flow

`redeemBasketToETH`:

1. Pulls basket shares from the caller.
2. Calls the canonical vault `redeem`, receiving raw components.
3. Swaps supported non-WETH components to WETH with explicit min outputs.
4. Treats WETH components as already-routed WETH.
5. Checks aggregate `minETHOut`.
6. Unwraps WETH and sends ETH to the recipient.

If a component route is unsupported or fails, the transaction reverts. Users still retain the canonical escape hatch: call `BasketVault.redeem()` directly to receive raw components without any swap dependency.

## Adapter Boundary

The router depends only on `ISwapAdapter`. It cannot execute arbitrary calldata and cannot target arbitrary contracts.

The initial `PonsV3Adapter` supports WETH/Pons V1 token routes through the Robinhood Chain Uniswap V3 infrastructure. Fork testing found that the deployed Pons-used router is `SwapRouter02` shaped: `exactInputSingle` has no `deadline` field. BASKET still enforces deadlines in the adapter and router before calling that external router.

## Residual Limitations

- Onchain optimization for "spend exactly X ETH for the largest possible proportional join" is not implemented.
- The router does not use spot prices for security-sensitive vault accounting.
- Residual component dust is refunded as components, not automatically reswapped.
- Fee-on-transfer or rebasing component tokens remain unsupported.
