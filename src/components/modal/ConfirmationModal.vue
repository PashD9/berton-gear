<script setup>
import { useUtilityStore } from '@/stores/utilityStore'

const utils = useUtilityStore()

const handleConfirm = async () => {
    if (utils.modal.onConfirm) {
        utils.modal.loading = true
        try {
            await utils.modal.onConfirm()
        } finally {
            utils.modal.loading = false
            utils.modal.show = false
        }
    } else {
        utils.modal.show = false
    }
}
</script>

<template>
    <div v-if="utils.modal.show" class="fixed inset-0 z-60 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="utils.modal.show = false"></div>
        <div class="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 relative z-10 animate-in fade-in zoom-in duration-200 border border-slate-200">
            <h3 class="text-lg font-bold text-slate-800 mb-2">{{ utils.modal.title }}</h3>
            <p class="text-slate-600 text-sm mb-6 leading-relaxed">{{ utils.modal.message }}</p>
            <div class="flex justify-end gap-3">
                <button @click="utils.modal.show = false" class="px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 rounded transition-colors">Cancel</button>
                <button @click="handleConfirm" :disabled="utils.modal.loading" :class="utils.modal.confirmClass" class="px-6 py-2 text-white font-bold text-xs uppercase tracking-wider rounded hover:opacity-90 transition-colors shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                    <span v-if="utils.modal.loading" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {{ utils.modal.confirmText }}
                </button>
            </div>
        </div>
    </div>
</template>