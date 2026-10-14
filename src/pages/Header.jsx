import { useContext, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import StateContext from "../context/StateContext";
import Logo from "../ui/Logo.jsx";

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm ${isActive ? "bg-sunken text-ink" : "text-gray-600 hover:text-ink"}`;

function Header() {
  const { isAuthenticated } = useContext(StateContext);
  const [open, setOpen] = useState(false);

  const links = isAuthenticated
    ? [
        ["/dashboard", "Dashboard"],
        ["/lobby", "My rooms"],
        ["/profile", "Profile"],
      ]
    : [["/faq", "FAQ"], ["/contact", "Contact"]];

  const cta = isAuthenticated ? { to: "/create", label: "New room" } : { to: "/register", label: "Get started" };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm safe-top">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Boardly home">
          <Logo className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight">Boardly</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={navClass}>{label}</NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {!isAuthenticated && <Link to="/login" className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:text-ink">Sign in</Link>}
          {cta && <Link to={cta.to} className="inline-flex h-9 items-center rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-gray-800">{cta.label}</Link>}
        </div>

        <button
          type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-md hover:bg-sunken md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="border-b border-line py-3 text-[15px]">{label}</Link>
            ))}
            {!isAuthenticated && <Link to="/login" onClick={() => setOpen(false)} className="border-b border-line py-3 text-[15px]">Sign in</Link>}
          </nav>
          {cta && <Link to={cta.to} onClick={() => setOpen(false)} className="mt-4 flex h-11 items-center justify-center rounded-md bg-ink text-sm font-medium text-paper">{cta.label}</Link>}
        </div>
      )}
    </header>
  );
}

export default Header;
