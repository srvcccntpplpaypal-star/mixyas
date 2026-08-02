import { Router, type IRouter } from "express";
import { db, visitsTable } from "@workspace/db";
import { TrackVisitBody } from "@workspace/api-zod";

const router: IRouter = Router();

function detectBrowser(userAgent: string): string | null {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  if (/OPR\//.test(userAgent)) return "Opera";
  if (/SamsungBrowser\//.test(userAgent)) return "Samsung Internet";
  return null;
}

function detectOS(userAgent: string): string | null {
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return null;
}

function detectDevice(userAgent: string): string | null {
  if (/iPhone|iPod/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent)) return "iPad";
  if (/Android/.test(userAgent)) return "Android";
  if (/Mobile/.test(userAgent)) return "Mobile";
  if (/Tablet/.test(userAgent)) return "Tablet";
  return "Desktop";
}

function resolveLocation(req: Parameters<Parameters<typeof router.post>[1]>[0]): string | null {
  const country = (req.headers["cf-ipcountry"] as string | undefined) || (req.headers["x-country-code"] as string | undefined) || (req.headers["x-vercel-ip-country"] as string | undefined);
  if (country) return country;
  return null;
}

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
  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent);
  const device = detectDevice(userAgent);
  const location = resolveLocation(req);

  try {
    await db.insert(visitsTable).values({
      ip,
      page,
      userAgent,
      browser,
      os,
      device,
      location,
      referrer: referrer ?? null,
      userId: userId ?? null,
    });
  } catch (error) {
    req.log.warn({ err: error, page }, "Unable to record analytics event");
  }

  res.json({ success: true, message: null });
});

export default router;
