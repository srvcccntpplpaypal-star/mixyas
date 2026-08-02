import express, { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, depositsTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();
const uploadDir = path.resolve("./uploads/deposits");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format d'image non supporté. Utilisez JPEG, PNG ou WEBP."));
    }
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.use((err: unknown, _req: Request, res: Response, _next: (err?: unknown) => void) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: "Erreur inattendue lors du téléversement." });
});

// GET /deposit/info — numéro de dépôt défini par l'admin (public)
router.get("/deposit/info", async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    req.log.warn({ err: error }, "Unable to load deposit info");
    res.json({ phoneNumber: null, message: "Le numéro de dépôt n'est pas encore configuré. Contactez le support : mixyastg@gmail.com" });
  }
});

const depositSchema = z.object({
  referenceCode: z.string().min(3, "Le code de transaction est requis."),
});

// POST /deposit/submit — soumettre un dépôt
router.post("/deposit/submit", upload.single("proofImage"), async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  if (req.file == null) {
    res.status(400).json({ error: "Veuillez joindre une preuve de paiement en image." });
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
    proofFile: `/api/deposit/proof/${path.basename(req.file.path)}`,
  });
});

router.use("/deposit/proof", express.static(uploadDir));

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
