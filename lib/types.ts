// Domain types for WeCRM365

export type Segment = "Mass" | "Affluent" | "SME";
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

export interface Investment { type: string; detail: string; value: number }
export interface Insurance { policy: string; premium: string; renewal: string; status: string }
export interface Device { name: string; lastSeen: string; trusted: boolean }
export interface Interaction { date: string; channel: string; note: string }

export interface Customer {
  id: string;
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
