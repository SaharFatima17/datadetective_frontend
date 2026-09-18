import { NavLink } from "react-router-dom";
import {
  BookOpen,
  FileSearch,
  Database,
  MessageSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/sources", label: "Sources", icon: Database },
  { to: "/investigations", label: "Investigations", icon: Search },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/briefs", label: "Briefs", icon: FileSearch },
  { to: "/knowledge", label: "Knowledge base", icon: BookOpen },
];

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="14" cy="14" r="7" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      <path d="M19 19 L26 26" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2" fill="var(--accent)" />
    </svg>
  );
}

export function Sidebar({ open, onClose, user, onSignOut, provider }) {
  return (
    <>
      {open && (
        <div
          className="no-print fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r
          transition-transform duration-200 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex h-14 items-center gap-2.5 px-5">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">
            <span className="text-[var(--text-primary)]">Data</span>
            <span className="text-[var(--accent)]">Detective</span>
          </span>
          <button
            className="ml-auto rounded-md p-1 hover:bg-[var(--surface-sunken)] lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2 pl-4 text-[13.5px] font-medium
                 transition-colors duration-150 ${
                   isActive
                     ? "bg-[var(--accent-quiet)] text-[var(--accent)]"
                     : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full
                      transition-[opacity,transform] duration-200"
                    style={{
                      background: "var(--accent)",
                      opacity: isActive ? 1 : 0,
                      transform: `translateY(-50%) scaleY(${isActive ? 1 : 0.4})`,
                    }}
                  />
                  <Icon
                    size={16.5}
                    className={`transition-transform duration-150 ${isActive ? "" : "group-hover:translate-x-0.5"}`}
                  />
                  <span className={`underline-hover ${isActive ? "is-active" : ""}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t px-3 py-3">
          <div className="px-2 pb-2">
            <div className="truncate text-[13px] font-medium">{user?.email}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]">
              <span>{user?.role}</span>
              {provider && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span className="font-mono">llm: {provider}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px]
              font-medium text-[var(--text-secondary)] transition-colors
              hover:bg-[var(--surface-sunken)] hover:text-[var(--color-alert-soft)]"
          >
            <LogOut size={16.5} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

export function TopBar({ title, subtitle, onMenu, theme, onToggleTheme, actions }) {
  return (
    <header
      className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur
        lg:px-7"
      style={{
        background: "color-mix(in srgb, var(--surface-page) 85%, transparent)",
        boxShadow: "0 1px 0 var(--border-hairline), 0 8px 20px -18px rgba(0,0,0,0.4)",
      }}
    >
      <button
        className="rounded-md p-1.5 hover:bg-[var(--surface-sunken)] lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold leading-tight">{title}</h1>
        {subtitle && (
          <p className="truncate text-[12.5px] text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>

      {actions}

      <button
        onClick={onToggleTheme}
        className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-sunken)]"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? <Sun size={16.5} /> : <Moon size={16.5} />}
      </button>
    </header>
  );
}