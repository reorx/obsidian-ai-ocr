export interface Image {
    id: string;
    name: string;
    base64_data: string;
}

export interface OCRResult {
    markdownContent: string;
    images: Image[];
}

/**
 * Generic OCR client interface for all OCR providers
 */
export interface OCRClient {
    /**
     * Process a file (image or PDF) with OCR
     * @param filePath Path to the file
     * @param fileData The file data as a Blob
     * @returns Structured OCR result with markdown content and images
     */
    processFile(filePath: string, fileData: Blob): Promise<OCRResult>;
}

/**
 * Function signature for initializing an OCR client
 */
export type InitOCRClient = (apiKey: string) => OCRClient;
