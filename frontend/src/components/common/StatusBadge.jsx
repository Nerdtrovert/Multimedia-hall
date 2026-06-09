import './StatusBadge.css';

const StatusBadge = ({ status }) => {
  const normalized = status?.toLowerCase();

  return (
    <span className={`status-badge ${normalized}`}>
      {normalized}
    </span>
  );
};

export default StatusBadge;