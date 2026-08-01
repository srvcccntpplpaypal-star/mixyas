import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetAdminStats, useGetAdminUsers, useGetAdminVisits } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Users, Activity, Wallet, ShieldAlert, ArrowLeft, Shield, Briefcase,
  CreditCard, Settings, CheckCircle2, XCircle, Clock, Eye, EyeOff,
} from "lucide-react";

type Tab = "stats" | "users" | "kyc" | "tasks" | "completions" | "deposits" | "settings" | "visits";

interface KycEntry {
  id: number; userId: number; userEmail: string; userFirstName: string; userLastName: string;
  fullName: string; birthDate: string; birthPlace: string; nationality: string;
  documentType: string; documentNumber: string;
  documentFrontDesc: string; documentBackDesc: string; documentFrontUrl: string; documentBackUrl: string;
  selfieDesc: string; selfieUrl: string; address: string; addressProofDesc: string;
  status: string; adminNote: string | null; createdAt: string;
}

interface TaskEntry {
  id: number; title: string; description: string; category: string;
  instructions: string; reward: number; isActive: boolean; createdAt: string;
}

interface CompletionEntry {
  id: number; userId: number; userEmail: string; userFirstName: string; userLastName: string;
  taskId: number; taskTitle: string; reward: number;
  proofText: string; status: string; rewardPaid: boolean; createdAt: string;
}

interface DepositEntry {
  id: number; userId: number; userEmail: string; userFirstName: string; userLastName: string;
  amount: number; referenceCode: string; status: string; adminNote: string | null; createdAt: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    en_attente: "bg-blue-100 text-blue-700 border border-blue-200",
    approuve: "bg-green-100 text-green-700 border border-green-200",
    confirme: "bg-green-100 text-green-700 border border-green-200",
    rejete: "bg-red-100 text-red-700 border border-red-200",
  };
  const labels: Record<string, string> = {
    en_attente: "En attente", approuve: "Approuvé", confirme: "Confirmé", rejete: "Rejeté",
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {labels[status] ?? status}
    </span>
  );
};

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "stats", label: "Statistiques", icon: <Activity className="w-4 h-4" /> },
  { id: "users", label: "Utilisateurs", icon: <Users className="w-4 h-4" /> },
  { id: "kyc", label: "KYC", icon: <Shield className="w-4 h-4" /> },
  { id: "completions", label: "Tâches", icon: <Briefcase className="w-4 h-4" /> },
  { id: "deposits", label: "Dépôts", icon: <CreditCard className="w-4 h-4" /> },
  { id: "settings", label: "Paramètres", icon: <Settings className="w-4 h-4" /> },
  { id: "visits", label: "Visites", icon: <Activity className="w-4 h-4" /> },
];

export default function Admin() {
  const [_location, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("stats");

  // Existing
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: users, isLoading: usersLoading } = useGetAdminUsers();
  const { data: visits, isLoading: visitsLoading } = useGetAdminVisits();

  // New data
  const [kycList, setKycList] = useState<KycEntry[]>([]);
  const [taskList, setTaskList] = useState<TaskEntry[]>([]);
  const [completionList, setCompletionList] = useState<CompletionEntry[]>([]);
  const [depositList, setDepositList] = useState<DepositEntry[]>([]);

  // Settings
  const [settingsPwd, setSettingsPwd] = useState("");
  const [settingsPwdVerified, setSettingsPwdVerified] = useState(false);
  const [depositPhone, setDepositPhone] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Detail view
  const [kycDetail, setKycDetail] = useState<KycEntry | null>(null);
  const [completionDetail, setCompletionDetail] = useState<CompletionEntry | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) setLocation("/connexion");
  }, [setLocation]);

  useEffect(() => {
    if (tab === "kyc" && kycList.length === 0) loadKyc();
    if ((tab === "completions") && completionList.length === 0) loadCompletions();
    if (tab === "deposits" && depositList.length === 0) loadDeposits();
  }, [tab]);

  const loadKyc = () => apiFetch<KycEntry[]>("/admin/kyc").then(setKycList).catch(() => {});
  const loadCompletions = () => apiFetch<CompletionEntry[]>("/admin/task-completions").then(setCompletionList).catch(() => {});
  const loadDeposits = () => apiFetch<DepositEntry[]>("/admin/deposits").then(setDepositList).catch(() => {});

  const kycDecision = async (id: number, action: "approuve" | "rejete", note?: string) => {
    await apiFetch(`/admin/kyc/${id}/decision`, { method: "POST", body: JSON.stringify({ action, adminNote: note }) });
    await loadKyc();
    setKycDetail(null);
  };

  const completionDecision = async (id: number, action: "approuve" | "rejete") => {
    await apiFetch(`/admin/task-completions/${id}/decision`, { method: "POST", body: JSON.stringify({ action }) });
    await loadCompletions();
    setCompletionDetail(null);
  };

  const depositDecision = async (id: number, action: "confirme" | "rejete") => {
    await apiFetch(`/admin/deposits/${id}/decision`, { method: "POST", body: JSON.stringify({ action }) });
    await loadDeposits();
  };

  const verifySettingsPwd = async () => {
    setSettingsError("");
    try {
      const res = await apiFetch<{ settings: Record<string, string>; authenticated: boolean }>("/admin/settings", {
        headers: { "x-settings-password": settingsPwd },
      });
      if (res.authenticated) {
        setSettingsPwdVerified(true);
        setDepositPhone(res.settings["deposit_phone_number"] && res.settings["deposit_phone_number"] !== "***masqué***" ? res.settings["deposit_phone_number"] : "");
      } else {
        setSettingsError("Mot de passe incorrect.");
      }
    } catch { setSettingsError("Erreur d'authentification."); }
  };

  const saveDepositPhone = async () => {
    setSettingsMsg(""); setSettingsError("");
    try {
      await apiFetch("/admin/settings", {
        method: "POST",
        body: JSON.stringify({ key: "deposit_phone_number", value: depositPhone, adminPassword: settingsPwd }),
      });
      setSettingsMsg("Numéro de dépôt mis à jour avec succès !");
    } catch (e) { setSettingsError(e instanceof Error ? e.message : "Erreur."); }
  };

  if (statsLoading || usersLoading || visitsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-primary font-bold text-xl uppercase tracking-widest animate-pulse">Accès Restreint...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-foreground text-white border-b-4 border-destructive sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            <span className="font-bold tracking-widest uppercase text-sm">Console PDG — YAS Service</span>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => setLocation("/")}
            className="border-white/20 text-white hover:bg-white hover:text-foreground text-xs uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Site
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">

        {/* ── STATS ──────────────────────────────────────────────── */}
        {tab === "stats" && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Utilisateurs", value: stats.totalUsers, sub: `+${stats.usersToday} aujourd'hui`, icon: <Users className="w-5 h-5" />, color: "bg-blue-100 text-blue-600" },
              { label: "Visites", value: stats.totalVisits, sub: `+${stats.visitsToday} aujourd'hui`, icon: <Activity className="w-5 h-5" />, color: "bg-purple-100 text-purple-600" },
              { label: "Fonds Totaux", value: formatCurrency(stats.totalWalletBalance), sub: "En gestion", icon: <Wallet className="w-5 h-5" />, color: "bg-yellow-100 text-yellow-600" },
              { label: "KYC soumis", value: ((stats as unknown) as { totalKyc?: number }).totalKyc ?? "—", sub: "Vérifications identité", icon: <Shield className="w-5 h-5" />, color: "bg-green-100 text-green-600" },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-11 h-11 ${s.color} rounded-sm flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{s.label}</p>
                    <h3 className="text-2xl font-bold">{s.value}</h3>
                    <p className="text-xs text-green-600 font-medium">{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── UTILISATEURS ──────────────────────────────────────── */}
        {tab === "users" && users && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b px-5 py-4"><CardTitle className="text-sm uppercase tracking-widest">Inscriptions</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    {["ID", "Client", "Contact", "Pays", "Solde", "Date"].map(h => (
                      <TableHead key={h} className="text-xs font-bold uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {users.map(u => (
                    <TableRow key={u.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">{u.id}</TableCell>
                      <TableCell><div className="font-bold text-sm">{u.firstName} {u.lastName}</div><div className="text-xs text-muted-foreground">{u.email}</div></TableCell>
                      <TableCell className="text-sm">{u.countryCode} {u.phone}</TableCell>
                      <TableCell className="text-sm">{u.country}</TableCell>
                      <TableCell className="font-bold text-green-700">{formatCurrency(u.walletBalance)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ── KYC ───────────────────────────────────────────────── */}
        {tab === "kyc" && (
          <>
            {kycDetail ? (
              <div className="space-y-4">
                <Button variant="outline" className="text-xs uppercase tracking-widest font-bold" onClick={() => setKycDetail(null)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
                </Button>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="border-b bg-gray-50 px-5 py-4">
                    <CardTitle className="text-sm uppercase tracking-widest flex items-center justify-between">
                      <span>Dossier KYC — {kycDetail.fullName}</span>
                      <StatusBadge status={kycDetail.status} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      ["Utilisateur", `${kycDetail.userFirstName} ${kycDetail.userLastName} (${kycDetail.userEmail})`],
                      ["Nom complet (KYC)", kycDetail.fullName],
                      ["Date de naissance", kycDetail.birthDate],
                      ["Lieu de naissance", kycDetail.birthPlace],
                      ["Nationalité", kycDetail.nationality],
                      ["Type document", kycDetail.documentType],
                      ["Numéro document", kycDetail.documentNumber],
                      ["Soumis le", new Date(kycDetail.createdAt).toLocaleString("fr-FR")],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</div>
                        <div className="font-medium text-sm">{value}</div>
                      </div>
                    ))}
                    <div className="md:col-span-2 space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Recto document</div>
                      <img src={kycDetail.documentFrontUrl} alt="Recto document" className="max-h-60 w-full object-contain rounded border" />
                      <div className="bg-gray-50 border rounded-sm p-3 text-sm">{kycDetail.documentFrontDesc}</div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Verso document</div>
                      <img src={kycDetail.documentBackUrl} alt="Verso document" className="max-h-60 w-full object-contain rounded border" />
                      <div className="bg-gray-50 border rounded-sm p-3 text-sm">{kycDetail.documentBackDesc}</div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Selfie</div>
                      <img src={kycDetail.selfieUrl} alt="Selfie avec document" className="max-h-60 w-full object-contain rounded border" />
                      <div className="bg-gray-50 border rounded-sm p-3 text-sm">{kycDetail.selfieDesc}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Adresse</div>
                      <div className="font-medium text-sm">{kycDetail.address}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Justificatif domicile</div>
                      <div className="bg-gray-50 border rounded-sm p-3 text-sm">{kycDetail.addressProofDesc}</div>
                    </div>
                    {kycDetail.status === "en_attente" && (
                      <div className="md:col-span-2 flex gap-4 pt-2">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700 font-bold uppercase tracking-widest" onClick={() => kycDecision(kycDetail.id, "approuve")}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver
                        </Button>
                        <Button variant="destructive" className="flex-1 font-bold uppercase tracking-widest" onClick={() => kycDecision(kycDetail.id, "rejete", "Informations insuffisantes.")}>
                          <XCircle className="w-4 h-4 mr-2" /> Rejeter
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b px-5 py-4"><CardTitle className="text-sm uppercase tracking-widest">Dossiers KYC ({kycList.length})</CardTitle></CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        {["ID", "Utilisateur", "Nom KYC", "Document", "Statut", "Date", "Action"].map(h => (
                          <TableHead key={h} className="text-xs font-bold uppercase tracking-wider">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white">
                      {kycList.map(k => (
                        <TableRow key={k.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-xs">{k.id}</TableCell>
                          <TableCell><div className="font-bold text-sm">{k.userFirstName} {k.userLastName}</div><div className="text-xs text-muted-foreground">{k.userEmail}</div></TableCell>
                          <TableCell className="text-sm font-medium">{k.fullName}</TableCell>
                          <TableCell className="text-xs">{k.documentType}</TableCell>
                          <TableCell><StatusBadge status={k.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(k.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="text-xs font-bold uppercase tracking-widest" onClick={() => setKycDetail(k)}>
                              <Eye className="w-3 h-3 mr-1" /> Voir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {kycList.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Aucun dossier KYC pour le moment.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── RÉALISATIONS DE TÂCHES ────────────────────────────── */}
        {tab === "completions" && (
          <>
            {completionDetail ? (
              <div className="space-y-4">
                <Button variant="outline" className="text-xs uppercase tracking-widest font-bold" onClick={() => setCompletionDetail(null)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="border-b bg-gray-50 px-5 py-4">
                    <CardTitle className="text-sm uppercase tracking-widest flex items-center justify-between">
                      <span>Réalisation — {completionDetail.taskTitle}</span>
                      <StatusBadge status={completionDetail.status} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Utilisateur</div><div className="font-bold">{completionDetail.userFirstName} {completionDetail.userLastName}</div><div className="text-xs text-muted-foreground">{completionDetail.userEmail}</div></div>
                      <div><div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Récompense</div><div className="font-bold text-primary">{formatCurrency(completionDetail.reward)}</div><div className="text-xs text-muted-foreground">{completionDetail.rewardPaid ? "✓ Payée" : "Non payée"}</div></div>
                    </div>
                    <div><div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Preuve soumise</div><div className="bg-gray-50 border rounded-sm p-4 text-sm leading-relaxed whitespace-pre-wrap">{completionDetail.proofText}</div></div>
                    {completionDetail.status === "en_attente" && (
                      <div className="flex gap-4">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700 font-bold uppercase tracking-widest" onClick={() => completionDecision(completionDetail.id, "approuve")}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver & Créditer {formatCurrency(completionDetail.reward)}
                        </Button>
                        <Button variant="destructive" className="flex-1 font-bold uppercase tracking-widest" onClick={() => completionDecision(completionDetail.id, "rejete")}>
                          <XCircle className="w-4 h-4 mr-2" /> Rejeter
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b px-5 py-4"><CardTitle className="text-sm uppercase tracking-widest">Réalisations de Tâches ({completionList.length})</CardTitle></CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        {["Utilisateur", "Tâche", "Récompense", "Statut", "Payé", "Date", "Action"].map(h => (
                          <TableHead key={h} className="text-xs font-bold uppercase tracking-wider">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white">
                      {completionList.map(c => (
                        <TableRow key={c.id} className="hover:bg-gray-50">
                          <TableCell><div className="font-bold text-sm">{c.userFirstName} {c.userLastName}</div><div className="text-xs text-muted-foreground">{c.userEmail}</div></TableCell>
                          <TableCell className="text-sm font-medium max-w-[180px] truncate">{c.taskTitle}</TableCell>
                          <TableCell className="font-bold text-primary">{formatCurrency(c.reward)}</TableCell>
                          <TableCell><StatusBadge status={c.status} /></TableCell>
                          <TableCell>{c.rewardPaid ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-muted-foreground" />}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="text-xs font-bold uppercase tracking-widest" onClick={() => setCompletionDetail(c)}>
                              <Eye className="w-3 h-3 mr-1" /> Voir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {completionList.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Aucune réalisation soumise.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── DÉPÔTS ────────────────────────────────────────────── */}
        {tab === "deposits" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b px-5 py-4"><CardTitle className="text-sm uppercase tracking-widest">Dépôts ({depositList.length})</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    {["Utilisateur", "Montant", "Référence", "Statut", "Date", "Actions"].map(h => (
                      <TableHead key={h} className="text-xs font-bold uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {depositList.map(d => (
                    <TableRow key={d.id} className="hover:bg-gray-50">
                      <TableCell><div className="font-bold text-sm">{d.userFirstName} {d.userLastName}</div><div className="text-xs text-muted-foreground">{d.userEmail}</div></TableCell>
                      <TableCell className="font-bold">{formatCurrency(d.amount)}</TableCell>
                      <TableCell className="font-mono text-xs">{d.referenceCode}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        {d.status === "en_attente" && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold" onClick={() => depositDecision(d.id, "confirme")}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmer
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs font-bold" onClick={() => depositDecision(d.id, "rejete")}>
                              <XCircle className="w-3 h-3 mr-1" /> Rejeter
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {depositList.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Aucun dépôt soumis.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ── PARAMÈTRES ────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="max-w-md space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gray-50 px-5 py-4">
                <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" /> Numéro de dépôt Mobile Money
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {!settingsPwdVerified ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Ces paramètres sont protégés. Saisissez le mot de passe administrateur pour les modifier.
                    </p>
                    <div className="space-y-2">
                      <Label>Mot de passe administrateur</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showPwd ? "text" : "password"}
                          placeholder="••••••"
                          value={settingsPwd}
                          onChange={e => setSettingsPwd(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && verifySettingsPwd()}
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowPwd(v => !v)}>
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    {settingsError && <p className="text-sm text-red-600">{settingsError}</p>}
                    <Button className="w-full font-bold uppercase tracking-widest" onClick={verifySettingsPwd}>
                      Vérifier le mot de passe
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-sm font-bold uppercase tracking-widest">
                      <CheckCircle2 className="w-4 h-4" /> Authentifié
                    </div>
                    <div className="space-y-2">
                      <Label>Numéro Mobile Money pour les dépôts</Label>
                      <Input
                        placeholder="Ex : +225 07 XX XX XX XX"
                        value={depositPhone}
                        onChange={e => setDepositPhone(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Ce numéro sera affiché aux utilisateurs lors d'un dépôt.</p>
                    </div>
                    {settingsError && <p className="text-sm text-red-600">{settingsError}</p>}
                    {settingsMsg && <p className="text-sm text-green-600 font-bold">{settingsMsg}</p>}
                    <Button
                      className="w-full font-bold uppercase tracking-widest"
                      onClick={saveDepositPhone}
                      disabled={!depositPhone.trim()}
                    >
                      Enregistrer le numéro
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── VISITES ───────────────────────────────────────────── */}
        {tab === "visits" && visits && (
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="border-b px-5 py-4"><CardTitle className="text-sm uppercase tracking-widest">Journal d'Activité</CardTitle></CardHeader>
            <div className="overflow-x-auto max-h-[600px]">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
                  <TableRow>
                    {["Date", "IP", "Page", "Utilisateur", "Navigateur"].map(h => (
                      <TableHead key={h} className="text-xs font-bold uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {visits.map(v => (
                    <TableRow key={v.id} className="hover:bg-gray-50 text-xs">
                      <TableCell className="whitespace-nowrap">{new Date(v.createdAt).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="font-mono">{v.ip || "Inconnue"}</TableCell>
                      <TableCell className="font-medium text-primary">{v.page}</TableCell>
                      <TableCell>{v.userId ? `ID: ${v.userId}` : "Anonyme"}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground" title={v.userAgent}>{v.userAgent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

      </main>
    </div>
  );
}
