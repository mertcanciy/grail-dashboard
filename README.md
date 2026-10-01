# Grail Pulse

An independent, live dashboard for [Grail](https://grail.xyz), where PSA 10 cards and authenticated memorabilia sit in an insured vault and each legend gets a single tradable ERC-20 (gYAMAL, gSWIFT, gMJ, …).

Live at **https://graildashboard.vercel.app**.

## What's in it

- **Overview** (`/`): market-wide KPIs, a draggable marquee of gToken "slabs", a five-lens breakdown of where trading happens (gToken, category, chain & quote pair, action type, wallet), buy-size behavior, a UTC activity heatmap, movers and the latest swaps.
- **gTokens** (`/tokens`): sortable, filterable table with 7-day sparklines, holders and the cost of one full redeemable item.
- **gToken detail** (`/tokens/[symbol]`): price chart (24h / 7d / 30d), 7-day buy/sell flow, who holds it (Grail's own inventory is shown separately and collector shares are measured against the float it leaves), the real cost to buy or sell one redeemable item through the pool (with a market-depth table), wallets that could redeem today, proof of vault (every slab with its grading certificate and on-chain registration, plus a supply check), every contract address, and a panel that reads pool state straight from the chain. Tokens backed by several items are described by the cheapest one to redeem.
- **Vault** (`/vault`): the whole vault registry, recently vaulted items, supply checks per gToken and every collector wallet that could redeem an item.
- **Wallets** (`/address/[address]`): holdings, progress toward redeeming each item, PnL and recent activity, including named achievements and opened packs. Private Grail profiles and wallets without a Grail account fall back to on-chain balances and to their trades from the last 7 days of Grail's public token feeds, which load after the page has rendered.
- **Traders** (`/traders`): Grail's PnL leaderboard plus the week's biggest buyers.
- **Packs** (`/packs`): every pack series, price and sell-through.
- **Search** (⌘K or `/`): gTokens, wallets and usernames, certificate numbers and contract addresses. The index (`/api/search`) is rebuilt every 5 minutes and searched entirely in the browser.
- **Share images**: every page and gToken gets a generated Open Graph image with live price and a 7-day sparkline.

## Data sources

| Source | Used for | Where |
| --- | --- | --- |
| `https://grail.xyz/api` (public, no auth) | tokens, OHLCV, activity, holders, profiles, PnL leaderboard, packs, vault items | server only; the API sends no CORS headers for other origins |
| `https://grail.xyz/api/robinhood/tickers/{TICKER}/latest` | live USD price of the stock an equity-paired pool trades against (SPY, NVDA, GOOGL, SPCX) | server, with the item quotes |
| Base and Robinhood Chain public RPCs | totalSupply, Uniswap v3 `slot0`/reserves, Uniswap v4 pool state via `PoolManager.extsload`; wallet balances | browser for pool state, server for balances; viem + Multicall3 |
| Uniswap v3 QuoterV2 / v4 Quoter | executable buy/sell cost for 1%–100% of one item | server, Multicall3, cached 5 min (`src/lib/quotes.ts`) |

Market-wide metrics (average buy, lenses, heatmap, top buyers) are computed from a rolling 7-day window of activity pages: up to 60 pages (12,000 events) per gToken, read in parallel batches. When a token's feed fails, stops partway or is busier than that, the page says so instead of silently undercounting.

## How it stays fresh

- **Pages are ISR-cached.** Prices and 24h figures refresh every 2 minutes, market-wide flow metrics every 5, holders and packs every 15. The first visit after a window expires still gets the cached page immediately, and a fresh one is rebuilt in the background. A page nobody has opened for over an hour is rebuilt before it is served (`expireTime` in `next.config.ts`).
- **Every page shows how old its data is.** "Updated 3 min ago" counts up in the browser. If a visitor lands on an expired cached page, it fetches the rebuilt version within seconds. Relative times on trades keep counting too, so a cached "just now" never stays "just now".
- **One shared market snapshot.** The expensive 7-day activity walk runs once per 5 minutes (`src/lib/market.ts`, `unstable_cache`) and is shared by the Overview and Traders pages. Wallet activity for private or non-Grail wallets (`/api/address/[address]/activity`) reads the same cached pages from a dynamic route, so it never holds a page render back.
- **Open tabs update themselves.** `AutoRefresh` re-requests server data every 2 minutes while the tab is visible, and again when you return to it. Selected tabs and filters are kept; KPI counters glide to the new values.
- **New gTokens appear automatically.** Lists re-read Grail's token list on every rebuild. Token pages that didn't exist at deploy time render on their first visit and are cached from then on. Unknown legends get a readable name from Grail's `name` field and fall back to the Grail logo until images exist.
- **Failures degrade, not break.** If Grail is unreachable while a page is being rebuilt, the last good version keeps being served. Missing pieces are labeled (an activity feed that didn't answer, a vault item list that didn't load) rather than shown as empty. A build with Grail unreachable skips prerendering token pages instead of failing.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest unit tests for metrics, formatting, activity walks and wallet rows
pnpm lint
pnpm typecheck  # next typegen && tsc
pnpm build
```

The draggable slab marquee comes from the [ObsidianUI](https://www.obsidianui.dev) registry. Add more blocks with `npx shadcn@latest add "https://www.obsidianui.dev/r/<name>.json"`.

Not affiliated with Grail. Nothing here is financial advice.
