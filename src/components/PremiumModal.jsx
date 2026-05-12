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
    // Razorpay configuration
    const options = {
      key: "rzp_test_Sk94PcJhy0NzzC", // The provided test API key
      amount: amount * 100, // Amount is in currency subunits (paise)
      currency: "INR",
      name: "CamChat Premium",
      description: `Upgrade to ${planName}`,
      image: "https://i.imgur.com/3g7nmJC.png", // Mock logo
      handler: async function (response) {
        // Payment successful callback
        const paymentId = response.razorpay_payment_id;
        
        try {
          // 1. Audit Log
          await addDoc(collection(db, "payments"), {
            userId: currentUser?.id,
            paymentId,
            planName,
            amount,
            timestamp: serverTimestamp()
          });

          // 2. Calculate Expiry
          const now = Date.now();
          const currentExpiry = currentUser?.premiumUntil || 0;
          const baseDate = currentExpiry > now ? currentExpiry : now;
          const additionalMs = amount === 29 ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
          const newExpiry = baseDate + additionalMs;

          // 3. Update User
          if (currentUser) {
            await updateDoc(doc(db, "users", currentUser.id), {
              premiumUntil: newExpiry,
              isPremium: true // keep legacy flag just in case
            });
          }

          onPaymentSuccess(newExpiry);
        } catch (e) {
          console.error("Error processing payment:", e);
          alert("Payment was successful but error updating account. Contact support.");
        }
        onClose();
      },
      prefill: {
        name: "John Doe",
        email: "student@college.edu",
        contact: "9999999999"
      },
      theme: {
        color: "#6366f1" // Match our accent-primary
      }
    };

    const rzp = new window.Razorpay(options);
    
    rzp.on('payment.failed', function (response){
      console.error(response.error.description);
      alert("Payment failed: " + response.error.description);
    });

    rzp.open();
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

        <div className="pricing-options">
          <div className="price-card" onClick={() => handlePayment(29, "Weekly Plan")}>
            <div className="plan-name">Weekly</div>
            <div className="plan-price">₹29<span>/wk</span></div>
          </div>
          
          <div className="price-card popular" onClick={() => handlePayment(79, "Monthly Plan")}>
            <div className="popular-tag">BEST VALUE</div>
            <div className="plan-name">Monthly</div>
            <div className="plan-price">₹79<span>/mo</span></div>
          </div>
        </div>

        <button className="btn-primary" onClick={() => handlePayment(79, "Monthly Plan")} style={{marginTop: '16px'}}>
          Continue with Monthly
        </button>
      </div>
    </div>
  );
};

export default PremiumModal;
