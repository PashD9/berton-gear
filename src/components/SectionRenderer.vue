<script setup>
    import { computed, onMounted } from 'vue'
    import { useCategoryStore } from '@/stores/categoryStore'
    // Import Section Components
    import HeroBanner from '@/components/sections/HeroBanner.vue'
    import ProductGridSection from '@/components/sections/ProductGridSection.vue'
    import ServicesSection from '@/components/sections/ServicesSection.vue'
    import AboutUs from '@/components/sections/AboutUs.vue'
    import FooterSection from '@/components/sections/FooterSection.vue'
    import CMSProductCarousel from '@/components/sections/CMSProductCarousel.vue'
    import CMSCategoriesCarousel from '@/components/sections/CMSCategoriesCarousel.vue'
    import CMSProductFeatures from '@/components/sections/CMSProductFeatures.vue'
    import CMSFeaturedProducts from '@/components/sections/CMSFeaturedProducts.vue'
    import CMSFeaturedCategory from '@/components/sections/CMSFeaturedCategory.vue'
    import CMSFeaturedProduct from '@/components/sections/CMSFeaturedProduct.vue'
    import ContactFormSection from '@/components/sections/ContactFormSection.vue'

    const props = defineProps({
        section: {
            type: Object,
            required: true
        },
        isPreview: {
            type: Boolean,
            default: false
        }
    })

    const catStore = useCategoryStore()

    onMounted(() => {
        catStore.fetchCategories()
    })

    // Map DB component names to actual Vue components
    const componentMap = {
        'HeroBanner': HeroBanner,
        'ProductGrid': ProductGridSection, // Maps 'ProductGrid' to ProductGridSection.vue
        'ProductGridSection': ProductGridSection, // Fallback
        'ServicesSection': ServicesSection,
        'AboutUs': AboutUs,
        'FooterSection': FooterSection,
        'CMSProductCarousel': CMSProductCarousel,
        'CMSCategoriesCarousel': CMSCategoriesCarousel,
        'CMSProductFeatures': CMSProductFeatures,
        'CMSFeaturedProducts': CMSFeaturedProducts,
        'CMSFeaturedCategory': CMSFeaturedCategory,
        'CMSFeaturedProduct': CMSFeaturedProduct,
        'ContactFormSection': ContactFormSection
    }

    const shouldRender = computed(() => props.section.isActive || props.isPreview)

    const processedData = computed(() => {
        const content = props.section.content || {}
        return {
            ...content,
            limit: content.limit || 4,
            // Allow empty string (for "All Categories") but default null/undefined to first category
            collectionId: (content.collectionId !== undefined && content.collectionId !== null) 
                ? content.collectionId 
                : catStore.categories[0]?.id
        }
    })
</script>

<template>
    <div v-if="shouldRender">
        <component :is="componentMap[section.component] || section.component" v-bind="processedData" :data="processedData" />
    </div>
</template>