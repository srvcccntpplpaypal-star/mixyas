import { Router, type IRouter, type Request, type Response } from "express";
import { db, siteCommentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { isAdminRequest } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();

const commentSchema = z.object({
  authorName: z.string().min(2),
  role: z.string().min(1).optional(),
  avatarInitials: z.string().min(1).optional(),
  content: z.string().min(3),
  isActive: z.boolean().optional(),
});

router.get("/comments", async (_req: Request, res: Response): Promise<void> => {
  const comments = await db
    .select()
    .from(siteCommentsTable)
    .where(eq(siteCommentsTable.isActive, true))
    .orderBy(sql`${siteCommentsTable.createdAt} DESC`);

  res.json(comments);
});

router.get("/admin/comments", async (req: Request, res: Response): Promise<void> => {
  if (!isAdminRequest(req)) {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const comments = await db
    .select()
    .from(siteCommentsTable)
    .orderBy(sql`${siteCommentsTable.createdAt} DESC`);

  res.json(comments);
});

router.post("/admin/comments", async (req: Request, res: Response): Promise<void> => {
  if (!isAdminRequest(req)) {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [comment] = await db.insert(siteCommentsTable).values({
    authorName: parsed.data.authorName,
    role: parsed.data.role ?? "Client",
    avatarInitials: parsed.data.avatarInitials ?? parsed.data.authorName.slice(0, 2).toUpperCase(),
    content: parsed.data.content,
    isActive: parsed.data.isActive ?? true,
  }).returning();

  res.status(201).json(comment);
});

router.patch("/admin/comments/:id", async (req: Request, res: Response): Promise<void> => {
  if (!isAdminRequest(req)) {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID invalide." });
    return;
  }

  const parsed = commentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(siteCommentsTable)
    .set(parsed.data)
    .where(eq(siteCommentsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Commentaire introuvable." });
    return;
  }

  res.json(updated);
});

router.delete("/admin/comments/:id", async (req: Request, res: Response): Promise<void> => {
  if (!isAdminRequest(req)) {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID invalide." });
    return;
  }

  const [deleted] = await db.delete(siteCommentsTable).where(eq(siteCommentsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Commentaire introuvable." });
    return;
  }

  res.json({ success: true, id });
});

export default router;
