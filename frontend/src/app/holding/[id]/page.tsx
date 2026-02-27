import { HoldingDetailClient } from "./HoldingDetailClient";

export const dynamicParams = false;

// Static export requires at least one param; this placeholder allows build to succeed.
// Real holding pages are loaded client-side from in-app links.
export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default async function HoldingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HoldingDetailClient id={id} />;
}


