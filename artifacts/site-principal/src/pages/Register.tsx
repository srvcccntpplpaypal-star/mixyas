import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useRegisterUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ShieldCheck } from "lucide-react";

const registerSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis" }),
  lastName: z.string().min(1, { message: "Le nom est requis" }),
  email: z.string().email({ message: "Adresse email invalide" }),
  countryCode: z.string().min(2, { message: "L'indicatif est requis" }),
  phone: z.string().min(5, { message: "Le numéro de téléphone est requis" }),
  country: z.string().min(2, { message: "Le pays est requis" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
});

// ─── Pays avec service YAS/MoMo ────────────────────────────────────────────
// Togo (prioritaire) + Afrique de l'Ouest + Afrique Centrale + reste du monde
const COUNTRY_CODES = [
  // Togo & prioritaires YAS
  { code: "+228", label: "🇹🇬 Togo (+228)" },
  { code: "+225", label: "🇨🇮 Côte d'Ivoire (+225)" },
  { code: "+221", label: "🇸🇳 Sénégal (+221)" },
  { code: "+233", label: "🇬🇭 Ghana (+233)" },
  { code: "+229", label: "🇧🇯 Bénin (+229)" },
  { code: "+226", label: "🇧🇫 Burkina Faso (+226)" },
  { code: "+223", label: "🇲🇱 Mali (+223)" },
  { code: "+227", label: "🇳🇪 Niger (+227)" },
  { code: "+224", label: "🇬🇳 Guinée (+224)" },
  { code: "+245", label: "🇬🇼 Guinée-Bissau (+245)" },
  { code: "+237", label: "🇨🇲 Cameroun (+237)" },
  { code: "+242", label: "🇨🇬 Congo (+242)" },
  { code: "+243", label: "🇨🇩 RD Congo (+243)" },
  { code: "+236", label: "🇨🇫 Centrafrique (+236)" },
  { code: "+241", label: "🇬🇦 Gabon (+241)" },
  { code: "+240", label: "🇬🇶 Guinée Éq. (+240)" },
  { code: "+235", label: "🇹🇩 Tchad (+235)" },
  { code: "+222", label: "🇲🇷 Mauritanie (+222)" },
  { code: "+230", label: "🇲🇺 Maurice (+230)" },
  { code: "+261", label: "🇲🇬 Madagascar (+261)" },
  { code: "+234", label: "🇳🇬 Nigéria (+234)" },
  { code: "+212", label: "🇲🇦 Maroc (+212)" },
  { code: "+213", label: "🇩🇿 Algérie (+213)" },
  { code: "+216", label: "🇹🇳 Tunisie (+216)" },
  { code: "+20", label: "🇪🇬 Égypte (+20)" },
  // Diaspora
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+32", label: "🇧🇪 Belgique (+32)" },
  { code: "+41", label: "🇨🇭 Suisse (+41)" },
  { code: "+1", label: "🇺🇸 USA/Canada (+1)" },
  { code: "+44", label: "🇬🇧 Royaume-Uni (+44)" },
  { code: "+49", label: "🇩🇪 Allemagne (+49)" },
  { code: "+34", label: "🇪🇸 Espagne (+34)" },
  { code: "+351", label: "🇵🇹 Portugal (+351)" },
  { code: "+39", label: "🇮🇹 Italie (+39)" },
];

const COUNTRIES = [
  // Togo en premier
  "Togo",
  "Côte d'Ivoire",
  "Sénégal",
  "Ghana",
  "Bénin",
  "Burkina Faso",
  "Mali",
  "Niger",
  "Guinée",
  "Guinée-Bissau",
  "Cameroun",
  "Congo",
  "RD Congo",
  "Centrafrique",
  "Gabon",
  "Guinée Équatoriale",
  "Tchad",
  "Mauritanie",
  "Madagascar",
  "Nigeria",
  "Maroc",
  "Algérie",
  "Tunisie",
  "Égypte",
  "France",
  "Belgique",
  "Suisse",
  "États-Unis",
  "Canada",
  "Royaume-Uni",
  "Allemagne",
  "Espagne",
  "Portugal",
  "Italie",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerUser = useRegisterUser();

  // Récupérer le code affilié depuis localStorage (posé par /ref/:code)
  const referredByCode = localStorage.getItem("ref_code") ?? undefined;

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      countryCode: "+228",
      phone: "",
      country: "Togo",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    registerUser.mutate(
      { data: { ...values, referredByCode } as any },
      {
        onSuccess: (data) => {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          localStorage.removeItem("ref_code"); // nettoyer le code affilié
          toast({
            title: "Compte créé avec succès !",
            description: `Bienvenue sur YAS Service. Votre portefeuille : 5 000 FCFA.`,
          });
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Erreur lors de l'inscription",
            description: error?.error || "Une erreur est survenue.",
          });
        },
      }
    );
  };

  return (
    <PageWrapper title="Ouvrir un compte">
      <div className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6">
        <div className="w-full max-w-2xl bg-white border-2 shadow-xl">

          {/* Header */}
          <div className="bg-[#123274] text-white px-8 py-8 text-center border-b-4 border-[#FFD700]">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#FFD700] rounded-full flex items-center justify-center">
                <img src="/images/yas-logo.svg" alt="YAS" className="w-8 h-8 object-contain" />
              </div>
              <div className="text-left">
                <div className="font-black text-xl uppercase tracking-widest text-white">YAS Service</div>
                <div className="text-[9px] text-[#FFD700] tracking-[0.3em] uppercase">Plateforme Officielle</div>
              </div>
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Créer mon compte</h1>
            <p className="text-white/70 text-sm mt-1">Recevez <strong className="text-[#FFD700]">5 000 FCFA</strong> dès l'inscription</p>
            {referredByCode && (
              <div className="mt-3 inline-flex items-center gap-2 bg-[#FFD700]/20 border border-[#FFD700]/40 px-3 py-1 text-xs text-[#FFD700] font-bold uppercase tracking-widest">
                🎁 Inscription via lien partenaire
              </div>
            )}
          </div>

          <div className="p-8 md:p-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-wider text-xs font-bold">Prénom *</FormLabel>
                      <FormControl><Input placeholder="Jean" className="h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-wider text-xs font-bold">Nom de famille *</FormLabel>
                      <FormControl><Input placeholder="Dupont" className="h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase tracking-wider text-xs font-bold">Adresse Email *</FormLabel>
                    <FormControl><Input placeholder="jean.dupont@exemple.com" type="email" className="h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="countryCode" render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel className="uppercase tracking-wider text-xs font-bold">Indicatif *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel className="uppercase tracking-wider text-xs font-bold">Téléphone *</FormLabel>
                      <FormControl><Input placeholder="90 00 00 00" className="h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-wider text-xs font-bold">Pays de résidence *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Sélectionnez un pays" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-wider text-xs font-bold">Mot de passe *</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" className="h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 mt-4 text-base font-bold tracking-widest uppercase bg-[#123274] hover:bg-[#123274]/90 text-white"
                  disabled={registerUser.isPending}
                >
                  {registerUser.isPending ? "Création en cours..." : "Créer mon compte — Gratuit"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-6 border-t flex flex-col gap-4">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-[#123274]" />
                <span>Vos données sont chiffrées et sécurisées</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Déjà un compte ?{" "}
                <Link href="/connexion" className="text-[#123274] font-bold hover:underline uppercase tracking-wider">
                  Se Connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
