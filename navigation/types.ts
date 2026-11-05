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

export type ChosenServiceAddress = {
    customerLocation?: string
    customerLatitude?: number
    customerLongitude?: number
}

export type HomeStackParamList = {
    Home: undefined
    TutorSearch: { serviceId?: string, categoryId?: string } | undefined
    Services: {categoryId: string, categoryName: string}
    ServiceProviders: {serviceId: string, serviceName: string}
    GroomerProfile: { providerServiceId: string } & ChosenServiceAddress
    BookService: { providerServiceId: string, petId?: string } & ChosenServiceAddress
    BookingRequest: { providerServiceId: string, petId: string, scheduledAt: string } & ChosenServiceAddress
    PetForm: { petId?: string, providerServiceId?: string } & ChosenServiceAddress
}

export type BookingsStackParamList = {
    MyBookings: undefined
    BookingDetail: { bookingId: string }
    ReviewBooking: {bookingId: string, serviceName?: string, providerName?: string}
    ReviewDetail: { reviewId: string }
}

export type ProfileEditOrigin = { origin?: 'profile' } | undefined

export type ProviderEditionStackParamList = {
    ServiceMenu: ProfileEditOrigin
    ServiceLocation: ProfileEditOrigin
    WeeklyAvailability: ProfileEditOrigin
    ServiceOfferEditor: { draftKey: string }
}

export type ProfileStackParamList = ProviderEditionStackParamList & {
    Profile: undefined
    PublicProfile: undefined
    PublicProfilePreview: undefined
    BecomeAProvider: undefined
    Pets: undefined
    PetForm: { petId?: string, providerServiceId?: string } & ChosenServiceAddress
    DesignSystemShowcase: undefined
}

export type MessagesStackParamList = {
    Conversations: undefined
}

export type ProviderTabParamList = {
    BookingsTab: undefined
    RequestsTab: undefined
    ServicesTab: undefined
    EarningsTab: undefined
    MessagesTab: undefined
    ProfileTab: undefined
}

export type ProviderBookingsStackParamList = {
    ProviderBookings: undefined
    ProviderBookingDetail: { bookingId: string }
}

export type ProviderServicesStackParamList = ProviderEditionStackParamList & {
    ProfessionalRegistration: undefined
}