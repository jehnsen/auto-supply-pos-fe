import CustomerStatementView from "./CustomerStatementView";

export function generateStaticParams() {
  return [{ uuid: "placeholder" }];
}

export default function Page() {
  return <CustomerStatementView />;
}
