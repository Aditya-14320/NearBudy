import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './PremiumModal.css';

const PremiumModal = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser } = useAppContext();
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  if (!isOpen || !currentUser) return null;

  const handleUpgrade = async () => {
    try {
      let durationMs = 0;
      if (selectedPlan === 'weekly') durationMs = 7 * 24 * 60 * 60 * 1000;
      if (selectedPlan === 'monthly') durationMs = 30 * 24 * 60 * 60 * 1000;
      if (selectedPlan === 'yearly') durationMs = 365 * 24 * 60 * 60 * 1000;

      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, {
        isPremium: true,
        premiumPlan: selectedPlan,
        premiumExpiresAt: Date.now() + durationMs
      });
      setCurrentUser(prev => ({
        ...prev,
        isPremium: true,
        premiumPlan: selectedPlan,
        premiumExpiresAt: Date.now() + durationMs
      }));
      alert(`✨ Success! You are now a Premium member on the ${selectedPlan} plan. Enjoy the exclusive features!`);
      onClose();
    } catch (e) {
      console.error("Upgrade error:", e);
      alert("Failed to process upgrade. Please try again.");
    }
  };

  return (
    <div className="premium-overlay animate-fade-in" onClick={onClose}>
      <div className="premium-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <button className="premium-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="premium-hero">
          <h2>💎 NearBudy Premium</h2>
          <p>Connect more. Discover more.</p>
        </div>

        <div className="pricing-cards-container">
          <div className={`pricing-card ${selectedPlan === 'weekly' ? 'active' : ''}`} onClick={() => setSelectedPlan('weekly')}>
            <span className="pricing-badge">Try Premium</span>
            <h4>⚡ Weekly</h4>
            <div className="price-val">₹39</div>
            <span className="price-period">/week</span>
          </div>

          <div className={`pricing-card ${selectedPlan === 'monthly' ? 'active' : ''}`} onClick={() => setSelectedPlan('monthly')}>
            <span className="pricing-badge popular">Most popular</span>
            <h4>⭐ Monthly</h4>
            <div className="price-val">₹69</div>
            <span className="price-period">/month</span>
          </div>

          <div className={`pricing-card ${selectedPlan === 'yearly' ? 'active' : ''}`} onClick={() => setSelectedPlan('yearly')}>
            <span className="pricing-badge value">Best value</span>
            <h4>👑 Yearly</h4>
            <div className="price-val">₹799</div>
            <span className="price-period">/year</span>
          </div>
        </div>

        <div className="premium-footer">
          <button className="btn-upgrade-premium" onClick={handleUpgrade}>
            Get Premium
          </button>
        </div>

        <div className="premium-features-simple-list">
          <div className="simple-feature-item"><Check size={18} className="check-icon" /> Quick Chat</div>
          <div className="simple-feature-item"><Check size={18} className="check-icon" /> See Who Viewed You</div>
          <div className="simple-feature-item"><Check size={18} className="check-icon" /> Private Browsing</div>
          <div className="simple-feature-item"><Check size={18} className="check-icon" /> Priority Visibility</div>
          <div className="simple-feature-item"><Check size={18} className="check-icon" /> Premium Badge</div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
