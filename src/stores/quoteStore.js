import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuoteStore = defineStore('quote', () => {
    const items = ref([])
    const isOpen = ref(false)

    const itemCount = computed(() => items.value.reduce((total, item) => total + (item.quantity || 1), 0))

    function openQuote() {
        isOpen.value = true
    }

    function closeQuote() {
        isOpen.value = false
    }

    function addToQuote(product) {
        const existingItem = items.value.find(item => item.id === product.id)

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1
        } else {
            // Store a copy of the product to avoid direct reference issues
            items.value.push({
                ...product,
                quantity: 1,
                addedAt: new Date()
            })
        }
    }

    function removeFromQuote(productId) {
        const index = items.value.findIndex(item => item.id === productId)
        if (index > -1) {
            items.value.splice(index, 1)
        }
    }

    function clearQuote() {
        items.value = []
    }

    return {
        items,
        isOpen,
        itemCount,
        openQuote,
        closeQuote,
        addToQuote,
        removeFromQuote,
        clearQuote
    }
})
