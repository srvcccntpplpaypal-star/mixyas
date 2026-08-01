import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import {
  Briefcase, CheckCircle2, Clock, AlertCircle, ChevronRight, Trophy,
  Lock, Zap, CreditCard, ArrowRight, Star, XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskCompletion {
  id: number;
  taskId: number;
  status: "en_attente" | "approuve" | "rejete";
  rewardPaid: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string;
  category: string;
  instructions: string;
  reward: number;
  isActive: boolean;
  taskOrder: number;
  difficulty: "normal" | "timed_impossible" | "impossible";
  timeLimit: number | null;
  challengeCode: string | null;
  userCompletion: TaskCompletion | null;
}

interface TasksResponse {
  tasks: Task[];
  balance: number;
  completedCount: number;
}

// ─── Générateur de code de défi aléatoire ───────────────────────────────────
function generateRandomCode(length = 48): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Composant Minuterie ──────────────────────────────────────────────────────
function CountdownTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [seconds, onExpire]);

  const pct = (remaining / seconds) * 100;
  const urgent = remaining <= 10;

  return (
    <div className={`text-center ${urgent ? "animate-pulse" : ""}`}>
      <div className={`text-4xl font-bold tabular-nums ${urgent ? "text-red-600" : remaining <= 20 ? "text-amber-600" : "text-foreground"}`}>
        {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div
          className={`h-2 rounded-full transition-all ${urgent ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
        {urgent ? "⚠ Temps écoulé bientôt !" : "Temps restant"}
      </p>
    </div>
  );
}

// ─── Page principale Tâches ───────────────────────────────────────────────────
export default function Taches() {
  const [_location, setLocation] = useLocation();
  const [data, setData] = useState<TasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proof, setProof] = useState("");
  const [challengeInput, setChallengeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [showDepositBanner, setShowDepositBanner] = useState(false);
  const [depositPhone, setDepositPhone] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [tab, setTab] = useState<"taches" | "historique">("taches");
  const [completions, setCompletions] = useState<Array<{
    id: number; taskId: number; taskTitle: string; status: string;
    rewardPaid: boolean; reward: number; difficulty: string; createdAt: string;
  }>>([]);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) { setLocation("/connexion"); return; }
    loadAll();
  }, [setLocation]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [res, hist, depInfo] = await Promise.all([
        apiFetch<TasksResponse>("/tasks"),
        apiFetch<typeof completions>("/tasks/my-completions"),
        apiFetch<{ phoneNumber: string | null }>("/deposit/info").catch(() => ({ phoneNumber: null })),
      ]);
      setData(res);
      setCompletions(hist);
      setDepositPhone(depInfo.phoneNumber);
    } catch { /* silently */ }
    finally { setLoading(false); }
  };

  const handleTimerExpire = useCallback(() => {
    setTimedOut(true);
    setShowDepositBanner(true);
  }, []);

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setProof("");
    setChallengeInput("");
    setError("");
    setTimedOut(false);
  };

  const handleSubmitNormal = async () => {
    if (!selectedTask) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch<{ message: string; autoApproved: boolean; newBalance: number | null }>(
        `/tasks/${selectedTask.id}/complete`,
        { method: "POST", body: JSON.stringify({ proofText: proof }) }
      );
      setSuccessMsg(res.message);
      setSelectedTask(null);
      setProof("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Progression ──────────────────────────────────────────────────────────

  const balance = data?.balance ?? 0;
  const tasks = data?.tasks ?? [];

  // Séparer tâches principales (order 1-4) et tâches après 8000F (order 5+)
  const mainTasks = tasks.filter(t => t.taskOrder <= 4);
  const hardTasks = tasks.filter(t => t.taskOrder > 4);

  // Tâche courante débloquée = la première non approuvée dans l'ordre
  const approvedIds = new Set(completions.filter(c => c.status === "approuve").map(c => c.taskId));
  const mainTasksWithUnlock = mainTasks.map((task, idx) => {
    const prevApproved = idx === 0 || approvedIds.has(mainTasks[idx - 1]?.id ?? -1);
    return { ...task, unlocked: prevApproved };
  });

  const allMainDone = mainTasks.every(t => approvedIds.has(t.id));
  const show8kTasks = balance >= 8000 && mainTasksWithUnlock.filter(t => t.taskOrder <= 2 || t.taskOrder === 4).every(t => approvedIds.has(t.id));

  if (loading) {
    return (
      <PageWrapper title="Tâches Rémunérées">
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-primary font-bold uppercase tracking-widest text-sm">Chargement des tâches...</div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Tâches Rémunérées">

      {/* ── En-tête ── */}
      <div className="bg-foreground text-white py-10 border-b-4 border-primary">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Logo textuel YAS */}
              <div className="flex-shrink-0 w-16 h-16 bg-primary flex items-center justify-center">
                <span className="text-foreground font-black text-2xl tracking-tighter">YAS</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-widest">Tâches Rémunérées</h1>
                <p className="text-gray-400 text-sm mt-1">Complétez les tâches dans l'ordre et gagnez 1 000 FCFA chacune</p>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{formatCurrency(balance)}</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Solde actuel</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{approvedIds.size}</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Tâches validées</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bannière succès ── */}
      {successMsg && (
        <div className="bg-green-600 text-white px-4 py-4 border-b-4 border-green-800">
          <div className="container mx-auto flex items-center gap-3 font-bold">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <span>{successMsg}</span>
            <button className="ml-auto text-white/70 hover:text-white" onClick={() => setSuccessMsg("")}>✕</button>
          </div>
        </div>
      )}

      {/* ── Bannière dépôt (après échec tâche 3) ── */}
      {showDepositBanner && (
        <div className="bg-amber-50 border-b-4 border-amber-400 px-4 py-5">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-400 rounded-sm flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 uppercase tracking-widest text-sm mb-1">
                  💰 Débloquez votre progression avec un dépôt
                </h3>
                <p className="text-amber-800 text-sm leading-relaxed">
                  Vous pouvez effectuer un dépôt de <strong>5 000 FCFA</strong> sur le numéro{" "}
                  <strong className="text-amber-900 text-base">
                    {depositPhone ?? "…………………………"}
                  </strong>{" "}
                  pour enclencher le dépôt.{" "}
                  <span className="font-semibold">
                    Les 5 000 FCFA versés seront directement ajoutés à votre portefeuille
                  </span>{" "}
                  — votre solde passera instantanément à{" "}
                  <strong>{formatCurrency(balance + 5000)}</strong> après confirmation.
                </p>
                <div className="mt-3 flex gap-3 flex-wrap">
                  <Link href="/depot">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-widest">
                      <CreditCard className="w-4 h-4 mr-2" /> Effectuer le dépôt maintenant
                    </Button>
                  </Link>
                  <button
                    className="text-xs text-amber-700 hover:text-amber-900 underline uppercase tracking-widest font-bold"
                    onClick={() => setShowDepositBanner(false)}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 py-10">

        {/* ── Onglets ── */}
        <div className="flex gap-1 mb-10 border-b">
          {(["taches", "historique"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "taches" ? `Mes Tâches (${mainTasks.length + (show8kTasks ? hardTasks.length : 0)})` : `Historique (${completions.length})`}
            </button>
          ))}
        </div>

        {/* ── Onglet Tâches ── */}
        {tab === "taches" && (
          <div className="space-y-8">

            {/* Barre de progression */}
            <div className="bg-white border-2 border-gray-100 p-6 rounded-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold uppercase tracking-widest">Progression — Tâches principales</span>
                <span className="text-sm font-bold text-primary">{Math.min(approvedIds.size, 4)}/4</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(Math.min(approvedIds.size, 4) / 4) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>5 000 FCFA</span>
                <span>→ 6 000 F</span>
                <span>→ 7 000 F</span>
                <span>→ 8 000 F</span>
              </div>
            </div>

            {/* Tâches 1–4 en grille */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mainTasksWithUnlock.map((task, idx) => {
                const isApproved = approvedIds.has(task.id);
                const isImpossible = task.difficulty === "timed_impossible";
                const comp = completions.find(c => c.taskId === task.id);
                const failed = comp && comp.status !== "approuve";
                const locked = !task.unlocked;

                return (
                  <Card
                    key={task.id}
                    className={`border-2 transition-all overflow-hidden ${
                      isApproved
                        ? "border-green-300 bg-green-50/30"
                        : locked
                        ? "border-gray-200 opacity-60"
                        : isImpossible
                        ? "border-red-200 hover:border-red-400"
                        : "hover:border-primary/60 border-gray-200"
                    }`}
                  >
                    {/* Badge étape */}
                    <div className={`px-5 py-3 border-b flex items-center justify-between ${
                      isApproved ? "bg-green-600 text-white" : isImpossible ? "bg-red-600 text-white" : "bg-foreground text-white"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black opacity-40">0{idx + 1}</span>
                        <div>
                          <div className="text-[10px] uppercase tracking-widest opacity-70">{task.category}</div>
                          <div className="font-bold text-sm leading-tight">{task.title}</div>
                        </div>
                      </div>
                      {isApproved
                        ? <CheckCircle2 className="w-6 h-6 text-white" />
                        : locked
                        ? <Lock className="w-5 h-5 opacity-50" />
                        : isImpossible
                        ? <Zap className="w-5 h-5 text-yellow-300 animate-pulse" />
                        : <Star className="w-5 h-5 text-primary" />}
                    </div>

                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{task.description}</p>

                      {/* Récompense */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">Récompense</span>
                        <span className="font-bold text-primary">+{formatCurrency(task.reward)}</span>
                      </div>

                      {/* Timer badge pour tâche impossible */}
                      {isImpossible && !isApproved && (
                        <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-4">
                          <div className="flex items-center gap-2 text-red-700 text-sm font-bold">
                            <Clock className="w-4 h-4" />
                            <span>⚡ Défi chronométré — {task.timeLimit}s pour saisir le code exact</span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">Attention : toute erreur ou délai dépassé annule la tâche.</p>
                        </div>
                      )}

                      {/* Statuts */}
                      {isApproved && (
                        <div className="flex items-center gap-2 bg-green-100 text-green-800 rounded-sm px-3 py-2 text-sm font-bold border border-green-200">
                          <CheckCircle2 className="w-4 h-4" /> Tâche validée — +1 000 FCFA crédités
                        </div>
                      )}

                      {!isApproved && !locked && (
                        <Button
                          className={`w-full font-bold uppercase tracking-widest ${isImpossible ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                          onClick={() => openTask(task)}
                        >
                          {isImpossible ? <><Zap className="w-4 h-4 mr-2" /> Relever le défi</> : <><ChevronRight className="w-4 h-4 mr-2" /> Effectuer cette tâche</>}
                        </Button>
                      )}

                      {locked && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Lock className="w-4 h-4" /> Terminez la tâche précédente pour débloquer
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ── Bannière dépôt permanente (après tâche 2, avant 8000F) ── */}
            {balance >= 7000 && balance < 8000 && (
              <div className="border-2 border-primary bg-primary/5 p-8 rounded-sm text-center">
                <div className="w-14 h-14 bg-primary mx-auto flex items-center justify-center rounded-sm mb-4">
                  <CreditCard className="w-7 h-7 text-foreground" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-widest mb-2">Accélérez votre progression !</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed mb-6">
                  Vous pouvez effectuer un dépôt de <strong>5 000 FCFA</strong> sur le numéro{" "}
                  <strong className="text-foreground text-base">{depositPhone ?? "…………………………"}</strong>{" "}
                  pour enclencher le dépôt. Les 5 000 FCFA versés seront directement ajoutés à votre portefeuille.
                </p>
                <Link href="/depot">
                  <Button className="font-bold uppercase tracking-widest px-8 h-12">
                    <CreditCard className="w-4 h-4 mr-2" /> Déposer 5 000 FCFA maintenant
                  </Button>
                </Link>
              </div>
            )}

            {/* ── Tâches après 8 000 F ── */}
            {show8kTasks && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-gray-200" />
                  <div className="bg-foreground text-primary px-4 py-2 text-xs font-bold uppercase tracking-widest">
                    Tâches avancées — Solde ≥ 8 000 F
                  </div>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Alerte dépôt pour atteindre 10 000 F */}
                <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-sm">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 uppercase tracking-widest text-sm mb-2">
                        Conseil important
                      </h4>
                      <p className="text-amber-800 text-sm leading-relaxed">
                        Vous pouvez effectuer un dépôt de <strong>5 000 FCFA</strong> sur le numéro{" "}
                        <strong className="text-amber-900 text-base">{depositPhone ?? "…………………………"}</strong>{" "}
                        pour enclencher le dépôt.{" "}
                        <strong>Les 5 000 FCFA versés seront ajoutés à votre portefeuille</strong> — votre solde
                        atteindra ainsi <strong>{formatCurrency(balance + 5000)}</strong> et vous pourrez retirer.
                      </p>
                      <Link href="/depot" className="inline-block mt-3">
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-widest">
                          <CreditCard className="w-4 h-4 mr-2" /> Déposer maintenant
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {hardTasks.map((task) => {
                    const isApproved = approvedIds.has(task.id);
                    return (
                      <Card key={task.id} className="border-2 border-red-200 overflow-hidden">
                        <div className="bg-red-700 text-white px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest opacity-70">{task.category}</div>
                            <div className="font-bold text-sm leading-tight">{task.title}</div>
                          </div>
                          <Zap className="w-5 h-5 text-yellow-300 animate-pulse flex-shrink-0" />
                        </div>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                          <div className="bg-red-50 border border-red-200 rounded-sm p-2 mb-3 text-xs text-red-700 font-bold">
                            <Clock className="w-3 h-3 inline mr-1" /> Temps limite : {task.timeLimit}s — Code exact requis
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-muted-foreground">Récompense</span>
                            <span className="font-bold text-primary text-sm">+{formatCurrency(task.reward)}</span>
                          </div>
                          {isApproved
                            ? <div className="text-xs text-green-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Validée</div>
                            : <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs" onClick={() => openTask(task)}>
                                <Zap className="w-3 h-3 mr-1" /> Tenter le défi
                              </Button>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── CTA Final — Retrait ── */}
            {balance >= 10000 && (
              <div className="bg-green-600 text-white p-8 rounded-sm text-center border-4 border-green-800">
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold uppercase tracking-widest mb-2">Félicitations !</h3>
                <p className="text-green-100 mb-6">Votre solde est ≥ 10 000 FCFA. Vous pouvez demander un retrait.</p>
                <Link href="/dashboard">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-green-700 font-bold uppercase tracking-widest h-12 px-8">
                    <ArrowRight className="w-4 h-4 mr-2" /> Aller au tableau de bord
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Historique ── */}
        {tab === "historique" && (
          <div className="space-y-3">
            {completions.length === 0 && (
              <div className="text-center py-16">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune tâche réalisée pour le moment.</p>
              </div>
            )}
            {completions.map(c => {
              const cfg = {
                en_attente: { label: "En attente", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Clock className="w-4 h-4" /> },
                approuve: { label: "Validée ✓", color: "text-green-600 bg-green-50 border-green-200", icon: <CheckCircle2 className="w-4 h-4" /> },
                rejete: { label: "Rejetée", color: "text-red-600 bg-red-50 border-red-200", icon: <AlertCircle className="w-4 h-4" /> },
              }[c.status] ?? { label: c.status, color: "text-gray-600 bg-gray-50 border-gray-200", icon: null };

              return (
                <div key={c.id} className="flex items-center justify-between p-4 border-2 rounded-sm hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 text-xs font-bold border rounded-sm px-2 py-1 ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{c.taskTitle}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</div>
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${c.rewardPaid ? "text-green-600" : "text-muted-foreground"}`}>
                    {c.rewardPaid ? `+${formatCurrency(c.reward)}` : `${formatCurrency(c.reward)}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Dialog tâche normale ════════════════════════════════════════════════ */}
      <Dialog
        open={!!selectedTask && selectedTask.difficulty === "normal"}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
              <Briefcase className="w-4 h-4 text-primary" /> {selectedTask?.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-center gap-2 text-primary font-bold mt-1">
                <Star className="w-3 h-3" /> Récompense : {selectedTask ? formatCurrency(selectedTask.reward) : ""} — Créditée instantanément
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 py-2">
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Instructions</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{selectedTask.instructions}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest">Votre réponse *</label>
                <Textarea
                  placeholder="Décrivez en détail comment vous avez réalisé cette tâche..."
                  value={proof}
                  onChange={e => setProof(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">{proof.length} caractères (minimum 10)</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-sm">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-bold uppercase tracking-widest" onClick={() => setSelectedTask(null)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1 font-bold uppercase tracking-widest"
                  onClick={handleSubmitNormal}
                  disabled={proof.length < 10 || submitting}
                >
                  {submitting ? "Validation..." : "Soumettre & Gagner"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Dialog tâche impossible (minutée) ═══════════════════════════════════ */}
      <Dialog
        open={!!selectedTask && (selectedTask.difficulty === "timed_impossible" || selectedTask.difficulty === "impossible")}
        onOpenChange={(open) => {
          if (!open) { setSelectedTask(null); setTimedOut(false); setChallengeInput(""); }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-red-700">
              <Zap className="w-4 h-4" /> {selectedTask?.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-red-600 text-xs font-bold mt-1 uppercase tracking-widest">
                ⚡ Défi chronométré — {selectedTask?.timeLimit}s • Saisie exacte requise
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedTask && !timedOut && (
            <div className="space-y-5 py-2">
              {/* Timer */}
              <CountdownTimer
                key={selectedTask.id}
                seconds={selectedTask.timeLimit ?? 60}
                onExpire={handleTimerExpire}
              />

              {/* Code à saisir */}
              <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-sm border-2 border-gray-700 select-none">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Code à saisir EXACTEMENT :</div>
                <div className="break-all leading-relaxed text-base font-bold tracking-wide">
                  {selectedTask.challengeCode}
                </div>
              </div>

              {/* Champ de saisie */}
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest text-red-700">
                  Reproduisez le code ci-dessus à l'identique *
                </label>
                <Input
                  value={challengeInput}
                  onChange={e => setChallengeInput(e.target.value)}
                  placeholder="Saisissez le code exact..."
                  className="font-mono border-2 border-red-200 focus:border-red-500"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Caractères saisis : {challengeInput.length} / {selectedTask.challengeCode?.length ?? 0}
                  {challengeInput.length > 0 && challengeInput !== selectedTask.challengeCode?.substring(0, challengeInput.length) && (
                    <span className="ml-2 text-red-500 font-bold">✗ Erreur détectée</span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-bold uppercase tracking-widest" onClick={() => setSelectedTask(null)}>
                  Abandonner
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest"
                  disabled={challengeInput !== selectedTask.challengeCode}
                  onClick={() => {
                    // Cette condition est pratiquement impossible à atteindre
                    handleSubmitNormal();
                  }}
                >
                  Valider le défi
                </Button>
              </div>
            </div>
          )}

          {/* ── Écran d'échec (timer expiré) ── */}
          {selectedTask && timedOut && (
            <div className="space-y-5 py-4 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase tracking-widest text-red-700 mb-2">Temps écoulé !</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Le délai imparti est dépassé. La tâche n'a pas pu être validée cette fois-ci.
                </p>
              </div>

              {/* CTA Dépôt après échec */}
              <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-sm text-left">
                <h4 className="font-bold text-amber-900 uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Continuez avec un dépôt
                </h4>
                <p className="text-amber-800 text-sm leading-relaxed mb-4">
                  Vous pouvez effectuer un dépôt de <strong>5 000 FCFA</strong> sur le numéro{" "}
                  <strong className="text-amber-900 text-base">{depositPhone ?? "…………………………"}</strong>{" "}
                  pour enclencher le dépôt. Les 5 000 FCFA versés seront directement ajoutés à votre
                  portefeuille — votre solde passera à{" "}
                  <strong className="text-amber-900">{formatCurrency(balance + 5000)}</strong>.
                </p>
                <Link href="/depot">
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-widest"
                    onClick={() => { setSelectedTask(null); setTimedOut(false); }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" /> Déposer 5 000 FCFA
                  </Button>
                </Link>
              </div>

              <Button
                variant="ghost"
                className="w-full text-xs uppercase tracking-widest font-bold text-muted-foreground"
                onClick={() => { setSelectedTask(null); setTimedOut(false); setChallengeInput(""); }}
              >
                Retour aux tâches
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </PageWrapper>
  );
}
