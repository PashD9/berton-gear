<script setup>
import { watch, onUnmounted } from 'vue'

const props = defineProps({
  isVisible: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const closeModal = () => emit('close')

const lockScroll = () => {
  const scrollY = window.scrollY
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.width = '100vw'
  document.body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }
}

const unlockScroll = () => {
  const scrollY = document.body.style.top
  const isFixed = document.body.style.position === 'fixed'

  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.width = ''
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''

  if (isFixed) {
    window.scrollTo({
      top: parseInt(scrollY || '0') * -1,
      behavior: 'instant'
    })
  }
}

watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    lockScroll()
  } else {
    unlockScroll()
  }
}, { immediate: true })

// Ensure body is unlocked if component is destroyed while modal is open
onUnmounted(() => {
  if (props.isVisible) unlockScroll()
})
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="isVisible" class="modal-overlay" @click.self="closeModal"></div>
    </transition>
    
    <transition name="pop">
      <div v-if="isVisible" class="modal-wrapper" @click.self="closeModal">
        <div class="modal-container">
          <header class="modal-header">
            <slot name="header"><h3>Categories</h3></slot>
            <button class="modal-close-button" @click="closeModal">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>

          <section class="modal-body custom-scrollbar">
            <slot></slot>
          </section>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 1000;
}

.modal-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Aligns modal to top with some padding */
  padding: 40px 20px;
  z-index: 1010;
}

.modal-container {
  background: white;
  border-radius: 8px; /* Slightly rounder for a modern look */
  display: flex;
  flex-direction: column;
  max-width: 800px;
  width: 100%;
  max-height: 90vh; /* Limits height to screen size */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-body {
  padding: 1.5rem;
  /* padding-right: 4px; */
  overflow-y: auto; /* Enables scrolling inside the modal */
  min-height: 400px; 
  transition: all 0.3s ease;
}

.modal-close-button {
  background: none; border: none; cursor: pointer; color: #6b7280;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.pop-enter-active, .pop-leave-active { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.95); }
</style>