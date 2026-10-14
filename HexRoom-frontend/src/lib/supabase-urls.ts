/**
 * Helper to convert Supabase Storage paths to public URLs
 */
export function getSupabasePublicUrl(path: string): string {
    if (!path) return '';
    
    // If already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    
    // Convert Supabase path to public URL
    // bucket: rental-documents, path: temp/images/123_photo.jpg
    // URL: https://[project].supabase.co/storage/v1/object/public/rental-documents/temp/images/123_photo.jpg
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
        console.warn('VITE_SUPABASE_URL not configured');
        return '';
    }
    
    // bucket name is 'rental-documents'
    const bucketName = 'rental-documents';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
    return publicUrl;
}

/**
 * Check if a path is a document (PDF) - should not be displayed as image
 */
export function isDocumentPath(imagePath: string): boolean {
    if (!imagePath) return false;
    // Check if path contains '/documents/' or ends with .pdf
    return imagePath.includes('/documents/') || imagePath.toLowerCase().endsWith('.pdf');
}

/**
 * Filter out document paths from image array
 */
export function filterOutDocuments(images: string[]): string[] {
    return (images || []).filter(img => !isDocumentPath(img));
}

