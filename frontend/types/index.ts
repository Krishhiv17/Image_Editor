// Auth types
export interface User {
    id: string
    email: string
    oauth_provider?: string
    created_at: string
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface SignupData {
    email: string
    password: string
}

export interface AuthResponse {
    access_token: string
    refresh_token: string
    token_type: string
    user: User
}

// Photo types
export interface Photo {
    id: string
    owner_id: string
    album_id: string
    blob_key: string
    mime: string
    width: number
    height: number
    exif_json?: Record<string, any>
    taken_at?: string
    created_at: string
    url?: string
}

// Album types
export interface Album {
    id: string
    owner_id: string
    title: string
    is_private: boolean
    cover_photo_id?: string
    created_at: string
    updated_at: string
    photos?: Photo[]
}

// Version types
export interface PhotoVersion {
    id: string
    photo_id: string
    op_graph_json: OperationGraph
    variant_blob_key: string
    format: string
    bytes: number
    created_at: string
    url?: string
}

// Operation graph types
export interface Operation {
    op: 'crop' | 'rotate' | 'scale' | 'exposure' | 'brightness' | 'contrast' | 'saturation' | 'blur' | 'sharpen'
    [key: string]: any
}

export interface OperationGraph {
    photoId: string
    ops: Operation[]
    output: {
        maxW?: number
        format?: 'auto' | 'jpeg' | 'png' | 'webp'
        quality?: 'auto' | number
    }
}

// Share types
export interface Share {
    id: string
    album_id: string
    scope: 'view' | 'edit'
    token_hash: string
    expires_at?: string
    created_at: string
    share_url?: string
}

// Tag types
export interface Tag {
    id: number
    name: string
}
