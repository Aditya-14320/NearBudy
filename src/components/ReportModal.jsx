import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './ReportModal.css';

const ReportModal = ({ user, isOpen, onClose }) => {
  const { reportUser } = useAppContext();
  const [selectedReason, setSelectedReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = [
    "Spam",
    "Fake profile",
    "Harassment",
    "Inappropriate content"
  ];

  if (!isOpen || !user) return null;

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert("Please select a reason");
      return;
    }
    setIsSubmitting(true);
    await reportUser(user, selectedReason);
    setIsSubmitting(false);
    alert("Report submitted successfully. We will review it shortly.");
    onClose();
  };

  return (
    <div className="report-overlay animate-fade-in" onClick={onClose}>
      <div className="report-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="report-header">
          <div className="icon-wrapper warning">
            <AlertTriangle size={24} color="var(--warning)" />
          </div>
          <h2>Report {user?.name || 'User'}</h2>
          <p>We won't let them know you reported them.</p>
        </div>

        <div className="report-reasons">
          {reasons.map(reason => (
            <div 
              key={reason} 
              className={`reason-item ${selectedReason === reason ? 'selected' : ''}`}
              onClick={() => setSelectedReason(reason)}
            >
              <span>{reason}</span>
              <div className="radio-circle">
                {selectedReason === reason && <div className="radio-inner" />}
              </div>
            </div>
          ))}
        </div>

        <div className="report-actions">
          <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting || !selectedReason}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
