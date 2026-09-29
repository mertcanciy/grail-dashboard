import { notFound } from "next/navigation";
import { isAddress } from "viem";

/** Malformed addresses must 404 before loading.tsx starts streaming, since the status can't change afterwards. */
export default async function AddressLayout(props: LayoutProps<"/address/[address]">) {
  const { address } = await props.params;
  if (!isAddress(address.toLowerCase())) notFound();
  return props.children;
}
