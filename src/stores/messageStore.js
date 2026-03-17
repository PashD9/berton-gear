import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore'
import { useUtilityStore } from './utilityStore'
import { useAuthStore } from './authStore'
import { useSettingsStore } from './settingsStore'

export const useMessageStore = defineStore('message', () => {
  const utils = useUtilityStore()
  const authStore = useAuthStore()
  const settingsStore = useSettingsStore()
  const loading = ref(false)
  const messages = ref([])
  let unsubscribe = null

  const sendMessage = async (messageData) => {
    utils.beginLoading()
    try {
      const data = {
        ...messageData,
        status: 'unread',
        createdAt: serverTimestamp(),
      }
      await addDoc(collection(db, 'messages'), data)

      // Placeholder for email integration.
      // This will be replaced by writing to a 'mail' collection when the Trigger Email extension is configured.
      console.log(
        `[Email Service Placeholder] New message from ${messageData.name}`,
      )

      utils.triggerToast('Your message has been sent!', 'success')
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      utils.triggerToast('Failed to send message. Please try again.', 'error')
      return false
    } finally {
      utils.endLoading()
    }
  }

  const subscribeToMessages = () => {
    if (unsubscribe || !authStore.isAdmin) return
    loading.value = true
    utils.beginLoading()

    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'))

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        messages.value = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        loading.value = false
        utils.endLoading()
      },
      (error) => {
        console.error('Error fetching messages:', error)
        utils.triggerToast('Failed to fetch messages', 'error')
        loading.value = false
        utils.endLoading()
      },
    )
  }

  const stopMessagesListener = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  const updateMessageStatus = async (messageId, status) => {
    if (!authStore.isAdmin) return
    utils.beginLoading()
    try {
      const messageRef = doc(db, 'messages', messageId)
      await updateDoc(messageRef, { status })
      utils.triggerToast('Message status updated', 'success')
    } catch (error) {
      console.error('Error updating message status:', error)
      utils.triggerToast('Failed to update status', 'error')
    } finally {
      utils.endLoading()
    }
  }

  const deleteMessage = async (messageId) => {
    if (!authStore.isAdmin) return
    utils.beginLoading()
    try {
      await deleteDoc(doc(db, 'messages', messageId))
      utils.triggerToast('Message deleted', 'success')
    } catch (error) {
      console.error('Error deleting message:', error)
      utils.triggerToast('Failed to delete message', 'error')
    } finally {
      utils.endLoading()
    }
  }

  const unreadCount = computed(
    () => messages.value.filter((m) => m.status === 'unread').length,
  )

  return {
    loading,
    messages,
    sendMessage,
    subscribeToMessages,
    stopMessagesListener,
    updateMessageStatus,
    deleteMessage,
    unreadCount,
  }
})
