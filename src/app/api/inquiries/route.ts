import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendInquiryEmails } from "@/lib/email";
import { inquirySchema } from "@/lib/schemas";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  if (bodyText.length > 12_000) {
    return NextResponse.json({ error: "Inquiry is too long." }, { status: 413 });
  }
  let input: unknown;
  try {
    input = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Please check the required fields.",
      fields: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }
  const values = parsed.data;
  if (values.website) return NextResponse.json({ ok: true }, { status: 200 });

  const salt = process.env.INQUIRY_RATE_SALT;
  if (!salt) return NextResponse.json({ error: "Inquiry service is not configured." }, { status: 503 });
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const bucket = createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  const db = getServiceClient();
  const { data: allowed, error: limitError } = await db.rpc("allow_inquiry_submission", {
    p_bucket: bucket,
  });
  if (limitError) return NextResponse.json({ error: "Please try again later." }, { status: 503 });
  if (!allowed) return NextResponse.json({ error: "Too many inquiries. Please try again later." }, { status: 429 });

  let productName = values.customProduct;
  if (values.productId) {
    const { data: product } = await db.from("products")
      .select("id,title").eq("id", values.productId).eq("status", "published").single();
    if (!product) return NextResponse.json({ error: "This product is not currently available for inquiry." }, { status: 400 });
    productName = product.title;
  }
  const { data: reference, error: referenceError } = await db.rpc("next_inquiry_reference");
  if (referenceError || !reference) {
    return NextResponse.json({ error: "Could not prepare inquiry reference." }, { status: 503 });
  }
  const { data: inquiry, error: insertError } = await db.from("inquiries").insert({
    reference,
    buyer_name: values.buyerName,
    company: values.company,
    email: values.email.toLowerCase(),
    whatsapp: values.whatsapp || null,
    product_id: values.productId ?? null,
    product_name: productName,
    destination: values.destination,
    quantity: values.quantity,
    requirements: values.requirements,
    privacy_accepted_at: new Date().toISOString(),
  }).select("id,reference,buyer_name,company,email,product_name,destination,quantity").single();
  if (insertError || !inquiry) {
    return NextResponse.json({ error: "Could not save inquiry. Please try again." }, { status: 503 });
  }
  await db.from("inquiry_events").insert({
    inquiry_id: inquiry.id,
    event_type: "submitted",
    note: "Submitted from the public website.",
  });

  try {
    await sendInquiryEmails(inquiry);
  } catch (error) {
    await db.from("inquiry_events").insert({
      inquiry_id: inquiry.id,
      event_type: "email_error",
      note: error instanceof Error ? error.message.slice(0, 500) : "Email queue failed.",
    });
  }

  const whatsappText = [
    `Supply inquiry ${inquiry.reference}`,
    `Company: ${inquiry.company}`,
    `Product: ${inquiry.product_name}`,
    `Destination: ${inquiry.destination}`,
    `Quantity: ${inquiry.quantity}`,
  ].join("\n");
  return NextResponse.json({
    ok: true,
    reference: inquiry.reference,
    whatsappUrl: `https://wa.me/6285776771577?text=${encodeURIComponent(whatsappText)}`,
  }, { status: 201 });
}
