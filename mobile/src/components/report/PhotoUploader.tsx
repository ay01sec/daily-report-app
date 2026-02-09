import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const MAX_PHOTOS = 3;

interface Photo {
  url: string;
  path?: string;
  name?: string;
}

interface PhotoUploaderProps {
  reportId?: string | null;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  disabled?: boolean;
}

export default function PhotoUploader({
  reportId,
  photos = [],
  onChange,
  disabled = false,
}: PhotoUploaderProps) {
  const { companyId } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (uri: string, fileName: string): Promise<Photo> => {
    const storagePath = `companies/${companyId}/reports/${reportId || 'draft'}/photos/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    return { url, path: storagePath, name: fileName };
  };

  const handlePickImage = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert('エラー', `写真は最大${MAX_PHOTOS}枚までです`);
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('許可が必要です', '写真ライブラリへのアクセスを許可してください');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const newPhotos: Photo[] = [];
      for (const asset of result.assets) {
        const fileName = `${Date.now()}_${asset.fileName || 'photo.jpg'}`;
        const photo = await uploadImage(asset.uri, fileName);
        newPhotos.push(photo);
      }
      onChange([...photos, ...newPhotos]);
    } catch (err) {
      console.error('写真アップロードエラー:', err);
      Alert.alert('エラー', '写真のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert('エラー', `写真は最大${MAX_PHOTOS}枚までです`);
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('許可が必要です', 'カメラへのアクセスを許可してください');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const asset = result.assets[0];
      const fileName = `${Date.now()}_camera.jpg`;
      const photo = await uploadImage(asset.uri, fileName);
      onChange([...photos, photo]);
    } catch (err) {
      console.error('写真アップロードエラー:', err);
      Alert.alert('エラー', '写真のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index: number) => {
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

  const showOptions = () => {
    Alert.alert(
      '写真を追加',
      '',
      [
        { text: 'カメラで撮影', onPress: handleTakePhoto },
        { text: 'ライブラリから選択', onPress: handlePickImage },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {photos.length > 0 && (
        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo.url }} style={styles.photo} />
              {!disabled && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(index)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {!disabled && photos.length < MAX_PHOTOS && (
        <TouchableOpacity
          style={[styles.addButton, uploading && styles.addButtonDisabled]}
          onPress={showOptions}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#6b7280" />
          ) : (
            <Text style={styles.addButtonText}>
              写真を追加（残り{MAX_PHOTOS - photos.length}枚）
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#6b7280',
  },
});
