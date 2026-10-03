export type UserRole = "owner" | "operator";

export interface SessionUser {
    id: string;
    email: string;
    role: UserRole;
}
