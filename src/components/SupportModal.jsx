import { X, Mail, MessageCircle, HelpCircle } from 'lucide-react';
import './SupportModal.css';

const SupportModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="support-overlay animate-fade-in" onClick={onClose}>
      <div className="support-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <button className="support-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="support-header">
          <div className="support-icon">
            <HelpCircle size={40} />
          </div>
          <h2>Help & Support</h2>
          <p>We're here to help! How can we assist you today?</p>
        </div>

        <div className="support-options">
          <a href="mailto:support@nearbudy.com" className="support-option-card">
            <div className="option-icon mail">
              <Mail size={24} />
            </div>
            <div className="option-content">
              <h3>Email Support</h3>
              <p>Get in touch with our team directly. We usually reply within 24 hours.</p>
            </div>
          </a>

          <div className="support-option-card" onClick={() => alert("Live Chat is coming soon!")}>
            <div className="option-icon chat">
              <MessageCircle size={24} />
            </div>
            <div className="option-content">
              <h3>Live Chat</h3>
              <p>Chat with a support agent instantly. (Coming Soon)</p>
            </div>
          </div>
        </div>

        <div className="support-faq">
          <h3>Frequently Asked Questions</h3>
          
          <div className="faq-item">
            <h4>How do I block a user?</h4>
            <p>Go to the user's profile or chat, tap the three dots in the top right, and select 'Block User'.</p>
          </div>
          
          <div className="faq-item">
            <h4>How do I cancel Premium?</h4>
            <p>Premium is currently a one-time activation in the beta version and does not automatically renew.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
