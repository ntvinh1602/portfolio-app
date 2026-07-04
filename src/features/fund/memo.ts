export const CASHFLOW = {
  deposit: ["Cash deposit", "EPF monthly contribution", "Reconciliation"],
  withdraw: ["Reconciliation", "Cash withdrawal"],
  income: [
    "CASA balance interest",
    "EPF dividend",
    "Cash dividend from stock",
    "Other reward/income",
    "Loyalty program rewards",
  ],
  expense: [
    "Margin interest",
    "Cash advance interest",
    "Operational fees",
  ],
} as const