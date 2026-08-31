# Security Notes

## Admin Model

There are no privileged withdrawals, no upgradeable proxies, and no owner-controlled vault asset movement in Phase 1.

## Supported Assets

Only vanilla ERC-20 tokens should be used. Fee-on-transfer behavior is rejected by balance-delta checks. Rebasing and callback-heavy tokens are out of scope.

## Known Limitations

- The route validator is optional in Phase 1 so local tests can isolate factory and vault behavior.
- Production deployments should pass a validator backed by verified Pons V1 / Uniswap V3 route checks.
- Target weights are metadata for creation, UI, and future router behavior. Phase 1 deposits use current reserves for share accounting.
- No price oracle or TWAP is used in Phase 1.
- No automatic rebalancing is implemented.

