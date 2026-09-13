"use client";

import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import CustomerStatementView from "./CustomerStatementView";

/** Statement of account for one customer, addressed as `?id=<uuid>`. */
export default function CustomerStatementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-14">
          <Spinner size="md" />
        </div>
      }
    >
      <CustomerStatementView />
    </Suspense>
  );
}
