const DEFAULT_DOWNLOAD_REVOKE_DELAY_MS = 60000;

const toBlob = (data, fallbackType = 'application/octet-stream') =>
  data instanceof Blob ? data : new Blob([data], { type: fallbackType });

export const triggerBlobDownload = (
  blobLike,
  filename,
  fallbackType = 'application/octet-stream',
) => {
  const blob = toBlob(blobLike, fallbackType);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  link.click();

  setTimeout(() => URL.revokeObjectURL(objectUrl), DEFAULT_DOWNLOAD_REVOKE_DELAY_MS);
};

export const extractBlobErrorMessage = async (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (responseData instanceof Blob) {
    try {
      const rawText = await responseData.text();
      if (!rawText) return fallbackMessage;

      try {
        const parsed = JSON.parse(rawText);
        return parsed?.message || fallbackMessage;
      } catch {
        return rawText;
      }
    } catch {
      return fallbackMessage;
    }
  }

  return error?.response?.data?.message || fallbackMessage;
};
