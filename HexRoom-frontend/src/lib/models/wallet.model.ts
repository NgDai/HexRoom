export interface Wallet {
    wallet_id: string;
    user_id: string;
    balance: number;
    currency: string;
    updated_at: Date | string;
}

export interface CreateWalletDTO {
    user_id: string;
    balance?: number;
    currency?: string;
}

export interface UpdateWalletDTO {
    balance?: number;
    currency?: string;
}
