import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTenantLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LangToggle } from "@/components/LangToggle";
import { Shield, Zap, BarChart3 } from "lucide-react";

export function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const loginMutation = useTenantLogin();

  const formSchema = z.object({
    tenantSlug: z.string().min(1, t.required(t.orgCode)),
    email: z.string().email(t.invalidEmail),
    password: z.string().min(1, t.required(t.password)),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { tenantSlug: "", email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (result) => {
          setToken(result.token);
          toast({ title: t.loginSuccess, description: t.loginSuccessDesc });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: t.loginFailed,
            description: (error as any).data?.error || t.loginFailedDesc,
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0f172a] flex-col justify-between p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-600/20 blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-teal-500/10 blur-2xl" />
          {/* Grid dots */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/tenant-portal/civicai-logo.png" alt="CivicAI" className="w-9 h-9 rounded-lg object-contain bg-white/10 p-1" />
            <span className="text-white font-bold text-lg tracking-tight">CivicAI Portal</span>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              La plateforme de gestion<br />
              <span className="text-teal-400">pensée pour vous.</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Gérez vos projets, vos clients et vos équipes depuis un seul espace — sécurisé, rapide et conçu au Québec.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Shield, label: "Données hébergées au Canada", desc: "Conformité Loi 25 garantie" },
              { icon: Zap, label: "IA intégrée à vos flux", desc: "Automatisations sur mesure" },
              { icon: BarChart3, label: "Tableaux de bord en temps réel", desc: "KPIs et rapports avancés" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-md bg-teal-500/15 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} CivicAI inc. — NEQ 2280791601
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 py-12 px-6 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <img src="/tenant-portal/civicai-logo.png" alt="CivicAI" className="w-7 h-7 rounded-md object-contain" />
              <span className="font-bold text-gray-900">CivicAI Portal</span>
            </div>
            <LangToggle />
          </div>

          {/* Desktop lang toggle */}
          <div className="hidden lg:flex justify-end mb-6">
            <LangToggle />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{t.signInTitle}</h2>
            <p className="mt-1 text-sm text-gray-500">{t.signInDesc}</p>
          </div>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="tenantSlug" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.orgCode}</FormLabel>
                      <FormControl><Input placeholder={t.orgCodePlaceholder} {...field} /></FormControl>
                      <FormDescription>{t.orgCodeDesc}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.email}</FormLabel>
                      <FormControl><Input type="email" placeholder="admin@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.password}</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full mt-2" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? t.signingIn : t.signIn}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <p className="text-sm text-gray-500">
                {t.noAccount}{" "}
                <Link href="/register" className="font-medium text-teal-600 hover:text-teal-500">
                  {t.registerLink}
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
