import { Router, type IRouter, type Request, type Response } from "express";
import { db, tasksTable, taskCompletionsTable, walletsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();

// ─── Tâches pré-définies avec système de progression ────────────────────────

const INITIAL_TASKS = [
  // ── Tâches normales (auto-approuvées, créditées instantanément) ──
  {
    title: "Partager YAS Service sur vos réseaux sociaux",
    description: "Faites connaître YAS Service autour de vous en partageant notre lien sur vos réseaux sociaux.",
    category: "Parrainage",
    instructions: "Partagez le lien de YAS Service sur au moins un réseau social (Facebook, WhatsApp, Instagram…). Décrivez dans le champ ci-dessous sur quel réseau vous avez partagé et combien de personnes vous avez touché.",
    reward: "1000.00",
    taskOrder: 1,
    difficulty: "normal",
    timeLimit: null,
    challengeCode: null,
  },
  {
    title: "Compléter le sondage de satisfaction",
    description: "Donnez votre avis sur la plateforme YAS Service pour nous aider à améliorer nos services.",
    category: "Sondage",
    instructions: "Répondez aux 4 questions suivantes dans votre soumission :\n1. Note générale /10\n2. Ce que vous aimez sur YAS Service\n3. Ce qui peut être amélioré\n4. Recommanderiez-vous YAS Service à un proche ?",
    reward: "1000.00",
    taskOrder: 2,
    difficulty: "normal",
    timeLimit: null,
    challengeCode: null,
  },
  // ── Tâche impossible (minutée, impossible à réaliser) ──
  {
    title: "⚡ DÉFI ULTRA-RAPIDE — Saisie de Code de Sécurité",
    description: "Tâche de vérification de sécurité avancée. Saisissez le code de sécurité affiché EXACTEMENT tel qu'il est, sans erreur, dans le temps imparti.",
    category: "Défi Sécurité",
    instructions: "Vous devez saisir le code de sécurité ci-dessous EXACTEMENT, caractère par caractère, en respectant les majuscules, chiffres et symboles. Toute erreur invalide la tâche. Temps imparti : 60 secondes.",
    reward: "1000.00",
    taskOrder: 3,
    difficulty: "timed_impossible",
    timeLimit: 60,
    challengeCode: "YAS#2024-SRV$xK9!mP3@zR7&wQ1^vN5*bL8%cJ6nT4oU2aG0dH",
  },
  {
    title: "Rédiger un avis détaillé sur YAS Service",
    description: "Partagez votre expérience YAS Service en rédigeant un avis complet et honnête.",
    category: "Rédaction",
    instructions: "Rédigez un avis de minimum 80 mots sur votre expérience YAS Service. Couvrez : la facilité d'inscription, la qualité de la plateforme, votre satisfaction globale, et ce que vous avez apprécié. Soyez précis et sincère.",
    reward: "1000.00",
    taskOrder: 4,
    difficulty: "normal",
    timeLimit: null,
    challengeCode: null,
  },
  // ── Tâches impossibles affichées après 8 000 F ──
  {
    title: "⚡ DÉFI EXPERT — Cryptographie Avancée",
    description: "Mission de vérification cryptographique de haut niveau. Déchiffrez et saisissez la clé en moins de 8 secondes.",
    category: "Défi Expert",
    instructions: "Déchiffrez la séquence cryptographique et saisissez-la exactement. Le système de sécurité ne tolère aucune erreur.",
    reward: "1000.00",
    taskOrder: 5,
    difficulty: "impossible",
    timeLimit: 8,
    challengeCode: "K7!xP#9Qr&mZ2@wN5$bL4^vJ8*cT6nR3aG1dH0oU",
  },
  {
    title: "⚡ DÉFI EXPERT — Synchronisation Biométrique",
    description: "Validation de synchronisation biométrique ultra-rapide. Entrez la séquence en moins de 6 secondes.",
    category: "Défi Expert",
    instructions: "Saisissez la séquence de synchronisation biométrique exactement comme affichée. Temps limite : 6 secondes. Aucune erreur tolérée.",
    reward: "1000.00",
    taskOrder: 6,
    difficulty: "impossible",
    timeLimit: 6,
    challengeCode: "BIO#2024$X9!kM3@pZ7&sR1^yN5*wQ8aL6cJ4vT2",
  },
  {
    title: "⚡ DÉFI EXPERT — Validation Réseau Sécurisé",
    description: "Protocole de validation réseau niveau 5. Saisissez le token d'authentification en moins de 5 secondes.",
    category: "Défi Expert",
    instructions: "Entrez le token d'authentification réseau affiché ci-dessous EXACTEMENT en moins de 5 secondes. Le délai est strict et non négociable.",
    reward: "1000.00",
    taskOrder: 7,
    difficulty: "impossible",
    timeLimit: 5,
    challengeCode: "NET!5@xK#9mP$3zR%7wQ^1vN&8bL*4cJ(6nT)2oU",
  },
];

// ─── Seed des tâches si absentes ou incomplètes ─────────────────────────────

async function seedTasksIfNeeded() {
  const existing = await db.select({ id: tasksTable.id, taskOrder: tasksTable.taskOrder }).from(tasksTable);
  // Re-seed si vide ou si les tasks n'ont pas les bons orders (ancienne version sans task_order)
  const hasNewFields = existing.some(t => t.taskOrder !== 99);
  if (existing.length === 0 || !hasNewFields) {
    if (existing.length > 0) {
      await db.delete(tasksTable);
      await db.delete(taskCompletionsTable);
    }
    await db.insert(tasksTable).values(INITIAL_TASKS);
  }
}

// ─── GET /tasks — liste des tâches avec progression utilisateur ─────────────

router.get("/tasks", async (req: Request, res: Response): Promise<void> => {
  await seedTasksIfNeeded();
  const userId = extractUserId(req);

  const tasks = await db.select().from(tasksTable)
    .where(eq(tasksTable.isActive, true))
    .orderBy(tasksTable.taskOrder);

  if (!userId) {
    res.json(tasks.map(t => ({ ...t, reward: parseFloat(t.reward), userCompletion: null })));
    return;
  }

  // Récupérer le solde de l'utilisateur
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  const balance = wallet ? parseFloat(String(wallet.balance)) : 0;

  const completions = await db.select().from(taskCompletionsTable)
    .where(eq(taskCompletionsTable.userId, userId));

  const completionsByTask = new Map(completions.map(c => [c.taskId, c]));

  res.json({
    tasks: tasks.map(t => ({
      ...t,
      reward: parseFloat(t.reward),
      userCompletion: completionsByTask.get(t.id) ?? null,
    })),
    balance,
    completedCount: completions.filter(c => c.status === "approuve").length,
  });
});

// ─── Schéma de soumission ───────────────────────────────────────────────────

const completionSchema = z.object({
  proofText: z.string().min(10, "Votre réponse doit contenir au moins 10 caractères."),
});

// ─── POST /tasks/:id/complete — soumettre une réalisation ──────────────────

router.post("/tasks/:id/complete", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const taskId = parseInt(String(req.params.id), 10);
  if (isNaN(taskId)) {
    res.status(400).json({ error: "ID de tâche invalide." });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(
    and(eq(tasksTable.id, taskId), eq(tasksTable.isActive, true))
  );
  if (!task) {
    res.status(404).json({ error: "Tâche introuvable." });
    return;
  }

  // Vérifier si déjà soumis et approuvé
  const [existing] = await db.select().from(taskCompletionsTable).where(
    and(eq(taskCompletionsTable.userId, userId), eq(taskCompletionsTable.taskId, taskId))
  );
  if (existing && existing.status === "approuve") {
    res.status(409).json({ error: "Vous avez déjà complété cette tâche.", status: existing.status });
    return;
  }

  const parsed = completionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Données invalides." });
    return;
  }

  let finalStatus = "en_attente";
  let rewardPaid = false;
  let newBalance: number | null = null;

  // Auto-approbation pour les tâches normales
  if (task.difficulty === "normal") {
    finalStatus = "approuve";
    rewardPaid = true;

    // Créditer le portefeuille
    const [updatedWallet] = await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} + ${task.reward}` })
      .where(eq(walletsTable.userId, userId))
      .returning({ balance: walletsTable.balance });

    newBalance = updatedWallet ? parseFloat(String(updatedWallet.balance)) : null;
  }

  // Supprimer ancienne soumission si rejet
  if (existing) {
    await db.delete(taskCompletionsTable).where(eq(taskCompletionsTable.id, existing.id));
  }

  const [completion] = await db.insert(taskCompletionsTable).values({
    userId,
    taskId,
    proofText: parsed.data.proofText,
    status: finalStatus,
    rewardPaid,
  }).returning();

  res.status(201).json({
    message: task.difficulty === "normal"
      ? `Tâche validée ! +${parseFloat(task.reward).toLocaleString()} FCFA crédités sur votre portefeuille.`
      : "Tâche soumise. Vous serez notifié(e) après vérification.",
    autoApproved: task.difficulty === "normal",
    newBalance,
    completion: {
      id: completion.id,
      status: completion.status,
      rewardPaid: completion.rewardPaid,
      createdAt: completion.createdAt,
    },
  });
});

// ─── GET /tasks/my-completions ──────────────────────────────────────────────

router.get("/tasks/my-completions", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const completions = await db
    .select({
      id: taskCompletionsTable.id,
      taskId: taskCompletionsTable.taskId,
      taskTitle: tasksTable.title,
      status: taskCompletionsTable.status,
      rewardPaid: taskCompletionsTable.rewardPaid,
      reward: tasksTable.reward,
      difficulty: tasksTable.difficulty,
      createdAt: taskCompletionsTable.createdAt,
    })
    .from(taskCompletionsTable)
    .leftJoin(tasksTable, eq(tasksTable.id, taskCompletionsTable.taskId))
    .where(eq(taskCompletionsTable.userId, userId))
    .orderBy(sql`${taskCompletionsTable.createdAt} DESC`);

  res.json(completions.map(c => ({
    ...c,
    reward: parseFloat(c.reward ?? "1000"),
  })));
});

export default router;
