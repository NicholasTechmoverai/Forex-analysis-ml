import { defineStore } from 'pinia'

/* ---- Types ---- */
export interface TradeTick {
  price: number
  volume: number
  time: number
}

export type SymbolTrades = Record<string, TradeTick[]>

export const useStateStore = defineStore('state', {
  state: () => ({
    count: 0,
    liveTradeData: {} as SymbolTrades
  }),

  getters: {
    doubleCount: (state) => state.count * 2,
    isEven: (state) => state.count % 2 === 0,

    tradeCountBySymbol: (state) => (symbol: string) =>
      state.liveTradeData[symbol]?.length ?? 0,

    latestTradeBySymbol: (state) => (symbol: string) => {
      const trades = state.liveTradeData[symbol]
      return trades?.[0] ?? null
    }
  },

  actions: {
    increment() {
      this.count++
    },

    /**
     * Add trades for a symbol
     * - symbol is the ID
     * - keeps only last `limit` trades
     */
    addTradeData(
      symbol: string,
      data: TradeTick | TradeTick[],
      limit = 1000
    ) {
      const trades = Array.isArray(data) ? data : [data]

      // init symbol bucket if missing
      if (!this.liveTradeData[symbol]) {
        this.liveTradeData[symbol] = []
      }

      // prepend newest trades
      this.liveTradeData[symbol].unshift(...trades)

      // trim to last N
      this.liveTradeData[symbol].length = Math.min(
        this.liveTradeData[symbol].length,
        limit
      )
    },

    clearSymbol(symbol: string) {
      delete this.liveTradeData[symbol]
    },

    clearAllTrades() {
      this.liveTradeData = {}
    }
  }
})
