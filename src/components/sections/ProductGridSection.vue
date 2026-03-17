<script setup>
    import { computed } from 'vue'
    import { useProductStore } from '@/stores/productStore'
    import { useUtilityStore } from '@/stores/utilityStore'
    import { useCategoryStore } from '@/stores/categoryStore'

    const props = defineProps({
        data: {
            type: Object,
            default: () => ({
                title: '',
                showTitle: true,
                collectionId: '',
                limit: 4
            })
        },
        styling: {
            type: Object,
            default: () => ({})
        }
    })

    const prodStore = useProductStore()
    const utils = useUtilityStore()
    const catStore = useCategoryStore()

    const displayProducts = computed(() => {
        let products = prodStore.products || []
        const targetId = props.data.collectionId || catStore.categories[0]?.id
        
        if (targetId) {
            products = products.filter(p => p.parentId === targetId)
        }
        
        const limit = parseInt(props.data.limit) || 4
        return products.slice(0, limit)
    })
</script>

<template>
    <section :class="[styling.backgroundColor || 'bg-white', styling.padding || 'py-16']">
        <div class="container mx-auto px-4">
            <!-- Header -->
            <h2 v-if="data.showTitle && data.title" class="text-center text-2xl font-medium tracking-normal text-slate-800 mb-10">
                {{ data.title }}
            </h2>

            <!-- Grid -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div 
                    v-for="product in displayProducts" 
                    :key="product.id" 
                    class="bg-white border border-slate-100 rounded-lg overflow-hidden hover:shadow-lg transition-all group flex flex-col"
                >
                    <!-- Image -->
                    <div class="aspect-video bg-slate-100 relative overflow-hidden">
                        <img 
                            v-if="product.imageURL" 
                            :src="product.imageURL" 
                            :alt="product.name" 
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                            <span class="material-symbols-outlined text-4xl">image</span>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-4 flex flex-col grow">
                        <h3 class="text-sm font-medium text-slate-800 tracking-normal mb-1 line-clamp-2">
                            {{ product.name }}
                        </h3>
                        <p class="text-xs font-bold text-blue-600 mb-3">
                            {{ utils.formatCurrency(product.price) }}
                        </p>
                        
                        <div class="mt-auto">
                            <button class="w-full py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-sm hover:bg-slate-800 transition-colors">
                                View Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-if="displayProducts.length === 0" class="text-center text-slate-400 text-sm py-10 border-2 border-dashed border-slate-100 rounded-lg">
                No products found in this collection.
            </div>
        </div>
    </section>
</template>