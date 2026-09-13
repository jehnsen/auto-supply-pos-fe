"use client";

import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import TicketDetailView from "./TicketDetailView";

/**
 * A single static page serving every job order, addressed as `?id=<uuid>`.
 *
 * `useSearchParams()` suspends during prerender, so the boundary is required — without it
 * the static export fails to build.
 */
export default function ServiceTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-14">
          <Spinner size="md" />
        </div>
      }
    >
      <TicketDetailView />
    </Suspense>
  );
}
