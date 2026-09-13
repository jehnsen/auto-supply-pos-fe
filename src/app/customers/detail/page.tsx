"use client";

import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import CustomerDetailView from "./CustomerDetailView";

/** One static page per customer record, addressed as `?id=<uuid>`. */
export default function CustomerDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-14">
          <Spinner size="md" />
        </div>
      }
    >
      <CustomerDetailView />
    </Suspense>
  );
}
