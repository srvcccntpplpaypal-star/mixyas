import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { db, kycTable } from "@workspace/db";
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
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Helper : upload buffer → GCS, retourne le chemin de stockage ──────────
async function uploadToGCS(
  buffer: Buffer,
  mimetype: string,
  folder: string,
): Promise<string> {
  const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR non configuré.");

  // privateDir = /<bucketId>/private  →  bucketId + objectDir
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
async function serveFromGCS(
  gcsPath: string,
  res: Response,
): Promise<void> {
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

// ─── GET /kyc/status ────────────────────────────────────────────────────────
router.get("/kyc/status", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Non authentifié." }); return; }

  const [kyc] = await db.select().from(kycTable).where(eq(kycTable.userId, userId));
  if (!kyc) { res.json({ status: "non_soumis", kyc: null }); return; }

  res.json({
    status: kyc.status,
    kyc: {
      id: kyc.id,
      fullName: kyc.fullName,
      documentType: kyc.documentType,
      status: kyc.status,
      adminNote: kyc.adminNote,
      createdAt: kyc.createdAt,
    },
  });
});

// ─── /kyc/files/** — proxy GCS (admin ou utilisateur authentifié) ────────────
router.use(
  "/kyc/files",
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
    // req.path is the path after the /kyc/files prefix, e.g. /replit-objstore-xxx/private/kyc/uuid
    await serveFromGCS(req.path, res);
  },
);

const kycSchema = z.object({
  fullName: z.string().min(2),
  birthDate: z.string().min(1),
  birthPlace: z.string().min(1),
  nationality: z.string().min(1),
  documentType: z.enum(["CNI", "Passeport", "Permis de conduire"]),
  documentNumber: z.string().min(1),
  selfieDesc: z.string().min(10),
  address: z.string().min(5),
  addressProofDesc: z.string().min(5),
});

// ─── POST /kyc/submit ────────────────────────────────────────────────────────
router.post(
  "/kyc/submit",
  upload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Non authentifié." }); return; }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const documentFront = files?.documentFront?.[0];
    const documentBack = files?.documentBack?.[0];
    const selfie = files?.selfie?.[0];

    if (!documentFront || !documentBack || !selfie) {
      res.status(400).json({ error: "Veuillez fournir le recto, le verso du document et le selfie." });
      return;
    }

    const parsed = kycSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Données invalides.", details: parsed.error.format() });
      return;
    }

    const [existing] = await db.select().from(kycTable).where(eq(kycTable.userId, userId));
    if (existing?.status === "en_attente") {
      res.status(409).json({ error: "Votre KYC est déjà en cours de vérification." });
      return;
    }
    if (existing?.status === "approuve") {
      res.status(409).json({ error: "Votre KYC est déjà approuvé." });
      return;
    }
    if (existing?.status === "rejete") {
      await db.delete(kycTable).where(eq(kycTable.userId, userId));
    }

    // Upload files to GCS
    const [frontPath, backPath, selfiePath] = await Promise.all([
      uploadToGCS(documentFront.buffer, documentFront.mimetype, "kyc"),
      uploadToGCS(documentBack.buffer, documentBack.mimetype, "kyc"),
      uploadToGCS(selfie.buffer, selfie.mimetype, "kyc"),
    ]);

    const [kyc] = await db.insert(kycTable).values({
      userId,
      fullName: parsed.data.fullName,
      birthDate: parsed.data.birthDate,
      birthPlace: parsed.data.birthPlace,
      nationality: parsed.data.nationality,
      documentType: parsed.data.documentType,
      documentNumber: parsed.data.documentNumber,
      documentFrontDesc: "Photo recto fournie.",
      documentBackDesc: "Photo verso fournie.",
      selfieDesc: parsed.data.selfieDesc,
      address: parsed.data.address,
      addressProofDesc: parsed.data.addressProofDesc,
      documentFrontUrl: frontPath,
      documentBackUrl: backPath,
      selfieUrl: selfiePath,
      status: "en_attente",
    }).returning();

    res.status(201).json({
      message: "KYC soumis avec succès. Le dossier est en cours de vérification.",
      kyc: { id: kyc.id, status: kyc.status, createdAt: kyc.createdAt },
    });
  },
);

export default router;
