# ComfyRemote Video - Minimax H3 - Solo RunPod API

Webapp telecomando per ComfyUI su RunPod Pod con Minimax H3 (ref2v, i2v, t2v, refmod).

## Deploy su Vercel

1. Push questa cartella su GitHub
2. Vercel > New Project > Import
3. Deploy (nessuna env var necessaria)

Poi apri l'app, clicca ingranaggio, inserisci:
- RunPod API Key: da https://www.runpod.io/console/user/settings
- Pod ID: il tuo Pod ID

La chiave resta in localStorage del browser.

## Flusso reale con Pod

- La app chiama POST {POD_URL}/upload/image per le ref
- Poi POST {POD_URL}/prompt con workflow JSON
- Websocket {POD_URL}/ws per progresso
- Controllo Pod via api.runpod.io/v2/pods/{id}/start e /stop usando la stessa API key

Incolla i tuoi workflow API format in lib/workflows.ts per collegare generazione reale.

## Costi

Pod spento = 0$. Usa Start/Stop dalla UI per risparmiare.
