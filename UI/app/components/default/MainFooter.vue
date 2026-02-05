<template>
  <UFooter class="border-t dark:border-gray-800/50 light:border-gray-200/80">
    <template #left>
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div class="flex items-center gap-3">
          <AppLogo :size="3" class="text-emerald-500 dark:text-emerald-400 light:text-emerald-600" />
          <div>
            <span class="text-sm font-bold text-gray-800 dark:text-gray-200 light:text-gray-900">
              {{ site.name }}
            </span>
            <div class="flex items-center gap-2 mt-1">
              <UBadge size="xs" variant="subtle" 
                class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                v2.1
              </UBadge>
              <div class="flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="text-xs text-gray-500 dark:text-gray-400">AI Active</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="hidden sm:block h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
        
        <div class="flex flex-col gap-1">
          <p class="text-sm text-gray-600 dark:text-gray-400 light:text-gray-700">
            Built by 
            <UButton to="https://www.tera-in.top" target="_blank" variant="link" 
              class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-1">
              tera-in.top
            </UButton>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-500">
            © {{ new Date().getFullYear() }} • {{ site.description }}
          </p>
        </div>
      </div>
    </template>

    <template #right>
      <div class="flex items-center gap-4">
        <div class="hidden md:flex items-center gap-4">
          <nav class="flex items-center gap-4">
            <UButton 
              v-for="link in navigation" 
              :key="link.to"
              :to="link.to" 
              variant="ghost" 
              color="gray" 
              size="sm"
              class="hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">
              {{ link.label }}
            </UButton>
          </nav>
          
          <div class="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
          
          <div class="flex items-center gap-2">
            <UButton 
              v-for="social in social" 
              :key="social.to"
              :to="social.to" 
              :target="social.target" 
              :icon="social.icon" 
              :aria-label="social.label" 
              color="gray" 
              variant="ghost"
              class="hover:bg-gray-100 dark:hover:bg-gray-800"
              :ui="{ rounded: 'rounded-full', padding: { xl: 'p-2' } }">
              <span class="sr-only">{{ social.label }}</span>
            </UButton>
          </div>
        </div>
        
        <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 md:hidden"></div>
        
        <UButton 
          :to="site.projectUrl" 
          target="_blank"
          icon="i-simple-icons-github" 
          aria-label="GitHub Repository" 
          color="gray" 
          variant="ghost"
          class="hover:bg-gray-100 dark:hover:bg-gray-800"
          :ui="{ rounded: 'rounded-full', padding: { xl: 'p-2' } }">
          <span class="sr-only">GitHub Repository</span>
          <span class="hidden sm:inline ml-2 text-sm">Source</span>
        </UButton>
      </div>
    </template>
  </UFooter>
</template>

<script setup>
const appConfig = useAppConfig();

// Use data from app config
const site = appConfig.site;
const navigation = appConfig.links?.navigation || [];
const social = appConfig.social || [];
</script>