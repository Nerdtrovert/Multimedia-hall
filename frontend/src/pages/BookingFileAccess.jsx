import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import {
  downloadProtectedFile,
  fetchProtectedFileBlob,
  getProtectedFileErrorMessage,
} from '../utils/api';
import './Reports.css';

const BookingFileAccess = () => {
  const { user } = useAuth();
  const { bookingId, fileType } = useParams();
  const [searchParams] = useSearchParams();
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const fallback = user?.role === 'supervisor'
    ? '/supervisor/dashboard'
    : user?.role === 'admin'
      ? '/admin/dashboard'
      : '/user/dashboard';

  const protectedPath = useMemo(() => {
    if (!bookingId || !['poster', 'report'].includes(fileType)) return '';
    const download = searchParams.get('download') === '1';
    return `/api/bookings/${bookingId}/${fileType}${download ? '?download=1' : ''}`;
  }, [bookingId, fileType, searchParams]);
  const shouldDownload = searchParams.get('download') === '1';

  const unsupported = !bookingId || !['poster', 'report'].includes(fileType);

  useEffect(() => {
    if (unsupported || !protectedPath) {
      setLoading(false);
      setLoadError('');
      setFileUrl('');
      return;
    }

    let isActive = true;
    let objectUrl = '';

    const loadFile = async () => {
      setLoading(true);
      setLoadError('');
      try {
        if (shouldDownload) {
          const fallbackName =
            fileType === 'report'
              ? `booking-${bookingId}-report.pdf`
              : `booking-${bookingId}-${fileType}`;
          await downloadProtectedFile(protectedPath, fallbackName);

          if (!isActive) return;
          setFileUrl('');
          return;
        }

        const response = await fetchProtectedFileBlob(protectedPath);
        const contentType =
          response.headers?.['content-type'] || 'application/octet-stream';
        objectUrl = URL.createObjectURL(
          new Blob([response.data], { type: contentType })
        );

        if (!isActive) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setFileUrl(objectUrl);
      } catch (error) {
        if (!isActive) return;
        const fallbackMessage = shouldDownload
          ? 'Unable to download this file.'
          : 'Unable to open this file.';
        setLoadError(await getProtectedFileErrorMessage(error, fallbackMessage));
        setFileUrl('');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [protectedPath, unsupported]);

  return (
    <div>
      <Navbar />
      <div className="reports-page">
        <PageBackButton fallback={fallback} />
        <div className="reports-card" style={{ padding: 0, overflow: 'hidden' }}>
          {unsupported ? (
            <div style={{ padding: 24 }}>Unsupported file link.</div>
          ) : loading ? (
            <div style={{ padding: 24 }}>
              {shouldDownload ? 'Preparing download...' : 'Loading file...'}
            </div>
          ) : loadError ? (
            <div style={{ padding: 24 }}>{loadError}</div>
          ) : shouldDownload ? (
            <div style={{ padding: 24 }}>
              Download started. You can close this tab if your browser does not close it automatically.
            </div>
          ) : (
            <iframe
              title={`${fileType}-${bookingId}`}
              src={fileUrl}
              style={{ width: '100%', height: '80vh', border: 0 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFileAccess;
