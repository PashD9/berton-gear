<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isOpen = ref(false)
const dropdownRef = ref(null)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
};

const closeMenu = () => {
  isOpen.value = false
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <div @click="toggleMenu" class="cursor-pointer transition-colors duration-200" :class="isOpen ? 'text-blue-600' : 'text-slate-700 hover:text-slate-500'">
      <slot name="trigger">
        <button>Toggle Dropdown</button>
      </slot>
    </div>
    
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-2"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-2"
    >
    <div 
      v-if="isOpen" 
      class="
        w-full md:w-72
        static md:absolute md:right-0 md:top-full md:mt-6
        bg-slate-50 md:bg-white 
        md:rounded-xl md:shadow-xl md:border md:border-slate-100 
        z-50 overflow-hidden origin-top-right
      "
    >
      <slot name="content" :close="closeMenu"></slot>
    </div>
    </Transition>
  </div>
</template>
