
"use client"
import { useState, useEffect, useMemo } from 'react'

type Pod = { id: string; name: string; desiredStatus: string; imageName?: string; gpuCount?: number; runtime?: { uptimeInSeconds?: number; gpus?: any[] }; machineId?: string; costPerHr?: number }
type Template = { id: string; name: string; containerDiskInGb?: number; volumeInGb?: number; dockerArgs?: string; isServerless?: boolean }
type GpuType = { id: string; displayName: string; memoryInGb: number }

export default function Page(){
  const [apiKey, setApiKey] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [pods, setPods] = useState<Pod[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [gpuTypes, setGpuTypes] = useState<GpuType[]>([])
  const [activePod, setActivePod] = useState<Pod|null>(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>(['Pronto - inserisci API Key'])
  const [searchTemplate, setSearchTemplate] = useState('')
  const [searchGpu, setSearchGpu] = useState('')
  const [showDeploy, setShowDeploy] = useState(false)
  const [deployTemplateId, setDeployTemplateId] = useState('')
  const [deployGpu, setDeployGpu] = useState('NVIDIA GeForce RTX 4090')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [mode, setMode] = useState('R2V')
  const [prompt, setPrompt] = useState('a cinematic portrait walking in Tokyo at night, neon lights')

  const addLog = (m:string)=> setLogs(l=>[`${new Date().toLocaleTimeString()} ${m}`, ...l].slice(0,120))

  useEffect(()=>{
    const k = localStorage.getItem('runpod_api_key')||''
    setApiKey(k)
    const saved = localStorage.getItem('active_pod_id')
    if(k) fetchAll(k, saved)
  },[])

  useEffect(()=>{
    if(!autoRefresh || !apiKey) return
    const id = setInterval(()=>fetchAll(apiKey), 15000)
    return ()=>clearInterval(id)
  },[autoRefresh, apiKey])

  const fetchAll = async (key=apiKey, preferredId:string|null=null)=>{
    if(!key){ setShowSettings(true); return }
    setLoading(true)
    try{
      // pods + templates + gpuTypes
      const query = `{ 
        myself { 
          pods { id name desiredStatus imageName gpuCount costPerHr runtime { uptimeInSeconds gpus { id gpuDisplayName } } } 
          podTemplates { id name containerDiskInGb volumeInGb } 
        } 
        gpuTypes { id displayName memoryInGb }
      }`
      const res = await fetch('/api/runpod', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ apiKey: key, query }) })
      const json = await res.json()
      if(json.errors) throw new Error(json.errors[0].message)
      const list = json.data?.myself?.pods || []
      const tpls = json.data?.myself?.podTemplates || []
      const gpus = json.data?.gpuTypes || []
      setPods(list); setTemplates(tpls); setGpuTypes(gpus)
      addLog(`Sync: ${list.length} Pod, ${tpls.length} Template, ${gpus.length} GPU types`)
      if(preferredId){
        const f=list.find((p:Pod)=>p.id===preferredId)
        if(f) setActivePod(f)
      }
    }catch(e:any){ addLog(`Errore sync: ${e.message}`) }
    finally{ setLoading(false) }
  }

  const callAction = async (action:'resume'|'stop', id:string)=>{
    addLog(`${action} ${id.slice(0,8)}...`)
    const mut = action==='resume' ? `mutation { podResume(input: { podId: "${id}" }) { id desiredStatus } }` : `mutation { podStop(input: { podId: "${id}" }) { id desiredStatus } }`
    const res = await fetch('/api/runpod', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ apiKey, query: mut }) })
    const json = await res.json()
    if(json.errors) addLog(`Errore: ${json.errors[0].message}`)
    else { addLog(`${action} OK`); setTimeout(()=>fetchAll(), 3000) }
  }

  const deploy = async ()=>{
    if(!deployTemplateId){ addLog('Seleziona un template'); return }
    addLog(`Deploy: template ${deployTemplateId} su ${deployGpu}`)
    const mut = `mutation { podFindAndDeployOnDemand(input: { cloudType: SECURE, gpuCount: 1, gpuTypeId: "${deployGpu}", templateId: "${deployTemplateId}" }) { id desiredStatus } }`
    const res = await fetch('/api/runpod', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ apiKey, query: mut }) })
    const json = await res.json()
    if(json.errors) addLog(`Deploy errore: ${json.errors[0].message}`)
    else { addLog(`Deploy avviato: ${JSON.stringify(json.data)}`); setShowDeploy(false); setTimeout(()=>fetchAll(), 6000) }
  }

  const filteredTemplates = useMemo(()=> templates.filter(t=> t.name.toLowerCase().includes(searchTemplate.toLowerCase()) || t.id.toLowerCase().includes(searchTemplate.toLowerCase()) ), [templates, searchTemplate])
  const filteredGpus = useMemo(()=> gpuTypes.filter(g=> g.displayName.toLowerCase().includes(searchGpu.toLowerCase()) || g.id.toLowerCase().includes(searchGpu.toLowerCase()) ), [gpuTypes, searchGpu])

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <header className="border-b border-white/10 sticky top-0 bg-[#0a0a0b]/90 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold">C</div>
            <span className="font-semibold">ComfyRemote <span className="text-white/50">v3</span></span>
            <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">{pods.length} Pod • {templates.length} Template • {gpuTypes.length} GPU</span>
            <label className="flex items-center gap-1 text-[11px] ml-2"><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> auto 15s</label>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>fetchAll()} className="text-xs px-3 py-1.5 rounded bg-white/10">{loading?'...':'↻ Refresh'}</button>
            <button onClick={()=>setShowSettings(true)} className="text-xs px-3 py-1.5 rounded border border-white/10">{apiKey?'API OK':'Configura'}</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <div className="flex gap-2 mb-4">{['R2V','I2V','T2V','RefMod'].map(m=><button key={m} onClick={()=>setMode(m)} className={`px-4 py-2 rounded-full text-sm border ${mode===m?'bg-white text-black':'bg-white/5 border-white/10 text-white/60'}`}>{m}</button>)}</div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <h3 className="font-medium mb-3">{mode} - Minimax H3 {activePod?`→ ${activePod.name}`:''}</h3>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[80px]"/>
            <button disabled={!activePod || activePod.desiredStatus!=='RUNNING'} className="mt-4 w-full h-11 rounded-xl bg-white text-black font-semibold disabled:opacity-40">GENERA {mode}</button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">I Miei Pod</h4>
              <button onClick={()=>setShowDeploy(true)} className="text-xs px-2 py-1 rounded bg-white text-black font-medium">+ Deploy Nuovo</button>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-auto">
              {pods.map(p=>(
                <div key={p.id} onClick={()=>{setActivePod(p); localStorage.setItem('active_pod_id', p.id)}} className={`p-3 rounded-xl border cursor-pointer flex justify-between ${activePod?.id===p.id?'bg-white text-black border-white':'bg-white/[0.03] border-white/10'}`}>
                  <div><div className="text-sm font-medium">{p.name}</div><div className="text-[11px] opacity-60">{p.id.slice(0,10)} • {p.desiredStatus} • ${p.costPerHr||'?'}/h</div></div>
                  <div className="flex gap-1" onClick={e=>e.stopPropagation()}>{p.desiredStatus==='RUNNING'?<button onClick={()=>callAction('stop', p.id)} className="text-[11px] px-2 py-1 rounded bg-red-500/20 text-red-300">Stop</button>:<button onClick={()=>callAction('resume', p.id)} className="text-[11px] px-2 py-1 rounded bg-white text-black">Start</button>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black border border-white/10 rounded-2xl p-4 font-mono text-xs h-[280px] overflow-auto"><div className="text-white/50 mb-1">Logs live</div>{logs.map((l,i)=><div key={i} className="py-1 border-b border-white/5">{l}</div>)}</div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="font-semibold">API Key</h2>
            <input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" placeholder="rpa_..." className="mt-3 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
            <div className="flex gap-2 mt-4"><button onClick={()=>{localStorage.setItem('runpod_api_key', apiKey); fetchAll(apiKey); setShowSettings(false)}} className="flex-1 py-2 rounded-lg bg-white text-black text-sm">Salva & Sync</button></div>
          </div>
        </div>
      )}

      {showDeploy && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-auto">
            <h2 className="font-semibold text-lg">Deploy Nuovo Pod</h2>
            
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-white/70">Cerca Template</label>
                <input value={searchTemplate} onChange={e=>setSearchTemplate(e.target.value)} placeholder="Cerca nome template..." className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
                <div className="mt-2 space-y-1 max-h-[300px] overflow-auto">
                  {filteredTemplates.map(t=>(
                    <div key={t.id} onClick={()=>setDeployTemplateId(t.id)} className={`p-2 rounded-lg border cursor-pointer text-xs ${deployTemplateId===t.id?'bg-white text-black border-white':'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}>
                      <div className="font-medium">{t.name}</div>
                      <div className="opacity-60">{t.id.slice(0,12)} • {t.containerDiskInGb||''}GB</div>
                    </div>
                  ))}
                  {filteredTemplates.length===0 && <div className="text-[11px] text-white/40">Nessun template trovato</div>}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/70">Cerca Scheda Video (GPU)</label>
                <input value={searchGpu} onChange={e=>setSearchGpu(e.target.value)} placeholder="es. 4090, A6000..." className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
                <div className="mt-2 space-y-1 max-h-[300px] overflow-auto">
                  {filteredGpus.map(g=>(
                    <div key={g.id} onClick={()=>setDeployGpu(g.id)} className={`p-2 rounded-lg border cursor-pointer text-xs flex justify-between ${deployGpu===g.id?'bg-white text-black border-white':'bg-white/[0.03] border-white/10'}`}>
                      <span>{g.displayName}</span>
                      <span className="opacity-60">{g.memoryInGb}GB • {g.id.slice(0,20)}</span>
                    </div>
                  ))}
                  {filteredGpus.length===0 && <div className="text-[11px] text-white/40">Nessuna GPU trovata - usa dropdown classico</div>}
                  <select value={deployGpu} onChange={e=>setDeployGpu(e.target.value)} className="mt-2 w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-xs">
                    <option>NVIDIA GeForce RTX 4090</option>
                    <option>NVIDIA RTX A6000</option>
                    <option>NVIDIA A100-SXM4-80GB</option>
                    <option>NVIDIA L40S</option>
                    <option>NVIDIA GeForce RTX 3090</option>
                    {gpuTypes.map(g=><option key={g.id} value={g.id}>{g.displayName} - {g.id}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
              <div>Template selezionato: <b>{deployTemplateId ? templates.find(t=>t.id===deployTemplateId)?.name : 'nessuno'}</b></div>
              <div className="truncate opacity-60">{deployTemplateId}</div>
              <div>GPU: <b>{deployGpu}</b></div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowDeploy(false)} className="flex-1 py-2 rounded-lg bg-white/10 text-sm">Chiudi</button>
              <button onClick={deploy} className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-semibold">Deploya Ora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
