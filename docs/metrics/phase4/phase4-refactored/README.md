# Phase 4 Refactored Metrics

- Git tag: phase4-refactored
- Commit: eb184827a1121f3dfc6a0fca5e014707cc615e55
- Tool: Lizard
- Version: 1.26.1
- Excluded directories: node_modules, dist, coverage

## Command

python -m lizard -x "*/node_modules/*" -x "*/dist/*" -x "*/coverage/*" .

Run from the root of a clean checkout of the tag, with `lizard==1.26.1` installed in a virtual environment.

Differences from the `phase3` output (the measurement itself is the same):

- `phase3` was run on Windows, so its paths use backslashes. This run was on macOS, so paths use forward slashes.
- `docs/metrics/phase3/lizard-report.txt` is UTF-16 LE with CRLF line endings. `lizard-report.txt` here is UTF-8 with LF line endings.

## Results

- Files analyzed: 243
- Total NLOC: 16,702
- Functions analyzed: 1,787
- Average cyclomatic complexity: 1.7
- Functions with warnings: 8

## Hotspot classes

NLOC and CCN are those of the main function of each hotspot, as in the `phase3` hotspot table.

| Class | Main function | NLOC `phase3` | NLOC `phase4-refactored` | CCN `phase3` | CCN `phase4-refactored` |
|---|---|---|---|---|---|
| `ui/src/components/operator/CityMap.tsx` | `CityMap` | 215 | 215 | 28 | 28 |
| `ui/src/shared/api/client.ts` | `apiErrorMessage` | 59 | 7 | 28 | 5 |
| `ui/src/components/customer/CustomerHome.tsx` | `CustomerHome` | 120 | 110 | 20 | 18 |
| `ui/src/components/customer/CustomerProfile.tsx` | `CustomerProfile` | 98 | 98 | 20 | 20 |
| `ui/src/components/dashboard/CustomerDashboard.tsx` | `CustomerDashboard` | 162 | 169 | 19 | 19 |

Files added by the refactorings:

| File | Main function | NLOC | CCN |
|---|---|---|---|
| `ui/src/components/dashboard/useCustomerCart.ts` | `useCustomerCart` | 45 | 1 |
| `ui/src/components/customer/customerHomeUtils.ts` | `getVisibleRestaurants` (largest of 5 helpers) | 12 | 1 |

## Class coupling (counted by hand)

Same rule as the baseline: the number of distinct components, classes and types each file imports directly. React hooks, helper functions and stylesheets are not counted.

| Class | `phase3` | `phase4-refactored` | Coupled to (`phase4-refactored`) |
|---|---|---|---|
| `CityMap` | 10 | 10 | `CourierSummary`, `Order`, `OrderAssignment`, `Position`, `Restaurant`, `IconAlert`, `IconClose`, `IconPin`, `IconStore`, `DeliveryRouteDetails` |
| `client.ts` | 1 | 1 | see note |
| `CustomerHome` | 7 | 8 | `DishArt`, `AddressPrompt`, `IconArrowRight`, `IconPlus`, `IconSearch`, `MenuItem`, `Restaurant`, `Dish` |
| `CustomerProfile` | 8 | 8 | `IconHome`, `PasswordSection`, `PersonalInfoForm`, `AddressForm`, `Account`, `Address`, `Order`, `Restaurant` |
| `CustomerDashboard` | 17 | 17 | `ApiError`, `CartView`, `CustomerProfile`, `OrdersPage`, `CustomerHome`, `RestaurantMenu`, `ConfirmDialog`, `DashboardHeader`, `CustomerPage`, `Account`, `Address`, `CustomerProfileResponse`, `MenuItem`, `Order`, `Restaurant`, `RunAction`, `ShowToast` |

Notes:

- `client.ts` imports only helper functions (`commandName`, `logError`, `logSuccess`), so the strict rule gives 0. The `phase3` baseline recorded 1, and the file's imports and declared classes (`ApiError`, `NetworkError`) are identical at both tags, so 1 is carried over for consistency.
- `CustomerHome` gained `Dish`, a type now exported by `customerHomeUtils.ts`.
- The files added by the refactorings couple to: `useCustomerCart` 4 (`CustomerPage`, `MenuItem`, `Restaurant`, `ShowToast`), `customerHomeUtils` 2 (`MenuItem`, `Restaurant`).
- `CustomerDashboard` main function NLOC went up (162 to 169) while the file NLOC dropped (358 to 312).

## Re-run

```
git worktree add --detach <path-outside-repo> phase4-refactored
cd <path-outside-repo>
python -m lizard -x "*/node_modules/*" -x "*/dist/*" -x "*/coverage/*" . > lizard-report.txt
git worktree remove <path-outside-repo>
```
