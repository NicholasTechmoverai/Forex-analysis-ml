<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Background with gradient and blurred trading image -->
    <div class="absolute inset-0 z-0">
      <div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-emerald-900/10 
                  dark:from-gray-900 dark:via-blue-900/20 dark:to-emerald-900/10 
                  light:from-gray-50 light:via-blue-50/40 light:to-emerald-50/30"></div>
      <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop')] 
                  bg-cover bg-center opacity-10 dark:opacity-10 light:opacity-5 blur-[2px]"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-gray-900/90 
                  dark:from-gray-900 dark:via-transparent dark:to-gray-900/90
                  light:from-white/80 light:via-transparent light:to-white/60"></div>
    </div>

    <div class="relative z-10">
      <!-- Animated Marquee with currency pairs -->
      <div class="bg-gray-900/80 border-y border-gray-700/50 
                  dark:bg-gray-900/80 dark:border-gray-700/50
                  light:bg-white/90 light:border-gray-200/80 py-3 overflow-hidden">
        <div class="flex animate-marquee whitespace-nowrap">
          <div v-for="pair in currencyPairs" :key="pair" class="mx-8 flex items-center space-x-3">
            <UIcon name="i-lucide-trending-up" class="w-4 h-4 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" />
            <span class="font-mono text-sm text-gray-200 dark:text-gray-200 light:text-gray-800">{{ pair }}</span>
            <span class="text-xs px-2 py-1 rounded bg-emerald-900/30 text-emerald-300 
                        dark:bg-emerald-900/30 dark:text-emerald-300
                        light:bg-emerald-100 light:text-emerald-700">{{ randomPercentage() }}</span>
          </div>
        </div>
      </div>

      <!-- Hero Section -->
      <UContainer class="py-16 lg:py-24">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="space-y-8">
            <div>
              <UBadge variant="subtle" 
                class="mb-4 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-blue-500/30
                       dark:bg-gradient-to-r dark:from-blue-500/20 dark:to-emerald-500/20 dark:border-blue-500/30
                       light:bg-gradient-to-r light:from-blue-100 light:to-emerald-100 light:border-blue-200">
                <UIcon name="i-lucide-brain-circuit" class="w-4 h-4 mr-2" />
                Personal AI Research Project
              </UBadge>
              
              <h1 class="text-5xl lg:text-6xl font-bold tracking-tight">
                <span class="bg-gradient-to-r from-blue-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent
                            dark:from-blue-400 dark:via-emerald-400 dark:to-cyan-400
                            light:from-blue-600 light:via-emerald-600 light:to-cyan-600">
                  Forex Intelligence
                </span>
                <span class="block text-white dark:text-white light:text-gray-900">Laboratory</span>
              </h1>
              
              <p class="mt-6 text-lg text-gray-300 leading-relaxed
                        dark:text-gray-300
                        light:text-gray-700">
                My personal sandbox for exploring currency markets through machine learning. 
                This AI-driven platform analyzes forex data, predicts market movements, and 
                serves as a research environment for algorithmic trading strategies.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-4">
              <UButton to="/live" size="xl" color="emerald" variant="solid" 
                class="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500
                       dark:from-emerald-600 dark:to-cyan-600 dark:hover:from-emerald-500 dark:hover:to-cyan-500
                       light:from-emerald-500 light:to-cyan-500 light:hover:from-emerald-400 light:hover:to-cyan-400">
                <UIcon name="i-lucide-activity" class="w-5 h-5 mr-2" />
                Live Analysis
                <UIcon name="i-lucide-sparkles" class="w-4 h-4 ml-2" />
              </UButton>
              
              <UButton to="/dashboard" size="xl" variant="outline" 
                class="border-gray-600 hover:bg-white/10 dark:border-gray-600 dark:hover:bg-white/10
                       light:border-gray-300 light:hover:bg-gray-100 light:text-gray-900">
                <UIcon name="i-lucide-layout-dashboard" class="w-5 h-5 mr-2" />
                Research Dashboard
              </UButton>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-3 gap-4 pt-8">
              <div class="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4
                         dark:bg-gray-900/50 dark:border-gray-700/50
                         light:bg-white/80 light:border-gray-200/80 light:backdrop-blur-sm">
                <div class="text-2xl font-bold text-emerald-400 dark:text-emerald-400 light:text-emerald-600">28+</div>
                <div class="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">Currency Pairs</div>
              </div>
              <div class="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4
                         dark:bg-gray-900/50 dark:border-gray-700/50
                         light:bg-white/80 light:border-gray-200/80 light:backdrop-blur-sm">
                <div class="text-2xl font-bold text-blue-400 dark:text-blue-400 light:text-blue-600">99.7%</div>
                <div class="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">Data Accuracy</div>
              </div>
              <div class="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4
                         dark:bg-gray-900/50 dark:border-gray-700/50
                         light:bg-white/80 light:border-gray-200/80 light:backdrop-blur-sm">
                <div class="text-2xl font-bold text-purple-400 dark:text-purple-400 light:text-purple-600">AI</div>
                <div class="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">Powered</div>
              </div>
            </div>
          </div>

          <!-- Live Chart Preview -->
          <div class="relative">
            <div class="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl
                       dark:bg-gray-900/60 dark:border-gray-700/50
                       light:bg-white/90 light:border-gray-200/80 light:shadow-xl">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-3">
                  <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse
                             dark:bg-emerald-500
                             light:bg-emerald-400"></div>
                  <span class="font-mono text-lg text-white dark:text-white light:text-gray-900">EUR/USD Live</span>
                </div>
                <UBadge color="emerald" variant="subtle" 
                  class="dark:bg-emerald-900/30 dark:text-emerald-300
                         light:bg-emerald-100 light:text-emerald-700">
                  Real-time
                </UBadge>
              </div>
              
              <!-- Mock Chart -->
              <div class="h-64 bg-gradient-to-b from-gray-900/80 to-gray-900/40 rounded-xl p-4 border border-gray-700/30
                         dark:from-gray-900/80 dark:to-gray-900/40 dark:border-gray-700/30
                         light:from-gray-50/80 light:to-gray-100/40 light:border-gray-200/50">
                <div class="flex items-end h-full space-x-1">
                  <div v-for="(height, i) in chartHeights" :key="i" 
                    :class="`w-3 rounded-t ${height > 60 ? 'bg-emerald-500/80' : 'bg-red-500/80'}
                              ${height > 60 ? 'dark:bg-emerald-500/80' : 'dark:bg-red-500/80'}
                              ${height > 60 ? 'light:bg-emerald-400/80' : 'light:bg-red-400/80'}`"
                    :style="{ height: `${height}%` }"
                    class="transition-all duration-300 hover:opacity-80">
                  </div>
                </div>
              </div>
              
              <div class="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <div class="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">AI Prediction</div>
                  <div class="flex items-center">
                    <UIcon name="i-lucide-trending-up" 
                      class="w-4 h-4 text-emerald-400 dark:text-emerald-400 light:text-emerald-500 mr-2" />
                    <span class="text-lg font-bold text-emerald-400 dark:text-emerald-400 light:text-emerald-600">Bullish</span>
                  </div>
                </div>
                <div>
                  <div class="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">Confidence</div>
                  <div class="flex items-center">
                    <UProgress :value="78" size="sm" color="emerald" 
                      class="flex-1 mr-3 dark:bg-gray-800/50 light:bg-gray-200/50" />
                    <span class="text-sm font-mono text-gray-300 dark:text-gray-300 light:text-gray-700">78%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Floating AI Chip -->
            <div class="absolute -top-3 -right-3">
              <UBadge color="purple" variant="solid" 
                class="shadow-lg animate-pulse-slow dark:bg-purple-600 light:bg-purple-500">
                <UIcon name="i-lucide-brain" class="w-4 h-4 mr-1" />
                Neural Network Active
              </UBadge>
            </div>
          </div>
        </div>
      </UContainer>

      <!-- Features Section -->
      <div class="bg-gradient-to-b from-transparent via-gray-900/30 to-gray-900/50 py-20
                  dark:from-transparent dark:via-gray-900/30 dark:to-gray-900/50
                  light:from-transparent light:via-gray-100/50 light:to-gray-100/80">
        <UContainer>
          <div class="text-center mb-16">
            <UBadge variant="subtle" 
              class="mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30
                     dark:from-purple-500/20 dark:to-pink-500/20 dark:border-purple-500/30
                     light:from-purple-100 light:to-pink-100 light:border-purple-200">
              <UIcon name="i-lucide-cpu" class="w-4 h-4 mr-2" />
              AI Research Capabilities
            </UBadge>
            <h2 class="text-4xl font-bold text-white dark:text-white light:text-gray-900 mb-4">Machine Learning Pipeline</h2>
            <p class="text-gray-400 dark:text-gray-400 light:text-gray-600 max-w-2xl mx-auto">
              This project implements a complete ML workflow from data collection to predictive modeling
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <UCard 
              :ui="{ base: 'dark:bg-gray-900/40 dark:border-gray-700/30 light:bg-white/80 light:border-gray-200/50' }"
              class="backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 hover:scale-[1.02]">
              <template #header>
                <div class="flex items-center space-x-3">
                  <div class="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/20 light:bg-blue-100">
                    <UIcon name="i-lucide-database" class="w-6 h-6 text-blue-400 dark:text-blue-400 light:text-blue-600" />
                  </div>
                  <h3 class="text-xl font-bold text-white dark:text-white light:text-gray-900">Data Pipeline</h3>
                </div>
              </template>
              <p class="text-gray-300 dark:text-gray-300 light:text-gray-700">
                Automated collection of forex data from multiple sources with real-time processing and cleaning for AI consumption.
              </p>
            </UCard>

            <UCard 
              :ui="{ base: 'dark:bg-gray-900/40 dark:border-gray-700/30 light:bg-white/80 light:border-gray-200/50' }"
              class="backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02]">
              <template #header>
                <div class="flex items-center space-x-3">
                  <div class="p-2 rounded-lg bg-purple-500/20 dark:bg-purple-500/20 light:bg-purple-100">
                    <UIcon name="i-lucide-brain" class="w-6 h-6 text-purple-400 dark:text-purple-400 light:text-purple-600" />
                  </div>
                  <h3 class="text-xl font-bold text-white dark:text-white light:text-gray-900">Neural Networks</h3>
                </div>
              </template>
              <p class="text-gray-300 dark:text-gray-300 light:text-gray-700">
                Custom LSTM and Transformer models trained on historical data to predict price movements and identify patterns.
              </p>
            </UCard>

            <UCard 
              :ui="{ base: 'dark:bg-gray-900/40 dark:border-gray-700/30 light:bg-white/80 light:border-gray-200/50' }"
              class="backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 hover:scale-[1.02]">
              <template #header>
                <div class="flex items-center space-x-3">
                  <div class="p-2 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/20 light:bg-emerald-100">
                    <UIcon name="i-lucide-line-chart" class="w-6 h-6 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" />
                  </div>
                  <h3 class="text-xl font-bold text-white dark:text-white light:text-gray-900">Backtesting Engine</h3>
                </div>
              </template>
              <p class="text-gray-300 dark:text-gray-300 light:text-gray-700">
                Validate strategies against 15+ years of historical data with realistic commission and slippage modeling.
              </p>
            </UCard>
          </div>
        </UContainer>
      </div>

      <!-- CTA Section -->
      <UContainer class="py-20">
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-emerald-600/10 to-purple-600/10 rounded-3xl blur-xl
                      dark:from-blue-600/10 dark:via-emerald-600/10 dark:to-purple-600/10
                      light:from-blue-100/50 light:via-emerald-100/50 light:to-purple-100/50"></div>
          <div class="relative bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-12 text-center
                     dark:bg-gray-900/60 dark:border-gray-700/50
                     light:bg-white/80 light:border-gray-200/80 light:shadow-lg">
            <div class="max-w-2xl mx-auto">
              <UIcon name="i-lucide-sparkles" 
                class="w-12 h-12 text-cyan-400 dark:text-cyan-400 light:text-cyan-500 mx-auto mb-6" />
              <h2 class="text-3xl font-bold text-white dark:text-white light:text-gray-900 mb-4">Explore the Research Environment</h2>
              <p class="text-gray-300 dark:text-gray-300 light:text-gray-700 mb-8">
                This is my personal laboratory for studying financial markets through data science. 
                All predictions are for research purposes only.
              </p>
              
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <UButton to="/live" size="xl" variant="solid" 
                  class="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500
                         dark:from-cyan-600 dark:to-blue-600 dark:hover:from-cyan-500 dark:hover:to-blue-500
                         light:from-cyan-500 light:to-blue-500 light:hover:from-cyan-400 light:hover:to-blue-400">
                  <UIcon name="i-lucide-activity" class="w-5 h-5 mr-2" />
                  Watch AI Analyze Live Markets
                </UButton>
                
                <UButton to="/dashboard" size="xl" variant="outline"
                  class="border-gray-600 hover:bg-white/10 text-white dark:border-gray-600 dark:hover:bg-white/10 dark:text-white
                         light:border-gray-300 light:hover:bg-gray-100 light:text-gray-900">
                  <UIcon name="i-lucide-bar-chart-3" class="w-5 h-5 mr-2" />
                  Review Historical Predictions
                </UButton>
              </div>
              
              <p class="mt-8 text-sm text-gray-500 dark:text-gray-500 light:text-gray-500">
                <UIcon name="i-lucide-info" class="w-4 h-4 inline mr-1" />
                Note: This is a personal research project. Not financial advice.
              </p>
            </div>
          </div>
        </div>
      </UContainer>

      <!-- Footer Note -->
      <div class="border-t border-gray-800/50 py-8 dark:border-gray-800/50 light:border-gray-200/80">
        <UContainer>
          <div class="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm
                     dark:text-gray-500 light:text-gray-600">
            <div class="flex items-center space-x-2">
              <UIcon name="i-lucide-cpu" class="w-4 h-4" />
              <span>Forex Intelligence Lab v2.1 • AI Research Platform</span>
            </div>
            <div class="flex items-center space-x-6 mt-4 md:mt-0">
              <span class="flex items-center">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2
                           dark:bg-emerald-500 light:bg-emerald-400"></div>
                System Active
              </span>
              <span>Data Updated: Real-time</span>
            </div>
          </div>
        </UContainer>
      </div>
    </div>
  </div>
</template>

<script setup>
// Marquee currency pairs
const currencyPairs = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 
  'USD/CAD', 'USD/CHF', 'NZD/USD', 'EUR/GBP',
  'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'EUR/AUD'
];

// Mock chart data
const chartHeights = ref([45, 52, 48, 65, 72, 68, 58, 63, 70, 75, 68, 62, 55, 60, 65]);

// Random percentage generator for marquee
const randomPercentage = () => {
  const change = (Math.random() - 0.5) * 2; // -1 to 1
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};
</script>

<style>
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee 30s linear infinite;
  display: flex;
  width: max-content;
}

.animate-pulse-slow {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Ensure the marquee content loops properly */
.animate-marquee > div {
  display: flex;
  flex-shrink: 0;
}

</style>