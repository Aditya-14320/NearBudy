import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, ChevronRight, ChevronLeft, User, AtSign, Briefcase, Heart, Sparkles, AlertCircle, MapPin } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { AVATAR_PRESETS, getDefaultAvatar } from '../utils/avatars';
import { uploadToCloudinary } from '../utils/cloudinary';
import './ProfileSetup.css';

const calculateAge = (dobString) => {
  if (!dobString) return 0;
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setCurrentUser, checkUsernameUnique } = useAppContext();
  
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, taken, available
  const [suggestions, setSuggestions] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, loading, success, error
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    profession: '',
    dob: '',
    gender: '',
    bio: '',
    interests: [],
    city: '',
    lat: null,
    lng: null,
    agreeToTerms: true
  });
  const [photo, setPhoto] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [interestInput, setInterestInput] = useState('');

  // Pre-fill for Google users or Guests
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || '',
        username: user.displayName ? user.displayName.toLowerCase().replace(/\s+/g, '') : ''
      }));
      if (user.photoURL) {
        setPhoto(user.photoURL);
      }
    }
  }, []);

  // Username validation & suggestions
  useEffect(() => {
    if (formData.username.length > 2) {
      const timer = setTimeout(async () => {
        setUsernameStatus('checking');
        const isUnique = await checkUsernameUnique(formData.username);
        setUsernameStatus(isUnique ? 'available' : 'taken');
        
        if (!isUnique) {
          const base = formData.username;
          setSuggestions([
            `${base}${Math.floor(10 + Math.random() * 89)}`,
            `${base}_${Math.floor(100 + Math.random() * 899)}`,
            `the${base}`
          ]);
        } else {
          setSuggestions([]);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setUsernameStatus('idle');
      setSuggestions([]);
    }
  }, [formData.username, checkUsernameUnique]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = interestInput.trim();
      if (val && !formData.interests.includes(val)) {
        setFormData({ ...formData, interests: [...formData.interests, val] });
        setInterestInput('');
      }
    }
  };

  const removeInterest = (idx) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((_, i) => i !== idx)
    });
  };

  const handlePhotoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target.result);
        setUploadingImage(false);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 28.6304, lng: 77.2177 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve({ lat: 28.6304, lng: 77.2177 }),
        { timeout: 5000 }
      );
    });
  };

  const handleGpsFetch = async () => {
    setGpsLoading(true);
    setGpsStatus('loading');
    try {
      if (!navigator.geolocation) {
        setGpsStatus('error');
        setGpsLoading(false);
        alert("Geolocation is not supported by your browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          setGpsStatus('success');
          setGpsLoading(false);
        },
        (error) => {
          console.error("GPS fetch error:", error);
          setGpsStatus('error');
          setGpsLoading(false);
          alert("Failed to get your location. Please check your GPS permission.");
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } catch (err) {
      console.error(err);
      setGpsStatus('error');
      setGpsLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        let coords = { lat: formData.lat || 28.6304, lng: formData.lng || 77.2177 };
        
        // If GPS coordinate is not explicitly set, try to get it
        if (!formData.lat || !formData.lng) {
          try {
            const gps = await getLocation();
            if (gps) {
              coords = gps;
            }
          } catch (e) {
            console.log("Could not auto-fetch location on finish", e);
          }
        }

        let finalAvatar = photo || getDefaultAvatar(formData.gender);
        
        const isPreset = Object.values(AVATAR_PRESETS).flat().includes(photo);
        if (photo && !isPreset && photo.startsWith('data:image')) {
          try {
            finalAvatar = await uploadToCloudinary(photo);
          } catch (e) { console.error(e); }
        }
        
        const referralCode = `NB${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const userData = {
          id: user.uid,
          name: formData.name,
          username: formData.username.toLowerCase(),
          profession: formData.profession || '',
          age: calculateAge(formData.dob),
          dob: formData.dob || '',
          gender: formData.gender || '',
          bio: formData.bio || '',
          interests: formData.interests.join(', '),
          city: formData.city,
          avatar: finalAvatar,
          isPremium: false,
          isGuest: user.isAnonymous,
          referralCode: referralCode,
          lat: coords.lat,
          lng: coords.lng,
          onboardingCompleted: true,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, "users", user.uid), userData);
        setCurrentUser(userData);
        navigate('/home');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 0 && (!formData.name.trim() || usernameStatus !== 'available')) return;
    if (step === 2 && !formData.city.trim()) return;
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const steps = [
    { title: "Who are you?", icon: <User size={24} /> },
    { title: "The Basics", icon: <Sparkles size={24} /> },
    { title: "Location", icon: <MapPin size={24} /> },
    { title: "Profession & Bio", icon: <Briefcase size={24} /> },
    { title: "Profile Picture", icon: <Camera size={24} /> }
  ];

  return (
    <div className="onboarding-container animate-fade-in">
      <div className="onboarding-progress">
        {steps.map((_, i) => (
          <div key={i} className={`progress-dot ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`} />
        ))}
      </div>

      <div className="onboarding-card glass-morphism animate-slide-up">
        <div className="step-header">
          <div className="step-icon-bg">{steps[step].icon}</div>
          <h2>{steps[step].title}</h2>
          <p>Step {step + 1} of {steps.length}</p>
        </div>

        <div className="step-content">
          {step === 0 && (
            <div className="animate-fade-in">
              <div className="input-group-premium">
                <label>Display Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="Your real name or nickname"
                  className="premium-input"
                />
              </div>
              <div className="input-group-premium">
                <label>Username</label>
                <div className="username-input-wrapper">
                  <span className="at-symbol">@</span>
                  <input 
                    type="text" 
                    name="username" 
                    value={formData.username} 
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase() }))} 
                    placeholder="unique_handle"
                    className={`premium-input ${usernameStatus === 'taken' ? 'error' : ''} ${usernameStatus === 'available' ? 'success' : ''}`}
                  />
                </div>
                {usernameStatus === 'checking' && <p className="status-text">Checking availability...</p>}
                {usernameStatus === 'taken' && (
                  <div className="suggestions-box animate-fade-in">
                    <p className="error-text"><AlertCircle size={14} /> Username already taken</p>
                    <div className="suggestion-chips">
                      {suggestions.map(s => (
                        <span key={s} className="suggestion-chip" onClick={() => setFormData(prev => ({ ...prev, username: s }))}>@{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {usernameStatus === 'available' && <p className="success-text">Username is available! ✨</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in">
              <div className="input-group-premium">
                <label>Date of Birth (Optional)</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={formData.dob} 
                  onChange={handleChange} 
                  className="premium-input"
                />
              </div>
              <div className="input-group-premium">
                <label>Gender (Optional)</label>
                <div className="gender-grid">
                  {['Male', 'Female', 'Other'].map(g => (
                    <div 
                      key={g} 
                      className={`gender-option ${formData.gender === g ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                    >
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="input-group-premium">
                <label>City / Town (Required)</label>
                <input 
                  type="text" 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  placeholder="e.g. New Delhi, San Francisco"
                  className="premium-input"
                />
              </div>
              <div className="gps-section">
                <button 
                  type="button" 
                  className={`btn-gps ${gpsStatus === 'success' ? 'success' : ''}`} 
                  onClick={handleGpsFetch}
                  disabled={gpsLoading}
                >
                  <MapPin size={18} /> {gpsLoading ? 'Fetching GPS...' : gpsStatus === 'success' ? 'GPS Location Enabled' : 'Enable GPS Location'}
                </button>
                <p className="gps-hint">Precise GPS coordinates are used to find nearby buddies.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <div className="input-group-premium">
                <label>Profession or College (Optional)</label>
                <input 
                  type="text" 
                  name="profession" 
                  value={formData.profession} 
                  onChange={handleChange} 
                  placeholder="e.g. Software Engineer, College Student"
                  className="premium-input"
                />
              </div>
              <div className="input-group-premium">
                <label>Bio (Optional)</label>
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  placeholder="Tell us a bit about yourself..."
                  className="premium-input textarea"
                  maxLength={120}
                />
              </div>
              <div className="input-group-premium">
                <label>Interests (Optional)</label>
                <div className="interest-chips">
                  {formData.interests.map((it, idx) => (
                    <span key={idx} className="interest-chip">
                      {it} <X size={14} onClick={() => removeInterest(idx)} />
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  placeholder="Add interest & press Enter"
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in center">
              <div className="photo-picker-container">
                <div className="main-photo-preview" onClick={() => fileInputRef.current.click()}>
                  {photo ? <img src={photo} alt="Preview" /> : <Camera size={40} />}
                  <div className="camera-badge"><Sparkles size={16} /></div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" hidden />
                
                <p className="picker-hint">Or choose an avatar</p>
                <div className="avatar-grid-premium">
                  {[...AVATAR_PRESETS.male, ...AVATAR_PRESETS.female].slice(0, 8).map((url, i) => (
                    <div 
                      key={i} 
                      className={`avatar-item-premium ${photo === url ? 'active' : ''}`}
                      onClick={() => setPhoto(url)}
                    >
                      <img src={url} alt="avatar" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          {step > 0 && (
            <button className="btn-back" onClick={prevStep}>
              <ChevronLeft size={20} /> Back
            </button>
          )}
          
          {(step === 1 || step === 3 || step === 4) && (
             <button className="btn-skip" onClick={step === 4 ? handleFinish : nextStep}>
               Skip
             </button>
          )}

          {step < steps.length - 1 ? (
            <button 
              className="btn-next" 
              onClick={nextStep} 
              disabled={
                (step === 0 && (!formData.name.trim() || usernameStatus !== 'available')) ||
                (step === 2 && !formData.city.trim())
              }
            >
              Continue <ChevronRight size={20} />
            </button>
          ) : (
            <button className="btn-finish" onClick={handleFinish} disabled={loading}>
              {loading ? 'Finalizing...' : 'Get Started'} <Sparkles size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const X = ({ size, onClick }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    onClick={onClick}
    style={{ cursor: 'pointer' }}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default ProfileSetup;
