import { useState } from 'react';
import { X, Map, MessageCircle, EyeOff, Crown, ShieldCheck, Sparkles, Check, ArrowLeft, Heart, Zap, Image, ChevronDown } from 'lucide-react';
import { db } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import './PremiumModal.css';

const PremiumModal = ({ 
  isOpen, 
  onClose, 
  onPaymentSuccess,
  customTitle = "CamChat Premium",
  customSubtitle = "Supercharge your connections and stand out."
}) => {
  const { currentUser, setCurrentUser } = useAppContext();
  
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'
  const [checkoutState, setCheckoutState] = useState('idle'); // 'idle' | 'google-play-billing' | 'processing' | 'success'
  const [checkoutStepText, setCheckoutStepText] = useState('');

  if (!isOpen || !currentUser) return null;

  const plans = [
    {
      id: 'weekly',
      name: 'Weekly',
      durationText: '7 Days',
      price: 99,
      period: 'week',
      tag: null,
      benefits: [
        "Blue Verified Badge",
        "Unlimited connection requests",
        "See who viewed your profile",
        "See who waved at you",
        "Advanced filters (Age, Distance, Interests)",
        "Incognito (Ghost Mode)",
        "No ads & standard support"
      ]
    },
    {
      id: 'monthly',
      name: 'Monthly',
      durationText: '30 Days',
      price: 299,
      period: 'month',
      tag: "MOST POPULAR",
      benefits: [
        "Everything in Weekly plus:",
        "2 Profile Boosts per month",
        "Priority appearance in Nearby Radar",
        "Priority in dashboard suggestions",
        "Exclusive chat wallpapers themes"
      ]
    },
    {
      id: 'yearly',
      name: 'Yearly',
      durationText: '365 Days',
      price: 1999,
      period: 'year',
      tag: "BEST VALUE",
      benefits: [
        "Everything in Monthly plus:",
        "1 Profile Boost every single week",
        "Premium golden profile frames",
        "Premium gold supporter badge next to name",
        "Exclusive seasonal profile themes",
        "Early access to new features"
      ]
    }
  ];

  const activePlanDetails = plans.find(p => p.id === selectedPlan) || plans[1];

  const handleStartCheckout = () => {
    setCheckoutState('google-play-billing');
  };

  const handlePaymentSuccessFlow = async () => {
    setCheckoutState('processing');
    
    // Simulate secure Google Play Billing authorization steps
    const steps = [
      "Connecting to Google Play Billing API...",
      "Verifying mock G Pay transaction...",
      "Registering secure in-app subscription...",
      "Updating account details..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setCheckoutStepText(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
      const now = Date.now();
      let durationMs = 0;
      if (selectedPlan === 'weekly') durationMs = 7 * 24 * 60 * 60 * 1000;
      else if (selectedPlan === 'monthly') durationMs = 30 * 24 * 60 * 60 * 1000;
      else if (selectedPlan === 'yearly') durationMs = 365 * 24 * 60 * 60 * 1000;

      const startIso = new Date().toISOString();
      const expiresIso = new Date(now + durationMs).toISOString();
      const userRef = doc(db, "users", currentUser.id);

      // Save boosts remaining based on selected tier
      let boosts = 0;
      if (selectedPlan === 'monthly') boosts = 2;
      else if (selectedPlan === 'yearly') boosts = 4;

      // 1. Update Firestore user doc with exact required schema fields
      await updateDoc(userRef, {
        isPremium: true,
        premiumPlan: selectedPlan,
        premiumStart: startIso,
        premiumExpiresAt: expiresIso,
        boostsRemaining: boosts
      });

      // 2. Update React local app context state
      setCurrentUser(prev => ({
        ...prev,
        isPremium: true,
        premiumPlan: selectedPlan,
        premiumStart: startIso,
        premiumExpiresAt: expiresIso,
        boostsRemaining: boosts
      }));

      // 3. Trigger callback if provided
      if (onPaymentSuccess) {
        onPaymentSuccess(expiresIso, selectedPlan);
      }

      setCheckoutState('success');
      
      // Auto close modal after showing success animation
      setTimeout(() => {
        setCheckoutState('idle');
        onClose();
      }, 2000);

    } catch (err) {
      console.error("Subscription upgrade failed:", err);
      setCheckoutState('idle');
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={checkoutState === 'idle' ? onClose : undefined}>
      <div className="premium-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        
        {/* Close button for idle screen */}
        {checkoutState === 'idle' && (
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        )}

        {checkoutState === 'idle' && (
          <>
            <div className="modal-header">
              <div className="premium-badge-large">
                <Crown size={14} className="crown-icon-spin" /> PRO MEMBER
              </div>
              <h2>{customTitle}</h2>
              <p>{customSubtitle}</p>
            </div>

            {/* Dynamic Benefits list depending on selected Plan Card */}
            <div className="benefits-list-new tiered-benefits">
              <h4 className="benefits-title">INCLUDED IN {activePlanDetails.name.toUpperCase()}:</h4>
              <div className="benefits-grid-box">
                {activePlanDetails.benefits.map((benefit, idx) => (
                  <div key={idx} className="benefit-item-new tiered-item">
                    <Check size={16} className="benefit-check-green" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pricing-options-row">
              {plans.map(plan => (
                <div 
                  key={plan.id} 
                  className={`price-card-box ${selectedPlan === plan.id ? 'active' : ''} ${plan.tag ? 'has-tag' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.tag && (
                    <span className={`popular-ribbon ${plan.id === 'yearly' ? 'best-value' : ''}`}>
                      {plan.tag}
                    </span>
                  )}
                  <span className="plan-name-label">{plan.name}</span>
                  <span className="plan-duration-tag">{plan.durationText}</span>
                  <div className="plan-price-value">
                    <span className="currency-symbol">₹</span>
                    {plan.price}
                  </div>
                </div>
              ))}
            </div>

            <button className="upgrade-checkout-btn" onClick={handleStartCheckout}>
              <Sparkles size={18} /> Get Premium
            </button>
          </>
        )}

        {checkoutState === 'google-play-billing' && (
          <div className="google-play-billing-sheet animate-slide-up">
            {/* Google Play Bottom Modal Simulation */}
            <div className="play-header-row">
              <div className="play-store-brand">
                <span className="play-triangle">▲</span>
                <span className="play-brand-text">Google Play</span>
              </div>
              <button className="play-close-btn" onClick={() => setCheckoutState('idle')}>
                <X size={16} />
              </button>
            </div>

            <div className="play-account-selector">
              <div className="account-details-row">
                <div className="account-avatar-small">A</div>
                <div className="account-info-text">
                  <span className="account-email">{currentUser.email || "student.budy@gmail.com"}</span>
                  <span className="account-provider">Google Play Balance & Cards</span>
                </div>
              </div>
              <ChevronDown size={14} className="play-chevron" />
            </div>

            <hr className="play-divider" />

            <div className="play-product-summary">
              <div className="product-text">
                <h4>NearBudy Premium: {activePlanDetails.name} Sub</h4>
                <p className="product-auto-renew-info">Auto-renews at ₹{activePlanDetails.price}/{activePlanDetails.period}. Cancel anytime on Play Store.</p>
              </div>
              <div className="product-pricing-box">
                <div className="current-price">₹{activePlanDetails.price}.00</div>
                <div className="tax-info">plus applicable taxes</div>
              </div>
            </div>

            <hr className="play-divider" />

            <div className="play-payment-method">
              <div className="method-left-row">
                <div className="gpay-logo-capsule">G Pay</div>
                <span className="card-mask-text">Visa •••• 4321</span>
              </div>
              <span className="method-change-link">Edit</span>
            </div>

            <button className="google-play-subscribe-btn" onClick={handlePaymentSuccessFlow}>
              Subscribe
            </button>

            <p className="play-terms-footer">
              By tapping 'Subscribe', you agree to Google Play's Terms of Service and authorize auto-recurring payments.
            </p>
          </div>
        )}

        {checkoutState === 'processing' && (
          <div className="checkout-processing-view">
            <div className="checkout-spinner"></div>
            <h3>Processing Billing</h3>
            <p className="checkout-step-text">{checkoutStepText}</p>
            <p className="secure-tag-sub">🔒 Secure Google Play Payment Gateway</p>
          </div>
        )}

        {checkoutState === 'success' && (
          <div className="checkout-success-view">
            <div className="success-glowing-circle">
              <Check size={36} strokeWidth={3} className="check-success" />
            </div>
            <h3>Premium Activated!</h3>
            <p>Welcome to NearBudy Premium. Subscription starts today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumModal;
