"use client";
import { useState, type FormEvent } from "react";

type Choice = { id: string; title: string };
export function InquiryForm({ products, selectedId = "" }: { products: Choice[]; selectedId?: string }) {
  const [productId, setProductId] = useState(selectedId);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ reference: string; whatsappUrl: string } | null>(null);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, productId: productId || null, privacyAccepted: form.has("privacyAccepted") }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save your inquiry.");
      setResult(payload); event.currentTarget.reset(); setProductId("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <form className="inquiry-form" onSubmit={submit}>
    <div className="form-pair"><label>Your name *<input name="buyerName" autoComplete="name" required minLength={2}/></label><label>Company *<input name="company" autoComplete="organization" required minLength={2}/></label></div>
    <div className="form-pair"><label>Business email *<input name="email" type="email" autoComplete="email" required/></label><label>WhatsApp (optional)<input name="whatsapp" type="tel" autoComplete="tel"/></label></div>
    <div className="form-pair"><label>Product or commodity *<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Other commodity / custom request</option>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Destination *<input name="destination" placeholder="Country and city" required/></label></div>
    {!productId && <label>Commodity you need *<input name="customProduct" required placeholder="Describe the product"/></label>}
    <label>Estimated quantity *<input name="quantity" required placeholder="e.g. 2 metric tons"/></label>
    <label>Requirements<textarea name="requirements" rows={4} placeholder="Specifications, packaging, documents, timing, or other requirements"/></label>
    <label className="checkline"><input name="privacyAccepted" type="checkbox" required/> I agree to Ambara GlobalTrade using these details to respond to my inquiry. <a href="/privacy">Privacy notice</a>.</label>
    <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
    <button className="button button-dark" disabled={busy}>{busy ? "Saving inquiry…" : "Submit inquiry →"}</button>
    {error && <p role="alert" className="error">{error}</p>}
    {result && <div className="result" role="status"><strong>Inquiry saved: {result.reference}</strong><p>We have your request. Save this reference for follow-up.</p><a href={result.whatsappUrl} target="_blank" rel="noreferrer">Continue on WhatsApp (optional) ↗</a></div>}
  </form>;
}
