const S=['tickets','visits','reports','subs','kv'];
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('dispatch',1);r.onupgradeneeded=()=>S.forEach(s=>r.result.createObjectStore(s,{keyPath:'id'}));r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=async(s,m,f)=>{const d=await open();return new Promise((res,rej)=>{const q=f(d.transaction(s,m).objectStore(s));q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})};
export const db={get:(s,k)=>tx(s,'readonly',o=>o.get(k)),put:(s,v)=>tx(s,'readwrite',o=>o.put(v)),all:s=>tx(s,'readonly',o=>o.getAll()),del:(s,k)=>tx(s,'readwrite',o=>o.delete(k)),clear:s=>tx(s,'readwrite',o=>o.clear())};
