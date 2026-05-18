import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetTenantCurrentUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, CreditCard, LogOut, Users, Settings, Server } from "lucide-react";

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  
  const { data: user, isLoading, isError, error } = useGetTenantCurrentUser();

  useEffect(() => {
    if (isError && (error as any)?.status === 401) {
      logout();
      setLocation("/login");
    }
  }, [isError, error, logout, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto"></div>
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  const isAdmin = user.role === "admin" || user.role === "super_admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg text-gray-900">CivicAI Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block font-medium">
                  {user.firstName} {user.lastName}
                </span>
                {isAdmin && (
                  <Badge variant="secondary" className="ml-2 text-xs">Admin</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.firstName}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your organisation's CivicAI services.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Badge variant="outline" className="px-3 py-1 bg-white">
              <span className="font-mono text-xs text-primary">{user.tenantSlug}</span>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Organisation</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.tenantSlug}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active subscription
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered administrators
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Plan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Enterprise</div>
              <p className="text-xs text-muted-foreground mt-1">
                Billed annually
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your account settings and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2">
                <Users className="h-6 w-6 text-gray-400" />
                <span>Manage Users</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2">
                <Settings className="h-6 w-6 text-gray-400" />
                <span>Organisation Settings</span>
              </Button>
              
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10"
                  onClick={() => setLocation("/admin/tenants")}
                >
                  <Server className="h-6 w-6 text-primary" />
                  <span className="text-primary font-medium">Tenant Directory</span>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
