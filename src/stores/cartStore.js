import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useCartStore = defineStore('cart', () => {
    // Initialize from localStorage if available
    const storedItems = localStorage.getItem('cart_items')
    const items = ref(storedItems ? JSON.parse(storedItems) : [])
    
    const isOpen = ref(false)
    const isAnimating = ref(false)

    // Persist cart items whenever they change
    watch(items, (newItems) => {
        localStorage.setItem('cart_items', JSON.stringify(newItems))
    }, { deep: true })

    const toggleCart = () => isOpen.value = !isOpen.value
    const openCart = () => isOpen.value = true
    const closeCart = () => isOpen.value = false

    const addItem = (product) => {
        // Check if item already exists
        const existing = items.value.find(i => i.id === product.id)
        if (existing) {
            existing.quantity++
        } else {
            items.value.push({ ...product, quantity: 1 })
        }
        
        // Trigger animation
        isAnimating.value = true
        setTimeout(() => {
            isAnimating.value = false
        }, 300)
    }

    const removeItem = (id) => {
        const index = items.value.findIndex(i => i.id === id)
        if (index > -1) items.value.splice(index, 1)
    }

    const updateQuantity = (id, delta) => {
        const item = items.value.find(i => i.id === id)
        if (item) {
            item.quantity += delta
            if (item.quantity <= 0) removeItem(id)
        }
    }
    
    const clearCart = () => {
        items.value = []
    }

    const cartTotal = computed(() => {
        return items.value.reduce((total, item) => total + (item.price || 0) * item.quantity, 0)
    })

    const quoteItems = computed(() => items.value.filter(i => !i.price))
    const buyItems = computed(() => items.value.filter(i => i.price))

    return { items, isOpen, isAnimating, toggleCart, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart, cartTotal, quoteItems, buyItems }
})