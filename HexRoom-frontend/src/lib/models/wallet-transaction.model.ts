export type TransactionType = 'deposit' | 'withdraw' | 'payment' | 'refund';

export interface WalletTransaction {
    wallet_tx_id: string;
    wallet_id: string;
    type: TransactionType;
    amount: number;
    related_type?: string;
    description?: string;
    created_at: Date | string;
    related_id?: string;
}

export interface CreateWalletTransactionDTO {
    wallet_id: string;
    type: TransactionType;
    amount: number;
    related_type?: string;
    description?: string;
    related_id?: string;
}
