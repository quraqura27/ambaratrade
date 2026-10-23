import { z } from "zod";

export const inquirySchema = z.object({
  buyerName: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  whatsapp: z.string().trim().max(40).optional().default(""),
  productId: z.uuid().nullable().optional(),
  customProduct: z.string().trim().max(180).optional().default(""),
  destination: z.string().trim().min(2).max(180),
  quantity: z.string().trim().min(1).max(120),
  requirements: z.string().trim().max(4000).optional().default(""),
  privacyAccepted: z.literal(true),
  website: z.string().max(0).optional().default(""),
}).refine((value) => Boolean(value.productId || value.customProduct), {
  message: "Choose a product or describe the commodity you need.",
  path: ["customProduct"],
});

export const specificationSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(300),
});

export const productSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(20).max(300),
  description: z.string().trim().min(40).max(3000),
  productForm: z.string().trim().max(160).optional().default(""),
  species: z.string().trim().max(100).optional().default(""),
  originCountry: z.string().trim().max(100).optional().default(""),
  packaging: z.string().trim().max(300).optional().default(""),
  minimumOrder: z.string().trim().max(160).optional().default(""),
  specifications: z.array(specificationSchema).max(30).default([]),
  qualitySummary: z.string().trim().max(700).optional().default(""),
});

const moneyString = z.string().trim().regex(/^\d{1,12}(?:\.\d{1,4})?$/);

export const quoteItemSchema = z.object({
  productId: z.uuid().nullable().optional(),
  description: z.string().trim().min(3).max(500),
  quantity: moneyString,
  unit: z.string().trim().min(1).max(40),
  unitPrice: moneyString,
});

export const quotationSchema = z.object({
  buyerCompany: z.string().trim().min(2).max(160),
  buyerContact: z.string().trim().min(2).max(120),
  buyerEmail: z.email().max(254),
  destination: z.string().trim().min(2).max(180),
  items: z.array(quoteItemSchema).min(1).max(30),
  currency: z.string().regex(/^[A-Z]{3}$/),
  deliveryTerm: z.string().trim().min(2).max(80),
  deliveryPlace: z.string().trim().min(2).max(180),
  paymentTerms: z.string().trim().min(3).max(500),
  leadTime: z.string().trim().min(2).max(300),
  validUntil: z.iso.date(),
  taxLabel: z.string().trim().max(80).optional().default("Tax"),
  taxRate: z.string().trim().regex(/^\d{1,2}(?:\.\d{1,2})?$|^100(?:\.0{1,2})?$/),
  qualityNotes: z.string().trim().max(1200).optional().default(""),
  inclusions: z.string().trim().max(1200).optional().default(""),
  exclusions: z.string().trim().max(1200).optional().default(""),
  notes: z.string().trim().max(1200).optional().default(""),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type QuotationInput = z.infer<typeof quotationSchema>;
