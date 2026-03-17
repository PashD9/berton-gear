import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { useUtilityStore } from './utilityStore'
import { useCartStore } from './cartStore'
import { useSettingsStore } from './settingsStore'

export const useOrderStore = defineStore('order', () => {
  const utils = useUtilityStore()
  const cart = useCartStore()
  const loading = ref(false)
  const orders = ref([])

  const createOrder = async (contactData, type) => {
    loading.value = true
    try {
      const orderItems = type === 'quote' ? cart.quoteItems : cart.buyItems
      const orderTotal = type === 'quote' ? 0 : cart.cartTotal

      const orderData = {
        contact: { ...contactData },
        items: orderItems.map((item) => ({
          id: item.id,
          name: item.name,
          product_code: item.product_code || '',
          quantity: item.quantity,
          price: item.price || 0,
          imageURL: item.imageURL || null,
        })),
        type,
        status: 'pending',
        total: orderTotal,
        createdAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'orders'), orderData)

      // Send Email Notification
      await sendOrderEmail(contactData, type, docRef.id)

      // Clear processed items from cart
      if (type === 'quote') {
        cart.items = cart.items.filter((item) => item.price && item.price > 0)
      } else {
        cart.items = cart.items.filter(
          (item) => !item.price || item.price === 0,
        )
      }

      utils.triggerToast(
        type === 'quote'
          ? 'Quote request sent successfully!'
          : 'Order placed successfully!',
        'success',
      )
      return true
    } catch (error) {
      console.error('Checkout Error:', error)
      utils.triggerToast(
        'Failed to process request. Please try again.',
        'error',
      )
      return false
    } finally {
      loading.value = false
    }
  }

  const sendOrderEmail = async (contact, type, orderId) => {
    // Placeholder for email integration.
    // This will be replaced by writing to a 'mail' collection when the Trigger Email extension is configured.
    console.log(
      `[Email Service Placeholder] Sending ${type} confirmation to ${contact.email} for Order #${orderId}`,
    )
  }

  const fetchOrders = async () => {
    loading.value = true
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      orders.value = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.error('Error fetching orders:', error)
      utils.triggerToast('Failed to fetch orders', 'error')
    } finally {
      loading.value = false
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    loading.value = true
    try {
      const orderRef = doc(db, 'orders', orderId)
      await updateDoc(orderRef, { status })

      // Update local state
      const order = orders.value.find((o) => o.id === orderId)
      if (order) order.status = status

      utils.triggerToast('Order status updated', 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      utils.triggerToast('Failed to update status', 'error')
    } finally {
      loading.value = false
    }
  }

  const deleteOrder = async (orderId) => {
    loading.value = true
    try {
      await deleteDoc(doc(db, 'orders', orderId))
      orders.value = orders.value.filter((o) => o.id !== orderId)
      utils.triggerToast('Order deleted', 'success')
    } catch (error) {
      console.error('Error deleting order:', error)
      utils.triggerToast('Failed to delete order', 'error')
    } finally {
      loading.value = false
    }
  }

  const pendingCount = computed(
    () => orders.value.filter((o) => o.status === 'pending').length,
  )

  return {
    loading,
    orders,
    createOrder,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
    sendOrderEmail,
    pendingCount,
  }
})
