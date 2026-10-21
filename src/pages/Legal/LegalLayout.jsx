import usePageTitle from "../../hooks/usePageTitle.js";
import { Link } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";

const links = [["/terms", "Terms"], ["/privacy", "Privacy"], ["/refund", "Refunds"], ["/faq", "FAQ"], ["/contact", "Contact"]];

export default function LegalLayout({ eyebrow = "Boardly", title, summary, updated, children }) {
  usePageTitle(title);
  return <div className="min-h-screen bg-paper"><Header /><main><div className="border-b border-line"><div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{eyebrow}</p><h1 className="mt-3 max-w-3xl font-display text-5xl leading-none sm:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-[17px] leading-7 text-muted">{summary}</p>{updated && <p className="mt-7 text-sm text-muted">Last updated {updated}</p>}</div></div><div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[180px_minmax(0,680px)] lg:py-14"><nav className="h-fit border-y border-line py-3 lg:sticky lg:top-20 lg:border-y-0 lg:border-l lg:py-0 lg:pl-4" aria-label="Company information"><p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">Information</p><div className="flex gap-1 overflow-x-auto lg:flex-col">{links.map(([to, label]) => <Link key={to} to={to} className="whitespace-nowrap px-2 py-1.5 text-sm text-gray-600 hover:text-ink lg:px-0">{label}</Link>)}</div></nav><article className="min-w-0">{children}</article></div></main><Footer /></div>;
}
