<script setup>
import { useUtilityStore } from '@/stores/utilityStore';
import { computed } from 'vue';

const utils = useUtilityStore();

const toast = computed(() => utils.toast);

const iconMap = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
};

const colorMap = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
};

const icon = computed(() => iconMap[toast.value.type] || 'info');
const bgColor = computed(() => colorMap[toast.value.type] || 'bg-slate-800');
</script>

<template>
    <Transition
        enter-active-class="transition ease-out duration-300 transform"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200 transform"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
    >
        <div v-if="toast.show" class="fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white flex items-center gap-3" :class="bgColor" style="z-index: 9999;">
            <span class="material-symbols-outlined">{{ icon }}</span>
            <span>{{ toast.message }}</span>
        </div>
    </Transition>
</template>