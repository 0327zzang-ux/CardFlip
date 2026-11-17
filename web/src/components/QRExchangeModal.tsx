import React, { useState, useEffect, useRef } from 'react';
import type { CardData } from '../types/card';
import { generateCardQRCode, getCardShareUrl } from '../services/qr';
import { storage } from '../services/storage';
import {
  X,
  QrCode,
  Camera,
  Search,
  Sparkles,
  Share2,
  Check,
  Zap
} from 'lucide-react';

interface QRExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCard: CardData;
  onExchangeSuccess: (card: CardData) => void;
  onShowToast: (msg: string) => void;
}

export const QRExchangeModal: React.FC<QRExchangeModalProps> = ({
  isOpen,
  onClose,
  activeCard,
  onExchangeSuccess,
  onShowToast
}) => {
  const [tab, setTab] = useState<'my-qr' | 'camera' | 'id'>('my-qr');
  const [qrUrl, setQrUrl] = useState('');
  const [exchangeId, setExchangeId] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 내 명함 QR 생성
  useEffect(() => {
    if (isOpen) {
      generateCardQRCode(activeCard).then(setQrUrl);
    }
  }, [isOpen, activeCard]);

  // 카메라 스트림 관리
  useEffect(() => {
    if (isOpen && tab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, tab]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setCameraError('HTTP(Wi-Fi IP) 환경에서는 브라우저 보안 규정상 인앱 카메라 권한이 차단됩니다.');
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('브라우저에서 카메라 접근 API를 지원하지 않거나 보안 컨텍스트(HTTPS)가 필요합니다.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      const errorObj = err as { name?: string };
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setCameraError('브라우저 설정에서 카메라 권한이 차단되었습니다. 주소창 좌측 설정 아이콘을 눌러 카메라를 [허용]으로 변경해주세요.');
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        setCameraError('기기에 연결된 웹캠/카메라 장치를 찾을 수 없습니다.');
      } else {
        setCameraError('카메라를 사용할 수 없거나 권한이 차단되었습니다.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // 고유 ID로 명함 교환 실행 (로컬스토리지 + 서버 실시간 조회)
  const handleExchangeById = async (codeToSearch?: string) => {
    const code = (codeToSearch || exchangeId).trim();
    if (!code) {
      onShowToast('교환할 상대방의 고유 ID(예: @my_id)를 입력해주세요.');
      return;
    }

    try {
      const matchedCard = await storage.findCardByCodeAsync(code);
      if (!matchedCard) {
        onShowToast(`해당 ID('${code}')의 명함을 찾을 수 없습니다. (스마트폰에서 명함 생성 후 같은 Wi-Fi 확인)`);
        return;
      }

      // 내 지갑에 저장
      storage.addExchangedCard(matchedCard, '고유 ID 교환 완료');
      onExchangeSuccess(matchedCard);
      onShowToast(`🎉 '${matchedCard.name}'님의 명함 교환이 완료되었습니다!`);
      onClose();
    } catch {
      onShowToast(`명함 조회 중 오류가 발생했습니다.`);
    }
  };

  // 1초 테스트 QR 자동 시뮬레이션
  const handleSimulateTestQR = () => {
    const sampleCodes = ['@sarah_art', '@hyunwoo_dev', '@chloe_pm'];
    const randomCode = sampleCodes[Math.floor(Math.random() * sampleCodes.length)];
    handleExchangeById(randomCode);
  };

  // 링크 공유
  const handleShareLink = async () => {
    const url = getCardShareUrl(activeCard);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${activeCard.name}님의 디지털 명함`,
          url: url
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      onShowToast('📋 내 명함 링크가 복사되었습니다.');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      onShowToast('링크 복사 실패');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#151622] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 text-white shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-1 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base">명함 교환하기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 전환 */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setTab('my-qr')}
            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'my-qr' ? 'bg-sky-500 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>내 QR</span>
          </button>

          <button
            onClick={() => setTab('camera')}
            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'camera' ? 'bg-sky-500 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>카메라 스캔</span>
          </button>

          <button
            onClick={() => setTab('id')}
            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'id' ? 'bg-sky-500 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>ID 입력</span>
          </button>
        </div>

        {/* 탭 1: 내 명함 QR */}
        {tab === 'my-qr' && (
          <div className="flex flex-col items-center py-2 space-y-3">
            <div className="p-3 bg-white rounded-2xl shadow-xl">
              {qrUrl ? (
                <img src={qrUrl} alt="My QR" className="w-44 h-44 block" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-500 text-xs">
                  QR 생성 중...
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-xs font-bold text-white">{activeCard.name}님의 대표 명함 QR</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{activeCard.uniqueCode}</div>
              <div className="text-[11px] text-sky-400/80 mt-1">상대방 스마트폰 카메라로 비추면 3D 명함이 열립니다.</div>
            </div>

            <button
              onClick={handleShareLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all border border-white/10"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-sky-400" />}
              <span>{isCopied ? '링크 복사 완료!' : '내 명함 링크 공유하기'}</span>
            </button>
          </div>
        )}

        {/* 탭 2: 카메라로 스캔 */}
        {tab === 'camera' && (
          <div className="flex flex-col items-center py-2 space-y-3">
            <div className="relative w-full h-44 bg-black/60 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              {cameraError ? (
                <div className="text-center px-4 py-3 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
                    !
                  </div>
                  <div className="text-[11px] text-amber-200/90 leading-relaxed font-medium">
                    {cameraError}
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1">
                    스마트폰의 <strong>기본 카메라 앱</strong>으로 상대방 QR을 비추면 바로 열립니다.
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* 뷰파인더 가이드라인 & 레이저 애니메이션 */}
                  <div className="absolute inset-4 border-2 border-dashed border-sky-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse" />
                  </div>
                </>
              )}
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={handleSimulateTestQR}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>[시연용] 1초 테스트 QR 자동 인식 교환</span>
              </button>

              <button
                onClick={() => setTab('id')}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                상대방 고유 ID(@ID)로 직접 교환하기 ➔
              </button>
            </div>
          </div>
        )}

        {/* 탭 3: 고유 ID로 검색 */}
        {tab === 'id' && (
          <div className="py-2 space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">상대방 고유 ID (@code)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={exchangeId}
                  onChange={e => setExchangeId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleExchangeById()}
                  placeholder="@sarah_art, @hyunwoo_dev 등"
                  className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors font-mono"
                />
                <button
                  onClick={() => handleExchangeById()}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white transition-colors"
                >
                  교환
                </button>
              </div>
            </div>

            {/* 샘플 빠른 테스트 칩 */}
            <div className="pt-1">
              <span className="text-[11px] text-slate-400 block mb-1.5">테스트용 추천 ID:</span>
              <div className="flex flex-wrap gap-1.5">
                {['@sarah_art (이서연 디자이너)', '@hyunwoo_dev (박현우 개발자)', '@chloe_pm (최지우 PO)'].map(item => {
                  const code = item.split(' ')[0];
                  return (
                    <button
                      key={code}
                      onClick={() => handleExchangeById(code)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-sky-300 font-mono transition-colors"
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
