
export enum PayoutMethod {
    MOBILE_MONEY = 'mobile_money',
    BANK = 'bank'
}

export enum MomoProvider {
    MTN = 'mtn',
    TELECEL = 'telecel',
    AIRTEL_TIGO = 'airtel_tigo'
}

export interface Provider {
    id: string
    user_id: string
    is_verified?: boolean | null
    payout_method: PayoutMethod
    momo_number?: string
    momo_provider?: MomoProvider
    bank_account_number?: string
    bank_account_name?: string
    bank_code?: string
    total_jobs_completed?: number
    id_document_url?: string
    service_area?: string
}

export type CreateProvider = {
    payout_method: PayoutMethod
    momo_number?: string
    momo_provider?: MomoProvider
    bank_account_number?: string
    bank_account_name?: string
    bank_code?: string
    id_document_url?: string
    service_area?: string
}

export interface ProviderService {
    id: string
    provider_id: string
    service_id: string
    price: number
    created_at?: string
    updated_at?: string
}

export interface ProviderServiceDetailed extends ProviderService {
    service_name: string
    service_description?: string
}

export type CreateProviderService = {
    provider_id: string
    service_id: string
    price?: number
}

export type CoverageSearchParams = {
    address: string
    service_id?: string
    category_id?: string
    /** Nome do profissional, tipo profissional ou serviço (busca livre). */
    q?: string
    latitude?: number
    longitude?: number
}

export type PublicProfileService = {
    id: string
    name: string
    price: number | string
}

export type PublicProfileArea = {
    radius_km: number
    address: string
}

export type PublicProfileScheduleDay = {
    weekday: number
    start: string
    end: string
}

export type PublicProfileGalleryPhoto = {
    id: string
}

export type PublicProfile = {
    provider_id: string
    name: string
    photo_url?: string | null
    photo_id?: string | null
    is_verified?: boolean
    average_rating?: number | string
    review_count?: number
    attendance_rules?: string | null
    area?: PublicProfileArea | null
    schedule?: PublicProfileScheduleDay[]
    gallery?: PublicProfileGalleryPhoto[]
    services: PublicProfileService[]
}

export type PublicPhotoInput = {
    name: string
    mime_type: 'image/jpeg' | 'image/png'
    size: number
    base64: string
}

/** Um groomer dentro do raio, com todos os serviços que atendem ao filtro. */
export type CoverageProvider = {
    /** Id da oferta de menor preço (usado para abrir o perfil). */
    id: string
    provider_id: string
    service_id: string
    service_name: string
    name: string
    profile_picture?: string | null
    /** Menor preço entre os serviços listados. */
    price: number | string
    average_rating: number | string
    review_count: number
    distance_km: number
    radius_km: number
    professional_types: string[]
    services: CoverageService[]
    is_verified?: boolean
    is_favorite?: boolean
    attends_at_home?: boolean
    available_today?: boolean
    next_available_on?: string | null
}

export type CoverageService = {
    id: string
    service_id: string | null
    service_name: string
    price: number | string
}
