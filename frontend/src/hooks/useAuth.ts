import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'
import { useEffect } from 'react'
import axios from 'axios'

export function useAuth() {
  const { user, setUser } = useAuthStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await axios.get('/auth/me', { withCredentials: true })
      return res.data
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (data) setUser(data)
    if (isError) setUser(null)
  }, [data, isError, setUser])

  return { user: data ?? user, isLoading, isAuthenticated: !!data }
}
