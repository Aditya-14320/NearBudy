import { X, Map, MessageCircle, EyeOff } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import './PremiumModal.css';

const PremiumModal = ({ 
  isOpen, 
  onClose, 
  onPaymentSuccess,
  customTitle = "Unlock CamChat",
  customSubtitle = "Get full access to your campus network."
}) => {
  const { currentUser } = useAppContext();

  if (!isOpen) return null;

  const handlePayment = (amount, planName) => {
    alert("Payments are temporarily disabled for the initial release.");
    /*
    const options = {
      key: "rzp_test_Sk94PcJhy0NzzC",
      amount: amount * 100,
      currency: "INR",
      name: "CamChat Premium",
      description: `Upgrade to ${planName}`,
      handler: async function (response) {
        // Payment successful logic
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
    */
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="premium-modal animate-slide-up">
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="premium-badge-large">PRO</div>
          <h2>{customTitle}</h2>
          <p>{customSubtitle}</p>
        </div>

        <div className="benefits-list">
          <div className="benefit-item">
            <Map size={24} className="benefit-icon" />
            <div className="benefit-text">
              <h4>See everyone nearby</h4>
              <p>Unlock the map and discover all students around you.</p>
            </div>
          </div>
          
          <div className="benefit-item">
            <MessageCircle size={24} className="benefit-icon" />
            <div className="benefit-text">
              <h4>Unlimited Requests</h4>
              <p>Connect with as many people as you want.</p>
            </div>
          </div>

          <div className="benefit-item">
            <EyeOff size={24} className="benefit-icon" />
            <div className="benefit-text">
              <h4>Anonymous Mode</h4>
              <p>Browse profiles without them knowing.</p>
            </div>
          </div>
        </div>

        <div className="pricing-options-disabled" style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>
          <p>Premium features are currently free for everyone!</p>
        </div>
        {/* 
        <div className="pricing-options">
          ...
        </div>
        */}
      </div>
    </div>
  );
};

export default PremiumModal;
