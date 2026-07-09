import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL
 ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
 : '/api/v1'

const api = axios.create({
 baseURL: BASE_URL,
})

api.interceptors.request.use((config) => {
 const token = localStorage.getItem('cm_token')
 if (token) {
 config.headers.Authorization = `Bearer ${token}`
 }
 return config
})

api.interceptors.response.use(
 (response) => response,
 (error) => {
 if (error.response?.status === 401) {
 localStorage.removeItem('cm_token')
 window.location.href = '/login'
 }
 return Promise.reject(error)
 },
)

export default api
