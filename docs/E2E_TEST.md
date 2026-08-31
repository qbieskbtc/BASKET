# End-to-End Test

This document records the Phase 4 lifecycle test plan and current execution status.

## Candidate Routable Pons V1 Tokens

The known fork-test route remains valid:

| Token | Address | Pool | Quote check |
| --- | --- | --- | --- |
| Known Pons V1 token | `0x055650555Be80649397084Cd3f8a09b4350e8612` | `0x8f4F723f10fc7bAD28742d25c91158C728557C4c` | `0.001 ETH` quoted to `100702004963188946748351` token units |

An additional real Pons V1 token was found from factory logs and independently quote-checked:

| Token | Address | Pool | Launch block | Quote check |
| --- | --- | --- | ---: | --- |
| Stonkbankers (`BANKERS`) | `0x97133372cC4391A4F6889b4d52387649B76BC7EC` | `0x2D0edeF70886383C395D8207Bf22B8c29c974a7c` | `34788618` | `0.001 ETH` quoted to `225584811030180385513134` token units |

Both quote checks used Robinhood Chain Quoter V2 at `0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7`.

## Required Lifecycle

| Step | Transaction hash | Status | Notes |
| --- | --- | --- | --- |
| Create index | Pending | Not run | Requires deployed BASKET factory |
| Buy basket | Pending | Not run | Requires deployed BASKET router and funded wallet |
| Redeem components | Pending | Not run | Requires user-held BasketVault shares |
| Buy again | Pending | Not run | Requires initialized vault and quote preview |
| Redeem to ETH | Pending | Not run | Requires all components to remain routable |

## Required Post-Transaction Checks

After every transaction, record:

- vault component balances
- total BasketVault share supply
- user BasketVault share balance
- router residual WETH/component balances
- adapter residual WETH/component balances
- ETH returned on ETH redemption
- emitted events
- Blockscout transaction link

## Current Status

No lifecycle transaction has been broadcast from this workspace. Mainnet broadcast is intentionally blocked until:

- deployment scripts are dry-run successfully
- deployed bytecode is verified
- Blockscout source verification succeeds or a precise failure is documented
- full Solidity suite remains green
- frontend typecheck, lint, and build remain green
- an operator supplies funded deployment and E2E wallets
