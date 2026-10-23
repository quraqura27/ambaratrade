import { describe, expect, it } from "vitest";
import { calculateQuotation, offerStatus } from "../src/lib/quotation";
import { quotationSchema } from "../src/lib/schemas";
const base={buyerCompany:"Test Buyer Ltd",buyerContact:"Jane Buyer",buyerEmail:"jane@example.com",destination:"Singapore",items:[{description:"Product A",quantity:"2.5",unit:"kg",unitPrice:"10.1250"},{description:"Product B",quantity:"3",unit:"kg",unitPrice:"5.0000"}],currency:"USD",deliveryTerm:"FOB",deliveryPlace:"Jakarta",paymentTerms:"Bank transfer before release",leadTime:"Four weeks after confirmation",validUntil:"2099-12-31",taxLabel:"Tax",taxRate:"11",qualityNotes:"Inspection before dispatch",inclusions:"Packing",exclusions:"Local import duties",notes:""};
describe("quotation calculation and status",()=>{
  it("calculates multiple products and tax with decimal arithmetic",()=>{const result=calculateQuotation(quotationSchema.parse(base));expect(result.items[0].lineTotal).toBe("25.3125");expect(result.subtotal).toBe("40.3125");expect(result.taxAmount).toBe("4.4344");expect(result.total).toBe("44.7469");});
  it("rejects invalid money or empty commercial terms",()=>{expect(quotationSchema.safeParse({...base,items:[{...base.items[0],unitPrice:"-1"}]}).success).toBe(false);expect(quotationSchema.safeParse({...base,paymentTerms:""}).success).toBe(false);});
  it("keeps a superseded or revoked version invalid even before expiry",()=>{const now=new Date("2026-10-15T12:00:00Z");expect(offerStatus("sent","2026-10-16",now)).toBe("valid");expect(offerStatus("sent","2026-10-14",now)).toBe("expired");expect(offerStatus("superseded","2099-01-01",now)).toBe("superseded");expect(offerStatus("revoked","2099-01-01",now)).toBe("revoked");});
});
