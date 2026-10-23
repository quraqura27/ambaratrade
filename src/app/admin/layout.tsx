import Link from "next/link";
import { getStaff } from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}) {
  const staff=await getStaff().catch(()=>null);
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="admin-brand" href="/admin">AMBARA <span>GLOBALTRADE</span></Link>{staff&&<><nav><Link href="/admin">Overview</Link><Link href="/admin/products">Products</Link><Link href="/admin/inquiries">Inquiries</Link><Link href="/admin/quotes">Quotations</Link>{staff.role==="owner"&&<><Link href="/admin/team">Team</Link><Link href="/admin/settings">Settings</Link></>}</nav><p>{staff.email}<br/><small>{staff.role}</small></p><form action="/api/admin/sign-out" method="post"><button>Sign out</button></form></>}</aside><div className="admin-content">{children}</div></div>;
}
