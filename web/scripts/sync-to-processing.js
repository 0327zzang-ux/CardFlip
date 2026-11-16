import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const processingDataDir = path.resolve(__dirname, '../../CardFlip/data');
const backupDir = path.resolve(__dirname, '../../CardFlip/data_legacy_backup');

console.log('🚀 Processing 4 하이브리드 동기화 시작...');

if (!fs.existsSync(distDir)) {
  console.error('❌ web/dist 폴더가 없습니다. 먼저 "npm run build"를 실행하세요.');
  process.exit(1);
}

// 1. 최초 1회 기존 legacy 파일 안전 백업
if (!fs.existsSync(backupDir) && fs.existsSync(processingDataDir)) {
  console.log('📦 기존 과제 시연용 data/ 폴더를 data_legacy_backup/ 으로 안전하게 백업합니다...');
  fs.cpSync(processingDataDir, backupDir, { recursive: true });
}

// 2. dist 내용물을 Processing data 디렉토리로 복사
console.log(`📂 ${distDir} -> ${processingDataDir} 복사 중...`);
fs.cpSync(distDir, processingDataDir, { recursive: true });

console.log('✅ Processing 4 동기화 완료! 이제 Processing 4 IDE에서 ▶ 버튼을 누르면 최신 React MVP 빌드가 실행됩니다.');
