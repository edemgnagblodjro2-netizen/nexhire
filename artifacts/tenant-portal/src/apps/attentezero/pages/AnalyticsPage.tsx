import { AttenteZeroLayout } from "../AttenteZeroLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { TrendingDown, Users, Clock, Star, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const hourly = [
  { h: "8h",  clients: 12, attente: 4 },
  { h: "9h",  clients: 28, attente: 8 },
  { h: "10h", clients: 45, attente: 14 },
  { h: "11h", clients: 52, attente: 18 },
  { h: "12h", clients: 38, attente: 11 },
  { h: "13h", clients: 22, attente: 6  },
  { h: "14h", clients: 48, attente: 16 },
  { h: "15h", clients: 55, attente: 19 },
  { h: "16h", clients: 41, attente: 13 },
  { h: "17h", clients: 18, attente: 5  },
];

const weekly = [
  { day: "Lun", served: 142 },
  { day: "Mar", served: 178 },
  { day: "Mer", served: 165 },
  { day: "Jeu", served: 191 },
  { day: "Ven", served: 204 },
  { day: "Sam", served: 88  },
];

const satisfaction = [
  { name: "Excellent", value: 42, color: "#0d9488" },
  { name: "Bon",       value: 31, color: "#5eead4" },
  { name: "Moyen",     value: 18, color: "#fbbf24" },
  { name: "Mauvais",   value: 9,  color: "#f87171" },
];

const employees = [
  { name: "Marie T.", served: 48, avg: "6.2 min", rate: 96 },
  { name: "Jean-P. D.", served: 44, avg: "7.1 min", rate: 91 },
  { name: "Sara K.",  served: 52, avg: "5.8 min", rate: 98 },
  { name: "Karim B.", served: 39, avg: "8.4 min", rate: 85 },
];

export function AnalyticsPage() {
  const { lang } = useLang();
  const fr = lang === "fr";

  return (
    <AttenteZeroLayout active="analytics">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{fr ? "Tableau de bord analytics" : "Analytics dashboard"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{fr ? "Aujourd'hui · Mise à jour en temps réel" : "Today · Real-time updates"}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users,        label: fr ? "Clients servis" : "Clients served",   value: "247",     delta: "+12%", up: true,  color: "text-teal-600",  bg: "bg-teal-50" },
            { icon: Clock,        label: fr ? "Attente moyenne" : "Avg wait time",   value: "8.4 min", delta: "-2.1 min", up: false, color: "text-green-600", bg: "bg-green-50" },
            { icon: TrendingUp,   label: fr ? "Taux service"    : "Service rate",    value: "94%",     delta: "+3%",  up: true,  color: "text-blue-600",  bg: "bg-blue-50" },
            { icon: Star,         label: fr ? "Satisfaction"    : "Satisfaction",    value: "4.3/5",   delta: "+0.2", up: true,  color: "text-yellow-600", bg: "bg-yellow-50" },
          ].map(({ icon: Icon, label, value, delta, up, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? "text-green-600" : "text-green-600"}`}>
                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {delta}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly flow */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "Flux horaire — aujourd'hui" : "Hourly flow — today"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hourly}>
                  <defs>
                    <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="h" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="clients" stroke="#0d9488" fill="url(#gClients)" strokeWidth={2}
                    name={fr ? "Clients" : "Clients"} />
                  <Area type="monotone" dataKey="attente" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2"
                    name={fr ? "Attente (min)" : "Wait (min)"} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "Clients cette semaine" : "Clients this week"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="served" fill="#0d9488" radius={[4, 4, 0, 0]} name={fr ? "Servis" : "Served"} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Satisfaction */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "Satisfaction client" : "Client satisfaction"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={satisfaction} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3}>
                    {satisfaction.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} />
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Employee performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{fr ? "Performance employés" : "Employee performance"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employees.map((e) => (
                  <div key={e.name} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                      {e.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{e.name}</span>
                        <span className="text-xs text-gray-500">{e.served} {fr ? "servis" : "served"} · {e.avg}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${e.rate}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-teal-700 w-8 text-right">{e.rate}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AttenteZeroLayout>
  );
}
