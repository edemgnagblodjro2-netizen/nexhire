import { useMemo } from "react";

import { useAuth } from "@/lib/auth";
import {
  getPlan,
  isUnlimited,
  nextPlan,
  normalizePlan,
  type PlanId,
  type PlanLimits,
} from "@/lib/planLimits";

export interface PlanGateResult {
  plan: PlanLimits;
  planId: PlanId;
  upgradePlanId: PlanId | null;
  isPaid: boolean;
  isUnlimitedClients: boolean;
  isUnlimitedAppointments: boolean;
  /**
   * Returns true if the user can perform the action (current count < limit).
   * Use this BEFORE allowing creation of clients, appointments, team members, etc.
   */
  canCreateClient: (currentCount: number) => boolean;
  canCreateAppointment: (currentMonthCount: number) => boolean;
  canInviteTeamMember: (currentTeamSize: number) => boolean;
  canSendChat: (todayCount: number) => boolean;
  canAddFavorite: (currentCount: number) => boolean;
  /** True if the limit was reached on the very next action. */
  remainingClients: (currentCount: number) => number;
  remainingAppointments: (currentMonthCount: number) => number;
  remainingTeamSeats: (currentTeamSize: number) => number;
}

export function usePlanGate(): PlanGateResult {
  const { user } = useAuth();

  return useMemo(() => {
    const planId = normalizePlan(user?.plan ?? null, user?.isPremium);
    const plan = getPlan(planId);
    const upgradePlanId = nextPlan(planId);

    const remaining = (limit: number, used: number): number => {
      if (isUnlimited(limit)) return Number.POSITIVE_INFINITY;
      return Math.max(0, limit - used);
    };

    return {
      plan,
      planId,
      upgradePlanId,
      isPaid: planId !== "free",
      isUnlimitedClients: isUnlimited(plan.features.maxClients),
      isUnlimitedAppointments: isUnlimited(plan.features.maxAppointmentsPerMonth),
      canCreateClient: (n) =>
        isUnlimited(plan.features.maxClients) || n < plan.features.maxClients,
      canCreateAppointment: (n) =>
        isUnlimited(plan.features.maxAppointmentsPerMonth) ||
        n < plan.features.maxAppointmentsPerMonth,
      canInviteTeamMember: (n) =>
        isUnlimited(plan.features.maxTeamMembers) || n < plan.features.maxTeamMembers,
      canSendChat: (n) =>
        isUnlimited(plan.features.chatPerDay) || n < plan.features.chatPerDay,
      canAddFavorite: (n) =>
        isUnlimited(plan.features.maxFavorites) || n < plan.features.maxFavorites,
      remainingClients: (n) => remaining(plan.features.maxClients, n),
      remainingAppointments: (n) =>
        remaining(plan.features.maxAppointmentsPerMonth, n),
      remainingTeamSeats: (n) => remaining(plan.features.maxTeamMembers, n),
    };
  }, [user?.isPremium, (user as any)?.plan]);
}
