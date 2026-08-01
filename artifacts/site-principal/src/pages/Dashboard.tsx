import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useGetCurrentUser, useGetUserWallet, useLogoutUser } from "@workspace/api-client-react";
import {
  LogOut, User as UserIcon, Wallet as WalletIcon, Shield,
  ArrowDownRight, Briefcase, CheckCircle2, AlertCircle, Clock, Mail, CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type KycStatus = "non_soumis" | "en_attente" | "approuve" | "rejete";
interface KycStatusResponse {
  status: KycStatus;
  kyc: null | { id: number; fullName: string; status: string; createdAt: string };
}

export default function Dashboard() {
  const [_location, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading, error: userError } = useGetCurrentUser();
  const { data: wallet, isLoading: isWalletLoading, refetch: refetchWallet } = useGetUserWallet();
  const logoutUser = useLogoutUser();

  const [retraitOpen, setRetraitOpen] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [depositPhone, setDepositPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) setLocation("/connexion");
    // Charger le numéro de dépôt admin
    apiFetch<{ phoneNumber: string | null }>("/deposit/info")
      .then(r => setDepositPhone(r.phoneNumber))
      .catch(() => {});
  }, [setLocation]);

  useEffect(() => {
    if (userError) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentUser");
      setLocation("/connexion");
    }
  }, [userError, setLocation]);

  const handleLogout = () => {
    logoutUser.mutate(undefined, {
      onSettled: () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("currentUser");
        setLocation("/");
      },
    });
  };

  const handleRetraitClick = async () => {
    setRetraitOpen(true);
    setKycLoading(true);
    try {
      const res = await apiFetch<KycStatusResponse>("/kyc/status");
      setKycStatus(res.status);
    } catch {
      setKycStatus("non_soumis");
    } finally {
      setKycLoading(false);
    }
  };

  const balance = wallet ? parseFloat(String(wallet.balance)) : 0;
  const canWithdraw = kycStatus === "approuve" && balance >= 10000;

  if (isUserLoading || isWalletLoading) {
    return (
      <PageWrapper title="Chargement...">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-primary font-bold text-sm uppercase tracking-widest animate-pulse">
              Chargement sécurisé...
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!user || !wallet) return null;

  return (
    <PageWrapper title="Mon Espace">

      {/* ── En-tête ── */}
      <div className="bg-foreground text-white py-12 border-b-4 border-primary">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              {/* Logo textuel */}
              <div className="w-14 h-14 bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-foreground font-black text-xl tracking-tighter">YAS</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Bonjour, {user.firstName} {user.lastName} 👋
                </h1>
                <p className="text-gray-400 text-sm tracking-wider uppercase mt-0.5">
                  Compte YAS Service • N° {user.id.toString().padStart(6, "0")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-white text-white hover:bg-white hover:text-foreground font-bold uppercase tracking-widest text-xs h-10 flex-shrink-0"
              disabled={logoutUser.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutUser.isPending ? "Déconnexion..." : "Déconnexion"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Colonne principale ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Portefeuille */}
            <Card className="border-2 border-primary/30 shadow-lg overflow-hidden">
              <div className="bg-foreground px-6 py-4 flex items-center justify-between border-b-4 border-primary">
                <div className="flex items-center gap-3 text-primary">
                  <WalletIcon className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-widest text-sm">Solde Disponible</span>
                </div>
                <Shield className="w-5 h-5 text-gray-500" />
              </div>
              <CardContent className="p-10 bg-white">
                <div className="text-6xl md:text-7xl font-bold text-foreground tracking-tight mb-2">
                  {formatCurrency(balance)}
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Seuil de retrait :{" "}
                  <span className="font-bold text-foreground">10 000 FCFA</span>
                  {balance >= 10000
                    ? <span className="ml-2 text-green-600 font-bold">✓ Atteint — retrait disponible !</span>
                    : <span className="ml-2 text-amber-600">— Il vous manque {formatCurrency(10000 - balance)}</span>}
                </p>

                {/* Barre de progression vers 10 000 F */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Progression</span>
                    <span className="font-bold text-primary">{Math.min(Math.round((balance / 10000) * 100), 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="h-3 bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((balance / 10000) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>0 F</span>
                    <span>10 000 F</span>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <Link href="/taches" className="flex-1">
                    <Button className="w-full h-14 font-bold uppercase tracking-widest">
                      <Briefcase className="mr-2 w-5 h-5" /> Tâches +1 000 F
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="flex-1 h-14 font-bold uppercase tracking-widest border-2"
                    onClick={handleRetraitClick}
                  >
                    <ArrowDownRight className="mr-2 w-5 h-5" /> Retrait
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bannière dépôt */}
            <div className="bg-primary/5 border-2 border-primary/20 p-6 rounded-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold uppercase tracking-widest text-sm mb-2 text-foreground">
                    Dépôt Mobile Money — Boostez votre solde
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Vous pouvez effectuer un dépôt de <strong className="text-foreground">5 000 FCFA</strong>{" "}
                    sur le numéro{" "}
                    <strong className="text-foreground text-base">
                      {depositPhone ?? "………………………"}
                    </strong>{" "}
                    pour enclencher le dépôt.{" "}
                    <strong className="text-foreground">
                      Les 5 000 FCFA versés seront directement ajoutés à votre portefeuille
                    </strong>{" "}
                    — votre nouveau solde sera de{" "}
                    <strong className="text-primary">{formatCurrency(balance + 5000)}</strong> après confirmation.
                  </p>
                  <Link href="/depot" className="inline-block mt-3">
                    <Button size="sm" className="font-bold uppercase tracking-widest">
                      <CreditCard className="w-4 h-4 mr-2" /> Effectuer un dépôt
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/taches">
                <Card className="cursor-pointer hover:border-primary/50 transition-all border-2 hover:shadow-md">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold uppercase tracking-widest text-sm">Tâches Rémunérées</div>
                      <div className="text-muted-foreground text-xs mt-0.5">+1 000 F par tâche validée</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/depot">
                <Card className="cursor-pointer hover:border-primary/50 transition-all border-2 hover:shadow-md">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold uppercase tracking-widest text-sm">Dépôt</div>
                      <div className="text-muted-foreground text-xs mt-0.5">+5 000 F Mobile Money</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* ── Colonne latérale ── */}
          <div className="space-y-6">

            {/* Profil */}
            <Card className="border-2">
              <CardHeader className="border-b bg-gray-50">
                <CardTitle className="uppercase tracking-widest text-sm flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-primary" /> Mon Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {[
                  { label: "Nom Complet", value: `${user.firstName} ${user.lastName}` },
                  { label: "Email", value: user.email },
                  { label: "Téléphone", value: `${user.countryCode} ${user.phone}` },
                  { label: "Pays", value: user.country },
                  { label: "Membre depuis", value: new Date(user.createdAt).toLocaleDateString("fr-FR") },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="font-bold text-sm">{value}</div>
                  </div>
                ))}
                <div className="pt-2 space-y-2">
                  <Link href="/kyc">
                    <Button variant="outline" className="w-full text-xs uppercase tracking-widest font-bold border-2">
                      <Shield className="w-3 h-3 mr-2" /> Vérification KYC
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="bg-foreground text-white border-0">
              <CardContent className="p-6">
                <div className="w-10 h-10 bg-primary flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-foreground" />
                </div>
                <h4 className="font-bold uppercase tracking-widest text-primary mb-2 text-sm">Support Client</h4>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  Une question sur votre compte, vos tâches ou vos retraits ?
                </p>
                <a href="mailto:mixyastg@gmail.com">
                  <Button className="w-full bg-primary text-foreground hover:bg-primary/90 uppercase tracking-widest font-bold text-xs h-10">
                    mixyastg@gmail.com
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* ══ Dialog Retrait ═══════════════════════════════════════════════════════ */}
      <Dialog open={retraitOpen} onOpenChange={setRetraitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-primary" /> Demande de Retrait
            </DialogTitle>
            <DialogDescription>
              Vérification de vos conditions de retrait
            </DialogDescription>
          </DialogHeader>

          {kycLoading ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">Vérification...</div>
            </div>
          ) : (
            <div className="space-y-4 py-2">

              {/* Message seuil (toujours visible) */}
              <div className="bg-foreground text-white p-5 rounded-sm border-4 border-primary/30">
                <p className="text-base font-bold text-primary text-center uppercase tracking-wide mb-1">
                  Seuil minimum de retrait : 10 000 F
                </p>
                <p className="text-xs text-gray-400 text-center">
                  Solde actuel : <strong className="text-white">{formatCurrency(balance)}</strong>
                  {balance < 10000 && (
                    <> — il manque <strong className="text-primary">{formatCurrency(10000 - balance)}</strong></>
                  )}
                </p>
                {/* Barre progression */}
                <div className="mt-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min((balance / 10000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Statut KYC */}
              {kycStatus === "non_soumis" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Complétez votre vérification d'identité (KYC) avant de pouvoir retirer.
                    </p>
                  </div>
                  <Link href="/kyc">
                    <Button className="w-full font-bold uppercase tracking-widest" onClick={() => setRetraitOpen(false)}>
                      <Shield className="w-4 h-4 mr-2" /> Compléter mon KYC
                    </Button>
                  </Link>
                </div>
              )}

              {kycStatus === "en_attente" && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    KYC en cours de vérification. Vous recevrez une confirmation sous 24–48h.
                  </p>
                </div>
              )}

              {kycStatus === "rejete" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-sm">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">KYC rejeté. Veuillez soumettre à nouveau.</p>
                  </div>
                  <Link href="/kyc">
                    <Button variant="outline" className="w-full font-bold uppercase tracking-widest" onClick={() => setRetraitOpen(false)}>
                      Resoumettre mon KYC
                    </Button>
                  </Link>
                </div>
              )}

              {kycStatus === "approuve" && !canWithdraw && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">
                      KYC approuvé ✓ — Manque encore{" "}
                      <strong>{formatCurrency(10000 - balance)}</strong> pour atteindre le seuil.
                    </p>
                  </div>

                  {/* Bannière dépôt dans le dialog */}
                  <div className="bg-primary/5 border-2 border-primary/20 p-4 rounded-sm">
                    <p className="text-sm font-bold text-foreground mb-2 uppercase tracking-widest text-xs">
                      Accélérez avec un dépôt
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      Déposez <strong>5 000 FCFA</strong> sur le numéro{" "}
                      <strong className="text-foreground">{depositPhone ?? "………………………"}</strong>.{" "}
                      Les 5 000 FCFA versés seront ajoutés à votre portefeuille.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/taches">
                        <Button className="w-full text-xs font-bold uppercase tracking-widest h-10" onClick={() => setRetraitOpen(false)}>
                          <Briefcase className="w-3 h-3 mr-1" /> Tâches
                        </Button>
                      </Link>
                      <Link href="/depot">
                        <Button variant="outline" className="w-full text-xs font-bold uppercase tracking-widest h-10 border-2" onClick={() => setRetraitOpen(false)}>
                          <CreditCard className="w-3 h-3 mr-1" /> Dépôt
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {canWithdraw && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-sm">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-green-800 mb-1">Retrait disponible !</p>
                      <p className="text-xs text-green-700">
                        KYC validé et solde suffisant. Contactez le support pour traiter votre retrait.
                      </p>
                    </div>
                  </div>
                  <a href="mailto:mixyastg@gmail.com?subject=Demande%20de%20retrait%20-%20YAS%20Service">
                    <Button className="w-full font-bold uppercase tracking-widest h-12">
                      <Mail className="w-4 h-4 mr-2" /> Contacter le support
                    </Button>
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </PageWrapper>
  );
}
