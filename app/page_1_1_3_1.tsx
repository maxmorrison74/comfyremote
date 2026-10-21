
"use client"
import { useState, useEffect } from 'react'

type Mode = 'R2V'|'I2V'|'T2V'|'RefMod'
type PodStatus = 'running'|'stopped'|'starting'|'stopping'|'unknown'

export default function Page(){
  const [mode, setMode] = useState<Mode>('R2V')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [podId, setPodId] = useState('')
  const [podUrl, setPodUrl] = useState('')
  const [podStatus, setPodStatus] = useState<PodStatus>('unknown')
  const [uptime, setUptime] = useState('')
  const [prompt, setPrompt] = useState('a cinematic portrait walking in Tokyo at night, neon lights')
  const [isGenerating, setIsGenerating] = useState(false)
  const [logs, setLogs] = useState<string[]>(['Pronto. Configura Pod in alto a destra.'])

  useEffect(()=>{
    const k = localStorage.getItem('runpod_api_key')||''
    const pid = localStorage.getItem('runpod_pod_id')||''
    const url = localStorage.getItem('runpod_pod_url')||''
    setApiKey(k); setPodId(pid); setPodUrl(url)
  },[])

  useEffect(()=>{
    if(podId && !podUrl) setPodUrl(`https://${podId}-8000.proxy.runpod.net`)
  },[podId, podUrl])

  const addLog = (m:string)=> setLogs(l=>[...l, `${new Date().toLocaleTimeString()} ${m}`])

  const saveSettings = ()=>{
    localStorage.setItem('runpod_api_key', apiKey)
    localStorage.setItem('runpod_pod_id', podId)
    localStorage.setItem('runpod_pod_url', podUrl || `https://${podId}-8000.proxy.runpod.net`)
    setShowSettings(false)
    addLog('Impostazioni salvate')
    fetchPodStatus()
  }

  const fetchPodStatus = async()=>{
    if(!apiKey || !podId){ setPodStatus('unknown'); return }
    try{
      const res = await fetch('https://api.runpod.io/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
        body: JSON.stringify({ query: `{ pod(input: { podId: "${podId}" }) { id desiredStatus runtime { uptimeInSeconds } } }` })
      })
      const json = await res.json()
      const status = json?.data?.pod?.desiredStatus || json?.data?.pod?.podId // fallback
      // desiredStatus can be RUNNING, EXITED, etc.
      const desired = json?.data?.pod?.desiredStatus
      if(desired === 'RUNNING') setPodStatus('running')
      else if(desired === 'EXITED' || desired === 'STOPPED') setPodStatus('stopped')
      else setPodStatus('unknown')
      const up = json?.data?.pod?.runtime?.uptimeInSeconds
      if(up) setUptime(`${Math.floor(up/60)}m`)
      addLog(`Stato Pod: ${desired || 'sconosciuto'}`)
    }catch(e:any){
      addLog(`Errore stato Pod: ${e.message} - verifica API key`)
      setPodStatus('unknown')
    }
  }

  const startPodReal = async()=>{
    if(!apiKey || !podId){ setShowSettings(true); return }
    setPodStatus('starting')
    addLog(`Avvio Pod ${podId}... chiamata api.runpod.io`)
    try{
      const res = await fetch('https://api.runpod.io/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
        body: JSON.stringify({ query: `mutation { podResume(input: { podId: "${podId}" }) { id desiredStatus } }` })
      })
      const json = await res.json()
      if(json.errors) throw new Error(json.errors[0].message)
      addLog(`Resume inviato: ${JSON.stringify(json.data)}`)
      // polling stato
      let attempts = 0
      const interval = setInterval(async()=>{
        attempts++
        await fetchPodStatus()
        if(attempts > 20) clearInterval(interval)
      }, 5000)
      setPodStatus('running')
    }catch(e:any){
      addLog(`Errore start: ${e.message}`)
      setPodStatus('stopped')
    }
  }

  const stopPodReal = async()=>{
    if(!confirm('Spegnere il Pod? Risparmi $0.44/h')) return
    setPodStatus('stopping')
    addLog(`Stop Pod ${podId}...`)
    try{
      const res = await fetch('https://api.runpod.io/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
        body: JSON.stringify({ query: `mutation { podStop(input: { podId: "${podId}" }) { id desiredStatus } }` })
      })
      const json = await res.json()
      if(json.errors) throw new Error(json.errors[0].message)
      addLog(`Stop inviato`)
      setPodStatus('stopped')
    }catch(e:any){
      addLog(`Errore stop: ${e.message}`)
    }
  }

  const testConnection = async()=>{
    if(!podUrl){ addLog('Manca Pod URL'); return }
    addLog(`Test ComfyUI su ${podUrl}...`)
    try{
      const res = await fetch(`${podUrl}/system_stats`, { mode: 'no-cors' })
      addLog(`ComfyUI raggiungibile (no-cors ok) - se Pod è RUNNING dovrebbe rispondere`)
    }catch(e){
      addLog(`Test ComfyUI fallito, verifica che Pod sia RUNNING`)
    }
    fetchPodStatus()
  }

  const generate = async()=>{
    if(!apiKey || !podUrl){ setShowSettings(true); return }
    if(podStatus!=='running'){ addLog('Pod non RUNNING - avvia prima'); return }
    setIsGenerating(true)
    addLog(`[${mode}] Invio workflow a ${podUrl}/prompt - Prompt: ${prompt.slice(0,60)}...`)
    // qui andrà il vero fetch a /prompt quando mi mandi workflow
    setTimeout(()=>{ setIsGenerating(false); addLog('Mock generazione ok - incolla workflow reale per generazione vera') }, 2000)
  }

  const isConfigured = apiKey && podId
  const statusColor = podStatus==='running' ? 'border-green-500/50 text-green-400 bg-green-500/10' : podStatus==='stopped' ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-yellow-500/30 text-yellow-400'

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <header className="border-b border-white/10 sticky top-0 bg-[#0a0a0b]/80 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold">C</div>
            <span className="font-semibold">ComfyRemote <span className="text-white/50">Video H3</span></span>
            <span className={`text-xs px-2 py-1 rounded-full border ${statusColor}`}>{podStatus==='running' ? `🟢 RUNNING ${uptime}` : podStatus==='stopped' ? '🔴 STOPPED' : podStatus==='starting' ? '🟡 STARTING' : podStatus==='stopping' ? '🟡 STOPPING' : '⚪ UNKNOWN'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 hidden md:block">$0.44/h</span>
            {podStatus==='running' || podStatus==='starting' ? <button onClick={stopPodReal} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/15">Stop Pod</button> : <button onClick={startPodReal} className="text-xs px-3 py-1.5 rounded bg-white text-black font-medium">Start Pod</button>}
            <button onClick={()=>setShowSettings(true)} className={`text-xs px-3 py-1.5 rounded border ${isConfigured ? 'border-green-500/30 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>{isConfigured ? '⚙️ Configurato' : '⚙️ Configura'}</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8">
          <div className="flex gap-2 mb-6">
            {(['R2V','I2V','T2V','RefMod'] as Mode[]).map(m=>(
              <button key={m} onClick={()=>setMode(m)} className={`px-4 py-2 rounded-full text-sm font-medium border ${mode===m ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>{m=== 'R2V' ? 'Ref2Video ★' : m}</button>
            ))}
          </div>

          {podStatus!=='running' && <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-200">Pod non attivo - Clicca Start Pod in alto. Stato attuale: {podStatus}. Se hai appena acceso, aspetta 30-60sec poi clicca Test.</div>}

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <h3 className="font-medium mb-4">{mode} - Minimax H3</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-dashed border-white/20 rounded-xl h-36 flex items-center justify-center text-sm text-white/40">Soggetto Ref</div>
                <div className="border border-dashed border-white/20 rounded-xl h-36 flex items-center justify-center text-sm text-white/40">Scena Ref</div>
              </div>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[90px]" />
            </div>
            <button onClick={generate} disabled={isGenerating} className="mt-6 w-full h-12 rounded-xl bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50">{isGenerating ? 'Generazione...' : `GENERA ${mode}`}</button>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4">
          <div className="bg-black border border-white/10 rounded-2xl p-4 font-mono text-xs h-[600px] overflow-auto">
            <div className="text-white/50 mb-2 flex justify-between"><span>Logs RunPod</span><button onClick={fetchPodStatus} className="text-white/80 underline">Aggiorna stato</button></div>
            {logs.map((l,i)=><div key={i} className="py-1 border-b border-white/5 last:border-0 break-words">{l}</div>)}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="font-semibold text-lg">Impostazioni RunPod</h2>
            <p className="text-xs text-white/50 mt-1">Chiave salvata solo in questo browser.</p>
            <div className="mt-5 space-y-4">
              <div><label className="text-xs text-white/70">RunPod API Key (Bearer)</label><input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" placeholder="rpa_..." className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/></div>
              <div><label className="text-xs text-white/70">Pod ID</label><input value={podId} onChange={e=>setPodId(e.target.value)} placeholder="abc123def" className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/></div>
              <div><label className="text-xs text-white/70">Pod URL</label><input value={podUrl} onChange={e=>setPodUrl(e.target.value)} placeholder="https://...-8000.proxy.runpod.net" className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/></div>
              <div className="flex gap-2 pt-2">
                <button onClick={testConnection} className="flex-1 py-2 rounded-lg bg-white/10 text-sm">Test + Stato</button>
                <button onClick={saveSettings} className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-medium">Salva</button>
              </div>
              <div className="text-[11px] text-white/30">API usata: POST https://api.runpod.io/graphql con header Authorization: &lt;key&gt; - mutation podResume / podStop</div>
              <button onClick={()=>setShowSettings(false)} className="w-full text-xs text-white/40 mt-2">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
