export function validate(o,schema){const e=[];if(!o||typeof o!=='object'||Array.isArray(o))return['Payload must be an object'];
for(const[k,r]of Object.entries(schema)){const v=o[k];
if(v===undefined||v===null||v===''){if(r.required)e.push(`${k}: required`);continue}
const t=Array.isArray(v)?'array':typeof v;
if(r.type&&t!==r.type){e.push(`${k}: expected ${r.type}, got ${t}`);continue}
if(r.enum&&!r.enum.includes(v))e.push(`${k}: must be one of ${r.enum.join(', ')}`);
if(t==='string'&&r.min&&v.trim().length<r.min)e.push(`${k}: at least ${r.min} characters`);
if(t==='number'&&(!Number.isFinite(v)||v<(r.lo??-1e9)||v>(r.hi??1e9)))e.push(`${k}: out of range`)}
return e}
