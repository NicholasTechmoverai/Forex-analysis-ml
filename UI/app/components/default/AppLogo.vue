<template>
  <NuxtLink to="/" class="inline-flex items-center">
    <img
      src="/logo.png"
      alt="Logo"
      class="pointer-events-none select-none"
      :style="{ height: `${size * 25}px` }"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  size?: number
}>()
</script>
