import "server-only";
import { Resend } from "resend";
import { getServiceClient } from "./supabase";

export type EmailKind = "inquiry_ack" | "inquiry_alert" | "quotation";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

type DeliveryInput = {
  kind: EmailKind;
  relatedId: string;
  recipient: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  pdfStoragePath?: string;
  pdfFilename?: string;
};

export async function queueEmail(input: DeliveryInput): Promise<string> {
  const db = getServiceClient();
  const { error } = await db.from("email_deliveries").upsert({
    kind: input.kind,
    related_id: input.relatedId,
    recipient: input.recipient,
    subject: input.subject,
    payload: {
      html: input.html,
      pdfStoragePath: input.pdfStoragePath ?? null,
      pdfFilename: input.pdfFilename ?? null,
    },
    idempotency_key: input.idempotencyKey,
  }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (error) throw error;
  const { data, error: readError } = await db.from("email_deliveries")
    .select("id").eq("idempotency_key", input.idempotencyKey).single();
  if (readError || !data) throw readError ?? new Error("Email delivery record missing.");
  return data.id;
}

export async function deliverEmail(deliveryId: string): Promise<boolean> {
  const db = getServiceClient();
  const { data: delivery, error } = await db.from("email_deliveries")
    .select("*").eq("id", deliveryId).single();
  if (error || !delivery) throw error ?? new Error("Email delivery not found.");
  if (delivery.status === "sent") return true;
  const { data: claimed, error: claimError } = await db.rpc("claim_email_delivery", { p_id: deliveryId });
  if (claimError) throw claimError;
  if (!claimed) return false;
  const fail = async (message: string, uncertain = false) => {
    await db.from("email_deliveries").update({
      status: uncertain ? "uncertain" : "failed", last_error: message.slice(0, 500),
    }).eq("id", deliveryId);
    return false;
  };
  const { data: settings } = await db.from("company_settings")
    .select("business_email,mail_ready").eq("id", 1).single();
  const from = process.env.RESEND_FROM_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!settings?.mail_ready || !from || !key)
    return fail("Business email is not ready.");
  if (!delivery.recipient.includes("@")) return fail("Recipient email is not configured.");
  const payload = delivery.payload as {
    html: string; pdfStoragePath?: string | null; pdfFilename?: string | null;
  };
  let attachment: { filename: string; content: Buffer }[] | undefined;
  if (payload.pdfStoragePath) {
    const { data: file, error: fileError } = await db.storage
      .from("quotation-pdfs").download(payload.pdfStoragePath);
    if (fileError || !file) return fail("Quotation PDF is unavailable.");
    attachment = [{ filename: payload.pdfFilename ?? "Ambara-Quotation.pdf",
      content: Buffer.from(await file.arrayBuffer()) }];
  }
  let result;
  try {
    result = await new Resend(key).emails.send({
      from, to: delivery.recipient, replyTo: settings.business_email,
      subject: delivery.subject, html: payload.html, attachments: attachment,
    }, { idempotencyKey: delivery.idempotency_key });
  } catch (cause) {
    return fail(`Provider result is unknown; check Resend before retrying. ${cause instanceof Error ? cause.message : ""}`, true);
  }
  if (result.error || !result.data?.id)
    return fail(result.error?.message ?? "No provider receipt returned.");
  const { error: updateError } = await db.from("email_deliveries").update({
    status: "sent", provider_id: result.data.id, last_error: null,
    sent_at: new Date().toISOString(),
  }).eq("id", deliveryId);
  if (updateError) return fail("Provider accepted this email, but saving the receipt failed. Check Resend before retrying.", true);
  return true;
}

export async function sendInquiryEmails(inquiry: {
  id: string;
  reference: string;
  buyer_name: string;
  company: string;
  email: string;
  product_name: string;
  destination: string;
  quantity: string;
}) {
  const db = getServiceClient();
  const { data: settings } = await db.from("company_settings")
    .select("notification_emails").eq("id", 1).single();
  const baseUrl = process.env.APP_BASE_URL ?? "https://ambaratrade.com";
  const safe = Object.fromEntries(Object.entries(inquiry).map(
    ([key, value]) => [key, escapeHtml(value)],
  )) as Record<keyof typeof inquiry, string>;

  const ackId = await queueEmail({
    kind: "inquiry_ack",
    relatedId: inquiry.id,
    recipient: inquiry.email,
    subject: `We received your supply inquiry ${inquiry.reference}`,
    html: `<p>Dear ${safe.buyer_name},</p><p>Ambara GlobalTrade received your inquiry
      <strong>${safe.reference}</strong> for ${safe.product_name}. We will review your
      requirements and contact you using the details provided.</p>
      <p>This confirmation is not a commercial offer or availability guarantee.</p>
      <p>Ambara GlobalTrade<br><a href="${baseUrl}">${baseUrl}</a></p>`,
    idempotencyKey: `inquiry-ack/${inquiry.id}`,
  });
  await deliverEmail(ackId);

  const recipients: string[] = settings?.notification_emails?.length
    ? settings.notification_emails : [""];
  for (const recipient of recipients) {
    const alertId = await queueEmail({
      kind: "inquiry_alert",
      relatedId: inquiry.id,
      recipient,
      subject: `New supply inquiry ${inquiry.reference}`,
      html: `<p><strong>${safe.reference}</strong> was submitted.</p>
        <ul><li>Buyer: ${safe.buyer_name}, ${safe.company}</li>
        <li>Product: ${safe.product_name}</li><li>Destination: ${safe.destination}</li>
        <li>Quantity: ${safe.quantity}</li></ul>
        <p>Open the private dashboard for the full inquiry and follow-up.</p>`,
      idempotencyKey: `inquiry-alert/${inquiry.id}/${recipient || "unconfigured"}`,
    });
    await deliverEmail(alertId);
  }
}
