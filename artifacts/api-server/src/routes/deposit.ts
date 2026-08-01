import { Router, type IRouter, type Request, type Response } from "express";
import { db, depositsTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();

// GET /deposit/info — numéro de dépôt défini par l'admin (public)
router.get("/deposit/info", async (_req: Request, res: Response): Promise<void> => {
  const [setting] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.key, "deposit_phone_number"));

  if (!setting) {
    res.json({ phoneNumber: null, message: "Le numéro de dépôt n'est pas encore configuré. Contactez le support : mixyastg@gmail.com" });
    return;
  }

  res.json({
    phoneNumber: setting.value,
    amount: 5000,
    currency: "FCFA",
    instructions: `Envoyez exactement 5 000 FCFA via Mobile Money au numéro ${setting.value}. Notez bien votre code de transaction, vous en aurez besoin pour valider votre dépôt.`,
  });
});

const depositSchema = z.object({
  referenceCode: z.string().min(3, "Le code de transaction est requis."),
});

// POST /deposit/submit — soumettre un dépôt
router.post("/deposit/submit", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Données invalides." });
    return;
  }

  const [deposit] = await db.insert(depositsTable).values({
    userId,
    amount: "5000.00",
    referenceCode: parsed.data.referenceCode,
    status: "en_attente",
  }).returning();

  res.status(201).json({
    message: "Votre demande de dépôt a été enregistrée. Elle sera vérifiée et créditée sous 24h.",
    deposit: {
      id: deposit.id,
      amount: parseFloat(deposit.amount),
      status: deposit.status,
      createdAt: deposit.createdAt,
    },
  });
});

// GET /deposit/history — historique des dépôts de l'utilisateur
router.get("/deposit/history", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const deposits = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, userId));

  res.json(deposits.map(d => ({
    ...d,
    amount: parseFloat(d.amount),
  })));
});

export default router;
