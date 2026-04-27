
import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import 'ol/ol.css'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

createApp(App).mount('#app')
