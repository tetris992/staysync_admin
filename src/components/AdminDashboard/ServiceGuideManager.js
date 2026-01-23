import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaTrash,
  FaPen,
  FaCheck,
  FaEdit,
  FaThumbtack,
  FaYoutube,
} from 'react-icons/fa';
import {
  fetchServiceGuidesAPI,
  createServiceGuideAPI,
  updateServiceGuideAPI,
  deleteServiceGuideAPI,
} from '../../api/api';

const isValidUrl = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const ServiceGuideManager = () => {
  // ✅ 폰트/가독성 스케일 (대략 +30%)
  const FS = {
    h2: '1.6rem',
    label: '1.15rem',
    input: '1.2rem',
    small: 16,
    meta: 15,
    body: 18,
    action: 15,
  };

  const [guides, setGuides] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    isPinned: false,
    isVisible: true,
    videoUrl: '',
    linkLabel: '',
  });

  const load = async () => {
    try {
      const data = await fetchServiceGuidesAPI(1, '', 500, '', true);
      let items = Array.isArray(data?.guides) ? data.guides : [];

      // ✅ 최신순 정렬 추가
      items.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setGuides(items);
    } catch (e) {
      console.error(e);
      setGuides([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      isPinned: false,
      isVisible: true,
      videoUrl: '',
      linkLabel: '',
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      return toast.warning('제목/내용을 입력해주세요.');
    }
    if (formData.videoUrl?.trim() && !isValidUrl(formData.videoUrl.trim())) {
      return toast.warning('동영상 URL 형식이 올바르지 않습니다.');
    }

    const action = editingId ? '수정' : '등록';
    if (!window.confirm(`서비스 안내를 ${action}하시겠습니까?`)) return;

    try {
      const payload = {
        ...formData,
        videoUrl: formData.videoUrl?.trim() || '',
        linkLabel: formData.linkLabel?.trim() || '',
      };

      if (editingId) await updateServiceGuideAPI(editingId, payload);
      else await createServiceGuideAPI(payload);

      toast.success(`${action} 완료`);
      reset();
      load();
    } catch {
      toast.error(`${action} 실패`);
    }
  };

  const onEdit = (row) => {
    setEditingId(row._id);
    setFormData({
      title: row.title || '',
      content: row.content || '',
      category: row.category || 'general',
      isPinned: !!row.isPinned,
      isVisible: row.isVisible !== false,
      videoUrl: row.videoUrl || '',
      linkLabel: row.linkLabel || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteServiceGuideAPI(id);
      toast.success('삭제 완료');
      if (editingId === id) reset();
      load();
    } catch {
      toast.error('삭제 실패');
    }
  };

  const togglePin = async (row) => {
    const next = !row.isPinned;
    if (
      !window.confirm(
        next ? '상단 고정 하시겠습니까?' : '고정 해제 하시겠습니까?',
      )
    )
      return;
    try {
      await updateServiceGuideAPI(row._id, { isPinned: next });
      toast.success(next ? '상단 고정' : '고정 해제');
      load();
    } catch {
      toast.error('변경 실패');
    }
  };

  const toggleVisible = async (row) => {
    const next = !(row.isVisible !== false);
    if (!window.confirm(next ? '공개로 전환할까요?' : '비공개로 전환할까요?'))
      return;
    try {
      await updateServiceGuideAPI(row._id, { isVisible: next });
      toast.success(next ? '공개 처리' : '비공개 처리');
      load();
    } catch {
      toast.error('변경 실패');
    }
  };

  const openVideo = (url) => {
    const u = (url || '').trim();
    if (!isValidUrl(u)) return toast.warning('유효한 URL이 아닙니다.');
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        padding: 24,
        height: '100%',
        fontFamily: 'Pretendard, sans-serif',
      }}
    >
      <div
        style={{
          flex: 1,
          background: '#fff',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflowY: 'auto',
        }}
      >
        <h2
          style={{
            fontSize: FS.h2,
            fontWeight: 900,
            marginBottom: 16,
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <FaPen />
          {editingId ? '서비스 안내 수정 중...' : '새 서비스 안내 작성'}
        </h2>

        <form
          onSubmit={onSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <label
            style={{ fontWeight: 800, color: '#374151', fontSize: FS.label }}
          >
            카테고리
          </label>
          <input
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder="general / policy / billing ..."
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 10,
              border: '1px solid #d1d5db',
              fontSize: FS.input,
            }}
          />

          <div style={{ display: 'flex', gap: 16 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#374151',
                fontSize: FS.label,
                fontWeight: 800,
              }}
            >
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) =>
                  setFormData({ ...formData, isPinned: e.target.checked })
                }
                style={{ width: 20, height: 20 }}
              />
              상단 고정
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#374151',
                fontSize: FS.label,
                fontWeight: 800,
              }}
            >
              <input
                type="checkbox"
                checked={formData.isVisible}
                onChange={(e) =>
                  setFormData({ ...formData, isVisible: e.target.checked })
                }
                style={{ width: 20, height: 20 }}
              />
              공개
            </label>
          </div>

          {/* ✅ YouTube 섹션 */}
          <label
            style={{
              fontWeight: 800,
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: FS.label,
            }}
          >
            <FaYoutube color="#FF0000" /> 관련 영상(YouTube)
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              value={formData.videoUrl}
              onChange={(e) =>
                setFormData({ ...formData, videoUrl: e.target.value })
              }
              placeholder="https://youtu.be/..."
              style={{
                flex: 7,
                padding: 14,
                borderRadius: 10,
                border: '1px solid #d1d5db',
                fontSize: FS.input,
              }}
            />
            <input
              value={formData.linkLabel}
              onChange={(e) =>
                setFormData({ ...formData, linkLabel: e.target.value })
              }
              placeholder="버튼명 (예: 영상 보기)"
              style={{
                flex: 3,
                padding: 14,
                borderRadius: 10,
                border: '1px solid #d1d5db',
                fontSize: FS.input,
              }}
            />
          </div>

          <label
            style={{ fontWeight: 800, color: '#374151', fontSize: FS.label }}
          >
            제목
          </label>
          <input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="제목을 입력하세요"
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 10,
              border: '1px solid #d1d5db',
              fontSize: FS.input,
            }}
          />

          <label
            style={{ fontWeight: 800, color: '#374151', fontSize: FS.label }}
          >
            내용
          </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            placeholder="내용을 입력하세요"
            style={{
              width: '100%',
              height: 300,
              padding: 14,
              borderRadius: 10,
              border: '1px solid #d1d5db',
              resize: 'vertical',
              lineHeight: 1.7,
              fontSize: FS.input,
            }}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                style={{
                  flex: 1,
                  padding: 14,
                  background: '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontSize: FS.input,
                }}
              >
                취소
              </button>
            )}
            <button
              type="submit"
              style={{
                flex: 2,
                padding: 14,
                background: '#111827',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: FS.input,
              }}
            >
              <FaCheck /> {editingId ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      <div
        style={{
          flex: 1,
          background: '#fff',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2
          style={{
            fontSize: FS.h2,
            fontWeight: 900,
            marginBottom: 16,
            color: '#111827',
          }}
        >
          등록된 서비스 안내
        </h2>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {guides.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#9ca3af',
                marginTop: 60,
                fontSize: FS.body,
                fontWeight: 700,
              }}
            >
              등록된 안내글이 없습니다.
            </div>
          ) : (
            guides.map((row) => (
              <div
                key={row._id}
                style={{
                  padding: 18,
                  border: row.isPinned
                    ? '2px solid #111827'
                    : '1px solid #f3f4f6',
                  borderRadius: 12,
                  background: '#f9fafb',
                  opacity: row.isVisible === false ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() => togglePin(row)}
                    title={row.isPinned ? '고정 해제' : '상단 고정'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 6,
                      color: row.isPinned ? '#111827' : '#d1d5db',
                    }}
                  >
                    <FaThumbtack size={18} />
                  </button>

                  {row.videoUrl && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: FS.small,
                        color: '#ef4444',
                        fontWeight: 900,
                      }}
                    >
                      <FaYoutube color="#FF0000" /> 영상
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: FS.small,
                      color: '#6b7280',
                      fontWeight: 700,
                    }}
                  >
                    {row.category || 'general'}
                  </span>
                  <span
                    style={{
                      fontWeight: 900,
                      color: '#111827',
                      fontSize: FS.body,
                    }}
                  >
                    {row.title}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: FS.body,
                    color: '#4b5563',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 96,
                    overflow: 'hidden',
                    marginBottom: 12,
                    lineHeight: 1.65,
                  }}
                >
                  {row.content}
                </p>

                {row.videoUrl && (
                  <button
                    type="button"
                    onClick={() => openVideo(row.videoUrl)}
                    style={{
                      width: '100%',
                      border: '1px solid #fee2e2',
                      background: '#fff5f5',
                      color: '#ef4444',
                      fontWeight: 900,
                      padding: '13px 16px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      marginBottom: 12,
                      fontSize: FS.input,
                    }}
                  >
                    <FaYoutube color="#FF0000" />
                    {row.linkLabel?.trim() || '동영상 매뉴얼 보기'}
                  </button>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    paddingTop: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: FS.meta,
                      color: '#9ca3af',
                      fontWeight: 700,
                    }}
                  >
                    {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => toggleVisible(row)}
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        fontSize: FS.action,
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontWeight: 900,
                      }}
                    >
                      {row.isVisible !== false ? '공개' : '비공개'}
                    </button>
                    <button
                      onClick={() => onEdit(row)}
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        fontSize: FS.action,
                        padding: '6px 10px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 900,
                      }}
                    >
                      <FaEdit size={16} /> 수정
                    </button>
                    <button
                      onClick={() => onDelete(row._id)}
                      style={{
                        background: '#fff',
                        border: '1px solid #fee2e2',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: FS.action,
                        padding: '6px 10px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 900,
                      }}
                    >
                      <FaTrash size={16} /> 삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceGuideManager;
