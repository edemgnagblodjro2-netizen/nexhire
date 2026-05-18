import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { UserCog, Coffee, Play, Square, Users, RefreshCw } from "lucide-react";
import { azApi } from "../lib/api";

type EmpStatus = "active" | "paused" | "offline";

const STATUS_CFG = {
  active:  { labelFr: "Actif",      labelEn: "Active",    cls: "bg-green-100 text-green-800",   dot: "bg-green-500" },
  paused:  { labelFr: "Pause",      labelEn: "On break",  cls: "bg-yellow-100 text-yellow-800",  dot: "bg-yellow-500" },
  offline: { labelFr: "Hors ligne", labelEn: "Offline",   cls: "bg-gray-100 text-gray-600",     dot: "bg-gray-400" },
};

export function StaffPage() {
  const { lang } = useLang();
  const fr = lang === "fr";

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const d = await azApi.getStaff(); setEmployees(d); setError(null); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: EmpStatus) {
    try { await azApi.updateStaffStatus(id, status); await load(); }
    catch (e: any) { setError(e.message); }
  }

  const active  = employees.filter(e => e.status === "active").length;
  const paused  = employees.filter(e => e.status === "paused").length;
  const offline = employees.filter(e => e.status === "offline").length;

  if (loading) return (
    <AttenteZeroLayout active="staff">
      <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-teal-500" /></div>
    </AttenteZeroLayout>
  );

  return (
    <AttenteZeroLayout active="staff">
      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Employés & Guichets" : "Staff & Counters"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{active} {fr ? "actifs" : "active"} · {paused} {fr ? "en pause" : "on break"} · {offline} {fr ? "hors ligne" : "offline"}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={load} className="text-gray-400 hover:text-teal-600">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: fr ? "Guichets actifs" : "Active counters", value: active,  color: "text-green-600",  bg: "bg-green-50" },
            { label: fr ? "En pause"        : "On break",        value: paused,  color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: fr ? "Hors ligne"      : "Offline",         value: offline, color: "text-gray-500",   bg: "bg-gray-50" },
          ].map(({ label, value, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Staff list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCog className="h-4 w-4 text-teal-600" />
              {fr ? "Équipe du jour" : "Today's team"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {employees.map((e: any) => {
              const cfg = STATUS_CFG[e.status as EmpStatus] ?? STATUS_CFG.offline;
              return (
                <div key={e.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700">
                      {e.full_name?.[0] ?? "?"}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{e.full_name}</span>
                      <Badge className={`text-xs px-1.5 ${cfg.cls}`}>{fr ? cfg.labelFr : cfg.labelEn}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {e.role} · {e.guichet ?? "—"} · {e.served_today} {fr ? "servis" : "served"} · {e.avg_time}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {e.status !== "active" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={() => setStatus(e.id, "active")}>
                        <Play className="h-3 w-3 mr-1" />{fr ? "Activer" : "Activate"}
                      </Button>
                    )}
                    {e.status === "active" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50" onClick={() => setStatus(e.id, "paused")}>
                        <Coffee className="h-3 w-3 mr-1" />{fr ? "Pause" : "Break"}
                      </Button>
                    )}
                    {e.status !== "offline" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-gray-500 border-gray-200 hover:bg-gray-100" onClick={() => setStatus(e.id, "offline")}>
                        <Square className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Counter overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-600" />
              {fr ? "Vue guichets" : "Counters overview"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["Guichet 1","Guichet 2","Guichet 3","Guichet 4"].map(g => {
                const emp = employees.find(e => e.guichet === g);
                const isActive = emp?.status === "active";
                return (
                  <div key={g} className={`p-3 rounded-lg border text-center transition-all
                    ${isActive ? "bg-teal-50 border-teal-300" : "bg-gray-50 border-gray-200"}`}>
                    <div className={`text-sm font-bold ${isActive ? "text-teal-700" : "text-gray-400"}`}>{g}</div>
                    <div className="text-xs mt-1 truncate">{emp ? emp.full_name?.split(" ")[0] : (fr ? "Fermé" : "Closed")}</div>
                    <div className={`h-1.5 w-1.5 rounded-full mx-auto mt-1.5 ${isActive ? "bg-green-500" : "bg-gray-300"}`} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AttenteZeroLayout>
  );
}
