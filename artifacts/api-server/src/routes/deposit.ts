import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { db, depositsTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";
import { objectStorageClient } from "../lib/objectStorage";
import { z } from "zod";

const router: IRouter = Router();

// ─── Multer memory storage (no local disk) ─────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format non supporté. Utilisez JPEG, PNG ou WEBP."));
    }
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

// ─── Helper : upload buffer → GCS, retourne le chemin de stockage ──────────
async function uploadToGCS(
  buffer: Buffer,
  mimetype: string,
  folder: string,
): Promise<string> {
  const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR non configuré.");

  const parts = privateDir.replace(/^\//, "").split("/");
  const bucketId = parts[0];
  const objectDir = parts.slice(1).join("/");

  const objectId = randomUUID();
  const objectName = `${objectDir}/${folder}/${objectId}`;

  const bucket = objectStorageClient.bucket(bucketId);
  const file = bucket.file(objectName);
  await file.save(buffer, { contentType: mimetype, resumable: false });

  return `/${bucketId}/${objectName}`;
}

// ─── Helper : stream un objet GCS vers la réponse HTTP ─────────────────────
async function serveFromGCS(gcsPath: string, res: Response): Promise<void> {
  const parts = gcsPath.replace(/^\//, "").split("/");
  const bucketId = parts[0];
  const objectName = parts.slice(1).join("/");

  const bucket = objectStorageClient.bucket(bucketId);
  const file = bucket.file(objectName);

  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).json({ error: "Fichier introuvable." });
    return;
  }

  const [metadata] = await file.getMetadata();
  res.setHeader("Content-Type", (metadata.contentType as string) || "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=3600");
  file.createReadStream().pipe(res);
}

// ─── GET /deposit/info — numéro de dépôt (public) ───────────────────────────
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

// ─── /deposit/proof/** — proxy GCS (admin only) ──────────────────────────────
router.use(
  "/deposit/proof",
  (req: Request, res: Response, next: (err?: unknown) => void) => {
    const adminKey = req.headers["x-admin-key"];
    const authHeader = req.headers.authorization;
    if (!adminKey && !authHeader) {
      res.status(401).json({ error: "Non autorisé." });
      return;
    }
    next();
  },
  async (req: Request, res: Response) => {
    await serveFromGCS(req.path, res);
  },
);

const depositSchema = z.object({
  referenceCode: z.string().min(3, "Le code de transaction est requis."),
});

// ─── POST /deposit/submit ────────────────────────────────────────────────────
router.post("/deposit/submit", upload.single("proofImage"), async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Veuillez joindre une preuve de paiement en image." });
    return;
  }

  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Données invalides." });
    return;
  }

  // Upload proof to GCS
  const proofPath = await uploadToGCS(req.file.buffer, req.file.mimetype, "deposits");

  const [deposit] = await db.insert(depositsTable).values({
    userId,
    amount: "5000.00",
    referenceCode: parsed.data.referenceCode,
    status: "en_attente",
    proofImageUrl: proofPath,
  }).returning();

  res.status(201).json({
    message: "Votre demande de dépôt a été enregistrée. Elle sera vérifiée et créditée sous 24h.",
    deposit: {
      id: deposit.id,
      amount: parseFloat(deposit.amount),
      status: deposit.status,
      createdAt: deposit.createdAt,
    },
    proofFile: proofPath,
  });
});

// ─── GET /deposit/history ────────────────────────────────────────────────────
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
