import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Services from "@/pages/Services";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import { getStoredKey } from "@/lib/auth";

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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AdminApp />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
