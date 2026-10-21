import usePageTitle from "../hooks/usePageTitle.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../utils/api";
import Header from "./Header";
import { fieldClass } from "./Auth/AuthLayout";

const TYPES = [
  { id: "Regular", title: "Free", body: "Anyone with the link can join, even without an account." },
  { id: "Paid", title: "Paid", body: "Listeners pay before entering. You keep the largest share." },
];

export default function CreateRoom() {
  usePageTitle("New room");
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("Regular");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const paid = type === "Paid";
  const invalid = !topic.trim() || (paid && !(Number(price) > 0));

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setCreating(true);
    setError("");
    try {
      await api.post("/rooms", { topic: topic.trim(), isPaid: paid, price: paid ? Number(price) : 0, currency: "NGN" });
      navigate("/lobby");
    } catch (err) {
      if (paid && err.response?.status === 403) {
        navigate("/bank-setup");
        return;
      }
      setError(err.response?.data?.message || "Could not create the room. Try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl">New room</h1>
        <p className="mt-2 text-[15px] text-muted">You can end it and come back to it any time.</p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          {error && <div role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}

          <div>
            <label htmlFor="topic" className="mb-1.5 block text-sm font-medium">Topic</label>
            <input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={80} placeholder="e.g. Quadratic equations, week 3" className={fieldClass} autoFocus />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Access</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TYPES.map((t) => (
                <label key={t.id} className={`cursor-pointer rounded-md border bg-white p-4 ${type === t.id ? "border-accent bg-accent-soft/50 outline outline-1 outline-accent" : "border-line-strong hover:border-gray-400"}`}>
                  <input type="radio" name="type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} className="sr-only" />
                  <div className="text-[15px] font-medium">{t.title}</div>
                  <p className="mt-1 text-sm leading-snug text-muted">{t.body}</p>
                </label>
              ))}
            </div>
          </fieldset>

          {paid && (
            <div>
              <label htmlFor="price" className="mb-1.5 block text-sm font-medium">Price per listener</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <input id="price" type="number" min="1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={`${fieldClass} pl-7`} placeholder="2000" />
              </div>
              <p className="mt-1.5 text-xs text-muted">Payouts need a connected bank account. You can add it from your profile.</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={invalid || creating} className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50">
              {creating ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : "Create room"}
            </button>
            <button type="button" onClick={() => navigate("/lobby")} className="h-11 rounded-md px-4 text-sm text-gray-700 hover:bg-sunken">Cancel</button>
          </div>
        </form>
      </main>
    </div>
  );
}
