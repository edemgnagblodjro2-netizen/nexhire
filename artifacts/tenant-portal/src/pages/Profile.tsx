import { useState } from "react";
import { useLocation } from "wouter";
import { useGetTenantCurrentUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LangToggle } from "@/components/LangToggle";
import { ArrowLeft, Building2, LogOut, User, Lock, Loader2 } from "lucide-react";

function apiFetch(path: string, token: string | null, body: object) {
  return fetch(`/api${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

export function Profile() {
  const [, setLocation] = useLocation();
  const { logout, token } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();
  const { data: user, isLoading, refetch } = useGetTenantCurrentUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameInit, setNameInit] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }
  if (!user) return null;

  if (!nameInit) {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setNameInit(true);
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  async function saveName() {
    setSavingName(true);
    try {
      const r = await apiFetch("/tenant-auth/me", token, { firstName, lastName });
      if (!r.ok) throw new Error((await r.json()).error);
      await refetch();
      toast({ title: t.profileSaved });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSavingName(false); }
  }

  async function savePassword() {
    if (newPw !== confirmPw) {
      toast({ title: t.passwordMismatch, variant: "destructive" }); return;
    }
    setSavingPw(true);
    try {
      const r = await apiFetch("/tenant-auth/me", token, { currentPassword: currentPw, newPassword: newPw });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error === "Wrong current password" ? t.wrongPassword : err.error);
      }
      toast({ title: t.passwordChanged });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSavingPw(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
              <Building2 className="h-5 w-5 text-teal-600" />
              <span className="font-bold text-base text-gray-900">{t.portalName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Avatar + org */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-teal-600 text-white text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono text-xs">{user.tenantSlug}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">{user.role}</Badge>
            </div>
          </div>
        </div>

        {/* Name */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-teal-600" />
              <CardTitle className="text-base">{t.displayName}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t.firstName}</label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t.lastName}</label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveName} disabled={savingName}>
              {savingName ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.saving}</> : t.saveChanges}
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-teal-600" />
              <CardTitle className="text-base">{t.changePassword}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t.passwordMin}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t.currentPassword}</label>
              <Input type="password" placeholder="••••••••" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t.newPassword}</label>
                <Input type="password" placeholder="••••••••" value={newPw} onChange={e => setNewPw(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t.confirmPassword}</label>
                <Input type="password" placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              </div>
            </div>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={savePassword} disabled={savingPw || !currentPw || !newPw}>
              {savingPw ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.saving}</> : t.changePassword}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
