import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import './Policy.css'; // Reusing the same styles

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container animate-fade-in">
      <div className="legal-header">
        <button onClick={() => navigate(-1)} className="icon-btn-transparent">
          <ArrowLeft size={24} />
        </button>
        <div className="header-title">
          <FileText className="header-icon" size={20} />
          <h2>Terms & Conditions</h2>
        </div>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="legal-content animate-slide-up">
        <section>
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing or using NearBudy, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the app.</p>
        </section>

        <section>
          <h3>2. Eligibility</h3>
          <p>You must be at least 18 years old to use NearBudy. By using the app, you represent and warrant that you are 18 or older.</p>
        </section>

        <section>
          <h3>3. Community Guidelines</h3>
          <p>You agree not to use the app for any unlawful purpose or to harass, threaten, or impersonate others. Any user-generated content must comply with our community standards.</p>
        </section>

        <section>
          <h3>4. Content Moderation</h3>
          <p>NearBudy reserves the right to monitor and remove any content that violates these terms. Users who repeatedly violate the terms may be banned from the platform.</p>
        </section>

        <section>
          <h3>5. Limitation of Liability</h3>
          <p>NearBudy is provided "as is". We are not responsible for the actions of our users or any damages resulting from your use of the app.</p>
        </section>

        <div className="last-updated">Last Updated: May 13, 2026</div>
      </div>
    </div>
  );
};

export default Terms;
