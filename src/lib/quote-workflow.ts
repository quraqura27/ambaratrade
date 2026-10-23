import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getServiceClient } from "./supabase";
import { calculateQuotation } from "./quotation";
import { quotationSchema } from "./schemas";
import { createQuotationPdf } from "./quote-pdf";
import { deliverEmail, escapeHtml, queueEmail } from "./email";

export async function approveVersion(versionId:string,ownerId:string){
  const db=getServiceClient();const {data:version,error}=await db.from("quotation_versions").select("*,quotations(reference,inquiry_id)").eq("id",versionId).single();if(error||!version)throw error??new Error("Quotation not found.");if(version.status!=="pending")throw new Error("Only submitted quotations can be approved.");
  const {data:settings}=await db.from("company_settings").select("*").eq("id",1).single();
  if(!settings?.registered_address||!settings.registration_number||!settings.tax_number||!settings.owner_email||!settings.notification_emails?.length||!settings.mail_ready||!process.env.RESEND_API_KEY)throw new Error("Complete company identity, owner and notification emails, and verified business email before approval.");
  const quote=Array.isArray(version.quotations)?version.quotations[0]:version.quotations;
  if(!quote?.reference)throw new Error("Quotation reference unavailable.");
  const document=quotationSchema.parse(version.document);
  if(document.validUntil<new Date().toISOString().slice(0,10))throw new Error("Validity date is in the past.");
  const token=randomBytes(32).toString("base64url");const tokenHash=createHash("sha256").update(token).digest("hex");
  const base=(process.env.APP_BASE_URL||"").replace(/\/$/,"");if(!base.startsWith("https://"))throw new Error("Canonical HTTPS site URL is required.");
  const pdf=await createQuotationPdf({seller:settings,reference:quote.reference,version:version.version_number,approvedAt:new Date().toISOString(),document:calculateQuotation(document),verificationUrl:`${base}/verify/${token}`});
  const pdfHash=createHash("sha256").update(pdf).digest("hex");const pdfPath=`${quote.reference}/v${version.version_number}-${version.id}.pdf`;
  const {error:uploadError}=await db.storage.from("quotation-pdfs").upload(pdfPath,pdf,{contentType:"application/pdf",upsert:false});if(uploadError)throw uploadError;
  const {data:approved,error:approveError}=await db.rpc("approve_quotation_version",{p_id:versionId,p_owner:ownerId,p_token_hash:tokenHash,p_pdf_hash:pdfHash,p_pdf_path:pdfPath});
  if(approveError||!approved){await db.storage.from("quotation-pdfs").remove([pdfPath]);throw approveError??new Error("Quotation was already approved or changed.");}
  await db.from("quotation_events").insert({quotation_version_id:versionId,actor_id:ownerId,event_type:"approved",note:"Owner approved the immutable PDF version."});
  try {await sendApprovedQuotation(versionId);}catch(cause){await db.from("quotation_events").insert({quotation_version_id:versionId,event_type:"email_error",note:cause instanceof Error?cause.message.slice(0,500):"Email queue failed."});}
}

export async function sendApprovedQuotation(versionId:string){
  const db=getServiceClient();const {data:v,error}=await db.from("quotation_versions").select("*,quotations(reference)").eq("id",versionId).single();if(error||!v)throw error??new Error("Quotation not found.");if(v.status==="sent")return true;if(v.status!=="approved_unsent")throw new Error("Only approved, unsent quotations can be emailed.");
  const quote=Array.isArray(v.quotations)?v.quotations[0]:v.quotations;const document=quotationSchema.parse(v.document);
  const deliveryId=await queueEmail({kind:"quotation",relatedId:versionId,recipient:document.buyerEmail,subject:`Quotation ${quote.reference} · version ${v.version_number}`,html:`<p>Dear ${escapeHtml(document.buyerContact)},</p><p>Please find attached the approved quotation ${escapeHtml(quote.reference)}, version ${v.version_number}, from PT Ambara Artha Globaltrade.</p><p>The document includes a QR code for checking its current status and file integrity.</p><p>Kind regards,<br>Ambara GlobalTrade</p>`,idempotencyKey:`quotation/${versionId}`,pdfStoragePath:v.pdf_storage_path,pdfFilename:`${quote.reference}-v${v.version_number}.pdf`});
  const sent=await deliverEmail(deliveryId);if(sent){const {data:marked,error:markError}=await db.rpc("mark_quotation_sent",{p_id:versionId});if(markError||!marked)throw markError??new Error("Could not mark quotation as sent.");await db.from("quotation_events").insert({quotation_version_id:versionId,event_type:"sent",note:"Quotation email accepted by provider."});}
  return sent;
}
