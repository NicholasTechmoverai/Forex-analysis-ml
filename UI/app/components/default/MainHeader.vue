<script setup lang="ts">

</script>

<template>
        <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo :size="2"/>
        </NuxtLink>

        <TemplateMenu />
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          to="https://github.com/NicholasTechmoverai/Forex-analysis-ml"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>
</template>