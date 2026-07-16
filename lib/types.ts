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
  ownership?: "Sole" | "Joint" | "Junior"; // account holding type (optional)
  linkedTo?: string[];                       // linked accounts / products (optional)
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
  startDate: string;
  termMonths: number;
  installment: number;
  monthsRemaining: number;
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

export interface GiftTransaction {
  id: string;
  referenceId: string;
  recipientName: string;
  recipientPhone: string;
  amount: number;
  ccy: "USD" | "KHR";
  fee: number;           // 0 = Free
  method: string;
  occasion: string;
  message?: string;      // omitted when the gift was sent without a note
  date: string;
  status: "Sent" | "Pending" | "Failed";
}

// --- Cash ATM activity ---
export type AtmResult = "Completed" | "Failed" | "Reversed" | "Pending" | "Disputed";
export interface AtmTimelineEvent { ts: string; event: string }
export interface AtmActivity {
  id: string;              // e.g. "ATM-TXN-792817"
  customerId: string;
  dateISO: string;         // sortable ISO datetime
  date: string;            // display, e.g. "Jul 14, 2026 - 9:41 AM"
  record: string;          // activity, e.g. "Cash withdrawal"
  location: string;        // ATM / terminal location
  account: string;
  card: string;
  value: number;           // transaction amount (USD)
  fee: number;
  balanceAfter: number;
  stage: AtmResult;        // result
  description: string;
  timeline: AtmTimelineEvent[];
  sourceSystem?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// --- Call Center activity ---
export type CallStatus = "Resolved" | "Follow-up" | "Escalated" | "Missed" | "No Answer";
export interface CallActivity {
  id: string;              // e.g. "CALL-2026-00782"
  customerId: string;
  dateISO: string;         // sortable ISO datetime
  date: string;            // display
  record: string;          // call reason
  duration: string;        // e.g. "4m 12s"
  agent: string;
  phone: string;
  stage: CallStatus;
  direction: "Inbound" | "Outbound";
  recording: string;       // "Recording available" | "No recording"
  voiceRecordFile: string; // filename, or "" when none
  summary: string;
  next: string;            // next action
  timeline: AtmTimelineEvent[];
  sourceSystem?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// --- Customer complaints (Compliance tab) ---
export type ComplaintStatus = "New" | "Investigating" | "Waiting" | "Resolved" | "Closed" | "Overdue";
export type ComplaintPriority = "High" | "Medium" | "Low";
export interface Complaint {
  id: string;              // e.g. "CMP-2026-00182"
  customerId: string;
  dateISO: string;         // "YYYY-MM-DD" (date only)
  date: string;            // display
  record: string;          // complaint title
  category: string;
  priority: ComplaintPriority;
  owner: string;           // assigned team
  stage: ComplaintStatus;
  channel: "Call Center" | "Branch" | "Email" | "Mobile App";
  impact: string;
  related: string;
  description: string;
  timeline: AtmTimelineEvent[];
  sourceSystem?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// --- Internet Banking web activity ---
export type IbEventType =
  | "Login" | "Failed login" | "Logout"
  | "Account view" | "Statement download"
  | "Transfer" | "Bill payment" | "Beneficiary added"
  | "Password change" | "Profile update";
export type IbCategory = "Authentication" | "Account access" | "Transfer" | "Payment" | "Management";
export type IbOutcome = "Success" | "Failed" | "Blocked" | "Pending";
export interface IbActivity {
  id: string;                 // e.g. "IBW-2026-000841"
  customerId: string;
  dateISO: string;            // datetime
  date: string;               // display
  type: IbEventType;
  category: IbCategory;
  description: string;
  account?: string;           // account involved (if any)
  amount?: number;            // for transfers / payments
  ccy?: "USD" | "KHR";
  outcome: IbOutcome;
  sessionId: string;
  browser: string;            // "Chrome 126 · Windows 11"
  ip: string;
  location: string;
  reference?: string;         // transaction reference
  failureReason?: string;
}

// --- Mobile Banking app activity ---
export type MbEventType =
  | "Login" | "Failed login" | "Logout"
  | "Account view" | "KHQR payment" | "Transfer" | "Bill payment" | "Top-up"
  | "Card control" | "Biometric update" | "Push notification";
export type MbCategory = "Authentication" | "Account access" | "Payment" | "Transfer" | "Management";
export type MbAuthMethod = "Biometric" | "PIN" | "OTP";
export interface MbActivity {
  id: string;                 // e.g. "MBA-2026-000512"
  customerId: string;
  dateISO: string;
  date: string;
  type: MbEventType;
  category: MbCategory;
  description: string;
  account?: string;
  amount?: number;
  ccy?: "USD" | "KHR";
  outcome: IbOutcome;
  sessionId: string;
  device: string;             // "iPhone 15 Pro"
  os: string;                 // "iOS 18.5"
  appVersion: string;         // "KB PRASAC Mobile 5.8.2"
  authMethod?: MbAuthMethod;
  ip: string;
  location: string;
  foreign?: boolean;
  reference?: string;
  failureReason?: string;
}

// --- Sales Activities ---
export type SalesStage = "Interested" | "Follow-up" | "Applied" | "Approved" | "Completed" | "Rejected";
export interface SalesActivity {
  id: string;              // e.g. "SAL-2026-00128"
  customerId: string;
  dateISO: string;         // "YYYY-MM-DD" (date only)
  date: string;            // display
  record: string;          // product / activity
  subtitle: string;        // short description
  stage: SalesStage;
  value: string;           // potential value (stored as text)
  owner: string;           // sales owner
  next: string;            // next action
  channel: "Phone" | "Branch" | "Meeting" | "Email";
  probability: string;
  purpose: string;
  notes: string;
  timeline: AtmTimelineEvent[];
  sourceSystem?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// --- Mini App Activity (mobile-banking mini app sessions) ---
export type MiniAppStatus = "Started" | "In Progress" | "Completed" | "Abandoned" | "Cancelled" | "Expired" | "Failed" | "Error";
export type MiniAppInvestigationFlag = "None" | "Marked for investigation" | "Under investigation" | "Escalated";
export interface MiniAppSession {
  id: string;                 // e.g. "SESS-88A2F9"
  sessionId: string;
  customerId: string;
  dateISO: string;            // datetime
  date: string;               // display session start
  sessionEnd: string;
  record: string;             // mini app name
  miniAppId: string;
  category: string;
  provider: string;
  providerType: string;
  entrySource: string;
  entryScreen: string;
  exitScreen: string;
  duration: string;
  stage: MiniAppStatus;
  finalOutcome: string;
  screenViews: number;
  clickEvents: number;
  abandonmentStep: string;
  device: string;
  deviceType: string;
  mobileAppVersion: string;
  miniAppVersion: string;
  navigationPath: string[];
  // Related financial transaction (present only when the session transacted)
  transactionReference?: string;
  partnerTransactionReference?: string;
  transactionType?: string;
  value?: number;
  currency?: "USD" | "KHR";
  fee?: number;
  discount?: number;
  netAmount?: number;
  paymentMethod?: string;
  paymentAccount?: string;
  merchant?: string;
  transactionStatus?: string;
  settlementStatus?: string;
  refundStatus?: string;
  transactionDate?: string;
  // Investigation / linked records (set via the investigation form)
  internalNote?: string;
  supportCase?: string;
  complaintLink?: string;
  linkedTransaction?: string;
  linkedBusinessReference?: string;
  investigationFlag?: MiniAppInvestigationFlag;
  refreshRequested?: "No" | "Requested";
  investigationResult?: string;
}

// --- CBC (Credit Bureau Cambodia) credit report ---
export type CycleStatus = "0" | "30" | "60" | "90+";

export interface CreditAccount {
  id: string;
  institution: string;
  productType: string;
  applicantStatus: string;   // Borrower / Co-Borrower / Guarantor
  creditLimit: number;
  loanDuration: string;
  currentBalance: number;
  accountStatus: "Normal" | "Delinquent" | "Closed" | "Write-off";
  last24Cycles: CycleStatus[];
}

export interface CreditInquiry {
  id: string;
  date: string;
  institution: string;
  productCategory: string;
  amount: number;
  applicantClassification: string;
}

export interface DishonoredCheck {
  id: string;
  checkNumber: string;
  bank: string;
  amount: number;
  date: string;
  reason: string;
}

export interface CreditReport {
  kScore: number;
  reportDate: string;
  placeOfBirth: string;
  accountSummary: { normal: number; delinquent: number; closed: number; writeOff: number };
  totalCreditLimit: number;
  totalOutstandingLiabilities: number;
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  dishonoredChecks: DishonoredCheck[];
}

export interface LocationEvent {
  id: string;
  time: string;        // e.g. "Sep 2, 2025 - 7:15 AM"
  location: string;
  lat: number;
  lng: number;
  device: string;
  purpose: string;
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
  gifts?: GiftTransaction[];   // money gifts sent to others via mobile banking
  locations?: LocationEvent[]; // where/when the customer opened the app
  creditReport?: CreditReport; // CBC (Credit Bureau Cambodia) credit standing
  atm?: AtmActivity[];         // Cash ATM / CDM terminal activity
  calls?: CallActivity[];      // Call center interactions
  complaints?: Complaint[];    // Customer complaints (Compliance tab)
  miniApps?: MiniAppSession[]; // Mini App Activity sessions
  sales?: SalesActivity[];     // Sales Activities pipeline
  ibActivity?: IbActivity[];   // Internet Banking (web) activity log
  mbActivity?: MbActivity[];   // Mobile Banking (app) activity log
  reports?: GeneratedReport[]; // Customer report packs generated for this CIF
}

// --- Customer Reports (relationship packs) ---
export type ReportFormat = "PDF" | "CSV";
export type ReportStatus = "Ready" | "Generating" | "Failed";
export type ReportPackKey =
  | "customer-summary"
  | "account-statement"
  | "loan-summary"
  | "channel-activity"
  | "complaints-sales"
  | "relationship-briefing";
export interface GeneratedReport {
  id: string;                 // e.g. "RPT-2026-00041"
  customerId: string;
  packKey: ReportPackKey;
  title: string;
  format: ReportFormat;
  dateFrom: string;           // YYYY-MM-DD
  dateTo: string;             // YYYY-MM-DD
  generatedAt: string;        // display datetime
  generatedBy: string;
  status: ReportStatus;
  size: string;               // e.g. "248 KB"
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
