"use client";
import { useState, useEffect } from "react";
const FULL_WORKFLOW = {"115":{"inputs":{"aspect_ratio":"9:16 (Portrait Widescreen)","megapixels":0.4,"multiple":32},"class_type":"ResolutionSelector"},"138":{"inputs":{"value":"test"},"class_type":"PrimitiveStringMultiline"},"137":{"inputs":{"image":"red_superboy_on_city_roof.png"},"class_type":"LoadImage"},"139":{"inputs":{"image":"mecha_dragon_lightning.png"},"class_type":"LoadImage"},"147":{"inputs":{"image":"mecha_dragon_lightning.png"},"class_type":"LoadImage"},"148":{"inputs":{"image":"mecha_dragon_lightning.png"},"class_type":"LoadImage"}};

export default function Page(){
  const [pods,setPods]=useState<any[]>([]); const [sel,setSel]=useState(""); const [logs,setLogs]=useState<string[]>(["[v4.6] DEBUG PODS"]);
  const [key,setKey]=useState(""); const [raw,setRaw]=useState("");
  const [prompt,setPrompt]=useState("superboy on city roof, mecha dragon roar");
  const [refs,setRefs]=useState(["red_superboy_on_city_roof.png","mecha_dragon_lightning.png","mecha_dragon_lightning.png","mecha_dragon_lightning.png"]);

  const addLog=(m:string)=>setLogs(l=>[`[${new Date().toLocaleTimeString()}] ${m}`,...l].slice(0,100));
  useEffect(()=>{ const s=localStorage.getItem("runpod_key"); if(s) setKey(s); },[]);
  
  const fetchAll=async(k:string)=>{
    addLog("=== DEBUG FETCH ===");
    const queries = [
      {name:"pods", q:"{ pods { id name desiredStatus } }"},
      {name:"myself.pods", q:"{ myself { id pods { id name desiredStatus } } }"},
      {name:"myself full", q:"{ myself { id email pods { id name desiredStatus machine { gpuTypeId } } podTemplates { id name } } }"}
    ];
    let merged:any[]=[];
    for(const qq of queries){
      addLog(`Provo query: ${qq.name}`);
      try{
        const r = await fetch("/api/runpod",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":k},body:JSON.stringify({query:qq.q})}).then(r=>r.json());
        const txt = JSON.stringify(r).slice(0,1000);
        addLog(`${qq.name} risposta: ${txt}`);
        setRaw(prev=>prev+`\n--- ${qq.name} ---\n${JSON.stringify(r,null,2)}\n`);
        if(r.data?.pods) merged=[...merged,...r.data.pods];
        if(r.data?.myself?.pods) merged=[...merged,...r.data.myself.pods];
        if(r.errors) addLog(`ERRORE ${qq.name}: ${JSON.stringify(r.errors)}`);
      }catch(e:any){ addLog(`Fetch error ${qq.name}: ${e.message}`); }
    }
    const dedup = Array.from(new Map(merged.map((p:any)=>[p.id,p])).values());
    setPods(dedup); addLog(`FINALE: ${dedup.length} pod unici`);
    if(dedup.length>0 && !sel) setSel(dedup[0].id);
  };

  const save=()=>{ localStorage.setItem("runpod_key",key); setRaw(""); fetchAll(key); };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 font-mono">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold mb-4">COMFYREMOTE v4.6 DEBUG <span className="text-zinc-500 text-xs">PODS RAW</span></h1>
        <div className="flex gap-2 mb-4"><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="RunPod API Key" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm w-64"/><button onClick={save} className="bg-white text-black px-6 py-2 rounded font-bold">SYNC + DEBUG</button><button onClick={()=>{setRaw(""); setLogs([]);}} className="bg-zinc-800 px-3 py-2 rounded">CLEAR</button></div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <h2 className="text-xs font-bold mb-2">PODS TROVATI: {pods.length}</h2>
            {pods.map((p:any)=><div key={p.id} className="text-xs p-2 bg-black border border-zinc-800 rounded mb-1"><b>{p.name}</b> {p.id.slice(0,8)} {p.desiredStatus}</div>)}
            {pods.length===0 && <div className="text-zinc-500 text-xs">Nessun pod - guarda log a destra. Se hai pod su runpod.io/console/pods ma qui 0, la API Key è sbagliata o senza permessi POD.</div>}
            <div className="mt-4">
              <h3 className="text-xs font-bold">LOGS</h3>
              <div className="bg-black p-2 h-64 overflow-auto text- mt-1">{logs.map((l,i)=><div key={i} className="text-zinc-400">{l}</div>)}</div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <h2 className="text-xs font-bold mb-2">RAW RUNPOD RESPONSE (debug)</h2>
            <pre className="bg-black p-2 h- overflow-auto text- whitespace-pre-wrap">{raw || "Premi SYNC per vedere risposta raw di RunPod"}</pre>
          </div>
        </div>
        <div className="mt-4 text- text-zinc-500">Se vedi errori tipo "Unauthorized" o data: null, vai su runpod.io - Settings - API Keys - Create API Key con scope READ_PODS. Copia la nuova key e incolla qui.</div>
      </div>
    </div>
  );
}
