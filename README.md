# Grail Pulse

An independent, live dashboard for [Grail](https://grail.xyz), where PSA 10 cards and authenticated memorabilia sit in an insured vault and each legend gets a single tradable ERC-20 (gYAMAL, gSWIFT, gMJ, …).

## What's in it

- **Overview** (`/`): market-wide KPIs, a draggable marquee of gToken "slabs", a five-lens breakdown of where trading happens (gToken, category, chain & quote pair, action type, wallet), buy-size behavior, a UTC activity heatmap, movers and the latest swaps.
- **gTokens** (`/tokens`): sortable, filterable table with 7-day sparklines, holders and the cost of one full redeemable item.
- **gToken detail** (`/tokens/[symbol]`): price chart (24h / 7d / 30d), 7-day buy/sell flow, holder concentration, the real cost to buy or sell one redeemable item through the pool (with a market-depth table), wallets that could redeem today, proof of vault (every slab with its grading certificate and on-chain registration, plus a supply check), every contract address, and a panel that reads pool state straight from the chain.
- **Vault** (`/vault`): the whole vault registry, recently vaulted items, supply checks per gToken and every collector wallet that could redeem an item.
- **Wallets** (`/address/[address]`): holdings, progress toward redeeming each item, PnL and recent activity. Wallets without a Grail account fall back to on-chain balances.
- **Traders** (`/traders`): Grail's PnL leaderboard plus the week's biggest buyers.
- **Packs** (`/packs`): every pack series, price and sell-through.
- **Search** (⌘K or `/`): gTokens, wallets and usernames, certificate numbers and contract addresses. The index (`/api/search`) is rebuilt every 5 minutes and searched entirely in the browser.
- **Share images**: every page and gToken gets a generated Open Graph image with live price and a 7-day sparkline.

## Data sources

| Source | Used for | Where |
| --- | --- | --- |
| `https://grail.xyz/api` (public, no auth) | tokens, OHLCV, activity, holders, PnL leaderboard, packs | server only; the API sends no CORS headers for other origins |
| Base and Robinhood Chain public RPCs | totalSupply, Uniswap v3 `slot0`/reserves, Uniswap v4 pool state via `PoolManager.extsload` | browser, via viem + Multicall3 |
| Uniswap v3 QuoterV2 / v4 Quoter | executable buy/sell cost for 1%–100% of one item | server, Multicall3, cached 5 min (`src/lib/quotes.ts`) |

Market-wide metrics (average buy, lenses, heatmap, top buyers) are computed from a rolling 7-day window of activity pages.

## How it stays fresh

- **Pages are ISR-cached.** Prices and 24h figures refresh every 2 minutes, market-wide flow metrics every 5, holders and packs every 15. The first visit after a window expires still gets the cached page immediately, and a fresh one is rebuilt in the background.
- **One shared market snapshot.** The expensive 7-day activity walk runs once per 5 minutes (`src/lib/market.ts`, `unstable_cache`) and is shared by the Overview and Traders pages.
- **Open tabs update themselves.** `AutoRefresh` re-requests server data every 2 minutes while the tab is visible, and again when you return to it. Selected tabs and filters are kept; KPI counters glide to the new values.
- **New gTokens appear automatically.** Lists re-read Grail's token list on every rebuild. Token pages that didn't exist at deploy time render on their first visit and are cached from then on. Unknown legends get a readable name from Grail's `name` field and fall back to the Grail logo until images exist.
- **Failures degrade, not break.** If Grail is unreachable while a page is being rebuilt, the last good version keeps being served. A build with Grail unreachable skips prerendering token pages instead of failing.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest unit tests for metrics and formatting
pnpm lint
pnpm typecheck  # next typegen && tsc
pnpm build
```

UI primitives and blocks (draggable marquee, smooth scroll, tabs, tooltip, table, skeleton) come from the [ObsidianUI](https://www.obsidianui.dev) registry. Add more with `npx shadcn@latest add "https://www.obsidianui.dev/r/<name>.json"`.

Not affiliated with Grail. Nothing here is financial advice.
