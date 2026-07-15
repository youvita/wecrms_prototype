// Domain types for WeCRM365

export type Segment = "Mass" | "Affluent" | "SME";
export type CustomerType = "Individual" | "Corporate";
export type KycStatus = "Verified" | "Pending" | "Review due";
export type Risk = "Low" | "Medium" | "High";

export interface Account {
  no: string;
  type: string;
  ccy: "USD" | "KHR";
  balance: number;
  status: string;
}

export interface Card {
  no: string;
  type: string;
  status: "Active" | "Blocked";
  limits: string;
  controls: { online: boolean; contactless: boolean; intl: boolean };
}

export interface Loan {
  id: string;
  product: string;
  amount: number;
  ccy: "USD" | "KHR";
  outstanding: number;
  rate: string;
  nextDue: string;
  status: string;
}

// Links a CIF to a *different* related CIF (e.g. a company and its distinct subsidiary).
export interface RelatedParty { cif: string; role: string }

// A single CIF can carry BOTH an individual and a corporate facet (e.g. a sole
// proprietor who banks personally and as their business under one relationship).
// The individual facet lives in the flat Customer fields; this is the corporate one.
export interface CorporateFacet {
  name: string;
  khmerName: string;
  businessNature: string;
  nationality: string;       // country of incorporation
  incorporationDate: string;
  idType: string;            // registration document, e.g. "Business Registration"
  registrationNo: string;
  idExpiry: string;          // registration expiry
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  incomeUSD: number | null;  // annual revenue
}

export interface Investment { type: string; detail: string; value: number }
export interface Insurance { policy: string; premium: string; renewal: string; status: string }
export interface Device { name: string; lastSeen: string; trusted: boolean }
export interface Interaction { date: string; channel: string; note: string }

export interface Customer {
  id: string;
  customerType: CustomerType;
  name: string;
  khmerName: string;
  gender: "Male" | "Female";
  marital: string;
  nationality: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  idType: string;
  idNo: string;
  idExpiry: string;
  occupation: string;
  company: string;
  incomeUSD: number | null;
  // Corporate-only — populated when customerType === "Corporate".
  registrationNo?: string;
  incorporationDate?: string;
  businessNature?: string;
  contactPerson?: string;
  relatedParties?: RelatedParty[];
  // Which facets this CIF holds. Defaults to [customerType] when omitted.
  // When it contains both, the Customer Info tab shows Individual|Corporate sub-tabs.
  profiles?: CustomerType[];
  corporate?: CorporateFacet;   // the corporate facet on a dual (Individual+Corporate) CIF
  segment: Segment;
  kyc: KycStatus;
  risk: Risk;
  ecdd: "Y" | "N";
  branch: string;
  joined: string;
  ebanking: string[];
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  investments: Investment[];
  insurance: Insurance[];
  devices: Device[];
  interactions: Interaction[];
}

export interface LoanApp {
  id: string;
  name: string;
  product: string;
  amount: number;
  ccy: "USD" | "KHR";
  stage: "Application" | "CBC Pull" | "Credit Check" | "Approval" | "Disbursement";
  score: number | null;
  cbc: string;
  dti: string;
  submitted: string;
  sla: string;
}

export interface Txn {
  id: string;
  time: string;
  customer: string;
  type: string;
  channel: "KHQR" | "Bakong" | "Transfer" | "Bill";
  amount: number;
  ccy: "USD" | "KHR";
  counterparty: string;
  status: "Success" | "Reversed";
}

export interface CaseMsg { who: "Customer" | "Agent"; when: string; text: string }

export interface SupportCase {
  id: string;
  customer: string;
  cif: string;
  subject: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  sla: string;
  slaState: "ok" | "warning" | "breach";
  status: string;
  assignee: string;
  created: string;
  thread: CaseMsg[];
}

export interface Merchant {
  id: string;
  name: string;
  owner: string;
  qr: string;
  todayVolume: number;
  settlement: string;
  status: "Active" | "Onboarding";
  kyb: string;
}

export interface CorpBatch {
  id: string;
  client: string;
  type: string;
  items: number;
  total: number;
  ccy: "USD" | "KHR";
  maker: string;
  checker: string;
  status: "Awaiting Approval" | "Approved" | "Executed";
}

export type InsuranceProduct = "Life" | "Health" | "Motor" | "Travel" | "Micro-insurance" | "Credit life";

export interface InsurancePolicy {
  id: string;
  customer: string;
  cif: string;
  plan: string;
  tier: string;
  product: InsuranceProduct;
  premium: number;
  ccy: "USD" | "KHR";
  termMonths: number;
  issueDate: string;
  renewalDate: string;
  status: "Active" | "Pending" | "Suspended" | "Lapsed";
  beneficiary: string;
  officer: string;
  branch: string;
  renewingSoon: boolean;
}
