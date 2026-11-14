import { validQuestions } from './questionParser.js';
import React, { useRef, useState, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Upload, FileText, Check, PlusCircle } from 'lucide-react';
import { hasCompleteAnswerKey } from './practice.js';
import { bounded, parseAnswerKey, publishError } from './publishing.js';

export default function CreateTestForm({ db, storage, appId, onSuccess }) {
  const [questions,setQuestions]=useState([]);
  const [reviewed,setReviewed]=useState(false);
  const [extracting,setExtracting]=useState(false);
  const [structured,setStructured]=useState(true);
  const [reviewIndex,setReviewIndex]=useState(0);
  const [name,setName]=useState('');
  const [duration,setDuration]=useState('45');
  const [count,setCount]=useState('90');
  const [mode,setMode]=useState('upload');
  const [file,setFile]=useState(null);
  const [url,setUrl]=useState('');
  const [key,setKey]=useState({});
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [phase,setPhase]=useState('');
  const [progress,setProgress]=useState(0);
  const record=useRef(null), upload=useRef(null), busy=useRef(false), cached=useRef(null);
  useEffect(()=>()=>{upload.current?.cancel();},[]);
  const importKey=text=>{try {const parsed=parseAnswerKey(text,Number(count));setKey(parsed);setNotice(`Imported ${Object.keys(parsed).length} answers.`);setError('');}catch(e){setError(e.message);}};
  const chooseFile=async e=>{
    const selected=e.target.files?.[0]; if(!selected)return;
    if(selected.size>20*1024*1024){setError('Choose a PDF smaller than 20 MB.');e.target.value='';return;}
    const signature=await selected.slice(0,5).text();
    if(signature!=='%PDF-'){setError('Choose a valid PDF question paper.');e.target.value='';return;}
    setQuestions([]);setReviewed(false);setFile(selected);cached.current=null;setError('');
  };
  async function extract(){
    setExtracting(true);setError('');setReviewed(false);
    try{const {extractPaper}=await import('./pdfImport.js');const qs=await bounded(extractPaper(mode==='upload'?file:url),60000);setQuestions(qs);setReviewIndex(0);if(!qs.length)throw new Error('No numbered text questions found. This may be a scan. Use PDF + OMR mode, or upload a text-based PDF.');setNotice(`Detected ${qs.length} questions. Review wording and options before publishing.`);}
    catch(e){setError(e.message);}finally{setExtracting(false);}
  }
  const editQuestion=(field,value)=>{setReviewed(false);setQuestions(prev=>prev.map((q,i)=>i!==reviewIndex?q:field==='text'?{...q,text:value}:{...q,options:{...q.options,[field]:value}}));};
  async function submit(e){
    e.preventDefault();if(busy.current)return;setError('');
    if(!name.trim() || !Number.isInteger(Number(count)) || count<1 || count>300 || !Number.isFinite(Number(duration)) || duration<1 || duration>360){setError('Enter a title, 1–300 questions and 1–360 minutes.');return;}
    if(structured && (!reviewed || !validQuestions(questions,Number(count)))){setError('Extract and review all questions and four options, or choose PDF + OMR mode.');return;}
    if(!hasCompleteAnswerKey(Number(count),key)){setError('Set an answer for every question before publishing.');return;}
    if(mode==='upload'&&!file){setError('Choose the question-paper PDF.');return;}
    if(mode==='link'){try{if(new URL(url).protocol!=='https:')throw Error();}catch{setError('Enter a valid HTTPS PDF link.');return;}}
    if(!navigator.onLine){setError('You are offline. Reconnect and retry; your form is still here.');return;}
    busy.current=true;setPhase('Preparing');
    try{
      if(!record.current)record.current={reference:doc(collection(db,'artifacts',appId,'public','data','tests')),createdAt:Date.now()};
      let pdfUrl=url.trim();
      if(mode==='upload'){
        if(!storage)throw new Error('Firebase Storage is not configured. Use a PDF link or configure Storage.');
        if(cached.current?.file===file)pdfUrl=cached.current.url;
        else{
          setPhase('Uploading PDF');setProgress(0);
          const task=uploadBytesResumable(ref(storage,`test-papers/${record.current.reference.id}/paper.pdf`),file,{contentType:'application/pdf'});upload.current=task;
          try{
            await bounded(new Promise((resolve,reject)=>task.on('state_changed',s=>setProgress(Math.round(s.bytesTransferred/s.totalBytes*100)),reject,resolve)),60000);
            pdfUrl=await bounded(getDownloadURL(task.snapshot.ref));cached.current={file,url:pdfUrl};
          }catch(e){task.cancel();throw e;}finally{upload.current=null;}
        }
      }
      if(structured && new TextEncoder().encode(JSON.stringify(questions)).length>700000)throw new Error('Extracted paper is too large. Use PDF + OMR mode for this paper.');
      setPhase('Publishing');
      await bounded(setDoc(record.current.reference,{name:name.trim(),duration:Number(duration),totalQuestions:Number(count),pdfUrl,questions:structured?questions:[],answerKey:Object.fromEntries(Array.from({length:Number(count)},(_,i)=>[i+1,key[i+1]])),createdAt:record.current.createdAt}));
      onSuccess();
    }catch(e){setError(publishError(e));}finally{busy.current=false;setPhase('');}
  }
  return <section className="test-builder">
    <div className="builder-heading"><span className="login-card-icon"><PlusCircle size={24}/></span><div><h2>Create a test</h2><p>A paper, an answer key, and you’re ready.</p></div></div>
    <form onSubmit={submit} aria-busy={!!phase}>
      <fieldset disabled={!!phase||extracting}>
        <div className="builder-fields"><label className="builder-wide">Test title<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Human Physiology · Practice 01"/></label><label>Duration · minutes<input type="text" inputMode="numeric" pattern="[0-9]+" required value={duration} onChange={e=>{if(/^\d*$/.test(e.target.value))setDuration(e.target.value);}}/></label><label>Questions<input type="text" inputMode="numeric" pattern="[0-9]+" required value={count} onChange={e=>{if(/^\d{0,3}$/.test(e.target.value)){setCount(e.target.value);setReviewed(false);}}}/></label></div>
        <section className="builder-section"><h3>Question paper</h3><div className="segmented"><button type="button" aria-pressed={mode==='upload'} onClick={()=>{setMode('upload');setQuestions([]);setReviewed(false);}}>Upload PDF</button><button type="button" aria-pressed={mode==='link'} onClick={()=>{setMode('link');setQuestions([]);setReviewed(false);}}>Use a link</button></div>
          {mode==='upload'?<label className="paper-upload"><Upload size={24}/><strong>{file?file.name:'Choose a question paper'}</strong><span>{file?`${(file.size/1024/1024).toFixed(2)} MB · PDF`:'PDF · up to 20 MB'}</span><input aria-label="Upload question paper PDF" type="file" accept="application/pdf,.pdf" onChange={chooseFile}/></label>:<label>PDF link<input type="url" value={url} onChange={e=>{setUrl(e.target.value);setQuestions([]);setReviewed(false);}} placeholder="https://…/paper.pdf"/></label>}
        </section>
        <section className="builder-section"><h3>Question display</h3><div className="segmented"><button type="button" aria-pressed={structured} onClick={()=>setStructured(true)}>Individual questions</button><button type="button" aria-pressed={!structured} onClick={()=>setStructured(false)}>PDF + OMR</button></div>
        {structured&&<><button type="button" className="focus-secondary" disabled={extracting||!(mode==='upload'?file:url)} onClick={extract}>{extracting?'Reading PDF…':'Extract questions & options'}</button><p className="builder-hint">Numbered, single-column text PDFs work best. Review every question. Original question images preserve diagrams; scans and complex layouts can use PDF + OMR.</p>
        {questions.length>0&&<div className="import-review"><label>Review question<select value={reviewIndex} onChange={e=>setReviewIndex(Number(e.target.value))}>{questions.map((q,i)=><option key={i} value={i}>Question {q.number}</option>)}</select></label><label>Question<textarea value={questions[reviewIndex].text} onChange={e=>editQuestion('text',e.target.value)}/></label>{['A','B','C','D'].map(a=><label key={a}>Option {a}<textarea rows={2} value={questions[reviewIndex].options[a]} onChange={e=>editQuestion(a,e.target.value)}/></label>)}<label className="review-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed the extracted questions and options against the PDF.</label><p className="builder-hint">{questions.length} detected · {count} expected</p></div>}</>}
        </section>
        <section className="builder-section"><div className="section-heading"><h3>Answer key</h3><span>{Array.from({length:Number(count)||0},(_,i)=>key[i+1]).filter(Boolean).length} / {count}</span></div><label className="key-upload"><FileText size={18}/> Import JSON file<input aria-label="Upload answer key JSON" type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];if(f){if(f.size>100000){setError('Answer key must be smaller than 100 KB.');return;}try{importKey(await f.text());}catch{setError('Could not read the answer-key file.');}}e.target.value='';}}/></label><p className="builder-hint">Use the JSON key for automatic scoring. The answer-key PDF is for your reference.</p><details><summary>Paste JSON or edit answers</summary><textarea aria-label="Answer key JSON" rows={3} placeholder={'{"1":"A","2":"C"}'} onChange={e=>importKey(e.target.value)}/><div className="builder-key-grid">{Array.from({length:Math.min(300,Math.max(0,Number(count)||0))},(_,i)=><label key={i}>Q{i+1}<select aria-label={`Answer ${i+1}`} value={key[i+1]||''} onChange={e=>setKey({...key,[i+1]:e.target.value})}><option value="">—</option>{['A','B','C','D'].map(a=><option key={a}>{a}</option>)}</select></label>)}</div></details>{notice&&<p role="status" className="builder-hint">{notice}</p>}</section>
      </fieldset>
      {error&&<p className="login-error" role="alert">{error}</p>}
      {phase&&<div role="status" className="builder-status">{phase}{phase==='Uploading PDF'?` · ${progress}%`:'…'}{phase==='Uploading PDF'&&<progress max="100" value={progress}/>}</div>}
      <div className="builder-footer"><span>+4 correct · −1 incorrect</span><button type="submit" className="focus-primary" disabled={!!phase||extracting}>{phase?`${phase}…`:<>Publish test <Check size={16}/></>}</button></div>
    </form>
  </section>;
}
