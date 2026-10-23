import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
vi.mock("server-only",()=>({}));
import { createQuotationPdf } from "../src/lib/quote-pdf";
import { calculateQuotation } from "../src/lib/quotation";
import { quotationSchema } from "../src/lib/schemas";
const seller={legal_name:"PT Ambara Artha Globaltrade",registered_address:"Jakarta, Indonesia",registration_number:"TEST-123",tax_number:"TEST-456",business_email:"hello@ambaratrade.com",telephone:"+62 857 7677 1577"};
const doc=calculateQuotation(quotationSchema.parse({buyerCompany:"Buyer Company",buyerContact:"Jane Doe",buyerEmail:"jane@example.com",destination:"Singapore",items:[{description:"Ready-to-fry beef skin crackers",quantity:"100",unit:"kg",unitPrice:"4.20"}],currency:"USD",deliveryTerm:"FOB",deliveryPlace:"Jakarta",paymentTerms:"Bank transfer before shipment",leadTime:"Three weeks after confirmation",validUntil:"2099-12-31",taxLabel:"Tax",taxRate:"0",qualityNotes:"Inspection before shipment",inclusions:"Packing",exclusions:"Import duties",notes:""}));
describe("approved quotation PDF",()=>{it("creates a readable PDF with an embedded verification code",async()=>{const bytes=await createQuotationPdf({seller,reference:"AGT-Q-2099-000001",version:1,approvedAt:"2099-01-01T00:00:00Z",document:doc,verificationUrl:"https://ambaratrade.com/verify/"+"A".repeat(43)});expect(bytes.subarray(0,5).toString()).toBe("%PDF-");const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBeGreaterThan(0);expect(bytes.length).toBeGreaterThan(10000);});});
