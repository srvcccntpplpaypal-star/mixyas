import express, { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, kycTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();
const uploadDir = path.resolve("./uploads/kyc");
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
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use("/kyc/files", express.static(uploadDir));

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

// GET /kyc/status — statut KYC de l'utilisateur connecté
router.get("/kyc/status", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const [kyc] = await db.select().from(kycTable).where(eq(kycTable.userId, userId));
  if (!kyc) {
    res.json({ status: "non_soumis", kyc: null });
    return;
  }

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

// POST /kyc/submit — soumettre le KYC avec images
router.post(
  "/kyc/submit",
  upload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Non authentifié." });
      return;
    }

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
    if (existing && existing.status === "en_attente") {
      res.status(409).json({ error: "Votre KYC est déjà en cours de vérification." });
      return;
    }
    if (existing && existing.status === "approuve") {
      res.status(409).json({ error: "Votre KYC est déjà approuvé." });
      return;
    }

    if (existing && existing.status === "rejete") {
      await db.delete(kycTable).where(eq(kycTable.userId, userId));
    }

    const frontUrl = `/api/kyc/files/${path.basename(documentFront.path)}`;
    const backUrl = `/api/kyc/files/${path.basename(documentBack.path)}`;
    const selfieUrl = `/api/kyc/files/${path.basename(selfie.path)}`;

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
      documentFrontUrl: frontUrl,
      documentBackUrl: backUrl,
      selfieUrl: selfieUrl,
      status: "en_attente",
    }).returning();

    res.status(201).json({
      message: "KYC soumis avec succès. Le dossier est en cours de vérification.",
      kyc: {
        id: kyc.id,
        status: kyc.status,
        createdAt: kyc.createdAt,
      },
    });
  },
);

export default router;
