export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-sm text-slate sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <p className="max-w-xl leading-relaxed">
          Grail Pulse is an independent dashboard and is not affiliated with Grail. Market data comes from Grail&apos;s
          public API, and pool state is read directly from Base and Robinhood Chain. Nothing here is financial advice.
        </p>
        <div className="flex gap-5">
          <a className="hover:text-graphite" href="https://grail.xyz" target="_blank" rel="noreferrer">
            grail.xyz
          </a>
          <a className="hover:text-graphite" href="https://x.com/GrailCo" target="_blank" rel="noreferrer">
            @GrailCo
          </a>
          <a className="hover:text-graphite" href="https://github.com/mertcanciy/grail-dashboard" target="_blank" rel="noreferrer">
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
