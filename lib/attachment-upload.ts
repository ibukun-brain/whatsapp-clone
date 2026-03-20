import { axiosInstance } from "./axios";
import { Attachment } from "@/types";

const UPLOAD_ENDPOINT = "/api/messages/attachments/upload/";

/**
 * Uploads a file (with optional PDF thumbnail) to the attachment endpoint.
 *
 * For PDF files, automatically generates a first-page thumbnail before uploading.
 * For all other file types, uploads the file as-is without a thumbnail.
 *
 * @returns The full Attachment response object from the server.
 */
export async function uploadAttachment(file: File): Promise<Attachment> {
    const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

    let thumbnail: Blob | null = null;
    let pageCount = 0;

    if (isPdf) {
        // Dynamically import to prevent SSR crashes (DOMMatrix is not defined in Node.js)
        const { generatePdfThumbnail } = await import("./pdf-thumbnail");
        const result = await generatePdfThumbnail(file);
        thumbnail = result.thumbnail;
        pageCount = result.pageCount;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_name", file.name);
    formData.append("file_size", String(file.size));
    formData.append("file_type", isPdf ? "pdf" : file.type);
    formData.append("page_count", String(pageCount));

    if (thumbnail) {
        formData.append("thumbnail", thumbnail, `${file.name}_thumb.jpg`);
    }

    const response = await axiosInstance.post<Attachment>(
        UPLOAD_ENDPOINT,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
}
