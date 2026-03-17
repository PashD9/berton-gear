<script setup>
    import { computed } from 'vue'
    import { Splide, SplideSlide } from '@splidejs/vue-splide'
    import '@splidejs/splide/css/core'
    import { useCategoryStore } from '@/stores/categoryStore'

    const props = defineProps({
        parentId: { type: String, default: '' },
        limit: { type: Number, default: 8 }
    })

    const catStore = useCategoryStore()

    const items = computed(() => {
        let cats = catStore.categories || []
        // If parentId is provided, filter by it. If empty, show all (or root categories if you prefer)
        if (props.parentId) {
            cats = cats.filter(c => c.parentId === props.parentId)
        }
        return cats.slice(0, props.limit)
    })

    const options = {
        type: 'slide',
        perPage: 5,
        gap: '1rem',
        pagination: false,
        arrows: true,
        breakpoints: {
            1024: { perPage: 4 },
            768: { perPage: 3 },
            640: { perPage: 2 }
        }
    }
</script>

<template>
    <div v-if="items.length">
        <Splide :options="options">
            <SplideSlide v-for="cat in items" :key="cat.id">
                <router-link :to="`/categories/${cat.slug}`" class="block group text-center">
                    <div class="aspect-square bg-slate-100 rounded-full overflow-hidden mb-3 border border-slate-100 group-hover:border-blue-200 transition-all relative">
                        <img v-if="cat.imageURL" :src="cat.imageURL" :alt="cat.name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                            <span class="material-symbols-outlined text-3xl">category</span>
                        </div>
                    </div>
                    <h3 class="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{{ cat.name }}</h3>
                </router-link>
            </SplideSlide>
        </Splide>
    </div>
    <div v-else class="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">No categories found.</div>
</template>