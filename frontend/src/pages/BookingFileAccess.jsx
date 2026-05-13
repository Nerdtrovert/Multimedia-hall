import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import { resolveApiOrigin } from '../utils/api';
import './Reports.css';

const BookingFileAccess = () => {
  const { user } = useAuth();
  const { bookingId, fileType } = useParams();
  const [searchParams] = useSearchParams();
  const apiBase = resolveApiOrigin();
  const fallback = user?.role === 'supervisor'
    ? '/supervisor/dashboard'
    : user?.role === 'admin'
      ? '/admin/dashboard'
      : '/user/dashboard';

  const fileUrl = useMemo(() => {
    if (!bookingId || !['poster', 'report'].includes(fileType)) return '';
    const download = searchParams.get('download') === '1';
    return `${apiBase}/bookings/${bookingId}/${fileType}${download ? '?download=1' : ''}`;
  }, [apiBase, bookingId, fileType, searchParams]);

  const unsupported = !bookingId || !['poster', 'report'].includes(fileType);

  return (
    <div>
      <Navbar />
      <div className="reports-page">
        <PageBackButton fallback={fallback} />
        <div className="reports-card" style={{ padding: 0, overflow: 'hidden' }}>
          {unsupported ? (
            <div style={{ padding: 24 }}>Unsupported file link.</div>
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
