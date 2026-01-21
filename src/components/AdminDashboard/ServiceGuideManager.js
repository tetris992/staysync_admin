import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaTrash, FaPen, FaCheck, FaEdit, FaThumbtack } from 'react-icons/fa';
import {
  fetchServiceGuidesAPI,
  createServiceGuideAPI,
  updateServiceGuideAPI,
  deleteServiceGuideAPI,
} from '../../api/api';

const ServiceGuideManager = () => {
  const [guides, setGuides] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    isPinned: false,
    isVisible: true,
  });

  const load = async () => {
    try {
      const data = await fetchServiceGuidesAPI(1, '', 500);
      setGuides(Array.isArray(data?.guides) ? data.guides : []);
    } catch (e) {
      console.error(e);
      setGuides([]);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', category: 'general', isPinned: false, isVisible: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return toast.warning('제목/내용을 입력해주세요.');

    const action = editingId ? '수정' : '등록';
    if (!window.confirm(`서비스 안내를 ${action}하시겠습니까?`)) return;

    try {
      if (editingId) await updateServiceGuideAPI(editingId, formData);
      else await createServiceGuideAPI(formData);

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
      title: row.title,
      content: row.content,
      category: row.category || 'general',
      isPinned: !!row.isPinned,
      isVisible: row.isVisible !== false,
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
    if (!window.confirm(next ? '상단 고정 하시겠습니까?' : '고정 해제 하시겠습니까?')) return;
    try {
      await updateServiceGuideAPI(row._id, { ...row, isPinned: next });
      toast.success(next ? '상단 고정' : '고정 해제');
      load();
    } catch {
      toast.error('변경 실패');
    }
  };

  const toggleVisible = async (row) => {
    const next = !(row.isVisible !== false);
    if (!window.confirm(next ? '공개로 전환할까요?' : '비공개로 전환할까요?')) return;
    try {
      await updateServiceGuideAPI(row._id, { ...row, isVisible: next });
      toast.success(next ? '공개 처리' : '비공개 처리');
      load();
    } catch {
      toast.error('변경 실패');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, height: '100%', fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ flex: 1, background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: 16, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaPen />
          {editingId ? '서비스 안내 수정 중...' : '새 서비스 안내 작성'}
        </h2>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontWeight: 600, color: '#374151' }}>카테고리</label>
          <input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="general / policy / billing ..."
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db' }}
          />

          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
              <input type="checkbox" checked={formData.isPinned} onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })} />
              상단 고정
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
              <input type="checkbox" checked={formData.isVisible} onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })} />
              공개
            </label>
          </div>

          <label style={{ fontWeight: 600, color: '#374151' }}>제목</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="제목을 입력하세요"
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db' }}
          />

          <label style={{ fontWeight: 600, color: '#374151' }}>내용</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="내용을 입력하세요"
            style={{ width: '100%', height: 260, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical', lineHeight: 1.6 }}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {editingId && (
              <button type="button" onClick={reset} style={{ flex: 1, padding: 12, background: '#9ca3af', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
                취소
              </button>
            )}
            <button type="submit" style={{ flex: 2, padding: 12, background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <FaCheck /> {editingId ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ flex: 1, background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: 16, color: '#111827' }}>등록된 서비스 안내</h2>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {guides.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 60 }}>등록된 안내글이 없습니다.</div>
          ) : (
            guides.map((row) => (
              <div key={row._id} style={{ padding: 16, border: row.isPinned ? '2px solid #111827' : '1px solid #f3f4f6', borderRadius: 10, background: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => togglePin(row)} title={row.isPinned ? '고정 해제' : '상단 고정'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: row.isPinned ? '#111827' : '#d1d5db' }}>
                    <FaThumbtack size={14} />
                  </button>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{row.category || 'general'}</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{row.title}</span>
                </div>

                <p style={{ fontSize: 14, color: '#4b5563', whiteSpace: 'pre-wrap', maxHeight: 72, overflow: 'hidden', marginBottom: 10 }}>
                  {row.content}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(row.createdAt).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleVisible(row)} style={{ background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 6 }}>
                      {row.isVisible !== false ? '공개' : '비공개'}
                    </button>
                    <button onClick={() => onEdit(row)} style={{ background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaEdit size={12} /> 수정
                    </button>
                    <button onClick={() => onDelete(row._id)} style={{ background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaTrash size={12} /> 삭제
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
