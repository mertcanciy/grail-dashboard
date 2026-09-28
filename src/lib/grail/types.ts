export type ChainId = 8453 | 4663;

/** [unix seconds, open, high, low, close, volume USD] */
export type Candle = [number, number, number, number, number, number];

export interface V4Pool {
  pool_manager_address: string;
  pool_id: string;
  pool_key: {
    currency0: string;
    currency1: string;
    fee: number;
    tick_spacing: number;
    hooks: string;
  };
}

export interface Reserve {
  chain_id: ChainId;
  reserve_id: number;
  reserve_address: string;
  name: string;
  symbol: string;
  category: string;
  psa_pop: number;
  multiplier: number;
  image_url: string;
  backed_supply: number;
  vaulted_cards_count?: number;
  available_nfts_count?: number;
  reserve_price: number;
  reserve_market_cap: number;
  reserve_fdv: number;
}

export interface OffchainCollectible {
  collectible_id: number;
  name: string;
  symbol: string;
  category: string;
  psa_pop: number;
  multiplier: number;
  image_url: string;
  backed_supply: number;
  available_items_count: number;
}

export interface GrailToken {
  chain_id: ChainId;
  token_id: number;
  token_address: string;
  pool_address: string;
  v4_pool?: V4Pool | null;
  name: string;
  symbol: string;
  decimals: number;
  image_url: string;
  tags: string[];
  peg_asset_address?: string | null;
  peg_ticker?: string | null;
  market_price: number | null;
  market_cap: string;
  volume_24h: string;
  price_change_1h_percent: string;
  price_change_24h_percent: string;
  price_change_7d_percent: string;
  volume_change_24h_percent: string;
  deployment_status: string;
  block_number: number;
  tx_hash: string;
  created_at: string;
  updated_at: string;
  total_supply: number;
  circulating_supply: number;
  ohlcv_list: Candle[] | null;
  reserves: Reserve[];
  offchain_collectibles: OffchainCollectible[];
  backed_supply?: number;
  available_nfts_count?: number;
  player_market_cap: number;
  player_fdv: number;
  unpriced: boolean;
}

export type ActivityType =
  | "BUY"
  | "SELL"
  | "LP_ADD"
  | "LP_REMOVE"
  | "LP_FEE_COLLECT"
  | "PACK_CLAIM"
  | "PACK_NFT_BUY"
  | "PACK_NFT_SELL"
  | "PACK_NFT_TRANSFER_IN"
  | "PACK_NFT_TRANSFER_OUT"
  | (string & {});

export interface Activity {
  address: string;
  avatar_url?: string;
  block_number: number;
  block_timestamp: string;
  display_name: string;
  log_index: number;
  price?: string;
  token_amount: string;
  tx_hash: string;
  type: ActivityType;
  usd_value?: string;
  user_id?: number;
  username?: string;
}

/** Activity enriched with the token it belongs to. */
export interface TokenActivity extends Activity {
  symbol: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Holder {
  address: string;
  balance: string;
  percentage: string;
  display_name: string;
  usd_value: string;
  avatar_url?: string;
  user_id?: number;
  username?: string;
}

export type LeaderboardPeriod = "all_time" | "24h";
export type LeaderboardMetric = "total" | "realized" | "unrealized";

export interface LeaderboardEntry {
  rank: number;
  user_id: number | null;
  is_grail_user: boolean;
  label: string;
  username: string | null;
  avatar_url: string | null;
  twitter_username: string | null;
  wallet_address: string;
  pnl_usdc: string;
  realized_pnl_usdc: string;
  unrealized_pnl_usdc: string;
  total_pnl_usdc: string;
}

export interface Leaderboard {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  total_entries: number;
  snapshot_at: string;
  entries: LeaderboardEntry[];
}

export interface Pack {
  chain_id: ChainId;
  pack_id: string;
  pack_kind: string;
  display_name: string;
  pack_category: string | null;
  pack_series: string | null;
  series_number: number | null;
  pack_artist: string | null;
  image_url: string | null;
  enabled: boolean;
  gated: boolean;
  usdc_price: string;
  draws_per_pack: number;
  max_packs_per_user: number | null;
  total_initial_units: number;
  total_remaining_units: number;
}

/** One physical item registered on-chain against a reserve (usually a PSA-graded slab). */
export interface VaultItem {
  chain_id?: ChainId;
  nft_id?: number;
  item_id?: number;
  /** Grading certificate number, or a label such as "gauthentication" for non-PSA items. */
  reference_id: string;
  image_url: string | null;
  status: string;
  register_tx_hash?: string | null;
  registered_at?: string | null;
}

export interface ProfileOverview {
  user_id: number | null;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  twitter_username: string | null;
  wallet_address: string;
  joined_at: string | null;
  follower_count: number;
  following_count: number;
}

export interface ProfileHolding {
  token_id: number;
  chain_id: ChainId;
  symbol: string;
  name: string;
  image_url: string | null;
  balance_human: string;
  usd_value: string;
  market_price: string;
  pnl_percent: string | null;
  unpriced: boolean;
}

export interface ProfileHoldings {
  tokens: ProfileHolding[];
  totals: {
    tokens_usd: string;
    reserve_nfts_usd: string;
    pack_nfts_usd: string;
    lp_usd: string;
    grail_assets_usd: string;
  };
}

export interface ProfileActivity {
  chain_id: ChainId;
  kind: string;
  timestamp: string;
  token_symbol: string | null;
  token_name: string | null;
  amount_usdc: string | null;
  side: string | null;
  price: number | null;
  token_amount: number | null;
  tx_hash: string | null;
  image_url: string | null;
}

export interface MarketStatistics {
  total_tokens: number;
  volume_24h_usd: number;
  distinct_holders: number;
  market_change_24h_percent: number;
}
