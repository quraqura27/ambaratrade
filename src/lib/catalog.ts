import "server-only";
import { getServiceClient } from "./supabase";

export type Product = {
  id: string; slug: string; title: string; category: string; summary: string;
  description: string; product_form: string | null; species: string | null;
  origin_country: string | null; packaging: string | null; minimum_order: string | null;
  quality_summary: string | null; specifications: { label: string; value: string }[];
  image_url?: string; image_alt?: string;
};

export async function publicProducts(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return [];
  const { data, error } = await getServiceClient().from("products")
    .select("id,slug,title,category,summary,description,product_form,species,origin_country,packaging,minimum_order,quality_summary,specifications")
    .eq("status", "published").order("published_at", { ascending: false });
  if (error) throw error;
  const products=(data??[]) as Product[];
  if(!products.length)return products;
  const {data:images,error:imageError}=await getServiceClient().from("product_images")
    .select("product_id,storage_path,alt_text,sort_order").in("product_id",products.map(p=>p.id))
    .order("sort_order",{ascending:true});
  if(imageError)throw imageError;
  const first=new Map<string,{storage_path:string;alt_text:string}>();
  for(const img of images??[])if(!first.has(img.product_id))first.set(img.product_id,img);
  return products.map(p=>{const photo=first.get(p.id);return photo?{...p,image_url:getServiceClient().storage.from("product-images").getPublicUrl(photo.storage_path).data.publicUrl,image_alt:photo.alt_text}:p;});
}
