import { z } from "zod";
import { Role } from "../types/auth.types";
import { MomoProvider, PayoutMethod } from "../types/provider.types";

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.email(),
    password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    role: z.enum([Role.CUSTOMER, Role.PROVIDER]),
    phone_number: z.string()
    .min(1, "Phone number is required")
    .refine((val) => /^\+[1-9]\d{6,14}$/.test(val), {
        message: "Enter a valid phone number",
    })
    .refine((val) => {
        // Extract everything after the country code (+233 = 4 chars, +44 = 3 chars etc.)
        // E.164: after +, first 1-3 digits are country code, rest is subscriber number
        // For any country, the digit immediately after the country code must not be 0
        const subscriberNumber = val.replace(/^\+\d{1,3}/, '');
        return !subscriberNumber.startsWith('0');
    }, {
        message: "Phone number cannot start with 0 after the country code",
    }),
    address: z.string().optional(),
    profile_picture: z.string().optional(),
    payout_method: z.enum(Object.values(PayoutMethod)).optional(),
    momo_number: z.string().optional(),
    momo_provider: z.enum(Object.values(MomoProvider)).optional(),
    bank_account_number: z.string().optional(),
    bank_account_name: z.string().optional(),
    bank_code: z.string().optional(),
    service_area: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.role !== Role.PROVIDER) return

    if (!data.payout_method) {
        ctx.addIssue({ code: 'custom', path: ['payout_method'], message: 'Payout method is required' })
        return
    }

    if (data.payout_method === PayoutMethod.MOBILE_MONEY) {
        if (!data.momo_number) ctx.addIssue({ code: 'custom', path: ['momo_number'], message: 'MoMo number required' })
        if (!data.momo_provider) ctx.addIssue({ code: 'custom', path: ['momo_provider'], message: 'MoMo provider required' })
    }

    if (data.payout_method === PayoutMethod.BANK) {
        if (!data.bank_account_number) ctx.addIssue({ code: 'custom', path: ['bank_account_number'], message: 'Account number required' })
        if (!data.bank_account_name) ctx.addIssue({ code: 'custom', path: ['bank_account_name'], message: 'Account name required' })
        if (!data.bank_code) ctx.addIssue({ code: 'custom', path: ['bank_code'], message: 'Bank code required' })
    }

    if (!data.service_area) {
        ctx.addIssue({ code: 'custom', path: ['service_area'], message: 'Service area is required' })
    }
})
