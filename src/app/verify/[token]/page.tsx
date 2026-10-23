import type { Metadata } from "next";
import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { formatMoney, offerStatus } from "@/lib/quotation";
import { PdfChecker } from "@/components/pdf-checker";
import type { QuotationInput } from "@/lib/schemas";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Verify quotation | Ambara GlobalTrade",robots:{index:false,follow:false}};
export default async function Verify({params}:{params:Promise<{token:string}>}){const {token}=await params;if(!/^[A-Za-z0-9_-]{40,50}$/.test(token))notFound();const hash=createHash("sha256").update(token).digest("hex");const db=getServiceClient();const {data:v}=await db.from("quotation_versions").select("status,version_number,approved_at,pdf_sha256,total,currency,document,quotations(reference)").eq("verification_token_hash",hash).single();if(!v||!["approved_unsent","sent","superseded","revoked"].includes(v.status))notFound();const d=v.document as QuotationInput;const q=Array.isArray(v.quotations)?v.quotations[0]:v.quotations;const status=offerStatus(v.status,d.validUntil);return <main className="verify-page"><div className="verify-card"><Link href="/" className="brand">AMBARA GLOBALTRADE</Link><p className="eyebrow">DOCUMENT VERIFICATION</p><h1>Commercial quotation</h1><p className={`verify-status status-${status}`}>{status.toUpperCase()}</p><dl className="admin-dl"><div><dt>Issuer</dt><dd>PT Ambara Artha Globaltrade</dd></div><div><dt>Quotation</dt><dd>{q?.reference}</dd></div><div><dt>Version</dt><dd>{v.version_number}</dd></div><div><dt>Issue date</dt><dd>{v.approved_at?.slice(0,10)}</dd></div><div><dt>Buyer</dt><dd>{d.buyerCompany} · {d.buyerContact}</dd></div><div><dt>Currency</dt><dd>{v.currency}</dd></div><div><dt>Total</dt><dd>{formatMoney(String(v.total),v.currency)}</dd></div><div><dt>Valid until</dt><dd>{d.validUntil}</dd></div></dl><p>This page reports the current status of the numbered, approved version. Confirm all commercial terms in the PDF itself.</p>{v.pdf_sha256&&<PdfChecker expected={v.pdf_sha256}/>}</div></main>}
