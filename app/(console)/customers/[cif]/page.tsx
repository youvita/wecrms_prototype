import { CUSTOMERS } from "@/lib/data";
import CustomerDetail from "./CustomerDetail";

// Prerender one static page per customer CIF for `output: export`.
export function generateStaticParams() {
  return CUSTOMERS.map((c) => ({ cif: c.id }));
}

export default function Page() {
  return <CustomerDetail />;
}
