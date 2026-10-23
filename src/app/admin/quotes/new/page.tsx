import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { QuoteEditor } from "@/components/quote-editor";
import type { QuotationInput } from "@/lib/schemas";
export default async function NewQuote({searchParams}:{searchParams:Promise<{inquiry?:string}>}){await requireStaff();const {inquiry}=await searchParams;if(!inquiry)notFound();const {data:q}=await getServiceClient().from("inquiries").select("*").eq("id",inquiry).single();if(!q)notFound();const initial:QuotationInput={buyerCompany:q.company,buyerContact:q.buyer_name,buyerEmail:q.email,destination:q.destination,items:[{productId:q.product_id,description:q.product_name,quantity:"1",unit:"kg",unitPrice:"0"}],currency:"USD",deliveryTerm:"FOB",deliveryPlace:"",paymentTerms:"",leadTime:"",validUntil:"",taxLabel:"Tax",taxRate:"0",qualityNotes:"",inclusions:"",exclusions:"",notes:""};return <main><Link href={`/admin/inquiries/${inquiry}`}>← Inquiry {q.reference}</Link><h1>New quotation</h1><p>Enter confirmed availability, price, quality basis, and delivery terms for this offer.</p><section className="admin-card"><QuoteEditor inquiryId={inquiry} initial={initial}/></section></main>}
