<script setup>
    import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
    import { useUtilityStore } from '@/stores/utilityStore'
    import { useCategoryStore } from '@/stores/categoryStore'
    import { useProductStore } from '@/stores/productStore'
    import { Menu, MenuButton, MenuItems, MenuItem} from '@headlessui/vue'

    const props = defineProps({
        category: { type: Object, required: true },
        isAdmin: { type: Boolean, default: false }
    })

    const emit = defineEmits(['edit', 'delete', 'addItem', 'createSub']) 
    const utils = useUtilityStore()
    const catStore = useCategoryStore()
    const prodStore = useProductStore()

    // --- LOGIC ---
    const subCount = computed(() => utils.getChildCount(props.category.id, catStore.categories))
    const deletionStatus = computed(() => utils.getDeletionStatus(props.category))

    // --- PUBLIC CARD LOGIC (Image Rotation) ---
    const currentImage = ref('')
    const images = ref([])
    let intervalId = null

    const collectImages = () => {
        if (props.isAdmin) return 
        const pool = []
        const catId = props.category.id

        const products = prodStore.products.filter(p => p.parentId === catId)
        products.forEach(p => { if(p.imageURL) pool.push(p.imageURL) })

        const subCats = catStore.categories.filter(c => c.parentId === catId)
        subCats.forEach(sub => {
            const subProds = prodStore.products.filter(p => p.parentId === sub.id)
            subProds.forEach(p => { if(p.imageURL) pool.push(p.imageURL) })
        })

        if (pool.length > 0) {
            images.value = pool
            if (images.value.length > 0 && !currentImage.value) {
                currentImage.value = images.value[Math.floor(Math.random() * images.value.length)]
            }
        }
    }

    watch(() => prodStore.products.length, () => collectImages(), { immediate: true })

    onMounted(() => {
        if (!props.isAdmin) {
            intervalId = setInterval(() => {
                if (images.value.length > 1) {
                    currentImage.value = images.value[Math.floor(Math.random() * images.value.length)]
                }
            }, 7000)
        }
    })

    onUnmounted(() => { if (intervalId) clearInterval(intervalId) })
</script>

<template>
    <div v-if="isAdmin" 
        class="group relative bg-white border rounded-lg p-4 hover:shadow-sm transition-all duration-300 flex flex-col h-full"
        :class="[deletionStatus.reason === 'cooling' ? 'border-amber-400!' : 'border-slate-200 hover:border-blue-200']"
    >
        <div v-if="deletionStatus.reason === 'cooling'" class="absolute -top-2 left-3 z-10 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm flex items-center gap-1 border border-amber-200">
            <span class="material-symbols-outlined text-[10px]">schedule</span> {{ deletionStatus.remaining }}h Left
        </div>

        <div class="flex justify-between items-start mb-3">
            <div class="flex flex-col gap-1">
                <h4 class="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {{ category.name }}
                </h4>
                <span v-if="!category.isPublished" class="w-fit text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm border border-slate-200">
                    Unpublished Draft
                </span>
            </div>

            <Menu as="div" class="relative">
                <MenuButton class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                </MenuButton>

                <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
                    <MenuItems class="absolute right-0 mt-2 w-48 origin-top-right rounded-sm bg-white shadow-lg ring-1 ring-black/10 focus:outline-none z-10 overflow-hidden border border-slate-200">
                        <div class="py-1">
                            <MenuItem v-slot="{ active }">
                                <button @click="emit('addItem', { categoryId: category.id })" :class="[active ? 'bg-green-50 text-green-700' : 'text-slate-700', 'flex w-full items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider']">
                                    <span class="material-symbols-outlined text-sm mr-2">add_box</span> Add Product
                                </button>
                            </MenuItem>

                            <MenuItem v-if="!category.parentId" v-slot="{ active }">
                                <button @click="emit('createSub', { parentId: category.id })" :class="[active ? 'bg-blue-50 text-blue-700' : 'text-slate-700', 'flex w-full items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border-t border-slate-50']">
                                    <span class="material-symbols-outlined text-sm mr-2">account_tree</span> + Subcategory
                                </button>
                            </MenuItem>

                            <MenuItem v-slot="{ active }">
                                <button @click="emit('edit', category)" :class="[active ? 'bg-blue-50 text-blue-700' : 'text-slate-700', 'flex w-full items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border-t border-slate-50']">
                                    <span class="material-symbols-outlined text-sm mr-2">edit</span> Edit
                                </button>
                            </MenuItem>

                            <MenuItem v-slot="{ active }">
                                <button 
                                    @click="emit('delete', category)" 
                                    :disabled="!deletionStatus.canDelete"
                                    :class="[
                                        active ? 'bg-red-50 text-red-700' : 'text-red-600', 
                                        'flex w-full items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-wider border-t border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'
                                    ]"
                                >
                                    <span class="flex items-center">
                                        <span class="material-symbols-outlined text-sm mr-2">delete</span> Delete
                                    </span>
                                    <span v-if="!deletionStatus.canDelete" class="material-symbols-outlined text-[14px]">
                                        {{ deletionStatus.reason === 'active' ? 'lock' : 'schedule' }}
                                    </span>
                                </button>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </transition>
            </Menu>
        </div>

        <div class="grow">
            <p v-if="category.description" class="text-sm text-slate-500 line-clamp-2 italic mb-4">
                {{ category.description }}
            </p>
            <div v-else class="h-4 w-1/2 bg-slate-50 rounded mb-4"></div> 
        </div>

        <div class="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div v-if="category.parentId" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"> 
                IN: <span class="text-blue-500">{{ catStore.categories.find(c => c.id === category.parentId)?.name || 'Unknown' }}</span>
            </div>
            <div v-else class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                    {{ subCount }}
                </span>
                <span class="text-xs font-semibold text-slate-500 tracking-wide uppercase">Subs</span>
            </div>

            <div class="flex gap-2 items-center">
                <svg v-if="category.isFeatured" class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                <svg v-if="category.isBanner" class="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" stroke-width="2.5" stroke-linecap="round"/></svg>
            </div>
        </div>
    </div>

    <div v-else class="group relative w-full aspect-4/3 overflow-hidden rounded-xl shadow-md bg-slate-100 border border-slate-200">
        <img v-if="images.length > 0" :src="currentImage" :alt="category.name" class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
        <div v-else class="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-300">
            <svg class="w-24 h-24 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" /></svg>
        </div>
        <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent opacity-90"></div>
        <div class="absolute bottom-0 left-0 w-full p-5 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <h3 class="text-xl font-bold leading-tight mb-1 shadow-black drop-shadow-md">{{ category.name }}</h3>
            <p class="text-xs text-slate-300 line-clamp-2 font-medium">{{ category.description }}</p>
        </div>
    </div>
</template>