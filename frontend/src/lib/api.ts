import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,   // send httpOnly cookie on every request
})

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
