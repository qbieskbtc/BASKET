# Share Accounting

Phase 1 does not put one-sided ETH deposits in `BasketVault`. The safe base is proportional component-token deposits and proportional component-token redemption.

## Deposit Model

The first deposit initializes actual component reserves. The vault mints shares equal to the smallest supplied component amount. This intentionally avoids pretending that unrelated ERC-20 units have a trusted common price.

After initialization, a depositor submits maximum component amounts. The vault calculates the shares supported by each component:

```text
candidateShares[i] = maxAmountIn[i] * totalSupply / reserve[i]
shares = min(candidateShares)
```

The vault then pulls only the exact required component amounts:

```text
requiredAmount[i] = ceil(shares * reserve[i] / totalSupply)
```

Rounding up required inputs favors the vault and existing holders. Rounding down shares prevents a depositor from receiving more ownership than the weakest contributed component supports.

## Redemption Model

Redemption burns shares and transfers each component pro rata:

```text
amountOut[i] = balance[i] * shares / totalSupply
```

This does not depend on any swap route, external price, or frontend service. If liquidity disappears, holders can still withdraw the underlying assets.

## Donation Attacks

Direct token transfers to the vault increase reserves without minting shares. Later depositors must contribute against the higher reserve base. Existing holders receive the economic benefit of the donation.

## First Depositor Risk

The first depositor defines the initial reserve ratio. This is acceptable for Phase 1 because shares represent proportional ownership of actual reserves, not an oracle-priced NAV. In Phase 2, one-click ETH routing should initialize according to quoted target weights with explicit slippage limits.

## Unsupported Tokens

Phase 1 rejects fee-on-transfer tokens during deposit by checking that the vault balance increase exactly matches the required transfer amount. Rebasing tokens remain unsupported because their balances can mutate outside vault accounting.

