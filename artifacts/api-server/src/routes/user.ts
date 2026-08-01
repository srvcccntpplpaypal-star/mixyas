import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";

const router: IRouter = Router();

router.get("/user/me", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur introuvable." });
    return;
  }

  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    country: user.country,
    createdAt: user.createdAt,
  });
});

router.get("/user/wallet", async (req: Request, res: Response): Promise<void> => {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  if (!wallet) {
    res.status(404).json({ error: "Portefeuille introuvable." });
    return;
  }

  res.json({
    userId: wallet.userId,
    balance: parseFloat(wallet.balance),
    currency: wallet.currency,
  });
});

export default router;
