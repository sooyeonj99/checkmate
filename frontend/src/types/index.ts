export interface User {
 id: number
 email: string
 username: string
 created_at: string
}

export interface ApiResponse<T> {
 data: T
 message?: string
}

export interface PaginatedResponse<T> {
 items: T[]
 total: number
 page: number
 size: number
}
