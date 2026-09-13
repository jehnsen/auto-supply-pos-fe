import TicketDetailView from "./TicketDetailView";

/**
 * `output: export` needs a concrete param list at build time. Tickets live in the browser,
 * so none exist server-side — we export a single placeholder shell and let the client
 * component read the real uuid from the URL.
 */
export function generateStaticParams() {
  return [{ uuid: "placeholder" }];
}

export default function ServiceTicketPage() {
  return <TicketDetailView />;
}
