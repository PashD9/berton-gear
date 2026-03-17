<script setup>
    import { ref, computed, onMounted, watch } from 'vue'
    import { useProductStore } from '@/stores/productStore'
    import { useRouter } from 'vue-router'

    const emit = defineEmits(['close'])
    const router = useRouter()
    const prodStore = useProductStore()
    
    const searchQuery = ref('')
    const isSearching = ref(false)
    const recentSearches = ref([])

    onMounted(() => {
        // Ensure we have products to search
        if (prodStore.products.length === 0) prodStore.fetchAllItems()
        
        // Load recent searches
        const stored = localStorage.getItem('recent_product_searches')
        if (stored) {
            recentSearches.value = JSON.parse(stored)
        }
    })

    watch(searchQuery, () => {
        if (searchQuery.value.length > 0) {
            isSearching.value = true
            setTimeout(() => isSearching.value = false, 300)
        }
    })

    const allItems = computed(() => {
        const items = [...prodStore.products, ...prodStore.models, ...prodStore.variants]
        const seen = new Set()
        return items.filter(item => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
    })

    const filteredProducts = computed(() => {
        const q = searchQuery.value.toLowerCase().trim()
        if (!q) return []
        
        return allItems.value.filter(item => {
            // Only show published items
            if (!item.isPublished) return false
            
            return (
                item.name?.toLowerCase().includes(q) || 
                item.product_code?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q) ||
                item.keywords?.some(k => k.toLowerCase().includes(q))
            )
        }).slice(0, 10) // Limit results for performance
    })

    const popularProducts = computed(() => {
        // Show first 5 published items as popular for now
        return allItems.value.filter(item => item.isPublished).slice(0, 5)
    })

    const handleSelect = (item) => {
        saveRecentSearch(searchQuery.value)
        router.push(`/products/${item.slug}`)
        emit('close')
    }
    
    const saveRecentSearch = (term) => {
        if (!term) return
        // Remove duplicates and keep top 5
        const existing = recentSearches.value.filter(s => s !== term)
        const updated = [term, ...existing].slice(0, 5)
        recentSearches.value = updated
        localStorage.setItem('recent_product_searches', JSON.stringify(updated))
    }

    const clearRecent = () => {
        recentSearches.value = []
        localStorage.removeItem('recent_product_searches')
    }
    
    const applyRecent = (term) => {
        searchQuery.value = term
    }

    const highlight = (text) => {
        if (!searchQuery.value || !text) {
            return text
        }
        const q = searchQuery.value.trim()
        const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escapedQuery})`, 'gi')
        return text.replace(regex, '<span class="bg-yellow-200 rounded-sm">$1</span>')
    }
</script>

<template>
    <div>
        <div class="sticky -top-6 -mt-6 py-2 mb-6 bg-white z-20">
            <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-2.5 transition-colors"
                      :class="isSearching ? 'text-blue-500 animate-spin' : 'text-gray-400'">
                  {{ isSearching ? 'progress_activity' : 'search' }}
                </span>
                <input 
                    v-model="searchQuery"
                    type="text" 
                    id="prod-search"
                    name="prod-search"
                    placeholder="Search products..." 
                class="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    autofocus
                >
            <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
            </div>
        </div>
        
        <div class="space-y-6">
        <!-- Recent Searches -->
        <div v-if="!searchQuery && recentSearches.length > 0" class="fade-in-item">
            <div class="flex justify-between items-center mb-3">
                <h4 class="text-xs uppercase text-gray-400 font-bold">Recent Searches</h4>
                <button @click="clearRecent" class="text-xs text-blue-600 hover:underline">Clear</button>
            </div>
            <div class="flex flex-wrap gap-2">
                <button 
                    v-for="term in recentSearches" 
                    :key="term"
                    @click="applyRecent(term)"
                    class="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                    <span class="material-symbols-outlined text-[16px]">history</span>
                    {{ term }}
                </button>
            </div>
        </div>

        <!-- Popular Products -->
        <div v-if="!searchQuery && popularProducts.length > 0" class="fade-in-item" :class="{ 'mt-6': recentSearches.length > 0 }">
            <h4 class="text-xs uppercase text-gray-400 font-bold mb-3">Popular Products</h4>
            <div class="space-y-1">
                <div 
                    v-for="product in popularProducts" 
                    :key="product.id"
                    @click="handleSelect(product)"
                    class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
                >
                    <div class="w-10 h-10 bg-white border border-gray-100 rounded-md flex items-center justify-center shrink-0">
                        <img v-if="product.imageURL" :src="product.imageURL" class="w-8 h-8 object-contain" />
                        <span v-else class="material-symbols-outlined text-gray-300">image</span>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{{ product.name }}</h4>
                        <p class="text-xs text-gray-500 line-clamp-1">{{ product.description || product.product_code }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Search Results -->
        <div v-if="searchQuery" class="space-y-2">
            <div v-if="filteredProducts.length > 0" class="space-y-1">
                <div 
                    v-for="(product, index) in filteredProducts" 
                    :key="product.id"
                    @click="handleSelect(product)"
                    class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors fade-in-item"
                    :style="{ animationDelay: `${index * 50}ms` }"
                >
                    <div class="w-10 h-10 bg-white border border-gray-100 rounded-md flex items-center justify-center shrink-0">
                        <img v-if="product.imageURL" :src="product.imageURL" class="w-8 h-8 object-contain" />
                        <span v-else class="material-symbols-outlined text-gray-300">image</span>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors" v-html="highlight(product.name)"></h4>
                        <p class="text-xs text-gray-500 line-clamp-1" v-html="highlight(product.description || product.product_code)"></p>
                    </div>
                </div>
            </div>

            <div v-else class="text-center py-10 fade-in-item">
                <div class="bg-gray-50 p-4 rounded-full mb-4 inline-block">
                    <span class="material-symbols-outlined text-[40px] text-gray-300">search_off</span>
                </div>
                <h3 class="text-lg font-bold text-gray-900">No products found</h3>
                <p class="text-gray-500 text-sm mt-1">We couldn't find any matches for "{{ searchQuery }}".</p>
            </div>
        </div>
        </div>
    </div>
</template>