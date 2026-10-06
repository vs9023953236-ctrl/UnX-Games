import React, { useState } from 'react';
import { User } from '../../types';
import {
  User as UserIcon,
  Phone,
  MapPin,
  Camera,
  X,
  Check,
  Building2,
  Sparkles,
  Gamepad2,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModalPortal } from '../common/ModalPortal';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave: (updatedData: {
    name: string;
    phone: string;
    district: string;
    city: string;
    address: string;
    gamer_id?: string;
    photoURL?: string;
  }) => Promise<void>;
}

const POPULAR_DISTRICTS = [
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Kaski (Pokhara)',
  'Chitwan',
  'Morang (Biratnagar)',
  'Rupandehi (Butwal)',
  'Sunsari (Dharan)',
  'Jhapa',
  'Kavrepalanchok',
  'Dhanusha (Janakpur)',
  'Banke (Nepalgunj)',
  'Baitadi',
  'Kailali (Dhangadhi)',
  'Makwanpur (Hetauda)',
  'Other / Anywhere in Nepal',
];

interface GamerAvatar {
  id: string;
  name: string;
  url: string;
}

const PROFESSIONAL_GAMER_AVATARS: GamerAvatar[] = [
  {
    id: 'samurai_pro',
    name: 'Samurai Pro',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SamuraiPro',
  },
  {
    id: 'phoenix_captain',
    name: 'Phoenix Captain',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=PhoenixCaptain',
  },
  {
    id: 'valkyrie_queen',
    name: 'Valkyrie Queen',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=ValkyrieQueen',
  },
  {
    id: 'apex_titan',
    name: 'Apex Titan',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ApexTitan',
  },
  {
    id: 'viper_elite',
    name: 'Viper Elite',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=ViperElite',
  },
  {
    id: 'cyber_mecha',
    name: 'Cyber Mecha',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=CyberMecha',
  },
  {
    id: 'dragon_ninja',
    name: 'Dragon Ninja',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=DragonNinja',
  },
  {
    id: 'shadow_mystic',
    name: 'Shadow Mystic',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=ShadowMystic',
  },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || currentUser.mobile || '');
  const [gamerId, setGamerId] = useState(currentUser.gamer_id || '');
  const [district, setDistrict] = useState(currentUser.district || 'Kathmandu');
  const [city, setCity] = useState(currentUser.city || '');
  const [address, setAddress] = useState(currentUser.address || currentUser.location || '');
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || PROFESSIONAL_GAMER_AVATARS[0].url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedAvatarObj = PROFESSIONAL_GAMER_AVATARS.find((a) => a.url === photoURL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        district: district.trim(),
        city: city.trim(),
        address: address.trim(),
        gamer_id: gamerId.trim(),
        photoURL: photoURL || currentUser.photoURL,
      });
      onClose();
    } catch {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={99999}>
      <AnimatePresence>
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onClose}
          />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 120 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 120 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl relative z-10 overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <Gamepad2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Edit Gamer Profile
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select your gamer avatar &amp; delivery location
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4.5 flex-1">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* VIP LIVE GAMER CARD PREVIEW */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-red-50 via-white to-orange-50 text-slate-900 border border-red-200 shadow-md relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-red-500 via-orange-500 to-amber-400 shadow-md">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 flex items-center justify-center">
                      <img
                        src={photoURL}
                        alt="Selected Gamer Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                    <Check size={11} className="text-white stroke-[3]" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-800">
                      Gamer Badge
                    </span>
                    <span className="text-[9px] font-black uppercase text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Preview
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 truncate mt-1">
                    {name.trim() || currentUser.name || 'Gamer Nickname'}
                  </h4>
                  <p className="text-xs text-slate-600 font-mono truncate">
                    UID: {gamerId.trim() || currentUser.gamer_id || 'GHN-PRO'} &bull; {district || 'Nepal'}
                  </p>
                </div>
              </div>
            </div>

            {/* PROFESSIONAL GAMER AVATAR SELECTOR */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-red-600" />
                  <span>Choose Gamer Avatar</span>
                </label>
                {selectedAvatarObj && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                    {selectedAvatarObj.name}
                  </span>
                )}
              </div>

              {/* Avatar Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {PROFESSIONAL_GAMER_AVATARS.map((avatar, aIdx) => {
                  const isSelected = photoURL === avatar.url;
                  return (
                    <button
                      key={`avatar-opt-${avatar.id || aIdx}-${aIdx}`}
                      type="button"
                      onClick={() => setPhotoURL(avatar.url)}
                      className={`relative rounded-2xl p-1.5 border-2 transition-all cursor-pointer flex flex-col items-center gap-1 group ${
                        isSelected
                          ? 'border-red-600 bg-white shadow-md ring-3 ring-red-500/25 scale-102'
                          : 'border-slate-200 bg-white hover:border-red-300'
                      }`}
                      title={avatar.name}
                    >
                      <div className="w-13 h-13 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-2xs">
                        <img
                          src={avatar.url}
                          alt={avatar.name}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 truncate w-full text-center block px-0.5">
                        {avatar.name}
                      </span>

                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-800">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="w-11 h-11 absolute left-0 top-0 flex items-center justify-center text-slate-400 pointer-events-none">
                  <UserIcon size={17} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full h-11 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-red-600 rounded-2xl pl-11 pr-4 text-xs sm:text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 transition-all"
                />
              </div>
            </div>

            {/* Mobile Number & Gamer ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  Mobile Number (Nepal)
                </label>
                <div className="relative">
                  <div className="w-11 h-11 absolute left-0 top-0 flex items-center justify-center text-slate-400 pointer-events-none">
                    <Phone size={17} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, ''))}
                    placeholder="98XXXXXXXX"
                    className="w-full h-11 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-red-600 rounded-2xl pl-11 pr-4 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  Default Gamer UID / In-Game ID <span className="text-slate-400 font-normal font-sans">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="w-11 h-11 absolute left-0 top-0 flex items-center justify-center text-slate-400 pointer-events-none">
                    <Gamepad2 size={17} />
                  </div>
                  <input
                    type="text"
                    value={gamerId}
                    onChange={(e) => setGamerId(e.target.value)}
                    placeholder="e.g. 1234567890 (Free Fire/PUBG)"
                    className="w-full h-11 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-red-600 rounded-2xl pl-11 pr-4 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* District & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  District
                </label>
                <div className="relative">
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-red-600 rounded-2xl px-3.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 transition-all cursor-pointer truncate"
                  >
                    {POPULAR_DISTRICTS.map((d, dIdx) => (
                      <option key={`profile-dist-${d}-${dIdx}`} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  City / Area
                </label>
                <div className="relative">
                  <div className="w-11 h-11 absolute left-0 top-0 flex items-center justify-center text-slate-400 pointer-events-none">
                    <Building2 size={17} />
                  </div>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Pokhara, Lakeside"
                    className="w-full h-11 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-red-600 rounded-2xl pl-11 pr-4 text-xs sm:text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-800">
                Street Address / Landmark
              </label>
              <div className="relative">
                <div className="w-11 h-11 absolute left-0 top-0 flex items-center justify-center text-slate-400 pointer-events-none">
                  <MapPin size={17} />
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. New Baneshwor, Ward 10"
                  className="w-full h-11 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-red-600 rounded-2xl pl-11 pr-4 text-xs sm:text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500/20 transition-all"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-600/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={16} className="stroke-[2.5]" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  </ModalPortal>
  );
};
