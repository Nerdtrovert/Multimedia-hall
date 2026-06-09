import { useNavigate } from 'react-router-dom';
import './PageBackButton.css';

const PageBackButton = ({ fallback }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallback);
  };

  return (
    <div className="page-back-wrap">
      <button
        type="button"
        className="btn btn-outline page-back-button"
        onClick={handleBack}
      >
        <span aria-hidden="true">←</span>
        <span>Back</span>
      </button>
    </div>
  );
};

export default PageBackButton;