import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LangProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { AdminTenants } from "@/pages/AdminTenants";
import { AdminTenantDetail } from "@/pages/AdminTenantDetail";
import { Profile } from "@/pages/Profile";
import { QueuePage }         from "@/apps/attentezero/pages/QueuePage";
import { AppointmentsPage }  from "@/apps/attentezero/pages/AppointmentsPage";
import { AnalyticsPage }     from "@/apps/attentezero/pages/AnalyticsPage";
import { SitesPage }         from "@/apps/attentezero/pages/SitesPage";
import { DisplayPage }       from "@/apps/attentezero/pages/DisplayPage";
import { NotificationsPage } from "@/apps/attentezero/pages/NotificationsPage";
import { StaffPage }         from "@/apps/attentezero/pages/StaffPage";
import { PortalPage }        from "@/apps/attentezero/pages/PortalPage";
import { CRMPage }           from "@/apps/attentezero/pages/CRMPage";
import { SlotManagerPage }   from "@/apps/attentezero/pages/SlotManagerPage";
import { KioskPage }         from "@/apps/attentezero/pages/KioskPage";
import { PublicTicketPage }    from "@/apps/attentezero/pages/PublicTicketPage";
import { CitizenBookingPage }  from "@/apps/attentezero/pages/CitizenBookingPage";
import { BookAppointmentPage } from "@/apps/attentezero/pages/BookAppointmentPage";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function PublicRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/login">
        <PublicRoute component={Login} />
      </Route>
      <Route path="/register">
        <PublicRoute component={Register} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/admin/tenants">
        <ProtectedRoute component={AdminTenants} />
      </Route>
      <Route path="/admin/tenants/:id">
        <ProtectedRoute component={AdminTenantDetail} />
      </Route>
      <Route path="/apps/attentezero">
        <ProtectedRoute component={() => <Redirect to="/apps/attentezero/queues" />} />
      </Route>
      <Route path="/apps/attentezero/queues">
        <ProtectedRoute component={QueuePage} />
      </Route>
      <Route path="/apps/attentezero/appointments">
        <ProtectedRoute component={AppointmentsPage} />
      </Route>
      <Route path="/apps/attentezero/analytics">
        <ProtectedRoute component={AnalyticsPage} />
      </Route>
      <Route path="/apps/attentezero/sites">
        <ProtectedRoute component={SitesPage} />
      </Route>
      <Route path="/apps/attentezero/display">
        <ProtectedRoute component={DisplayPage} />
      </Route>
      <Route path="/apps/attentezero/notifications">
        <ProtectedRoute component={NotificationsPage} />
      </Route>
      <Route path="/apps/attentezero/staff">
        <ProtectedRoute component={StaffPage} />
      </Route>
      <Route path="/apps/attentezero/portal">
        <ProtectedRoute component={PortalPage} />
      </Route>
      <Route path="/apps/attentezero/crm">
        <ProtectedRoute component={CRMPage} />
      </Route>
      <Route path="/apps/attentezero/slot-manager">
        <ProtectedRoute component={SlotManagerPage} />
      </Route>
      {/* Public — no auth required */}
      <Route path="/apps/attentezero-public/:slug">
        <PublicTicketPage />
      </Route>
      {/* Citizen appointment pages — public, no auth */}
      <Route path="/rdv/:token">
        <CitizenBookingPage />
      </Route>
      <Route path="/reserver/:tenantId">
        <BookAppointmentPage />
      </Route>
      {/* Kiosk QR scan landing — public, no auth */}
      <Route path="/kiosk/:tenantId">
        <KioskPage />
      </Route>
      <Route>
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
