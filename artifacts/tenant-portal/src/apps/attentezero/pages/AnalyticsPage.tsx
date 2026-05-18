import { useState, useEffect, useCallback } from "react";
import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { TrendingDown, Users, Clock, Star, TrendingUp, RefreshCw } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { azApi } from "../lib/api";

const SATISFACTION = [
  { name: "Excellent", value: 42, color: "#0d9488" },
  { name: "Bon",       value: 31, color: "#5eead4" },
  { name: "Moyen",     value: 18, color: "#fbbf24" },
  { name: "Mauvais",   value: 9,  color: "#f87171" },
];

const DAYS_FR = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const DAYS_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function AnalyticsPage() {
  const { lang } = useLang();
  const fr = lang === "fr";

  const [data,    setData]    = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await azApi.getAnalytics();
      setData(d);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build hourly chart — fill all 8-17 hours
  const hourlyChart = Array.from({ length: 10 }, (_, i) => {
    const h = i + 8;
    const found = data?.hourly_flow?.find((r: any) => r.hour === h);
    return { h: `${h}h`, clients: found?.clients ?? 0 };
  });

  // Weekly chart
  const weeklyChart = (data?.weekly_served ?? []).map((r: any) => {
    const d = new Date(r.day);
    return { day: fr ? DAYS_FR[d.getDay()] : DAYS_EN[d.getDay()], served: r.served };
  });

  const servedToday  = data?.served_today  ?? 0;
  const avgWait      = data?.avg_wait_min  ?? 0;
  const staffPerf    = data?.staff_perf    ?? [];

  if (loading) return (
    <AttenteZeroLayout active="analytics">
      <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-teal-500" /></div>
    </AttenteZeroLayout>
  );

  return (
    <AttenteZeroLayout active="analytics">
      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fr ? "Tableau de bord analytics" : "Analytics dashboard"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{fr ? "Aujourd'hui · Données en direct" : "Today · Live data"}</p>
          </div>
          <button onClick={load} className="text-gray-400 hover:text-teal-600 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users,      label: fr ? "Clients servis" : "Clients served",  value: servedToday,             delta: null,       up: true,  color: "text-teal-600",   bg: "bg-teal-50" },
            { icon: Clock,      label: fr ? "Attente moy."  : "Avg wait",         value: `${avgWait || "—"} min`,  delta: null,       up: false, color: "text-orange-600", bg: "bg-orange-50" },
            { icon: TrendingUp, label: fr ? "Tickets créés" : "Tickets created",  value: data?.total_today ?? servedToday, delta: null, up: true, color: "text-blue-600",  bg: "bg-blue-50" },
            { icon: Star,       label: fr ? "Agents actifs" : "Active agents",    value: staffPerf.length,        delta: null,       up: true,  color: "text-yellow-600", bg: "bg-yellow-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className={`p-2 rounded-lg w-fit ${bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "Flux horaire — aujourd'hui" : "Hourly flow — today"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hourlyChart}>
                  <defs>
                    <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="h" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="clients" stroke="#0d9488" fill="url(#gClients)" strokeWidth={2}
                    name={fr ? "Tickets" : "Tickets"} />
                </AreaChart>
              </ResponsiveContainer>
              {hourlyChart.every(h => h.clients === 0) && (
                <p className="text-xs text-gray-400 text-center mt-2">{fr ? "Aucun ticket encore créé aujourd'hui" : "No tickets created yet today"}</p>
              )}
            </CardContent>
          </Card>

          {/* Weekly */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "7 derniers jours" : "Last 7 days"}</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="served" fill="#0d9488" radius={[4,4,0,0]} name={fr ? "Servis" : "Served"} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-xs text-gray-400">{fr ? "Pas encore de données" : "No data yet"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Satisfaction (static for now, to be tied to ratings later) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "Satisfaction client (simulation)" : "Client satisfaction (demo)"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={SATISFACTION} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3}>
                    {SATISFACTION.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} />
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Staff performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "Performance employés" : "Employee performance"}</CardTitle>
            </CardHeader>
            <CardContent>
              {staffPerf.length === 0 ? (
                <div className="flex items-center justify-center h-[180px]">
                  <p className="text-xs text-gray-400">{fr ? "Aucun agent actif" : "No active agents"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffPerf.map((e: any) => {
                    const maxServed = Math.max(...staffPerf.map((x: any) => x.served), 1);
                    const rate = Math.round((e.served / maxServed) * 100);
                    return (
                      <div key={e.name} className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700 flex-shrink-0">
                          {e.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">{e.name}</span>
                            <span className="text-xs text-gray-500">{e.served} · {e.avg_time}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AttenteZeroLayout>
  );
}
