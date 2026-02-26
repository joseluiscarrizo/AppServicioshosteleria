// rbacValidator.ts

class RBACError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RBACError";
    }
}

type Role = "admin" | "user" | "guest";

type Permission = "read" | "write" | "delete";

const rolesPermissions: Record<Role, Permission[]> = {
    admin: ["read", "write", "delete"],
    user: ["read", "write"],
    guest: ["read"],
};

function hasPermission(role: Role, permission: Permission): boolean {
    const permissions = rolesPermissions[role];
    if (!permissions) {
        throw new RBACError(`Role ${role} does not exist`);
    }
    return permissions.includes(permission);
}

export { RBACError, hasPermission };