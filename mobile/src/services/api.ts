import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 안드로이드 에뮬레이터: 10.0.2.2 = PC의 localhost
// 실제 기기(Expo Go)로 전환 시 'http://192.168.35.178:8000' 으로 변경
export const API_BASE_URL = 'http://10.0.2.2:8000'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('cm_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err)
  }
)

export default api
