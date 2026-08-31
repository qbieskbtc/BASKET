# Phase 1 Adversarial Audit

Date: 2026-08-30

Scope:

- `PLAN.md`
- `docs/SHARE_ACCOUNTING.md`
- `src/BasketFactory.sol`
- `src/BasketVault.sol`
- all tests and mocks under `test/`

## Summary

Phase 1 uses proportional component-token deposits and pro-rata component-token redemption. The audit did not find a value-stealing vulnerability in the current vanilla ERC-20 model.

The most important limitation is asset support: rebasing tokens cannot be reliably detected at vault construction and remain explicitly unsupported. Tokens accidentally sent to a vault that are not basket components are trapped by design in Phase 1 because there is no rescue authority.

## Findings

### First Depositor Attacks

Attack: initialize the vault at an arbitrary component ratio, then force later users to deposit against that ratio.

Status: not a theft bug in Phase 1. The first depositor does define the initial real-reserve ratio, but later shares are minted only against actual reserves. Future one-click ETH routing must quote and initialize carefully.

Tests: `testFirstDeposit`, `testSubsequentDepositUsesWeakestProportionalContribution`.

### Share Inflation and Donation Attacks

Attack: donate component tokens to skew reserves, then deposit or redeem to mint outsized shares.

Status: not vulnerable. Donations increase reserves without minting shares. Later deposits must contribute against the larger reserve base.

Tests: `testDonationRaisesRequiredContribution`, `testRoundingFavorsVault`, invariant `TotalHolderClaimsNeverExceedAssetsHeld`.

### Rounding Exploitation

Attack: repeatedly deposit and redeem small amounts to collect truncation dust.

Status: not vulnerable in tested cases. Deposit shares round down and required input amounts round up; redemption outputs round down.

Tests: `testRepeatedDepositRedeemCannotExtractRoundingProfit`, invariant run.

### Deposit Ordering and Component Imbalance

Attack: provide excess of one component and too little of another to receive shares based on the excess component.

Status: not vulnerable. Shares are based on the weakest proportional component and the vault pulls only the exact required amounts.

Tests: `testSubsequentDepositUsesWeakestProportionalContribution`.

### Partial Component Transfers and Fee-On-Transfer Tokens

Attack: use a token that delivers less than requested but returns success.

Status: rejected. The vault checks exact balance delta for each deposit transfer.

Tests: `testFeeOnTransferTokenRejected`.

### Tokens Returning False

Attack: token mutates state but returns `false`.

Status: rejected by OpenZeppelin `SafeERC20`.

Tests: `testFalseReturnTokenRejected`.

### Tokens With No Return Value

Attack: vanilla-but-old token returns no data.

Status: accepted if and only if the balance delta is exact. This matches `SafeERC20` behavior.

Tests: `testNoReturnTokenAcceptedWhenBalanceDeltaIsExact`.

### Rebasing Tokens

Attack: component balances mutate outside deposits and redemptions.

Status: unsupported. A positive rebase benefits current holders; a negative rebase would reduce reserves. The vault cannot reliably detect future rebasing behavior. Production route validation must reject known rebasing assets.

Tests: `testRebasingTokenCanChangeClaimsAndIsUnsupported`.

### Reentrancy and ERC777-Style Callbacks

Attack: reenter `deposit` during component transfer.

Status: rejected by `ReentrancyGuard`.

Tests: `testReentrancyAttemptRejected`.

### Zero-Share Mints and Dust Deposits

Attack: submit tiny amounts that round to zero shares while changing accounting.

Status: rejected for initialized vaults when computed shares are zero.

Tests: `testTinyDepositRejected`, invariant `ZeroSupplyHasNoTrackedShares`.

### Dust Redemptions and Integer Truncation

Attack: redeem tiny share amounts repeatedly to create assets.

Status: not vulnerable in tested cases. Redemption burns shares and can only transfer a floor-rounded pro-rata amount.

Tests: `testRepeatedDepositRedeemCannotExtractRoundingProfit`, invariant `TotalHolderClaimsNeverExceedAssetsHeld`.

### Duplicate Components

Attack: include the same token twice to double-count balances.

Status: rejected both by the factory and by the vault constructor.

Tests: `testRejectsDuplicateComponents`.

### Component Count Gas Griefing

Attack: create a basket with too many components.

Status: rejected above 10 components.

Tests: `testRejectsMoreThanTenAssets`.

### Vault Initialization and Factory Bypass

Attack: deploy `BasketVault` directly with malformed components.

Status: malformed component arrays, zero addresses, duplicate components, invalid counts, and invalid weights are rejected by the vault constructor. Directly deployed vaults can still use unsupported tokens because route validation lives in the factory. Treat factory-created vaults as canonical.

Tests: constructor validation is exercised through factory tests; route validation is tested in `testRejectsUnsupportedToken`.

### Creator Privilege

Attack: creator steals or changes vault assets after creation.

Status: not vulnerable. Creator is immutable metadata and has no privileged asset movement.

Tests: reviewed in code; no creator-only functions exist.

### Accidental Trapped Assets

Attack: send non-component tokens or ETH to the vault.

Status: non-component tokens are trapped. Direct ETH transfers revert, but ETH can be forcibly sent via `selfdestruct` semantics and then remains trapped. There is no rescue function because a rescue authority could become an asset-theft vector.

Tests: `testDirectETHTransferRejected`, `testForcedETHCanBeTrappedButDoesNotAffectShares`, `testNonComponentTokenSentToVaultIsNotRedeemed`.

## Invariants

Added invariant testing in `test/BasketVault.invariant.t.sol`.

Checked:

- total tracked holder claims never exceed component assets held
- tracked shares never exceed total supply
- zero supply implies tracked holders have zero shares

Run settings:

- `runs = 512`
- `depth = 64`
- total invariant calls: 32,768
- latest full suite: 52 passed, 0 failed, 0 skipped

## Fixes Made During Audit

No value-stealing vulnerability was found that required a production contract fix.

Coverage was expanded with:

- false-return token mock
- no-return token mock
- rebasing token mock
- forced ETH mock
- deposit/redeem fuzz tests
- invariant handler and invariant tests

## Phase 2 Implications

The router must not split ETH by target weights for existing baskets. It must buy the proportional component amounts required by the current vault reserves, then call `deposit` with component-level slippage protections and refund residual dust.
