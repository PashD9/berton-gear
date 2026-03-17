import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import router from './router'
import VueSplide from '@splidejs/vue-splide'
import '@splidejs/vue-splide/css'

// Trix (rich text editor)
import 'trix'
import 'trix/dist/trix.css'

import App from './App.vue'

const app = createApp(App)
const head = createHead()

app.use(createPinia())
app.use(router)
app.use(VueSplide)
app.use(head)

app.mount('#app')
