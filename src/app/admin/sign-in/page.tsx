import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
export default function SignInPage() { return <main className="admin-login"><div className="admin-card"><Link href="/" className="brand">AMBARA GLOBALTRADE</Link><h1>Team sign in</h1><p>Access is available to invited staff only.</p><SignInForm/></div></main>; }
