import { Router } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, endorsementsTable, usersTable } from "@workspace/db";

const QUALITIES = ["skills", "serious", "punctual", "expertise", "communication", "leadership"] as const;
type Quality = (typeof QUALITIES)[number];

const QUALITY_LABELS: Record<Quality, { en: string; fr: string }> = {
  skills:        { en: "Skills",         fr: "Compétences" },
  serious:       { en: "Seriousness",    fr: "Sérieux" },
  punctual:      { en: "Punctuality",    fr: "Ponctualité" },
  expertise:     { en: "Expertise",      fr: "Expertise" },
  communication: { en: "Communication", fr: "Communication" },
  leadership:    { en: "Leadership",    fr: "Leadership" },
};

const EndorseBody = z.object({
  candidateId: z.string().min(1),
  quality: z.enum(QUALITIES),
});

const router = Router();

router.get("/nexhire/api/endorsements/:candidateId", async (req, res) => {
  const { candidateId } = req.params;
  if (!candidateId) { res.status(400).json({ error: "candidateId required" }); return; }

  const rows = await db
    .select({
      quality: endorsementsTable.quality,
      count: sql<number>`count(*)::int`,
    })
    .from(endorsementsTable)
    .where(eq(endorsementsTable.candidateId, candidateId))
    .groupBy(endorsementsTable.quality);

  const byQuality: Record<string, number> = {};
  let total = 0;
  for (const r of rows) { byQuality[r.quality] = r.count; total += r.count; }

  const endorsersByQuality: Record<string, { id: string; name: string }[]> = {};
  for (const q of QUALITIES) {
    if (!byQuality[q]) continue;
    const endorsers = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(endorsementsTable)
      .innerJoin(usersTable, eq(endorsementsTable.endorserId, usersTable.id))
      .where(and(eq(endorsementsTable.candidateId, candidateId), eq(endorsementsTable.quality, q)))
      .limit(5);
    endorsersByQuality[q] = endorsers.map(e => ({
      id: e.id,
      name: [e.firstName, e.lastName].filter(Boolean).join(" ") || "Nexhire member",
    }));
  }

  const myEndorsements: string[] = [];
  if (req.user?.id) {
    const mine = await db
      .select({ quality: endorsementsTable.quality })
      .from(endorsementsTable)
      .where(and(eq(endorsementsTable.endorserId, req.user.id), eq(endorsementsTable.candidateId, candidateId)));
    mine.forEach(r => myEndorsements.push(r.quality));
  }

  res.json({ total, byQuality, endorsersByQuality, myEndorsements, labels: QUALITY_LABELS });
});

router.post("/nexhire/api/endorsements", async (req, res) => {
  const uid = req.user?.id;
  if (!uid) { res.status(401).json({ error: "Sign in to endorse" }); return; }

  const parsed = EndorseBody.safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const { candidateId, quality } = parsed.data;
  if (candidateId === uid) { res.status(400).json({ error: "Cannot endorse yourself" }); return; }

  const [candidate] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, candidateId))
    .limit(1);
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  await db
    .insert(endorsementsTable)
    .values({ endorserId: uid, candidateId, quality })
    .onConflictDoNothing({ target: [endorsementsTable.endorserId, endorsementsTable.candidateId, endorsementsTable.quality] });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(endorsementsTable)
    .where(eq(endorsementsTable.candidateId, candidateId));

  res.json({ success: true, total: count });
});

router.delete("/nexhire/api/endorsements/:candidateId/:quality", async (req, res) => {
  const uid = req.user?.id;
  if (!uid) { res.status(401).json({ error: "Sign in required" }); return; }
  const { candidateId, quality } = req.params;
  if (!QUALITIES.includes(quality as Quality)) { res.status(400).json({ error: "Invalid quality" }); return; }

  await db
    .delete(endorsementsTable)
    .where(
      and(
        eq(endorsementsTable.endorserId, uid),
        eq(endorsementsTable.candidateId, candidateId),
        eq(endorsementsTable.quality, quality),
      )
    );

  res.json({ success: true });
});

export default router;
