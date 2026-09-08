import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { api, onSignedOut, setToken } from "./api";
import { Sidebar, TopBar } from "./components/Nav";
import Dashboard from "./pages/Dashboard";
import DatasetDetail from "./pages/DatasetDetail";
import Investigations from "./pages/Investigations";
import InvestigationDetail from "./pages/InvestigationDetail";
import Knowledge from "./pages/Knowledge";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Sources from "./pages/Sources";

const PAGE = {
  "/": {
    title: "Dashboard",
    subtitle: "Ask a question, or pick up where an investigation paused",
  },
  "/sources": {
    title: "Sources",
    subtitle: "Files, databases and pages, with provenance kept for each",
  },
  "/investigations": { title: "Investigations", subtitle: "Every question you have asked" },
  "/reports": { title: "Reports", subtitle: "Findings, forecasts and recommended actions" },
  "/knowledge": {
    title: "Knowledge base",
    subtitle: "Business context the agents can retrieve",
  },
};

function usePageMeta() {
  const { pathname } = useLocation();
  if (PAGE[pathname]) return PAGE[pathname];
  if (pathname.startsWith("/sources/"))
    return { title: "Dataset", subtitle: "Health, columns, cleaning and lineage" };
  if (pathname.startsWith("/investigations/"))
    return { title: "Investigation", subtitle: "Findings, evidence and the agent trail" };
  return { title: "DataDetective" };
}

/** Theme is stored per browser; it is a display preference, not account data. */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("dd-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dd-theme", theme);
  }, [theme]);

  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const meta = usePageMeta();
  const { pathname } = useLocation();

  useEffect(() => {
    onSignedOut(() => setUser(null));
    api
      .info()
      .then((info) => setProvider(info.llm_provider))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!user) return <Login onSignedIn={setUser} />;

  return (
    <div className="app-shell min-h-screen lg:pl-[248px]">
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        user={user}
        provider={provider}
        onSignOut={() => {
          setToken(null);
          setUser(null);
        }}
      />
      <TopBar
        title={meta.title}
        subtitle={meta.subtitle}
        onMenu={() => setNavOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/sources/:id" element={<DatasetDetail />} />
          <Route path="/investigations" element={<Investigations />} />
          <Route path="/investigations/:id" element={<InvestigationDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route
            path="*"
            element={
              <div className="mx-auto max-w-md px-4 py-20 text-center">
                <h2 className="text-[17px] font-semibold">That page doesn't exist</h2>
                <p className="mt-1.5 text-[13.5px] text-[var(--text-muted)]">
                  Use the navigation on the left to get back.
                </p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}