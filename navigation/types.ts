export type AuthStackParamList = {
    Welcome: undefined
    Login: undefined
    Register: undefined
    TutorRegister: undefined
    VerifyEmail: {email: string}
    ForgotPassword: undefined
    ResetPassword: {token: string}
}

export type ChatParams = {
    conversationId: string
    otherName?: string
}

export type RootParamList = {
    Auth: undefined
    Provider: undefined
    Customer: undefined
    Chat: ChatParams
}

export type CustomerTabParamList = {
    HomeTab: undefined
    BookingsTab: undefined
    MessagesTab: undefined
    ProfileTab: undefined
}

export type HomeStackParamList = {
    Home: undefined
    TutorSearch: { serviceId?: string, categoryId?: string } | undefined
    Services: {categoryId: string, categoryName: string}
    ServiceProviders: {serviceId: string, serviceName: string}
    GroomerProfile: {providerServiceId: string}
    BookService: {providerServiceId: string, petId?: string}
    PetForm: { petId?: string, providerServiceId?: string }
}

export type BookingsStackParamList = {
    MyBookings: undefined
    BookingDetail: { bookingId: string }
    ReviewBooking: {bookingId: string, serviceName?: string, providerName?: string}
    ReviewDetail: { reviewId: string }
}

export type ProfileStackParamList = {
    Profile:undefined
    BecomeAProvider:undefined
    Pets: undefined
    PetForm: { petId?: string, providerServiceId?: string }
    DesignSystemShowcase: undefined
}

export type MessagesStackParamList = {
    Conversations: undefined
}

export type ProviderTabParamList = {
    BookingsTab: undefined
    ServicesTab: undefined
    EarningsTab: undefined
    MessagesTab: undefined
    ProfileTab: undefined
}

export type ProviderBookingsStackParamList = {
    ProviderBookings: undefined
    ProviderBookingDetail: { bookingId: string }
}

export type ProviderServicesStackParamList = {
    MyServices: undefined
    AddService: undefined
    EditService: { providerServiceId: string, serviceName?: string, price?: number }
}