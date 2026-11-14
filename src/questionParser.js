// Conservative parser: numbered questions and A–D / (A)–(D) options.
export function parseQuestions(pages) {
  const questions=[]; let q=null, option=null;
  for(const {page,lines} of pages){
    for(const line of lines){
      const text=line.text.trim();
      if(!text || /^(FOCUS\s*\/|HUMAN PHYSIOLOGY(?:\s*\||$)|Questions \d+[-–]|NEET-style practice|END OF TEST)/i.test(text))continue;
      const start=text.match(/^(?:Q(?:uestion)?\s*)?(\d{1,3})[.)]\s+(.+)/i);
      if(start && Number(start[1])===questions.length+1){
        if(q && q.end.page===page)q.end={page,y:Math.max(0,line.y-8)};
        q={number:Number(start[1]),text:start[2],options:{A:'',B:'',C:'',D:''},start:{page,y:Math.max(0,line.y-8)},end:{page,y:1e6}};
        questions.push(q);option=null;continue;
      }
      if(!q)continue;
      q.end={page,y:line.y+24};
      const opt=text.match(/^(?:\(([A-D])\)|([A-D])[.)])\s*(.*)$/);
      if(opt){option=opt[1]||opt[2];q.options[option]=opt[3];}
      else if(!/^\d+$/.test(text)){if(option)q.options[option]+=' '+text;else q.text+=' '+text;}
    }
  }
  return questions;
}
export function validQuestions(qs,count){return qs.length===count&&qs.every((q,i)=>q.number===i+1&&q.text.trim()&&['A','B','C','D'].every(a=>q.options[a]?.trim()));}
