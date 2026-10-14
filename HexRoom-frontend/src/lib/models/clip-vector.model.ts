export interface ClipVector {
    vector_id: string;
    type: string;
    reference_id: string;
    embedding: number[];
    created_at: Date | string;
}

export interface CreateClipVectorDTO {
    type: string;
    reference_id: string;
    embedding: number[];
}
