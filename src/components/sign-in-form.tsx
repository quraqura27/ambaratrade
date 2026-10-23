"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function SignInForm() {
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const data=new FormData(e.currentTarget);
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url||!key) {setError("Team login is not configured yet.");setBusy(false);return;}
    const auth=createBrowserClient(url,key);
    const {error}=await auth.auth.signInWithPassword({email:String(data.get("email")),password:String(data.get("password"))});
    if (error) setError("Sign in failed. Check your credentials or ask the owner for an invitation.");
    else { router.push("/admin"); router.refresh(); }
    setBusy(false);
  }
  return <form onSubmit={submit}><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label><button disabled={busy}>Sign in</button>{error&&<p className="error" role="alert">{error}</p>}</form>;
}
