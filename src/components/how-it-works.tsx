const STEPS = [
  {
    title: "Vaulted",
    body: "A graded card or authenticated item goes into an insured vault with Alt.xyz and PSA.",
  },
  {
    title: "Tokenized",
    body: "Each legend gets one ERC-20. Every vaulted item mints a fixed amount, usually 10,000 gTokens.",
  },
  {
    title: "Traded",
    body: "gTokens trade 24/7 in Uniswap pools on Base and Robinhood Chain, from as little as $1.",
  },
  {
    title: "Redeemed",
    body: "Hold a full item's worth, burn it, and the physical piece ships to you.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:gap-10">
      <div>
        <h2 id="how-title" className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">
          From slab to token and back
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate">
          One token per person, however many items back it.
        </p>
      </div>
      <ol className="grid gap-px overflow-hidden rounded-[22px] border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="bg-paper p-5">
            <span className="tabular inline-flex size-7 items-center justify-center rounded-full bg-gold-wash text-sm font-semibold text-gold-ink">
              {i + 1}
            </span>
            <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
