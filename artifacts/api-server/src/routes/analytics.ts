import { Router, type IRouter } from "express";
import { db, visitsTable } from "@workspace/db";
import { TrackVisitBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/analytics/track", async (req, res): Promise<void> => {
  const parsed = TrackVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page, userAgent, referrer, userId } = parsed.data;

  // Récupérer l'IP réelle (derrière un proxy)
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null;

  await db.insert(visitsTable).values({
    ip,
    page,
    userAgent,
    referrer: referrer ?? null,
    userId: userId ?? null,
  });

  res.json({ success: true, message: null });
});

export default router;
