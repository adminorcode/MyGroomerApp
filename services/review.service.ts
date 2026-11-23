import api from "./api"

export const createReview = async (input:{booking_id:string, rating:number, comment:string})=>{
    const result = await api.post(`/reviews`, input)
    return result.data
}

export const getReviews = async (providerId?: string)=>{
    const result = await api.get('/reviews', { params: providerId ? { providerId, limit: 20 } : undefined })
    return result.data
}

// review.service.ts
export const getReviewById = async (reviewId: string) => {
    const result = await api.get(`/reviews/${reviewId}`)
    return result.data
}

