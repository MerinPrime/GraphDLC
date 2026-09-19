export type CopyOrDownloadResult = {
    success: boolean;
    method: 'clipboard' | 'download';
};

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyOrDownloadBlob(
    blob: Blob,
    filename: string,
): Promise<CopyOrDownloadResult> {
    const canUseClipboard =
        document.hasFocus() &&
        Boolean(navigator.clipboard?.write) &&
        Boolean(window.ClipboardItem);

    if (canUseClipboard) {
        try {
            const mimeType = blob.type || 'image/png';

            await navigator.clipboard.write([
                new ClipboardItem({ [mimeType]: blob }),
            ]);

            return { success: true, method: 'clipboard' };
        } catch (err) {
            console.warn('Clipboard not allowed, trying to download...', err);
        }
    }

    downloadBlob(blob, filename);
    return { success: true, method: 'download' };
}

export function generateFilename(
    prefix: string = 'graphdlc',
    ext: string = 'png',
): string {
    const now = new Date();

    const pad = (n: number) => String(n).padStart(2, '0');

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());

    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    return `${prefix}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${ext}`;
}
