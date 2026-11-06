import api from './api'

export type AddressLabel = 'home' | 'work' | 'other'

export type CustomerAddress = {
    id: string
    label: AddressLabel
    address: string
    complement: string | null
    latitude: number
    longitude: number
    is_default: boolean
    created_at: string
    updated_at: string
}

export type SaveCustomerAddress = {
    label: AddressLabel
    address: string
    complement?: string | null
    latitude: number
    longitude: number
    is_default?: boolean
}

export const ADDRESS_LABELS: { id: AddressLabel, name: string }[] = [
    { id: 'home', name: 'Casa' },
    { id: 'work', name: 'Trabalho' },
    { id: 'other', name: 'Outros' },
]

export const addressLabelName = (label: AddressLabel) =>
    ADDRESS_LABELS.find(item => item.id === label)?.name ?? 'Outros'

export const listCustomerAddresses = async () => {
    const response = await api.get('/customer-addresses')
    return response.data as { data: CustomerAddress[] }
}

export const createCustomerAddress = async (body: SaveCustomerAddress) => {
    const response = await api.post('/customer-addresses', body)
    return response.data as { data: CustomerAddress }
}

export const updateCustomerAddress = async (id: string, body: Partial<SaveCustomerAddress>) => {
    const response = await api.patch(`/customer-addresses/${id}`, body)
    return response.data as { data: CustomerAddress }
}

export const deleteCustomerAddress = async (id: string, replacementId?: string) => {
    await api.delete(`/customer-addresses/${id}`, {
        params: replacementId ? { replacement_id: replacementId } : undefined,
    })
}
