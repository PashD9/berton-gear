<script setup>
    import CategoryCard from '@/components/cards/CategoryCard.vue'
    import { useCategoryStore } from '@/stores/categoryStore'
    import { useProductStore } from '@/stores/productStore'
    import { onMounted, reactive } from 'vue'

    const catStore = useCategoryStore()
    const prodStore = useProductStore()
    
    onMounted(() => {
        catStore.fetchCategories()
        prodStore.fetchPublishedProducts()
    })

    const options = reactive({
        type: 'loop',
        gap: '1rem',
        perPage: 3,
        perMove: 1,
        arrow: true,
        pagination: false,
        breakpoints: {
             1280: {
                perPage: 4,
                gap    : '.7rem',
            },
            1024: {
                perPage: 3,
                gap    : '.7rem',
            },
            767: {
                perPage: 2,
                gap    : '.7rem',
            },
            480: {
                perPage: 1,
                gap    : '.7rem',
            },
        }
    })

</script>

<template>
    <section class="bg-[#EBF2F4] py-10">
        <div v-if="catStore.loading" class="container flex flex-col gap-4 animate-pulse">
            <div class="h-8 w-48 bg-gray-200 rounded"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div v-for="i in 4" :key="i" class="aspect-4/3 bg-gray-200 rounded-xl"></div>
            </div>
        </div>
        <div v-else class="container flex flex-col gap-4">
            <h3 id="categories-carousel-heading">Explore categories</h3>
            <Splide :options="options" class="product-splide" aria-labelledby="categories-carousel-heading">
                <SplideSlide v-for="category in catStore.parentCategories" :key="category.id">
                   <RouterLink :to="`/categories/${category.slug}`"> 
                        <CategoryCard
                            :category="category" 
                            :isAdmin="false"
                        />
                    </RouterLink>
                </SplideSlide>
            </Splide>
        </div>
    </section>
</template>