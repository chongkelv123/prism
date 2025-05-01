export interface AuthToken {
    accessToken: string;
    refreshToken?: string;
}

export const login = async (email: string, password: string): Promise<AuthToken> => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to login');
    }
    return response.json();
};