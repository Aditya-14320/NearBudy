import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { AVATAR_PRESETS, getDefaultAvatar } from '../utils/avatars';
import { uploadToCloudinary } from '../utils/cloudinary';
import './ProfileSetup.css';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setCurrentUser } = useAppContext();
  
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    age: '',
    gender: ''
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Auto-update avatar if it's currently a default one
      if (name === 'gender' && (!photo || Object.values(AVATAR_PRESETS).flat().includes(photo))) {
        setPhoto(getDefaultAvatar(value));
      }
      return newData;
    });
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target.result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 28.6304, lng: 77.2177 }); // Default fallback
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve({ lat: 28.6304, lng: 77.2177 }), // Fallback on deny
        { timeout: 5000 }
      );
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.profession || !formData.age || !formData.gender) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const coords = await getLocation();
        
        let finalAvatar = photo || getDefaultAvatar(formData.gender);
        
        // Only upload to Cloudinary if it's a custom photo (base64) 
        // and NOT one of our local preset URLs
        const isPreset = Object.values(AVATAR_PRESETS).flat().includes(photo);
        if (photo && !isPreset) {
          try {
            finalAvatar = await uploadToCloudinary(photo);
          } catch (uploadError) {
            console.error("Cloudinary upload failed, falling back to local photo", uploadError);
            // Fallback to whatever was in photo, or a default
          }
        }
        
        const userData = {
          id: user.uid,
          name: formData.name,
          profession: formData.profession,
          age: parseInt(formData.age, 10),
          gender: formData.gender,
          avatar: finalAvatar,
          isPremium: false,
          lat: coords.lat,
          lng: coords.lng
        };
        // Save to Firestore
        await setDoc(doc(db, "users", user.uid), userData);
        
        // Update AppContext
        if (setCurrentUser) {
          setCurrentUser(userData);
        }
      }
      navigate('/home');
    } catch (err) {
      console.error("Detailed Error saving profile: ", err);
      if (err.code === 'resource-exhausted') {
        alert("Failed to save profile: Image size too large.");
      } else {
        alert("Failed to save profile. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-container animate-fade-in">
      <div className="header animate-slide-up">
        <h2>Complete Profile</h2>
        <p>Let others know who you are.</p>
      </div>

      <div className="photo-upload-section animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="photo-circle" onClick={handlePhotoClick}>
          {photo ? (
            <img src={photo} alt="Profile" className="profile-preview" />
          ) : (
            <Camera size={32} className="camera-icon" />
          )}
          <div className="photo-glow"></div>
        </div>
        <span className="photo-label">Tap to upload custom</span>
        
        <div className="avatar-presets-container animate-slide-up">
          <p className="preset-title">Or choose a character</p>
          <div className="presets-grid">
            {[...AVATAR_PRESETS.male, ...AVATAR_PRESETS.female, ...AVATAR_PRESETS.neutral].map((url, i) => (
              <div 
                key={i} 
                className={`preset-item ${photo === url ? 'selected' : ''}`}
                onClick={() => setPhoto(url)}
              >
                <img src={url} alt="preset" />
              </div>
            ))}
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handlePhotoChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
      </div>

      <form className="profile-form animate-slide-up" style={{ animationDelay: '0.2s' }} onSubmit={handleSave}>
        <div className="input-group">
          <label>Full Name</label>
          <input 
            type="text" 
            name="name"
            className="input-field" 
            placeholder="e.g. John Doe" 
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>Profession</label>
          <input 
            type="text" 
            name="profession"
            className="input-field" 
            placeholder="e.g. Student, Software Engineer" 
            value={formData.profession}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>Age</label>
          <input 
            type="number" 
            name="age"
            className="input-field" 
            placeholder="e.g. 21" 
            value={formData.age}
            onChange={handleChange}
            min="13"
            max="120"
          />
        </div>

        <div className="input-group">
          <label>Gender</label>
          <select 
            name="gender" 
            className="input-field select-field" 
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="" disabled>Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>
        
        <button type="submit" className="btn-primary" style={{ marginTop: '24px', marginBottom: '24px' }} disabled={loading}>
          {loading ? 'Saving...' : 'Finish Setup'} <Check size={20} />
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;
