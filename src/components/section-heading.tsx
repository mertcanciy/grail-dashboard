import type { ReactNode } from "react";

export function SectionHeading({ title, children, id }: { title: string; children?: ReactNode; id?: string }) {
  return (
    <div className="max-w-xl">
      <h2 id={id} className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">
        {title}
      </h2>
      {children && <p className="mt-1.5 text-[15px] leading-relaxed text-slate">{children}</p>}
    </div>
  );
}
