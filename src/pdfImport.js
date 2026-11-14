import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseQuestions } from './questionParser.js';
GlobalWorkerOptions.workerSrc=worker;
export async function openPdf(source){return getDocument(typeof source==='string'?{url:source}:{data:await source.arrayBuffer()}).promise;}
export async function extractPaper(source){
 const pdf=await openPdf(source);const pages=[];
 try{
  if(pdf.numPages>100)throw new Error('Use a paper with 100 pages or fewer.');
  for(let page=1;page<=pdf.numPages;page++){
   const p=await pdf.getPage(page), viewport=p.getViewport({scale:1}), content=await p.getTextContent();
   const lines=[];
   for(const item of content.items){if(!item.str?.trim())continue;const y=viewport.height-item.transform[5];let line=lines.find(l=>Math.abs(l.y-y)<3);if(!line){line={y,items:[]};lines.push(line);}line.items.push({x:item.transform[4],text:item.str});}
   pages.push({page,lines:lines.sort((a,b)=>a.y-b.y).map(l=>({y:l.y,text:l.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')}))});
  }
  return parseQuestions(pages);
 }finally{await pdf.loadingTask.destroy();}
}
