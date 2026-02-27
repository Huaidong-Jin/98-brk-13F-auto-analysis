import { QuarterDetailClient } from "./QuarterDetailClient";

export const dynamicParams = false;

// Static export requires at least one param; placeholder so build succeeds.
// Real quarter pages are loaded client-side from in-app links.
export async function generateStaticParams() {
  return [{ quarter: "2024Q4" }];
}

export default async function QuarterDetailPage({
  params,
}: {
  params: Promise<{ quarter: string }>;
}) {
  const { quarter } = await params;
  return <QuarterDetailClient quarter={quarter} />;
}


