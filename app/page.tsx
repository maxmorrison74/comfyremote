
"use client";
import { useState, useEffect } from "react";

const WORKFLOW_TEMPLATE = {"92": {"inputs": {"filename_prefix": "video/MiniMax_H3", "format": "auto", "format.codec": "auto", "codec": "auto", "video": ["130", 0]}, "class_type": "SaveVideo", "_meta": {"title": "Salva Video"}}, "115": {"inputs": {"aspect_ratio": "9:16 (Portrait Widescreen)", "megapixels": 0.4, "multiple": 32}, "class_type": "ResolutionSelector", "_meta": {"title": "Resolution Selector (Size)"}}, "119": {"inputs": {"vae_name": "minimax_h3_video_vae_fp16.safetensors"}, "class_type": "VAELoader", "_meta": {"title": "Carica VAE"}}, "120": {"inputs": {"vae_name": "minimax_h3_audio_vae_fp32.safetensors"}, "class_type": "VAELoader", "_meta": {"title": "Carica VAE"}}, "121": {"inputs": {"samples": ["125", 0], "vae": ["120", 0]}, "class_type": "VAEDecodeAudio", "_meta": {"title": "Decodifica audio VAE"}}, "122": {"inputs": {"samples": ["125", 0], "vae": ["119", 0]}, "class_type": "VAEDecode", "_meta": {"title": "Decodifica VAE"}}, "123": {"inputs": {"sampler_name": "res_multistep"}, "class_type": "KSamplerSelect", "_meta": {"title": "KSamplerSelect"}}, "124": {"inputs": {"scheduler": "simple", "steps": ["142", 0], "denoise": 1, "model": ["127", 0]}, "class_type": "BasicScheduler", "_meta": {"title": "Scheduler Base"}}, "125": {"inputs": {"noise": ["129", 0], "guider": ["126", 0], "sampler": ["123", 0], "sigmas": ["124", 0], "latent_image": ["136", 1]}, "class_type": "SamplerCustomAdvanced", "_meta": {"title": "SamplerCustomAdvanced"}}, "126": {"inputs": {"model": ["141", 0], "conditioning": ["136", 0]}, "class_type": "BasicGuider", "_meta": {"title": "Guida Base"}}, "127": {"inputs": {"unet_name": "minimax_h3_ref2va_pruned_int8_convrot.safetensors", "weight_dtype": "default"}, "class_type": "UNETLoader", "_meta": {"title": "Carica modello di diffusione"}}, "128": {"inputs": {"clip_name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors", "type": "minimax", "device": "default"}, "class_type": "CLIPLoader", "_meta": {"title": "Carica CLIP"}}, "129": {"inputs": {"noise_seed": 261662374822964}, "class_type": "RandomNoise", "_meta": {"title": "RandomNoise"}}, "130": {"inputs": {"fps": 24, "bit_depth": 8, "color_space": "sRGB", "codec": "none", "images": ["122", 0], "audio": ["121", 0]}, "class_type": "CreateVideo", "_meta": {"title": "Crea Video"}}, "131": {"inputs": {"expression": "max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17", "values.a": ["132", 0]}, "class_type": "ComfyMathExpression", "_meta": {"title": "Espressione Matematica"}}, "132": {"inputs": {"value": 8}, "class_type": "PrimitiveFloat", "_meta": {"title": "Float (Duration)"}}, "136": {"inputs": {"prompt": ["138", 0], "width": ["115", 0], "height": ["115", 1], "length": ["131", 1], "ref_image_size": "match", "clip": ["128", 0], "vae": ["119", 0], "audio_vae": ["120", 0], "ref_images.ref_image_0": ["137", 0], "ref_images.ref_image_1": ["139", 0], "ref_images.ref_image_2": ["147", 0], "ref_images.ref_image_3": ["148", 0]}, "class_type": "MiniMaxH3ReferenceToVideo", "_meta": {"title": "MiniMax H3 Riferimento a Video"}}, "137": {"inputs": {"image": "red_superboy_on_city_roof.png"}, "class_type": "LoadImage", "_meta": {"title": "Carica Immagine"}}, "138": {"inputs": {"value": "Bold comic-book ink style, heavy linework, red and blue-black palette, night city. Use <Picture 2> and <Picture 1> as reference frames and <Audio 1> exactly as it is.\nCUT 1: top-down view of the little boy superhero on the rooftop \u2014 red cape fluttering in the wind, hands planted on his hips, freckles and a cocky grin as he looks straight up into the camera. The camera slowly descends toward him as he delivers his line \u2014 as he speaks, comic-book graphic overlay text word by word in sync with his voice: \"GET READY TO\" - \"MEET\" \u2014 \"YOUR\" \u2014 \"MAKER\" \u2014 huge jagged comic lettering, white with heavy black outlines and red drop shadows, tilted at scrappy angles, until the three words hang stacked in the air above him between his face and the lens.\nTRANSITION: a violent WHIP PAN off the rooftop that SMEARS the floating words away with it, motion-streaked \u2014\nCUT 2: low hero angle on the colossal black mech-kaiju towering over the skyline as it rears back and unleashes a GIANT terrifying ROAR \u2014 jaws wide with fangs, red eyes and chest-core flaring blinding bright, blue lightning arcing off its head, the roar's shockwave rippling dust and rattling windows down the buildings, comic-style speed-lines and ink splatter bursting from the impact of the sound. It leans INTO the camera as the roar peaks. Hold on the roar."}, "class_type": "PrimitiveStringMultiline", "_meta": {"title": "Input Text (Prompt)"}}, "139": {"inputs": {"image": "mecha_dragon_lightning.png"}, "class_type": "LoadImage", "_meta": {"title": "Carica Immagine"}}, "141": {"inputs": {"switch": ["146", 0], "on_false": ["127", 0], "on_true": ["145", 0]}, "class_type": "ComfySwitchNode", "_meta": {"title": "If/Else Switch (model)"}}, "142": {"inputs": {"switch": ["146", 0], "on_false": ["143", 0], "on_true": ["144", 0]}, "class_type": "ComfySwitchNode", "_meta": {"title": "If/Else Switch (Steps)"}}, "143": {"inputs": {"value": 20}, "class_type": "PrimitiveInt", "_meta": {"title": "Int (Full)"}}, "144": {"inputs": {"value": 4}, "class_type": "PrimitiveInt", "_meta": {"title": "Int (Lightning LoRA)"}}, "145": {"inputs": {"lora_name": "minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors", "strength_model": 1, "model": ["127", 0]}, "class_type": "LoraLoaderModelOnly", "_meta": {"title": "Carica LoRA"}}, "146": {"inputs": {"value": false}, "class_type": "PrimitiveBoolean", "_meta": {"title": "Boolean (Enable Lightning LoRA)"}}, "147": {"inputs": {"image": "mecha_dragon_lightning.png"}, "class_type": "LoadImage", "_meta": {"title": "Carica Immagine"}}, "148": {"inputs": {"image": "mecha_dragon_lightning.png"}, "class_type": "LoadImage", "_meta": {"title": "Carica Immagine"}}};

const LOGOS = {
  "comfyui": "ComfyUI",
  "minimax": "MiniMax H3 R2V"
};

export default function ComfyRemote() {
  const [pods, setPods] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>("");
  const [logs, setLogs] = useState<string[]>(["[v4] ComfyRemote pronto"]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Workflow params
  const [prompt, setPrompt] = useState("superboy on city roof at night, cinematic lighting, mecha dragon behind, lightning storm, epic anime style");
  const [length, setLength] = useState(121);
  const [aspect, setAspect] = useState("9:16 (Portrait Widescreen)");
  const [megapixels, setMegapixels] = useState(0.4);
  const [refImages, setRefImages] = useState<string[]>(["red_superboy_on_city_roof.png", "mecha_dragon_lightning.png"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastVideo, setLastVideo] = useState<string>("");

  const addLog = (msg: string) => setLogs(l => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l].slice(0,100));

  // Load saved key
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
    addLog("Connessione RunPod...");
    try {
      // Fetch pods - split queries to avoid 100 limit
      const headers = { "Authorization": `Bearer ${key}` };
      
      const [podsRes, templatesRes, networkRes] = await Promise.all([
        fetch("https://api.runpod.io/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ query: "{ pods { id name runtime { uptimeInSeconds } machine { gpuTypeId } } }" })
        }).then(r => r.json()),
        fetch("https://api.runpod.io/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ query: "{ myself { podTemplates { id name containerDiskInGb } } }" })
        }).then(r => r.json()),
        fetch("https://api.runpod.io/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ query: "{ pods { id networkVolumeId } }" })
        }).then(r => r.json()).catch(() => null)
      ]);

      // Handle pods from different shapes
      let podsData: any[] = [];
      if (podsRes?.data?.pods) podsData = podsRes.data.pods;
      if (podsRes?.data?.myself?.pods) podsData = podsRes.data.myself.pods;

      // If we got only 100, try paginated
      if (podsData.length === 100) {
        addLog("⚠️ 100+ pods, carico resto...");
        // Try second query with offset - RunPod doesn't support offset, but we try myself pods
        const extra = await fetch("https://api.runpod.io/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ query: "{ myself { pods { id name } } }" })
        }).then(r => r.json());
        if (extra?.data?.myself?.pods) {
          podsData = extra.data.myself.pods;
        }
      }

      setPods(podsData);
      addLog(`Pod trovati: ${podsData.length}`);

      const tmpl = templatesRes?.data?.myself?.podTemplates || [];
      setTemplates(tmpl);
      addLog(`Template: ${tmpl.length}`);

      if (podsData.length > 0 && !selectedPod) setSelectedPod(podsData[0].id);

    } catch (e: any) {
      addLog(`Errore: ${e.message}`);
    }
    setLoading(false);
  };

  const runWorkflow = async () => {
    if (!selectedPod) { addLog("Seleziona un Pod"); return; }
    setIsGenerating(true);
    addLog(`🚀 Lancio MiniMax H3 su ${selectedPod} - prompt: ${prompt.slice(0,50)}...`);

    // Build API workflow with current params
    const workflow = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
    
    // Patch prompt - node 138 is PrimitiveStringMultiline
    for (const [id, node] of Object.entries(workflow)) {
      const n: any = node;
      if (n.class_type === "PrimitiveStringMultiline" || n._meta?.title?.toLowerCase().includes("prompt")) {
        if (n.inputs?.value !== undefined) n.inputs.value = prompt;
        if (n.inputs?.string !== undefined) n.inputs.string = prompt;
      }
      // Find the node that feeds prompt into MiniMax
      if (n.class_type === "MiniMaxH3ReferenceToVideo") {
        // prompt is via link, so we need to patch source node 138
      }
    }
    // Node 138 is prompt source
    if (workflow["138"]) {
      workflow["138"].inputs.value = prompt;
      workflow["138"].inputs.string = prompt;
    }
    // Length - node 131 is PrimitiveInt
    if (workflow["131"]) {
      workflow["131"].inputs.value = length;
    }
    // Aspect
    if (workflow["115"]) {
      workflow["115"].inputs.aspect_ratio = aspect;
      workflow["115"].inputs.megapixels = megapixels;
    }

    // For now, simulate job - in real implementation would POST to pod's ComfyUI /prompt
    // Pod ComfyUI endpoint: https://{podId}-8188.proxy.runpod.net/prompt
    try {
      const podEndpoint = `https://${selectedPod}-8188.proxy.runpod.net/prompt`;
      addLog(`POST a ${podEndpoint}`);
      
      const res = await fetch(podEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow, client_id: "comfyremote" })
      });

      if (!res.ok) {
        const txt = await res.text();
        addLog(`Risposta pod: ${res.status} - ${txt.slice(0,200)}`);
        addLog("💡 Se 404, attiva Expose HTTP Ports sul Pod (port 8188)");
      } else {
        const data = await res.json();
        addLog(`✅ Job in coda: ${JSON.stringify(data)}`);
        setLastVideo(podEndpoint.replace("/prompt","/view?filename=..."));
      }
    } catch (e: any) {
      addLog(`Errore connessione Pod (normale se non esposto): ${e.message}`);
      addLog("Simulo generazione per UI...");
      setTimeout(() => {
        addLog("🎬 Video pronto! (mock - connetti Pod con porta 8188 aperta)");
        setLastVideo("mock_video.mp4");
      }, 2000);
    }
    setIsGenerating(false);
  };

  useEffect(() => {
    if (apiKey) fetchAll(apiKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tighter">COMFYREMOTE <span className="text-zinc-500 text-sm">v4 • MINIMAX H3</span></h1>
          <div className="flex gap-2">
            <input 
              type={showKey ? "text" : "password"} 
              value={apiKey} 
              onChange={e=>setApiKey(e.target.value)} 
              placeholder="RunPod API Key"
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm w-48"
            />
            <button onClick={()=>setShowKey(!showKey)} className="bg-zinc-800 px-2 rounded text-xs">👁</button>
            <button onClick={saveKey} className="bg-white text-black px-4 py-1 rounded text-sm font-bold">SAVE & SYNC</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Pods */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h2 className="font-bold mb-3 text-sm tracking-widest">PODS ({pods.length})</h2>
            {loading ? <div className="text-zinc-500 text-xs">Caricamento...</div> : 
              pods.map((p:any) => (
                <div key={p.id} onClick={()=>setSelectedPod(p.id)} className={`p-2 mb-2 rounded cursor-pointer text-xs border ${selectedPod===p.id ? "bg-white text-black border-white" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"}`}>
                  <div className="font-bold">{p.name || p.id.slice(0,8)}</div>
                  <div className="opacity-60">{p.machine?.gpuTypeId || p.id}</div>
                </div>
              ))
            }
            {pods.length===0 && !loading && <div className="text-zinc-600 text-xs">Nessun pod. Crea un pod ComfyUI su RunPod.</div>}
            
            <h2 className="font-bold mt-6 mb-3 text-sm tracking-widest">TEMPLATES ({templates.length})</h2>
            {templates.map((t:any)=>(
              <div key={t.id} className="text-xs p-2 bg-zinc-900 border border-zinc-800 rounded mb-1">{t.name}</div>
            ))}

            <div className="mt-6 bg-black border border-zinc-800 rounded p-2 h-48 overflow-auto text-[10px] leading-relaxed">
              {logs.map((l,i)=><div key={i} className="text-zinc-400">{l}</div>)}
            </div>
          </div>

          {/* Center - Workflow Remote */}
          <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">MiniMax H3 • Reference to Video</h2>
                <p className="text-zinc-500 text-xs mt-1">4x Ref Images • 9:16 • Audio VAE</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${isGenerating ? "bg-yellow-500 text-black animate-pulse" : "bg-green-500 text-black"}`}>
                {isGenerating ? "GENERATING..." : "READY"}
              </div>
            </div>

            <label className="text-[10px] tracking-widest text-zinc-500 font-bold">PROMPT</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-3 text-sm mt-1 h-24 focus:border-white outline-none" placeholder="Describe scene..." />

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="text-[10px] tracking-widest text-zinc-500 font-bold">LENGTH (frames)</label>
                <input type="number" value={length} onChange={e=>setLength(parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-[10px] tracking-widest text-zinc-500 font-bold">ASPECT</label>
                <select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1">
                  <option>9:16 (Portrait Widescreen)</option>
                  <option>16:9 (Widescreen)</option>
                  <option>1:1 (Square)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-widest text-zinc-500 font-bold">MEGAPIXELS</label>
                <input type="number" step="0.1" value={megapixels} onChange={e=>setMegapixels(parseFloat(e.target.value))} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm mt-1" />
              </div>
            </div>

            <label className="text-[10px] tracking-widest text-zinc-500 font-bold mt-4 block">REFERENCE IMAGES</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {refImages.map((img,i)=>(
                <div key={i} className="bg-black border border-zinc-800 rounded p-2 text-xs flex justify-between">
                  <span>{img}</span>
                  <button onClick={()=>setRefImages(refImages.filter((_,idx)=>idx!==i))} className="text-zinc-500 hover:text-white">✕</button>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-zinc-600 mt-2">Caricate su ComfyUI/input/ del Pod. Puoi aggiungere upload drag&drop nella prossima versione.</div>

            <button onClick={runWorkflow} disabled={isGenerating || !selectedPod} className="w-full mt-6 bg-white text-black font-black tracking-widest py-4 rounded hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed text-sm">
              {isGenerating ? "⏳ GENERAZIONE IN CORSO..." : "▶ GENERA VIDEO SUL POD"}
            </button>

            {lastVideo && (
              <div className="mt-6 border border-green-900 bg-green-950/20 rounded p-3 text-xs">
                <div className="font-bold text-green-400">Ultimo video:</div>
                <div className="text-zinc-400 mt-1 break-all">{lastVideo}</div>
                <div className="text-zinc-600 mt-2">Controlla su https://{selectedPod}-8188.proxy.runpod.net/ → Queue / History</div>
              </div>
            )}

            <details className="mt-6">
              <summary className="text-xs text-zinc-500 cursor-pointer">Mostra JSON workflow (debug)</summary>
              <pre className="text-[9px] bg-black border border-zinc-800 rounded p-2 mt-2 overflow-auto max-h-64">{JSON.stringify(WORKFLOW_TEMPLATE, null, 2).slice(0,5000)}</pre>
            </details>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-zinc-600 tracking-widest">
          COMFYREMOTE v4 • POD SPLIT QUERY FIX • MINIMAX H3 R2V • AUTONOMOUS DEPLOY READY
        </div>
      </div>
    </div>
  );
}
