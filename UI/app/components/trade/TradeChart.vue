<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStateStore } from '~/stores/state'
import { useFinnhub } from '~/web_socket/livedata'

// Import ApexCharts only on client side
let VueApexCharts: any = null
if (process.client) {
    VueApexCharts = defineAsyncComponent(() =>
        import('vue3-apexcharts').then(module => module.default)
    )
}

const store = useStateStore()
const { startStream } = useFinnhub()


const selectedSymbol = ref<string>(tradeSymbols[0].code)

// Chart loading state
const isChartReady = ref<boolean>(false)
const isLoading = ref<boolean>(true)

// Chart types
const chartTypes = [
    { label: 'Line', value: 'line', icon: 'i-lucide-chart-line' },
    { label: 'Candlestick', value: 'candlestick', icon: 'i-heroicons-chart-bar' },
    { label: 'Area', value: 'area', icon: 'i-lucide-chart-area' },
    { label: 'Negative Area', value: 'negative-area', icon: 'i-heroicons-chart-pie' },
    { label: 'Scatter', value: 'scatter', icon: 'i-heroicons-circle-stack' }
]
const selectedChartType = ref<string>('line')

// Negative area chart settings
const negativeAreaPivot = ref<number>(0)

// Time intervals
const timeIntervals = [
    { label: '1m', value: '1m', seconds: 60 },
    { label: '5m', value: '5m', seconds: 300 },
    { label: '15m', value: '15m', seconds: 900 },
    { label: '1h', value: '1h', seconds: 3600 }
]
const selectedTimeInterval = ref<string>('1m')

// Chart data
const sortedTrades = ref<any[]>([])
const candlestickData = ref<any[]>([])

// Chart annotations (horizontal lines for comparison)
const chartAnnotations = ref<any[]>([])

// Support/Resistance toggle
const showSupportResistance = ref<boolean>(false)
const supportResistanceLevels = ref<number[]>([])

// Zoom and scale controls
const autoZoom = ref<boolean>(true)
const yAxisMin = ref<number>(0)
const yAxisMax = ref<number>(0)
const yAxisRange = ref<number>(0.01)
const xAxisRange = ref<number>(50)
const zoomLevel = ref<number>(1)
const maxZoomLevel = 20
const minZoomLevel = 0.1
const manualYRange = ref<number>(0.01)
const manualXRange = ref<number>(50)

// UI state
const showGrid = ref<boolean>(true)
const showPriceLine = ref<boolean>(true)
const chartHeight = ref<number>(520)
const showRightPanel = ref<boolean>(true)
const showChartTools = ref<boolean>(false)

// Price tracking
const priceDirection = ref<'up' | 'down' | 'neutral'>('neutral')
const currentPrice = ref<number>(0)
const previousPrice = ref<number>(0)
const priceHistory = ref<number[]>([])

// Mobile detection
const isMobile = ref<boolean>(false)
let resizeObserver: ResizeObserver | null = null

// Initialize chart
const initializeChart = async () => {
    if (process.client) {
        isLoading.value = true

        await new Promise(resolve => setTimeout(resolve, 100))

        subscribeToSymbol(selectedSymbol.value)

        // Initialize negative area pivot
        if (store.liveTradeData[selectedSymbol.value]?.length > 0) {
            const prices = store.liveTradeData[selectedSymbol.value].map((t: any) => t.price)
            negativeAreaPivot.value = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
        }

        await nextTick()
        isChartReady.value = true
        isLoading.value = false
    }
}

// Subscribe to symbol
const subscribeToSymbol = (symbol: string) => {
    if (!store.liveTradeData[symbol]) {
        startStream(symbol)
    }
}

// Initialize
onMounted(() => {
    if (process.client) {
        initializeChart()

        resizeObserver = new ResizeObserver(checkMobile)
        resizeObserver.observe(document.body)

        document.addEventListener('contextmenu', handleContextMenu)
    }
})

// Cleanup
onUnmounted(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
    if (process.client) {
        document.removeEventListener('contextmenu', handleContextMenu)
    }
})

// Handle right-click context menu
const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()

    if (event.target && (event.target as HTMLElement).closest('.apexcharts-canvas')) {
        addHorizontalLine(event)
    }
}

// Add horizontal line at position (BLUE with centered label)
const addHorizontalLine = (event: MouseEvent) => {
    if (!isChartReady.value) return

    const chartElement = (event.target as HTMLElement).closest('.apexcharts-canvas')
    if (!chartElement) return

    const rect = chartElement.getBoundingClientRect()
    const y = event.clientY - rect.top
    const height = rect.height

    const priceRange = yAxisMax.value - yAxisMin.value
    const price = yAxisMax.value - (y / height) * priceRange

    // Generate a nice blue color from predefined palette
    const blueColors = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']
    const borderColor = blueColors[chartAnnotations.value.length % blueColors.length]

    const annotationId = `hline-${Date.now()}`
    chartAnnotations.value.push({
        id: annotationId,
        y: price,
        borderColor: borderColor,
        borderWidth: 1,
        strokeDashArray: 0,
        label: {
            borderColor: borderColor,
            style: {
                color: '#fff',
                background: borderColor,
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer'
            },
            text: `${price.toFixed(5)} ✕`,
            position: 'center',
            offsetX: 0,
            offsetY: 0,
            textAnchor: 'middle',
            orientation: 'horizontal'
        }
    })
}

// Remove horizontal line
const removeHorizontalLine = (id: string) => {
    chartAnnotations.value = chartAnnotations.value.filter(line => line.id !== id)
}

// Clear all horizontal lines
const clearHorizontalLines = () => {
    chartAnnotations.value = []
}

// Auto-detect support/resistance
const detectSupportResistance = () => {
    if (!showSupportResistance.value || sortedTrades.value.length < 20) {
        supportResistanceLevels.value = []
        return
    }

    const prices = sortedTrades.value.map(p => p.y)
    const windowSize = 5
    const levels: number[] = []

    // Simple detection of local minima and maxima
    for (let i = windowSize; i < prices.length - windowSize; i++) {
        const window = prices.slice(i - windowSize, i + windowSize + 1)
        const current = prices[i]

        // Check for resistance (local maximum)
        if (current === Math.max(...window)) {
            if (!levels.includes(current)) {
                levels.push(current)
            }
        }
        // Check for support (local minimum)
        else if (current === Math.min(...window)) {
            if (!levels.includes(current)) {
                levels.push(current)
            }
        }
    }

    supportResistanceLevels.value = levels.slice(-5) // Keep only last 5 levels
}

// Calculate market data for symbol
const calculateMarketData = (symbol: string) => {
    const trades = store.liveTradeData[symbol]
    if (!trades || trades.length < 2) return null

    const lastPrice = trades[0]?.price || 0
    const prevPrice = trades[1]?.price || lastPrice
    const change = lastPrice - prevPrice

    return {
        price: lastPrice,
        change,
        changePercent: prevPrice !== 0 ? (change / prevPrice) * 100 : 0
    }
}

// Safe mobile detection
const checkMobile = () => {
    if (process.client) {
        isMobile.value = window.innerWidth < 768
        if (isMobile.value) {
            showRightPanel.value = false
        }
    }
}

// Toggle panels
const toggleRightPanel = () => {
    showRightPanel.value = !showRightPanel.value
}

// Watch for symbol changes
watch(selectedSymbol, (newSymbol) => {
    subscribeToSymbol(newSymbol)
    sortedTrades.value = []
    candlestickData.value = []
    priceHistory.value = []
    chartAnnotations.value = []
    supportResistanceLevels.value = []
    resetZoom()

    if (isChartReady.value) {
        isLoading.value = true
        setTimeout(() => {
            isLoading.value = false
        }, 300)
    }
})

// Watch for support/resistance toggle
watch(showSupportResistance, () => {
    detectSupportResistance()
})

// Process trades
watch(() => store.liveTradeData[selectedSymbol.value], (trades) => {
    if (!trades?.length) {
        sortedTrades.value = []
        candlestickData.value = []
        return
    }

    const sorted = [...trades].sort((a, b) => a.time - b.time)
    sortedTrades.value = sorted.map(trade => ({
        x: trade.time,
        y: trade.price
    }))

    if (sorted.length > 0) {
        const latestPrice = sorted[sorted.length - 1].price
        currentPrice.value = latestPrice

        priceHistory.value.push(latestPrice)
        if (priceHistory.value.length > 100) priceHistory.value.shift()

        if (previousPrice.value > 0) {
            priceDirection.value = latestPrice > previousPrice.value ? 'up'
                : latestPrice < previousPrice.value ? 'down'
                    : 'neutral'
        }
        previousPrice.value = latestPrice
    }

    if (selectedChartType.value === 'candlestick') {
        generateCandlestickData(sorted)
    }

    // Auto-detect support/resistance
    detectSupportResistance()

    if (autoZoom.value) {
        autoAdjustYAxis()
    }
}, { deep: true })

// Generate candlestick data
const generateCandlestickData = (trades: any[]) => {
    const intervalSeconds = timeIntervals.find(i => i.value === selectedTimeInterval.value)?.seconds || 60
    const intervalMs = intervalSeconds * 1000

    const candles: any[] = []
    let currentCandle: any = null
    let candleStartTime = 0

    trades.forEach(trade => {
        const tradeTime = trade.time

        if (!currentCandle || tradeTime >= candleStartTime + intervalMs) {
            if (currentCandle) candles.push(currentCandle)

            candleStartTime = Math.floor(tradeTime / intervalMs) * intervalMs
            currentCandle = {
                x: candleStartTime,
                y: [trade.price, trade.price, trade.price, trade.price]
            }
        } else {
            if (trade.price > currentCandle.y[1]) currentCandle.y[1] = trade.price
            if (trade.price < currentCandle.y[2]) currentCandle.y[2] = trade.price
            currentCandle.y[3] = trade.price
        }
    })

    if (currentCandle) candles.push(currentCandle)
    candlestickData.value = candles.slice(-100)
}

// Calculate volatility
const calculateVolatility = () => {
    if (priceHistory.value.length < 2) return 0.001

    const prices = priceHistory.value
    const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i])
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
    return Math.sqrt(variance)
}

// Auto-adjust y-axis
const autoAdjustYAxis = () => {
    if (sortedTrades.value.length === 0) return

    const prices = sortedTrades.value.map(p => p.y)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min
    const volatility = calculateVolatility()

    const yAxisCenter = currentPrice.value || (min + max) / 2
    const baseRange = Math.max(range, volatility * 3)
    yAxisRange.value = Math.max(baseRange * 1.5, 0.001)
    manualYRange.value = yAxisRange.value

    yAxisMin.value = yAxisCenter - yAxisRange.value
    yAxisMax.value = yAxisCenter + yAxisRange.value
    zoomLevel.value = 1
}

// Manual Y-axis range controls
const updateYAxisMin = (value: number) => {
    yAxisMin.value = parseFloat(value.toFixed(5))
    yAxisRange.value = yAxisMax.value - yAxisMin.value
    manualYRange.value = yAxisRange.value
    autoZoom.value = false
}

const updateYAxisMax = (value: number) => {
    yAxisMax.value = parseFloat(value.toFixed(5))
    yAxisRange.value = yAxisMax.value - yAxisMin.value
    manualYRange.value = yAxisRange.value
    autoZoom.value = false
}

const updateYRange = (event: Event) => {
    const input = event.target as HTMLInputElement
    const value = parseFloat(input.value)

    if (sortedTrades.value.length > 0) {
        manualYRange.value = Math.max(value, 0.0001)
        yAxisRange.value = manualYRange.value

        const prices = sortedTrades.value.map(p => p.y)
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        const center = currentPrice.value || (min + max) / 2

        yAxisMin.value = center - yAxisRange.value
        yAxisMax.value = center + yAxisRange.value
        autoZoom.value = false
    }
}

// X-axis range controls
const updateXAxisRange = (value: number) => {
    manualXRange.value = value
    xAxisRange.value = value
}

// Manual zoom controls
const zoomIn = () => {
    if (zoomLevel.value < maxZoomLevel) {
        zoomLevel.value = Math.min(zoomLevel.value * 1.5, maxZoomLevel)
        applyManualZoom()
    }
}

const zoomOut = () => {
    if (zoomLevel.value > minZoomLevel) {
        zoomLevel.value = Math.max(zoomLevel.value * 0.667, minZoomLevel)
        applyManualZoom()
    }
}

const resetZoom = () => {
    zoomLevel.value = 1
    autoZoom.value = true
    autoAdjustYAxis()
    manualXRange.value = 50
    xAxisRange.value = 50
}

const applyManualZoom = () => {
    autoZoom.value = false
    if (sortedTrades.value.length === 0) return

    const prices = sortedTrades.value.map(p => p.y)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const center = currentPrice.value || (min + max) / 2

    const range = (max - min) * zoomLevel.value
    yAxisRange.value = Math.max(range, 0.001)
    manualYRange.value = yAxisRange.value
    yAxisMin.value = center - (range / 2)
    yAxisMax.value = center + (range / 2)
}


const toggleAutoZoom = () => {
    autoZoom.value = !autoZoom.value
    if (autoZoom.value) {
        autoAdjustYAxis()
    }
}

watch(autoZoom, (val) => {
  if (val) {
    autoAdjustYAxis()
  }
})


// Chart series with negative area support
const chartSeries = computed(() => {
    if (selectedChartType.value === 'candlestick') {
        return [{
            name: selectedSymbol.value,
            data: candlestickData.value.slice(-manualXRange.value)
        }]
    } else if (selectedChartType.value === 'negative-area') {
        // Create area chart data with split colors based on pivot
        const data = sortedTrades.value.slice(-manualXRange.value).map(trade => ({
            x: trade.x,
            y: trade.y,
            fillColor: trade.y >= negativeAreaPivot.value ? '#10b981' : '#ef4444'
        }))

        return [{
            name: selectedSymbol.value,
            type: 'area',
            data: data
        }]
    } else {
        return [{
            name: selectedSymbol.value,
            type: selectedChartType.value,
            data: sortedTrades.value.slice(-manualXRange.value)
        }]
    }
})

// Combined annotations with all lines (CENTERED labels)
const combinedAnnotations = computed(() => {
    const annotations: any = { yaxis: [] }

    // Price line (centered)
    if (showPriceLine.value && currentPrice.value > 0) {
        annotations.yaxis.push({
            y: currentPrice.value,
            borderColor: priceDirection.value === 'up' ? '#10b981' :
                priceDirection.value === 'down' ? '#ef4444' : '#6b7280',
            borderWidth: 1,
            strokeDashArray: 3,
            label: {
                borderColor: priceDirection.value === 'up' ? '#10b981' :
                    priceDirection.value === 'down' ? '#ef4444' : '#6b7280',
                style: {
                    color: '#fff',
                    background: priceDirection.value === 'up' ? '#10b981' :
                        priceDirection.value === 'down' ? '#ef4444' : '#6b7280',
                    fontSize: '10px',
                    fontWeight: 'bold',
                },
                text: `Price: ${currentPrice.value.toFixed(5)}`,
                position: 'center',
                offsetX: 0,
                offsetY: 0,
                textAnchor: 'middle'
            }
        })
    }

    // Pinned horizontal lines (BLUE with centered labels)
    chartAnnotations.value.forEach(annotation => {
        annotations.yaxis.push({
            ...annotation,
            label: {
                ...annotation.label,
                text: `${annotation.y.toFixed(5)} ✕`,
                position: 'center',
                offsetX: 0,
                offsetY: 0,
                textAnchor: 'middle',
                style: {
                    ...annotation.label.style,
                    cursor: 'pointer'
                }
            }
        })
    })

    // Support/Resistance levels (centered, smaller labels)
    if (showSupportResistance.value) {
        supportResistanceLevels.value.forEach((level, index) => {
            annotations.yaxis.push({
                y: level,
                borderColor: index % 2 === 0 ? '#10b981' : '#ef4444',
                borderWidth: 0.5,
                strokeDashArray: 3,
                label: {
                    borderColor: index % 2 === 0 ? '#10b981' : '#ef4444',
                    style: {
                        color: '#fff',
                        background: index % 2 === 0 ? '#10b981' : '#ef4444',
                        fontSize: '9px',
                    },
                    text: index % 2 === 0 ? 'S' : 'R',
                    position: 'center',
                    offsetX: 0,
                    offsetY: 0,
                    textAnchor: 'middle'
                }
            })
        })
    }

    return annotations
})

// Chart options (simplified for area charts)
const chartOptions = computed(() => {
    const isDark = process.client && document.documentElement.classList.contains('dark')
    const textColor = isDark ? '#d1d5db' : '#374151'
    const gridColor = isDark ? '#4b5563' : '#e5e7eb'
    const bgColor = isDark ? '#1f2937' : '#ffffff'

    const isCandlestick = selectedChartType.value === 'candlestick'
    const isArea = selectedChartType.value === 'area' || selectedChartType.value === 'negative-area'

    const baseConfig: any = {
        chart: {
            type: isCandlestick ? 'candlestick' : selectedChartType.value,
            height: isMobile.value ? 400 : chartHeight.value,
            background: bgColor,
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            },
            zoom: {
                enabled: true,
                type: 'xy'
            },
            animations: {
                enabled: true,
                easing: 'linear',
                speed: 300
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                style: { colors: textColor }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            min: yAxisMin.value,
            max: yAxisMax.value,
            labels: {
                style: { colors: textColor },
                formatter: (val: number) => val.toFixed(5)
            },
            opposite: true,
            forceNiceScale: true,
            tickAmount: 8,
            title: {
                text: 'Price',
                style: { color: textColor }
            }
        },
        grid: {
            borderColor: gridColor,
            show: showGrid.value,
            strokeDashArray: 4,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: true } }
        },
        tooltip: {
            enabled: !isArea, // Disable tooltips for area charts
            shared: true,
            intersect: false,
            theme: isDark ? 'dark' : 'light',
            x: {
                format: 'dd MMM yyyy HH:mm:ss'
            }
        },
        legend: {
            show: false
        },
        annotations: combinedAnnotations.value
    }

    // Candlestick specific
    if (isCandlestick) {
        baseConfig.plotOptions = {
            candlestick: {
                colors: {
                    upward: '#10b981',
                    downward: '#ef4444'
                },
                wick: {
                    useFillColor: true
                }
            }
        }

        baseConfig.tooltip.y = {
            formatter: (val: number, { seriesIndex, dataPointIndex, w }: any) => {
                const candle = w.config.series[seriesIndex].data[dataPointIndex]
                return `
                    <div class="space-y-1">
                        <div>O: <strong>${candle.y[0].toFixed(5)}</strong></div>
                        <div>H: <strong>${candle.y[1].toFixed(5)}</strong></div>
                        <div>L: <strong>${candle.y[2].toFixed(5)}</strong></div>
                        <div>C: <strong>${candle.y[3].toFixed(5)}</strong></div>
                    </div>
                `
            }
        }
    }
    // Area charts (minimal)
    else if (isArea) {
        baseConfig.stroke = {
            curve: 'smooth',
            width: 2
        }

        if (selectedChartType.value === 'negative-area') {
            baseConfig.fill = {
                type: 'gradient',
                gradient: {
                    type: 'vertical',
                    shadeIntensity: 1,
                    gradientToColors: [bgColor],
                    inverseColors: false,
                    opacityFrom: 0.8,
                    opacityTo: 0.2,
                    stops: [0, 50, 100]
                }
            }
        } else {
            baseConfig.fill = {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.1,
                    stops: [0, 90, 100]
                }
            }
        }

        // No tooltip for area charts
        baseConfig.tooltip.enabled = false
    }
    // Other chart types
    else {
        baseConfig.stroke = {
            curve: 'smooth',
            width: selectedChartType.value === 'scatter' ? 0 : 2
        }

        baseConfig.tooltip.y = {
            formatter: (val: number) => val.toFixed(5)
        }
    }

    return baseConfig
})

// Price change
const priceChange = computed(() => {
    if (sortedTrades.value.length < 2) return 0
    const current = sortedTrades.value[sortedTrades.value.length - 1].y
    const previous = sortedTrades.value[sortedTrades.value.length - 2].y
    return current - previous
})

// Format time safely
const formatTime = () => {
    if (!process.client) return ''
    return new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
}

// Export chart data
const exportChartData = () => {
    const data = selectedChartType.value === 'candlestick' ? candlestickData.value : sortedTrades.value
    const csv = 'Time,Price\n' + data.map(d =>
        `${new Date(d.x).toISOString()},${Array.isArray(d.y) ? d.y.join(',') : d.y}`
    ).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedSymbol.value.replace(':', '_')}_${selectedChartType.value}_${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
}
</script>

<template>
    <div :class="['mx-auto', isMobile ? 'w-full p-0' : 'max-w-7xl p-6']">
        <!-- Loading Overlay -->
        <div v-if="isLoading || !isChartReady"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-md">
                <div
                    class="w-16 h-16 rounded-full bg-gradient-to-br from-primary-300 to-primary-600 flex items-center justify-center mx-auto mb-4">
                    <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-white animate-pulse" />
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Loading Chart</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">Initializing trading visualization...</p>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-primary-600 h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
            </div>
        </div>

        <!-- Mobile Header -->
        <div v-if="isMobile"
            class="sticky top-0 z-40 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <button @click="showChartTools = !showChartTools"
                    class="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/50">
                    <UIcon name="i-heroicons-wrench-screwdriver" class="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <h2 class="font-bold text-gray-900 dark:text-white text-lg">
                    {{ selectedSymbol.split(':')[1] }}
                </h2>
            </div>
            <div class="flex items-center gap-2">
                <button @click="toggleRightPanel" class="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/50">
                    <UIcon :name="showRightPanel ? 'i-heroicons-x-mark' : 'i-heroicons-adjustments-horizontal'"
                        class="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
            </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-6">
            <!-- Main Chart Area -->
            <div
                :class="['transition-all duration-300', isMobile && !showRightPanel ? 'w-full' : showRightPanel ? 'lg:w-3/4' : 'w-full']">
                <div :class="[
                    'bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700',
                    isMobile ? 'rounded-none p-3' : 'rounded-2xl p-6'
                ]">
                    <!-- Top Bar -->
                    <div :class="[
                        'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6',
                        isMobile ? 'mb-4' : ''
                    ]">
                        <!-- Symbol and Price -->
                        <div class="flex items-center gap-4">
                            <div v-if="!isMobile"
                                class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                <span class="text-white font-bold text-lg">{{ selectedSymbol.split(':')[1].substring(0,
                                    3) }}</span>
                            </div>
                            <div>
                                <h2 :class="[
                                    'font-bold text-gray-900 dark:text-white',
                                    isMobile ? 'text-xl' : 'text-2xl'
                                ]">
                                    {{ selectedSymbol.split(':')[1] }}
                                </h2>
                                <div class="flex items-center gap-3 mt-1">
                                    <div class="flex items-center gap-1">
                                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span class="text-sm text-gray-500 dark:text-gray-400">Live</span>
                                    </div>
                                    <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatTime() }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Price Display -->
                        <div class="flex items-center gap-3">
                            <div class="text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <div :class="[
                                        'font-bold text-gray-900 dark:text-white',
                                        isMobile ? 'text-3xl' : 'text-4xl'
                                    ]">
                                        {{ currentPrice.toFixed(5) || '--.--' }}
                                    </div>
                                    <div v-if="priceDirection !== 'neutral'" :class="[
                                        'px-2 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                                        priceDirection === 'up'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    ]">
                                        <UIcon
                                            :name="priceDirection === 'up' ? 'i-heroicons-arrow-up-right' : 'i-heroicons-arrow-down-right'"
                                            class="w-3.5 h-3.5" />
                                        <span>{{ priceChange.toFixed(5) }}</span>
                                    </div>
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Volatility: {{ (calculateVolatility() * 100).toFixed(2) }}%
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Controls Bar -->
                    <div :class="[
                        'mb-6',
                        isMobile ? 'mb-4' : ''
                    ]">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <!-- Left Controls -->
                            <div class="flex flex-wrap items-center gap-2">
                                <!-- Chart Type -->
                                <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-1">
                                    <button v-for="type in chartTypes" :key="type.value"
                                        @click="selectedChartType = type.value" :class="[
                                            'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                                            selectedChartType === type.value
                                                ? 'bg-white dark:bg-gray-800 shadow-sm text-primary-600 dark:text-primary-400'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                                        ]">
                                        <UIcon :name="type.icon" class="w-4 h-4" />
                                        <span v-if="!isMobile">{{ type.label }}</span>
                                    </button>
                                </div>

                                <!-- Negative Area Pivot -->
                                <div v-if="selectedChartType === 'negative-area'" class="flex items-center gap-2">
                                    <span class="text-xs text-gray-500 dark:text-gray-400">Pivot:</span>
                                    <input type="number" v-model="negativeAreaPivot" step="0.0001"
                                        class="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900" />
                                </div>

                                <!-- Time Interval -->
                                <div v-if="selectedChartType === 'candlestick'" class="flex items-center gap-2">
                                    <select v-model="selectedTimeInterval"
                                        class="bg-gray-100 dark:bg-gray-900/50 border-0 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500">
                                        <option v-for="interval in timeIntervals" :key="interval.value"
                                            :value="interval.value">
                                            {{ interval.label }}
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <!-- Right Controls -->
                            <div class="flex items-center gap-2">
                                <!-- X-axis Range Control -->
                                <div class="flex items-center gap-2" v-if="!isMobile">
                                    <div class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        View:
                                    </div>
                                    <div class="relative w-24">
                                        <USlider  v-model="manualXRange" :min="10" :max="200" step="1"
                                            @input="updateXAxisRange"
                                            class="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                                        <div
                                            class="absolute -bottom-6 left-0 right-0 text-xs text-center text-gray-500 dark:text-gray-400">
                                            {{ manualXRange }} ticks
                                        </div>
                                    </div>
                                </div>

                                <!-- Zoom Controls -->
                                <div class="flex items-center gap-1">
                                    <button @click="zoomOut"
                                        class="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800">
                                        <UIcon name="i-heroicons-magnifying-glass-minus" class="w-4 h-4" />
                                    </button>

                                    <div class="text-center min-w-[60px]">
                                        <div class="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {{ autoZoom ? 'Auto' : `${zoomLevel.toFixed(1)}x` }}
                                        </div>
                                        <div class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                            ±{{ yAxisRange.toFixed(5) }}
                                        </div>
                                    </div>

                                    <button @click="zoomIn"
                                        class="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800">
                                        <UIcon name="i-heroicons-magnifying-glass-plus" class="w-4 h-4" />
                                    </button>
                                </div>

                                <!-- Quick Toggles -->
                                <div class="flex items-center gap-1">
                                    <button @click="showGrid = !showGrid" :class="[
                                        'p-2 rounded-lg',
                                        showGrid
                                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                            : 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300'
                                    ]">
                                        <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
                                    </button>
                                    <button @click="showPriceLine = !showPriceLine" :class="[
                                        'p-2 rounded-lg',
                                        showPriceLine
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300'
                                    ]">
                                        <UIcon name="i-heroicons-chart-bar" class="w-4 h-4" />
                                    </button>
                                    <button @click="toggleAutoZoom" :class="[
                                        'p-2 rounded-lg',
                                        autoZoom
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    ]">
                                        <UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Container -->
                    <div class="relative">
                        <!-- Quick Settings Overlay (LEFT SIDE) -->
                        <div class="absolute top-2 left-2 z-10 flex flex-col gap-1">
                            <button @click="showGrid = !showGrid" :class="[
                                'px-2 py-1 rounded text-xs font-medium backdrop-blur-sm flex items-center gap-1 w-fit',
                                showGrid
                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                    : 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400'
                            ]">
                                <UIcon name="i-heroicons-squares-2x2" class="w-3.5 h-3.5" />
                                <span v-if="!isMobile">Grid</span>
                            </button>

                            <button @click="showPriceLine = !showPriceLine" :class="[
                                'px-2 py-1 rounded text-xs font-medium backdrop-blur-sm flex items-center gap-1 w-fit',
                                showPriceLine
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400'
                            ]">
                                <UIcon name="i-heroicons-chart-bar" class="w-3.5 h-3.5" />
                                <span v-if="!isMobile">Price</span>
                            </button>
                        </div>

                        <!-- Chart Tools Overlay (Mobile) - LEFT SIDE -->
                        <div v-if="isMobile && showChartTools"
                            class="absolute top-12 left-2 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 w-56">
                            <div class="space-y-2">
                                <button @click="exportChartData"
                                    class="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
                                    Export Data
                                </button>
                                <button @click="clearHorizontalLines"
                                    class="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                                    Clear Lines
                                </button>
                                <button @click="resetZoom"
                                    class="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                                    Reset Zoom
                                </button>
                            </div>
                        </div>

                        <!-- Chart Info (LEFT SIDE) -->
                        <div class="absolute bottom-2 left-2 z-10 flex flex-col gap-1">
                            <div
                                class="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded">
                                Y: {{ yAxisRange.toFixed(5) }}
                            </div>
                            <div
                                class="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded">
                                X: {{ manualXRange }} ticks
                            </div>
                            <div v-if="chartAnnotations.length > 0"
                                class="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded">
                                {{ chartAnnotations.length }} lines
                            </div>
                        </div>

                        <!-- Chart -->
                        <div :class="[
                            'bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 overflow-hidden',
                            isMobile ? 'rounded-none' : 'rounded-xl'
                        ]" @contextmenu.prevent="handleContextMenu">
                            <!-- Empty State -->
                            <div v-if="(sortedTrades.length === 0 && candlestickData.length === 0) || !isChartReady"
                                class="flex flex-col items-center justify-center p-8 text-center">
                                <div
                                    class="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500/10 to-primary-600/10 flex items-center justify-center mb-3">
                                    <UIcon name="i-heroicons-chart-bar"
                                        class="w-8 h-8 text-primary-500 dark:text-primary-400" />
                                </div>
                                <h3 class="text-base font-medium text-gray-900 dark:text-white mb-2">
                                    {{ !isChartReady ? 'Initializing Chart...' : 'Waiting for Data' }}
                                </h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    {{ selectedSymbol.split(':')[1] }} trades will appear here...
                                </p>
                            </div>

                            <!-- Chart Display -->
                            <VueApexCharts
                                v-if="isChartReady && (sortedTrades.length > 0 || candlestickData.length > 0)"
                                :series="chartSeries" :options="chartOptions" :height="isMobile ? 400 : chartHeight"
                                :key="selectedSymbol + selectedChartType" />
                        </div>
                    </div>

                    <!-- Chart Info Footer -->
                    <div :class="[
                        'mt-4 pt-3 border-t border-gray-200 dark:border-gray-700',
                        isMobile ? 'text-xs' : 'text-sm'
                    ]">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div class="text-gray-500 dark:text-gray-400">
                                <span class="font-medium">{{ selectedChartType.toUpperCase() }}</span> •
                                <span v-if="selectedChartType === 'candlestick'">{{ selectedTimeInterval }}
                                    candles</span>
                                <span v-else>{{ sortedTrades.length }} ticks</span>
                                • <span
                                    :class="autoZoom ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">
                                    {{ autoZoom ? 'Auto Zoom' : 'Manual Zoom' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="flex items-center gap-1.5">
                                    <div class="w-2 h-2 rounded-full"
                                        :class="priceDirection === 'up' ? 'bg-green-500' : priceDirection === 'down' ? 'bg-red-500' : 'bg-gray-500'">
                                    </div>
                                    <span class="text-gray-500 dark:text-gray-400">
                                        {{ priceDirection === 'up' ? 'Bullish' : priceDirection === 'down' ? 'Bearish' :
                                            'Neutral' }}
                                    </span>
                                </div>
                                <div class="text-gray-500 dark:text-gray-400">
                                    Range: {{ yAxisRange.toFixed(5) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Panel -->
            <div v-if="(!isMobile || showRightPanel) && isChartReady" :class="[
                'transition-all duration-300 ',
                isMobile ? 'fixed inset-y-0 right-0 w-4/5 max-w-sm bg-white dark:bg-gray-800 shadow-2xl z-50 p-4 overflow-y-auto' : 'space-y-3 max-h-[80vh] overflow-y-auto pr-2 lg:w-1/4 lg:min-w-[300px]'
            ]">
                <!-- Mobile Close Button -->
                <button v-if="isMobile" @click="toggleRightPanel"
                    class="fixed top-4 right-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-900">
                    <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>

                <!-- Markets Panel (Scrollable) -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-primary-500" />
                        Markets
                    </h3>

                    <!-- Scrollable container for many currencies -->
                    <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
                        <div v-for="symbol in tradeSymbols" :key="symbol.code" @click="selectedSymbol = symbol.code"
                            :class="[
                                'p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02]',
                                selectedSymbol === symbol.code
                                    ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-prirmary-700'
                            ]">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                        <span class="text-white font-bold">{{ symbol.code.split(':')[1].substring(0, 3)
                                        }}</span>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900 dark:text-white">{{ symbol.name }}</p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ symbol.code.split(':')[0]
                                        }}</p>
                                    </div>
                                </div>
                                <UIcon name="i-heroicons-check-circle" v-if="selectedSymbol === symbol.code"
                                    class="w-5 h-5 text-primary-500 dark:text-primary-400" />
                            </div>

                            <!-- Market Data with PRICE CHANGE (green/red) -->
                            <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
                                <div class="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded">
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Price</p>
                                    <p class="font-medium" :class="calculateMarketData(symbol.code)?.change > 0
                                        ? 'text-green-600 dark:text-green-400'
                                        : calculateMarketData(symbol.code)?.change < 0
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-600 dark:text-gray-400'">
                                        {{ calculateMarketData(symbol.code)?.price.toFixed(5) || '--.--' }}
                                    </p>
                                </div>
                                <div class="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded">
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Change</p>
                                    <p class="font-medium" :class="calculateMarketData(symbol.code)?.change > 0
                                        ? 'text-green-600 dark:text-green-400'
                                        : calculateMarketData(symbol.code)?.change < 0
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-600 dark:text-gray-400'">
                                        {{ calculateMarketData(symbol.code)?.change ?
                                            calculateMarketData(symbol.code)?.change.toFixed(5) : '0.00000' }}
                                    </p>
                                </div>
                                <div class="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded">
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Spread</p>
                                    <p class="font-medium text-amber-600 dark:text-amber-400">
                                        {{ symbol.spread }} pips
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Horizontal Lines Manager -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3
                        class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <UIcon name="i-heroicons-minus" class="w-5 h-5 text-primary-500" />
                            Horizontal Lines
                        </div>
                        <button @click="clearHorizontalLines"
                            class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                            Clear All
                        </button>
                    </h3>

                    <div v-if="chartAnnotations.length > 0" class="space-y-2 max-h-40 overflow-y-auto">
                        <div v-for="line in chartAnnotations" :key="line.id"
                            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                            <div class="flex items-center gap-3">
                                <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: line.borderColor }"></div>
                                <div>
                                    <span class="font-medium text-gray-900 dark:text-white">
                                        {{ line.y.toFixed(5) }}
                                    </span>
                                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Click ✕ on chart to remove
                                    </div>
                                </div>
                            </div>
                            <button @click="removeHorizontalLine(line.id)"
                                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                                <UIcon name="i-heroicons-trash" class="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>
                    <div v-else class="text-center py-4 text-gray-500 dark:text-gray-400">
                        <UIcon name="i-heroicons-information-circle" class="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <p class="text-xs">Right-click on chart to add horizontal lines</p>
                    </div>
                </div>

                <!-- Support/Resistance Toggle -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-arrows-up-down" class="w-5 h-5 text-primary-500" />
                        Support/Resistance
                    </h3>

                    <div class="space-y-4">
                        <!-- Toggle -->
                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                            <div>
                                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Show S/R Levels</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Auto-detected support & resistance
                                </p>
                            </div>
                              <USwitch v-model="showSupportResistance" />

                        </div>

                        <!-- Current Levels -->
                        <div v-if="showSupportResistance && supportResistanceLevels.length > 0"
                            class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                            <p class="text-xs font-medium text-primary-700 dark:text-primary-400 mb-2">
                                Detected {{ supportResistanceLevels.length }} levels
                            </p>
                            <div class="flex flex-wrap gap-1">
                                <span v-for="(level, index) in supportResistanceLevels" :key="index"
                                    class="px-2 py-1 text-xs rounded" :class="index % 2 === 0
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'">
                                    {{ level.toFixed(5) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Y-axis Range Control -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-arrows-up-down" class="w-5 h-5 text-primary-500" />
                        Y-axis Range
                    </h3>

                    <div class="space-y-4">
                        <!-- Manual Inputs -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Min</label>
                                <input type="number" :value="yAxisMin.toFixed(5)"
                                    @input="updateYAxisMin(parseFloat(($event.target as HTMLInputElement).value))"
                                    step="0.0001"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900" />
                            </div>
                            <div>
                                <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Max</label>
                                <input type="number" :value="yAxisMax.toFixed(5)"
                                    @input="updateYAxisMax(parseFloat(($event.target as HTMLInputElement).value))"
                                    step="0.0001"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900" />
                            </div>
                        </div>

                        <!-- Range Slider -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Range Width: {{ manualYRange.toFixed(5) }}
                                </label>
                            </div>
                            <USlider  v-model="manualYRange" :min="0.0001" :max="0.1" step="0.0001"
                                @input="updateYRange"
                                class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>0.0001</span>
                                <span>0.1</span>
                            </div>
                        </div>

                        <!-- Auto/Manual Toggle -->
                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                            <div>
                                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Range</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ autoZoom ? 'Automatically adjusts' : 'Manual control enabled' }}
                                </p>
                            </div>
                              <USwitch v-model="autoZoom" />

                        
                        </div>

                        <!-- Reset Button -->
                        <button @click="resetZoom"
                            class="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                            Reset to Auto
                        </button>
                    </div>
                </div>

                <!-- X-axis Range Control -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 text-primary-500" />
                        X-axis Range
                    </h3>

                    <div class="space-y-4">
                        <!-- Manual Input -->
                        <div>
                            <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Visible Data
                                Points</label>
                            <input type="number" v-model="manualXRange"
                                @input="updateXAxisRange(parseInt(($event.target as HTMLInputElement).value))" min="10"
                                max="200"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900" />
                        </div>

                        <!-- Range Slider -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Data Points: {{ manualXRange }}
                                </label>
                            </div>
                              <USlider v-model="manualXRange" class="cursor-pointer"/>

                            
                            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>10</span>
                                <span>200</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tools -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <UIcon name="i-heroicons-wrench-screwdriver" class="w-5 h-5 text-primary-500" />
                        Tools
                    </h3>

                    <div class="space-y-3">
                        <button @click="exportChartData"
                            class="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                            <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
                            Export Chart Data (CSV)
                        </button>

                        <div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                            <p class="text-xs text-primary-700 dark:text-primary-400">
                                <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline mr-1" />
                                <strong>Tip:</strong> Horizontal lines have centered labels. Click the "✕" to remove
                                them.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom scrollbar for markets panel */
.max-h-96::-webkit-scrollbar {
    width: 4px;
}

.max-h-96::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
}

.max-h-96::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
}

.max-h-96::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
}

.dark .max-h-96::-webkit-scrollbar-track {
    background: #374151;
}

.dark .max-h-96::-webkit-scrollbar-thumb {
    background: #6b7280;
}

.dark .max-h-96::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
}



/* Mobile optimizations */
@media (max-width: 768px) {
    .mx-auto {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
    }

    /* Improve touch targets */
    button,
    select,
    [role="button"],
    input[type="range"] {
        min-height: 44px;
        min-width: 44px;
    }

    /* Hide rounded corners on mobile for full-width */
    div[class*="rounded"]:not(.fixed) {
        border-radius: 0 !important;
    }

    .p-6,
    .p-3 {
        padding: 0.75rem !important;
    }

    .gap-6,
    .gap-4 {
        gap: 0.75rem !important;
    }

    .mb-6,
    .mb-4 {
        margin-bottom: 0.75rem !important;
    }

    .mt-4 {
        margin-top: 0.75rem !important;
    }

    .border:not(.fixed *) {
        border-width: 0 !important;
    }

    .shadow-xl:not(.fixed) {
        box-shadow: none !important;
    }

    .bg-white:not(.fixed),
    .bg-gray-50:not(.fixed) {
        background: transparent !important;
    }

    .dark .bg-gray-800:not(.fixed),
    .dark .bg-gray-900:not(.fixed) {
        background: transparent !important;
    }
}

/* Smooth transitions */
.transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
}

/* Backdrop blur effects */
.backdrop-blur-sm {
    backdrop-filter: blur(8px);
}

/* Animation for price changes */
@keyframes pulse-green {

    0%,
    100% {
        background-color: transparent;
    }

    50% {
        background-color: rgba(34, 197, 94, 0.1);
    }
}

@keyframes pulse-red {

    0%,
    100% {
        background-color: transparent;
    }

    50% {
        background-color: rgba(239, 68, 68, 0.1);
    }
}

.price-up {
    animation: pulse-green 1s ease-in-out;
}

.price-down {
    animation: pulse-red 1s ease-in-out;
}

/* Ensure chart uses full width */
:deep(.apexcharts-canvas) {
    width: 100% !important;
}

/* Fix for centered labels */
:deep(.apexcharts-yaxis-annotation-label) {
    text-align: center !important;
}

/* Adjust annotation label positioning */
:deep(.apexcharts-yaxis-annotations) {
    transform: translateX(0) !important;
}
</style>