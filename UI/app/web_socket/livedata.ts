// ~/composables/useFinnhub.ts
import { useStateStore } from '~/stores/state'

interface FinnhubTradeTick {
  p: number
  t: number
  v: number
  s: string
}

interface FinnhubMessage {
  type: string
  data?: FinnhubTradeTick[]
}

export const useFinnhub = () => {
  const stateStore = useStateStore()
    const config = useRuntimeConfig() // ✅ get runtime config


  const startStream = (symbol:string ='OANDA:EUR_USD') => {
    // browser environment: native WebSocket
    const API_KEY = config.public.finhubApiKey
    if (!API_KEY) throw new Error('Missing FINNHUB_API_KEY')

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${API_KEY}`)

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: symbol }))
      console.log('✅ Subscribed to EUR/USD')
    }

    ws.onmessage = (event) => {
      const parsed: FinnhubMessage = JSON.parse(event.data)
      if (parsed.type !== 'trade' || !parsed.data) return

      for (const tick of parsed.data) {
        stateStore.addTradeData(tick.s, {
          price: tick.p,
          volume: tick.v,
          time: tick.t
        })
        console.log(`[LIVE] ${tick.t} → ${tick.p}`)
      }
    }

    ws.onerror = (err) => console.error('❌ WebSocket error', err)
    ws.onclose = () => console.warn('⚠️ WebSocket closed')
  }

  return { startStream }
}
