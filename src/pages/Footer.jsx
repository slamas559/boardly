import { Link } from "react-router-dom";
import Logo from "../ui/Logo.jsx";

const groups = [
  ["Product", [["/register", "Create an account"], ["/login", "Sign in"], ["/faq", "FAQ"]]],
  ["Company", [["/contact", "Contact"], ["/terms", "Terms"], ["/privacy", "Privacy"], ["/refund", "Refund policy"]]],
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5">
            <Logo className="h-6 w-6" />
            <span className="font-semibold tracking-tight">Boardly</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted">A shared board and document room for teaching, tutoring and meetings.</p>
        </div>
        {groups.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">{title}</h2>
            <ul className="mt-3 space-y-2">
              {links.map(([to, label]) => (
                <li key={to}><Link to={to} className="text-sm text-gray-700 hover:text-ink">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">© {new Date().getFullYear()} Boardly</p>
      </div>
    </footer>
  );
}
