import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { publicProducts } from "@/lib/catalog";
import { InquiryForm } from "@/components/inquiry-form";
export const dynamic = "force-dynamic";
export default async function ProductPage({ params }: {params: Promise<{slug:string}>}) {
  const { slug } = await params;
  const products = await publicProducts(); const product = products.find(p=>p.slug===slug);
  if (!product) notFound();
  return <><header className="simple-header"><Link href="/" className="brand">AMBARA <small>GLOBALTRADE</small></Link><Link href="/#products">← All products</Link></header><main className="container detail"><p className="eyebrow">{product.category}</p><h1>{product.title}</h1><p className="large-copy">{product.summary}</p><div className="detail-grid"><div>{product.image_url&&<Image className="detail-image" src={product.image_url} alt={product.image_alt||product.title} width={900} height={640} sizes="(max-width: 760px) 100vw, 50vw"/>}<h2>Product overview</h2><p>{product.description}</p><dl className="detail-facts">{[["Product form",product.product_form],["Species",product.species],["Origin",product.origin_country],["Packaging",product.packaging],["Minimum order",product.minimum_order],...product.specifications.map(s=>[s.label,s.value])].filter(x=>x[1]).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{product.quality_summary && <><h2>Quality basis</h2><p>{product.quality_summary}</p></>}<p className="product-note">Final specification, availability, documents, and destination requirements are confirmed in the commercial offer.</p></div><div><h2>Ask about this product</h2><InquiryForm products={products.map(p=>({id:p.id,title:p.title}))} selectedId={product.id}/></div></div></main></>;
}
