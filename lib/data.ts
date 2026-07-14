import type { Customer, LoanApp, Txn, SupportCase, Merchant, CorpBatch, InsurancePolicy } from "./types";

export const CURRENT_USER = {
  name: "Lay Bunnavitou",
  role: "Relationship Officer",
  branch: "Phnom Penh HQ",
};

export const KPIS = {
  customers: 12847, customersDelta: "+3.2%",
  activeLoans: 1436, loansDelta: "+58 this month",
  todayTxns: 8921, txnsDelta: "+12.4% vs yesterday",
  openCases: 37, casesDelta: "5 breaching SLA soon",
};

export const CUSTOMERS: Customer[] = [
  {
    id: "CIF-100241", name: "Sok Dara", khmerName: "សុខ ដារ៉ា", gender: "Male", marital: "Married", nationality: "Cambodia (KH)",
    phone: "+855 12 456 789", email: "sok.dara@gmail.com", dob: "1988-06-12", address: "St. 271, Toul Kork, Phnom Penh",
    idType: "National ID", idNo: "010 234 567", idExpiry: "2031-04-20",
    occupation: "Business owner", company: "Dara Trading Co.", incomeUSD: 4200,
    segment: "Affluent", kyc: "Verified", risk: "Low", ecdd: "N", branch: "Phnom Penh HQ", joined: "2022-03-14",
    ebanking: ["Mobile Banking", "SMS Alert", "Debit Card", "Credit Card"],
    accounts: [
      { no: "001-234-567", type: "Savings", ccy: "USD", balance: 18450.22, status: "Active" },
      { no: "001-234-568", type: "Current", ccy: "KHR", balance: 24500000, status: "Active" },
      { no: "001-234-569", type: "Fixed Deposit 12M · 5.25%", ccy: "USD", balance: 30000, status: "Matures 2026-11-01" },
    ],
    cards: [
      { no: "•••• 4521", type: "Visa Debit", status: "Active", limits: "$2,000/day", controls: { online: true, contactless: true, intl: false } },
      { no: "•••• 8830", type: "Mastercard Credit", status: "Active", limits: "$5,000 limit", controls: { online: true, contactless: true, intl: true } },
    ],
    loans: [{ id: "LN-2024-0871", product: "Home Loan", amount: 85000, ccy: "USD", outstanding: 61230, rate: "8.5%", nextDue: "2026-08-01", status: "Performing" }],
    investments: [
      { type: "CSX Securities", detail: "1,200 shares PPAP", value: 4980 },
      { type: "Government Bond", detail: "NBC 3Y Bond", value: 10000 },
    ],
    insurance: [{ policy: "Life Protect Plus", premium: "$42/mo", renewal: "2027-01-15", status: "Active" }],
    devices: [
      { name: "iPhone 15 Pro", lastSeen: "Today 09:41", trusted: true },
      { name: "Samsung Galaxy Tab", lastSeen: "2026-06-20", trusted: false },
    ],
    interactions: [
      { date: "2026-07-10", channel: "Branch", note: "Requested FD rate review — offered 5.4% for 24M renewal" },
      { date: "2026-07-02", channel: "Call Center", note: "Asked about home-loan early settlement penalty" },
      { date: "2026-06-18", channel: "App Chat", note: "Enabled international card usage for Bangkok trip" },
    ],
  },
  {
    id: "CIF-100562", name: "Chan Sreymom", khmerName: "ចាន់ ស្រីមុំ", gender: "Female", marital: "Single", nationality: "Cambodia (KH)",
    phone: "+855 96 234 118", email: "sreymom.chan@yahoo.com", dob: "1995-11-30", address: "St. 315, Boeung Kak, Phnom Penh",
    idType: "National ID", idNo: "021 887 340", idExpiry: "2029-09-02",
    occupation: "Accountant", company: "Ang & Partners", incomeUSD: 850,
    segment: "Mass", kyc: "Verified", risk: "Low", ecdd: "N", branch: "Toul Kork", joined: "2023-08-02",
    ebanking: ["Mobile Banking", "SMS Alert"],
    accounts: [{ no: "002-118-334", type: "Savings", ccy: "KHR", balance: 8200000, status: "Active" }],
    cards: [{ no: "•••• 1207", type: "Visa Debit", status: "Active", limits: "$500/day", controls: { online: true, contactless: false, intl: false } }],
    loans: [], investments: [],
    insurance: [{ policy: "Micro Health", premium: "$4/mo", renewal: "2026-12-01", status: "Active" }],
    devices: [{ name: "Oppo A98", lastSeen: "Today 08:12", trusted: true }],
    interactions: [{ date: "2026-07-08", channel: "App Chat", note: "Set up goal saving: wedding fund ៛12M target" }],
  },
  {
    id: "CIF-099873", name: "Kim Vireak", khmerName: "គឹម វីរៈ", gender: "Male", marital: "Married", nationality: "Cambodia (KH)",
    phone: "+855 78 990 456", email: "vireak@vkcoffee.com.kh", dob: "1983-02-08", address: "NR1, Chbar Ampov, Phnom Penh",
    idType: "National ID", idNo: "008 456 112", idExpiry: "2026-08-15",
    occupation: "CEO", company: "VK Coffee Co., Ltd.", incomeUSD: 6800,
    segment: "SME", kyc: "Review due", risk: "Medium", ecdd: "Y", branch: "Chbar Ampov", joined: "2021-01-19",
    ebanking: ["Mobile Banking", "smartBiz", "Debit Card"],
    accounts: [
      { no: "003-556-902", type: "Current (Business)", ccy: "USD", balance: 42780.5, status: "Active" },
      { no: "003-556-903", type: "Savings", ccy: "KHR", balance: 15600000, status: "Active" },
    ],
    cards: [{ no: "•••• 3345", type: "Visa Business Debit", status: "Active", limits: "$5,000/day", controls: { online: true, contactless: true, intl: true } }],
    loans: [{ id: "LN-2025-1120", product: "SME Working Capital", amount: 60000, ccy: "USD", outstanding: 48900, rate: "10.2%", nextDue: "2026-07-25", status: "Performing" }],
    investments: [], insurance: [],
    devices: [{ name: "iPhone 13", lastSeen: "Yesterday 17:03", trusted: true }],
    interactions: [
      { date: "2026-07-11", channel: "RM Visit", note: "Discussed merchant QR for 2nd coffee outlet — send proposal" },
      { date: "2026-06-30", channel: "Email", note: "KYC refresh reminder sent (docs expire Aug)" },
    ],
  },
  {
    id: "CIF-101204", name: "Ly Sopheap", khmerName: "លី សុភាព", gender: "Female", marital: "Single", nationality: "Cambodia (KH)",
    phone: "+855 11 782 340", email: "ly.sopheap88@gmail.com", dob: "1999-04-22", address: "Wat Bo Village, Siem Reap",
    idType: "National ID", idNo: "034 220 990", idExpiry: "2033-01-11",
    occupation: "Tour guide", company: "Freelance", incomeUSD: 420,
    segment: "Mass", kyc: "Pending", risk: "Low", ecdd: "N", branch: "Siem Reap", joined: "2026-07-09",
    ebanking: ["Mobile Banking"],
    accounts: [{ no: "004-220-118", type: "Savings", ccy: "KHR", balance: 500000, status: "Active" }],
    cards: [], loans: [], investments: [], insurance: [],
    devices: [{ name: "Vivo Y36", lastSeen: "Today 10:02", trusted: true }],
    interactions: [{ date: "2026-07-09", channel: "App", note: "Self-onboarded via eKYC — liveness passed, NID verified" }],
  },
  {
    id: "CIF-098455", name: "Heng Bunthoeun", khmerName: "ហេង ប៊ុនធឿន", gender: "Male", marital: "Married", nationality: "Cambodia (KH)",
    phone: "+855 92 118 675", email: "bunthoeun.h@outlook.com", dob: "1979-09-14", address: "BKK1, Chamkarmon, Phnom Penh",
    idType: "Passport", idNo: "N0882134", idExpiry: "2030-06-30",
    occupation: "Director", company: "Mekong Holdings", incomeUSD: 12500,
    segment: "Affluent", kyc: "Verified", risk: "Low", ecdd: "N", branch: "Phnom Penh HQ", joined: "2020-05-27",
    ebanking: ["Mobile Banking", "SMS Alert", "Platinum Credit", "Virtual Acc."],
    accounts: [
      { no: "005-871-441", type: "Savings", ccy: "USD", balance: 96210.77, status: "Active" },
      { no: "005-871-442", type: "Fixed Deposit 24M · 5.6%", ccy: "USD", balance: 120000, status: "Matures 2027-02-10" },
    ],
    cards: [{ no: "•••• 9902", type: "Mastercard World", status: "Active", limits: "$10,000 limit", controls: { online: true, contactless: true, intl: true } }],
    loans: [],
    investments: [{ type: "CSX Securities", detail: "5,000 shares ABC", value: 38500 }],
    insurance: [{ policy: "Family Health Gold", premium: "$120/mo", renewal: "2026-09-30", status: "Active" }],
    devices: [{ name: "iPhone 15 Pro Max", lastSeen: "Today 07:55", trusted: true }],
    interactions: [{ date: "2026-07-05", channel: "RM Call", note: "Interested in NBC bond allocation next tranche" }],
  },
  {
    id: "CIF-100998", name: "Nov Chanthy", khmerName: "នៅ ចាន់ធី", gender: "Male", marital: "Married", nationality: "Cambodia (KH)",
    phone: "+855 69 445 210", email: "chanthy.nov@gmail.com", dob: "1992-12-03", address: "Svay Por, Battambang",
    idType: "National ID", idNo: "017 665 401", idExpiry: "2028-11-19",
    occupation: "Farmer", company: "—", incomeUSD: null,
    segment: "Mass", kyc: "Verified", risk: "High", ecdd: "Y", branch: "Battambang", joined: "2024-11-11",
    ebanking: ["Mobile Banking", "SMS Alert"],
    accounts: [{ no: "006-004-777", type: "Savings", ccy: "KHR", balance: 1200000, status: "Watch" }],
    cards: [{ no: "•••• 5518", type: "Visa Debit", status: "Blocked", limits: "$500/day", controls: { online: false, contactless: false, intl: false } }],
    loans: [{ id: "LN-2025-0644", product: "Personal Loan", amount: 3000, ccy: "USD", outstanding: 2140, rate: "14%", nextDue: "2026-07-15", status: "30+ DPD" }],
    investments: [], insurance: [],
    devices: [{ name: "Xiaomi Redmi 12", lastSeen: "2026-07-01", trusted: true }],
    interactions: [{ date: "2026-07-06", channel: "Collections Call", note: "Promised payment by Jul 15 — hardship: seasonal income" }],
  },
];

export const LOAN_PIPELINE: LoanApp[] = [
  { id: "APP-3391", name: "Pich Ratana", product: "Digital Loan", amount: 2500, ccy: "USD", stage: "Credit Check", score: 712, cbc: "Clean — 1 active loan", dti: "31%", submitted: "2026-07-12 09:14", sla: "4h left" },
  { id: "APP-3390", name: "Meas Sokha", product: "Personal Loan", amount: 8000, ccy: "USD", stage: "Approval", score: 748, cbc: "Clean — no active loans", dti: "24%", submitted: "2026-07-11 16:40", sla: "On track" },
  { id: "APP-3387", name: "Kim Vireak", product: "SME Top-up", amount: 20000, ccy: "USD", stage: "CBC Pull", score: null, cbc: "Requesting…", dti: "—", submitted: "2026-07-12 10:05", sla: "6h left" },
  { id: "APP-3385", name: "Sao Kunthea", product: "Digital Loan", amount: 1200, ccy: "USD", stage: "Application", score: null, cbc: "Not yet pulled", dti: "—", submitted: "2026-07-12 11:22", sla: "New" },
  { id: "APP-3379", name: "Chea Lyhour", product: "Auto Loan", amount: 15500, ccy: "USD", stage: "Disbursement", score: 726, cbc: "Clean — 2 closed loans", dti: "28%", submitted: "2026-07-10 14:02", sla: "Ready" },
  { id: "APP-3372", name: "Nhem Sovann", product: "Personal Loan", amount: 5000, ccy: "USD", stage: "Approval", score: 655, cbc: "1 late payment (2024)", dti: "39%", submitted: "2026-07-11 09:48", sla: "2h left" },
];

export const TRANSACTIONS: Txn[] = [
  { id: "TXN-88213", time: "11:42", customer: "Sok Dara", type: "KHQR Payment", channel: "KHQR", amount: -12.5, ccy: "USD", counterparty: "Brown Coffee BKK1", status: "Success" },
  { id: "TXN-88209", time: "11:38", customer: "Chan Sreymom", type: "Bakong Transfer", channel: "Bakong", amount: -150000, ccy: "KHR", counterparty: "→ Wing Account", status: "Success" },
  { id: "TXN-88201", time: "11:29", customer: "Heng Bunthoeun", type: "Interbank Transfer", channel: "Transfer", amount: -2500, ccy: "USD", counterparty: "→ ACLEDA ••3391", status: "Success" },
  { id: "TXN-88197", time: "11:21", customer: "Kim Vireak", type: "Merchant Settlement", channel: "KHQR", amount: 842.3, ccy: "USD", counterparty: "VK Coffee — daily QR", status: "Success" },
  { id: "TXN-88190", time: "11:12", customer: "Nov Chanthy", type: "Bill Payment", channel: "Bill", amount: -85000, ccy: "KHR", counterparty: "EDC Electricity", status: "Success" },
  { id: "TXN-88184", time: "10:58", customer: "Ly Sopheap", type: "Mobile Top-up", channel: "Bill", amount: -5.0, ccy: "USD", counterparty: "Smart 010•••340", status: "Success" },
  { id: "TXN-88171", time: "10:44", customer: "Sok Dara", type: "KHQR Payment", channel: "KHQR", amount: -38.0, ccy: "USD", counterparty: "Lucky Supermarket", status: "Reversed" },
  { id: "TXN-88168", time: "10:39", customer: "Meas Sokha", type: "Loan Repayment", channel: "Transfer", amount: -310.0, ccy: "USD", counterparty: "LN-2024-0512", status: "Success" },
];

export const CASES: SupportCase[] = [
  { id: "CS-2214", customer: "Nov Chanthy", cif: "CIF-100998", subject: "Card blocked after 3 wrong PIN — requests unblock", category: "Cards", priority: "High", sla: "1h 20m", slaState: "warning", status: "Open", assignee: "You", created: "2026-07-13 09:05",
    thread: [{ who: "Customer", when: "09:05", text: "My card is blocked, I typed the wrong PIN. I need it today for a payment." }] },
  { id: "CS-2213", customer: "Sok Dara", cif: "CIF-100241", subject: "Duplicate KHQR charge at Lucky Supermarket", category: "Payments", priority: "High", sla: "3h 05m", slaState: "ok", status: "In Progress", assignee: "You", created: "2026-07-13 08:22",
    thread: [
      { who: "Customer", when: "08:22", text: "I was charged twice $38 at Lucky. One should be refunded." },
      { who: "Agent", when: "08:40", text: "Confirmed duplicate TXN-88171 — reversal initiated, 1-2 business days." },
    ] },
  { id: "CS-2211", customer: "Chan Sreymom", cif: "CIF-100562", subject: "Cannot enable contactless on Visa Debit", category: "Cards", priority: "Medium", sla: "6h 40m", slaState: "ok", status: "Open", assignee: "Sokun T.", created: "2026-07-13 07:48",
    thread: [{ who: "Customer", when: "07:48", text: "The contactless toggle is greyed out in the app." }] },
  { id: "CS-2208", customer: "Kim Vireak", cif: "CIF-099873", subject: "Merchant settlement report missing for Jul 11", category: "Merchant", priority: "Medium", sla: "Breached 0h 35m", slaState: "breach", status: "Escalated", assignee: "Merchant Ops", created: "2026-07-12 15:10",
    thread: [
      { who: "Customer", when: "15:10", text: "Daily settlement report for July 11 never arrived by email." },
      { who: "Agent", when: "16:02", text: "Escalated to Merchant Ops — report generation job failed, rerunning." },
    ] },
  { id: "CS-2205", customer: "Heng Bunthoeun", cif: "CIF-098455", subject: "Request: increase daily transfer limit to $20k", category: "Accounts", priority: "Low", sla: "1d 4h", slaState: "ok", status: "Pending Approval", assignee: "You", created: "2026-07-12 11:31",
    thread: [{ who: "Customer", when: "11:31", text: "Please raise my daily limit for a property payment next week." }] },
];

export const MERCHANTS: Merchant[] = [
  { id: "MRC-0451", name: "VK Coffee (Chbar Ampov)", owner: "Kim Vireak", qr: "Static + Dynamic", todayVolume: 842.3, settlement: "T+1 · Auto", status: "Active", kyb: "Complete" },
  { id: "MRC-0448", name: "Sreyneang Boutique", owner: "Pen Sreyneang", qr: "Static", todayVolume: 156.0, settlement: "T+1 · Auto", status: "Active", kyb: "Complete" },
  { id: "MRC-0455", name: "Angkor Mart 271", owner: "Chhem Dara", qr: "Dynamic + POS", todayVolume: 2310.75, settlement: "Same-day", status: "Active", kyb: "Complete" },
  { id: "MRC-0459", name: "Noodle King Toul Kork", owner: "Lim Hout", qr: "—", todayVolume: 0, settlement: "—", status: "Onboarding", kyb: "Docs pending" },
];

export const CORP_BATCHES: CorpBatch[] = [
  { id: "BATCH-1120", client: "Mekong Garment Co.", type: "Payroll", items: 412, total: 128540, ccy: "USD", maker: "Sopheak L.", checker: "—", status: "Awaiting Approval" },
  { id: "BATCH-1119", client: "Angkor Logistics", type: "Supplier Payment", items: 36, total: 45200, ccy: "USD", maker: "Dara K.", checker: "Vitou L.", status: "Approved" },
  { id: "BATCH-1118", client: "Mekong Garment Co.", type: "Payroll", items: 408, total: 127130, ccy: "USD", maker: "Sopheak L.", checker: "Vitou L.", status: "Executed" },
];

export const ONBOARDING_QUEUE = [
  { name: "Ly Sopheap", when: "Today 10:02", stage: "Screening", result: "Sanctions clear · PEP clear" },
  { name: "Ratha Sim", when: "Today 09:31", stage: "Manual Review", result: "NID photo glare — re-capture requested" },
  { name: "Kanha Prum", when: "Yesterday", stage: "Activated", result: "STP — 4 min end-to-end" },
];

export const INSURANCE_POLICIES: InsurancePolicy[] = [
  { id: "POL-24011", customer: "Sok Dara", cif: "CIF-100241", plan: "Life Protect Plus", tier: "Gold Plan", product: "Life", premium: 42, ccy: "USD", termMonths: 36, issueDate: "2024-01-15", renewalDate: "2027-01-15", status: "Active", beneficiary: "Sok Marina (spouse)", officer: "Lay Bunnavitou", branch: "Phnom Penh HQ", renewingSoon: false },
  { id: "POL-23120", customer: "Chan Sreymom", cif: "CIF-100562", plan: "Micro Health", tier: "Basic Plan", product: "Micro-insurance", premium: 16000, ccy: "KHR", termMonths: 36, issueDate: "2023-12-01", renewalDate: "2026-12-01", status: "Active", beneficiary: "Chan Dara (child)", officer: "Sok Chanthy", branch: "Siem Reap", renewingSoon: true },
  { id: "POL-22093", customer: "Heng Bunthoeun", cif: "CIF-098455", plan: "Family Health Gold", tier: "Platinum Plan", product: "Health", premium: 120, ccy: "USD", termMonths: 48, issueDate: "2022-09-30", renewalDate: "2026-09-30", status: "Active", beneficiary: "Heng Family Trust", officer: "Lay Bunnavitou", branch: "Phnom Penh HQ", renewingSoon: true },
  { id: "POL-24055", customer: "Pich Ratana", cif: "CIF-101002", plan: "Motor Shield", tier: "Comprehensive", product: "Motor", premium: 65, ccy: "USD", termMonths: 12, issueDate: "2024-05-10", renewalDate: "2025-05-10", status: "Lapsed", beneficiary: "—", officer: "Meas Sophea", branch: "Battambang", renewingSoon: false },
  { id: "POL-25007", customer: "Meas Sokha", cif: "CIF-100781", plan: "Travel Secure", tier: "Basic Plan", product: "Travel", premium: 28, ccy: "USD", termMonths: 6, issueDate: "2026-06-20", renewalDate: "2026-12-20", status: "Pending", beneficiary: "Meas Sokha", officer: "Lay Bunnavitou", branch: "Phnom Penh HQ", renewingSoon: false },
  { id: "POL-25012", customer: "Kim Vireak", cif: "CIF-097330", plan: "Credit Life Cover", tier: "Loan-linked", product: "Credit life", premium: 18, ccy: "USD", termMonths: 24, issueDate: "2026-02-01", renewalDate: "2028-02-01", status: "Suspended", beneficiary: "KB PRASAC Bank", officer: "Lay Bunnavitou", branch: "Phnom Penh HQ", renewingSoon: false },
];
