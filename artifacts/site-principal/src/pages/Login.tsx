import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLoginUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginUser = useLoginUser();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginUser.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          toast({
            title: "Connexion réussie",
            description: "Bienvenue dans votre espace client.",
          });
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Erreur de connexion",
            description: error?.error || "Identifiants incorrects.",
          });
        },
      }
    );
  };

  return (
    <PageWrapper title="Connexion">
      <div className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6">
        <div className="w-full max-w-md bg-white border shadow-xl p-8 md:p-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold uppercase tracking-widest text-foreground mb-2">Accès Client</h1>
            <p className="text-sm text-muted-foreground">Veuillez vous authentifier pour accéder à votre espace sécurisé.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase tracking-wider text-xs">Identifiant Email</FormLabel>
                    <FormControl>
                      <Input placeholder="votre.email@exemple.com" className="h-12 text-base" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase tracking-wider text-xs">Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="h-12 text-base" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-14 text-base font-bold tracking-widest uppercase"
                disabled={loginUser.isPending}
              >
                {loginUser.isPending ? "Authentification..." : "Se Connecter"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas encore de compte ?<br />
              <Link href="/inscription" className="text-primary font-bold hover:underline uppercase tracking-wider mt-2 inline-block">
                Ouvrir un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
