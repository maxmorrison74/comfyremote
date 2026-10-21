"use client";
import { useState, useEffect } from "react";

const WORKFLOW_TEMPLATE = {
  "115": {"inputs": {"aspect_ratio": "9:16 (Portrait Widescreen)", "megapixels": 0.4, "multiple": 32}, "class_type": "ResolutionSelector"},
  "119": {"inputs": {"vae_name": "minimax_h3_video_vae_fp16.safetensors"}, "class_type": "VAELoader"},
  "120": {"inputs": {"vae_name": "minimax_audio_vae.safetensors"}, "class_type": "VAELoader"},
  "128": {"inputs": {"clip_name": "minimax_h3_clip.safetensors"}, "class_type": "CLIPLoader"},
  "130": {"inputs": {"unet_name": "minimax_h3.safetensors"}, "class_type": "UNETLoader"},
  "138": {"inputs": {"value": "superboy on city roof at night, cinematic, mecha dragon behind, lightning storm"}, "class_type": "PrimitiveStringMultiline"}
};

export default function ComfyRemote() {
  const [pods, setPods] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>("");
  const [logs, setLogs] = useState<string[]>(["[v4.2] ComfyRemote pronto - con START/STOP"]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [prompt, setPrompt] = useState("superboy on city roof at night, cinematic lighting, mecha dragon behind, lightning storm, epic anime style");
  const [length, setLength] = useState(121);
  const [aspect, setAspect] = useState("9:16 (Portrait Widescreen)");
  const [isGenerating, setIsGenerating] = useState(false);

  const addLog = (msg: string) => setLogs(l => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l].slice(0,120));

  useEffect(() => {
    const saved = localStorage.getItem("runpod_key");
    if (saved) setApiKey(saved);
  }, []);

  const saveKey = () => {
    localStorage.setItem("runpod_key", apiKey);
    addLog("API Key salvata");
    fetchAll(apiKey);
  };

  const fetchAll = async (key: string) => {
    if (!key) return;
    setLoading(true);
    addLog("Connessione RunPod via proxy...");
    try {
      const q1 = "{ pods { id name desiredStatus runtime { uptimeInSeconds gpus { id gpuDisplayName } } machine { gpuTypeId } } }";
      const q2 = "{ myself { podTemplates { id name } pods { id name } } }";
      const [r1, r2] = await Promise.all([
        fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key }, body: JSON.stringify({ query: q1 }) }).then(r=>r.json()),
        fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key }, body: JSON.stringify({ query: q2 }) }).then(r=>r.json())
      ]);
      let podsData = r1?.data?.pods || r2?.data?.myself?.pods || [];
      if (podsData.length===0 && r1?.errors) addLog(`GraphQL error: ${JSON.stringify(r1.errors).slice(0,300)}`);
      setPods(podsData);
      addLog(`Pod trovati: ${podsData.length}`);
      const tmpl = r2?.data?.myself?.podTemplates || [];
      setTemplates(tmpl);
      if (podsData.length > 0 && !selectedPod) setSelectedPod(podsData[0].id);
    } catch (e:any) { addLog(`Errore: ${e.message}`); }
    setLoading(false);
  };

  const podAction = async (podId: string, action: "stop" | "resume" | "terminate") => {
    const map: any = {
      stop: `mutation { podStop(input: { podId: "${podId}" }) { id desiredStatus } }`,
      resume: `mutation { podResume(input: { podId: "${podId}" }) { id desiredStatus } }`,
      terminate: `mutation { podTerminate(input: { podId: "${podId}" }) { id } }`
    };
    addLog(`${action.toUpperCase()} ${podId.slice(0,8)}...`);
    try {
      const res = await fetch("/api/runpod", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey }, body: JSON.stringify({ query: map[action] }) }).then(r=>r.json());
      if (res.errors) addLog(`Errore ${action}: ${JSON.stringify(res.errors).slice(0,200)}`);
      else { addLog(`✅ ${action} ok: ${podId.slice(0,8)}`); setTimeout(()=>fetchAll(apiKey), 1500); }
    } catch (e:any) { addLog(`Errore ${action}: ${e.message}`); }
  };

  const runWorkflow = async () => {
    if (!selectedPod) { addLog("Seleziona un Pod"); return; }
    setIsGenerating(true);
    addLog(`🚀 Lancio MiniMax su ${selectedPod}`);
    try {
      const podEndpoint = `https://${selectedPod}-8188.proxy.runpod.net/prompt`;
      const wf = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
      if (wf["138"]) wf["138"].inputs.value = prompt;
      const res = await fetch(podEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: wf, client_id: "comfyremote" }) });
      if (!res.ok) {
        const txt = await res.text();
        addLog(`Pod risponde ${res.status}: ${txt.slice(0,200)} - attiva Expose 8188`);
      } else {
        const data = await res.json();
        addLog(`✅ Job: ${JSON.stringify(data).slice(0,200)}`);
      }
    } catch (e:any) { addLog(`Connessione Pod fallita (normale se non esposto 8188): ${e.message}`); }
    setIsGenerating(false);
  };

  useEffect(()=>{ if(apiKey) fetchAll(apiKey); }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tighter">COMFYREMOTE <span className="text-zinc-500 text-sm">v4.2 • PODS + MINIMAX</span></h1>
          <div className="flex gap-2">
            <input type={showKey ? "text" : "password"} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="RunPod API Key" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm w-48" />
            <button onClick={()=>setShowKey(!showKey)} className="bg-zinc-800 px-2 rounded text-xs">👁</button>
            <button onClick={saveKey} className="bg-white text-black px-4 py-1 rounded text-sm font-bold">SAVE & SYNC</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h2 className="font-bold mb-3 text-sm tracking-widest">PODS ({pods.length}) {loading && "⏳"}</h2>
            {pods.map((p:any) => (
              <div key={p.id} className={`p-2 mb-3 rounded border text-xs ${selectedPod===p.id ? "bg-white text-black border-white" : "bg-zinc-900 border-zinc-800"}`}>
                <div onClick={()=>setSelectedPod(p.id)} className="cursor-pointer">
                  <div className="font-bold flex justify-between"><span>{p.name || p.id.slice(0,8)}</span><span className="opacity-60">{p.desiredStatus || ""}</span></div>
                  <div className="opacity-60">{p.machine?.gpuTypeId || p.id.slice(0,12)}</div>
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={()=>podAction(p.id, "resume")} className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold py-1 rounded text-">▶ START</button>
                  <button onClick={()=>podAction(p.id, "stop")} className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-1 rounded text-">⏸ STOP</button>
                  <button onClick={()=>{ if(confirm(`Terminare ${p.name}?`)) podAction(p.id, "terminate"); }} className="bg-red-900/50 hover:bg-red-800 px-2 py-1 rounded text-">🗑</button>
                </div>
              </div>
            ))}
            {pods.length===0 && !loading && <div className="text-zinc-600 text-xs">Nessun pod trovato.</div>}
            
            <div className="mt-6 bg-black border border-zinc-800 rounded p-2 h-56 overflow-auto text- leading-relaxed">
              {logs.map((l,i)=><div key={i} className="text-zinc-400">{l}</div>)}
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold">MiniMax H3 • Reference to Video</h2>
            <p className="text-zinc-500 text-xs mt-1">Workflow: video_minimax_h3_r2v.json • 4 ref images</p>
            <label className="text- tracking-widest text-zinc-500 font-bold mt-4 block">PROMPT</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-3 text-sm mt-1 h-24 focus:border-white outline-none" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><label className="text- text-zinc-500 font-bold">LENGTH</label><input type="number" value={length} onChange={e=>setLength(parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1" /></div>
              <div><label className="text- text-zinc-500 font-bold">ASPECT</label><select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1"><option>9:16 (Portrait Widescreen)</option><option>16:9 (Widescreen)</option><option>1:1 (Square)</option></select></div>
            </div>
            <button onClick={runWorkflow} disabled={isGenerating || !selectedPod} className="w-full mt-6 bg-white text-black font-black tracking-widest py-4 rounded hover:bg-zinc-200 disabled:opacity-30 text-sm">{isGenerating ? "⏳ GENERAZIONE..." : "▶ GENERA VIDEO SUL POD"}</button>
            <div className="text- text-zinc-600 mt-3">Richiede Pod con porta 8188 esposta (Edit Pod → Expose HTTP Ports → 8188)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
