import type { GrailToken } from "@/lib/grail/types";
import { chainOf, explorerAddress, explorerTx, quoteAssetOf, ticker } from "@/lib/grail/meta";
import { formatDate, formatNumber } from "@/lib/format";
import { AddressRow } from "../address-row";

export function ContractsPanel({ token }: { token: GrailToken }) {
  const chain = chainOf(token.chain_id);
  const quote = quoteAssetOf(token);
  const quoteAddress =
    token.peg_asset_address ??
    (token.v4_pool
      ? [token.v4_pool.pool_key.currency0, token.v4_pool.pool_key.currency1].find(
          (a) => a.toLowerCase() !== token.token_address.toLowerCase(),
        )
      : undefined);

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="contracts-title">
      <h2 id="contracts-title" className="font-display text-xl font-semibold tracking-tight">
        Contracts
      </h2>
      <p className="mt-1 text-sm text-slate">
        Everything {ticker(token)} touches on {chain.name}. Copy an address or open it in the explorer.
      </p>

      <div className="mt-3 divide-y divide-hairline">
        <AddressRow label={`${ticker(token)} token`} hint="ERC-20, 18 decimals" value={token.token_address} href={explorerAddress(token.chain_id, token.token_address)} />
        {token.v4_pool ? (
          <>
            <AddressRow
              label="Uniswap v4 pool"
              hint={`Pool ID, ${token.v4_pool.pool_key.fee / 10_000}% fee, tick spacing ${token.v4_pool.pool_key.tick_spacing}`}
              value={token.v4_pool.pool_id}
            />
            <AddressRow
              label="Pool manager"
              hint="Uniswap v4 singleton holding the liquidity"
              value={token.v4_pool.pool_manager_address}
              href={explorerAddress(token.chain_id, token.v4_pool.pool_manager_address)}
            />
          </>
        ) : (
          <AddressRow label="Uniswap v3 pool" hint={`${quote} pair`} value={token.pool_address} href={explorerAddress(token.chain_id, token.pool_address)} />
        )}
        {quoteAddress && (
          <AddressRow
            label={`${quote} (quote asset)`}
            hint={token.peg_ticker ? "Tokenized equity the pool trades against" : undefined}
            value={quoteAddress}
            href={explorerAddress(token.chain_id, quoteAddress)}
          />
        )}
        {token.reserves.map((r) => (
          <AddressRow
            key={r.reserve_address}
            label="Vault reserve"
            hint={r.symbol}
            value={r.reserve_address}
            href={explorerAddress(token.chain_id, r.reserve_address)}
          />
        ))}
        <AddressRow
          label="Deployment"
          hint={`Block ${formatNumber(token.block_number)}, ${formatDate(token.created_at)}`}
          value={token.tx_hash}
          href={explorerTx(token.chain_id, token.tx_hash)}
        />
      </div>
    </section>
  );
}
