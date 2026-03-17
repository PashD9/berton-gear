<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMessageStore } from '@/stores/messageStore'
import { useBreadcrumbStore } from '@/stores/breadcrumb'

const messageStore = useMessageStore()
const breadcrumb = useBreadcrumbStore()

const selectedMessage = ref(null)

onMounted(() => {
  breadcrumb.set([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Messages' },
  ])
  messageStore.subscribeToMessages()
})

onUnmounted(() => {
  breadcrumb.clear()
  messageStore.stopMessagesListener()
  selectedMessage.value = null // Clear selection on leave
})

const selectMessage = (message) => {
  selectedMessage.value = message
  if (message.status === 'unread') {
    messageStore.updateMessageStatus(message.id, 'read')
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'No date'
  // Firebase timestamp has toDate() method
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleString()
  }
  // Fallback for other date formats
  return new Date(timestamp).toLocaleString()
}

const handleDelete = async (messageId) => {
  if (
    confirm(
      'Are you sure you want to delete this message? This cannot be undone.',
    )
  ) {
    await messageStore.deleteMessage(messageId)
    if (selectedMessage.value && selectedMessage.value.id === messageId) {
      selectedMessage.value = null
    }
  }
}
</script>

<template>
  <div class="flex h-screen bg-slate-100 font-sans">
    <!-- Message List -->
    <div
      class="w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 bg-white flex flex-col"
    >
      <div class="p-4 border-b border-slate-200">
        <h2 class="text-xl font-bold text-slate-800">Inbox</h2>
        <p class="text-sm text-slate-500">
          {{ messageStore.unreadCount }} unread messages
        </p>
      </div>
      <div class="overflow-y-auto grow">
        <div
          v-if="messageStore.loading && !messageStore.messages.length"
          class="p-6 text-center text-slate-500"
        >
          Loading messages...
        </div>
        <div
          v-else-if="!messageStore.messages.length"
          class="p-6 text-center text-slate-500"
        >
          No messages yet.
        </div>
        <ul v-else>
          <li
            v-for="message in messageStore.messages"
            :key="message.id"
            @click="selectMessage(message)"
            class="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors duration-150"
            :class="{
              'bg-sky-50': selectedMessage && selectedMessage.id === message.id,
            }"
          >
            <div class="flex justify-between items-center">
              <p
                class="font-semibold text-slate-900"
                :class="{ 'font-extrabold': message.status === 'unread' }"
              >
                {{ message.name }}
              </p>
              <span
                v-if="message.status === 'unread'"
                class="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0"
                title="Unread"
              ></span>
            </div>
            <p class="text-sm text-slate-600 truncate">{{ message.email }}</p>
            <p class="text-xs text-slate-400 mt-1">
              {{ formatDate(message.createdAt) }}
            </p>
          </li>
        </ul>
      </div>
    </div>

    <!-- Message Viewer -->
    <div class="hidden md:flex w-2/3 lg:w-3/4 flex-col">
      <div v-if="selectedMessage" class="grow flex flex-col bg-slate-50">
        <!-- Header -->
        <div
          class="p-4 border-b border-slate-200 bg-white flex justify-between items-center flex-wrap gap-2"
        >
          <div>
            <h3 class="text-lg font-bold text-slate-800">
              {{ selectedMessage.name }}
            </h3>
            <p class="text-sm text-slate-500">
              From:
              <a
                :href="`mailto:${selectedMessage.email}`"
                class="text-blue-600 hover:underline"
                >{{ selectedMessage.email }}</a
              >
            </p>
            <p v-if="selectedMessage.company" class="text-sm text-slate-500">
              Company: {{ selectedMessage.company }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="
                messageStore.updateMessageStatus(
                  selectedMessage.id,
                  selectedMessage.status === 'read' ? 'unread' : 'read',
                )
              "
              class="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
              :title="
                selectedMessage.status === 'read'
                  ? 'Mark as unread'
                  : 'Mark as read'
              "
            >
              <span class="material-symbols-outlined">{{
                selectedMessage.status === 'read' ? 'drafts' : 'mail'
              }}</span>
            </button>
            <button
              @click="handleDelete(selectedMessage.id)"
              class="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
              title="Delete Message"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>

        <!-- Message Body -->
        <div class="p-6 overflow-y-auto grow">
          <div
            class="bg-white p-6 rounded-lg shadow-sm border border-slate-200"
          >
            <!-- Assumes @tailwindcss/typography plugin is used for styling v-html content -->
            <div
              class="prose max-w-none"
              v-html="selectedMessage.message"
            ></div>
          </div>
        </div>
      </div>
      <div
        v-else
        class="flex items-center justify-center h-full text-slate-500 bg-slate-50"
      >
        <div class="text-center">
          <span class="material-symbols-outlined text-6xl text-slate-300"
            >inbox</span
          >
          <p class="mt-2 text-lg">Select a message to read</p>
          <p class="text-sm">
            You have {{ messageStore.unreadCount }} unread messages.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Using a global style tag to style the content from v-html, which is not affected by scoped styles.
   The .prose class from Tailwind's typography plugin is recommended for this. */

.prose h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-4);
}
.prose p {
  margin-bottom: var(--spacing-4);
}
</style>
