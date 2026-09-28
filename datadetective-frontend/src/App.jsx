import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { api, getToken, onSignedOut, setToken } from "./api";
import { Sidebar, TopBar } from "./components/Nav";
import Admin from "./pages/Admin";
import Briefs from "./pages/Briefs";
import Chat from "./pages/Chat";
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
  "/chat": {
    title: "Chat",
    subtitle: "Ask in your own words — attach data, answer questions, get a report",
  },
  "/sources": {
    title: "Sources",
    subtitle: "Files, databases and pages, with provenance kept for each",
  },
  "/investigations": { title: "Investigations", subtitle: "Every question you have asked" },
  "/admin": {
    title: "Administration",
    subtitle: "Who is using the system, and whether it is working",
  },
  "/reports": { title: "Reports", subtitle: "Findings, forecasts and recommended actions" },
  "/briefs": {
    title: "Briefs",
    subtitle: "Answers assembled from indexed pages and documents",
  },
  "/knowledge": {
    title: "Knowledge base",
    subtitle: "Business context the agents can retrieve",
  },
};

function usePageMeta() {
  const { pathname } = useLocation();
  if (PAGE[pathname]) return PAGE[pathname];
  if (pathname.startsWith("/chat/"))
    return {
      title: "Chat",
      subtitle: "Ask in your own words — attach data, answer questions, get a report",
    };
  if (pathname.startsWith("/briefs/"))
    return { title: "Brief", subtitle: "Sourced from indexed documents" };
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
  // null while we find out whether the stored session is still valid
  const [restoring, setRestoring] = useState(Boolean(getToken()));
  const [provider, setProvider] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const meta = usePageMeta();
  const { pathname } = useLocation();

  useEffect(() => {
    onSignedOut(() => {
      setUser(null);
      setRestoring(false);
    });
    api
      .info()
      .then((info) => setProvider(info.llm_provider))
      .catch(() => {});

    // A stored token is only a claim; the server decides whether it is still
    // good. Asking now avoids showing a workspace that every request rejects.
    if (getToken()) {
      api
        .me()
        .then(setUser)
        .catch(() => setToken(null))
        .finally(() => setRestoring(false));
    }
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (restoring) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Restoring your session
        </div>
      </div>
    );
  }

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
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/sources/:id" element={<DatasetDetail />} />
          <Route path="/investigations" element={<Investigations />} />
          <Route path="/investigations/:id" element={<InvestigationDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/briefs" element={<Briefs />} />
          <Route path="/briefs/:id" element={<Briefs />} />
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