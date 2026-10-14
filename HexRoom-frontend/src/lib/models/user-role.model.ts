export interface UserRole {
    role_id: string;
    role: string;
}

export interface CreateUserRoleDTO {
    role: string;
}

export interface UpdateUserRoleDTO {
    role?: string;
}
