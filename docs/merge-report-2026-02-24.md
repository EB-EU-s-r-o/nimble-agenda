# Merge Automation Report (AUTO_MERGE)

## Inputs
- Mode: `AUTO_MERGE`
- Requested base branch: `main`
- Requested target branch: `release/integration`
- Merge strategy: `squash`
- Stop on failure: `true`
- Custom merge order: not provided

## Autodetected assumptions
1. Local repository currently has only one local branch: `work`.
2. `main` and `release/integration` do not exist locally and no remotes are configured.
3. As fallback analysis scope, commits after `8075c85` up to `HEAD` were analyzed (`8075c85..HEAD`).

## Safety actions
- Created backup branch: `backup/auto-merge-20260224-234120`.

## Commit analysis (fallback scope)
| SHA | Message | Type | Risk | Notes |
|---|---|---|---|---|
| 22206e9 | Natívna auth... | feat/config/docs | medium | Auth/UI changes + deployment helper script update. |
| 24ccbbf | fix: vercel.json SPA rewrites... | fix/config | high | Changes runtime client config + `vercel.json` rewrite behavior. |
| 9db45f7 | chore: branch ... CI + docs | chore/ci/docs | medium | CI workflow changes may affect pipeline gating. |
| d1dd86c | Changes | fix/refactor | medium | Auth context and runtime type updates. |
| 0a809eb | Fix supabase url at runtime | fix | medium | Merge commit; runtime auth URL behavior touched via child commit. |
| dafad4d | Updated plan file | docs/chore | low | Internal planning metadata only. |
| 5c26bb9 | Changes | build/config | low | Vite config tweak. |
| de818e3 | Cache bust comment updated | chore | low | Merge commit around cache-busting update. |
| 015ea75 | Changes | fix | medium | Auth page/context behavior changed. |
| 82152f6 | Opravil autentifikáciu | fix | medium | Merge commit with auth fix impact. |

## Overlap / conflict risk
- High overlap in auth-related files across commits:
  - `src/contexts/AuthContext.tsx`
  - `src/pages/Auth.tsx`
- Config overlap in deployment/runtime files:
  - `vite.config.ts`
  - `scripts/set-vercel-supabase-env.ps1`
- Potential merge-risk cluster:
  1. `22206e9` -> `24ccbbf` (same script + diagnostics/deploy flow)
  2. `d1dd86c` -> `015ea75` (same auth areas)

## Proposed merge order
Because target/base branches are missing, no merge was executed. If branches are provided and rebased to current history, recommended order is:
1. `22206e9`
2. `24ccbbf`
3. `9db45f7`
4. `d1dd86c`
5. `5c26bb9`
6. `015ea75`
7. merge-wrapper commits (`0a809eb`, `de818e3`, `82152f6`) only if preserving merge topology is required.

Rationale: deploy/config prerequisites first, then auth/runtime changes, then housekeeping commits.

## Test execution
Requested commands:
1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

Result:
- Step 1 failed: `Headless installation requires a pnpm-lock.yaml file`.
- Due to `STOP_ON_FAILURE=true`, subsequent test commands were not executed.

## Merge outcome
- Status: **BLOCKED**
- Blocking reasons:
  1. Missing `main` branch.
  2. Missing `release/integration` branch.
  3. No configured remote to fetch target/base refs.
  4. Required test pipeline failed at dependency installation.

## Safe next steps
1. Create/fetch `main` and `release/integration` branches.
2. Decide package manager lockfile strategy (`pnpm-lock.yaml` vs npm lock).
3. Re-run full test sequence.
4. Retry AUTO_MERGE after green checks.
