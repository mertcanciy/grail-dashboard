<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes

- Package manager: pnpm. Verify with `pnpm test && pnpm lint && pnpm typecheck && pnpm build`.
- Caching uses the previous (non-Cache-Components) model: `fetch` with `next.revalidate` plus route `revalidate`.
- Grail API (`https://grail.xyz/api`) must be called server-side (no CORS) and needs a `User-Agent` header (Cloudflare returns 403 otherwise).
- Token symbols are inconsistent: most are `gX`, but e.g. JENSEN has symbol `JENSEN` and name `gJENSEN`. Use `ticker()` from `src/lib/grail/meta.ts` for display and the lowercased raw symbol for URLs/API.
- Activity pages max out at `limit=200`; `ohlcv_window_days` max is 30; `pnl/leaderboard` periods are only `all_time` and `24h`.
- Uniswap v4 pool state is read from `PoolManager.extsload` (pools mapping at slot 6), so no StateView address is needed per chain.
- Market-wide aggregates live in `getMarketSnapshot()` (`src/lib/market.ts`). Cache only aggregates there (data cache items max 2 MB), never raw event arrays. Bump the key (`market-snapshot-vN`) when the shape changes.
- Keep pages static/ISR: avoid `searchParams` in pages (it makes them dynamic); prerender variants and switch client-side instead (see Traders).
- Deploy: `vercel deploy --prod` (project `mertcanciys-projects/grail-dashboard`, alias https://grail-dashboard-seven.vercel.app).
- Pinned dependency versions are all at least 7 days old at install time; keep that rule when upgrading.
