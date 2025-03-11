export type User = {
    _id: string
    isEnabled: boolean
    roles: Array<string>
    permissions: Array<string>
    username: string
    emailAddress: string
    profile: Record<string, string>
    password: string
    deletedAt: Date
    createdAt: Date
    updatedAt: Date
}