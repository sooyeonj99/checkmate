import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 실서버 (핸드폰 테스트 / 에뮬레이터 모두 사용 가능)
// 로컬 에뮬레이터 테스트 시: 'http://10.0.2.2:8000'
export const API_BASE_URL = 'http://101.79.25.139:8000'

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
