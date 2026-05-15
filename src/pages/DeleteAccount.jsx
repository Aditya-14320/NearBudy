import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Mail, Info } from 'lucide-react';
import './Policy.css'; // Reusing legal page styles

const DeleteAccount = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container animate-fade-in">
      <div className="legal-header">
        <button onClick={() => navigate(-1)} className="icon-btn-transparent">
          <ArrowLeft size={24} />
        </button>
        <div className="header-title">
          <Trash2 className="header-icon" size={20} color="#ef4444" />
          <h2>Delete Account</h2>
        </div>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="legal-content animate-slide-up">
        <section className="deletion-hero">
          <div className="warning-box">
            <Info size={40} color="#ef4444" strokeWidth={1.5} />
            <h3>Delete Your NearBudy Account</h3>
            <p>To request deletion of your account and all associated data, please follow the steps below.</p>
          </div>
        </section>

        <section>
          <h3>How to request deletion</h3>
          <p>Please send an email from your registered email address to our support team:</p>
          
          <div className="email-box-premium">
            <Mail size={20} />
            <a href="mailto:nearbudy0@gmail.com">nearbudy0@gmail.com</a>
          </div>

          <div className="include-section">
            <p><strong>Include the following details in your email:</strong></p>
            <ul className="premium-list">
              <li>Your registered email address</li>
              <li>Your username or User ID</li>
            </ul>
          </div>
        </section>

        <section>
          <h3>What happens next?</h3>
          <p>Once we receive your request, our team will verify your identity. Your account, profile information, messages, and all associated data will be permanently deleted from our servers within <strong>7 days</strong>.</p>
          <div className="caution-note">
             Note: This action is permanent and cannot be undone.
          </div>
        </section>

        <div className="last-updated">Last Updated: May 15, 2026</div>
      </div>
    </div>
  );
};

export default DeleteAccount;
