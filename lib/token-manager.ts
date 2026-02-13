type TokenListener = (token: string | null) => void;

class TokenManager {
    private accessToken: string | null = null;
    private listeners: TokenListener[] = [];

    getToken(): string | null {
        return this.accessToken;
    }

    setToken(token: string | null) {
        this.accessToken = token;
        this.notifyListeners();
    }

    subscribe(listener: TokenListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => listener(this.accessToken));
    }
}

export const tokenManager = new TokenManager();
