// ── Base ───────────────────────────────────────────────────────────────────────
const baseUrl = import.meta.env.VITE_API_BASE_URL as string
const apiUrl = `${baseUrl}/api/v1`

// ── Endpoints ──────────────────────────────────────────────────────────────────
const LOGIN_API          = `${apiUrl}/admin/auth/login`
const CURRENT_USER_API   = `${apiUrl}/admin/auth/user`
const GET_USER_API       = `${apiUrl}/admin/data/user`
const GET_USERS_API      = `${apiUrl}/admin/data/users`


const getUserToken = (): string | null => localStorage.getItem('auth_token')

export {
    LOGIN_API,
    CURRENT_USER_API,
    GET_USER_API,
    GET_USERS_API,
    getUserToken,
}