import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTenantRegister } from "@workspace/api-client-react";
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

export function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const registerMutation = useTenantRegister();

  const formSchema = z.object({
    tenantSlug: z.string().min(1, t.required(t.orgCode)),
    firstName: z.string().min(1, t.required(t.firstName)),
    lastName: z.string().min(1, t.required(t.lastName)),
    email: z.string().email(t.invalidEmail),
    password: z.string().min(8, t.passwordMin),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { tenantSlug: "", firstName: "", lastName: "", email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: (result) => {
          setToken(result.token);
          toast({ title: t.registerSuccess, description: t.registerSuccessDesc });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: t.registerFailed,
            description: (error as any).data?.error || t.registerFailedDesc,
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center relative">
          <div className="absolute right-0 top-0"><LangToggle /></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{t.portalName}</h2>
          <p className="mt-2 text-sm text-gray-600">{t.register}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.registerTitle}</CardTitle>
            <CardDescription>{t.registerDesc}</CardDescription>
          </CardHeader>
          <CardContent>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.firstName}</FormLabel>
                      <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.lastName}</FormLabel>
                      <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

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

                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? t.registering : t.createAccount}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              {t.alreadyAccount}{" "}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                {t.loginLink}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
