import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { apiFetch } from "@/lib/api";
import {
  ShieldCheck, CheckCircle2, Globe2, ArrowRight, Star,
  Users, Briefcase, CreditCard, Zap, Lock, TrendingUp,
} from "lucide-react";

export default function Home() {
  const [depositPhone, setDepositPhone] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ phoneNumber: string | null }>("/deposit/info")
      .then(r => setDepositPhone(r.phoneNumber))
      .catch(() => {});
  }, []);

  return (
    <PageWrapper title="Accueil">

      {/* ══ HERO ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-white border-b overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 py-24 md:py-36 relative z-10">
          <div className="max-w-4xl">

            {/* Logo textuel */}
            <div className="inline-flex items-center gap-3 mb-10">
              <div className="w-14 h-14 bg-foreground flex items-center justify-center border-4 border-primary">
                <span className="text-primary font-black text-xl tracking-tighter leading-none">YAS</span>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Plateforme Officielle</div>
                <div className="font-black text-xl uppercase tracking-widest text-foreground leading-none">YAS Service</div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-4 py-2 mb-8">
              <Star className="w-3 h-3" /> Bonus de bienvenue : 5 000 FCFA crédités à l'inscription
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight mb-8">
              Gagnez de l'argent<br />
              <span className="text-primary relative inline-block">
                en ligne, dès aujourd'hui.
                <span className="absolute bottom-1 left-0 w-full h-2 bg-primary/20 -z-10" />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-12">
              Rejoignez YAS Service, recevez <strong className="text-foreground">5 000 FCFA</strong> dès votre inscription,
              effectuez des tâches rémunérées et retirez vos gains dès 10 000 F. Simple, rapide, sécurisé.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/inscription" className="inline-block">
                <Button size="lg" className="w-full sm:w-auto text-base uppercase tracking-wider font-bold h-14 px-10">
                  Créer mon compte gratuit
                </Button>
              </Link>
              <Link href="/connexion" className="inline-block">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base uppercase tracking-wider font-bold h-14 px-10 border-foreground text-foreground hover:bg-foreground hover:text-white">
                  Accès Client <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CHIFFRES CLÉS ══════════════════════════════════════════════════════ */}
      <section className="bg-foreground text-white py-16 border-b-4 border-primary">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: "5 000 F", label: "Bonus inscription" },
              { val: "1 000 F", label: "Par tâche validée" },
              { val: "10 000 F", label: "Seuil de retrait" },
              { val: "100%", label: "Sécurisé" },
            ].map(s => (
              <div key={s.label}>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{s.val}</div>
                <div className="text-xs uppercase tracking-widest text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROGRESSION VISUELLE ═══════════════════════════════════════════════ */}
      <section className="py-24 bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-block bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest px-4 py-2 mb-4">
              Comment ça marche ?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Atteignez 10 000 F et retirez vos gains
            </h2>
          </div>

          {/* Cartes progression */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-2 border-gray-100 overflow-hidden">
            {[
              {
                icon: <Users className="w-6 h-6" />,
                step: "Départ",
                amount: "5 000 F",
                label: "À l'inscription",
                desc: "Votre portefeuille est crédité de 5 000 FCFA dès la création de votre compte.",
                color: "bg-primary/10 text-primary",
              },
              {
                icon: <Briefcase className="w-6 h-6" />,
                step: "Tâches 1 & 2",
                amount: "+2 000 F",
                label: "→ 7 000 F",
                desc: "Effectuez 2 tâches simples (partage, sondage). Chaque tâche validée = +1 000 FCFA instantanément.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                step: "Tâche 3",
                amount: "Défi",
                label: "Chronométrée",
                desc: "Un défi de sécurité ultra-rapide vous est soumis. Complétez-le ou déposez 5 000 F pour continuer.",
                color: "bg-red-50 text-red-600",
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                step: "Tâche 4",
                amount: "+1 000 F",
                label: "→ 8 000 F",
                desc: "Rédigez un avis sur YAS Service. Votre solde atteint 8 000 F — le retrait est en vue.",
                color: "bg-green-50 text-green-600",
              },
            ].map((s, i) => (
              <div key={i} className={`p-8 border-b md:border-b-0 md:border-r border-gray-100 last:border-0`}>
                <div className={`w-12 h-12 ${s.color} rounded-sm flex items-center justify-center mb-4`}>
                  {s.icon}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{s.step}</div>
                <div className="text-2xl font-bold text-foreground mb-1">{s.amount}</div>
                <div className="text-sm font-bold text-primary mb-3">{s.label}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Flèche finale */}
          <div className="flex justify-center mt-8">
            <div className="bg-foreground text-white px-10 py-5 text-center">
              <div className="text-3xl font-bold text-primary mb-1">10 000 F</div>
              <div className="text-xs uppercase tracking-widest text-gray-400">Seuil atteint → Retrait disponible</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SERVICES ══════════════════════════════════════════════════════════ */}
      <section id="services" className="py-24 bg-gray-50 border-b">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
              Deux façons d'atteindre votre objectif
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Complétez des tâches rémunérées OU effectuez un dépôt Mobile Money — votre choix.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                icon: <Briefcase className="w-8 h-8" />,
                title: "Tâches Rémunérées",
                badge: "+1 000 F / tâche",
                desc: "Partagez YAS Service, répondez à des sondages, rédigez des avis… Chaque tâche validée est créditée instantanément sur votre portefeuille.",
                href: "/inscription",
                cta: "Commencer les tâches",
              },
              {
                icon: <CreditCard className="w-8 h-8" />,
                title: "Dépôt Mobile Money",
                badge: "+5 000 F en une opération",
                desc: depositPhone
                  ? `Envoyez 5 000 FCFA via Mobile Money au ${depositPhone}. Les 5 000 FCFA versés sont directement ajoutés à votre portefeuille après confirmation par notre équipe.`
                  : "Envoyez 5 000 FCFA via Mobile Money au numéro indiqué dans votre espace. Les fonds sont ajoutés à votre portefeuille après confirmation.",
                href: "/inscription",
                cta: "Effectuer un dépôt",
              },
            ].map((s) => (
              <div key={s.title} className="border-2 border-gray-200 hover:border-primary/40 transition-colors p-8 bg-white group">
                <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-foreground transition-colors">
                  {s.icon}
                </div>
                <div className="inline-block bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest px-3 py-1 mb-4">
                  {s.badge}
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{s.desc}</p>
                <Link href={s.href}>
                  <Button variant="outline" className="font-bold uppercase tracking-widest border-foreground text-foreground hover:bg-foreground hover:text-white">
                    {s.cta} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DÉPÔT — BANNIÈRE ══════════════════════════════════════════════════ */}
      <section className="py-16 bg-primary border-b-4 border-foreground">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <CreditCard className="w-10 h-10 text-foreground mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-4">
            Effectuez un dépôt de 5 000 FCFA
          </h2>
          <p className="text-foreground/80 max-w-2xl mx-auto leading-relaxed mb-6 text-lg">
            Envoyez <strong>5 000 FCFA</strong> via Mobile Money sur le numéro{" "}
            <strong className="text-foreground text-xl">
              {depositPhone ?? "………………………"}
            </strong>{" "}
            pour enclencher le dépôt.{" "}
            <strong>Les 5 000 FCFA versés seront directement ajoutés à votre portefeuille</strong> et
            vous rapprochent du seuil de retrait de 10 000 F.
          </p>
          <Link href="/inscription">
            <Button
              size="lg"
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-primary h-14 px-10 text-base uppercase tracking-widest font-bold"
            >
              Créer mon compte & déposer
            </Button>
          </Link>
        </div>
      </section>

      {/* ══ ÉTAPES ════════════════════════════════════════════════════════════ */}
      <section id="about" className="py-24 bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Démarrez en 3 étapes simples
              </h2>
            </div>
            <div className="space-y-0 border-2 border-gray-100">
              {[
                {
                  step: "01",
                  title: "Créez votre compte",
                  desc: "Inscription gratuite avec nom, email, téléphone et pays. Votre portefeuille est crédité de 5 000 FCFA immédiatement.",
                },
                {
                  step: "02",
                  title: "Complétez les tâches ou déposez",
                  desc: "Effectuez des tâches simples (+1 000 F chacune) ou déposez 5 000 F via Mobile Money pour booster votre solde.",
                },
                {
                  step: "03",
                  title: "Vérifiez votre identité & retirez",
                  desc: "Complétez la vérification KYC en quelques minutes sur la plateforme, puis déclenchez votre retrait dès 10 000 F.",
                },
              ].map((e, i) => (
                <div key={e.step} className={`flex gap-6 items-start p-8 ${i < 2 ? "border-b border-gray-100" : ""}`}>
                  <div className="w-16 h-16 flex-shrink-0 bg-primary text-foreground flex items-center justify-center font-bold text-xl">
                    {e.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{e.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SÉCURITÉ ══════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-gray-50 border-b">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 tracking-tight">
                Sécurité & Confidentialité absolues
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Chez YAS Service, la protection de vos données est notre priorité. Vos informations
                personnelles sont chiffrées et stockées exclusivement sur nos serveurs.
              </p>
              <div className="space-y-4">
                {[
                  "Chiffrement bout en bout de vos données",
                  "Vérification KYC interne — aucune API externe",
                  "Authentification sécurisée par token JWT",
                  "Données stockées exclusivement sur nos serveurs",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-foreground text-white p-12">
              {/* Icône textuelle support */}
              <div className="w-16 h-16 bg-primary flex items-center justify-center mb-6">
                <Globe2 className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Support dédié 24h/24</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Notre équipe est disponible pour répondre à toutes vos questions : compte, tâches, dépôts, retraits.
              </p>
              <a href="mailto:mixyastg@gmail.com">
                <Button className="w-full bg-primary text-foreground hover:bg-primary/90 uppercase tracking-widest font-bold h-12">
                  mixyastg@gmail.com
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-primary border-b-4 border-foreground/20">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-foreground/10 text-foreground text-xs font-bold uppercase tracking-widest px-4 py-2 mb-8">
            <CheckCircle2 className="w-3 h-3" /> Inscription 100% gratuite
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Prêt à rejoindre YAS Service ?
          </h2>
          <p className="text-foreground/70 mb-10 max-w-xl mx-auto text-lg">
            Créez votre compte gratuitement et recevez 5 000 FCFA immédiatement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/inscription" className="inline-block">
              <Button
                size="lg"
                variant="outline"
                className="border-foreground text-foreground hover:bg-foreground hover:text-primary h-14 px-10 text-base uppercase tracking-widest font-bold"
              >
                Créer mon compte — C'est gratuit
              </Button>
            </Link>
            <Link href="/connexion" className="inline-block">
              <Button
                size="lg"
                className="bg-foreground text-primary hover:bg-foreground/90 h-14 px-10 text-base uppercase tracking-widest font-bold"
              >
                <Lock className="w-4 h-4 mr-2" /> Espace Client
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="bg-foreground text-white py-10 border-t-4 border-primary">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <span className="text-foreground font-black text-sm tracking-tighter">YAS</span>
              </div>
              <div>
                <div className="font-bold uppercase tracking-widest text-primary text-sm">YAS Service</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Plateforme Officielle</div>
              </div>
            </div>
            <div className="text-sm text-gray-400 text-center">
              © {new Date().getFullYear()} YAS Service. Tous droits réservés.
            </div>
            <a href="mailto:mixyastg@gmail.com" className="text-sm text-gray-400 hover:text-primary transition-colors">
              mixyastg@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </PageWrapper>
  );
}
