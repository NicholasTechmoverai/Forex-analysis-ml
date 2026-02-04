<script setup lang="ts">
const items = [
   {
    label: 'Live Trades',
    icon: 'i-heroicons-bars-3-center-left',
    slot: 'list',
    description: 'Real-time trade data with detailed metrics'
  },
  {
    label: 'Advanced Chart',
    icon: 'i-heroicons-chart-bar',
    slot: 'chart',
    description: 'Interactive trading charts with multiple visualization options'
  },
 
]

const activeTab = ref(0)
</script>

<template>
  <section class="max-w-7xl m-auto">
    <UTabs :items="items">
  

    <template #list>
      <div>
      <ListTrades />

      </div>
    </template>
      <template #chart>
      <div>
      <TradeChart />
    </div>
    </template>
  </UTabs>
    
  </section>
</template>