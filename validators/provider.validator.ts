import z from "zod"
import { MomoProvider, PayoutMethod } from "../types/provider.types"

export const providerSchema = z.object({
    payout_method: z.enum(Object.values(PayoutMethod)),
    momo_number: z.string().optional(),
    momo_provider: z.enum(Object.values(MomoProvider)).optional(),
    bank_account_number: z.string().optional(),
    bank_account_name: z.string().optional(),
    bank_code: z.string().optional(),
    service_area: z.string().min(1, 'Service area is required'),
}).superRefine((data, ctx) => {
    if (data.payout_method === 'mobile_money') {
        if (!data.momo_number) ctx.addIssue({ code: 'custom', path: ['momo_number'], message: 'MoMo number required' })
        if (!data.momo_provider) ctx.addIssue({ code: 'custom', path: ['momo_provider'], message: 'MoMo provider required' })
    }
    if (data.payout_method === 'bank') {
        if (!data.bank_account_number) ctx.addIssue({ code: 'custom', path: ['bank_account_number'], message: 'Account number required' })
        if (!data.bank_account_name) ctx.addIssue({ code: 'custom', path: ['bank_account_name'], message: 'Account name required' })
        if (!data.bank_code) ctx.addIssue({ code: 'custom', path: ['bank_code'], message: 'Bank code required' })
    }
})
