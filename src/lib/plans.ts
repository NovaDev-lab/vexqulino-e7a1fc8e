export const PLANS = [
  { id: "free", name: "Free", monthly: 0, yearly: 0, limit: "100 prompts a day" },
  { id: "pro", name: "Pro", monthly: 50, yearly: 500, limit: "1,000 prompts a day" },
  { id: "ultimate", name: "Ultimate", monthly: 100, yearly: 1000, limit: "Unlimited prompts" },
] as const;
