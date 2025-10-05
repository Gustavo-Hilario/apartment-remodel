/**
 * Image handling utilities
 */

/**
 * Convert file to base64
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Check if file is an image
 */
export function isImageFile(file) {
    return file && file.type.startsWith('image/');
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(file) {
    return (file.size / 1024 / 1024).toFixed(2);
}

/**
 * Check if file size is too large
 */
export function isFileTooLarge(file, maxSizeMB = 0.5) {
    return file.size > maxSizeMB * 1024 * 1024;
}
