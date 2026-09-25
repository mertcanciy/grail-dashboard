import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "../../public/grail-logo.jpg";

export function GrailMark({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt=""
      priority
      sizes="40px"
      className={cn("rounded-[9px] shadow-[0_0_0_1px_rgb(201_168_76/0.35)]", className)}
    />
  );
}
