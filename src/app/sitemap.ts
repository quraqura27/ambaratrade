import type { MetadataRoute } from "next";
import { publicProducts } from "@/lib/catalog";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base="https://ambaratrade.com";const products=await publicProducts();return [{url:base,changeFrequency:"weekly",priority:1},...products.map(p=>({url:`${base}/products/${p.slug}`,changeFrequency:"weekly" as const,priority:.6}))];}
