import { Router, type IRouter, type Request, type Response } from "express";
import { db, affiliatesTable, affiliateClicksTable, usersTable, depositsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { isAdminRequest } from "../middleware/auth";
import { z } from "zod";

const router: IRouter = Router();

// ─── Génère un code affilié unique (6 caractères) ─────────────────────────
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Admin: lister les affiliés ───────────────────────────────────────────
router.get("/affiliates", async (req: Request, res: Response): Promise<void> => {
  if (!isAdminRequest(req)) { res.status(403).json({ error: "Accès refusé." }); return; }

  const affiliates = await db.select().from(affiliatesTable).orderBy(sql`${affiliatesTable.createdAt} DESC`);

  const clickCounts = await db
    .select({ affiliateCode: affiliateClicksTable.affiliateCode, totalClicks: count() })
    .from(affiliateClicksTable)
    .groupBy(affiliateClicksTable.affiliateCode);

  const userCounts = await db
    .select({ referredByCode: usersTable.referredByCode, totalUsers: count() })
    .from(usersTable)
    .where(sql`${usersTable.referredByCode} IS NOT NULL`)
    .groupBy(usersTable.referredByCode);

  const payments = await db
    .select({ referredByCode: usersTable.referredByCode, totalPayments: count() })
    .from(usersTable)
    .leftJoin(depositsTable, eq(depositsTable.userId, usersTable.id))
    .where(sql`${usersTable.referredByCode} IS NOT NULL AND ${depositsTable.status} = 'confirme'`)
    .groupBy(usersTable.referredByCode);

  const affiliatesWithStats = affiliates.map((aff) => ({
    ...aff,
    totalClicks: clickCounts.find((c) => c.affiliateCode === aff.code)?.totalClicks ?? 0,
    totalUsers: userCounts.find((u) => u.referredByCode === aff.code)?.totalUsers ?? 0,
    totalPayments: payments.find((p) => p.referredByCode === aff.code)?.totalPayments ?? 0,
  }));

  res.json(affiliatesWithStats);
});

// ─── Admin: créer un affilié ───────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(2, "Nom requis (min 2 caractères)"),
  phone: z.string().min(6, "Numéro requis"),
});

router.post("/affiliates", async (req: Request, res: Response): Promise<void> => {
  if (!isAdminRequest(req)) { res.status(403).json({ error: "Accès refusé." }); return; }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0]?.message }); return; }

  // Générer un code unique
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select({ id: affiliatesTable.id }).from(affiliatesTable).where(eq(affiliatesTable.code, code));
    if (existing.length === 0) break;
    code = generateCode();
    attempts++;
  }

  const [affiliate] = await db.insert(affiliatesTable).values({
    name: parsed.data.name,
    phone: parsed.data.phone,
    code,
  }).returning();

  res.status(201).json({ ...affiliate, link: `/ref/${code}` });
});

// ─── Admin: désactiver un affilié ─────────────────────────────────────────
router.patch("/affiliates/:id/toggle", async (req: Request, res: Response): Promise<void> => {
  if (!isAdminRequest(req)) { res.status(403).json({ error: "Accès refusé." }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [aff] = await db.select().from(affiliatesTable).where(eq(affiliatesTable.id, id));
  if (!aff) { res.status(404).json({ error: "Affilié introuvable." }); return; }
  await db.update(affiliatesTable).set({ isActive: !aff.isActive }).where(eq(affiliatesTable.id, id));
  res.json({ ok: true, isActive: !aff.isActive });
});

// ─── Public: tracker un clic sur lien affilié ─────────────────────────────
router.post("/affiliates/click/:code", async (req: Request, res: Response): Promise<void> => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const [aff] = await db.select({ id: affiliatesTable.id, isActive: affiliatesTable.isActive })
    .from(affiliatesTable).where(eq(affiliatesTable.code, code));
  if (!aff || !aff.isActive) { res.status(404).json({ error: "Lien invalide." }); return; }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "inconnu";
  const ua = req.headers["user-agent"] || "inconnu";

  await db.insert(affiliateClicksTable).values({ affiliateCode: code, ip, userAgent: ua });
  res.json({ ok: true });
});

// ─── Tableau de bord affilié ───────────────────────────────────────────────
router.get("/affiliates/dashboard/:code", async (req: Request, res: Response): Promise<void> => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const [aff] = await db.select().from(affiliatesTable).where(eq(affiliatesTable.code, code));
  if (!aff || !aff.isActive) { res.status(404).json({ error: "Code affilié invalide." }); return; }

  // Clics totaux
  const [clicksRow] = await db.select({ total: count() }).from(affiliateClicksTable)
    .where(eq(affiliateClicksTable.affiliateCode, code));

  // Utilisateurs inscrits via ce code
  const users = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.referredByCode, code));

  // Paiements confirmés d'utilisateurs inscrits via ce code
  const userIds = users.map(u => u.id);
  let payments = 0;
  if (userIds.length > 0) {
    const [payRow] = await db.select({ total: count() }).from(depositsTable)
      .where(sql`${depositsTable.userId} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]) AND ${depositsTable.status} = 'confirme'`);
    payments = payRow?.total ?? 0;
  }

  // Clics des 7 derniers jours
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [recentClicks] = await db.select({ total: count() }).from(affiliateClicksTable)
    .where(sql`${affiliateClicksTable.affiliateCode} = ${code} AND ${affiliateClicksTable.createdAt} >= ${sevenDaysAgo}`);

  res.json({
    affiliate: { name: aff.name, phone: aff.phone, code: aff.code, createdAt: aff.createdAt },
    stats: {
      totalClicks: clicksRow.total,
      recentClicks: recentClicks.total,
      totalUsers: users.length,
      totalPayments: payments,
    },
    users: users.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      joinedAt: u.createdAt,
    })),
  });
});

export default router;
