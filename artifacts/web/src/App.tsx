import { Redirect, Route, Switch } from "wouter";
import { StoreProvider, useStore } from "@/data/store";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import type { UserRole } from "@/data/types";

import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { AuditsPage } from "@/pages/Audits";
import { AuditDetailPage } from "@/pages/AuditDetail";
import { CountWorkspacePage } from "@/pages/CountWorkspace";
import { ReviewWorkspacePage } from "@/pages/ReviewWorkspace";
import { ProductsPage } from "@/pages/Products";
import { ProductFormPage } from "@/pages/ProductForm";
import { LocationsPage } from "@/pages/Locations";
import { UsersPage } from "@/pages/Users";
import { MetricsPage } from "@/pages/Metrics";
import { ActivityPage } from "@/pages/Activity";
import { SettingsPage } from "@/pages/Settings";

function Guard({ roles, children }: { roles?: UserRole[]; children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Redirect to="/login" />;
  // bounce disallowed roles back to the dashboard
  if (roles && !roles.includes(user.role)) return <Redirect to="/" />;
  return <>{children}</>;
}

function Shell({ roles, children }: { roles?: UserRole[]; children: React.ReactNode }) {
  return (
    <Guard roles={roles}>
      <AppShell>{children}</AppShell>
    </Guard>
  );
}

function Routes() {
  const { user } = useStore();

  return (
    <Switch>
      <Route path="/login">{user ? <Redirect to="/" /> : <LoginPage />}</Route>

      <Route path="/">
        <Shell>
          <DashboardPage />
        </Shell>
      </Route>

      <Route path="/audits">
        <Shell>
          <AuditsPage />
        </Shell>
      </Route>

      <Route path="/audits/:id/count">
        {(params) => (
          <Shell>
            <CountWorkspacePage id={params.id} />
          </Shell>
        )}
      </Route>

      <Route path="/audits/:id/review">
        {(params) => (
          <Shell roles={["supervisor", "gerente"]}>
            <ReviewWorkspacePage id={params.id} />
          </Shell>
        )}
      </Route>

      <Route path="/audits/:id">
        {(params) => (
          <Shell>
            <AuditDetailPage id={params.id} />
          </Shell>
        )}
      </Route>

      <Route path="/metrics">
        <Shell roles={["supervisor", "gerente"]}>
          <MetricsPage />
        </Shell>
      </Route>

      <Route path="/products">
        <Shell roles={["supervisor", "gerente"]}>
          <ProductsPage />
        </Shell>
      </Route>

      <Route path="/products/new">
        <Shell roles={["supervisor", "gerente"]}>
          <ProductFormPage />
        </Shell>
      </Route>

      <Route path="/products/:id">
        {(params) => (
          <Shell roles={["supervisor", "gerente"]}>
            <ProductFormPage id={params.id} />
          </Shell>
        )}
      </Route>

      <Route path="/locations">
        <Shell roles={["supervisor", "gerente"]}>
          <LocationsPage />
        </Shell>
      </Route>

      <Route path="/users">
        <Shell roles={["gerente"]}>
          <UsersPage />
        </Shell>
      </Route>

      <Route path="/activity">
        <Shell roles={["supervisor", "gerente"]}>
          <ActivityPage />
        </Shell>
      </Route>

      <Route path="/settings">
        <Shell>
          <SettingsPage />
        </Shell>
      </Route>

      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Routes />
      <Toaster />
    </StoreProvider>
  );
}
