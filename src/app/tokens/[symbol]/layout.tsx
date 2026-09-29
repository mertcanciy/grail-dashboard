import { notFound } from "next/navigation";
import { findToken } from "@/lib/token-view";

/** Unknown symbols must 404 before loading.tsx starts streaming, since the status can't change afterwards. */
export default async function TokenLayout(props: LayoutProps<"/tokens/[symbol]">) {
  const { symbol } = await props.params;
  if (!(await findToken(symbol))) notFound();
  return props.children;
}
