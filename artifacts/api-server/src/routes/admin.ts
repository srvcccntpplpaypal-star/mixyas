import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, walletsTable, visitsTable, kycTable, tasksTable, taskCompletionsTable, depositsTable, adminSettingsTable } from "@workspace/db";
import { eq, count, sum, sql } from "drizzle-orm";
import { isAdminRequest } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();

// Hash bcrypt de "ocl2o" — mot de passe pour les paramètres sensibles (numéro de dépôt)
const ADMIN_SETTINGS_HASH = "$2b$12$N83hJtWKF9Z1Hdny/AUPjuqXg1C4xP/3Xh7sQOOnm4Iytd3mi.6P6";

function guard(req: Request, res: Response): boolean {
  if (!isAdminRequest(req)) {
    res.status(403).json({ error: "Accès refusé." });
    return false;
  }
  return true;
}

// ─── STATS ─────────────────────────────────────────────────────────────────
router.get("/admin/stats", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [totalVisitsRow] = await db.select({ count: count() }).from(visitsTable);
  const [totalWalletRow] = await db.select({ total: sum(walletsTable.balance) }).from(walletsTable);
  const [kycRow] = await db.select({ count: count() }).from(kycTable);
  const [depositsRow] = await db.select({ count: count() }).from(depositsTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [usersTodayRow] = await db.select({ count: count() }).from(usersTable).where(sql`${usersTable.createdAt} >= ${today}`);
  const [visitsTodayRow] = await db.select({ count: count() }).from(visitsTable).where(sql`${visitsTable.createdAt} >= ${today}`);

  res.json({
    totalUsers: totalUsersRow.count,
    totalVisits: totalVisitsRow.count,
    totalWalletBalance: parseFloat(totalWalletRow.total ?? "0"),
    usersToday: usersTodayRow.count,
    visitsToday: visitsTodayRow.count,
    totalKyc: kycRow.count,
    totalDeposits: depositsRow.count,
  });
});

// ─── UTILISATEURS ──────────────────────────────────────────────────────────
router.get("/admin/users", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const users = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      phone: usersTable.phone,
      countryCode: usersTable.countryCode,
      country: usersTable.country,
      walletBalance: walletsTable.balance,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .orderBy(sql`${usersTable.createdAt} DESC`);

  res.json(users.map((u) => ({ ...u, walletBalance: parseFloat(u.walletBalance ?? "0") })));
});

// ─── VISITES ───────────────────────────────────────────────────────────────
router.get("/admin/visits", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const visits = await db.select().from(visitsTable).orderBy(sql`${visitsTable.createdAt} DESC`).limit(500);
  res.json(visits);
});

// ─── KYC ───────────────────────────────────────────────────────────────────
router.get("/admin/kyc", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const submissions = await db
    .select({
      id: kycTable.id,
      userId: kycTable.userId,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      fullName: kycTable.fullName,
      birthDate: kycTable.birthDate,
      birthPlace: kycTable.birthPlace,
      nationality: kycTable.nationality,
      documentType: kycTable.documentType,
      documentNumber: kycTable.documentNumber,
      documentFrontDesc: kycTable.documentFrontDesc,
      documentBackDesc: kycTable.documentBackDesc,
      documentFrontUrl: kycTable.documentFrontUrl,
      documentBackUrl: kycTable.documentBackUrl,
      selfieDesc: kycTable.selfieDesc,
      selfieUrl: kycTable.selfieUrl,
      address: kycTable.address,
      addressProofDesc: kycTable.addressProofDesc,
      status: kycTable.status,
      adminNote: kycTable.adminNote,
      createdAt: kycTable.createdAt,
    })
    .from(kycTable)
    .leftJoin(usersTable, eq(usersTable.id, kycTable.userId))
    .orderBy(sql`${kycTable.createdAt} DESC`);

  res.json(submissions);
});

const kycDecisionSchema = z.object({
  action: z.enum(["approuve", "rejete"]),
  adminNote: z.string().optional(),
});

router.post("/admin/kyc/:id/decision", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide." }); return; }

  const parsed = kycDecisionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Données invalides." }); return; }

  await db.update(kycTable)
    .set({ status: parsed.data.action, adminNote: parsed.data.adminNote ?? null })
    .where(eq(kycTable.id, id));

  res.json({ success: true, message: `KYC ${parsed.data.action === "approuve" ? "approuvé" : "rejeté"}.` });
});

// ─── TÂCHES ────────────────────────────────────────────────────────────────
router.get("/admin/tasks", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;
  const tasks = await db.select().from(tasksTable).orderBy(sql`${tasksTable.createdAt} ASC`);
  res.json(tasks.map(t => ({ ...t, reward: parseFloat(t.reward) })));
});

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(1),
  instructions: z.string().min(10),
  reward: z.number().positive().default(1000),
});

router.post("/admin/tasks", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Données invalides." }); return; }

  const [task] = await db.insert(tasksTable).values({
    ...parsed.data,
    reward: parsed.data.reward.toString(),
    isActive: true,
  }).returning();
  res.status(201).json({ ...task, reward: parseFloat(task.reward) });
});

router.patch("/admin/tasks/:id", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide." }); return; }

  const { isActive } = req.body;
  if (typeof isActive !== "boolean") { res.status(400).json({ error: "isActive doit être un booléen." }); return; }

  await db.update(tasksTable).set({ isActive }).where(eq(tasksTable.id, id));
  res.json({ success: true });
});

// ─── RÉALISATIONS DE TÂCHES ────────────────────────────────────────────────
router.get("/admin/task-completions", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const completions = await db
    .select({
      id: taskCompletionsTable.id,
      userId: taskCompletionsTable.userId,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      taskId: taskCompletionsTable.taskId,
      taskTitle: tasksTable.title,
      reward: tasksTable.reward,
      proofText: taskCompletionsTable.proofText,
      status: taskCompletionsTable.status,
      rewardPaid: taskCompletionsTable.rewardPaid,
      createdAt: taskCompletionsTable.createdAt,
    })
    .from(taskCompletionsTable)
    .leftJoin(usersTable, eq(usersTable.id, taskCompletionsTable.userId))
    .leftJoin(tasksTable, eq(tasksTable.id, taskCompletionsTable.taskId))
    .orderBy(sql`${taskCompletionsTable.createdAt} DESC`);

  res.json(completions.map(c => ({ ...c, reward: parseFloat(c.reward ?? "1000") })));
});

const completionDecisionSchema = z.object({
  action: z.enum(["approuve", "rejete"]),
});

router.post("/admin/task-completions/:id/decision", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide." }); return; }

  const parsed = completionDecisionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Données invalides." }); return; }

  const [completion] = await db.select().from(taskCompletionsTable).where(eq(taskCompletionsTable.id, id));
  if (!completion) { res.status(404).json({ error: "Réalisation introuvable." }); return; }

  await db.update(taskCompletionsTable).set({ status: parsed.data.action }).where(eq(taskCompletionsTable.id, id));

  // Si approuvé et pas encore payé → créditer le portefeuille
  if (parsed.data.action === "approuve" && !completion.rewardPaid) {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, completion.taskId));
    const reward = parseFloat(task?.reward ?? "1000");

    await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} + ${reward}` })
      .where(eq(walletsTable.userId, completion.userId));

    await db.update(taskCompletionsTable).set({ rewardPaid: true }).where(eq(taskCompletionsTable.id, id));
  }

  res.json({ success: true, message: `Tâche ${parsed.data.action === "approuve" ? "approuvée et récompense créditée" : "rejetée"}.` });
});

// ─── DÉPÔTS ────────────────────────────────────────────────────────────────
router.get("/admin/deposits", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const deposits = await db
    .select({
      id: depositsTable.id,
      userId: depositsTable.userId,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      amount: depositsTable.amount,
      referenceCode: depositsTable.referenceCode,
      status: depositsTable.status,
      adminNote: depositsTable.adminNote,
      createdAt: depositsTable.createdAt,
    })
    .from(depositsTable)
    .leftJoin(usersTable, eq(usersTable.id, depositsTable.userId))
    .orderBy(sql`${depositsTable.createdAt} DESC`);

  res.json(deposits.map(d => ({ ...d, amount: parseFloat(d.amount) })));
});

const depositDecisionSchema = z.object({
  action: z.enum(["confirme", "rejete"]),
  adminNote: z.string().optional(),
});

router.post("/admin/deposits/:id/decision", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide." }); return; }

  const parsed = depositDecisionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Données invalides." }); return; }

  const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
  if (!deposit) { res.status(404).json({ error: "Dépôt introuvable." }); return; }
  if (deposit.status !== "en_attente") { res.status(409).json({ error: "Ce dépôt a déjà été traité." }); return; }

  await db.update(depositsTable)
    .set({ status: parsed.data.action, adminNote: parsed.data.adminNote ?? null })
    .where(eq(depositsTable.id, id));

  // Si confirmé → créditer le portefeuille
  if (parsed.data.action === "confirme") {
    const amount = parseFloat(deposit.amount);
    await db.update(walletsTable)
      .set({ balance: sql`${walletsTable.balance} + ${amount}` })
      .where(eq(walletsTable.userId, deposit.userId));
  }

  res.json({ success: true, message: `Dépôt ${parsed.data.action === "confirme" ? "confirmé et crédité" : "rejeté"}.` });
});

// ─── PARAMÈTRES (protégés par mot de passe "ocl2o") ────────────────────────
router.get("/admin/settings", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const settings = await db.select().from(adminSettingsTable);
  // On masque le numéro de téléphone sauf si le mot de passe est fourni
  const adminPwd = req.headers["x-settings-password"] as string | undefined;
  const authenticated = adminPwd ? await bcrypt.compare(adminPwd, ADMIN_SETTINGS_HASH) : false;

  const result: Record<string, string | null> = {};
  for (const s of settings) {
    if (s.key === "deposit_phone_number" && !authenticated) {
      result[s.key] = "***masqué***";
    } else {
      result[s.key] = s.value;
    }
  }

  res.json({ settings: result, authenticated });
});

const settingsSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  adminPassword: z.string().min(1, "Mot de passe requis."),
});

router.post("/admin/settings", async (req: Request, res: Response): Promise<void> => {
  if (!guard(req, res)) return;

  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Données invalides." });
    return;
  }

  const validPassword = await bcrypt.compare(parsed.data.adminPassword, ADMIN_SETTINGS_HASH);
  if (!validPassword) {
    res.status(403).json({ error: "Mot de passe incorrect." });
    return;
  }

  // Upsert setting
  const existing = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, parsed.data.key));
  if (existing.length > 0) {
    await db.update(adminSettingsTable).set({ value: parsed.data.value }).where(eq(adminSettingsTable.key, parsed.data.key));
  } else {
    await db.insert(adminSettingsTable).values({ key: parsed.data.key, value: parsed.data.value });
  }

  res.json({ success: true, message: "Paramètre mis à jour avec succès." });
});

export default router;
