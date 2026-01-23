// src/components/AdminDashboard/NoticeManager.js
import React, { useState, useEffect } from 'react';
import {
  fetchNoticesAPI,
  createNoticeAPI,
  deleteNoticeAPI,
  updateNoticeAPI,
} from '../../api/api';
import { toast } from 'react-toastify';
import {
  FaTrash,
  FaBullhorn,
  FaPen,
  FaCheck,
  FaEdit,
  FaThumbtack,
} from 'react-icons/fa';

const NoticeManager = () => {
  // ✅ 폰트/가독성 스케일 (대략 +30%)
  const FS = {
    h2: '1.6rem',
    label: '1.15rem',
    input: '1.25rem',
    btn: '1.3rem',
    typeBtn: '1.15rem',
    pinLabel: '1.25rem',
    badge: '0.9rem',
    title: '1.3rem',
    preview: '1.15rem',
    meta: '1rem',
    action: '1.05rem',
  };

  const [notices, setNotices] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    type: 'general',
    isPinned: false,
  });

  // 목록 불러오기
  const loadNotices = async () => {
    try {
      const data = await fetchNoticesAPI();
      let items = [];
      if (data && data.notices && Array.isArray(data.notices))
        items = data.notices;
      else if (Array.isArray(data)) items = data;

      // ✅ 최신순 정렬 추가
      items.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setNotices(items);
    } catch (e) {
      console.error(e);
      setNotices([]);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  // ✅ [NEW] 목록에서 핀 아이콘 클릭 시 즉시 토글
  const handleTogglePin = async (e, notice) => {
    e.stopPropagation(); // 부모 클릭 이벤트 전파 방지

    // 현재 상태의 반대로 설정
    const newPinnedStatus = !notice.isPinned;
    const actionText = newPinnedStatus ? '상단 고정' : '고정 해제';

    if (
      window.confirm(`'${notice.title}' 공지를 ${actionText} 하시겠습니까?`)
    ) {
      try {
        // 기존 내용 유지하면서 isPinned만 변경해서 업데이트 요청
        await updateNoticeAPI(notice._id, {
          ...notice,
          isPinned: newPinnedStatus,
        });

        toast.success(`${actionText} 되었습니다.`);
        loadNotices(); // 목록 갱신 (순서 바뀜)
      } catch (err) {
        toast.error('상태 변경 실패');
      }
    }
  };

  const handleEditClick = (notice) => {
    setEditingId(notice._id);
    setFormData({
      title: notice.title,
      content: notice.content,
      imageUrl: notice.imageUrl || '',
      type: notice.type || 'general',
      isPinned: notice.isPinned || false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      imageUrl: '',
      type: 'general',
      isPinned: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim())
      return toast.warning('제목과 내용을 입력해주세요.');

    const actionName = editingId ? '수정' : '등록';

    if (window.confirm(`공지사항을 ${actionName}하시겠습니까?`)) {
      try {
        if (editingId) {
          await updateNoticeAPI(editingId, formData);
          toast.success('공지사항이 수정되었습니다.');
        } else {
          await createNoticeAPI(formData);
          toast.success('공지사항이 등록되었습니다.');
        }
        handleCancelEdit();
        loadNotices();
      } catch (e2) {
        console.error(e2);
        toast.error(`${actionName} 실패`);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteNoticeAPI(id);
        toast.success('삭제되었습니다.');
        if (editingId === id) handleCancelEdit();
        loadNotices();
      } catch (e) {
        toast.error('삭제 실패');
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '24px',
        padding: '24px',
        height: '100%',
        fontFamily: 'Pretendard, sans-serif',
      }}
    >
      {/* ================= 왼쪽: 입력 폼 ================= */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflowY: 'auto',
        }}
      >
        <h2
          style={{
            fontSize: FS.h2,
            fontWeight: 900,
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#111827',
          }}
        >
          <FaPen className="text-blue-600" />
          {editingId ? '공지 수정 중...' : '새 공지 작성'}
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* 분류 */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: FS.label,
                fontWeight: 800,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              분류
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['general', 'urgent', 'update'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: FS.typeBtn,
                    fontWeight: 800,
                    border:
                      formData.type === type
                        ? '2px solid transparent'
                        : '1px solid #e5e7eb',
                    backgroundColor:
                      formData.type === type
                        ? type === 'urgent'
                          ? '#fee2e2'
                          : type === 'update'
                            ? '#dcfce7'
                            : '#f3f4f6'
                        : '#fff',
                    color:
                      formData.type === type
                        ? type === 'urgent'
                          ? '#991b1b'
                          : type === 'update'
                            ? '#166534'
                            : '#1f2937'
                        : '#6b7280',
                    boxShadow:
                      formData.type === type ? '0 0 0 2px #fff inset' : 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  {type === 'general' && '📢 일반'}
                  {type === 'urgent' && '🚨 긴급'}
                  {type === 'update' && '🚀 업데이트'}
                </button>
              ))}
            </div>
          </div>

          {/* 상단 고정 체크박스 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              backgroundColor: formData.isPinned ? '#fff7ed' : '#fafafa',
              borderRadius: '10px',
              border: formData.isPinned
                ? '1px solid #ffedd5'
                : '1px solid #f0f0f0',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="checkbox"
              id="pin-check"
              checked={formData.isPinned}
              onChange={(e) =>
                setFormData({ ...formData, isPinned: e.target.checked })
              }
              style={{
                width: '22px',
                height: '22px',
                cursor: 'pointer',
                accentColor: '#ea580c',
              }}
            />
            <label
              htmlFor="pin-check"
              style={{
                cursor: 'pointer',
                fontWeight: 900,
                color: formData.isPinned ? '#ea580c' : '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: FS.pinLabel,
              }}
            >
              <FaThumbtack /> 이 공지를 목록 최상단에 고정합니다
            </label>
          </div>

          {/* 제목 */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: FS.label,
                fontWeight: 800,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              제목
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="제목을 입력하세요"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: FS.input,
              }}
            />
          </div>

          {/* 이미지 URL */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: FS.label,
                fontWeight: 800,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              이미지 URL (선택)
            </label>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              placeholder="https://example.com/image.jpg"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: FS.input,
              }}
            />
            {formData.imageUrl && (
              <div
                style={{
                  marginTop: '12px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={formData.imageUrl}
                  alt="미리보기"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '220px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => (e.target.style.display = 'none')}
                />
              </div>
            )}
          </div>

          {/* 내용 */}
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'block',
                fontSize: FS.label,
                fontWeight: 800,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              내용
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="내용을 입력하세요..."
              style={{
                width: '100%',
                height: '290px',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: FS.input,
                resize: 'vertical',
                lineHeight: '1.7',
              }}
            />
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontSize: FS.btn,
                }}
              >
                취소
              </button>
            )}
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '14px',
                backgroundColor: editingId ? '#16a34a' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: FS.btn,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <FaCheck /> {editingId ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      {/* ================= 오른쪽: 목록 리스트 ================= */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '12px',
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
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#111827',
          }}
        >
          <FaBullhorn className="text-gray-600" /> 등록된 공지 목록
        </h2>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '4px',
          }}
        >
          {notices.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#9ca3af',
                marginTop: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                fontSize: FS.preview,
                fontWeight: 700,
              }}
            >
              <FaBullhorn size={52} style={{ opacity: 0.18 }} />
              <span>등록된 공지사항이 없습니다.</span>
            </div>
          ) : (
            notices.map((notice) => (
              <div
                key={notice._id}
                style={{
                  padding: '18px',
                  border: notice.isPinned
                    ? '2px solid #fdba74'
                    : editingId === notice._id
                      ? '2px solid #2563eb'
                      : '1px solid #f3f4f6',
                  borderRadius: '12px',
                  backgroundColor: notice.isPinned ? '#fffaf0' : '#f9fafb',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                {/* 상단: 뱃지 + 제목 + 핀 토글 버튼 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* ✅ [NEW] 핀 토글 버튼 (클릭 가능) */}
                  <button
                    onClick={(e) => handleTogglePin(e, notice)}
                    title={notice.isPinned ? '고정 해제' : '상단 고정'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      color: notice.isPinned ? '#ea580c' : '#d1d5db',
                      transition: 'transform 0.2s',
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = 'scale(1.2)')
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = 'scale(1)')
                    }
                  >
                    <FaThumbtack size={18} />
                  </button>

                  {notice.type === 'urgent' && (
                    <span
                      style={{
                        fontSize: FS.badge,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontWeight: 900,
                      }}
                    >
                      긴급
                    </span>
                  )}
                  {notice.type === 'update' && (
                    <span
                      style={{
                        fontSize: FS.badge,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        fontWeight: 900,
                      }}
                    >
                      업데이트
                    </span>
                  )}
                  {notice.type === 'general' && (
                    <span
                      style={{
                        fontSize: FS.badge,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        fontWeight: 900,
                      }}
                    >
                      일반
                    </span>
                  )}

                  <h4
                    style={{
                      fontSize: FS.title,
                      fontWeight: 900,
                      color: '#1f2937',
                      margin: 0,
                    }}
                  >
                    {notice.title}
                  </h4>
                </div>

                {/* 내용 미리보기 */}
                <p
                  style={{
                    fontSize: FS.preview,
                    color: '#4b5563',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '84px', // 폰트 커짐 반영 (기존 60px)
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.65',
                    marginBottom: '12px',
                  }}
                >
                  {notice.content}
                </p>

                {/* 하단: 날짜 + 액션버튼 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    paddingTop: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: FS.meta,
                      color: '#9ca3af',
                      fontWeight: 700,
                    }}
                  >
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </span>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleEditClick(notice)}
                      style={{
                        background: 'white',
                        border: '1px solid #dbeafe',
                        color: '#2563eb',
                        cursor: 'pointer',
                        fontSize: FS.action,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontWeight: 900,
                      }}
                    >
                      <FaEdit size={16} /> 수정
                    </button>
                    <button
                      onClick={() => handleDelete(notice._id)}
                      style={{
                        background: 'white',
                        border: '1px solid #fee2e2',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: FS.action,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '8px',
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

export default NoticeManager;
