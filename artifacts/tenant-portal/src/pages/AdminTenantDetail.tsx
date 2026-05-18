import { useRoute, useLocation } from "wouter";
import { useGetTenant } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Building2, Loader2, Mail, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminTenantDetail() {
  const [, params] = useRoute("/admin/tenants/:id");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  
  const id = params?.id || "";
  const { data: tenant, isLoading, isError, error } = useGetTenant(id);

  if (isError && (error as any)?.status === 401) {
    logout();
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/tenants")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg text-gray-900">Tenant Details</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError || !tenant ? (
          <div className="text-center p-12">
            <h2 className="text-xl font-semibold text-gray-900">Tenant not found</h2>
            <p className="mt-2 text-gray-500">Could not load details for this organisation.</p>
            <Button className="mt-4" onClick={() => setLocation("/admin/tenants")}>
              Back to Directory
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  {tenant.name || tenant.slug}
                  {tenant.active !== false ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-normal">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal">Inactive</Badge>
                  )}
                </h1>
                <p className="mt-2 text-gray-500 font-mono">{tenant.slug}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Organisation Profile</CardTitle>
                  <CardDescription>Core information and settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">ID</h4>
                      <p className="text-sm font-mono">{tenant.id}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Code</h4>
                      <p className="text-sm font-mono">{tenant.slug}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Plan</h4>
                      <p className="text-sm capitalize">{tenant.plan}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {tenant.contactEmail && (
                      <div className="col-span-2">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Contact Email</h4>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${tenant.contactEmail}`} className="text-primary hover:underline">
                            {tenant.contactEmail}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Primary Color</h4>
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-8 w-8 rounded-full border border-gray-200" 
                        style={{ backgroundColor: tenant.primaryColor || '#0d9488' }}
                      />
                      <span className="text-sm font-mono uppercase text-gray-600">
                        {tenant.primaryColor || '#0d9488'}
                      </span>
                    </div>
                  </div>
                  
                  {tenant.logoUrl && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Logo</h4>
                      <img 
                        src={tenant.logoUrl} 
                        alt={`${tenant.name} logo`} 
                        className="max-w-[120px] max-h-[80px] object-contain border rounded-md p-2 bg-white"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
