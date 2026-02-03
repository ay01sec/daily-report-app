import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const MAX_PHOTOS = 3;

export default function PhotoUploader({ reportId, photos = [], onChange, disabled = false }) {
  const { companyId } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);

    if (toUpload.length === 0) {
      alert(`写真は最大${MAX_PHOTOS}枚までです`);
      return;
    }

    setUploading(true);
    try {
      const newPhotos = [];
      for (const file of toUpload) {
        const fileName = `${Date.now()}_${file.name}`;
        const storagePath = `companies/${companyId}/reports/${reportId || 'draft'}/photos/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newPhotos.push({ url, path: storagePath, name: file.name });
      }
      onChange([...photos, ...newPhotos]);
    } catch (err) {
      console.error('写真アップロードエラー:', err);
      alert('写真のアップロードに失敗しました');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (index) => {
    const photo = photos[index];
    try {
      if (photo.path) {
        const storageRef = ref(storage, photo.path);
        await deleteObject(storageRef).catch(() => {});
      }
    } catch (e) {
      console.warn('写真削除エラー:', e);
    }
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* プレビューグリッド */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={photo.url}
                alt={`写真 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* アップロードボタン */}
      {!disabled && photos.length < MAX_PHOTOS && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`block w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-600 cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-colors ${
              uploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {uploading ? 'アップロード中...' : `写真を追加（残り${MAX_PHOTOS - photos.length}枚）`}
          </label>
        </div>
      )}
    </div>
  );
}
