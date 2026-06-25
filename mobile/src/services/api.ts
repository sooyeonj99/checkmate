import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 안드로이드 에뮬레이터: 10.0.2.2 = 호스트 머신 localhost
// NHN 클라우드 연동 후 실제 서버 URL로 교체
export const API_BASE_URL = 'http://10.0.2.2:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
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
