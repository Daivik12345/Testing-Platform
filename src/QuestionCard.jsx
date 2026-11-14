import React,{useEffect,useState} from 'react';
// Render the original question region on demand, preserving diagrams and notation.
function SourceRegion({url,question}){
 const [images,setImages]=useState([]),[error,setError]=useState('');
 useEffect(()=>{let stopped=false,pdf;
 (async()=>{try{const {openPdf}=await import('./pdfImport.js');pdf=await openPdf(url);const result=[];
 for(let n=question.start.page;n<=Math.min(question.end.page,pdf.numPages);n++){
 const page=await pdf.getPage(n),v=page.getViewport({scale:1.5});const canvas=document.createElement('canvas');canvas.width=v.width;canvas.height=v.height;await page.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
 const top=n===question.start.page?Math.max(0,question.start.y*1.5):0;const bottom=n===question.end.page?Math.min(v.height,question.end.y*1.5):v.height;if(bottom<=top)continue;
 const crop=document.createElement('canvas');crop.width=canvas.width;crop.height=bottom-top;crop.getContext('2d').drawImage(canvas,0,top,canvas.width,bottom-top,0,0,crop.width,crop.height);result.push(crop.toDataURL('image/png'));
 }if(!stopped)setImages(result);
 }catch{if(!stopped)setError('Could not render the original. Use Open paper to view diagrams.');}finally{pdf?.loadingTask.destroy();}})();return()=>{stopped=true;};},[url,question]);
 return <div className="source-region">{error?<p role="alert">{error}</p>:images.length?images.map((src,i)=><img key={i} src={src} alt={`Original question ${question.number}, section ${i+1}`}/>):<p role="status">Loading original question…</p>}</div>;
}
export default function QuestionCard({question,url,value,onSelect,disabled}){
 const [showSource,setShowSource]=useState(true);
 return <article className="question-card"><p className="question-eyebrow">QUESTION {question.number}</p><h2>{question.text}</h2>
 {url&&question.start&&<><button type="button" className="focus-secondary" onClick={()=>setShowSource(v=>!v)}>{showSource?'Hide original':'Show original / diagrams'}</button>{showSource&&<SourceRegion url={url} question={question}/>}</>}
 <div className="question-options" role="radiogroup" aria-label={`Question ${question.number} options`}>{['A','B','C','D'].map(a=><label key={a} className={value===a?'chosen':''}><input type="radio" name={`question-${question.number}`} checked={value===a} disabled={disabled} onChange={()=>onSelect(a)}/><span>{a}</span><p>{question.options[a]}</p></label>)}</div></article>;
}
