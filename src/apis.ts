const baseUrl = "https://lends-mock-backend-jz4j.onrender.com";

const USER_TOKEN = localStorage.getItem('auth_token');
const apiUrl = `${baseUrl}/api/v1`;
const LOGIN_API = `${apiUrl}/admin/auth/login`;
const CURRENT_USER_API = `${apiUrl}/admin/auth/user`;
const GET_USER_API = `${apiUrl}/admin/data/user`;
const GET_USERS_API = `${apiUrl}/admin/data/users`;




export {
    LOGIN_API,
    USER_TOKEN,
    CURRENT_USER_API,
    GET_USER_API,
    GET_USERS_API
};


