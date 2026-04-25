import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Services from "@/pages/Services";
import Verifications from "@/pages/Verifications";
import B2G from "@/pages/B2G";
import BugReports from "@/pages/BugReports";
import Stats from "@/pages/Stats";
import OrgLogin from "@/pages/OrgLogin";
import OrgDashboard from "@/pages/OrgDashboard";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import { getStoredKey } from "@/lib/auth";
import { getOrgToken } from "@/lib/orgAuth";

const queryClient = new QueryClient();

function AdminApp() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = getStoredKey();
    if (stored) setAdminKey(stored);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!adminKey) {
    return <Login onLogin={setAdminKey} />;
  }

  return (
    <Layout onLogout={() => setAdminKey(null)}>
      <Switch>
        <Route path="/" component={() => <Dashboard adminKey={adminKey} />} />
        <Route path="/services" component={() => <Services adminKey={adminKey} />} />
        <Route path="/verifications" component={() => <Verifications adminKey={adminKey} />} />
        <Route path="/b2g" component={() => <B2G adminKey={adminKey} />} />
        <Route path="/bug-reports" component={() => <BugReports adminKey={adminKey} />} />
        <Route path="/stats" component={() => <Stats adminKey={adminKey} />} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function OrgGuard() {
  const token = getOrgToken();
  if (!token) return <Redirect to="/organisme/login" />;
  return <OrgDashboard />;
}

function AppRouter() {
  const [location] = useLocation();
  if (location.startsWith("/organisme")) {
    return (
      <Switch>
        <Route path="/organisme/login" component={OrgLogin} />
        <Route path="/organisme/dashboard" component={OrgGuard} />
        <Route path="/organisme" component={() => <Redirect to="/organisme/dashboard" />} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  return <AdminApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
