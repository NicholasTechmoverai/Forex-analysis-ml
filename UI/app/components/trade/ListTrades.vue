<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue'
import { useStateStore } from '~/stores/state'
import { useFinnhub } from '~/web_socket/livedata'

const store = useStateStore()
const { startStream } = useFinnhub()


const selectedSymbol = ref<string>(tradeSymbols[0].code)
const viewMode = ref<'detailed' | 'overview'>('detailed')
const sortBy = ref<'time' | 'price' | 'volume'>('time')
const sortDirection = ref<'asc' | 'desc'>('desc')
const showAllSymbols = ref<boolean>(false)
const autoScroll = ref<boolean>(true)
const scrollInterval = ref<NodeJS.Timeout | null>(null)

// Track currently subscribed symbols
const subscribedSymbols = ref<Set<string>>(new Set())
const latestPriceChanges = ref<Record<string, { price: number, change: number, timestamp: number }>>({})
const symbolVolumes = ref<Record<string, number>>({})
const priceHistory = ref<Record<string, number[]>>({})

// Calculate moving averages
const calculateMovingAverage = (prices: number[], period: number = 5) => {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const recent = prices.slice(-period)
  return recent.reduce((a, b) => a + b, 0) / recent.length
}

// Get trades for selected symbol
const trades = computed(() => {
  const symbolTrades = store.liveTradeData[selectedSymbol.value] || []
  return [...symbolTrades].sort((a, b) => {
    const aValue = a[sortBy.value]
    const bValue = b[sortBy.value]
    const modifier = sortDirection.value === 'asc' ? 1 : -1
    return (aValue > bValue ? 1 : -1) * modifier
  })
})

// Get all trades across all symbols for comparison
const allTrades = computed(() => {
  const all = []
  tradeSymbols.forEach(symbol => {
    const trades = store.liveTradeData[symbol.code] || []
    if (trades.length > 0) {
      const latestTrade = trades[0]
      const change = getPriceChange(symbol.code)
      all.push({
        symbol: symbol.code,
        name: symbol.name,
        pair: symbol.name.split('/').join(''),
        color: symbol.color,
        price: latestTrade.price,
        time: latestTrade.time,
        volume: latestTrade.volume,
        category: symbol.category,
        volatility: symbol.volatility,
        change: change,
        percentChange: change / (latestTrade.price - change) * 100 || 0
      })
    }
  })
  return all.sort((a, b) => {
    if (sortBy.value === 'price') return (b.price - a.price) * (sortDirection.value === 'asc' ? -1 : 1)
    if (sortBy.value === 'time') return (b.time - a.time) * (sortDirection.value === 'asc' ? -1 : 1)
    return 0
  })
})

// Get top movers
const topMovers = computed(() => {
  return [...allTrades.value]
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 5)
})

// Get highest volume symbols
const highestVolume = computed(() => {
  return [...allTrades.value]
    .sort((a, b) => (symbolVolumes.value[b.symbol] || 0) - (symbolVolumes.value[a.symbol] || 0))
    .slice(0, 5)
})

// Get price change for a symbol
const getPriceChange = (symbol: string) => {
  const change = latestPriceChanges.value[symbol]
  return change ? change.change : 0
}

// Get percent change
const getPercentChange = (symbol: string) => {
  const change = getPriceChange(symbol)
  const current = latestPriceChanges.value[symbol]?.price || 0
  const previous = current - change
  return previous !== 0 ? (change / previous) * 100 : 0
}

// Get change color
const getChangeColor = (change: number) => {
  if (change > 0) return 'text-green-600 dark:text-green-400'
  if (change < 0) return 'text-red-600 dark:text-red-400'
  return 'text-primary-600 dark:text-primary-400'
}

// Get change background color
const getChangeBgColor = (change: number) => {
  if (change > 0) return 'bg-green-50/50 dark:bg-green-900/10'
  if (change < 0) return 'bg-red-50/50 dark:bg-red-900/10'
  return 'bg-primary-50/50 dark:bg-primary-900/10'
}

// Get change UI color
const getChangeUIColor = (change: number) => {
  if (change > 0) return 'green'
  if (change < 0) return 'red'
  return 'primary'
}

// Get volatility color
const getVolatilityColor = (volatility: string) => {
  switch (volatility) {
    case 'High': return 'red'
    case 'Medium': return 'orange'
    case 'Low': return 'green'
    default: return 'gray'
  }
}

// Format time
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Format time difference
const formatTimeAgo = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

// Calculate statistics for selected symbol
const stats = computed(() => {
  const currentTrades = trades.value
  if (currentTrades.length === 0) return null

  const prices = currentTrades.map(t => t.price)
  const volumes = currentTrades.map(t => t.volume)
  const changes = prices.map((price, index) =>
    index > 0 ? price - prices[index - 1] : 0
  )

  return {
    avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    totalVolume: volumes.reduce((a, b) => a + b, 0),
    priceRange: Math.max(...prices) - Math.min(...prices),
    avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
    volatility: Math.sqrt(
      changes.reduce((a, b) => a + b * b, 0) / changes.length
    ) || 0,
    tradeCount: currentTrades.length,
    lastUpdate: currentTrades[0]?.time || 0
  }
})

// Calculate market overview
const marketOverview = computed(() => {
  const all = allTrades.value
  if (all.length === 0) return null

  const totalVolume = all.reduce((sum, symbol) =>
    sum + (symbolVolumes.value[symbol.symbol] || 0), 0
  )

  const gainers = all.filter(s => s.change > 0).length
  const losers = all.filter(s => s.change < 0).length
  const unchanged = all.filter(s => s.change === 0).length

  const avgChange = all.reduce((sum, s) => sum + s.percentChange, 0) / all.length

  return {
    totalVolume,
    gainers,
    losers,
    unchanged,
    avgChange,
    activeSymbols: all.length
  }
})

// Subscribe to symbol
const subscribeToSymbol = (symbol: string) => {
  if (!subscribedSymbols.value.has(symbol)) {
    startStream(symbol)
    subscribedSymbols.value.add(symbol)
  }
}

// Watch for price updates to track changes
watch(() => store.liveTradeData, (newData) => {
  tradeSymbols.forEach(symbol => {
    const trades = newData[symbol.code]
    if (trades && trades.length > 0) {
      const latestTrade = trades[0]
      const previous = latestPriceChanges.value[symbol.code]

      // Update volume
      symbolVolumes.value[symbol.code] =
        (symbolVolumes.value[symbol.code] || 0) + latestTrade.volume

      // Update price history
      if (!priceHistory.value[symbol.code]) {
        priceHistory.value[symbol.code] = []
      }
      priceHistory.value[symbol.code].push(latestTrade.price)
      if (priceHistory.value[symbol.code].length > 50) {
        priceHistory.value[symbol.code].shift()
      }

      if (previous) {
        const change = latestTrade.price - previous.price
        latestPriceChanges.value[symbol.code] = {
          price: latestTrade.price,
          change,
          timestamp: Date.now()
        }
      } else {
        latestPriceChanges.value[symbol.code] = {
          price: latestTrade.price,
          change: 0,
          timestamp: Date.now()
        }
      }
    }
  })
}, { deep: true })

// Start auto-scrolling symbols
const startAutoScroll = () => {
  if (scrollInterval.value) clearInterval(scrollInterval.value)

  scrollInterval.value = setInterval(() => {
    const container = document.querySelector('.symbols-scroll-container')
    if (container) {
      const scrollWidth = container.scrollWidth
      const clientWidth = container.clientWidth
      const maxScrollLeft = scrollWidth - clientWidth

      if (container.scrollLeft >= maxScrollLeft - 10) {
        container.scrollLeft = 0
      } else {
        container.scrollLeft += 2
      }
    }
  }, 50)
}

// Stop auto-scrolling
const stopAutoScroll = () => {
  if (scrollInterval.value) {
    clearInterval(scrollInterval.value)
    scrollInterval.value = null
  }
}

// Toggle auto-scroll
const toggleAutoScroll = () => {
  if (scrollInterval.value) {
    stopAutoScroll()
  } else {
    startAutoScroll()
  }
}

// Initialize
onMounted(() => {
  // Subscribe to all symbols for comprehensive view
  tradeSymbols.forEach(symbol => {
    subscribeToSymbol(symbol.code)
  })

  // Start auto-scrolling
  startAutoScroll()

  // Auto-scroll to latest trade
  if (autoScroll.value) {
    setTimeout(() => {
      const container = document.querySelector('.trades-container')
      if (container) {
        container.scrollTop = 0
      }
    }, 100)
  }
})

// Cleanup
onUnmounted(() => {
  stopAutoScroll()
})

// Watch trades for auto-scroll
watch(trades, () => {
  if (autoScroll.value) {
    nextTick(() => {
      const container = document.querySelector('.trades-container')
      if (container) {
        container.scrollTop = 0
      }
    })
  }
})

// Toggle sort
const toggleSort = (field: 'time' | 'price' | 'volume') => {
  if (sortBy.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDirection.value = 'desc'
  }
}

// Export data
const exportData = () => {
  const data = trades.value.map(trade => ({
    time: new Date(trade.time).toISOString(),
    price: trade.price,
    volume: trade.volume
  }))

  const csv = 'Time,Price,Volume\n' + data.map(d =>
    `${d.time},${d.price},${d.volume}`
  ).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedSymbol.value.replace(':', '_')}_trades_${Date.now()}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

// Refresh data
const refreshData = () => {
  // Clear local cache and re-subscribe
  subscribedSymbols.value.clear()
  symbolVolumes.value = {}
  tradeSymbols.forEach(symbol => {
    subscribeToSymbol(symbol.code)
  })
}

// Get sort icon
const getSortIcon = (field: string) => {
  if (sortBy.value !== field) return 'i-heroicons-arrows-up-down'
  return sortDirection.value === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'
}

// Check if mobile
const isMobile = ref(false)
onMounted(() => {
  isMobile.value = window.innerWidth < 768
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
})

// Get symbol color class
const getSymbolColorClass = (color: string) => {
  return `bg-${color}-500 dark:bg-${color}-600`
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Mobile Header -->
    <div
      class="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 lg:hidden">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UAvatar :ui="{ rounded: 'rounded-lg' }"
            :class="getSymbolColorClass(tradeSymbols.find(s => s.code === selectedSymbol)?.color || 'primary')">
            <span class="text-white font-bold text-sm">
              {{ selectedSymbol.split(':')[1].substring(0, 3) }}
            </span>
          </UAvatar>
          <div>
            <h2 class="font-bold text-gray-900 dark:text-white">Forex Dashboard</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{tradeSymbols.find(s => s.code === selectedSymbol)?.name}}
            </p>
          </div>
        </div>
        <UButton @click="showAllSymbols = !showAllSymbols" icon="i-heroicons-globe-alt" variant="ghost" color="gray" />
      </div>
    </div>

    <!-- Horizontal Scrolling Symbols Bar -->
    <div
      class="sticky top-12 lg:top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div class="relative">
        <div class="symbols-scroll-container flex overflow-x-auto scrollbar-hide py-3 px-4 lg:px-6"
          @mouseenter="stopAutoScroll" @mouseleave="startAutoScroll">
          <div class="flex space-x-3 min-w-max">
            <UButton v-for="symbol in tradeSymbols" :key="symbol.code" @click="selectedSymbol = symbol.code"
              :variant="selectedSymbol === symbol.code ? 'solid' : 'soft'"
              :color="selectedSymbol === symbol.code ? symbol.color : 'gray'" class="whitespace-nowrap">
              <template #leading>
                <UAvatar :ui="{ rounded: 'rounded-md' }" size="xs"
                  :class="`bg-${symbol.color}-500 dark:bg-${symbol.color}-600`">
                  <span class="text-xs font-bold text-white">
                    {{ symbol.name.substring(0, 3) }}
                  </span>
                </UAvatar>
              </template>
              <span class="font-semibold">{{ symbol.name }}</span>
              <template #trailing>
                <div class="text-right ml-2">
                  <div class="text-xs font-mono">
                    {{ (store.liveTradeData[symbol.code]?.[0]?.price || 0).toFixed(5) }}
                  </div>
                  <div class="text-xs" :class="getChangeColor(getPriceChange(symbol.code))">
                    {{ getPriceChange(symbol.code) > 0 ? '+' : '' }}{{ getPriceChange(symbol.code).toFixed(4) }}
                  </div>
                </div>
              </template>
            </UButton>
          </div>
        </div>
        <!-- Auto-scroll indicator -->
        <div
          class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-gray-800 to-transparent flex items-center justify-center">
          <UButton @click="toggleAutoScroll" icon="i-heroicons-play-pause" variant="soft" color="gray" size="xs" />
        </div>
      </div>
    </div>

    <!-- Market Overview Stats -->
    <div class="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white">
      <UContainer class="px-4 py-4 lg:py-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-sm opacity-90">Market Sentiment</div>
            <div class="text-xl font-bold mt-1" v-if="marketOverview">
              <UBadge :color="marketOverview.gainers > marketOverview.losers ? 'green' : 'red'" variant="solid"
                size="lg">
                {{ marketOverview.gainers > marketOverview.losers ? 'Bullish' : 'Bearish' }}
              </UBadge>
            </div>
          </div>
          <div class="text-center">
            <div class="text-sm opacity-90">Active Symbols</div>
            <div class="text-2xl font-bold mt-1">{{ allTrades.length }}/{{ tradeSymbols.length }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm opacity-90">Total Volume</div>
            <div class="text-2xl font-bold mt-1" v-if="marketOverview">
              {{ (marketOverview.totalVolume / 1000000).toFixed(1) }}M
            </div>
          </div>
          <div class="text-center">
            <div class="text-sm opacity-90">Avg Change</div>
            <div class="text-2xl font-bold mt-1" v-if="marketOverview"
              :class="marketOverview.avgChange > 0 ? 'text-green-300' : 'text-red-300'">
              {{ marketOverview.avgChange.toFixed(2) }}%
            </div>
          </div>
        </div>
      </UContainer>
    </div>

    <UContainer class="py-4 lg:py-6">
      <!-- Desktop Header -->
      <div class="hidden lg:flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Forex Trading Analytics</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">Real-time data with advanced market insights</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- View Toggle -->
          <UToggle v-model="viewMode" :options="[
            { value: 'detailed', label: 'Detailed', icon: 'i-heroicons-chart-bar' },
            { value: 'overview', label: 'Overview', icon: 'i-heroicons-squares-2x2' }
          ]" variant="outline" />

          <!-- Actions -->
          <UButtonGroup>
            <UButton @click="exportData" icon="i-heroicons-arrow-down-tray" variant="outline" color="primary"
              label="Export" />
            <UButton @click="refreshData" icon="i-heroicons-arrow-path" variant="outline" color="gray" />
          </UButtonGroup>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <!-- Left Column - Selected Symbol Details -->
        <div class="lg:col-span-2 space-y-4 lg:space-y-6">
          <!-- Selected Symbol Card -->
          <UCard class="overflow-hidden" :ui="{ divide: 'divide-gray-100 dark:divide-gray-800' }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <UAvatar :ui="{ rounded: 'rounded-xl' }" size="lg"
                    :class="getSymbolColorClass(tradeSymbols.find(s => s.code === selectedSymbol)?.color || 'primary')">
                    <span class="text-white text-lg font-bold">
                      {{ selectedSymbol.split(':')[1].substring(0, 3) }}
                    </span>
                  </UAvatar>
                  <div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                      {{tradeSymbols.find(s => s.code === selectedSymbol)?.name}}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ selectedSymbol.split(':')[1] }}
                      •
                      <UBadge
                        :color="getVolatilityColor(tradeSymbols.find(s => s.code === selectedSymbol)?.volatility || '')"
                        variant="soft" size="xs">
                        {{tradeSymbols.find(s => s.code === selectedSymbol)?.volatility}} Volatility
                      </UBadge>
                    </p>
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-2xl lg:text-3xl font-bold" :class="getChangeColor(getPriceChange(selectedSymbol))">
                    {{ (store.liveTradeData[selectedSymbol]?.[0]?.price || 0).toFixed(5) }}
                  </div>
                  <div class="text-sm" :class="getChangeColor(getPriceChange(selectedSymbol))">
                    {{ getPriceChange(selectedSymbol) > 0 ? '+' : '' }}{{ getPriceChange(selectedSymbol).toFixed(5) }}
                    ({{ getPercentChange(selectedSymbol).toFixed(2) }}%)
                  </div>
                </div>
              </div>
            </template>

            <!-- Quick Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <UCard class="text-center"
                :ui="{ body: { padding: 'p-3' }, background: 'bg-primary-50 dark:bg-primary-900/20' }">
                <div class="text-sm text-gray-500 dark:text-gray-400">Trades</div>
                <div class="text-xl font-semibold text-primary-600 dark:text-primary-400">{{ trades.length }}</div>
              </UCard>
              <UCard class="text-center"
                :ui="{ body: { padding: 'p-3' }, background: 'bg-primary-50 dark:bg-primary-900/20' }">
                <div class="text-sm text-gray-500 dark:text-gray-400">Range</div>
                <div class="text-xl font-semibold text-primary-600 dark:text-primary-400" v-if="stats">
                  {{ stats.priceRange.toFixed(5) }}
                </div>
              </UCard>
              <UCard class="text-center"
                :ui="{ body: { padding: 'p-3' }, background: 'bg-primary-50 dark:bg-primary-900/20' }">
                <div class="text-sm text-gray-500 dark:text-gray-400">Volume</div>
                <div class="text-xl font-semibold text-primary-600 dark:text-primary-400" v-if="stats">
                  {{ (stats.totalVolume / 1000).toFixed(1) }}K
                </div>
              </UCard>
              <UCard class="text-center"
                :ui="{ body: { padding: 'p-3' }, background: 'bg-primary-50 dark:bg-primary-900/20' }">
                <div class="text-sm text-gray-500 dark:text-gray-400">Volatility</div>
                <div class="text-xl font-semibold" :class="getChangeColor(stats?.volatility || 0)">
                  {{ stats ? stats.volatility.toFixed(5) : '0.00000' }}
                </div>
              </UCard>
            </div>

            <!-- Trades List -->
            <template #footer>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="font-semibold text-gray-900 dark:text-white">Recent Trades</h4>
                  <UToggle v-model="autoScroll" label="Auto-scroll" />
                </div>

                <div class="trades-container max-h-[400px] overflow-y-auto">
                  <!-- Empty State -->
                  <UEmptyState v-if="trades.length === 0" icon="i-heroicons-clock" title="Waiting for Data"
                    description="Live trades will appear here..." class="py-8" />

                  <!-- Manual Table Implementation -->
                  <div v-else class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <!-- Table Header -->
                    <div
                      class="grid grid-cols-4 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <button @click="toggleSort('time')"
                        class="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        Time
                        <UIcon :name="getSortIcon('time')" class="w-4 h-4" />
                      </button>
                      <button @click="toggleSort('price')"
                        class="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        Price
                        <UIcon :name="getSortIcon('price')" class="w-4 h-4" />
                      </button>
                      <button @click="toggleSort('volume')"
                        class="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        Volume
                        <UIcon :name="getSortIcon('volume')" class="w-4 h-4" />
                      </button>
                      <span class="text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Change
                      </span>
                    </div>

                    <!-- Table Rows -->
                    <div class="divide-y divide-gray-100 dark:divide-gray-800">
                      <div v-for="(trade, index) in trades.slice(0, 30)" :key="trade.time"
                        class="grid grid-cols-4 px-4 py-3 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors"
                        :class="[
                          getChangeBgColor(getPriceChange(selectedSymbol)),
                          index === 0 ? 'animate-pulse bg-primary-50/50 dark:bg-primary-900/20' : ''
                        ]">
                        <!-- Time -->
                        <div class="flex flex-col">
                          <span class="font-mono text-sm text-gray-900 dark:text-white">
                            {{ formatTime(trade.time) }}
                          </span>
                          <span class="text-xs text-primary-600/70 dark:text-primary-400/70">
                            {{ formatTimeAgo(trade.time) }}
                          </span>
                        </div>

                        <!-- Price -->
                        <div class="flex items-center">
                          <span class="font-mono font-medium text-lg"
                            :class="getChangeColor(getPriceChange(selectedSymbol))">
                            {{ trade.price.toFixed(5) }}
                          </span>
                        </div>

                        <!-- Volume -->
                        <div class="flex items-center">
                          <span class="font-mono text-sm text-primary-600 dark:text-primary-400">
                            {{ (trade.volume / 1000).toFixed(1) }}K
                          </span>
                        </div>

                        <!-- Change -->
                        <div class="flex items-center">
                          <UBadge :color="getChangeUIColor(getPriceChange(selectedSymbol))" variant="soft">
                            {{ getPriceChange(selectedSymbol) > 0 ? '+' : '' }}{{
                              getPriceChange(selectedSymbol).toFixed(5) }}
                          </UBadge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UCard>

          <!-- Market Insights -->
          <UCard>
            <template #header>
              <h4 class="font-semibold text-gray-900 dark:text-white">Market Insights</h4>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Top Movers -->
              <div>
                <h5 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Top Movers 🔥</h5>
                <div class="space-y-2">
                  <UCard v-for="symbol in topMovers" :key="symbol.symbol"
                    class="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                    @click="selectedSymbol = symbol.symbol" :ui="{ body: { padding: 'p-2' }, background: '' }">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <UAvatar :ui="{ rounded: 'rounded-md' }" size="sm"
                          :class="`bg-${symbol.color}-500 dark:bg-${symbol.color}-600`">
                          <span class="text-xs font-bold text-white">{{ symbol.pair.substring(0, 3) }}</span>
                        </UAvatar>
                        <span class="font-medium">{{ symbol.name }}</span>
                      </div>
                      <div class="text-right">
                        <UBadge :color="getChangeUIColor(symbol.change)" variant="soft">
                          {{ symbol.percentChange.toFixed(2) }}%
                        </UBadge>
                        <div class="text-xs text-primary-600/70 dark:text-primary-400/70 mt-1">
                          {{ symbol.change > 0 ? '+' : '' }}{{ symbol.change.toFixed(4) }}
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>
              </div>

              <!-- Highest Volume -->
              <div>
                <h5 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Highest Volume 📊</h5>
                <div class="space-y-2">
                  <UCard v-for="symbol in highestVolume" :key="symbol.symbol"
                    class="cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                    @click="selectedSymbol = symbol.symbol" :ui="{ body: { padding: 'p-2' }, background: '' }">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <UAvatar :ui="{ rounded: 'rounded-md' }" size="sm"
                          :class="`bg-${symbol.color}-500 dark:bg-${symbol.color}-600`">
                          <span class="text-xs font-bold text-white">{{ symbol.pair.substring(0, 3) }}</span>
                        </UAvatar>
                        <span class="font-medium">{{ symbol.name }}</span>
                      </div>
                      <div class="text-right">
                        <div class="font-mono text-primary-600 dark:text-primary-400">
                          {{ ((symbolVolumes[symbol.symbol] || 0) / 1000).toFixed(1) }}K
                        </div>
                        <div class="text-xs text-primary-600/70 dark:text-primary-400/70 mt-1">
                          {{ symbol.trades }} trades
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Right Column - Market Overview -->
        <div class="space-y-4 lg:space-y-6">
          <!-- Market Overview -->
          <UCard>
            <template #header>
              <h4 class="font-semibold text-gray-900 dark:text-white">Market Overview</h4>
            </template>

            <div class="space-y-3">
              <UCard v-for="symbol in allTrades.slice(0, 8)" :key="symbol.symbol"
                @click="selectedSymbol = symbol.symbol" :class="[
                  'cursor-pointer transition-all',
                  selectedSymbol === symbol.symbol
                    ? 'ring-2 ring-primary-500 dark:ring-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-primary-50 dark:hover:bg-primary-900/10'
                ]" :ui="{ body: { padding: 'p-3' } }">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UAvatar :ui="{ rounded: 'rounded-lg' }" size="sm"
                      :class="`bg-${symbol.color}-500 dark:bg-${symbol.color}-600`">
                      <span class="text-xs font-bold text-white">{{ symbol.pair.substring(0, 3) }}</span>
                    </UAvatar>
                    <div>
                      <div class="font-medium text-gray-900 dark:text-white">{{ symbol.name }}</div>
                      <UBadge :color="getVolatilityColor(symbol.volatility)" variant="soft" size="xs">
                        {{ symbol.category }}
                      </UBadge>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-mono text-sm" :class="getChangeColor(symbol.change)">
                      {{ symbol.price.toFixed(5) }}
                    </div>
                    <UBadge :color="getChangeUIColor(symbol.change)" variant="soft" size="xs" class="mt-1">
                      {{ symbol.percentChange.toFixed(2) }}%
                    </UBadge>
                  </div>
                </div>
              </UCard>
            </div>
          </UCard>

          <!-- Trading Stats -->
          <UCard>
            <template #header>
              <h4 class="font-semibold text-gray-900 dark:text-white">Trading Statistics</h4>
            </template>

            <div class="space-y-4">
              <div v-for="(stat, label) in {
                'Total Trades': trades.length,
                'Average Price': stats?.avgPrice?.toFixed(5),
                'Price Range': stats?.priceRange?.toFixed(5),
                'Average Volume': stats?.avgVolume?.toFixed(1),
                'Market Volatility': stats?.volatility?.toFixed(5),
                'Trade Frequency': stats?.tradeFrequency ? (1000 / stats.tradeFrequency).toFixed(1) + '/s' : '--'
              }" :key="label"
                class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ label }}</span>
                <span class="font-medium text-primary-600 dark:text-primary-400">{{ stat || '--.--' }}</span>
              </div>
            </div>
          </UCard>

          <!-- Quick Actions -->
          <UCard
            :ui="{ background: 'bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700' }">
            <template #header>
              <h4 class="font-semibold text-white">Quick Actions</h4>
            </template>

            <div class="space-y-3">
              <UButton @click="exportData" icon="i-heroicons-arrow-down-tray" variant="solid" color="white"
                class="w-full"
                :ui="{ color: { white: { solid: 'text-primary-600 dark:text-primary-600 bg-white hover:bg-gray-100' } } }">
                Export Data
              </UButton>

              <UButton @click="refreshData" icon="i-heroicons-arrow-path" variant="outline" color="white"
                class="w-full">
                Refresh All
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<style scoped>
/* Mobile optimizations - edge to edge */
@media (max-width: 768px) {
  :deep(.u-container) {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  :deep(.u-card) {
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
    margin: 0 !important;
  }

  .px-4 {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  .symbols-scroll-container {
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  .symbols-scroll-container::-webkit-scrollbar {
    display: none;
  }

  /* Remove borders and border-radius on mobile */
  .border,
  .border-b,
  .border-t,
  .border-l,
  .border-r {
    border-width: 0 !important;
  }

  .rounded-lg,
  .rounded-xl,
  .rounded-md {
    border-radius: 0 !important;
  }
}

/* Large screen optimizations */
@media (min-width: 1024px) {
  .grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .max-h-[400px] {
    max-height: calc(100vh - 300px);
  }

  :deep(.u-card) {
    border-radius: 0.75rem !important;
  }
}

/* Custom scrollbar for trades */
.trades-container::-webkit-scrollbar {
  width: 6px;
}

.trades-container::-webkit-scrollbar-track {
  background: transparent;
}

.trades-container::-webkit-scrollbar-thumb {
  background: var(--color-primary-300);
  border-radius: 3px;
}

.trades-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-400);
}

.dark .trades-container::-webkit-scrollbar-thumb {
  background: var(--color-primary-700);
}

.dark .trades-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-600);
}

/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Animation for price changes */
@keyframes highlight {
  0% {
    background-color: rgba(var(--color-primary-500), 0.2);
  }

  100% {
    background-color: transparent;
  }
}

.highlight {
  animation: highlight 1s ease-in-out;
}

/* Smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Pulse animation for active elements */
@keyframes pulse-primary {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse-primary 2s infinite;
}

/* Gradient text for important elements */
.gradient-text {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>