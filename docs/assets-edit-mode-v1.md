# Assets Edit Mode v1

## Goal

Upgrade the Assets page from create-only into a basic maintenance flow so users can correct or refine asset metadata without leaving the product.

## Why now

- The backend already supports asset updates with `PATCH /assets/:id`.
- The frontend Assets page already has row selection and a selected-asset detail area.
- This is the cleanest next step for improving investment data maintenance without waiting on backend work in another area.

## Current backend support

- `GET /assets`
- `POST /assets`
- `PATCH /assets/:id`
- `DELETE /assets/:id`

For this v1, the frontend only needs update support.

## v1 scope

Add edit mode to the existing Assets page:

- Select an existing asset from the table.
- Enter edit mode from the selected-asset panel.
- Allow editing:
  - `name`
  - `type`
  - `baseCurrency`
- Keep `symbol` read-only in v1.
- Show `Save changes` and `Cancel` actions while editing.
- Refresh the asset list after save.
- Keep the edited asset selected after refresh.
- Reuse the existing page layout instead of introducing a new page or modal.

## Out of scope

- Asset delete UI
- Editing `symbol`
- Bulk edit
- External asset lookup or sync
- Import flow changes
- Search, filters, or table redesign

## Product behavior

### Entry point

- User clicks a row in the asset table.
- The right-side detail panel shows the selected asset.
- Add an explicit `Edit` action in that panel.

### Editing flow

- Entering edit mode pre-fills the form with the selected asset values.
- The page should make it obvious whether the user is creating a new asset or editing an existing one.
- `Cancel` should discard local edits and return to view mode.
- `Save changes` should persist the update through the backend.

### Validation

Use the same basic validation as create:

- `name` is required
- `baseCurrency` is required
- `type` is required

`symbol` stays visible but locked in v1 to avoid changing what feels like the asset identity key.

## UI notes

- Prefer evolving the existing create form into a dual-purpose create/edit form.
- Keep the table interaction model the same.
- Reuse current success and error banner patterns.
- Keep the page lightweight; this is a maintenance upgrade, not a redesign.

## Frontend implementation sketch

Likely changes:

- `src/lib/assets.service.ts`
  - add `updateAsset(id, payload)`
- `src/pages/Assets.tsx`
  - track selected asset
  - add edit/view mode state
  - prefill form on edit
  - branch submit between create and update
  - add cancel handling
  - preserve selected asset after refresh

## Open questions

- Should `type` remain editable forever, or should it become locked once transactions exist for an asset?
- If the backend returns a duplicate-symbol or related-domain error during update, is the current banner-style error handling enough?
- Do we want a small read-only metadata section later, such as created time or usage count?

## Suggested first cut

Keep v1 intentionally small:

1. Add update method to the frontend service.
2. Convert the current create form into create/edit mode.
3. Lock `symbol`.
4. Add `Edit`, `Save changes`, and `Cancel`.
5. Add focused tests for the update flow.
