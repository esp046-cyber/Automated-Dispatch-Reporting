import {validate} from './validator.js';import {makePdf} from './pdf.js';
export const TYPES=['Installation','Commissioning','Calibration','Repair','Inspection','Preventive maintenance'];
export const SECTIONS=[
{t:'Hydraulics and valves',f:[['pv_in','Pressure valve inlet (kPa)','n'],['pv_out','Pressure valve outlet (kPa)','n'],['av_test','Air valve operation test','t'],['leak','Leak check result','t'],['net','Network optimisation notes','a']]},
{t:'Pumps, macerators, motors',f:[['cur1','Current L1 (A)','n'],['cur2','Current L2 (A)','n'],['cur3','Current L3 (A)','n'],['volt','Voltage (V)','n'],['ir','Insulation resistance (Mohm)','n'],['hrs','Runtime hours','n'],['seal','Seal / vibration / noise','t'],['fault','Fault found','a'],['action','Action taken','a']]},
{t:'Solar and power',f:[['pvv','Panel voltage (V)','n'],['batv','Battery voltage (V)','n'],['ctrl','Controller status','t'],['load','Load current (A)','n']]},
{t:'SCADA / telemetry / RTU',f:[['pts','GeoSCADA / Aveva points checked','a'],['comms','Comms status','t'],['rssi','Signal strength (dBm)','n'],['scale','Scaling verified (yes/no)','t'],['alarm','Alarm test done (yes/no)','t'],['remote','Remote monitoring test result','t']]},
{t:'Electrical and wiring',f:[['wiring','Isolation, earthing, labelling, wiring diagram matches site','a']]}];
export const iso=()=>new Date(Date.now()+12*36e5).toISOString().slice(0,19)+'+12:00';
export const SCHEMA={schemaVersion:{type:'number',required:1},ticketId:{type:'string',required:1},visitId:{type:'string',required:1},engineer:{type:'string',required:1,min:2},site:{type:'string',required:1},workType:{type:'string',required:1,enum:TYPES},arrival:{type:'string'},departure:{type:'string'},summary:{type:'string',required:1,min:5},readings:{type:'array'},photos:{type:'array'},signature:{type:'string',required:1},customer:{type:'string',required:1},safety:{type:'object',required:1},sections:{type:'object'}};
export function calc(rs=[]){return rs.map(r=>{const ref=+r.ref,l=+r.asLeft,f=+r.asFound;const err=ref?Math.abs(l-ref)/Math.abs(ref)*100:null;return{...r,asFound:f,asLeft:l,ref,err:err==null?null:+err.toFixed(2),pass:err==null?null:err<=(+r.tol||2)}})}
export function check(p){const e=validate(p,SCHEMA);
if(p.safety&&(p.safety.loto!==true||p.safety.ppe!==true))e.push('safety: LOTO and PPE must be confirmed');
(p.readings||[]).forEach((r,i)=>{if(!r.name)e.push(`readings[${i}]: name required`);for(const k of['asFound','asLeft','ref'])if(!Number.isFinite(+r[k])||r[k]==='')e.push(`readings[${i}].${k}: number required`)});
for(const s of SECTIONS)for(const[k,l,t]of s.f){const v=p.sections?.[k];if(t==='n'&&v!==undefined&&v!==''&&(!Number.isFinite(+v)||+v<-1e6||+v>1e6))e.push(`${l}: invalid number`)}
return e}
export function mk(p,t,rd,s){const B=[{h:'Site visit report'},
{row:['Ticket',t.id,'Site',p.site],bold:0},{row:['Asset',t.asset||'-','Work type',p.workType]},{row:['Engineer',p.engineer,'Customer',p.customer]},
{row:['Arrival',p.arrival||'-','Departure',p.departure||'-']},{row:['GPS',p.gps?`${p.gps.lat}, ${p.gps.lon}`:'-','Status',t.status]},
{h:'Summary'},{p:p.summary}];
if(rd.length){B.push({h:'Readings and calibration'},{row:['Instrument','Reference','As found / left','Error % / result'],bold:1});
rd.forEach(r=>B.push({row:[`${r.name} (${r.unit||''})`,String(r.ref),`${r.asFound} / ${r.asLeft}`,`${r.err} / ${r.pass?'PASS':'FAIL'}`]}))}
for(const s of SECTIONS){const rows=s.f.filter(([k])=>p.sections?.[k]);if(rows.length){B.push({h:s.t});rows.forEach(([k,l])=>B.push({row:[l,String(p.sections[k])]}))}}
if(p.parts)B.push({h:'Parts used'},{p:p.parts});
B.push({h:'Safety'},{p:`LOTO: ${p.safety.loto?'Yes':'No'}  PPE: ${p.safety.ppe?'Yes':'No'}  Confined space: ${p.safety.confined?'Yes':'No'}`});
if(p.followUp)B.push({h:'Follow-up'},{p:'Next action date: '+p.followUp});
(p.photos||[]).forEach((x,i)=>{if(i===0)B.push({h:'Photos'});B.push({img:1,data:x.data,w:x.w,h:x.h,maxW:300,maxH:220})});
B.push({h:'Customer sign-off'},{p:p.customer},{img:1,data:p.signature,w:p.sigW||300,h:p.sigH||100,maxW:200,maxH:70});return B}
export async function process(db,p,s={}){
const sub={id:p.visitId,ticketId:p.ticketId,status:'Queued',at:iso(),payload:p};await db.put('subs',sub);
try{const e=check(p);if(e.length)throw new Error(e.join('; '));
const t=await db.get('tickets',p.ticketId);if(!t)throw new Error('Ticket not found: '+p.ticketId);
const rd=calc(p.readings),bad=rd.some(r=>r.pass===false),old=t.status;
t.status=p.status||(bad?'Follow-up':'Completed');
t.log=(t.log||[]).filter(l=>l.visitId!==p.visitId).concat({at:p.departure||iso(),visitId:p.visitId,type:p.workType,summary:p.summary,engineer:p.engineer});
t.history=(t.history||[]).filter(h=>h.visitId!==p.visitId).concat(rd.map(r=>({visitId:p.visitId,at:iso(),name:r.name,unit:r.unit,ref:r.ref,asLeft:r.asLeft,err:r.err,pass:r.pass})));
t.followUp=p.followUp||null;t.audit=(t.audit||[]).concat({at:iso(),by:p.engineer,what:`Visit ${p.visitId}: ${old} -> ${t.status}`});
const pdf=makePdf(mk(p,t,rd,s),{title:(s.company||'Field Service')+' - Report '+t.id,footer:s.footer||''});
await db.put('tickets',t);await db.put('visits',p);await db.put('reports',{id:p.visitId,ticketId:p.ticketId,at:iso(),pdf});
sub.status='Processed';delete sub.error;await db.put('subs',sub);return sub}
catch(x){sub.status='Failed';sub.error=x.message;await db.put('subs',sub);throw x}}
