# Phase 4 Metrics

- Git tag: none yet. Measured from origin/main at commit 35415d0fb4d9e261656abece00a2cd9d300eadb1 because the phase4 tag does not exist yet; re-run when tagged.
- Tool: Lizard
- Version: 1.26.1
- Excluded directories: node_modules, dist, coverage

The commit is the merge of PR #204 (UI rating form and average rating), which follows the merged backend RVW work (PR #202), so all RVW code is present.

## Command

python -m lizard -x "*/node_modules/*" -x "*/dist/*" -x "*/coverage/*" .

Run from the root of a clean checkout of the commit, with `lizard==1.26.1` installed in a virtual environment.

Differences from the `phase3` output (the measurement itself is the same):

- `phase3` was run on Windows, so its paths use backslashes. This run was on macOS, so paths use forward slashes.
- `docs/metrics/phase3/lizard-report.txt` is UTF-16 LE with CRLF line endings. `lizard-report.txt` here is UTF-8 with LF line endings.

## Results

- Files analyzed: 251
- Total NLOC: 17,316
- Functions analyzed: 1,855
- Average cyclomatic complexity: 1.7
- Functions with warnings: 8

## Hotspot classes

NLOC and CCN are those of the main function of each hotspot, as in the `phase3` hotspot table.

| Class | Main function | NLOC `phase4-refactored` | NLOC `phase4` | CCN `phase4-refactored` | CCN `phase4` |
|---|---|---|---|---|---|
| `ui/src/components/operator/CityMap.tsx` | `CityMap` | 215 | 215 | 28 | 28 |
| `ui/src/shared/api/client.ts` | `apiErrorMessage` | 7 | 7 | 5 | 5 |
| `ui/src/components/customer/CustomerHome.tsx` | `CustomerHome` | 110 | 110 | 18 | 18 |
| `ui/src/components/customer/CustomerProfile.tsx` | `CustomerProfile` | 98 | 98 | 20 | 20 |
| `ui/src/components/dashboard/CustomerDashboard.tsx` | `CustomerDashboard` | 169 | 173 | 19 | 19 |

Only `CustomerDashboard` changed (it gained the `rateOrder` action and rating state); the other four files are identical to `phase4-refactored`.

## RVW classes

All appear in `lizard-report.txt`.

| File | Main function | NLOC | CCN | File NLOC | File functions |
|---|---|---|---|---|---|
| `backend/src/domain/rvw/ratings.service.ts` (`RatingsService`, `RatingRepository`) | `rate` | 28 | 6 | 47 | 2 |
| `backend/src/domain/rvw/ratings.models.ts` (`RatingRequest`, `Rating`) | `initialize` | 3 | 1 | 24 | 1 |
| `backend/src/domain/rvw/index.ts` | none (re-exports) | 0 | 0 | 2 | 0 |
| `backend/src/application/commands/rvw/rate-order.command.ts` (`RateOrderCommand`) | `execute` | 3 | 1 | 15 | 2 |
| `backend/src/infrastructure/rvw/ratings.prismarepository.ts` (`PrismaRatingRepository`) | `create` | 20 | 3 | 53 | 4 |
| `ui/src/components/customer/RatingForm.tsx` (`RatingForm`) | `RatingForm` | 16 | 1 | 68 | 6 |

`RatingRepository` is an abstract class with no function bodies, so Lizard lists no function for it. Its lines are part of the `ratings.service.ts` file NLOC.

Existing files modified by RVW also in the report: `OrdersPage.tsx` (file NLOC 389), `OrdersController`, `DeliveryService`, `restaurants.models.ts`, `restaurants.prismarepository.ts`, `dashboard.utils.ts` (`formatRating`), `OperatorOverview.tsx`, `RestaurantProfile.tsx`.

## Class coupling (counted by hand)

Same rule as the baseline: the number of distinct components, classes and types each file imports directly. React hooks, helper functions and stylesheets are not counted.

| Class | `phase3` | `phase4-refactored` | `phase4` | Coupled to (`phase4`) |
|---|---|---|---|---|
| `CityMap` | 10 | 10 | 10 | `CourierSummary`, `Order`, `OrderAssignment`, `Position`, `Restaurant`, `IconAlert`, `IconClose`, `IconPin`, `IconStore`, `DeliveryRouteDetails` |
| `client.ts` | 1 | 1 | 1 | see note |
| `CustomerHome` | 7 | 8 | 8 | `DishArt`, `AddressPrompt`, `IconArrowRight`, `IconPlus`, `IconSearch`, `MenuItem`, `Restaurant`, `Dish` |
| `CustomerProfile` | 8 | 8 | 8 | `IconHome`, `PasswordSection`, `PersonalInfoForm`, `AddressForm`, `Account`, `Address`, `Order`, `Restaurant` |
| `CustomerDashboard` | 17 | 17 | 18 | `ApiError`, `CartView`, `CustomerProfile`, `OrdersPage`, `CustomerHome`, `RestaurantMenu`, `ConfirmDialog`, `DashboardHeader`, `CustomerPage`, `Account`, `Address`, `CustomerProfileResponse`, `MenuItem`, `Order`, `Restaurant`, `RunAction`, `ShowToast`, `RatingValues` |

Notes:

- `client.ts` imports only helper functions (`commandName`, `logError`, `logSuccess`), so the strict rule gives 0. The `phase3` baseline recorded 1, and the file's imports and declared classes (`ApiError`, `NetworkError`) are identical at all three snapshots, so 1 is carried over for consistency.
- `CustomerDashboard` gained the `RatingValues` type from `RatingForm.tsx`. The other four hotspot files have no changes between `phase4-refactored` and `phase4`.

## Re-run

```
git worktree add --detach <path-outside-repo> phase4
cd <path-outside-repo>
python -m lizard -x "*/node_modules/*" -x "*/dist/*" -x "*/coverage/*" . > lizard-report.txt
git worktree remove <path-outside-repo>
```
