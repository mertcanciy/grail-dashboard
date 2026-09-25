# Grail Pulse

An independent, live dashboard for [Grail](https://grail.xyz), where PSA 10 cards and authenticated memorabilia sit in an insured vault and each legend gets a single tradable ERC-20 (gYAMAL, gSWIFT, gMJ, …).

## What's in it

- **Overview** (`/`): market-wide KPIs, a draggable marquee of gToken "slabs", a five-lens breakdown of where trading happens (gToken, category, chain & quote pair, action type, wallet), buy-size behavior, a UTC activity heatmap, movers and the latest swaps.
- **gTokens** (`/tokens`): sortable, filterable table with 7-day sparklines, holders and the cost of one full redeemable item.
- **gToken detail** (`/tokens/[symbol]`): price chart (24h / 7d / 30d), 7-day buy/sell flow, holder concentration, vaulted items, every contract address, and a panel that reads pool state straight from the chain.
- **Traders** (`/traders`): Grail's PnL leaderboard plus the week's biggest buyers.
- **Packs** (`/packs`): every pack series, price and sell-through.

## Data sources

| Source | Used for | Where |
| --- | --- | --- |
| `https://grail.xyz/api` (public, no auth) | tokens, OHLCV, activity, holders, PnL leaderboard, packs | server only; the API sends no CORS headers for other origins |
| Base and Robinhood Chain public RPCs | totalSupply, Uniswap v3 `slot0`/reserves, Uniswap v4 pool state via `PoolManager.extsload` | browser, via viem + Multicall3 |

Market-wide metrics (average buy, lenses, heatmap) are computed from a rolling 7-day window of activity pages, cached with ISR (`revalidate` 120–900s).

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
