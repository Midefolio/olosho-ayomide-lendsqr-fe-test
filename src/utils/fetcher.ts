import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import type { MutableRefObject } from "react"
import qs from "qs"

// ─── Types ─────────────────────────────────────────────────────────────────────
type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
type Params = Record<string, any> | null
type Token = string | null
type ContentType = "json" | "urlencoded" | "multipart"
type ResponseType = "json" | "blob" | "text"

// ─── Session helpers ────────────────────────────────────────────────────────────
const logout = () => {
    localStorage.removeItem("auth_token")   // ✅ the key, not the value
    window.location.href = "/"              // ✅ redirect to login, not reload
}

// ─── Error message map ──────────────────────────────────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
    "Network Error": "Cannot reach the server. Check your internet and try again.",
    "too many requests": "Too many requests. Please slow down and try again.",
    "jwt expired": "Your session has expired. Please log in again.",
    "page not found": "This page does not exist.",
    "account suspended": "Your account has been suspended. Please contact support.",
}

// ─── Axios error handler ────────────────────────────────────────────────────────
const handleAxiosError = (error: any): string => {
    if (error.message === "Network Error") return ERROR_MESSAGES["Network Error"]

    const status = error.response?.status
    const errorRes = error.response?.data

    if (status === 401) {
        logout()
        return ERROR_MESSAGES["jwt expired"]
    }

    if (!errorRes) return "Something went wrong. Please try again."

    if (errorRes.message === "Too many requests in a short period. Please wait a moment and try again.") {
        return ERROR_MESSAGES["too many requests"]
    }
    if (errorRes.error === "jwt expired") {
        logout()
        return ERROR_MESSAGES["jwt expired"]
    }
    if (errorRes.error === "Your account has been suspended. Please contact support.") {
        logout()
        return ERROR_MESSAGES["account suspended"]
    }
    if (errorRes.error === "page not found") {
        window.location.href = "/page-not-found"
        return ERROR_MESSAGES["page not found"]
    }

    return errorRes.error ?? errorRes.message ?? "Something went wrong. Please try again."
}

// ─── Body serializer ────────────────────────────────────────────────────────────
const buildRequestData = (
    params: Params,
    contentType: ContentType
): Params | string | FormData | null => {
    if (!params) return null

    if (contentType === "urlencoded") return qs.stringify(params)

    if (contentType === "multipart") {
        const formData = new FormData()
        Object.entries(params).forEach(([key, value]) => {
            if (value instanceof File) {
                formData.append(key, value)
            } else if (Array.isArray(value)) {
                value.forEach((item) => formData.append(`${key}[]`, item))
            } else {
                formData.append(key, String(value))
            }
        })
        return formData
    }

    return params
}

// ─── Content-Type header map ────────────────────────────────────────────────────
const CONTENT_TYPE_HEADERS: Record<ContentType, string> = {
    json: "application/json",
    urlencoded: "application/x-www-form-urlencoded",
    multipart: "multipart/form-data",
}

// ─── makeRequest ────────────────────────────────────────────────────────────────
const makeRequest = async <T = any>(
    method: RequestMethod,
    api: string,
    params?: Params,
    cb?: (() => void) | null,
    token?: Token,
    abortController?: MutableRefObject<AbortController | null> | null,
    contentType: ContentType = "json",
    responseType: ResponseType = "json"
): Promise<{ res?: T; error?: string }> => {

    if (!navigator.onLine) {
        cb?.()
        return { error: "You are offline. Please check your internet connection." }
    }

    const headers: Record<string, string> = {
        "Content-Type": CONTENT_TYPE_HEADERS[contentType],
        ...(token && { Authorization: `Bearer ${token}` }),
    }

    const processedData = buildRequestData(params ?? null, contentType)

    const config: AxiosRequestConfig = {
        method,
        url: api,
        headers,
        responseType,
        signal: abortController?.current?.signal,
        ...(method === "GET"
            ? { params: processedData }
            : { data: processedData }
        ),
    }

    try {
        const response: AxiosResponse<T> = await axios(config)
        return { res: response.data }
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            return { error: handleAxiosError(error) }
        }
        return { error: "An unexpected error occurred. Please try again." }
    } finally {
        cb?.()
    }
}

export { makeRequest }