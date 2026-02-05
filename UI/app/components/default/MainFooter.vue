<template>
  <UFooter class="border-t dark:border-gray-800/50 light:border-gray-200/80">
    <template #left>
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-cpu" class="w-4 h-4 text-emerald-500" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Forex Intelligence Lab
          </span>
          <UBadge size="xs" variant="subtle" class="ml-2">
            v2.1
          </UBadge>
        </div>
        
        <div class="hidden sm:block h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
        
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Built by 
          <UButton to="https://www.tera-in.top" target="_blank" variant="link" 
            class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-1">
            tera-in.top
          </UButton>
          • © {{ new Date().getFullYear() }}
        </p>
      </div>
    </template>

    <template #right>
      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-1">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>AI Active</span>
          </div>
          <span class="text-gray-300 dark:text-gray-600">•</span>
          <span>Personal Research</span>
        </div>
        
        <div class="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
        
        <UButton to="https://github.com/NicholasTechmoverai/Forex-analysis-ml" target="_blank"
          icon="i-simple-icons-github" aria-label="GitHub" color="gray" variant="ghost"
          class="hover:bg-gray-100 dark:hover:bg-gray-800"
          :ui="{ rounded: 'rounded-full', padding: { xl: 'p-2' } }">
          <span class="sr-only">GitHub Repository</span>
          <span class="hidden sm:inline ml-2 text-sm">Source Code</span>
        </UButton>
        
        <UButton to="/docs" variant="ghost" color="gray" size="sm"
          class="hidden sm:flex hover:bg-gray-100 dark:hover:bg-gray-800">
          <UIcon name="i-lucide-book-open" class="w-4 h-4 mr-1" />
          Docs
        </UButton>
      </div>
    </template>
  </UFooter>
</template>