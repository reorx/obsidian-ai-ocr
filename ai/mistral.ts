import { Mistral } from "@mistralai/mistralai";
import { OCRResponse } from "@mistralai/mistralai/models/components";

import {
	InitOCRClient,
	OCRClient,
	OCRResult,
} from "../types";

/**
 * Error thrown by Mistral OCR API
 */
export class MistralApiError extends Error {
    status?: number;
    statusText?: string;

    constructor(message: string, status?: number, statusText?: string) {
        super(message);
        this.name = 'MistralApiError';
        this.status = status;
        this.statusText = statusText;
    }
}

/**
 * Mistral implementation of OCRClient interface
 */
export class MistralOCRClient implements OCRClient {
    private apiKey: string;
    private client: Mistral;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new MistralApiError('Mistral API key not configured');
        }
        this.apiKey = apiKey;
        this.client = new Mistral({ apiKey });
    }

    /**
     * Process a file (image or PDF) with Mistral OCR
     * @param filePath Path to the file
     * @param fileData The file data as a Blob
     * @returns Structured OCR result with markdown content and images
     * @throws {MistralApiError} If the API request fails or API key is missing
     */
    async processFile(filePath: string, fileData: Blob): Promise<OCRResult> {
        const fileName = filePath.split('/').pop() || 'file';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(fileExtension);

        try {
            // Convert Blob to ArrayBuffer
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Upload file
            let uploadedFile;
            try {
                uploadedFile = await this.client.files.upload({
                    file: {
                        fileName,
                        content: buffer,
                    },
                    purpose: "ocr"
                });
            } catch (error) {
                console.error('Error uploading file to Mistral:', error);
                throw new MistralApiError(
                    error instanceof Error ? `File upload failed: ${error.message}` : 'File upload failed'
                );
            }

            // Get signed URL
            let signedUrl;
            try {
                signedUrl = await this.client.files.getSignedUrl({
                    fileId: uploadedFile.id,
                });
            } catch (error) {
                console.error('Error getting signed URL from Mistral:', error);
                throw new MistralApiError(
                    error instanceof Error ? `Failed to get signed URL: ${error.message}` : 'Failed to get signed URL'
                );
            }

            // Process with OCR
            let ocrResponse: OCRResponse;
            try {
                ocrResponse = await this.client.ocr.process({
                    model: "mistral-ocr-latest",
					includeImageBase64: true,
                    document: isImage
                        ? { type: "image_url", imageUrl: signedUrl.url }
                        : { type: "document_url", documentUrl: signedUrl.url }
                });
            } catch (error) {
                console.error('Error processing OCR with Mistral:', error);
                throw new MistralApiError(
                    error instanceof Error ? `OCR processing failed: ${error.message}` : 'OCR processing failed'
                );
            }
			// console.log(`ocrResponse: ${JSON.stringify(ocrResponse)}`);

            // Convert Mistral response to our common OCRResult format
            const result: OCRResult = {
                markdownContent: ocrResponse.pages?.map(page => page.markdown).join('\n\n') || '',
                images: ocrResponse.pages?.flatMap(page =>
                    page.images.map(img => ({
                        id: img.id,
                        name: `${img.id}`,
                        base64_data: img.imageBase64 || ''
                    }))
                ) || []
            };

            return result;
        } catch (error) {
            // Re-throw MistralApiError instances
            if (error instanceof MistralApiError) {
                throw error;
            }

            // Convert other errors to MistralApiError
            console.error('Error processing file with Mistral OCR:', error);
            throw new MistralApiError(
                error instanceof Error ? error.message : 'Unknown error processing file with Mistral OCR'
            );
        }
    }
}

/**
 * Initialize a Mistral OCR client with the provided API key
 * @param apiKey Mistral API key
 * @returns An OCR client instance
 */
export const initMistralOCRClient: InitOCRClient = (apiKey: string): OCRClient => {
    return new MistralOCRClient(apiKey);
};
