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
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
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
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const uploadImage = async (uri: string, fileName: string): Promise<Photo> => {
    const logs: string[] = [];
    try {
      logs.push(`[1] Start upload: companyId=${companyId}, reportId=${reportId}`);
      logs.push(`[2] URI: ${uri.substring(0, 50)}...`);

      const storagePath = `companies/${companyId}/reports/${reportId || 'draft'}/photos/${fileName}`;
      logs.push(`[3] Storage path: ${storagePath}`);

      const storageRef = ref(storage, storagePath);
      logs.push(`[4] Storage ref created`);

      // expo-file-systemを使用してファイルを読み込む
      const fileInfo = await FileSystem.getInfoAsync(uri);
      logs.push(`[5] File info: exists=${fileInfo.exists}, size=${(fileInfo as any).size || 'unknown'}`);

      if (!fileInfo.exists) {
        throw new Error('ファイルが見つかりません');
      }

      // ファイルをBase64で読み込む
      logs.push(`[6] Reading file as base64...`);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      logs.push(`[7] Base64 length: ${base64.length}`);

      // Base64からBlobを作成
      logs.push(`[8] Creating blob from base64...`);
      const response = await fetch(`data:image/jpeg;base64,${base64}`);
      const blob = await response.blob();
      logs.push(`[9] Blob created: size=${blob.size}, type=${blob.type}`);

      // アップロード
      logs.push(`[10] Starting upload to Firebase Storage...`);
      await new Promise<void>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, blob);
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            logs.push(`[11] Upload progress: ${progress.toFixed(1)}%`);
          },
          (error) => {
            logs.push(`[ERROR] Upload failed: ${error.code} - ${error.message}`);
            setDebugInfo(logs.join('\n'));
            reject(error);
          },
          () => {
            logs.push(`[12] Upload completed!`);
            resolve();
          }
        );
      });

      const url = await getDownloadURL(storageRef);
      logs.push(`[13] Download URL obtained`);
      setDebugInfo(null); // 成功したらデバッグ情報をクリア
      return { url, path: storagePath, name: fileName };
    } catch (error: any) {
      logs.push(`[CATCH ERROR] ${error.name}: ${error.message}`);
      if (error.code) logs.push(`[ERROR CODE] ${error.code}`);
      if (error.serverResponse) logs.push(`[SERVER] ${error.serverResponse}`);
      setDebugInfo(logs.join('\n'));
      throw error;
    }
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
    } catch (err: any) {
      console.error('写真アップロードエラー:', err);
      const errorDetail = `${err.name || 'Error'}: ${err.message || 'Unknown error'}${err.code ? `\nCode: ${err.code}` : ''}`;
      setDebugInfo((prev) => prev ? `${prev}\n\n[handlePickImage ERROR]\n${errorDetail}` : `[handlePickImage ERROR]\n${errorDetail}`);
      Alert.alert('エラー', `写真のアップロードに失敗しました\n\n${errorDetail}`);
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
    } catch (err: any) {
      console.error('写真アップロードエラー:', err);
      const errorDetail = `${err.name || 'Error'}: ${err.message || 'Unknown error'}${err.code ? `\nCode: ${err.code}` : ''}`;
      setDebugInfo((prev) => prev ? `${prev}\n\n[handleTakePhoto ERROR]\n${errorDetail}` : `[handleTakePhoto ERROR]\n${errorDetail}`);
      Alert.alert('エラー', `写真のアップロードに失敗しました\n\n${errorDetail}`);
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
      {debugInfo && (
        <View style={styles.debugContainer}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>デバッグ情報</Text>
            <TouchableOpacity onPress={() => setDebugInfo(null)}>
              <Text style={styles.debugClose}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.debugText} selectable>{debugInfo}</Text>
        </View>
      )}

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
  debugContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debugTitle: {
    fontWeight: 'bold',
    color: '#991b1b',
  },
  debugClose: {
    fontSize: 20,
    color: '#991b1b',
    paddingHorizontal: 8,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#7f1d1d',
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
