# Phase 3 Frontend Plan

BASKET is permissionless onchain indexes for Robinhood Chain.

## Principles

- The product is the homepage.
- Show real contract data only.
- Use `—` for AUM, performance, holders, and other metrics until real infrastructure exists.
- Keep raw component redemption visible as the canonical safe exit.
- Do not modify contracts unless frontend integration reveals a concrete ABI issue.

## Frontend Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- wagmi
- viem
- injected EVM wallets
- Forge artifact JSON imports for contract ABIs

## Routes

- `/`: homepage with hero and live indexes table.
- `/explore`: searchable index table.
- `/create`: four-step basket creation flow.
- `/basket/[address]`: index detail, composition, buy/redeem panels.
- `/docs`: concise protocol notes linked from navigation.

## Data Model

Contract addresses come from environment variables:

- `NEXT_PUBLIC_BASKET_FACTORY_ADDRESS`
- `NEXT_PUBLIC_BASKET_ROUTER_ADDRESS`

When the factory address is unavailable, the app renders an intentional empty state rather than mock baskets.

Reads:

- `BasketFactory.basketCount`
- `BasketFactory.basketAt`
- `BasketVault.name`
- `BasketVault.symbol`
- `BasketVault.creator`
- `BasketVault.components`
- `BasketVault.targetWeights`
- `BasketVault.totalSupply`
- component ERC-20 metadata and vault balances

Writes:

- `BasketFactory.createBasket`
- `BasketRouter.buyBasketWithETH`
- `BasketRouter.redeemBasketToETH`
- `BasketVault.redeem`

All writes should validate input, simulate through wagmi/viem, send wallet transaction, wait for receipt, then refresh state.

## Pons Discovery

The create page discovers Pons V1 launches from the active factory `TokenLaunched` logs. It starts with bounded chunks from the documented active-factory start block and does not fall back to a fake token list.

## Design System

- Warm off-white background.
- Near-black primary text and actions.
- Muted gray secondary text.
- Hairline borders.
- Large editorial headings.
- Uppercase labels.
- Tabular numbers.
- Rows instead of oversized cards.
- Signature composition strip reused across homepage, explore, create, and basket pages.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local responsive smoke check through the dev server

No deployment in Phase 3.
