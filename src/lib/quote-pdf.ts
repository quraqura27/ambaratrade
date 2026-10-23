import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import type { CalculatedQuotation } from "./quotation";
import { formatMoney } from "./quotation";

type Seller={legal_name:string;registered_address:string|null;registration_number:string|null;tax_number:string|null;business_email:string;telephone:string|null};
export async function createQuotationPdf(input:{seller:Seller;reference:string;version:number;approvedAt:string;document:CalculatedQuotation;verificationUrl:string}){
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const fontBytes=await readFile(path.join(process.cwd(),"src/assets/NotoSans-Regular.ttf"));
  const font=await pdf.embedFont(fontBytes,{subset:true});
  const navy=rgb(.07,.16,.20),muted=rgb(.36,.42,.43),accent=rgb(.77,.20,.18);
  let page!:PDFPage;let y=0;let pageNumber=0;
  const newPage=()=>{page=pdf.addPage([595.28,841.89]);pageNumber++;y=789;page.drawRectangle({x:0,y:816,width:595.28,height:25,color:navy});page.drawText("AMBARA GLOBALTRADE",{x:42,y:824,size:10,font,color:rgb(1,1,1)});page.drawText(`${input.reference}  /  v${input.version}`,{x:410,y:824,size:9,font,color:rgb(1,1,1)});page.drawLine({start:{x:42,y:45},end:{x:553,y:45},color:rgb(.8,.83,.82)});page.drawText(`Quotation  •  Page ${pageNumber}`,{x:42,y:29,size:8,font,color:muted});};
  const ensure=(height:number)=>{if(y-height<72)newPage();};
  const line=(text:string,size=10,color=navy,gap=17,x=42)=>{ensure(gap);page.drawText(text,{x,y,size,font,color,maxWidth:510});y-=gap;};
  const wrap=(text:string,width:number,size:number)=>{const parts=text.split(/\s+/);const lines:string[]=[];let current="";for(const word of parts){const test=current?`${current} ${word}`:word;if(font.widthOfTextAtSize(test,size)>width&&current){lines.push(current);current=word;}else current=test;}if(current)lines.push(current);return lines;};
  const block=(label:string,value:string)=>{if(!value)return;ensure(45);line(label.toUpperCase(),8,accent,13);for(const paragraph of value.split("\n")){for(const row of wrap(paragraph||" ",510,9))line(row,9,navy,14);}y-=8;};
  newPage();line("COMMERCIAL QUOTATION",22,navy,32);line(input.seller.legal_name,12,navy,19);block("Registered address",input.seller.registered_address??"");line(`Registration: ${input.seller.registration_number??""}  |  Tax ID: ${input.seller.tax_number??""}`,8,muted,14);line(`${input.seller.business_email}  |  ${input.seller.telephone??""}`,8,muted,20);line(`Issued: ${input.approvedAt.slice(0,10)}    Valid until: ${input.document.validUntil}`,9,muted,22);line(`Quotation no.: ${input.reference}    Version: ${input.version}`,9,muted,25);
  block("Buyer",`${input.document.buyerCompany} | ${input.document.buyerContact}\n${input.document.buyerEmail}`);
  block("Destination",input.document.destination);
  ensure(45);line("GOODS AND PRICING",9,accent,20);
  input.document.items.forEach((item,index)=>{ensure(68);line(`${index+1}. ${item.description}`,10,navy,16);line(`${item.quantity} ${item.unit} × ${formatMoney(item.unitPrice,input.document.currency)} = ${formatMoney(item.lineTotal,input.document.currency)}`,9,muted,24);});
  ensure(78);page.drawLine({start:{x:42,y},end:{x:553,y},color:rgb(.78,.8,.8)});y-=18;line(`Subtotal: ${formatMoney(input.document.subtotal,input.document.currency)}`,10,navy,17);line(`${input.document.taxLabel} (${input.document.taxRate}%): ${formatMoney(input.document.taxAmount,input.document.currency)}`,10,navy,17);line(`TOTAL: ${formatMoney(input.document.total,input.document.currency)}`,13,navy,30);
  block("Delivery basis",`${input.document.deliveryTerm} — ${input.document.deliveryPlace}`);
  block("Payment",input.document.paymentTerms);
  block("Lead time",input.document.leadTime);
  block("Quality and inspection",input.document.qualityNotes);
  block("Included",input.document.inclusions);
  block("Excluded",input.document.exclusions);
  block("Additional notes",input.document.notes);
  ensure(140);const qrBytes=await QRCode.toBuffer(input.verificationUrl,{type:"png",width:220,margin:1,errorCorrectionLevel:"M"});const qr=await pdf.embedPng(qrBytes);page.drawImage(qr,{x:42,y:y-90,width:90,height:90});page.drawText("VERIFY THIS QUOTATION",{x:145,y:y-22,size:10,font,color:navy});for(const [i,row] of wrap(input.verificationUrl,395,8).entries())page.drawText(row,{x:145,y:y-40-i*11,size:8,font,color:muted});page.drawText("The QR links to the current document status and file-integrity check.",{x:145,y:y-83,size:8,font,color:muted});y-=110;
  return Buffer.from(await pdf.save());
}
