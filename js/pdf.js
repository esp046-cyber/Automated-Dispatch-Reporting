const esc=s=>String(s??'').replace(/[^\x20-\x7e\xa0-\xff]/g,'?').replace(/([\\()])/g,'\\$1');
const wrap=(s,sz,w)=>{const n=Math.max(8,Math.floor(w/(sz*.5))),o=[];for(const p of String(s??'').split('\n')){let l='';for(let wd of p.split(' ')){while(wd.length>n){o.push(wd.slice(0,n));wd=wd.slice(n)}if((l+' '+wd).trim().length>n){o.push(l);l=wd}else l=(l+' '+wd).trim()}o.push(l)}return o};
export function makePdf(blocks,{title='Report',footer=''}={}){
const W=595,H=842,M=40;let pages=[],c=[],y=H-M-30,imgs=[];
const np=()=>{pages.push(c);c=[];y=H-M-30},need=h=>{if(y-h<M+25)np()};
const T=(s,x,yy,sz,f)=>c.push(`BT /${f} ${sz} Tf ${x} ${yy} Td (${esc(s)}) Tj ET`);
for(const b of blocks){
if(b.h){need(34);y-=8;T(b.h,M,y,13,'F2');y-=5;c.push(`0.5 w ${M} ${y} m ${W-M} ${y} l S`);y-=14}
else if(b.p!=null){for(const l of wrap(b.p,10,W-2*M)){need(14);T(l,M,y,10,'F1');y-=13}}
else if(b.row){const cw=(W-2*M)/b.row.length,cs=b.row.map(x=>wrap(x,9,cw-6)),n=Math.max(...cs.map(a=>a.length));need(n*12+4);cs.forEach((a,i)=>a.forEach((l,j)=>T(l,M+i*cw,y-j*12,9,b.bold?'F2':'F1')));y-=n*12+4}
else if(b.img){const s=Math.min(1,b.maxW/b.w,b.maxH/b.h),w=b.w*s,h=b.h*s;need(h+8);imgs.push(b);c.push(`q ${w.toFixed(1)} 0 0 ${h.toFixed(1)} ${M} ${(y-h).toFixed(1)} cm /Im${imgs.length-1} Do Q`);y-=h+8}}
pages.push(c);
const out=[];let off=0;const offs=[];const P=x=>{out.push(x);off+=x.length};
const O=(n,body,stream)=>{offs[n]=off;P(`${n} 0 obj\n${body}\n`);if(stream){P('stream\n');P(stream);P('\nendstream\n')}P('endobj\n')};
const ni=imgs.length,np_=pages.length,first=5+ni;
P('%PDF-1.4\n');
O(1,'<< /Type /Catalog /Pages 2 0 R >>');
O(2,`<< /Type /Pages /Kids [${pages.map((_,i)=>`${first+2*i+1} 0 R`).join(' ')}] /Count ${np_} >>`);
O(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
O(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
imgs.forEach((b,i)=>{const d=Uint8Array.from(atob(b.data),ch=>ch.charCodeAt(0));O(5+i,`<< /Type /XObject /Subtype /Image /Width ${b.w} /Height ${b.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${d.length} >>`,d)});
pages.forEach((pc,i)=>{const hdr=[`BT /F2 11 Tf ${M} ${H-M} Td (${esc(title)}) Tj ET`,`${M} ${H-M-6} m ${W-M} ${H-M-6} l S`,`BT /F1 8 Tf ${M} ${M-10} Td (${esc(footer)}) Tj ET`,`BT /F1 8 Tf ${W-M-60} ${M-10} Td (Page ${i+1} of ${np_}) Tj ET`];
const s=hdr.concat(pc).join('\n');O(first+2*i,`<< /Length ${s.length} >>`,s);
O(first+2*i+1,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${imgs.map((_,k)=>`/Im${k} ${5+k} 0 R`).join(' ')} >> >> /Contents ${first+2*i} 0 R >>`)});
const total=first+2*np_,xr=off;let x=`xref\n0 ${total}\n0000000000 65535 f \n`;
for(let n=1;n<total;n++)x+=String(offs[n]).padStart(10,'0')+' 00000 n \n';
P(x+`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
const len=out.reduce((a,p)=>a+p.length,0),u=new Uint8Array(len);let o=0;
for(const p of out){if(typeof p==='string')for(let i=0;i<p.length;i++)u[o++]=p.charCodeAt(i)&255;else{u.set(p,o);o+=p.length}}
return u}
