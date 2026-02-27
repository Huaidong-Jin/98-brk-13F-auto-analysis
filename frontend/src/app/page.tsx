import { Suspense } from "react";
import { HomePageClient } from "./HomePageClient";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <p className="text-body text-ink-secondary">Loading homepage…</p>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}
