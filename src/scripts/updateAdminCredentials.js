// scripts/updateAdminCredentials.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminUser from '../backend/models/AdminUser.js';

// 1. .env 파일 로드
dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development'
});

async function main() {
  // 2. DB 연결
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌ DATABASE_URL 환경변수가 설정되어 있지 않습니다.');
    process.exit(1);
  }
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ MongoDB에 연결되었습니다.');

  // 3. 기존 슈퍼어드민(혹은 admin) 계정 찾기
  //    - role 필드가 'superadmin' 이거나, username 이 기존 값인 경우
  const admin = await AdminUser.findOne({
    $or: [
      { role: 'superadmin' },
      // 필요하다면 기존 username 조건도 넣어주세요:
      // { username: 'oldAdminUsername' }
    ],
  });

  if (!admin) {
    console.error('❌ 슈퍼어드민 계정을 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log('ℹ️  변경 전 계정:', {
    username: admin.username,
    role: admin.role,
  });

  // 4. 아이디·비밀번호 업데이트
  const NEW_USERNAME = 'admin03326';
  const NEW_PASSWORD = 'zerotoone03326#';

  admin.username = NEW_USERNAME;
  admin.password = NEW_PASSWORD;   // 모델에서 pre-save 훅으로 해시 처리됨
  await admin.save();

  console.log('✅ 관리자 계정이 갱신되었습니다.');
  console.log('   새로운 아이디:', NEW_USERNAME);
  console.log('   새로운 비밀번호:', NEW_PASSWORD);

  process.exit(0);
}

// 실행
main().catch((err) => {
  console.error('❌ 스크립트 실행 중 오류:', err);
  process.exit(1);
});
