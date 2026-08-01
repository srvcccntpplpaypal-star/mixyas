/**
 * Espace de gestion des affiliés — accessible par 3 clics sur le logo.
 * Protégé par mot de passe PDG (ocl2o).
 */
import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import {
  Users, Plus, Copy, Check, Link as LinkIcon, Phone, User,
  ToggleLeft, ToggleRight, AlertCircle, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = "ocl2o";

interface Affiliate {
  id: number;
  name: string;
  phone: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  totalClicks: number;
  totalUsers: number;
  totalPayments: number;
}

function getAdminHeaders() {
  return { "x-admin-key": "pdg-secret-7clicks" };
}

export default function AffilierAdmin() {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    // Vérifier si déjà authentifié dans cette session
    if (sessionStorage.getItem("affilier_authed") === "1") setAuthed(true);
    setBaseUrl(window.location.origin + import.meta.env.BASE_URL?.replace(/\/$/, ""));
  }, []);

  useEffect(() => {
    if (authed) loadAffiliates();
  }, [authed]);

  const handleAuth = () => {
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem("affilier_authed", "1");
      setPwError("");
    } else {
      setPwError("Mot de passe incorrect.");
    }
  };

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Affiliate[]>("/affiliates", { headers: getAdminHeaders() as any });
      setAffiliates(data);
    } catch { toast({ variant: "destructive", title: "Erreur de chargement" }); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) {
      toast({ variant: "destructive", title: "Nom et téléphone requis." });
      return;
    }
    setCreating(true);
    try {
      const aff = await apiFetch<Affiliate & { link: string }>("/affiliates", {
        method: "POST",
        headers: getAdminHeaders() as any,
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      setAffiliates(prev => [aff, ...prev]);
      setName(""); setPhone("");
      toast({ title: `Affilié créé !`, description: `Code : ${aff.code}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: String(e) });
    } finally { setCreating(false); }
  };

  const handleToggle = async (id: number) => {
    try {
      const res = await apiFetch<{ ok: boolean; isActive: boolean }>(`/affiliates/${id}/toggle`, {
        method: "PATCH",
        headers: getAdminHeaders() as any,
      });
      setAffiliates(prev => prev.map(a => a.id === id ? { ...a, isActive: res.isActive } : a));
    } catch { toast({ variant: "destructive", title: "Erreur lors de la mise à jour" }); }
  };

  const copyLink = (code: string) => {
    const link = `${baseUrl}/ref/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#123274] px-4">
        <div className="w-full max-w-sm bg-white shadow-2xl border-4 border-[#FFD700] p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-4">
              <img src="/images/yas-logo.svg" alt="YAS" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-widest text-[#123274]">Gestion Affiliés</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Espace sécurisé</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="uppercase tracking-wider text-xs font-bold">Mot de passe</Label>
              <Input
                type="password"
                placeholder="••••••"
                className="h-12 mt-1"
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAuth()}
                autoFocus
              />
              {pwError && (
                <div className="flex items-center gap-2 text-red-600 text-xs mt-2">
                  <AlertCircle className="w-3 h-3" /> {pwError}
                </div>
              )}
            </div>
            <Button className="w-full h-12 bg-[#123274] hover:bg-[#123274]/90 text-white font-bold uppercase tracking-widest" onClick={handleAuth}>
              Accéder
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper title="Gestion Affiliés">
      {/* En-tête */}
      <div className="bg-[#123274] text-white py-10 border-b-4 border-[#FFD700]">
        <div className="container mx-auto px-4 sm:px-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FFD700] rounded-full flex items-center justify-center">
            <img src="/images/yas-logo.svg" alt="YAS" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest">Gestion des Affiliés</h1>
            <p className="text-white/60 text-sm">Créez des liens de parrainage et suivez les conversions</p>
          </div>
          <div className="ml-auto">
            <div className="text-right">
              <div className="text-3xl font-bold text-[#FFD700]">{affiliates.length}</div>
              <div className="text-xs text-white/60 uppercase tracking-widest">Affiliés</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Formulaire création */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-[#123274]/20 sticky top-24">
              <CardHeader className="border-b bg-gray-50">
                <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-sm">
                  <Plus className="w-4 h-4 text-[#123274]" /> Créer un affilié
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="uppercase tracking-wider text-xs font-bold">Nom de l'affilié *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Kofi Mensah"
                      className="h-12 pl-10"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="uppercase tracking-wider text-xs font-bold">Numéro de téléphone *</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="+228 90 00 00 00"
                      className="h-12 pl-10"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full h-12 bg-[#123274] hover:bg-[#123274]/90 text-white font-bold uppercase tracking-widest"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? "Création..." : <><Plus className="w-4 h-4 mr-2" /> Créer l'affilié</>}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Un code unique et un lien de parrainage seront générés automatiquement.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des affiliés */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-4 border-[#123274] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <div className="text-[#123274] font-bold uppercase tracking-widest text-sm animate-pulse">Chargement...</div>
              </div>
            ) : affiliates.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-sm">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun affilié créé. Commencez par créer le premier.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {affiliates.map(aff => {
                  const link = `${baseUrl}/ref/${aff.code}`;
                  return (
                    <Card key={aff.id} className={`border-2 ${aff.isActive ? "border-gray-200" : "border-red-200 opacity-70"}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-[#123274] text-[#FFD700] rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">
                              {aff.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-base">{aff.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {aff.phone}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Depuis : {new Date(aff.createdAt).toLocaleDateString("fr-FR")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-center">
                              <div className="bg-[#FFD700] text-[#123274] font-black text-lg px-3 py-1 rounded-sm tracking-widest">
                                {aff.code}
                              </div>
                              <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Code</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs uppercase tracking-widest font-bold text-muted-foreground">
                          <div className="bg-gray-50 border rounded-sm p-3">
                            <div className="text-[10px]">Clics</div>
                            <div className="text-base text-foreground mt-2">{aff.totalClicks}</div>
                          </div>
                          <div className="bg-gray-50 border rounded-sm p-3">
                            <div className="text-[10px]">Inscrits</div>
                            <div className="text-base text-foreground mt-2">{aff.totalUsers}</div>
                          </div>
                          <div className="bg-gray-50 border rounded-sm p-3">
                            <div className="text-[10px]">Paiements</div>
                            <div className="text-base text-foreground mt-2">{aff.totalPayments}</div>
                          </div>
                        </div>

                        {/* Lien affilié */}
                        <div className="mt-4 bg-gray-50 border rounded-sm p-3 flex items-center gap-3">
                          <LinkIcon className="w-4 h-4 text-[#123274] flex-shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground truncate flex-1">{link}</span>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold uppercase tracking-widest"
                              onClick={() => copyLink(aff.code)}
                            >
                              {copiedCode === aff.code ? <><Check className="w-3 h-3 mr-1" /> Copié</> : <><Copy className="w-3 h-3 mr-1" /> Copier</>}
                            </Button>
                            <a href={`/tableau-affilier/${aff.code}`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="h-8 text-xs font-bold uppercase tracking-widest">
                                <ExternalLink className="w-3 h-3 mr-1" /> Stats
                              </Button>
                            </a>
                          </div>
                        </div>

                        {/* Statut */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className={`text-xs font-bold uppercase tracking-widest ${aff.isActive ? "text-green-600" : "text-red-600"}`}>
                            {aff.isActive ? "● Actif" : "● Désactivé"}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs font-bold uppercase tracking-widest h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleToggle(aff.id)}
                          >
                            {aff.isActive
                              ? <><ToggleRight className="w-4 h-4 mr-1 text-green-600" /> Désactiver</>
                              : <><ToggleLeft className="w-4 h-4 mr-1" /> Activer</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
