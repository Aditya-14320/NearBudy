import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Sparkles, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { INDIA_STATES } from '../utils/locations';
import { AVATAR_PRESETS, getDefaultAvatar } from '../utils/avatars';
import { uploadToCloudinary } from '../utils/cloudinary';
import './ProfileSetup.css';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setCurrentUser, checkUsernameUnique } = useAppContext();
  
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, taken, available
  const [suggestions, setSuggestions] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    dob: '',
    gender: 'Male',
    state: '',
    city: '',
    lat: null,
    lng: null
  });
  
  const [photo, setPhoto] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Pre-fill for Google users
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const baseName = user.displayName || '';
      const baseUsername = baseName ? baseName.toLowerCase().replace(/[^a-z0-9_]/gi, '') + Math.floor(100 + Math.random() * 899) : '';
      
      setFormData(prev => ({
        ...prev,
        name: baseName,
        username: baseUsername
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

  const handleStateChange = (e) => {
    setFormData(prev => ({ ...prev, state: e.target.value, city: '' }));
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

  const handleFinish = async () => {
    if (!formData.name.trim() || usernameStatus !== 'available' || !formData.state || !formData.dob) {
      alert("Please complete all required fields correctly.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        let coords = { lat: 28.6304, lng: 77.2177 };
        try {
          const gps = await getLocation();
          if (gps) coords = gps;
        } catch (e) {
          console.log("Could not auto-fetch location", e);
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
          dob: formData.dob,
          gender: formData.gender,
          state: formData.state,
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

  // State options
  const stateOptions = Object.keys(INDIA_STATES);

  return (
    <div className="onboarding-container animate-fade-in" style={{ padding: '20px 0' }}>
      <div className="onboarding-card glass-morphism animate-slide-up" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
        
        <div className="step-header">
          <h2>Create Your Profile</h2>
          <p>Let's get you set up to meet people nearby.</p>
        </div>

        <div className="step-content" style={{ marginTop: '20px' }}>
          {/* Profile Photo */}
          <div className="input-group-premium" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="main-photo-preview" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer', marginBottom: '10px' }}>
              {photo ? <img src={photo} alt="Preview" /> : <Camera size={40} />}
              <div className="camera-badge"><Camera size={14} /></div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" hidden />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tap to change photo</span>
          </div>

          <div className="input-group-premium">
            <label>Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Your full name"
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

          <div className="input-group-premium">
            <label>Date of Birth</label>
            <input 
              type="date" 
              name="dob" 
              value={formData.dob} 
              onChange={handleChange} 
              className="premium-input"
            />
          </div>

          <div className="input-group-premium">
            <label>Gender</label>
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

          <div className="input-group-premium">
            <label>State</label>
            <select 
              name="state" 
              value={formData.state} 
              onChange={handleStateChange}
              className="premium-input"
              style={{ appearance: 'none', background: 'var(--bg-tertiary)' }}
            >
              <option value="">Select State</option>
              {stateOptions.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="input-group-premium">
            <label>City (Optional)</label>
            <input 
              type="text"
              name="city" 
              value={formData.city} 
              onChange={handleChange}
              placeholder="e.g. Mumbai, Delhi"
              className="premium-input"
            />
          </div>

        </div>

        <div className="onboarding-footer" style={{ marginTop: '30px' }}>
          <button 
            className="btn-finish" 
            onClick={handleFinish} 
            disabled={loading || !formData.name.trim() || usernameStatus !== 'available' || !formData.state || !formData.dob}
            style={{ width: '100%', margin: 0 }}
          >
            {loading ? 'Saving...' : 'Continue'} <Sparkles size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
