import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
export default async function Quotes(){await requireStaff();const {data}=await getServiceClient().from("quotation_versions").select("id,version_number,status,total,currency,created_at,quotations(reference)").order("created_at",{ascending:false}).limit(100);return <main><h1>Quotations</h1><p>Drafts need owner approval before a PDF is issued or emailed.</p><div className="admin-list">{data?.map(v=>{const q=Array.isArray(v.quotations)?v.quotations[0]:v.quotations;return <Link href={`/admin/quotes/${v.id}`} key={v.id}><strong>{q?.reference} · v{v.version_number}</strong><span>{v.status} · {v.currency} {v.total}</span></Link>})}</div></main>}
