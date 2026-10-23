import Decimal from "decimal.js";
import type { QuotationInput } from "./schemas";

export type CalculatedItem = QuotationInput["items"][number] & {
  lineTotal: string;
};

export type CalculatedQuotation = Omit<QuotationInput, "items"> & {
  items: CalculatedItem[];
  subtotal: string;
  taxAmount: string;
  total: string;
};

export function calculateQuotation(input: QuotationInput): CalculatedQuotation {
  const items = input.items.map((item) => {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    if (!quantity.isFinite() || quantity.lte(0) || !unitPrice.isFinite() || unitPrice.lt(0)) {
      throw new Error("Quantity and price must be valid positive numbers.");
    }
    return {
      ...item,
      lineTotal: quantity.mul(unitPrice).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4),
    };
  });
  const subtotal = items.reduce((sum, item) => sum.plus(item.lineTotal), new Decimal(0));
  const taxAmount = subtotal.mul(input.taxRate).div(100).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  return {
    ...input,
    items,
    subtotal: subtotal.toFixed(4),
    taxAmount: taxAmount.toFixed(4),
    total: subtotal.plus(taxAmount).toFixed(4),
  };
}

export function formatMoney(amount: string, currency: string): string {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency })
    .resolvedOptions().maximumFractionDigits ?? 2;
  const rounded = new Decimal(amount).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  return `${currency} ${new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rounded.toNumber())}`;
}

export function offerStatus(
  status: string,
  validUntil: string,
  now = new Date(),
): "valid" | "expired" | "superseded" | "revoked" {
  if (status === "revoked") return "revoked";
  if (status === "superseded") return "superseded";
  return validUntil < now.toISOString().slice(0, 10) ? "expired" : "valid";
}
