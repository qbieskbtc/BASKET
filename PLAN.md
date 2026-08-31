# BASKET Phase 1 Plan

BASKET lets anyone create and invest in an onchain index of Robinhood Chain assets.

## Scope

Phase 1 builds the smallest auditable contract core:

- A Foundry project layout.
- `BasketFactory`, which validates basket parameters and deploys immutable-weight basket share vaults.
- `BasketVault`, an ERC-20 share token that accepts safe proportional component-token deposits.
- Proportional underlying-token redemption that works without any swap route.
- Focused tests for validation, accounting, redemption, donations, and hostile token behavior.

One-click ETH deposits, ETH redemptions, Pons V3 swapping, quoting, fork tests, and the frontend are deliberately outside Phase 1.

## Architecture

```text
creator/user
    |
    v
BasketFactory
    | deploys
    v
BasketVault (ERC-20 basket shares)
    |
    | holds exact component ERC-20 balances
    v
component tokens
```

Future phases add:

```text
BasketRouter -> ISwapAdapter -> PonsV3Adapter -> Robinhood Chain Uniswap V3
```

The vault does not contain DEX-specific logic.

## External Contracts

Phase 1 depends only on ERC-20 component token contracts chosen by basket creators. No Robinhood Chain Pons or Uniswap contracts are called yet.

Known Robinhood Chain addresses reserved for Phase 2 verification:

- Pons active V1 factory: `0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB`
- Pons active locker: `0x736D76699C26D0d966744cAe304C000d471f7F35`
- Uniswap V3 factory: `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA`
- Swap Router: `0xCaf681a66D020601342297493863E78C959E5cb2`
- Quoter V2: `0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7`
- WETH: `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`

These addresses must be verified by deployed bytecode and interface checks before production deployment.

## Security Assumptions

- Phase 1 supports only vanilla ERC-20 component tokens.
- Fee-on-transfer and rebasing behavior is rejected by balance-delta checks during deposits.
- Duplicate components, zero addresses, zero weights, and invalid weight totals are rejected.
- Shares are minted from proportional asset contribution, not ETH amount.
- Rounding favors the vault and existing holders.
- Direct token donations increase the value of existing shares and do not grant free shares to donors.
- No owner can withdraw vault assets.
- No upgradeable proxy is used.

## Not Safe For V1

- One-sided ETH deposits directly into the vault.
- Contract accounting based on spot pool prices.
- Automatic rebalancing.
- Pons V2 bonding-curve support.
- Non-standard ERC-20 support.
- Fake analytics, fake TVL, fake returns, or centralized token-list assumptions.

## Phase Order

1. Contracts and Phase 1 Foundry tests.
2. `ISwapAdapter`, `PonsV3Adapter`, `BasketRouter`, and Robinhood Chain fork tests.
3. Next.js frontend for create/detail/deposit/redeem.
4. Pons token indexer, explore page, and real read-only analytics.
