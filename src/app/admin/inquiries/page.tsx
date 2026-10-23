import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
export default async function Inquiries(){await requireStaff();const db=getServiceClient();const {data:items}=await db.from("inquiries").select("id,reference,buyer_name,company,product_name,status,created_at").order("created_at",{ascending:false}).limit(100);return <main><h1>Inquiries</h1><p>Every submitted inquiry has a reference and a follow-up history.</p><div className="admin-list">{items?.map(x=><Link key={x.id} href={`/admin/inquiries/${x.id}`}><strong>{x.reference} · {x.company}</strong><span>{x.product_name} · {x.status} · {new Date(x.created_at).toLocaleDateString("en-GB")}</span></Link>)}</div></main>}
