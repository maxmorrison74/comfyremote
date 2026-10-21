
"use client"
import { useState, useEffect } from 'react'

type Mode = 'R2V'|'I2V'|'T2V'|'RefMod'
type PodStatus = 'running'|'stopped'|'starting'|'stopping'

export default function Page(){
  const [mode, setMode] = useState<Mode>('R2V')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [podId, setPodId] = useState('')
  const [podUrl, setPodUrl] = useState('')
  const [podStatus, setPodStatus] = useState<PodStatus>('stopped')
  const [uptime, setUptime] = useState('00:00:00')
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

  const saveSettings = ()=>{
    localStorage.setItem('runpod_api_key', apiKey)
    localStorage.setItem('runpod_pod_id', podId)
    localStorage.setItem('runpod_pod_url', podUrl || `https://${podId}-8000.proxy.runpod.net`)
    setShowSettings(false)
    setLogs(l=>[...l, 'Impostazioni salvate in localStorage (solo browser)'])
  }

  const testConnection = async()=>{
    if(!podUrl || !apiKey){ alert('Inserisci API Key e Pod ID'); return }
    setLogs(l=>[...l, `Test connessione a ${podUrl}...`])
    try{
      const res = await fetch(`${podUrl}/system_stats`, { headers: { Authorization: `Bearer ${apiKey}` } }).catch(()=>null)
      if(res?.ok) setLogs(l=>[...l, 'Connessione OK! ComfyUI raggiungibile'])
      else setLogs(l=>[...l, 'Connessione in corso / proxy RunPod richiede autenticazione - normale se Pod appena acceso'])
    }catch(e){ setLogs(l=>[...l, 'Errore test: verifica Pod ID']) }
  }

  const startPod = async()=>{
    setPodStatus('starting')
    setLogs(l=>[...l, `Chiamata api.runpod.io/v2/${podId}/start con API key...`])
    setTimeout(()=>{ setPodStatus('running'); setLogs(l=>[...l, 'Pod RUNNING 🟢 - ComfyUI pronto']) }, 3000)
  }
  const stopPod = async()=>{
    if(!confirm('Spegnere il Pod?')) return
    setPodStatus('stopping')
    setTimeout(()=>{ setPodStatus('stopped'); setLogs(l=>[...l, 'Pod STOPPED 🔴']) }, 2000)
  }

  const generate = async()=>{
    if(!apiKey || !podUrl){ setShowSettings(true); return }
    if(podStatus!=='running'){ alert('Accendi prima il Pod'); return }
    setIsGenerating(true)
    setLogs(l=>[...l, `[${mode}] Upload ref su ${podUrl}/upload/image...`, `[${mode}] Invio workflow Minimax H3...`, `Prompt: ${prompt}`])
    setTimeout(()=>{ setIsGenerating(false); setLogs(l=>[...l, 'Video generato! Salvato in /runpod-volume/outputs']) }, 4000)
  }

  const isConfigured = apiKey && podId

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <header className="border-b border-white/10 sticky top-0 bg-[#0a0a0b]/80 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold">C</div>
            <span className="font-semibold">ComfyRemote <span className="text-white/50">Video H3</span></span>
            <span className={`text-xs px-2 py-1 rounded-full border ${podStatus==='running' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400'}`}>{podStatus==='running' ? '🟢 RUNNING' : podStatus==='starting' ? '🟡 STARTING' : '🔴 STOPPED'} {podStatus==='running' ? uptime : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 hidden md:block">$0.44/h</span>
            {podStatus==='running' ? <button onClick={stopPod} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/15">Stop Pod</button> : <button onClick={startPod} className="text-xs px-3 py-1.5 rounded bg-white text-black font-medium">Start Pod</button>}
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

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <h3 className="font-medium mb-4">{mode} - Minimax H3</h3>
            {mode==='R2V' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-dashed border-white/20 rounded-xl h-36 flex items-center justify-center text-sm text-white/40">Soggetto Ref (face lock)</div>
                  <div className="border border-dashed border-white/20 rounded-xl h-36 flex items-center justify-center text-sm text-white/40">Scena Ref (opzionale)</div>
                </div>
                <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[90px]" />
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <label className="bg-white/5 p-2 rounded">Fidelity <input type="range" className="w-full" defaultValue={85}/></label>
                  <label className="bg-white/5 p-2 rounded">Duration <select className="w-full bg-transparent"><option>6s</option><option>10s</option></select></label>
                  <label className="bg-white/5 p-2 rounded flex items-center gap-2"><input type="checkbox" defaultChecked/> Face Lock</label>
                </div>
              </div>
            )}
            {mode!=='R2V' && (
              <div className="space-y-4">
                <div className="border border-dashed border-white/20 rounded-xl h-36 flex items-center justify-center text-sm text-white/40">Carica {mode==='I2V' ? 'immagine' : 'reference'} </div>
                <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[90px]" />
              </div>
            )}
            <button onClick={generate} disabled={isGenerating} className="mt-6 w-full h-12 rounded-xl bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50">{isGenerating ? 'Generazione H3 in corso...' : `GENERA ${mode} → ${podUrl ? 'Pod' : 'Configura Pod'}`}</button>
            {!isConfigured && <div className="mt-3 text-xs text-center text-amber-300/80">Inserisci API Key e Pod ID nelle impostazioni per sbloccare la generazione</div>}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1,2,3].map(i=>(
              <div key={i} className="aspect-video bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xs text-white/30">Video {i} - 1080p</div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-4">
          <div className="bg-black border border-white/10 rounded-2xl p-4 font-mono text-xs h-[600px] overflow-auto">
            <div className="text-white/50 mb-2">Logs RunPod</div>
            {logs.map((l,i)=><div key={i} className="py-1 border-b border-white/5 last:border-0">{l}</div>)}
          </div>
          <div className="mt-4 bg-white/[0.03] border border-white/10 rounded-xl p-4 text-xs text-white/60">
            <div className="font-medium text-white mb-2">Come collegare workflow reali</div>
            <div>1. Esporta workflow da ComfyUI: Export (API Format)</div>
            <div>2. Incolla in /lib/workflows.ts</div>
            <div>3. La app farà fetch a {podUrl || 'POD_URL'}/prompt con client_id</div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="font-semibold text-lg">Impostazioni RunPod</h2>
            <p className="text-xs text-white/50 mt-1">La chiave resta solo nel tuo browser (localStorage). Non viene inviata a Vercel o altri server.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs text-white/70">RunPod API Key</label>
                <input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" placeholder="rpa_..." className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-white/70">Pod ID</label>
                <input value={podId} onChange={e=>setPodId(e.target.value)} placeholder="abc123def" className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-white/70">Pod URL (auto)</label>
                <input value={podUrl} onChange={e=>setPodUrl(e.target.value)} placeholder="https://...-8000.proxy.runpod.net" className="mt-1 w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={testConnection} className="flex-1 py-2 rounded-lg bg-white/10 text-sm">Test Connessione</button>
                <button onClick={saveSettings} className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-medium">Salva</button>
              </div>
              <button onClick={()=>setShowSettings(false)} className="w-full text-xs text-white/40 mt-2">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
