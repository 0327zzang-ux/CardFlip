import QRCode from 'qrcode';
import type { CardData } from '../types/card';

/**
 * 명함의 퍼블릭 접속 URL 생성
 * 예: https://domain.com/?u=minsu_design
 */
export function getCardShareUrl(card: CardData): string {
  const origin = window.location.origin;
  const username = card.uniqueCode.replace(/^@/, '');
  // 배포 시 /@username 또는 ?u=username 지원
  return `${origin}/?u=${encodeURIComponent(username)}`;
}

/**
 * 고유 URL에 대한 QR 코드 이미지 Data URL 생성
 */
export async function generateCardQRCode(card: CardData): Promise<string> {
  const shareUrl = getCardShareUrl(card);
  try {
    return await QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return '';
  }
}
