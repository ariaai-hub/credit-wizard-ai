export type PlanKey = "starter" | "growth" | "scale";

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  includedTokens: number;
  staffSeatLimit: number;
  notes: string;
};

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "starter",
    name: "Starter",
    monthlyPrice: 299,
    includedTokens: 150,
    staffSeatLimit: 3,
    notes: "Best for smaller credit repair teams that need automated intake, reminders, and dispute generation without a heavy software bill.",
  },
  {
    key: "growth",
    name: "Growth",
    monthlyPrice: 599,
    includedTokens: 400,
    staffSeatLimit: 10,
    notes: "Best default plan. Enough token volume and staff capacity for a real operating team.",
  },
  {
    key: "scale",
    name: "Scale",
    monthlyPrice: 999,
    includedTokens: 900,
    staffSeatLimit: 25,
    notes: "For larger teams with higher dispute volume and more internal operators.",
  },
];

export const TOKEN_ACTION_COSTS = {
  LETTER_GENERATION: 5,
  FUNDING_RECOMMENDATION: 2,
} as const;

export const MAIL_CHARGE_RULES = {
  REGULAR_MAIL: 4,
  CERTIFIED_MAIL: 10,
  billingCadence: "weekly",
  tokenBased: false,
} as const;

export const TOKEN_PACKS = [
  {
    name: "100 token pack",
    tokens: 100,
    price: 249,
  },
  {
    name: "300 token pack",
    tokens: 300,
    price: 699,
  },
  {
    name: "1000 token pack",
    tokens: 1000,
    price: 1990,
  },
] as const;

export const BILLING_RULES = {
  graceDays: 7,
  currentWorkflowsContinueDuringGrace: true,
  newTokenConsumingActionsAllowedDuringGrace: false,
  readOnlyDuringGrace: true,
  lockAfterGrace: true,
} as const;

export function getPlanDefinition(planKey: string) {
  return PLAN_DEFINITIONS.find((plan) => plan.key === planKey);
}

export function getEffectiveTokenValue(plan: PlanDefinition) {
  return Number((plan.monthlyPrice / plan.includedTokens).toFixed(2));
}
