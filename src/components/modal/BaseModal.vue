<script setup>
import { onUnmounted, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  title: String,
  loading: Boolean,
  resultMessage: String,
  isError: Boolean,
  // when true the footer cancel button is omitted
  noCancel: { type: Boolean, default: false },
})

defineEmits(['close'])

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      document.body.style.overflow = 'hidden' // Locks the background
    } else {
      document.body.style.overflow = ''
    }
  },
  { immediate: true },
)

// Ensure body is unlocked if component is destroyed while modal is open
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>
<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="props.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm overflow-hidden p-4"
    >
      <Transition
        enter-active-class="transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        enter-from-class="opacity-0 scale-95 translate-y-4"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-4"
      >
        <div
          v-if="props.show"
          class="bg-white rounded-lg w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          <div
            v-if="props.loading"
            class="flex flex-col items-center justify-center h-64 space-y-4"
          >
            <div
              class="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"
            ></div>
            <p
              class="text-sm font-bold text-slate-500 uppercase tracking-widest"
            >
              Saving...
            </p>
          </div>

          <div
            v-else-if="props.resultMessage"
            class="flex flex-col items-center justify-center h-64 p-8 text-center space-y-4"
          >
            <div
              :class="props.isError ? 'text-red-500' : 'text-green-500'"
              class="p-4 bg-slate-50 rounded-full"
            >
              <svg
                v-if="!props.isError"
                class="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <svg
                v-else
                class="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-slate-800">
              {{ props.resultMessage }}
            </h3>
            <button
              @click="$emit('close')"
              class="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-sm hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>

          <div v-else class="flex flex-col h-full overflow-hidden">
            <div
              class="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0"
            >
              <h3 class="text-lg font-bold text-slate-800">
                {{ props.title }}
              </h3>
              <button
                @click="$emit('close')"
                class="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div class="p-6 overflow-y-auto custom-scrollbar">
              <slot name="content"></slot>
            </div>

            <div
              class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0"
            >
              <button
                v-if="!props.noCancel"
                @click="$emit('close')"
                class="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <slot name="actions"></slot>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
