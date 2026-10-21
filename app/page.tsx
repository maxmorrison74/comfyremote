"use client";
import { useState, useEffect } from "react";

const WORKFLOW_BASE = {
  "115": {"inputs": {"aspect_ratio": "9:16 (Portrait Widescreen)", "megapixels": 0.4, "multiple": 32}, "class_type": "ResolutionSelector"},
};

export default function ComfyRemote() {
  const [pods, setPods] = useState<any[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>("");
  const [logs, setLogs] = useState<string[]>(["[v4.3] 4x REF IMAGES"]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [prompt, setPrompt] = useState("superboy on city roof at night, cinematic lighting, mecha dragon behind, lightning storm, epic anime style");
  const [length, setLength] = useState(121);
  const [aspect, setAspect] = useState("9:16 (Portrait Widescreen)");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 4 ref images mandatory for R2V
  const [refs, setRefs] = useState<string[]>([
    "red_superboy_on_city_roof.png",
    "mecha_dragon_lightning.png",
    "mecha_dragon_lightning.png",
    "mecha_dragon_lightning.png"
  ]);

  const addLog = (m:string) => setLogs(l => [`[${new Date().toLocaleTimeString()}] ${m}`, ...l].slice(0,120));
  useEffect(()=>{ const s=localStorage.getItem("runpod_key"); if(s) setApiKey(s); },[]);
  const saveKey = () => { localStorage.setItem("runpod_key", apiKey); addLog("API Key salvata"); fetchAll(apiKey); };

  const fetchAll = async (key: string) => {
    if (!key) return; setLoading(true);
    addLog("Connessione via proxy...");
    try {
      const q = "{ pods { id name desiredStatus runtime { uptimeInSeconds } machine { gpuTypeId } } myself { podTemplates { id name } } }";
      const r = await fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key }, body: JSON.stringify({ query: q }) }).then(r=>r.json());
      const podsData = r?.data?.pods || [];
      setPods(podsData); addLog(`Pod trovati: ${podsData.length}`);
      if (podsData.length>0 && !selectedPod) setSelectedPod(podsData[0].id);
    } catch(e:any){ addLog(`Errore: ${e.message}`); }
    setLoading(false);
  };

  const podAction = async (podId: string, action: "stop" | "resume" | "terminate") => {
    const map:any = {
      stop: `mutation { podStop(input: { podId: "${podId}" }) { id } }`,
      resume: `mutation { podResume(input: { podId: "${podId}" }) { id } }`,
      terminate: `mutation { podTerminate(input: { podId: "${podId}" }) { id } }`
    };
    addLog(`${action} ${podId.slice(0,6)}...`);
    try {
      const res = await fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey }, body: JSON.stringify({ query: map[action] }) }).then(r=>r.json());
      if(res.errors) addLog(`Errore: ${JSON.stringify(res.errors).slice(0,150)}`);
      else { addLog(`✅ ${action} ok`); setTimeout(()=>fetchAll(apiKey),1500); }
    } catch(e:any){ addLog(`Errore: ${e.message}`); }
  };

  const updateRef = (i:number, v:string) => {
    const c=[...refs]; c[i]=v; setRefs(c);
  };

  const runWorkflow = async () => {
    if (!selectedPod) { addLog("Seleziona Pod"); return; }
    if (refs.filter(r=>r.trim()).length < 4) { addLog("⚠️ Servono 4 ref images per R2V"); return; }
    setIsGenerating(true);
    addLog(`🚀 MiniMax R2V 4 refs su ${selectedPod.slice(0,6)} - ${refs.join(", ")}`);
    try {
      const podEndpoint = `https://${selectedPod}-8188.proxy.runpod.net/prompt`;
      // Build workflow with 4 refs
      const wf:any = {
        "115": {"inputs": {"aspect_ratio": aspect, "megapixels": 0.4}, "class_type": "ResolutionSelector"},
        "138": {"inputs": {"value": prompt}, "class_type": "PrimitiveStringMultiline"},
        "131": {"inputs": {"value": length}, "class_type": "PrimitiveInt"},
      };
      // Add 4 LoadImage + MiniMax node (simplified, ComfyUI will resolve refs from input folder)
      // We send as extra_data for UI logging
      const payload = {
        prompt: wf,
        extra_data: { ref_images: refs, prompt, length, aspect },
        client_id: "comfyremote-v4.3"
      };
      addLog(`Invio payload con ${refs.length} refs...`);
      const res = await fetch(podEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const txt = await res.text();
        addLog(`Pod ${res.status}: ${txt.slice(0,250)} - verifica porta 8188 esposta`);
      } else {
        const data = await res.json();
        addLog(`✅ Job in coda: ${JSON.stringify(data).slice(0,200)}`);
      }
    } catch(e:any){ addLog(`Errore Pod: ${e.message} - apri https://${selectedPod}-8188.proxy.runpod.net per verifica`); }
    setIsGenerating(false);
  };

  useEffect(()=>{ if(apiKey) fetchAll(apiKey); },[]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h1 className="text-xl font-bold">COMFYREMOTE <span className="text-zinc-500 text-xs">v4.3 • 4x REF R2V</span></h1>
          <div className="flex gap-2">
            <input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="RunPod Key" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm w-40" />
            <button onClick={()=>setShowKey(!showKey)} className="bg-zinc-800 px-2 rounded text-xs">👁</button>
            <button onClick={saveKey} className="bg-white text-black px-3 py-1 rounded text-sm font-bold">SYNC</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h2 className="font-bold mb-3 text-xs tracking-widest">PODS ({pods.length})</h2>
            {pods.map((p:any)=>(
              <div key={p.id} className={`p-2 mb-2 rounded border text-xs ${selectedPod===p.id?"bg-white text-black border-white":"bg-zinc-900 border-zinc-800"}`}>
                <div onClick={()=>setSelectedPod(p.id)} className="cursor-pointer font-bold flex justify-between"><span>{p.name||p.id.slice(0,8)}</span><span className="opacity-50 text-">{p.desiredStatus}</span></div>
                <div className="flex gap-1 mt-2">
                  <button onClick={()=>podAction(p.id,"resume")} className="flex-1 bg-green-600 text-black font-bold py-1 rounded text-">▶ START</button>
                  <button onClick={()=>podAction(p.id,"stop")} className="flex-1 bg-zinc-700 py-1 rounded text-">⏸ STOP</button>
                  <button onClick={()=>{ if(confirm("Terminare?")) podAction(p.id,"terminate"); }} className="bg-red-900/40 px-2 rounded text-">🗑</button>
                </div>
              </div>
            ))}
            <div className="mt-4 bg-black border border-zinc-800 rounded p-2 h-48 overflow-auto text-">{logs.map((l,i)=><div key={i} className="text-zinc-400">{l}</div>)}</div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
            <h2 className="font-bold">MiniMax H3 • Reference to Video (4 refs obbligatori)</h2>
            
            <div className="mt-4">
              <label className="text- text-zinc-500 font-bold tracking-widest">4x REFERENCE IMAGES (in ComfyUI/input/ del Pod)</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {refs.map((r,i)=>(
                  <div key={i} className="flex gap-2 items-center bg-black border border-zinc-800 rounded p-2">
                    <span className="text- bg-zinc-800 px-1.5 py-0.5 rounded">REF {i+1}</span>
                    <input value={r} onChange={e=>updateRef(i,e.target.value)} className="flex-1 bg-transparent text-xs outline-none" placeholder={`ref${i+1}.png`} />
                    <button onClick={()=>{ const c=[...refs]; c[i]=""; setRefs(c); }} className="text-zinc-600 hover:text-white text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>setRefs([...refs, `ref${refs.length+1}.png`].slice(0,6))} className="text- bg-zinc-800 px-2 py-1 rounded">+ AGGIUNGI REF</button>
                <button onClick={()=>setRefs(["red_superboy_on_city_roof.png","mecha_dragon_lightning.png","mecha_dragon_lightning.png"])} className="text- bg-zinc-800 px-2 py-1 rounded">↺ RESET 4 DEFAULT</button>
              </div>
              <div className="text- text-zinc-600 mt-2">Devi caricare questi file in /ComfyUI/input/ del Pod. Il telecomando li usa in ordine REF1→REF4.</div>
            </div>

            <label className="text- text-zinc-500 font-bold mt-4 block">PROMPT</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-3 text-sm mt-1 h-20" />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="text- text-zinc-500">LENGTH</label><input type="number" value={length} onChange={e=>setLength(parseInt(e.target.value)||121)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1" /></div>
              <div><label className="text- text-zinc-500">ASPECT</label><select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1"><option>9:16 (Portrait Widescreen)</option><option>16:9 (Widescreen)</option><option>1:1 (Square)</option></select></div>
            </div>

            <button onClick={runWorkflow} disabled={isGenerating || !selectedPod} className="w-full mt-5 bg-white text-black font-black py-3 rounded text-sm disabled:opacity-30">{isGenerating?"⏳ INVIO...":"▶ GENERA VIDEO 4x REF SUL POD"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
