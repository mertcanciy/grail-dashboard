import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <h1 className="font-display text-4xl font-semibold tracking-tight">That gToken isn&apos;t listed</h1>
      <p className="mt-3 text-slate">Grail may not have launched it yet, or the link has a typo.</p>
      <Link
        href="/tokens"
        className="mt-8 inline-flex rounded-full bg-graphite px-5 py-2.5 text-sm font-medium text-paper hover:bg-black"
      >
        Browse all gTokens
      </Link>
    </div>
  );
}
