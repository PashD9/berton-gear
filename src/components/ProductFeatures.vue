<script setup>
    const features = [
        { icon: 'local_shipping', title: 'Free Shipping', desc: 'On all orders over $500' },
        { icon: 'verified', title: 'Official Warranty', desc: 'Direct from manufacturer' },
        { icon: 'support_agent', title: 'Expert Support', desc: '24/7 technical assistance' },
        { icon: 'inventory_2', title: 'Huge Stock', desc: 'Ready to ship immediately' }
    ]
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div 
            v-for="(feature, index) in features" 
            :key="index" 
            class="flex flex-col items-center text-center p-6 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors"
        >
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm mb-4">
                <span class="material-symbols-outlined text-2xl">{{ feature.icon }}</span>
            </div>
            <h3 class="font-bold text-slate-900 uppercase text-xs tracking-widest mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-slate-500">{{ feature.desc }}</p>
        </div>
    </div>
</template>