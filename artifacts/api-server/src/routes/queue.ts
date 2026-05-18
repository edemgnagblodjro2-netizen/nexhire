import { Router } from "express";
import { db, queueSlots, queueBookings, queueConfig } from "@workspace/db";
import { and, eq, lt, sql, count, desc, gte, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendEmailTo } from "../lib/notify";
import { getUncachableStripeClient } from "../stripeClient";
import { verifyTenantJWT, extractBearerToken } from "@workspace/tenant";
import crypto from "crypto";

// ─── Agent auth middleware ───────────────────────────────────────────────────
async function requireAgent(req: any, res: any, next: any) {
  const raw = extractBearerToken(req.headers.authorization);
  if (!raw) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = await verifyTenantJWT(raw);
    req.tenantPayload = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns ISO week key like "2025-W21" for a given date */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Generates a secure random hex token */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── GET /api/queue/slots/:tenantId ─────────────────────────────────────────
// Returns available (non-full, future) slots for a tenant
router.get("/queue/slots/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const now = new Date();

    const slots = await db
      .select()
      .from(queueSlots)
      .where(
        and(
          eq(queueSlots.tenantId, tenantId),
          eq(queueSlots.isActive, true),
          lt(sql`${queueSlots.bookedCount}`, queueSlots.capacity),
          sql`${queueSlots.slotDatetime} > ${now}`
        )
      )
      .orderBy(queueSlots.slotDatetime);

    return res.json({ slots });
  } catch (err) {
    logger.error({ err }, "queue/slots error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/book ───────────────────────────────────────────────────
// Book a slot (anonymous, no account required)
// Rules: max 2 bookings per week per email+tenantId
router.post("/queue/book", async (req, res) => {
  const { tenantId, slotId, citizenName, citizenEmail, citizenPhone } = req.body;

  if (!tenantId || !slotId || !citizenName || !citizenEmail) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    // Check slot availability
    const [slot] = await db
      .select()
      .from(queueSlots)
      .where(and(eq(queueSlots.id, slotId), eq(queueSlots.tenantId, tenantId)))
      .limit(1);

    if (!slot || !slot.isActive) {
      return res.status(404).json({ error: "slot_not_found" });
    }
    if (slot.bookedCount >= slot.capacity) {
      return res.status(409).json({ error: "slot_full" });
    }
    if (slot.slotDatetime <= new Date()) {
      return res.status(410).json({ error: "slot_expired" });
    }

    // Check weekly limit (max 2 active bookings per week per email)
    const weekKey = getWeekKey(new Date());
    const [{ weeklyCount }] = await db
      .select({ weeklyCount: count() })
      .from(queueBookings)
      .where(
        and(
          eq(queueBookings.tenantId, tenantId),
          eq(queueBookings.citizenEmail, citizenEmail.toLowerCase()),
          eq(queueBookings.weekKey, weekKey),
          sql`${queueBookings.status} NOT IN ('cancelled', 'absent', 'completed')`
        )
      );

    if (weeklyCount >= 2) {
      return res.status(429).json({ error: "weekly_limit_reached", message: "Maximum 2 rendez-vous par semaine." });
    }

    // Create booking + increment slot count in a transaction
    const token = generateToken();

    await db.transaction(async (tx) => {
      await tx.insert(queueBookings).values({
        tenantId,
        slotId,
        citizenToken: token,
        citizenName,
        citizenEmail: citizenEmail.toLowerCase(),
        citizenPhone: citizenPhone ?? null,
        weekKey,
        status: "scheduled",
      });

      await tx
        .update(queueSlots)
        .set({ bookedCount: sql`${queueSlots.bookedCount} + 1` })
        .where(eq(queueSlots.id, slotId));
    });

    // Send confirmation email (best-effort)
    const slotTime = new Intl.DateTimeFormat("fr-CA", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
    }).format(new Date(slot.slotDatetime));

    await sendEmailTo(citizenEmail, {
      subject: "Votre rendez-vous est confirmé",
      text: `Bonjour ${citizenName},\n\nVotre rendez-vous est confirmé pour le ${slotTime}.\n\nPour gérer votre rendez-vous (arrivée, annulation, retard) :\n${process.env.QUEUE_BASE_URL ?? "https://attentezero.ca"}/queue/booking/${token}\n\nÀ bientôt !`,
      html: `<p>Bonjour <strong>${citizenName}</strong>,</p>
<p>Votre rendez-vous est confirmé pour le <strong>${slotTime}</strong>.</p>
<p><a href="${process.env.QUEUE_BASE_URL ?? "https://attentezero.ca"}/queue/booking/${token}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Gérer mon rendez-vous</a></p>
<p style="color:#666;font-size:12px">Vous pouvez annuler une seule fois. Maximum 2 rendez-vous par semaine.</p>`,
    });

    return res.status(201).json({ token, bookingId: token });
  } catch (err) {
    logger.error({ err }, "queue/book error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/queue/booking/:token ──────────────────────────────────────────
router.get("/queue/booking/:token", async (req, res) => {
  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });

    const [slot] = await db
      .select()
      .from(queueSlots)
      .where(eq(queueSlots.id, booking.slotId))
      .limit(1);

    // Queue position: count scheduled bookings for same slot before this one
    const [{ position }] = await db
      .select({ position: count() })
      .from(queueBookings)
      .where(
        and(
          eq(queueBookings.slotId, booking.slotId),
          eq(queueBookings.status, "scheduled"),
          sql`${queueBookings.createdAt} < ${booking.createdAt}`
        )
      );

    return res.json({ booking, slot, queuePosition: Number(position) + 1 });
  } catch (err) {
    logger.error({ err }, "queue/booking/:token GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/booking/:token/arrive ──────────────────────────────────
router.post("/queue/booking/:token/arrive", async (req, res) => {
  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });
    if (!["scheduled", "late"].includes(booking.status)) {
      return res.status(409).json({ error: "invalid_status", current: booking.status });
    }

    await db
      .update(queueBookings)
      .set({ status: "arrived", arrivedAt: new Date() })
      .where(eq(queueBookings.id, booking.id));

    return res.json({ ok: true, status: "arrived" });
  } catch (err) {
    logger.error({ err }, "queue/arrive error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/booking/:token/late ────────────────────────────────────
router.post("/queue/booking/:token/late", async (req, res) => {
  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });
    if (booking.status !== "scheduled") {
      return res.status(409).json({ error: "invalid_status", current: booking.status });
    }

    // Get penalty amount from tenant config (default 500 cents = 5$)
    const penaltyAmountCents = 500;

    await db
      .update(queueBookings)
      .set({ status: "late", lateSignaledAt: new Date(), penaltyAmountCents })
      .where(eq(queueBookings.id, booking.id));

    return res.json({ ok: true, status: "late", penaltyAmountCents });
  } catch (err) {
    logger.error({ err }, "queue/late error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/booking/:token/absent ──────────────────────────────────
router.post("/queue/booking/:token/absent", async (req, res) => {
  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });
    if (!["scheduled", "late"].includes(booking.status)) {
      return res.status(409).json({ error: "invalid_status" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(queueBookings)
        .set({ status: "absent" })
        .where(eq(queueBookings.id, booking.id));

      // Free the slot
      await tx
        .update(queueSlots)
        .set({ bookedCount: sql`GREATEST(0, ${queueSlots.bookedCount} - 1)` })
        .where(eq(queueSlots.id, booking.slotId));
    });

    return res.json({ ok: true, status: "absent" });
  } catch (err) {
    logger.error({ err }, "queue/absent error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/booking/:token/cancel ──────────────────────────────────
// Cancellation rules: only 1 cancellation per citizen across all bookings for this tenant this week
router.post("/queue/booking/:token/cancel", async (req, res) => {
  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });
    if (!["scheduled", "late"].includes(booking.status)) {
      return res.status(409).json({ error: "invalid_status", current: booking.status });
    }

    // Check if citizen has already used their 1 cancellation this week
    if (booking.cancellationUsed) {
      return res.status(403).json({
        error: "cancellation_limit_reached",
        message: "Vous avez déjà utilisé votre droit d'annulation pour cette semaine.",
      });
    }

    // Also check other bookings this week for same email
    const [{ priorCancellations }] = await db
      .select({ priorCancellations: count() })
      .from(queueBookings)
      .where(
        and(
          eq(queueBookings.tenantId, booking.tenantId),
          eq(queueBookings.citizenEmail, booking.citizenEmail),
          eq(queueBookings.weekKey, booking.weekKey),
          eq(queueBookings.cancellationUsed, true),
          sql`${queueBookings.id} != ${booking.id}`
        )
      );

    if (priorCancellations > 0) {
      return res.status(403).json({
        error: "cancellation_limit_reached",
        message: "Vous avez déjà utilisé votre droit d'annulation pour cette semaine.",
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(queueBookings)
        .set({ status: "cancelled", cancellationUsed: true, cancelledAt: new Date() })
        .where(eq(queueBookings.id, booking.id));

      // Free the slot dynamically
      await tx
        .update(queueSlots)
        .set({ bookedCount: sql`GREATEST(0, ${queueSlots.bookedCount} - 1)` })
        .where(eq(queueSlots.id, booking.slotId));
    });

    return res.json({ ok: true, status: "cancelled" });
  } catch (err) {
    logger.error({ err }, "queue/cancel error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/booking/:token/reschedule ──────────────────────────────
// Citizen picks next available slot (used after late signal, instead of paying penalty)
router.post("/queue/booking/:token/reschedule", async (req, res) => {
  const { newSlotId } = req.body;
  if (!newSlotId) return res.status(400).json({ error: "missing_fields" });

  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });
    if (!["scheduled", "late"].includes(booking.status)) {
      return res.status(409).json({ error: "invalid_status" });
    }

    // Check new slot availability
    const [newSlot] = await db
      .select()
      .from(queueSlots)
      .where(and(eq(queueSlots.id, newSlotId), eq(queueSlots.tenantId, booking.tenantId)))
      .limit(1);

    if (!newSlot || !newSlot.isActive || newSlot.bookedCount >= newSlot.capacity) {
      return res.status(409).json({ error: "slot_not_available" });
    }

    const newToken = generateToken();

    await db.transaction(async (tx) => {
      // Mark current booking as rescheduled
      await tx
        .update(queueBookings)
        .set({ status: "rescheduled", rescheduledToSlotId: newSlotId })
        .where(eq(queueBookings.id, booking.id));

      // Free old slot
      await tx
        .update(queueSlots)
        .set({ bookedCount: sql`GREATEST(0, ${queueSlots.bookedCount} - 1)` })
        .where(eq(queueSlots.id, booking.slotId));

      // Create new booking with same citizen info
      await tx.insert(queueBookings).values({
        tenantId: booking.tenantId,
        slotId: newSlotId,
        citizenToken: newToken,
        citizenName: booking.citizenName,
        citizenEmail: booking.citizenEmail,
        citizenPhone: booking.citizenPhone,
        weekKey: getWeekKey(new Date()),
        status: "scheduled",
        // Preserve cancellation flag
        cancellationUsed: booking.cancellationUsed,
      });

      // Increment new slot
      await tx
        .update(queueSlots)
        .set({ bookedCount: sql`${queueSlots.bookedCount} + 1` })
        .where(eq(queueSlots.id, newSlotId));
    });

    return res.json({ ok: true, newToken });
  } catch (err) {
    logger.error({ err }, "queue/reschedule error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/booking/:token/pay-penalty ─────────────────────────────
// Create a Stripe Checkout session to pay the late penalty
router.post("/queue/booking/:token/pay-penalty", async (req, res) => {
  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });
    if (booking.status !== "late") {
      return res.status(409).json({ error: "not_late" });
    }
    if (booking.penaltyPaidAt) {
      return res.status(409).json({ error: "already_paid" });
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.QUEUE_BASE_URL ?? "https://attentezero.ca";
    const amount = booking.penaltyAmountCents ?? 500;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "cad",
          unit_amount: amount,
          product_data: { name: "Pénalité de retard — rendez-vous" },
        },
        quantity: 1,
      }],
      metadata: { bookingToken: req.params.token },
      success_url: `${baseUrl}/queue/booking/${req.params.token}?penalty=paid`,
      cancel_url: `${baseUrl}/queue/booking/${req.params.token}?penalty=cancelled`,
    });

    // Save Stripe session ID
    await db
      .update(queueBookings)
      .set({ penaltyStripeSessionId: session.id })
      .where(eq(queueBookings.id, booking.id));

    return res.json({ checkoutUrl: session.url });
  } catch (err) {
    logger.error({ err }, "queue/pay-penalty error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/penalty-webhook ────────────────────────────────────────
// Called by Stripe after penalty payment success (webhook)
router.post("/queue/penalty-webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) return res.status(400).json({ error: "no_sig" });

  try {
    const stripe = await getUncachableStripeClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    const event = stripe.webhooks.constructEvent(req.body, sig, secret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const token = session.metadata?.bookingToken;
      if (token) {
        await db
          .update(queueBookings)
          .set({ penaltyPaidAt: new Date(), status: "scheduled" })
          .where(eq(queueBookings.citizenToken, token));
      }
    }

    return res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "queue/penalty-webhook error");
    return res.status(400).json({ error: "webhook_error" });
  }
});

// ─── GET /api/queue/slots-public (for booking form, by tenant slug) ─────────
router.get("/queue/public-slots", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") {
    return res.status(400).json({ error: "missing_tenantId" });
  }

  try {
    const now = new Date();
    const slots = await db
      .select()
      .from(queueSlots)
      .where(
        and(
          eq(queueSlots.tenantId, tenantId),
          eq(queueSlots.isActive, true),
          sql`${queueSlots.slotDatetime} > ${now}`,
          lt(queueSlots.bookedCount, queueSlots.capacity)
        )
      )
      .orderBy(queueSlots.slotDatetime);

    return res.json({ slots });
  } catch (err) {
    logger.error({ err }, "queue/public-slots error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// KIOSK ROUTES — public, no auth (scan QR code at location)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helper: get or create tenant queue config ────────────────────────────
async function getOrCreateConfig(tenantId: string) {
  const existing = await db.select().from(queueConfig).where(eq(queueConfig.tenantId, tenantId)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(queueConfig).values({ tenantId }).returning();
  return created;
}

// ─── Helper: check if proposed slot fits before closing ──────────────────
function localHHMM(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
  }).format(date).replace("h", ":").padStart(5, "0");
}
function canFitBeforeClosing(now: Date, intervalMin: number, closingTime: string, tz: string): boolean {
  const proposed = new Date(now.getTime() + intervalMin * 60000);
  const proposedHHMM = localHHMM(proposed, tz);
  return proposedHHMM <= closingTime;
}

// ─── GET /api/queue/kiosk/config/:tenantId ───────────────────────────────
// Public — returns tenant queue config (closing time, interval, fee)
router.get("/queue/kiosk/config/:tenantId", async (req, res) => {
  try {
    const cfg = await getOrCreateConfig(req.params.tenantId);
    return res.json({
      closingTime: cfg.closingTime,
      timezone: cfg.timezone,
      serviceIntervalMin: cfg.serviceIntervalMin,
      lateWalkInFeeCents: cfg.lateWalkInFeeCents,
    });
  } catch (err) {
    logger.error({ err }, "queue/kiosk/config error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/kiosk/lookup ────────────────────────────────────────
// Find today's active bookings for a citizen by email OR phone
router.post("/queue/kiosk/lookup", async (req, res) => {
  const { tenantId, contact } = req.body;
  if (!tenantId || !contact) return res.status(400).json({ error: "missing_fields" });

  try {
    const cfg = await getOrCreateConfig(tenantId);
    const tz = cfg.timezone;

    // Today's window in UTC — start of local day to end of local day
    const nowLocal = new Intl.DateTimeFormat("fr-CA", {
      year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz,
    }).format(new Date()); // "YYYY-MM-DD"
    const todayStart = new Date(`${nowLocal}T00:00:00`);
    const todayEnd   = new Date(`${nowLocal}T23:59:59`);

    const contact_lower = contact.toLowerCase().trim();

    const bookings = await db
      .select({
        id:              queueBookings.id,
        citizenToken:    queueBookings.citizenToken,
        status:          queueBookings.status,
        slotId:          queueBookings.slotId,
        cancellationUsed: queueBookings.cancellationUsed,
        penaltyAmountCents: queueBookings.penaltyAmountCents,
        penaltyPaidAt:   queueBookings.penaltyPaidAt,
        slotDatetime:    queueSlots.slotDatetime,
        serviceName:     queueSlots.serviceName,
      })
      .from(queueBookings)
      .leftJoin(queueSlots, eq(queueBookings.slotId, queueSlots.id))
      .where(
        and(
          eq(queueBookings.tenantId, tenantId),
          or(
            eq(queueBookings.citizenEmail, contact_lower),
            eq(queueBookings.citizenPhone, contact.trim()),
          ),
          sql`${queueSlots.slotDatetime} >= ${todayStart}`,
          sql`${queueSlots.slotDatetime} <= ${todayEnd}`,
          sql`${queueBookings.status} NOT IN ('cancelled','absent','completed','rescheduled')`,
        )
      )
      .orderBy(queueSlots.slotDatetime);

    return res.json({
      bookings,
      config: {
        closingTime: cfg.closingTime,
        timezone: cfg.timezone,
        serviceIntervalMin: cfg.serviceIntervalMin,
        lateWalkInFeeCents: cfg.lateWalkInFeeCents,
      },
    });
  } catch (err) {
    logger.error({ err }, "queue/kiosk/lookup error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/kiosk/late-ticket ───────────────────────────────────
// Citizen is late — check if a walk-in slot can be created before closing.
// If yes, returns Stripe checkout URL. If no, returns canFit=false.
router.post("/queue/kiosk/late-ticket", async (req, res) => {
  const { citizenToken } = req.body;
  if (!citizenToken) return res.status(400).json({ error: "missing_fields" });

  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, citizenToken))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });
    if (!["scheduled", "late"].includes(booking.status)) {
      return res.status(409).json({ error: "invalid_status" });
    }

    const cfg = await getOrCreateConfig(booking.tenantId);
    const now = new Date();
    const proposedSlotDatetime = new Date(now.getTime() + cfg.serviceIntervalMin * 60000);

    const canFit = canFitBeforeClosing(now, cfg.serviceIntervalMin, cfg.closingTime, cfg.timezone);

    if (!canFit) {
      // Mark as late (for records) but don't charge
      if (booking.status === "scheduled") {
        await db.update(queueBookings)
          .set({ status: "late", lateSignaledAt: now, penaltyAmountCents: 0 })
          .where(eq(queueBookings.id, booking.id));
      }
      return res.json({ canFit: false, proposedSlotDatetime: proposedSlotDatetime.toISOString() });
    }

    // Mark as late + record penalty
    await db.update(queueBookings)
      .set({ status: "late", lateSignaledAt: now, penaltyAmountCents: cfg.lateWalkInFeeCents })
      .where(eq(queueBookings.id, booking.id));

    // Create Stripe checkout
    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.QUEUE_BASE_URL ?? "https://attentezero.ca";
    const slotTime = new Intl.DateTimeFormat("fr-CA", {
      hour: "2-digit", minute: "2-digit", timeZone: cfg.timezone,
    }).format(proposedSlotDatetime);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "cad",
          unit_amount: cfg.lateWalkInFeeCents,
          product_data: { name: `Ticket retard — créneau ${slotTime}` },
        },
        quantity: 1,
      }],
      metadata: {
        kind: "kiosk_late",
        bookingToken: citizenToken,
        proposedSlotDatetime: proposedSlotDatetime.toISOString(),
        tenantId: booking.tenantId,
      },
      success_url: `${baseUrl}/queue/kiosk-success?token=${citizenToken}`,
      cancel_url: `${baseUrl}/kiosk/${booking.tenantId}`,
    });

    return res.json({
      canFit: true,
      checkoutUrl: session.url,
      proposedSlotDatetime: proposedSlotDatetime.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "queue/kiosk/late-ticket error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/kiosk-payment-webhook ───────────────────────────────
// Stripe webhook for kiosk late ticket payment
router.post("/queue/kiosk-payment-webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) return res.status(400).json({ error: "no_sig" });

  try {
    const stripe = await getUncachableStripeClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET_KIOSK ?? process.env.STRIPE_WEBHOOK_SECRET ?? "";
    const event = stripe.webhooks.constructEvent(req.body, sig, secret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const { kind, bookingToken, proposedSlotDatetime, tenantId } = session.metadata ?? {};

      if (kind !== "kiosk_late" || !bookingToken || !proposedSlotDatetime) {
        return res.json({ received: true });
      }

      // Find original booking
      const [original] = await db
        .select()
        .from(queueBookings)
        .where(eq(queueBookings.citizenToken, bookingToken))
        .limit(1);

      if (!original) { return res.json({ received: true }); }

      const newToken = generateToken();
      const slotDt = new Date(proposedSlotDatetime);

      await db.transaction(async (tx) => {
        // Create walk-in slot at proposed time (capacity 1, walk-in)
        const [newSlot] = await tx.insert(queueSlots).values({
          tenantId,
          serviceName: "Ticket retard (walk-in)",
          slotDatetime: slotDt,
          capacity: 1,
          bookedCount: 1,
          isActive: true,
        }).returning();

        // Create new booking
        await tx.insert(queueBookings).values({
          tenantId,
          slotId: newSlot.id,
          citizenToken: newToken,
          citizenName: original.citizenName,
          citizenEmail: original.citizenEmail,
          citizenPhone: original.citizenPhone,
          weekKey: getWeekKey(slotDt),
          status: "scheduled",
          cancellationUsed: original.cancellationUsed,
          penaltyAmountCents: session.amount_total ?? original.penaltyAmountCents,
          penaltyPaidAt: new Date(),
        });

        // Mark original as rescheduled
        await tx.update(queueBookings)
          .set({ status: "rescheduled", rescheduledToSlotId: newSlot.id })
          .where(eq(queueBookings.id, original.id));

        // Free original slot
        await tx.update(queueSlots)
          .set({ bookedCount: sql`GREATEST(0, ${queueSlots.bookedCount} - 1)` })
          .where(eq(queueSlots.id, original.slotId));
      });

      // Send confirmation email
      const cfg = await getOrCreateConfig(tenantId);
      const slotTimeFmt = new Intl.DateTimeFormat("fr-CA", {
        hour: "2-digit", minute: "2-digit", timeZone: cfg.timezone,
      }).format(slotDt);
      const baseUrl = process.env.QUEUE_BASE_URL ?? "https://attentezero.ca";

      await sendEmailTo(original.citizenEmail, {
        subject: "Votre ticket retard est confirmé",
        text: `Bonjour ${original.citizenName},\n\nVotre ticket retard a été accepté. Votre nouveau créneau est à ${slotTimeFmt}.\n\nGérer votre RDV : ${baseUrl}/rdv/${newToken}`,
        html: `<p>Bonjour <strong>${original.citizenName}</strong>,</p>
<p>Votre paiement a été accepté. Votre nouveau créneau est à <strong>${slotTimeFmt}</strong>.</p>
<p><a href="${baseUrl}/rdv/${newToken}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Voir mon billet →</a></p>`,
      });
    }

    return res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "queue/kiosk-payment-webhook error");
    return res.status(400).json({ error: "webhook_error" });
  }
});

// ─── GET /api/queue/booking/:token/siblings ─────────────────────────────────
// Returns all active bookings for the same citizen (same email + tenantId)
// Uses the token to identify the citizen — never exposes the email in the URL
router.get("/queue/booking/:token/siblings", async (req, res) => {
  try {
    const [booking] = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.citizenToken, req.params.token))
      .limit(1);

    if (!booking) return res.status(404).json({ error: "not_found" });

    // Load all bookings for same email + tenant (including current)
    const siblings = await db
      .select({
        id: queueBookings.id,
        citizenToken: queueBookings.citizenToken,
        status: queueBookings.status,
        slotId: queueBookings.slotId,
        cancellationUsed: queueBookings.cancellationUsed,
        penaltyAmountCents: queueBookings.penaltyAmountCents,
        penaltyPaidAt: queueBookings.penaltyPaidAt,
        createdAt: queueBookings.createdAt,
        // slot details joined
        slotDatetime: queueSlots.slotDatetime,
        serviceName: queueSlots.serviceName,
      })
      .from(queueBookings)
      .leftJoin(queueSlots, eq(queueBookings.slotId, queueSlots.id))
      .where(
        and(
          eq(queueBookings.tenantId, booking.tenantId),
          eq(queueBookings.citizenEmail, booking.citizenEmail),
        )
      )
      .orderBy(queueSlots.slotDatetime);

    return res.json({ siblings });
  } catch (err) {
    logger.error({ err }, "queue/booking/siblings error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT ROUTES — require JWT Bearer token
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/queue/agent/slots ─────────────────────────────────────────────
// List all slots for the agent's tenant (including past, with booking counts)
router.get("/queue/agent/slots", requireAgent, async (req, res) => {
  try {
    const tenantId = (req as any).tenantPayload.tenantId;
    const { from, to } = req.query;

    const conditions = [eq(queueSlots.tenantId, tenantId)];
    if (from) conditions.push(gte(queueSlots.slotDatetime, new Date(from as string)));
    if (to)   conditions.push(lt(queueSlots.slotDatetime, new Date(to as string)));

    const slots = await db
      .select()
      .from(queueSlots)
      .where(and(...conditions))
      .orderBy(desc(queueSlots.slotDatetime));

    return res.json({ slots });
  } catch (err) {
    logger.error({ err }, "queue/agent/slots GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/queue/agent/slots ────────────────────────────────────────────
// Create one or multiple slots
router.post("/queue/agent/slots", requireAgent, async (req, res) => {
  const tenantId = (req as any).tenantPayload.tenantId;
  const { slotDatetime, capacity, serviceName, repeat, repeatCount } = req.body;

  if (!slotDatetime || !capacity) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const base = new Date(slotDatetime);
    const slots: any[] = [];

    const count = repeat && repeatCount > 1 ? Math.min(repeatCount, 60) : 1;
    const intervalMin = req.body.intervalMin ?? 30;

    for (let i = 0; i < count; i++) {
      const dt = new Date(base.getTime() + i * intervalMin * 60000);
      slots.push({
        tenantId,
        serviceName: serviceName ?? "Service principal",
        slotDatetime: dt,
        capacity: Number(capacity),
      });
    }

    const created = await db.insert(queueSlots).values(slots).returning();
    return res.status(201).json({ slots: created });
  } catch (err) {
    logger.error({ err }, "queue/agent/slots POST error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── DELETE /api/queue/agent/slots/:id ──────────────────────────────────────
router.delete("/queue/agent/slots/:id", requireAgent, async (req, res) => {
  const tenantId = (req as any).tenantPayload.tenantId;
  try {
    const [slot] = await db.select().from(queueSlots).where(eq(queueSlots.id, req.params.id)).limit(1);
    if (!slot || slot.tenantId !== tenantId) return res.status(404).json({ error: "not_found" });

    // Soft-delete: deactivate
    await db.update(queueSlots).set({ isActive: false }).where(eq(queueSlots.id, req.params.id));
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "queue/agent/slots DELETE error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/queue/agent/slots/:id/bookings ────────────────────────────────
router.get("/queue/agent/slots/:id/bookings", requireAgent, async (req, res) => {
  const tenantId = (req as any).tenantPayload.tenantId;
  try {
    const [slot] = await db.select().from(queueSlots).where(eq(queueSlots.id, req.params.id)).limit(1);
    if (!slot || slot.tenantId !== tenantId) return res.status(404).json({ error: "not_found" });

    const bookings = await db
      .select()
      .from(queueBookings)
      .where(eq(queueBookings.slotId, req.params.id))
      .orderBy(queueBookings.createdAt);

    return res.json({ slot, bookings });
  } catch (err) {
    logger.error({ err }, "queue/agent/bookings GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── PATCH /api/queue/agent/bookings/:id/status ──────────────────────────────
// Agent updates booking status (call citizen, mark served, mark absent, etc.)
router.patch("/queue/agent/bookings/:id/status", requireAgent, async (req, res) => {
  const tenantId = (req as any).tenantPayload.tenantId;
  const { status } = req.body;

  const VALID = ["scheduled", "arrived", "called", "served", "late", "absent", "cancelled", "completed"];
  if (!VALID.includes(status)) return res.status(400).json({ error: "invalid_status" });

  try {
    const [booking] = await db.select().from(queueBookings).where(eq(queueBookings.id, req.params.id)).limit(1);
    if (!booking || booking.tenantId !== tenantId) return res.status(404).json({ error: "not_found" });

    const updates: Record<string, any> = { status };
    if (status === "arrived") updates.arrivedAt = new Date();
    if (status === "cancelled") { updates.cancelledAt = new Date(); }

    // If agent marks as absent/cancelled → free the slot
    if (["absent", "cancelled"].includes(status)) {
      await db.transaction(async (tx) => {
        await tx.update(queueBookings).set(updates).where(eq(queueBookings.id, booking.id));
        await tx.update(queueSlots)
          .set({ bookedCount: sql`GREATEST(0, ${queueSlots.bookedCount} - 1)` })
          .where(eq(queueSlots.id, booking.slotId));
      });
    } else {
      await db.update(queueBookings).set(updates).where(eq(queueBookings.id, booking.id));
    }

    return res.json({ ok: true, status });
  } catch (err) {
    logger.error({ err }, "queue/agent/bookings PATCH error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/queue/agent/config ─────────────────────────────────────────────
router.get("/queue/agent/config", requireAgent, async (req, res) => {
  const tenantId = (req as any).tenantPayload.tenantId;
  try {
    const cfg = await getOrCreateConfig(tenantId);
    return res.json({ config: cfg });
  } catch (err) {
    logger.error({ err }, "queue/agent/config GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── PUT /api/queue/agent/config ─────────────────────────────────────────────
router.put("/queue/agent/config", requireAgent, async (req, res) => {
  const tenantId = (req as any).tenantPayload.tenantId;
  const { closingTime, serviceIntervalMin, lateWalkInFeeCents, timezone } = req.body;
  try {
    const existing = await db.select().from(queueConfig).where(eq(queueConfig.tenantId, tenantId)).limit(1);
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (closingTime)          updates.closingTime = closingTime;
    if (serviceIntervalMin)   updates.serviceIntervalMin = Number(serviceIntervalMin);
    if (lateWalkInFeeCents)   updates.lateWalkInFeeCents = Number(lateWalkInFeeCents);
    if (timezone)             updates.timezone = timezone;

    if (existing[0]) {
      await db.update(queueConfig).set(updates).where(eq(queueConfig.tenantId, tenantId));
    } else {
      await db.insert(queueConfig).values({ tenantId, ...updates });
    }
    const cfg = await getOrCreateConfig(tenantId);
    return res.json({ config: cfg });
  } catch (err) {
    logger.error({ err }, "queue/agent/config PUT error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/queue/agent/stats ─────────────────────────────────────────────
// Dashboard stats for agent home
router.get("/queue/agent/stats", requireAgent, async (req, res) => {
  const tenantId = (req as any).tenantPayload.tenantId;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    // Slots today
    const todaySlots = await db.select().from(queueSlots).where(
      and(
        eq(queueSlots.tenantId, tenantId),
        gte(queueSlots.slotDatetime, today),
        lt(queueSlots.slotDatetime, tomorrow),
      )
    );
    const slotIds = todaySlots.map(s => s.id);

    let todayBookings: any[] = [];
    if (slotIds.length > 0) {
      todayBookings = await db.select().from(queueBookings).where(
        and(eq(queueBookings.tenantId, tenantId), sql`${queueBookings.slotId} = ANY(${sql`ARRAY[${sql.join(slotIds.map(id => sql`${id}`), sql`,`)}]::text[]`})`)
      );
    }

    const stats = {
      slotsToday: todaySlots.length,
      bookedToday: todayBookings.length,
      arrivedToday: todayBookings.filter(b => ["arrived", "completed"].includes(b.status)).length,
      lateToday: todayBookings.filter(b => b.status === "late").length,
      cancelledToday: todayBookings.filter(b => b.status === "cancelled").length,
      absentToday: todayBookings.filter(b => b.status === "absent").length,
    };

    return res.json({ stats });
  } catch (err) {
    logger.error({ err }, "queue/agent/stats error");
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;

