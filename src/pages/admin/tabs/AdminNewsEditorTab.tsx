import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { uploadImage } from '../../../services/api';
import { AppBackButton } from '../../../components/common/AppBackButton';
import { ArrowLeft, Save, Upload, Newspaper } from 'lucide-react';

export const AdminNewsEditorTab: React.FC = () => {
  const {
    news,
    addNews,
    updateNews,
    adminSelectedNewsId,
    setAdminTab,
    setAdminSelectedNewsId,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const isEditing = Boolean(adminSelectedNewsId);
  const existingArticle = news.find((n) => n.id === adminSelectedNewsId);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('announcements');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [published, setPublished] = useState(true);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title);
      setCategory(existingArticle.category || 'announcements');
      setDescription(existingArticle.description || existingArticle.summary || '');
      setContent(existingArticle.content || existingArticle.description || '');
      setImage(existingArticle.image || existingArticle.image_url || '');
      setPublished(existingArticle.published !== false);
    } else {
      setTitle('');
      setCategory('announcements');
      setDescription('');
      setContent('');
      setImage('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800');
      setPublished(true);
    }
  }, [existingArticle]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    try {
      const url = await uploadImage(file, 'news', (pct) => setUploadProgress(pct));
      setImage(url);
      setUploadProgress(null);
      showToast('success', 'Image Uploaded', 'Article banner uploaded to Cloudflare R2 Storage.');
    } catch (err: any) {
      setUploadProgress(null);
      showToast('error', 'Upload Failed', err.message || 'Could not upload banner.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('error', 'Validation Error', 'Article title is required.');
      return;
    }

    setSaving(true);
    const adminInfo = currentUser
      ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
      : undefined;

    const payload = {
      title: title.trim(),
      category,
      description: description.trim(),
      content: content.trim() || description.trim(),
      image: image.trim() || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
      published,
    };

    if (isEditing && existingArticle) {
      await updateNews(existingArticle.id, payload, adminInfo);
    } else {
      await addNews(payload, adminInfo);
    }

    setSaving(false);
    setAdminSelectedNewsId(null);
    setAdminTab('news');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <AppBackButton
            onClick={() => {
              setAdminSelectedNewsId(null);
              setAdminTab('news');
            }}
            variant="circular"
            size="md"
            title="Back to News List"
          />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900">
              {isEditing ? 'Edit News Article' : 'Write News Article'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {isEditing ? 'Update article details.' : 'Compose an update or promo announcement for gamers.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAdminSelectedNewsId(null);
              setAdminTab('news');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : isEditing ? 'Update' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* 2. Editor Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Article Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Free Fire OB45 Patch Update & Special Top-Up Discounts"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-red-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-red-600 transition-all font-medium"
              >
                <option value="announcements">Announcements &amp; Notices</option>
                <option value="offers">Offers &amp; Promos</option>
                <option value="game-updates">Game Updates &amp; Patches</option>
                <option value="maintenance">Maintenance &amp; Service</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Publishing Status</label>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 accent-red-600 focus:ring-0"
                  />
                  <span>Publish immediately to customer storefront</span>
                </label>
              </div>
            </div>
          </div>

          {/* Banner Image */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700">Article Banner Image</label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              {image ? (
                <img
                  src={image}
                  alt="Banner preview"
                  className="w-32 h-20 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                />
              ) : (
                <div className="w-32 h-20 rounded-xl bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                  No Banner
                </div>
              )}

              <div className="space-y-2 flex-1 w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
                {uploadProgress !== null && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-600 to-orange-600 h-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700">Short Summary / Subtitle</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief 1-2 sentence preview summary..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-red-600 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Full Content / Body</label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full announcement details, terms, date schedules..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-red-600 transition-all"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
export default AdminNewsEditorTab;
