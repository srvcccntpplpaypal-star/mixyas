/**
 * Tableau de bord d'un affilié.
 * Accessible à : /tableau-affilier/:code
 * Visible par l'affilié lui-même (pas de mot de passe, le code est secret).
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import {
  Users, MousePointerClick, CreditCard, TrendingUp, Calendar,
  Copy, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardData {
  affiliate: { name: string; phone: string; code: string; createdAt: string };
  stats: {
    totalClicks: number;
    recentClicks: number;
    totalUsers: number;
    totalPayments: number;
  };
  users: Array<{ id: number; name: string; joinedAt: string }>;
}

export default function TableauAffilier() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin + import.meta.env.BASE_URL?.replace(/\/$/, ""));
    if (!code) { setError("Code invalide."); setLoading(false); return; }
    apiFetch<DashboardData>(`/affiliates/dashboard/${code.toUpperCase()}`)
      .then(d => setData(d))
      .catch(() => setError("Code affilié introuvable ou désactivé."))
      .finally(() => setLoading(false));
  }, [code]);

  const link = data ? `${baseUrl}/ref/${data.affiliate.code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#123274]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-[#FFD700] font-bold uppercase tracking-widest text-sm animate-pulse">Chargement...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#123274] px-4">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✗</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 uppercase tracking-widest">Accès refusé</h1>
          <p className="text-white/60">{error || "Lien invalide."}</p>
        </div>
      </div>
    );
  }

  const convRate = data.stats.totalClicks > 0
    ? ((data.stats.totalUsers / data.stats.totalClicks) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#123274] text-white py-12 border-b-4 border-[#FFD700]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-[#FFD700] rounded-full flex items-center justify-center">
              <img src="/images/yas-logo.svg" alt="YAS" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <div className="text-[10px] text-[#FFD700] uppercase tracking-[0.3em]">Espace Affilié</div>
              <h1 className="text-2xl font-black uppercase tracking-widest">YAS Service</h1>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-white/60 text-xs uppercase tracking-widest mb-1">Bonjour,</div>
              <div className="text-3xl font-bold">{data.affiliate.name}</div>
              <div className="text-white/60 text-sm mt-1">
                Code : <span className="text-[#FFD700] font-mono font-bold">{data.affiliate.code}</span>
                {" · "}Affilié depuis {new Date(data.affiliate.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-10">

        {/* Lien de parrainage */}
        <div className="bg-[#123274] text-white rounded-sm p-6 mb-8 border-4 border-[#FFD700]/30">
          <div className="text-xs text-[#FFD700] uppercase tracking-widest font-bold mb-2">Votre lien de parrainage</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 font-mono text-sm bg-white/10 px-4 py-3 rounded-sm truncate">
              {link}
            </div>
            <Button
              onClick={copyLink}
              className="bg-[#FFD700] text-[#123274] hover:bg-[#FFD700]/90 font-bold uppercase tracking-widest flex-shrink-0"
            >
              {copied ? <><Check className="w-4 h-4 mr-2" /> Copié !</> : <><Copy className="w-4 h-4 mr-2" /> Copier</>}
            </Button>
          </div>
          <p className="text-xs text-white/50 mt-3">
            Partagez ce lien sur WhatsApp, Facebook, Instagram, TikTok… chaque personne qui s'inscrit via ce lien est comptabilisée.
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          {[
            {
              icon: <MousePointerClick className="w-6 h-6" />,
              label: "Clics totaux",
              value: data.stats.totalClicks.toLocaleString(),
              sub: `${data.stats.recentClicks} ces 7 derniers jours`,
              color: "text-blue-600 bg-blue-50",
            },
            {
              icon: <Users className="w-6 h-6" />,
              label: "Inscrits via lien",
              value: data.stats.totalUsers.toLocaleString(),
              sub: `${convRate}% de taux de conversion`,
              color: "text-green-600 bg-green-50",
            },
            {
              icon: <CreditCard className="w-6 h-6" />,
              label: "Paiements effectués",
              value: data.stats.totalPayments.toLocaleString(),
              sub: "Dépôts confirmés",
              color: "text-[#123274] bg-blue-50",
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              label: "Taux conversion",
              value: `${convRate}%`,
              sub: "Clics → Inscriptions",
              color: "text-[#FFD700] bg-yellow-50",
            },
          ].map(s => (
            <Card key={s.label} className="border-2">
              <CardContent className="p-5">
                <div className={`w-10 h-10 ${s.color} rounded-sm flex items-center justify-center mb-3`}>
                  {s.icon}
                </div>
                <div className="text-3xl font-bold text-foreground mb-0.5">{s.value}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Liste des utilisateurs inscrits */}
        <Card className="border-2">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-sm">
              <Users className="w-4 h-4 text-[#123274]" />
              Utilisateurs inscrits via votre lien ({data.users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun utilisateur inscrit via votre lien pour l'instant.</p>
                <p className="text-xs mt-1">Partagez votre lien pour commencer à recruter !</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.users.map((u, i) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#123274] text-[#FFD700] rounded-full flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(u.joinedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-sm">
                      ● Inscrit
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips de partage */}
        <div className="mt-8 bg-[#123274] text-white p-8 rounded-sm">
          <h3 className="font-bold text-[#FFD700] uppercase tracking-widest text-sm mb-4">💡 Conseils pour maximiser vos conversions</h3>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2"><span className="text-[#FFD700] font-bold flex-shrink-0">→</span> Partagez votre lien dans vos groupes WhatsApp avec un message personnalisé</li>
            <li className="flex items-start gap-2"><span className="text-[#FFD700] font-bold flex-shrink-0">→</span> Créez une courte vidéo sur TikTok ou Facebook montrant les gains possibles</li>
            <li className="flex items-start gap-2"><span className="text-[#FFD700] font-bold flex-shrink-0">→</span> Insistez sur le bonus de bienvenue de 5 000 FCFA offert à chaque nouvel inscrit</li>
            <li className="flex items-start gap-2"><span className="text-[#FFD700] font-bold flex-shrink-0">→</span> Publiez régulièrement pour maintenir votre audience engagée</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
