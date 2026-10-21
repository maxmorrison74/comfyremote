
"use client"
import { useState, useEffect } from 'react'

type Pod = {
  id: string
  name: string
  desiredStatus: string
  imageName?: string
  gpuCount?: number
  runtime?: { uptimeInSeconds?: number }
}

type Mode = 'R2V'|'I2V'|'T2V'|'RefMod'

export default function Page(){
  const [apiKey, setApiKey] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [pods, setPods] = useState<Pod[]>([])
  const [activePod, setActivePod] = useState<Pod | null>(null)
  const [loadingPods, setLoadingPods] = useState(false)
  const [logs, setLogs] = useState<string[]>(['Inserisci API Key per vedere i tuoi Pod'])
  const [mode, setMode] = useState<Mode>('R2V')
  const [prompt, setPrompt] = useState('a cinematic portrait walking in Tokyo at night, neon lights')
  const [showDeploy, setShowDeploy] = useState(false)
  const [deployGpu, setDeployGpu] = useState('NVIDIA GeForce RTX 4090')
  const [deployTemplateId, setDeployTemplateId] = useState('')
  const [podTemplates, setPodTemplates] = useState<any[]>([])

  const addLog = (m:string)=> setLogs(l=>[`${new Date().toLocaleTimeString()} ${m}`, ...l].slice(0,100))

  useEffect(()=>{
    const k = localStorage.getItem('runpod_api_key')||''
    setApiKey(k)
    const savedActive = localStorage.getItem('active_pod_id')
    if(k) setTimeout(()=>fetchPods(k, savedActive), 500)
  },[])

  const saveKey = (k:string)=>{
    localStorage.setItem('runpod_api_key', k)
    setApiKey(k)
    setShowSettings(false)
    fetchPods(k)
  }

  const fetchPods = async (key = apiKey, preferredId: string | null = null)=>{
    if(!key){ setShowSettings(true); return }
    setLoadingPods(true)
    addLog('Carico lista Pod...')
    try{
      const query = `{ myself { pods { id name desiredStatus imageName gpuCount runtime { uptimeInSeconds } } podTemplates { id name } } }`
      const res = await fetch('/api/runpod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, query })
      })
      const json = await res.json()
      if(json.errors){ throw new Error(json.errors[0].message) }
      const list: Pod[] = json.data?.myself?.pods || []
      setPods(list)
      setPodTemplates(json.data?.myself?.podTemplates || [])
      addLog(`Trovati ${list.length} Pod`)
      if(preferredId){
        const found = list.find(p=>p.id===preferredId)
        if(found) setActivePod(found)
      } else if(list.length>0 && !activePod){
        setActivePod(list[0])
        localStorage.setItem('active_pod_id', list[0].id)
      }
    }catch(e:any){
      addLog(`Errore lista Pod: ${e.message}`)
    }finally{ setLoadingPods(false) }
  }

  const callPodAction = async (action: 'resume' | 'stop', podId: string)=>{
    addLog(`${action==='resume'?'Avvio':'Stop'} Pod ${podId.slice(0,8)}...`)
    const mutation = action==='resume' ? `mutation { podResume(input: { podId: "${podId}" }) { id desiredStatus } }` : `mutation { podStop(input: { podId: "${podId}" }) { id desiredStatus } }`
    try{
      const res = await fetch('/api/runpod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, query: mutation })
      })
      const json = await res.json()
      if(json.errors) throw new Error(json.errors[0].message)
      addLog(`${action} OK: ${JSON.stringify(json.data)}`)
      setTimeout(()=>fetchPods(), 3000)
      let count=0
      const interval=setInterval(()=>{ count++; fetchPods(); if(count>6) clearInterval(interval) }, 5000)
    }catch(e:any){ addLog(`Errore ${action}: ${e.message}`) }
  }

  const deployNewPod = async ()=>{
    if(!deployTemplateId){ addLog('Inserisci Template ID (dal tuo template RunPod)'); return }
    addLog(`Deploy nuovo Pod con template ${deployTemplateId} GPU ${deployGpu}...`)
    // RunPod deploy mutation - usa podFindAndDeployOnDemand
    const mutation = `mutation { podFindAndDeployOnDemand(input: { cloudType: SECURE, gpuCount: 1, gpuTypeId: "${deployGpu}", templateId: "${deployTemplateId}" }) { id desiredStatus } }`
    try{
      const res = await fetch('/api/runpod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, query: mutation })
      })
      const json = await res.json()
      if(json.errors) throw new Error(json.errors[0].message)
      addLog(`Deploy iniziato: ${JSON.stringify(json.data)}`)
      setShowDeploy(false)
      setTimeout(()=>fetchPods(), 5000)
    }catch(e:any){ addLog(`Errore deploy: ${e.message} - verifica Template ID e quota GPU`) }
  }

  const selectPod = (p: Pod)=>{
    setActivePod(p)
    localStorage.setItem('active_pod_id', p.id)
    addLog(`Selezionato Pod attivo: ${p.name} (${p.id.slice(0,8)})`)
  }

  const podUrl = activePod ? `https://${activePod.id}-8000.proxy.runpod.net` : ''

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <header className="border-b border-white/10 sticky top-0 bg-[#0a0a0b]/90 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold">C</div>
            <span className="font-semibold">ComfyRemote <span className="text-white/50">Pod Manager</span></span>
            <span className="text-xs text-white/40 hidden md:block">{pods.length} Pod • {activePod ? activePod.name : 'nessun Pod attivo'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>fetchPods()} className="text-xs px-3 py-1.5 rounded bg-white/10">Aggiorna Lista</button>
            <button onClick={()=>setShowSettings(true)} className={`text-xs px-3 py-1.5 rounded border ${apiKey ? 'border-green-500/30 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>{apiKey ? '⚙️ API Key OK' : '⚙️ Configura API Key'}</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <div className="flex gap-2 mb-4">
            {(['R2V','I2V','T2V','RefMod'] as Mode[]).map(m=>(
              <button key={m} onClick={()=>setMode(m)} className={`px-4 py-2 rounded-full text-sm border ${mode===m?'bg-white text-black border-white':'bg-white/5 border-white/10 text-white/60'}`}>{m}</button>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{mode} - Minimax H3</h3>
              <span className="text-xs text-white/40">Pod attivo: {activePod ? `${activePod.name} (${activePod.desiredStatus})` : 'seleziona a destra'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="border border-dashed border-white/20 rounded-xl h-32 flex items-center justify-center text-xs text-white/40">Soggetto Ref (face lock)</div>
              <div className="border border-dashed border-white/20 rounded-xl h-32 flex items-center justify-center text-xs text-white/40">Scena Ref</div>
            </div>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[80px]" />
            <button disabled={!activePod || activePod.desiredStatus!=='RUNNING'} className="mt-4 w-full h-11 rounded-xl bg-white text-black font-semibold disabled:opacity-40">GENERA {mode} → {activePod ? activePod.name : 'Seleziona Pod'}</button>
            {activePod && activePod.desiredStatus!=='RUNNING' && <div className="mt-2 text-xs text-amber-300">Pod non RUNNING - avvialo dalla lista a destra</div>}
            {podUrl && <div className="mt-3 text-[11px] text-white/30 break-all">ComfyUI: {podUrl}</div>}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">I Miei Pod ({pods.length})</h4>
              <button onClick={()=>setShowDeploy(true)} className="text-xs px-2 py-1 rounded bg-white text-black">+ Deploy Nuovo</button>
            </div>
            {loadingPods ? <div className="text-xs text-white/40">Carico...</div> : pods.length===0 ? <div className="text-xs text-white/40">Nessun Pod trovato - deployane uno nuovo</div> : (
              <div className="space-y-2 max-h-[360px] overflow-auto">
                {pods.map(p=>(
                  <div key={p.id} onClick={()=>selectPod(p)} className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center ${activePod?.id===p.id ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}>
                    <div>
                      <div className="text-sm font-medium truncate max-w-[180px]">{p.name}</div>
                      <div className="text-[11px] opacity-60">{p.id.slice(0,12)} • {p.gpuCount||1}x {p.imageName?.slice(0,20)||'GPU'} • {p.desiredStatus}</div>
                    </div>
                    <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                      {p.desiredStatus==='RUNNING' ? <button onClick={()=>callPodAction('stop', p.id)} className="text-[11px] px-2 py-1 rounded bg-red-500/20 text-red-300">Stop</button> : <button onClick={()=>callPodAction('resume', p.id)} className={`text-[11px] px-2 py-1 rounded ${activePod?.id===p.id ? 'bg-black text-white' : 'bg-white text-black'}`}>Start</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-black border border-white/10 rounded-2xl p-4 font-mono text-xs h-[340px] overflow-auto">
            <div className="text-white/50 mb-2">Logs</div>
            {logs.map((l,i)=><div key={i} className="py-1 border-b border-white/5 break-words">{l}</div>)}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="font-semibold">RunPod API Key</h2>
            <p className="text-xs text-white/50 mt-1">Presa da runpod.io/console/user/settings - serve permesso Pods. Resta solo nel tuo browser.</p>
            <input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" placeholder="rpa_..." className="mt-4 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>fetchPods()} className="flex-1 py-2 rounded-lg bg-white/10 text-sm">Test + Lista Pod</button>
              <button onClick={()=>saveKey(apiKey)} className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-medium">Salva</button>
            </div>
            <button onClick={()=>setShowSettings(false)} className="w-full text-xs text-white/40 mt-3">Chiudi</button>
          </div>
        </div>
      )}

      {showDeploy && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="font-semibold">Deploy Nuovo Pod</h2>
            <p className="text-xs text-white/50 mt-1">Usa un tuo Template esistente. Trovi Template ID su RunPod &gt; Templates.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-white/70">Template ID</label>
                <input value={deployTemplateId} onChange={e=>setDeployTemplateId(e.target.value)} placeholder="es. abc123..." className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
                {podTemplates.length>0 && <div className="mt-2 text-[11px] text-white/40">I tuoi template: {podTemplates.map((t:any)=>`${t.name} (${t.id.slice(0,8)})`).join(', ')}</div>}
              </div>
              <div>
                <label className="text-xs text-white/70">GPU Type</label>
                <select value={deployGpu} onChange={e=>setDeployGpu(e.target.value)} className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm">
                  <option>NVIDIA GeForce RTX 4090</option>
                  <option>NVIDIA RTX A6000</option>
                  <option>NVIDIA A100-SXM4-80GB</option>
                  <option>NVIDIA L40S</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowDeploy(false)} className="flex-1 py-2 rounded-lg bg-white/10 text-sm">Annulla</button>
                <button onClick={deployNewPod} className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-medium">Deploy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
