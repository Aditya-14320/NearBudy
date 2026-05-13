import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import './Policy.css';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container animate-fade-in">
      <div className="legal-header">
        <button onClick={() => navigate(-1)} className="icon-btn-transparent">
          <ArrowLeft size={24} />
        </button>
        <div className="header-title">
          <Shield className="header-icon" size={20} />
          <h2>Privacy Policy</h2>
        </div>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="legal-content animate-slide-up">
        <section>
          <h3>1. Information We Collect</h3>
          <p>We collect information you provide directly to us when you create an account, such as your name, age, gender, profession, and profile photo. We also collect location data to provide nearby discovery features.</p>
        </section>

        <section>
          <h3>2. How We Use Information</h3>
          <p>We use the information to connect you with nearby users, personalize your experience, and ensure a safe environment. Your precise location is used to show your distance to others on the radar map.</p>
        </section>

        <section>
          <h3>3. Data Sharing</h3>
          <p>We do not sell your personal data. Your profile information (name, avatar, distance) is visible to other users of the app to facilitate social interaction.</p>
        </section>

        <section>
          <h3>4. Safety and Security</h3>
          <p>We implement security measures to protect your data. You can block or report users who violate our community guidelines at any time.</p>
        </section>

        <section>
          <h3>5. Changes to This Policy</h3>
          <p>We may update this policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
        </section>

        <div className="last-updated">Last Updated: May 13, 2026</div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
