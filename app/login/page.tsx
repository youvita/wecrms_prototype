"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"cred" | "otp">("cred");
  const [user, setUser] = React.useState("vitou.lay");
  const [pass, setPass] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const submitCred = () => {
    if (!user || !pass) { setErr("Username and password are required"); return; }
    setErr(""); setLoading(true);
    setTimeout(() => { setLoading(false); setStep("otp"); }, 900);
  };

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) {
      setLoading(true);
      setTimeout(() => router.push("/dashboard"), 800);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(160deg,#201D1A 0%,#3C3833 100%)" }}>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gold text-navy flex items-center justify-center text-2xl font-black">★</span>
          <div>
            <div className="text-xl font-extrabold">WeCRM365</div>
            <div className="text-[11px] tracking-widest text-gold/80 uppercase">KB PRASAC Bank</div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold leading-snug">One console for every<br />customer journey.</h2>
          <p className="text-stone-300/80 mt-4 max-w-md text-sm leading-relaxed">
            Customer 360°, eKYC onboarding, lending pipeline, KHQR payments, support and analytics — built for Cambodian retail banking.
          </p>
          <div className="flex gap-6 mt-8 text-sm">
            <div><div className="text-2xl font-extrabold text-gold">12,847</div><div className="text-stone-400">Customers</div></div>
            <div><div className="text-2xl font-extrabold text-gold">1,436</div><div className="text-stone-400">Active loans</div></div>
            <div><div className="text-2xl font-extrabold text-gold">8.9k</div><div className="text-stone-400">Txns today</div></div>
          </div>
        </div>
        <p className="text-xs text-stone-400/70">Authorized personnel only · All sessions are monitored and logged</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-8 page-enter">
          {step === "cred" && (
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Sign in</h1>
              <p className="text-sm text-slate-500 mt-1 mb-6">Use your staff credentials to continue</p>
              {err && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input value={user} onChange={(e) => setUser(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 mb-4" />
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCred()} placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 mb-6" />
              <button onClick={submitCred} disabled={loading}
                className={`w-full inline-flex justify-center items-center px-4 py-3 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors ${loading ? "opacity-75 cursor-wait" : ""}`}>
                {loading && <Spinner />}
                {loading ? "Verifying…" : "Continue"}
              </button>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-200" /><span className="text-xs text-slate-400">or</span><div className="flex-1 h-px bg-slate-200" />
              </div>
              <button onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); setStep("otp"); }, 700); }}
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                <Icon name="fingerprint" className="text-primary-600" /> Sign in with biometrics
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="page-enter">
              <h1 className="text-2xl font-extrabold text-slate-900">Two-factor verification</h1>
              <p className="text-sm text-slate-500 mt-1 mb-6">Enter the 6-digit code sent to +855 12 •••• 89</p>
              <div className="flex justify-between gap-2 mb-6">
                {otp.map((d, i) => (
                  <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} maxLength={1} inputMode="numeric"
                    onChange={(e) => setDigit(i, e.target.value)}
                    className="w-12 h-14 text-center text-xl font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600" />
                ))}
              </div>
              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-primary-600 font-medium mb-4">
                  <Spinner /> Signing you in…
                </div>
              )}
              <p className="text-center text-sm text-slate-500">
                Did not receive it?{" "}
                <button className="text-primary-600 font-semibold hover:underline" onClick={() => setOtp(["", "", "", "", "", ""])}>Resend code</button>
              </p>
              <p className="text-center text-xs text-slate-400 mt-6">Tip (prototype): type any 6 digits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
