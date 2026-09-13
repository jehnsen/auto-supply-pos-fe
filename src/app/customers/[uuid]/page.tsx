import CustomerDetailView from "./CustomerDetailView";

export function generateStaticParams() {
  return [{ uuid: "placeholder" }];
}

export default function Page() {
  return <CustomerDetailView />;
}
