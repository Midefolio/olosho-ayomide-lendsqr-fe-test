export interface LoginCredentials {
  email: string
  password: string
}

export interface MockUser {
  email: string
  password: string
  name: string
}

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error'
