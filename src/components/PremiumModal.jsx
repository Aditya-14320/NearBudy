import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './PremiumModal.css';

const PremiumModal = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser } = useAppContext();

  if (!isOpen || !currentUser) return null;

  const handleUpgrade = async () => {
    try {
      const durationMs = 30 * 24 * 60 * 60 * 1000; // 1 month

      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, {
        isPremium: true,
        premiumPlan: 'monthly',
        premiumExpiresAt: Date.now() + durationMs
      });
      setCurrentUser(prev => ({
        ...prev,
        isPremium: true,
        premiumPlan: 'monthly',
        premiumExpiresAt: Date.now() + durationMs
      }));
      alert(`✨ Success! You are now a Premium member. Enjoy the exclusive features!`);
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

        <div className="pricing-cards-container" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="pricing-card active" style={{ width: '100%', maxWidth: '250px' }}>
            <span className="pricing-badge popular">Unlock Everything</span>
            <h4>⭐ NearBudy Pro</h4>
            <div className="price-val">₹99</div>
            <span className="price-period">/month</span>
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
