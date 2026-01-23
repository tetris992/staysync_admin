import React, { useState } from 'react';
import NoticeManager from './NoticeManager';
import FaqManager from './FaqManager';
import ServiceGuideManager from './ServiceGuideManager';

const HelpCenterManager = () => {
  const [tab, setTab] = useState('notice'); // notice | faq | guide

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        padding: '13px 16px',          // 기존 대비 약 30% 업
        borderRadius: 999,
        border: '1px solid #e5e7eb',
        background: tab === key ? '#111827' : '#fff',
        color: tab === key ? '#fff' : '#111827',
        fontWeight: 800,
        cursor: 'pointer',
        fontSize: '1.15rem',           // ✅ 폰트 업
        letterSpacing: '0.1px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ width: '100%', height: '100%', fontFamily: 'Pretendard, sans-serif' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: 18,
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {tabBtn('notice', '공지사항')}
        {tabBtn('faq', '자주 묻는 질문')}
        {tabBtn('guide', '서비스 안내')}
      </div>

      {tab === 'notice' && <NoticeManager />}
      {tab === 'faq' && <FaqManager />}
      {tab === 'guide' && <ServiceGuideManager />}
    </div>
  );
};

export default HelpCenterManager;
