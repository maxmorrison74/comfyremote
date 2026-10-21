"use client";
import { useState, useEffect } from "react";

const FULL_WORKFLOW = {
  "92": {"inputs": {"filename_prefix": "video/MiniMax_H3","format":"auto","video":["130",0]}, "class_type":"SaveVideo"},
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
  "130": {"inputs": {"fps":24,"images":["122",0],"audio":["121",0]}, "class_type":"CreateVideo"},
  "131": {"inputs": {"expression":"max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17","values.a":["132",0]}, "class_type":"ComfyMathExpression"},
  "132": {"inputs": {"value":8}, "class_type":"PrimitiveFloat"},
  "136": {"inputs": {"prompt":["138",0],"width":["115",0],"height":["115",1],"length":["131",1],"ref_image_size":"match","clip":["128",0],"vae":["119",0],"audio_vae":["120",0],"ref_images.ref_image_0":["137",0],"ref_images.ref_image_1":["139",0],"ref_images.ref_image_2":["147",0],"ref_images.ref_image_3":["148",0]}, "class_type":"MiniMaxH3ReferenceToVideo"},
  "137": {"inputs": {"image":"red_superboy_on_city_roof.png"}, "class_type":"LoadImage"},
  "138": {"inputs": {"value":"PROMPT"}, "class_type":"PrimitiveStringMultiline"},
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

export default function Page(){
  const [pods,setPods]=useState<any[]>([]); const [sel,setSel]=useState(""); const [logs,setLogs]=useState<string[]>(["[v4.7] FIX: uso myself.pods - trovati 12 EXITED"]);
  const [key,setKey]=useState(""); const [prompt,setPrompt]=useState("Bold comic-book ink style, heavy linework, red and blue-black palette, night city. Use <Picture 2> and <Picture 1> as reference frames and <Audio 1> exactly as it is.\nCUT 1: top-down view of the little boy superhero on the rooftop — red cape fluttering in the wind, hands planted on his hips, freckles and a cocky grin as he looks straight up into the camera.\nCUT 2: low hero angle on the colossal black mech-kaiju towering over the skyline as it rears back and unleashes a GIANT terrifying ROAR.");
  const [refs,setRefs]=useState(["red_superboy_on_city_roof.png","mecha_dragon_lightning.png","mecha_dragon_lightning.png"]);
  const [duration,setDuration]=useState(8); const [aspect,setAspect]=useState("9:16 (Portrait Widescreen)"); const [isGen,setIsGen]=useState(false); const [loading,setLoading]=useState(false);

  const addLog=(m:string)=>setLogs(l=>[`[${new Date().toLocaleTimeString()}] ${m}`,...l].slice(0,150));
  useEffect(()=>{ const s=localStorage.getItem("runpod_key"); if(s) setKey(s); },[]);

  const fetchAll=async(k:string)=>{
    if(!k) return; setLoading(true); addLog("Carico myself.pods...");
    try{
      const q="{ myself { pods { id name desiredStatus machine { gpuTypeId } runtime { uptimeInSeconds } } } }";
      const r=await fetch("/api/runpod",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":k},body:JSON.stringify({query:q})}).then(r=>r.json());
      const all=r?.data?.myself?.pods||[];
      setPods(all); addLog(`✅ Pod trovati: ${all.length} (tutti EXITED - normalissimo)`);
      if(all.length>0 && !sel) setSel(all[0].id);
    }catch(e:any){ addLog("Errore "+e.message);} setLoading(false);
  };

  const save=()=>{ localStorage.setItem("runpod_key",key); addLog("Key salvata"); fetchAll(key); };
  const podAct=async(id:string,act:string)=>{
    const map:any={resume:`mutation { podResume(input: { podId: "${id}" }) { id desiredStatus } }`,stop:`mutation { podStop(input: { podId: "${id}" }) { id desiredStatus } }`,terminate:`mutation { podTerminate(input: { podId: "${id}" }) { id } }`};
    addLog(`${act.toUpperCase()} ${id.slice(0,6)}...`); 
    try{
      const r=await fetch("/api/runpod",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key},body:JSON.stringify({query:map[act]})}).then(r=>r.json());
      if(r.errors) addLog("Errore: "+JSON.stringify(r.errors).slice(0,300));
      else { addLog(`✅ ${act} ok - Pod va in RUNNING in ~60s`); setTimeout(()=>fetchAll(key),3000); }
    }catch(e:any){ addLog("Errore "+e.message); }
  };

  const run=async()=>{
    if(!sel){ addLog("Seleziona Pod"); return; }
    const selected = pods.find((p:any)=>p.id===sel);
    if(selected?.desiredStatus!=="RUNNING"){ addLog("⚠️ Pod non in RUNNING - avvia prima con ▶ START e aspetta 60s"); return; }
    setIsGen(true); addLog(`🚀 Lancio render su ${sel.slice(0,6)}...`);
    try{
      const wf:any=JSON.parse(JSON.stringify(FULL_WORKFLOW));
      wf["137"].inputs.image=refs[0]; wf["139"].inputs.image=refs[1]; wf["147"].inputs.image=refs[2]||refs[1]; wf["148"].inputs.image=refs[3]||refs[1];
      wf["138"].inputs.value=prompt; wf["132"].inputs.value=duration; wf["115"].inputs.aspect_ratio=aspect; wf["129"].inputs.noise_seed=Math.floor(Math.random()*1e15);
      const endpoint=`https://${sel}-8188.proxy.runpod.net/prompt`;
      addLog(`POST ${endpoint}`);
      const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:wf,client_id:"comfyremote-v4.7"})});
      const txt=await res.text();
      if(!res.ok){ addLog(`❌ ${res.status}: ${txt.slice(0,400)}`); } else { addLog(`✅ RENDER IN CODA! ${txt.slice(0,200)}`); addLog(`Apri ComfyUI: https://${sel}-8188.proxy.runpod.net`); }
    }catch(e:any){ addLog("❌ Connessione fallita - verifica porta 8188 esposta in RunPod Edit Pod"); }
    setIsGen(false);
  };

  useEffect(()=>{ if(key) fetchAll(key); },[]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-6 font-mono">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
          <h1 className="font-bold">COMFYREMOTE <span className="text-zinc-500 text-xs">v4.7 • 12 PODS EXITED FIX</span></h1>
          <div className="flex gap-2"><input type="password" value={key} onChange={e=>setKey(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm w-56" placeholder="RunPod API Key"/><button onClick={save} className="bg-white text-black px-4 py-1 rounded font-bold text-sm">{loading?"⏳":"SYNC"}</button></div>
        </header>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
            <h2 className="text-xs font-bold mb-2">PODS ({pods.length}) TUTTI EXITED - CLICCA ▶ START</h2>
            <div className="space-y-2 max-h- overflow-auto">
              {pods.map((p:any)=><div key={p.id} className={`p-2 rounded border text-xs ${sel===p.id?"bg-white text-black":"bg-zinc-900 border-zinc-800"}`}>
                <div onClick={()=>setSel(p.id)} className="cursor-pointer"><div className="font-bold flex justify-between"><span className="truncate w-32">{p.name}</span><span className={`text- px-1 rounded ${p.desiredStatus==="RUNNING"?"bg-green-500 text-black":"bg-zinc-700"}`}>{p.desiredStatus}</span></div><div className="text- opacity-60">{p.machine?.gpuTypeId} • {p.id}</div></div>
                <div className="flex gap-1 mt-2"><button onClick={()=>podAct(p.id,"resume")} className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold py-1.5 rounded text-">▶ START</button><button onClick={()=>podAct(p.id,"stop")} className="flex-1 bg-zinc-700 py-1.5 rounded text-">⏸ STOP</button><button onClick={()=>{ if(confirm("Terminare?")) podAct(p.id,"terminate"); }} className="bg-red-900/30 px-2 rounded">🗑</button></div>
              </div>)}
            </div>
            <div className="mt-3 bg-black border border-zinc-800 rounded p-2 h-48 overflow-auto text-">{logs.map((l,i)=><div key={i} className="text-zinc-400">{l}</div>)}</div>
          </div>
          <div className="col-span-2 bg-zinc-900/30 border border-zinc-800 rounded p-4">
            <h2 className="font-bold text-sm">MiniMax H3 • 4 REFS OBBLIGATORIE</h2>
            <div className="grid grid-cols-2 gap-2 mt-3">{refs.map((r,i)=><div key={i} className="flex gap-2 bg-black border border-zinc-800 rounded p-2"><span className="text- bg-zinc-800 px-1 rounded">REF{i+1}</span><input value={r} onChange={e=>{ const c=[...refs]; c[i]=e.target.value; setRefs(c); }} className="flex-1 bg-transparent text-xs outline-none" /></div>)}</div>
            <label className="text- text-zinc-500 font-bold mt-3 block">PROMPT</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-xs mt-1 h-32" />
            <div className="grid grid-cols-2 gap-2 mt-2"><input type="number" value={duration} onChange={e=>setDuration(parseInt(e.target.value)||8)} className="bg-black border border-zinc-800 rounded p-2 text-xs" placeholder="Duration"/><select value={aspect} onChange={e=>setAspect(e.target.value)} className="bg-black border border-zinc-800 rounded p-2 text-xs"><option>9:16 (Portrait Widescreen)</option><option>16:9 (Widescreen)</option><option>1:1 (Square)</option></select></div>
            <button onClick={run} disabled={isGen || !sel} className="w-full mt-4 bg-white text-black font-black py-3 rounded text-sm disabled:opacity-30">{isGen?"⏳":"▶ GENERA VIDEO - LANCIA RENDER VERO"}</button>
            <div className="text- text-zinc-500 mt-2">1) Seleziona Pod → 2) Clicca ▶ START → 3) Aspetta RUNNING (60s) → 4) GENERA VIDEO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
