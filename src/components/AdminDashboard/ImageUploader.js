import React, { useRef, useState, useCallback } from 'react';
import { uploadImageAPI } from '../../api/api';
import { toast } from 'react-toastify';
import { FaCloudUploadAlt, FaTimes, FaSpinner, FaImage } from 'react-icons/fa';

/**
 * 공통 이미지 업로드 컴포넌트
 * - 드래그&드롭 / 클릭 파일선택 / 붙여넣기(Ctrl+V)
 * - S3 업로드 후 URL 반환
 * - 미리보기 + 제거(X) 버튼
 *
 * Props:
 *   imageUrl      - 현재 이미지 URL
 *   onImageChange - (url: string) => void  (업로드 완료 또는 제거 시 호출)
 *   category      - S3 카테고리 ('notices' | 'faqs' | 'service-guides')
 *   label         - 라벨 텍스트 (기본: '이미지 (선택)')
 *   fontSize      - 라벨 폰트사이즈
 */
const ImageUploader = ({ imageUrl, onImageChange, category = 'notices', label = '이미지 (선택)', fontSize = '1.15rem' }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return toast.warning('이미지 파일만 업로드 가능합니다.');
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.warning('파일 크기가 5MB를 초과합니다.');
    }

    setUploading(true);
    try {
      const result = await uploadImageAPI(file, category);
      onImageChange(result.imageUrl);
      toast.success('이미지 업로드 완료');
    } catch (err) {
      toast.error(err.message || '이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  }, [category, onImageChange]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const onPaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        handleUpload(item.getAsFile());
        return;
      }
    }
  }, [handleUpload]);

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const removeImage = () => {
    onImageChange('');
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize, fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
        {label}
      </label>

      {/* 이미 이미지가 있으면 미리보기 표시 */}
      {imageUrl ? (
        <div style={{
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '120px',
        }}>
          <img
            src={imageUrl}
            alt="미리보기"
            style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={removeImage}
            title="이미지 제거"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <FaTimes />
          </button>
        </div>
      ) : (
        /* 업로드 영역: 드래그&드롭 / 클릭 / 붙여넣기 */
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onPaste={onPaste}
          tabIndex={0}
          style={{
            border: dragOver ? '2px dashed #2563eb' : '2px dashed #d1d5db',
            borderRadius: '10px',
            padding: '28px 16px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            backgroundColor: dragOver ? '#eff6ff' : '#fafafa',
            transition: 'all 0.2s',
            outline: 'none',
          }}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#6b7280' }}>
              <FaSpinner size={28} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>업로드 중...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#9ca3af' }}>
              <FaCloudUploadAlt size={32} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                클릭, 드래그 또는 Ctrl+V로 이미지 업로드
              </span>
              <span style={{ fontSize: '0.8rem' }}>JPEG, PNG, WebP (최대 5MB)</span>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileSelect}
        style={{ display: 'none' }}
      />

      {/* 스피너 CSS 애니메이션 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImageUploader;
