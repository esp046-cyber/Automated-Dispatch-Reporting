import {db} from './db.js';import {process,SECTIONS,TYPES,UNITS,iso} from './automation.js';
const $=s=>document.querySelector(s),M=$('#main');
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=d=>d?new Intl.DateTimeFormat('en-FJ',{timeZone:'Pacific/Fiji',dateStyle:'medium',timeStyle:'short'}).format(new Date(d)):'-';
const toast=m=>{const t=$('#toast');t.textContent=m;t.hidden=false;setTimeout(()=>t.hidden=true,4000)};
const settings=async()=>(await db.get('kv','settings'))||{id:'settings',company:'Water Services',engineer:'',footer:''};
const dl=(data,name,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5e3)};
const share=async r=>{const f=new File([r.pdf],r.id+'.pdf',{type:'application/pdf'});if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'Report '+r.ticketId})}catch{}}else{dl(r.pdf,r.id+'.pdf','application/pdf');toast('Sharing not supported on this device. Downloaded instead.')}};
const prt=r=>{const u=URL.createObjectURL(new Blob([r.pdf],{type:'application/pdf'})),w=window.open(u);if(!w){dl(r.pdf,r.id+'.pdf','application/pdf');toast('Pop-up blocked. Downloaded instead.');return}w.onload=()=>w.print()};
const pick=accept=>new Promise(r=>{const i=document.createElement('input');i.type='file';i.accept=accept;i.onchange=()=>r(i.files[0]);i.click()});
let tab='dash',draft={};
const views={
async dash(){const [t,s]=await Promise.all([db.all('tickets'),db.all('subs')]),today=iso().slice(0,10);
const est=navigator.storage?.estimate?await navigator.storage.estimate():{};
M.innerHTML=`<h2>Dashboard</h2><p class="pill">${navigator.onLine?'Online':'Offline - everything still works'}</p>
<div class="grid"><div class="card"><b>${t.filter(x=>x.status!=='Completed').length}</b> open</div><div class="card"><b>${t.filter(x=>x.due&&x.due<today&&x.status!=='Completed').length}</b> overdue</div><div class="card"><b>${t.filter(x=>x.due===today).length}</b> due today</div><div class="card"><b>${((est.usage||0)/1048576).toFixed(1)} MB</b> used</div></div>
<h3>Submissions</h3>${s.map(x=>`<div class="row"><span>${e(x.id)} - ${e(x.status)} ${e(x.error||'')}</span>${x.status==='Failed'?`<button data-retry="${e(x.id)}">Retry</button>`:''}</div>`).join('')||'<p>No submissions yet.</p>'}`;
M.querySelectorAll('[data-retry]').forEach(b=>b.onclick=async()=>{const x=s.find(y=>y.id===b.dataset.retry);try{await process(db,x.payload,await settings());toast('Processed')}catch(err){toast(err.message)}views.dash()})},
async tickets(){const t=(await db.all('tickets')).sort((a,b)=>(a.due||'').localeCompare(b.due||''));const s=await settings();
M.innerHTML=`<h2>Dispatch board</h2><form id="tf" class="card"><label>Site<input name="site" required></label><label>Asset tag<input name="asset"></label><label>Priority<select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label><label>Due date<input type="date" name="due"></label><label>Assigned engineer<input name="engineer" value="${e(s.engineer)}"></label><label>Description<textarea name="desc"></textarea></label><button>Create ticket</button></form>
<input id="q" placeholder="Search tickets" aria-label="Search tickets"><div id="tl"></div>`;
const draw=()=>{const q=$('#q').value.toLowerCase();$('#tl').innerHTML=t.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).map(x=>`<div class="card"><b>${e(x.id)}</b> ${e(x.site)} <span class="pill">${e(x.status)}</span> <span class="pill">${e(x.priority)}</span><br>Due ${e(x.due||'-')} - ${e(x.engineer||'unassigned')}<p>${e(x.desc)}</p>${(x.log||[]).map(l=>`<small>${fmt(l.at)}: ${e(l.type)} - ${e(l.summary)}</small><br>`).join('')}<button data-v="${e(x.id)}">Start visit</button><button data-h="${e(x.id)}">History</button><span data-r="${e(x.id)}"></span></div>`).join('')||'<p>No tickets. Create one above or import a JSON file in Settings.</p>';
$('#tl').querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{draft={ticketId:b.dataset.v};go('visit')});$('#tl').querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{draft={tl:b.dataset.h};go('timeline')});
db.all('reports').then(rs=>rs.forEach(r=>{const sp=$(`[data-r="${CSS.escape(r.ticketId)}"]`);if(sp)[['Download',()=>dl(r.pdf,r.id+'.pdf','application/pdf')],['Share',()=>share(r)],['Print',()=>prt(r)]].forEach(([n,f])=>{const b=document.createElement('button');b.textContent=n+' '+r.id;b.onclick=f;sp.append(b)})}))};
$('#q').oninput=draw;draw();
$('#tf').onsubmit=async ev=>{ev.preventDefault();const f=Object.fromEntries(new FormData(ev.target));const all=await db.all('tickets');
await db.put('tickets',{...f,id:'TK-'+iso().slice(0,10).replace(/-/g,'')+'-'+String(all.length+1).padStart(3,'0'),status:'Open',log:[],history:[],audit:[{at:iso(),by:f.engineer||'office',what:'Created'}]});views.tickets()}},
async visit(){const t=(await db.all('tickets')).filter(x=>x.status!=='Completed'),s=await settings();
const F=([k,l,ty])=>ty==='a'?`<label>${l}<textarea name="s_${k}"></textarea></label>`:`<label>${l}<input name="s_${k}" ${ty==='n'?'type="number" step="any"':''}></label>`;
M.innerHTML=`<h2>Site visit</h2><form id="vf" novalidate><div id="err" class="err" role="alert" hidden></div>
<label>Ticket<select name="ticketId" required><option value="">Select...</option>${t.map(x=>`<option value="${e(x.id)}" ${x.id===draft.ticketId?'selected':''}>${e(x.id)} ${e(x.site)}</option>`).join('')}</select></label>
<label>Engineer<input name="engineer" value="${e(s.engineer)}" required></label>
<label>Work type<select name="workType">${TYPES.map(x=>`<option>${x}</option>`).join('')}</select></label>
<label>Arrival<input type="datetime-local" name="arrival"></label><label>Departure<input type="datetime-local" name="departure"></label>
<button type="button" id="gps">Capture GPS</button> <span id="gpst"></span>
<fieldset><legend>Instruments (flow, level, pressure, pH, turbidity, chlorine, conductivity)</legend><div id="rd"></div><button type="button" id="addr">Add reading</button></fieldset>
${SECTIONS.map(x=>`<fieldset><legend>${x.t}</legend>${x.f.map(f=>F([f[0],f[1].replace('(kPa)',`(${U})`),f[2]])).join('')}</fieldset>`).join('')}
<label>Parts used<textarea name="parts"></textarea></label><label>Summary of work and findings<textarea name="summary" required></textarea></label><label>Follow-up date<input type="date" name="followUp"></label>
<fieldset><legend>Safety</legend><label class="ck"><input type="checkbox" name="loto"> Lock-out / tag-out done</label><label class="ck"><input type="checkbox" name="ppe"> PPE worn</label><label class="ck"><input type="checkbox" name="confined"> Confined space permit (if applicable)</label></fieldset>
<label>Photos<input type="file" id="ph" accept="image/*" multiple></label><div id="pc"></div>
<label>Customer name<input name="customer" required></label><canvas id="sig" width="400" height="140" aria-label="Signature"></canvas><button type="button" id="clr">Clear signature</button>
<button class="primary">Submit site visit</button></form>`;
const rd=$('#rd'),U=s.uPressure||'kPa';const addRow=()=>{const d=document.createElement('div');d.className='rr';d.innerHTML=`<select data-k="type" aria-label="Type">${Object.keys(UNITS).map(k=>`<option>${k}</option>`).join('')}</select><select data-k="unit" aria-label="Unit"></select><input placeholder="Instrument tag" data-k="name"><input placeholder="Reference" type="number" step="any" data-k="ref"><input placeholder="As found" type="number" step="any" data-k="asFound"><input placeholder="As left" type="number" step="any" data-k="asLeft"><input placeholder="Tol %" type="number" step="any" data-k="tol" value="2">`;const ty=d.querySelector('[data-k=type]'),un=d.querySelector('[data-k=unit]');const fill=()=>{un.innerHTML=UNITS[ty.value].map(u=>`<option ${u===(s['u'+ty.value]||UNITS[ty.value][0])?'selected':''}>${u}</option>`).join('')};ty.onchange=fill;fill();rd.append(d)};$('#addr').onclick=addRow;
$('#gps').onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{draft.gps={lat:+p.coords.latitude.toFixed(6),lon:+p.coords.longitude.toFixed(6)};$('#gpst').textContent=`${draft.gps.lat}, ${draft.gps.lon}`},er=>toast('GPS unavailable: '+er.message)):toast('GPS not supported');
const photos=[];$('#ph').onchange=async ev=>{for(const f of ev.target.files){try{const b=await createImageBitmap(f),k=Math.min(1,1280/Math.max(b.width,b.height)),c=document.createElement('canvas');c.width=Math.round(b.width*k);c.height=Math.round(b.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(b,0,0,c.width,c.height);photos.push({data:c.toDataURL('image/jpeg',.7).split(',')[1],w:c.width,h:c.height});$('#pc').textContent=photos.length+' photo(s) ready'}catch{toast('Could not read '+f.name)}}};
const cv=$('#sig'),cx=cv.getContext('2d');let dr=false,inked=false;const wipe=()=>{cx.fillStyle='#fff';cx.fillRect(0,0,400,140);cx.strokeStyle='#000';cx.lineWidth=2;inked=false};wipe();
const pos=ev=>{const r=cv.getBoundingClientRect();return[(ev.clientX-r.left)*400/r.width,(ev.clientY-r.top)*140/r.height]};
cv.onpointerdown=ev=>{dr=true;cx.beginPath();cx.moveTo(...pos(ev));cv.setPointerCapture(ev.pointerId)};cv.onpointermove=ev=>{if(dr){cx.lineTo(...pos(ev));cx.stroke();inked=true}};cv.onpointerup=()=>dr=false;$('#clr').onclick=wipe;
$('#vf').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target),g=k=>f.get(k)||'';const sections={};for(const[k,v]of f)if(k.startsWith('s_')&&v)sections[k.slice(2)]=v;
const readings=[...rd.children].map(r=>Object.fromEntries([...r.querySelectorAll('input,select')].map(i=>[i.dataset.k,i.value]))).map(r=>({...r,name:r.name||r.type}));
const tk=await db.get('tickets',g('ticketId'));const L=v=>v?v.length===16?v+':00+12:00':v:'';
const p={schemaVersion:1,ticketId:g('ticketId'),visitId:'V-'+Date.now(),engineer:g('engineer'),site:tk?tk.site:'',workType:g('workType'),arrival:L(g('arrival')),departure:L(g('departure')),gps:draft.gps||null,summary:g('summary'),readings,parts:g('parts'),followUp:g('followUp')||null,sections,safety:{loto:!!f.get('loto'),ppe:!!f.get('ppe'),confined:!!f.get('confined')},photos,customer:g('customer'),signature:inked?cv.toDataURL('image/jpeg',.8).split(',')[1]:'',units:{pressure:U},sigW:400,sigH:140,submittedAt:iso()};
try{await process(db,p,await settings());toast('Processed. Use Share, Print or Download on the ticket.');draft={};go('tickets')}catch(x){const b=$('#err');b.hidden=false;b.textContent=x.message+(x.message.startsWith('signature')||x.message.includes('signature')?' (customer must sign)':'');b.scrollIntoView()}}},
async timeline(){const all=await db.all('tickets'),t=all.find(x=>x.id===draft.tl);if(!t){go('tickets');return}
const ts=t.asset?all.filter(x=>x.asset===t.asset):[t],vs=(await db.all('visits')).filter(v=>ts.some(x=>x.id===v.ticketId)),ev=[];
ts.forEach(x=>(x.audit||[]).forEach(a=>ev.push({at:a.at||'',k:'Status',x:`${x.id}: ${a.what} (${a.by})`})));
vs.forEach(v=>ev.push({at:v.departure||v.submittedAt||'',k:v.workType,x:`${v.ticketId}: ${v.summary}`+(v.sections?.fault?` | Fault: ${v.sections.fault}`:'')+(v.sections?.action?` | Action: ${v.sections.action}`:'')}));
ts.forEach(x=>(x.history||[]).forEach(h=>ev.push({at:h.at||'',k:'Reading',bad:h.pass===false,x:`${h.name} (${h.type||''}) ref ${h.ref} ${h.unit||''}, left ${h.asLeft}, error ${h.err}% ${h.pass?'PASS':'FAIL'}`})));
ev.sort((a,b)=>b.at.localeCompare(a.at));
const faults=vs.filter(v=>v.sections?.fault&&!/^(none|no|nil|n\/a)$/i.test(v.sections.fault.trim())).length;
M.innerHTML=`<h2>${t.asset?'Asset '+e(t.asset):'Ticket '+e(t.id)} timeline</h2><p>${vs.length} visit(s), ${faults} with a fault recorded, ${ev.filter(x=>x.bad).length} failed calibration reading(s).</p><button id="bk">Back to tickets</button>`+(ev.map(x=>`<div class="card ${x.bad?'bad':''}"><b>${e(x.k)}</b> <small>${fmt(x.at)}</small><br>${e(x.x)}</div>`).join('')||'<p>No events yet.</p>');$('#bk').onclick=()=>go('tickets')},
async settings(){const s=await settings();
M.innerHTML=`<h2>Settings</h2><form id="sf" class="card"><label>Company name<input name="company" value="${e(s.company)}"></label><label>Engineer name<input name="engineer" value="${e(s.engineer)}"></label><label>Report footer<input name="footer" value="${e(s.footer)}"></label>${['Pressure','Flow','Level'].map(k=>`<label>Default ${k.toLowerCase()} unit<select name="u${k}">${UNITS[k].map(u=>`<option ${(s['u'+k]||UNITS[k][0])===u?'selected':''}>${u}</option>`).join('')}</select></label>`).join('')}<button>Save settings</button></form>
<div class="card"><button id="ex">Export workspace (JSON)</button> <button id="im">Import workspace or visit (JSON)</button> <button id="csv">Export maintenance log (CSV)</button></div>
<div class="card"><button id="demo">Load demo data (for testing)</button> <button id="wipe" class="danger">Clear all data</button></div>`;
$('#sf').onsubmit=async ev=>{ev.preventDefault();await db.put('kv',{id:'settings',...Object.fromEntries(new FormData(ev.target))});toast('Saved')};
$('#ex').onclick=async()=>dl(JSON.stringify({app:'dispatch',version:1,at:iso(),tickets:await db.all('tickets'),visits:await db.all('visits')}),'workspace-'+iso().slice(0,10)+'.json','application/json');
$('#im').onclick=async()=>{const f=await pick('.json');if(!f)return;try{const j=JSON.parse(await f.text());if(j.app!=='dispatch'&&!j.visitId)throw new Error('Not a dispatch file');
for(const t of j.tickets||[])await db.put('tickets',t);const st=await settings();let n=0;for(const v of j.visits||(j.visitId?[j]:[])){await process(db,v,st);n++}toast(`Imported ${(j.tickets||[]).length} tickets, ${n} visits`)}catch(x){toast('Import failed: '+x.message)}};
$('#csv').onclick=async()=>{const q=s=>'"'+String(s??'').replace(/"/g,'""')+'"',rows=[['Ticket','Site','Date','Type','Engineer','Summary']];for(const t of await db.all('tickets'))for(const l of t.log||[])rows.push([t.id,t.site,l.at,l.type,l.engineer,l.summary]);dl(rows.map(r=>r.map(q).join(',')).join('\n'),'maintenance-log.csv','text/csv')};
$('#demo').onclick=async()=>{await db.put('tickets',{id:'TK-DEMO-001',site:'Demo Pump Station',asset:'PS-01',priority:'High',due:iso().slice(0,10),engineer:s.engineer||'Demo',desc:'Demo ticket (test data)',status:'Open',log:[],history:[],audit:[]});toast('Demo ticket added')};
$('#wipe').onclick=async()=>{if(confirm('Delete ALL tickets, visits and reports on this device?')){for(const k of['tickets','visits','reports','subs','kv'])await db.clear(k);toast('All data cleared')}}}};
function go(t){tab=t;document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.t===t));views[t]().catch(x=>toast(x.message))}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.t));
addEventListener('online',()=>tab==='dash'&&go('dash'));addEventListener('offline',()=>tab==='dash'&&go('dash'));
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
go('dash');
