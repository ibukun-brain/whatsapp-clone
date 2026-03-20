const MAX_THUMB_WIDTH = 320;
const JPEG_QUALITY = 0.8;

export interface PdfThumbnailResult {
    thumbnail: Blob | null;
    pageCount: number;
}

/**
 * Generates a JPEG thumbnail of the first page of a PDF file.
 * Returns the thumbnail blob and total page count.
 * On any error (encrypted, corrupt, etc.) returns { thumbnail: null, pageCount: 0 }.
 */
export async function generatePdfThumbnail(
    file: File
): Promise<PdfThumbnailResult> {
    let url: string | null = null;

    try {
        const pdfjsLib = await import("pdfjs-dist");
        
        // Point the worker to the CDN build matching our installed version
        if (typeof window !== "undefined") {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }

        url = URL.createObjectURL(file);
        const pdf = await pdfjsLib.getDocument(url).promise;
        const pageCount = pdf.numPages;
        const page = await pdf.getPage(1);

        // Scale so the rendered width doesn't exceed MAX_THUMB_WIDTH
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
            MAX_THUMB_WIDTH / unscaledViewport.width,
            1 // don't upscale small PDFs
        );
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return { thumbnail: null, pageCount };
        }

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(
                (b) => resolve(b),
                "image/jpeg",
                JPEG_QUALITY
            )
        );

        return { thumbnail: blob, pageCount };
    } catch (error) {
        console.error("Failed to generate PDF thumbnail:", error);
        return { thumbnail: null, pageCount: 0 };
    } finally {
        if (url) URL.revokeObjectURL(url);
    }
}
