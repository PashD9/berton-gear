<script setup>
    import { ref, computed, watch } from 'vue';
    import { useMediaStore } from '@/stores/mediaStore';

    const props = defineProps(['modelValue']); // This is the imageURL from Firestore
    const emit = defineEmits(['update:modelValue']);
    const mediaStore = useMediaStore();

    const localFile = ref(null);
    const localPreview = ref(props.modelValue || null);

    const hasChanged = computed(() => localFile.value !== null);

    // Watch for external changes (like when the category loads)
    watch(() => props.modelValue, (newVal) => {
        if (!localFile.value) localPreview.value = newVal;
    });

    const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      localFile.value = file;
      localPreview.value = URL.createObjectURL(file);
    };

    const confirmUpload = async () => {
      try {
        const url = await mediaStore.uploadImage(localFile.value);
        emit('update:modelValue', url); // Push the new Cloudinary URL to the parent
        localFile.value = null; 
      } catch (err) {
        console.error("Upload failed", err);
      }
    };

    const resetSelection = () => {
      localFile.value = null;
      localPreview.value = props.modelValue; // Revert to what is currently in the DB
    }
</script>

<template>
  <div class="space-y-4">
    <div class="w-full h-64 border-2 border-dashed border-slate-200 rounded-sm bg-slate-50 flex items-center justify-center overflow-hidden relative group">
      
      <img v-if="localPreview" :src="localPreview" class="w-full h-full object-contain" />
      <div v-else class="text-slate-400 text-center">
        <p class="text-[10px] font-bold uppercase tracking-widest">No Image Found</p>
      </div>
      
      <div v-if="mediaStore.isUploading" class="absolute inset-0 bg-white/90 flex flex-col items-center justify-center">
         <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
         <span class="text-blue-600 text-[10px] font-bold uppercase">Uploading... {{ mediaStore.uploadProgress }}%</span>
      </div>

      <button v-if="hasChanged" @click="resetSelection" class="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-sm hover:bg-red-600 shadow-lg">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="flex gap-2">
      <input type="file" ref="fileInput" class="hidden" @change="handleFileSelect" accept="image/*" />
      <button @click="$refs.fileInput.click()" class="flex-1 bg-white border border-slate-900 text-slate-900 text-[10px] font-bold py-3 uppercase rounded-sm hover:bg-slate-50">
        {{ localPreview ? 'Change Image' : 'Select Image' }}
      </button>
      <button v-if="localFile && !mediaStore.isUploading" @click="confirmUpload" class="flex-1 bg-green-600 text-white text-[10px] font-bold py-3 uppercase rounded-sm hover:bg-green-700">
        Confirm & Save
      </button>
    </div>
  </div>
</template>