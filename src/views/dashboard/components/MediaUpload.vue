<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }, // The Cloudinary URL
  id: { type: String, required: true },
  name: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue', 'file-selected'])

const localPreview = ref(props.modelValue)

// Watch for external changes (like when switching between edit/create)
watch(
  () => props.modelValue,
  (newVal) => {
    localPreview.value = newVal
  },
)

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return

  localPreview.value = URL.createObjectURL(file)
  // Pass the actual file up to the Modal so it can handle the upload on 'Submit'
  emit('file-selected', file)
}

const resetSelection = () => {
  localPreview.value = props.modelValue // Revert to original DB value
  emit('file-selected', null) // Tell parent to clear the pending file
}
</script>

<template>
  <div
    class="relative w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg overflow-hidden group"
  >
    <label :for="id" class="sr-only">Upload image</label>

    <input
      :id="id"
      :name="name"
      type="file"
      @change="handleFileSelect"
      accept="image/*"
      aria-label="Upload image"
      class="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
    />
    <img
      v-if="localPreview"
      :src="localPreview"
      class="w-full h-full object-contain"
    />

    <div
      v-else
      class="absolute inset-0 flex flex-col items-center justify-center text-slate-400"
    >
      <svg
        class="w-8 h-8 mb-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="text-[10px] font-bold uppercase tracking-widest"
        >Click to Upload</span
      >
    </div>

    <button
      v-if="localPreview !== props.modelValue"
      @click.stop="resetSelection"
      type="button"
      class="absolute top-2 right-2 z-20 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 shadow-md transition-all"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 18L18 6M6 6l12 12"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</template>
