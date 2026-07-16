/**
 * Compresses a user-picked image file to a JPEG data URL suitable for
 * persisting in the goal's `image_url` field.
 *
 * The file is downscaled so that its longest side is at most `maxDim`
 * pixels, then re-encoded as JPEG at `quality`. Typical output for a
 * phone-camera photo is ~80–250 KB.
 */
export async function fileToCompressedDataUrl(
    file: File,
    maxDim = 1600,
    quality = 0.85,
): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Selected file is not an image');
    }
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);

    const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * ratio);
    const h = Math.round(img.naturalHeight * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL('image/jpeg', quality);
}

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = src;
    });
}
