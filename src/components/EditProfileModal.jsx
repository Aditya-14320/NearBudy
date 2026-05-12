import { useState, useRef, useEffect } from 'react';
import { X, Check, Camera, Eye } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import ProfilePreviewModal from './ProfilePreviewModal';
import { AVATAR_PRESETS } from '../utils/avatars';
import './EditProfileModal.css';

const EditProfileModal = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser } = useAppContext();
  
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    age: '',
    bio: '',
    interests: [],
    gender: '',
    avatar: '',
    ghostMode: false
  });
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [interestInput, setInterestInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      // Restore from draft or DB
      const draft = localStorage.getItem(`draft_${currentUser.id}`);
      setTimeout(() => {
        if (draft) {
          setFormData(JSON.parse(draft));
        } else {
          setFormData({
            name: currentUser.name || '',
            profession: currentUser.profession || '',
            age: currentUser.age || '',
            bio: currentUser.bio || '',
            interests: currentUser.interests ? currentUser.interests.split(',').map(i=>i.trim()).filter(Boolean) : [],
            gender: currentUser.gender || '',
            avatar: currentUser.avatar || '',
            ghostMode: currentUser.ghostMode || false
          });
        }
      }, 0);
    }
  }, [isOpen, currentUser]);

  // Auto-save draft
  useEffect(() => {
    if (isOpen && currentUser && formData.name) {
      localStorage.setItem(`draft_${currentUser.id}`, JSON.stringify(formData));
    }
  }, [formData, isOpen, currentUser]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
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

  const removeInterest = (indexToRemove) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((_, idx) => idx !== indexToRemove)
    });
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get compressed base64 string (JPEG, 70% quality)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, avatar: compressedBase64 }));
          setUploadingImage(false);
        };
      };
    } catch (err) {
      console.error("Compression failed", err);
      alert("Image processing failed.");
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.profession || !formData.age) {
      alert("Please fill required fields (Name, Profession, Age)");
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        interests: formData.interests.join(', ') // Convert array to comma-string for DB
      };
      
      await updateDoc(doc(db, "users", currentUser.id), dataToSave);
      
      setCurrentUser(prev => ({
        ...prev,
        ...dataToSave
      }));
      
      localStorage.removeItem(`draft_${currentUser.id}`);
      
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate completion
  const requiredFields = [formData.name, formData.avatar, formData.bio, formData.profession, formData.age, formData.interests.length > 0, formData.gender];
  const filledFields = requiredFields.filter(Boolean).length;
  const completionPercentage = Math.round((filledFields / requiredFields.length) * 100);

  // Mock user object for Preview Profile
  const previewUser = {
    ...currentUser,
    ...formData,
    interests: formData.interests.join(', '),
    id: currentUser.id,
    isMock: true // Prevents actual tracking/waving in preview
  };

  return (
    <>
      <div className="edit-overlay animate-fade-in" onClick={onClose}>
        <div className="edit-modal full-screen animate-slide-up" onClick={e => e.stopPropagation()}>
          
          {showToast && (
            <div className="toast-message">
              <Check size={18} /> Profile Updated
            </div>
          )}

          <div className="edit-header">
            <h2>Edit Profile</h2>
            <button className="icon-btn close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className="profile-progress-container">
            <div className="progress-header">
              <span>Profile Strength</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
            </div>
          </div>

          <div className="edit-content">
            <form className="edit-form" onSubmit={handleSave}>
              
              <h3 className="section-title">👤 Basic Info</h3>
              
              <div className="avatar-upload-container">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageSelect} 
                  accept="image/*" 
                  hidden 
                />
                <div className="avatar-preview-wrapper" onClick={() => fileInputRef.current.click()}>
                  <img src={formData.avatar || 'https://via.placeholder.com/150'} alt="Avatar" />
                  <div className="camera-icon-badge">
                    {uploadingImage ? <div className="spinner" style={{width: 16, height: 16, borderWidth: 2}}></div> : <Camera size={16} />}
                  </div>
                </div>
                <p style={{fontSize: 12, color: 'var(--text-secondary)'}}>Tap to change photo</p>
                
                <div className="avatar-presets-edit animate-fade-in">
                  <p className="preset-label">Or choose a character</p>
                  <div className="presets-grid-edit">
                    {[...AVATAR_PRESETS.male, ...AVATAR_PRESETS.female, ...AVATAR_PRESETS.neutral].map((url, i) => (
                      <div 
                        key={i} 
                        className={`preset-item-edit ${formData.avatar === url ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, avatar: url }))}
                      >
                        <img src={url} alt="preset" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  name="name"
                  className="input-field" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label>
                  <span>Bio / About Me</span>
                  <span className="char-counter">{formData.bio.length}/120</span>
                </label>
                <textarea 
                  name="bio"
                  className="input-field textarea-field" 
                  placeholder="Tell others about yourself..."
                  value={formData.bio}
                  onChange={handleChange}
                  maxLength={120}
                />
              </div>

              <h3 className="section-title">💼 Work & Age Info</h3>

              <div className="form-row">
                <div className="input-group flex-1">
                  <label>Age *</label>
                  <input 
                    type="number" 
                    name="age"
                    className="input-field" 
                    placeholder="e.g. 21"
                    value={formData.age}
                    onChange={handleChange}
                    required
                    min="13"
                    max="120"
                  />
                </div>

                <div className="input-group flex-1">
                  <label>Profession *</label>
                  <input 
                    type="text" 
                    name="profession"
                    className="input-field" 
                    placeholder="e.g. Student, SDE"
                    value={formData.profession}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <h3 className="section-title">🎭 Personal</h3>

              <div className="input-group">
                <label>Interests / Tags</label>
                <div className="chips-container">
                  {formData.interests.map((interest, idx) => (
                    <div key={idx} className="interest-chip">
                      {interest}
                      <X size={14} className="chip-remove" onClick={() => removeInterest(idx)} />
                    </div>
                  ))}
                </div>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Type an interest and press Enter"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                />
              </div>

              <div className="input-group">
                <label>Gender</label>
                <select 
                  name="gender" 
                  className="input-field" 
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender (Optional)</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <h3 className="section-title">📍 Privacy</h3>

              <div className="input-group toggle-group">
                <div className="toggle-label">
                  <h4>Hide from Nearby</h4>
                  <p>People nearby won't see your profile.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="ghostMode" 
                    checked={formData.ghostMode} 
                    onChange={handleChange} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              <div className="action-buttons-row">
                <button type="button" className="btn-preview" onClick={() => setShowPreview(true)}>
                  <Eye size={20} /> Preview
                </button>
                <button type="submit" className="btn-primary" disabled={loading || uploadingImage}>
                  {loading ? <div className="spinner"></div> : <><Check size={20} /> Save</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ProfilePreviewModal 
        user={previewUser}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </>
  );
};

export default EditProfileModal;
