"use client";

import { useRef, type ReactNode } from "react";
import { DraggableMarquee } from "./block/draggable-marquee";

/** Wraps ObsidianUI's DraggableMarquee so server-rendered slabs can be passed in, and swallows clicks that end a drag. */
export function SlabMarquee({ slabs, label }: { slabs: { id: string; node: ReactNode }[]; label: string }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  return (
    <div
      onPointerDownCapture={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        dragged.current = false;
      }}
      onPointerMoveCapture={(e) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 6) dragged.current = true;
      }}
      onClickCapture={(e) => {
        if (dragged.current) {
          e.preventDefault();
          e.stopPropagation();
        }
        start.current = null;
      }}
    >
      <DraggableMarquee
        items={slabs.map((s) => ({ id: s.id, src: s.id }))}
        renderItem={(_item: unknown, index: number) => slabs[index].node}
        speed={0.45}
        repeatCount={3}
        gapClassName="gap-5"
        itemClassName="py-6"
        pauseOnHover
        label={label}
        className="[mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]"
      />
    </div>
  );
}
