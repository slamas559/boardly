import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Header from "./Header";
import api from "../utils/api";

export default function BankAccountSetup() {
  const navigate = useNavigate(); const [banks, setBanks] = useState([]); const [form, setForm] = useState({ bankCode: "", accountNumber: "", accountName: "" }); const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/auth/banks"),
      api.get("/auth/profile")
    ])
      .then(([banksResponse, profileResponse]) => {
        if (cancelled) return;

        const bankList = banksResponse.data?.banks || [];
        setBanks(bankList);

        const savedBankDetails = profileResponse.data?.bankDetails;
        if (savedBankDetails?.bankCode) {
          setForm((current) => ({
            ...current,
            bankCode: savedBankDetails.bankCode,
            accountNumber: savedBankDetails.accountNumber || current.accountNumber,
            accountName: savedBankDetails.accountName || current.accountName,
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Banks could not be loaded. Please try again.");
        }
      });

    return () => { cancelled = true; };
  }, []);

  const resolve = async () => { if (!form.bankCode || form.accountNumber.length !== 10) return setError("Choose a bank and enter a 10-digit account number."); setBusy(true); setError(""); try { const { data } = await api.post("/auth/resolve-account", form); setForm((current) => ({ ...current, accountName: data.accountName })); } catch (e) { setError(e.response?.data?.message || "We could not verify that account."); } finally { setBusy(false); } };
  const submit = async (event) => { event.preventDefault(); if (!form.accountName) return setError("Verify the account before continuing."); setSaving(true); setError(""); try { await api.post("/auth/setup-bank", form); navigate("/profile"); } catch (e) { setError(e.response?.data?.message || "Payout setup could not be completed."); } finally { setSaving(false); } };
  return <div className="min-h-screen bg-paper"><Header /><main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16"><Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={16} /> Profile</Link><div className="mt-10 grid gap-10 lg:grid-cols-[1fr_220px]"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Payouts</p><h1 className="mt-3 font-display text-5xl leading-none">Connect a bank account</h1><p className="mt-5 max-w-xl leading-7 text-muted">A verified account is required before you can create a paid room. Free rooms are always available.</p><form onSubmit={submit} className="mt-10 border-t border-line"><div className="py-6"><label className="mb-2 block text-sm font-medium">Bank</label><select value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value, accountName: "" })} className="h-11 w-full rounded-md border border-line-strong bg-white px-3 text-sm"><option value="">Select your bank</option>{banks.map((bank) => <option key={`${bank.code}-${bank.name}`} value={bank.code}>{bank.name}</option>)}</select></div><div className="border-t border-line py-6"><label className="mb-2 block text-sm font-medium">Account number</label><div className="flex gap-2"><input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, ""), accountName: "" })} inputMode="numeric" maxLength="10" placeholder="10-digit account number" className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-white px-3 text-sm" /><button type="button" onClick={resolve} disabled={busy} className="h-11 rounded-md border border-line-strong px-4 text-sm font-medium hover:bg-sunken disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : "Verify"}</button></div>{form.accountName && <p className="mt-3 flex items-center gap-2 text-sm text-ok"><Check size={16} /> {form.accountName}</p>}</div>{error && <p className="border-t border-danger/20 py-4 text-sm text-danger">{error}</p>}<div className="border-t border-line pt-6"><button disabled={saving || !form.accountName} className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />} Save payout account</button></div></form></div><aside className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6"><p className="text-sm font-medium">How payouts work</p><ol className="mt-4 space-y-4 text-sm leading-6 text-muted"><li><span className="mr-2 font-mono text-ink">01</span>Verify an account in your name.</li><li><span className="mr-2 font-mono text-ink">02</span>Create a paid room when ready.</li><li><span className="mr-2 font-mono text-ink">03</span>Payments are split automatically by Paystack.</li></ol></aside></div></main></div>;
}
