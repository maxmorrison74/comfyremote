"use client";
import { useState, useEffect } from "react";

export default function ComfyRemote() {
  const [pods, setPods] = useState<any[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>("");
  const [logs, setLogs] = useState<string[]>(["[v4.4] fix pod fermi + 4x ref"]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [prompt, setPrompt] = useState("superboy on city roof at night, cinematic lighting, mecha dragon behind, lightning storm, epic anime style");
  const [length, setLength] = useState(121);
  const [aspect, setAspect] = useState("9:16 (Portrait Widescreen)");
  const [isGenerating, setIsGenerating] = useState(false);
  const [refs, setRefs] = useState<string[]>(["red_superboy_on_city_roof.png","mecha_dragon_lightning.png"]);

  const addLog = (m:string) => setLogs(l => [`[${new Date().toLocaleTimeString()}] ${m}`, ...l].slice(0,150));
  useEffect(()=>{ const s=localStorage.getItem("runpod_key"); if(s) setApiKey(s); },[]);
  const saveKey = () => { localStorage.setItem("runpod_key", apiKey); addLog("API Key salvata"); fetchAll(apiKey); };

  const fetchAll = async (key: string) => {
    if (!key) return; setLoading(true);
    addLog("Connessione via proxy...");
    try {
      // Query 1: pods attivi
      const qPods = "{ pods { id name desiredStatus runtime { uptimeInSeconds } machine { gpuTypeId } } }";
      // Query 2: myself.pods include anche STOPPED + templates
      const qMyself = "{ myself { pods { id name desiredStatus runtime { uptimeInSeconds } machine { gpuTypeId } } podTemplates { id name } } }";
      
      const [rPods, rMyself] = await Promise.all([
        fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key }, body: JSON.stringify({ query: qPods }) }).then(r=>r.json()),
        fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key }, body: JSON.stringify({ query: qMyself }) }).then(r=>r.json())
      ]);

      if (rPods.errors) addLog(`Pods error: ${JSON.stringify(rPods.errors).slice(0,200)}`);
      if (rMyself.errors) addLog(`Myself error: ${JSON.stringify(rMyself.errors).slice(0,200)}`);

      const active = rPods?.data?.pods || [];
      const all = rMyself?.data?.myself?.pods || [];
      
      // Unisci senza duplicati
      const merged = [...active];
      for (const p of all) { if (!merged.find(m=>m.id===p.id)) merged.push(p); }

      addLog(`Attivi: ${active.length} | Totali (inc. stopped): ${merged.length}`);
      if (merged.length===0) {
        addLog("⚠️ Nessun Pod trovato - creane uno su runpod.io o verifica API Key ha scope POD");
        addLog(`Debug myself: ${JSON.stringify(rMyself?.data?.myself).slice(0,300)}`);
      }
      setPods(merged);
      if (merged.length>0 && !selectedPod) setSelectedPod(merged[0].id);
    } catch(e:any){ addLog(`Errore: ${e.message}`); }
    setLoading(false);
  };

  const podAction = async (podId: string, action: "stop" | "resume" | "terminate") => {
    const map:any = {
      stop: `mutation { podStop(input: { podId: "${podId}" }) { id desiredStatus } }`,
      resume: `mutation { podResume(input: { podId: "${podId}" }) { id desiredStatus } }`,
      terminate: `mutation { podTerminate(input: { podId: "${podId}" }) { id } }`
    };
    addLog(`${action.toUpperCase()} ${podId.slice(0,6)}...`);
    try {
      const res = await fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey }, body: JSON.stringify({ query: map[action] }) }).then(r=>r.json());
      if(res.errors) addLog(`Errore: ${JSON.stringify(res.errors).slice(0,200)}`);
      else { addLog(`✅ ${action} ok`); setTimeout(()=>fetchAll(apiKey),2000); }
    } catch(e:any){ addLog(`Errore: ${e.message}`); }
  };

  const updateRef = (i:number, v:string) => { const c=[...refs]; c[i]=v; setRefs(c); };

  const runWorkflow = async () => {
    if (!selectedPod) { addLog("Seleziona Pod"); return; }
    setIsGenerating(true);
    addLog(`🚀 4x REF [${refs.join(", ")}] su ${selectedPod.slice(0,6)}`);
    try {
      const podEndpoint = `https://${selectedPod}-8188.proxy.runpod.net/prompt`;
      const payload = { prompt: {"138":{"inputs":{"value":prompt},"class_type":"PrimitiveStringMultiline"}}, extra_data: { ref_images: refs }, client_id: "comfyremote-v4.4" };
      const res = await fetch(podEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const txt = await res.text();
      addLog(res.ok ? `✅ Job: ${txt.slice(0,200)}` : `Pod ${res.status}: ${txt.slice(0,200)} - esponi 8188`);
    } catch(e:any){ addLog(`Connessione fallita: apri https://${selectedPod}-8188.proxy.runpod.net`); }
    setIsGenerating(false);
  };

  useEffect(()=>{ if(apiKey) fetchAll(apiKey); },[]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h1 className="text-xl font-bold">COMFYREMOTE <span className="text-zinc-500 text-xs">v4.4 • 4x REF + FIX PODS</span></h1>
          <div className="flex gap-2">
            <input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="RunPod Key" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm w-44" />
            <button onClick={()=>setShowKey(!showKey)} className="bg-zinc-800 px-2 rounded text-xs">👁</button>
            <button onClick={saveKey} className="bg-white text-black px-4 py-1 rounded text-sm font-bold">{loading?"⏳":"SYNC"}</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col">
            <h2 className="font-bold mb-3 text-xs tracking-widest">PODS ({pods.length}) {loading && "⏳"}</h2>
            <div className="space-y-2 max-h- overflow-auto">
              {pods.map((p:any)=>(
                <div key={p.id} className={`p-2 rounded border text-xs ${selectedPod===p.id?"bg-white text-black border-white":"bg-zinc-900 border-zinc-800"}`}>
                  <div onClick={()=>setSelectedPod(p.id)} className="cursor-pointer">
                    <div className="font-bold flex justify-between"><span className="truncate">{p.name||p.id.slice(0,8)}</span><span className={`text- px-1 rounded ${p.desiredStatus==="RUNNING"?"bg-green-600 text-black":"bg-zinc-700"}`}>{p.desiredStatus||"UNKNOWN"}</span></div>
                    <div className="opacity-60 text-">{p.machine?.gpuTypeId||p.id.slice(0,12)}</div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <button onClick={()=>podAction(p.id,"resume")} className="flex-1 bg-green-600 text-black font-bold py-1 rounded text-">▶ START</button>
                    <button onClick={()=>podAction(p.id,"stop")} className="flex-1 bg-zinc-700 py-1 rounded text-">⏸ STOP</button>
                    <button onClick={()=>{ if(confirm("Terminare?")) podAction(p.id,"terminate"); }} className="bg-red-900/40 px-2 rounded text-">🗑</button>
                  </div>
                </div>
              ))}
              {pods.length===0 && !loading && <div className="text-zinc-500 text-xs p-3 border border-dashed border-zinc-800 rounded">Nessun Pod. Se hai Pod fermi, dovrebbero apparire qui. Controlla su runpod.io/console/pods - se li vedi lì, premi SYNC di nuovo e guarda i log sotto.</div>}
            </div>
            <div className="mt-4 bg-black border border-zinc-800 rounded p-2 h-56 overflow-auto text- leading-relaxed shrink-0">
              {logs.map((l,i)=><div key={i} className="text-zinc-400 whitespace-pre-wrap">{l}</div>)}
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
            <h2 className="font-bold text-sm">MiniMax H3 • Reference to Video (4 refs obbligatori)</h2>
            <div className="mt-4">
              <label className="text- text-zinc-500 font-bold tracking-widest">4x REFERENCE IMAGES (in ComfyUI/input/)</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {refs.map((r,i)=>(
                  <div key={i} className="flex gap-2 items-center bg-black border border-zinc-800 rounded p-2">
                    <span className="text- bg-zinc-800 px-1.5 py-0.5 rounded">REF {i+1}</span>
                    <input value={r} onChange={e=>updateRef(i,e.target.value)} className="flex-1 bg-transparent text-xs outline-none" />
                    <button onClick={()=>{ const c=[...refs]; c.splice(i,1); setRefs(c); }} className="text-zinc-600 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>{ if(refs.length<6) setRefs([...refs,`ref${refs.length+1}.png`]); }} className="text- bg-zinc-800 px-3 py-1 rounded">+ AGGIUNGI REF</button>
                <button onClick={()=>setRefs(["red_superboy_on_city_roof.png","mecha_dragon_lightning.png"])} className="text- bg-zinc-800 px-3 py-1 rounded">↺ RESET 4 DEFAULT</button>
              </div>
            </div>
            <label className="text- text-zinc-500 font-bold mt-4 block">PROMPT</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-3 text-sm mt-1 h-20" />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="text- text-zinc-500">LENGTH</label><input type="number" value={length} onChange={e=>setLength(parseInt(e.target.value)||121)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1" /></div>
              <div><label className="text- text-zinc-500">ASPECT</label><select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1"><option>9:16 (Portrait Widescreen)</option><option>16:9 (Widescreen)</option><option>1:1 (Square)</option></select></div>
            </div>
            <button onClick={runWorkflow} disabled={isGenerating || !selectedPod} className="w-full mt-5 bg-white text-black font-black py-3 rounded text-sm disabled:opacity-30">{isGenerating?"⏳":"▶ GENERA VIDEO 4x REF SUL POD"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
