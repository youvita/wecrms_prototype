"use client";

import React from "react";
import Link from "next/link";
import { AiPanel, Icon, PageHeader, Toast, type ToastMsg } from "@/components/ui";

// Flow: capture the ID document first, let OCR auto-fill the customer's
// personal info, then review & activate. (Liveness + screening steps retired.)
const STEPS = ["ID document", "Personal info", "Review & activate"];

const Spinner = ({ className = "h-5 w-5 text-primary-600" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

type FormState = {
  name: string; dob: string; nid: string; address: string;
  passportNo: string; nationality: string; issuingCountry: string; passportExpiry: string;
  err: Record<string, string>;
};

type DocType = "nid" | "passport";

// Defined at module scope (not inside the page) so the <input> keeps focus and
// state across re-renders — a nested component would remount on every keystroke.
function InputField({ label, value, error, onChange, type = "text", placeholder }: {
  label: string; value: string; error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={onChange}
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${error ? "border-red-300 focus:ring-red-600/20 focus:border-red-600" : "border-slate-300 focus:ring-primary-600/20 focus:border-primary-600"}`} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = React.useState(0);
  const [toast, setToast] = React.useState<ToastMsg>(null);
  const [form, setForm] = React.useState<FormState>({ name: "", dob: "", nid: "", address: "", passportNo: "", nationality: "", issuingCountry: "", passportExpiry: "", err: {} });
  const [docType, setDocType] = React.useState<DocType>("nid");
  const [docState, setDocState] = React.useState<"idle" | "scanning" | "done">("idle");
  const [autofilled, setAutofilled] = React.useState(false);
  const [activated, setActivated] = React.useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value, err: { ...f.err, [k]: "" } }));

  const validatePersonal = () => {
    const err: Record<string, string> = {};
    if (!form.name) err.name = "Full name is required";
    if (!form.dob) err.dob = "Date of birth is required";
    if (docType === "passport") {
      if (!form.passportNo) err.passportNo = "Passport number is required";
      if (!form.nationality) err.nationality = "Nationality is required";
      if (!form.issuingCountry) err.issuingCountry = "Issuing country is required";
      if (!form.passportExpiry) err.passportExpiry = "Passport expiry date is required";
    }
    setForm((f) => ({ ...f, err }));
    return Object.keys(err).length === 0;
  };

  const pickDocType = (t: DocType) => {
    setDocType(t);
    setDocState("idle");
    setAutofilled(false);
    setForm((f) => ({ ...f, err: {} }));
  };

  // Scanning the document runs OCR/MRZ and auto-fills the personal-info step.
  const scanDoc = () => {
    setDocState("scanning");
    setTimeout(() => {
      setDocState("done");
      setAutofilled(true);
      if (docType === "passport") {
        setForm((f) => ({
          ...f,
          name: f.name || "SOK DARA",
          dob: f.dob || "1988-06-12",
          address: f.address || "St. 271, Toul Kork, Phnom Penh",
          passportNo: f.passportNo || "N1234567",
          nationality: f.nationality || "Cambodian",
          issuingCountry: f.issuingCountry || "Cambodia",
          passportExpiry: f.passportExpiry || "2030-08-15",
        }));
        setToast({ message: "OCR + MRZ complete — personal info auto-filled from passport", type: "success" });
      } else {
        setForm((f) => ({
          ...f,
          name: f.name || "SOK DARA",
          dob: f.dob || "1988-06-12",
          nid: "010 234 567",
          address: f.address || "St. 271, Toul Kork, Phnom Penh",
        }));
        setToast({ message: "OCR complete — personal info auto-filled from NID", type: "success" });
      }
    }, 1600);
  };

  const canNext = step === 0 ? docState === "done" : true;

  const next = () => {
    if (step === 1 && !validatePersonal()) return;
    if (step < 2) setStep(step + 1);
    else { setActivated(true); setToast({ message: "Account activated — welcome kit sent", type: "success" }); }
  };

  return (
    <div className="page-enter max-w-3xl mx-auto">
      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <Link href="/customers" className="hover:text-primary-600 font-medium">Customers</Link>
        <Icon name="chevron_right" className="text-base text-slate-300" />
        <span className="font-semibold text-slate-800">New customer</span>
      </div>
      <PageHeader title="Customer Onboarding" subtitle="eKYC — new retail customer" />

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center flex-none">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i < step || activated ? "bg-green-500 text-white" : i === step ? "bg-gold text-navy ring-4 ring-primary-100" : "bg-slate-200 text-slate-500"}`}>
                {i < step || activated ? <Icon name="check" className="text-lg" /> : i + 1}
              </div>
              <div className={`text-[11px] mt-1.5 text-center w-20 leading-tight ${i === step ? "text-primary-700 font-semibold" : "text-slate-400"}`}>{s}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < step ? "bg-green-500" : "bg-slate-200"}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
        {step === 0 && (
          <div className="page-enter">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Identity document capture</h2>
            <p className="text-sm text-slate-500 mb-5">Choose the document type, then capture it — OCR extracts and auto-fills the customer&apos;s details on the next step.</p>

            {/* Document type selector */}
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              {([
                { k: "nid", label: "National ID (NID)", hint: "Cambodian residents", icon: "badge" },
                { k: "passport", label: "Passport", hint: "Foreign / non-resident", icon: "book_2" },
              ] as const).map((d) => (
                <button key={d.k} onClick={() => pickDocType(d.k)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${docType === d.k ? "border-primary-600 bg-primary-50 ring-1 ring-primary-600" : "border-slate-300 hover:bg-slate-50"}`}>
                  <Icon name={d.icon} className={`text-2xl ${docType === d.k ? "text-primary-700" : "text-slate-400"}`} />
                  <div>
                    <div className={`text-sm font-semibold ${docType === d.k ? "text-primary-700" : "text-slate-700"}`}>{d.label}</div>
                    <div className="text-xs text-slate-400">{d.hint}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div onClick={docState === "idle" ? scanDoc : undefined}
                className={`h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${docState === "done" ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-primary-400 cursor-pointer bg-slate-50"}`}>
                {docState === "idle" && (<><Icon name="upload_file" className="text-4xl text-slate-400" /><span className="text-sm font-semibold text-slate-600">{docType === "passport" ? "Upload passport — bio page" : "Upload NID — front"}</span><span className="text-xs text-slate-400">Click to upload or capture</span></>)}
                {docState === "scanning" && (<><Spinner className="h-8 w-8 text-primary-600" /><span className="text-sm font-semibold text-primary-600">Scanning &amp; running OCR…</span></>)}
                {docState === "done" && (<><Icon name="task_alt" className="text-4xl text-green-500" /><span className="text-sm font-semibold text-green-700">{docType === "passport" ? "Bio page captured · OCR OK" : "Front captured · OCR OK"}</span></>)}
              </div>
              <div className={`h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 ${docState === "done" ? "border-green-400 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
                {docState === "done"
                  ? (<><Icon name="task_alt" className="text-4xl text-green-500" /><span className="text-sm font-semibold text-green-700">{docType === "passport" ? "MRZ verified" : "Back captured"}</span></>)
                  : (<><Icon name="badge" className="text-4xl text-slate-300" /><span className="text-sm text-slate-400">{docType === "passport" ? "Passport — MRZ zone" : "NID — back"}</span></>)}
              </div>
            </div>

            {docState === "done" && docType === "nid" && (
              <AiPanel title="Extracted by OCR — confirm on the next step">
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  <div>NID number: <b className="text-slate-800">{form.nid}</b></div>
                  <div>Name: <b className="text-slate-800">{form.name || "SOK DARA"}</b></div>
                  <div>DOB: <b className="text-slate-800">{form.dob || "1988-06-12"}</b></div>
                  <div>Expiry: <b className="text-slate-800">2031-04-20</b></div>
                </div>
              </AiPanel>
            )}

            {docState === "done" && docType === "passport" && (
              <AiPanel title="Extracted by OCR / MRZ — confirm on the next step">
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  <div>Name: <b className="text-slate-800">{form.name || "SOK DARA"}</b></div>
                  <div>DOB: <b className="text-slate-800">{form.dob || "1988-06-12"}</b></div>
                  <div>Passport no.: <b className="text-slate-800">{form.passportNo}</b></div>
                  <div>Machine-readable zone: <b className="text-slate-800">Verified</b></div>
                </div>
              </AiPanel>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 page-enter">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Personal information</h2>
              <p className="text-sm text-slate-500 mt-0.5">Review the details extracted from the {docType === "passport" ? "passport" : "NID"} and edit anything that needs correcting.</p>
            </div>
            {autofilled && (
              <div className="flex items-start gap-2 text-xs text-primary-700 bg-primary-50 rounded-lg p-3">
                <Icon name="auto_awesome" className="text-amber-600 text-lg" />
                These fields were auto-filled from the uploaded document. Please confirm them with the customer.
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField label="Full name (as on document)" value={form.name} error={form.err.name} onChange={set("name")} placeholder="e.g. Sok Dara" />
              <InputField label="Date of birth" value={form.dob} error={form.err.dob} onChange={set("dob")} type="date" />
              <InputField label="Current address" value={form.address} error={form.err.address} onChange={set("address")} placeholder="Street, Sangkat, City" />
              {docType === "nid" && (
                <InputField label="NID number" value={form.nid} error={form.err.nid} onChange={set("nid")} placeholder="e.g. 010 234 567" />
              )}
              {docType === "passport" && (
                <>
                  <InputField label="Passport number" value={form.passportNo} error={form.err.passportNo} onChange={set("passportNo")} placeholder="e.g. N1234567" />
                  <InputField label="Nationality" value={form.nationality} error={form.err.nationality} onChange={set("nationality")} placeholder="e.g. Cambodian" />
                  <InputField label="Issuing country" value={form.issuingCountry} error={form.err.issuingCountry} onChange={set("issuingCountry")} placeholder="e.g. Cambodia" />
                  <InputField label="Passport expiry date" value={form.passportExpiry} error={form.err.passportExpiry} onChange={set("passportExpiry")} type="date" />
                </>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="page-enter">
            {!activated ? (
              <>
                <h2 className="text-lg font-bold text-slate-900 mb-4">Review &amp; activate</h2>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm mb-5">
                  {[
                    ["Full name", form.name || "Sok Dara"],
                    ["Date of birth", form.dob || "1988-06-12"],
                    ...(docType === "passport"
                      ? [["Document", "Passport"], ["Passport no.", form.passportNo], ["Nationality", form.nationality], ["Issuing country", form.issuingCountry], ["Passport expiry", form.passportExpiry]]
                      : [["Document", "National ID"], ["NID", form.nid]]),
                    ["Address", form.address],
                    ["Risk rating", "Low (auto)"],
                    ["Product", "Savings — KHR"],
                    ["Branch", "Phnom Penh HQ"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <Icon name="gavel" className="text-amber-500 text-lg" />
                  Terms &amp; conditions and fee disclosure will be presented to the customer for e-signature on activation.
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Icon name="celebration" className="text-6xl text-green-500 mb-3 block mx-auto" />
                <h2 className="text-xl font-extrabold text-slate-900">Account activated</h2>
                <p className="text-sm text-slate-500 mt-1 mb-6">CIF-101305 created · Savings KHR account opened · welcome SMS sent</p>
                <div className="flex justify-center gap-3">
                  <Link href="/customers" className="px-4 py-2.5 bg-gold text-navy text-sm font-semibold rounded-lg hover:brightness-95">Go to customers</Link>
                  <button onClick={() => window.location.reload()} className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Onboard another</button>
                </div>
              </div>
            )}
          </div>
        )}

        {!activated && (
          <div className="flex justify-between mt-8 pt-5 border-t border-slate-100">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className={`px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold ${step === 0 ? "opacity-40 cursor-not-allowed text-slate-400" : "text-slate-700 hover:bg-slate-50"}`}>
              Back
            </button>
            <button onClick={next} disabled={!canNext}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold ${canNext ? "bg-gold text-navy hover:brightness-95" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`}>
              {step === 2 ? "Activate account" : "Continue"}
            </button>
          </div>
        )}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
