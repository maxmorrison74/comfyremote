"use client";
import { useState, useEffect } from "react";

const FULL_WORKFLOW = {
  "92": {"inputs": {"filename_prefix": "video/MiniMax_H3","format":"auto","format.codec":"auto","codec":"auto","video":["130",0]}, "class_type":"SaveVideo"},
  "115": {"inputs": {"aspect_ratio":"9:16 (Portrait Widescreen)","megapixels":0.4,"multiple":32}, "class_type":"ResolutionSelector"},
  "119": {"inputs": {"vae_name":"minimax_h3_video_vae_fp16.safetensors"}, "class_type":"VAELoader"},
  "120": {"inputs": {"vae_name":"minimax_h3_audio_vae_fp32.safetensors"}, "class_type":"VAELoader"},
  "121": {"inputs": {"samples":["125",0],"vae":["120",0]}, "class_type":"VAEDecodeAudio"},
  "122": {"inputs": {"samples":["125",0],"vae":["119",0]}, "class_type":"VAEDecode"},
  "123": {"inputs": {"sampler_name":"res_multistep"}, "class_type":"KSamplerSelect"},
  "124": {"inputs": {"scheduler":"simple","steps":["142",0],"denoise":1,"model":["127",0]}, "class_type":"BasicScheduler"},
  "125": {"inputs": {"noise":["129",0],"guider":["126",0],"sampler":["123",0],"sigmas":["124",0],"latent_image":["136",1]}, "class_type":"SamplerCustomAdvanced"},
  "126": {"inputs": {"model":["141",0],"conditioning":["136",0]}, "class_type":"BasicGuider"},
  "127": {"inputs": {"unet_name":"minimax_h3_ref2va_pruned_int8_convrot.safetensors","weight_dtype":"default"}, "class_type":"UNETLoader"},
  "128": {"inputs": {"clip_name":"qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors","type":"minimax","device":"default"}, "class_type":"CLIPLoader"},
  "129": {"inputs": {"noise_seed":261662374822964}, "class_type":"RandomNoise"},
  "130": {"inputs": {"fps":24,"bit_depth":8,"color_space":"sRGB","codec":"none","images":["122",0],"audio":["121",0]}, "class_type":"CreateVideo"},
  "131": {"inputs": {"expression":"max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17","values.a":["132",0]}, "class_type":"ComfyMathExpression"},
  "132": {"inputs": {"value":8}, "class_type":"PrimitiveFloat"},
  "136": {"inputs": {"prompt":["138",0],"width":["115",0],"height":["115",1],"length":["131",1],"ref_image_size":"match","clip":["128",0],"vae":["119",0],"audio_vae":["120",0],"ref_images.ref_image_0":["137",0],"ref_images.ref_image_1":["139",0],"ref_images.ref_image_2":["147",0],"ref_images.ref_image_3":["148",0]}, "class_type":"MiniMaxH3ReferenceToVideo"},
  "137": {"inputs": {"image":"red_superboy_on_city_roof.png"}, "class_type":"LoadImage"},
  "138": {"inputs": {"value":"PROMPT_PLACEHOLDER"}, "class_type":"PrimitiveStringMultiline"},
  "139": {"inputs": {"image":"mecha_dragon_lightning.png"}, "class_type":"LoadImage"},
  "141": {"inputs": {"switch":["146",0],"on_false":["127",0],"on_true":["145",0]}, "class_type":"ComfySwitchNode"},
  "142": {"inputs": {"switch":["146",0],"on_false":["143",0],"on_true":["144",0]}, "class_type":"ComfySwitchNode"},
  "143": {"inputs": {"value":20}, "class_type":"PrimitiveInt"},
  "144": {"inputs": {"value":4}, "class_type":"PrimitiveInt"},
  "145": {"inputs": {"lora_name":"minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors","strength_model":1,"model":["127",0]}, "class_type":"LoraLoaderModelOnly"},
  "146": {"inputs": {"value":false}, "class_type":"PrimitiveBoolean"},
  "147": {"inputs": {"image":"mecha_dragon_lightning.png"}, "class_type":"LoadImage"},
  "148": {"inputs": {"image":"mecha_dragon_lightning.png"}, "class_type":"LoadImage"}
};

export default function ComfyRemote(){
  const [pods,setPods]=useState<any[]>([]);
  const [sel,setSel]=useState(""); const [logs,setLogs]=useState<string[]>(["[v4.5] RENDER FIX - workflow completo 4x ref"]);
  const [loading,setLoading]=useState(false); const [key,setKey]=useState(""); const [show,setShow]=useState(false);
  const [prompt,setPrompt]=useState("Bold comic-book ink style, heavy linework, red and blue-black palette, night city. Use <Picture 2> and <Picture 1> as reference frames and <Audio 1> exactly as it is.\nCUT 1: top-down view of the little boy superhero on the rooftop — red cape fluttering in the wind, hands planted on his hips, freckles and a cocky grin as he looks straight up into the camera.\nCUT 2: low hero angle on the colossal black mech-kaiju towering over the skyline as it rears back and unleashes a GIANT terrifying ROAR.");
  const [duration,setDuration]=useState(8);
  const [aspect,setAspect]=useState("9:16 (Portrait Widescreen)");
  const [refs,setRefs]=useState(["red_superboy_on_city_roof.png","mecha_dragon_lightning.png"]);
  const [isGen,setIsGen]=useState(false);

  const addLog=(m:string)=>setLogs(l=>[`[${new Date().toLocaleTimeString()}] ${m}`,...l].slice(0,150));
  useEffect(()=>{ const s=localStorage.getItem("runpod_key"); if(s) setKey(s); },[]);
  const save=()=>{ localStorage.setItem("runpod_key",key); addLog("Key salvata"); fetchAll(key); };

  const fetchAll=async(k:string)=>{
    if(!k) return; setLoading(true); addLog("Connessione via proxy...");
    try{
      const q="{ pods { id name desiredStatus runtime { uptimeInSeconds } machine { gpuTypeId } } myself { pods { id name desiredStatus } } }";
      const r=await fetch("/api/runpod",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":k},body:JSON.stringify({query:q})}).then(r=>r.json());
      const a=r?.data?.pods||[]; const b=r?.data?.myself?.pods||[];
      const merged=[...a]; for(const p of b) if(!merged.find(m=>m.id===p.id)) merged.push(p);
      setPods(merged); addLog(`Pod trovati: ${merged.length} (attivi ${a.length})`);
      if(merged.length>0 && !sel) setSel(merged[0].id);
    }catch(e:any){ addLog("Errore "+e.message);} setLoading(false);
  };

  const podAct=async(id:string,act:string)=>{
    const map:any={stop:`mutation { podStop(input: { podId: "${id}" }) { id } }`,resume:`mutation { podResume(input: { podId: "${id}" }) { id } }`,terminate:`mutation { podTerminate(input: { podId: "${id}" }) { id } }`};
    addLog(`${act} ${id.slice(0,6)}`); const r=await fetch("/api/runpod",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key},body:JSON.stringify({query:map[act]})}).then(r=>r.json());
    if(r.errors) addLog("Errore "+JSON.stringify(r.errors).slice(0,200)); else { addLog("✅ "+act+" ok"); setTimeout(()=>fetchAll(key),1500); }
  };

  const run=async()=>{
    if(!sel){ addLog("Seleziona Pod"); return; }
    setIsGen(true);
    addLog(`🚀 Invio workflow completo 4x ref su ${sel.slice(0,6)}`);
    try{
      const wf:any = JSON.parse(JSON.stringify(FULL_WORKFLOW));
      // Patch 4 refs
      wf["137"].inputs.image = refs[0] || "red_superboy_on_city_roof.png";
      wf["139"].inputs.image = refs[1] || "mecha_dragon_lightning.png";
      wf["147"].inputs.image = refs[2] || "mecha_dragon_lightning.png";
      wf["148"].inputs.image = refs[3] || "mecha_dragon_lightning.png";
      wf["138"].inputs.value = prompt;
      wf["132"].inputs.value = duration;
      wf["115"].inputs.aspect_ratio = aspect;
      wf["129"].inputs.noise_seed = Math.floor(Math.random()*1000000000000000);

      const endpoint = `https://${sel}-8188.proxy.runpod.net/prompt`;
      addLog(`POST ${endpoint} - ${Object.keys(wf).length} nodi - prompt ${prompt.length} chars`);
      
      const res = await fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt: wf, client_id: "comfyremote-v4.5" }) });
      const txt = await res.text();
      if(!res.ok){ addLog(`❌ Pod ${res.status}: ${txt.slice(0,500)}`); addLog("Verifica: 1) Pod RUNNING 2) Edit Pod -> Expose 8188 3) ComfyUI acceso su 0.0.0.0:8188"); }
      else { addLog(`✅ RENDER Lanciato! Job ID: ${txt.slice(0,300)}`); addLog("Apri ComfyUI del Pod per vedere coda: https://"+sel+"-8188.proxy.runpod.net"); }
    }catch(e:any){ addLog("❌ Connessione Pod fallita: "+e.message); addLog("Soluzione: apri manualmente https://"+sel+"-8188.proxy.runpod.net e verifica ComfyUI"); }
    setIsGen(false);
  };

  useEffect(()=>{ if(key) fetchAll(key); },[]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h1 className="text-xl font-bold">COMFYREMOTE <span className="text-zinc-500 text-xs">v4.5 • RENDER FIX</span></h1>
          <div className="flex gap-2"><input type={show?"text":"password"} value={key} onChange={e=>setKey(e.target.value)} placeholder="RunPod Key" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm w-44"/><button onClick={()=>setShow(!show)} className="bg-zinc-800 px-2 rounded text-xs">👁</button><button onClick={save} className="bg-white text-black px-4 py-1 rounded text-sm font-bold">SYNC</button></div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col">
            <h2 className="font-bold mb-3 text-xs">PODS ({pods.length})</h2>
            <div className="space-y-2 max-h- overflow-auto">
              {pods.map((p:any)=><div key={p.id} className={`p-2 rounded border text-xs ${sel===p.id?"bg-white text-black":"bg-zinc-900 border-zinc-800"}`}>
                <div onClick={()=>setSel(p.id)} className="cursor-pointer font-bold flex justify-between"><span className="truncate">{p.name||p.id.slice(0,8)}</span><span className={`text- px-1 rounded ${p.desiredStatus==="RUNNING"?"bg-green-600 text-black":"bg-zinc-700"}`}>{p.desiredStatus}</span></div>
                <div className="flex gap-1 mt-2"><button onClick={()=>podAct(p.id,"resume")} className="flex-1 bg-green-600 text-black font-bold py-1 rounded text-">▶ START</button><button onClick={()=>podAct(p.id,"stop")} className="flex-1 bg-zinc-700 py-1 rounded text-">⏸ STOP</button><button onClick={()=>{ if(confirm("Terminare?")) podAct(p.id,"terminate"); }} className="bg-red-900/40 px-2 rounded text-">🗑</button></div>
              </div>)}
              {pods.length===0 && <div className="text-zinc-500 text-xs p-2 border border-dashed rounded">Nessun Pod - crea su runpod.io</div>}
            </div>
            <div className="mt-4 bg-black border border-zinc-800 rounded p-2 h-64 overflow-auto text-">{logs.map((l,i)=><div key={i} className="text-zinc-400 whitespace-pre-wrap">{l}</div>)}</div>
          </div>
          <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
            <h2 className="font-bold text-sm">MiniMax H3 R2V • 4 REFS OBBLIGATORIE</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {refs.map((r,i)=><div key={i} className="flex gap-2 items-center bg-black border border-zinc-800 rounded p-2"><span className="text- bg-zinc-800 px-1 rounded">REF{i+1}</span><input value={r} onChange={e=>{ const c=[...refs]; c[i]=e.target.value; setRefs(c); }} className="flex-1 bg-transparent text-xs outline-none" /></div>)}
            </div>
            <label className="text- text-zinc-500 font-bold mt-4 block">PROMPT (nodo 138)</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-3 text-sm mt-1 h-32" />
            <div className="grid grid-cols-2 gap-3 mt-3"><div><label className="text- text-zinc-500">DURATION sec (132)</label><input type="number" value={duration} onChange={e=>setDuration(parseInt(e.target.value)||8)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm" /></div><div><label className="text- text-zinc-500">ASPECT (115)</label><select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-sm"><option>9:16 (Portrait Widescreen)</option><option>16:9 (Widescreen)</option><option>1:1 (Square)</option></select></div></div>
            <button onClick={run} disabled={isGen || !sel} className="w-full mt-5 bg-white text-black font-black py-4 rounded text-sm disabled:opacity-30">{isGen?"⏳ LANCIO...":"▶ GENERA VIDEO 4x REF - LANCIA RENDER VERO"}</button>
            <div className="text- text-zinc-600 mt-2">Invia workflow completo {Object.keys(FULL_WORKFLOW).length} nodi a /prompt. Richiede Pod RUNNING + porta 8188 esposta.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
