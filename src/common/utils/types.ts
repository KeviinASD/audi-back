import { RoleTier } from "../enums/role.enum";

export type SignInParams = {
    email: string;
    password: string;
};

export type SignUpParams = {
    username: string;
    email: string;
    password?: string;
}

// JWT 

export type JwtPayloadParams = {
    sub: number;
}

export type resultAndTokenParams = {
    user: {
        id: number;
        username: string;
        email: string;
    }
    access_token: string;
}