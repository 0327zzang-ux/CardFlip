import QRCode from 'qrcode';
import type { CardData } from '../types/card';

/**
 * 명함 데이터를 URL 파라미터용 Base64 문자열로 압축/인코딩 (UTF-8 안전)
 * 별도 백엔드 DB가 없어도 다른 기기(스마트폰)에서 QR 코드만으로 명함 데이터를 100% 복원 가능
 */
export function encodeCardToParam(card: CardData): string {
  try {
    const json = JSON.stringify(card);
    // encodeURIComponent를 거쳐 btoa로 안전하게 ASCII 변환 (한글 및 특수문자 완벽 지원)
    return btoa(encodeURIComponent(json));
  } catch (err) {
    console.error('Failed to encode card to param:', err);
    return '';
  }
}

/**
 * Base64 URL 파라미터로부터 명함 데이터 복원
 */
export function decodeCardFromParam(param: string): CardData | null {
  try {
    if (!param) return null;
    const json = decodeURIComponent(atob(param));
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && parsed.name) {
      return parsed as CardData;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode card from param:', err);
    return null;
  }
}

/**
 * 명함의 퍼블릭 접속 URL 생성
 * 예: https://domain.com/?u=minsu_design&d=eyJpZ...
 * ID 파라미터(?u=)와 전체 명함 데이터(?d=)를 동시에 포함하여
 * 로컬스토리지에 데이터가 없는 외부 스마트폰 기기에서도 100% 즉시 명함 열기 가능!
 */
export function getCardShareUrl(card: CardData): string {
  if (!card) return window.location.origin;

  const origin = window.location.origin;
  const username = (card.uniqueCode || '').replace(/^@/, '');
  const encodedData = encodeCardToParam(card);

  const params = new URLSearchParams();
  if (username) {
    params.set('u', username);
  }
  if (encodedData) {
    params.set('d', encodedData);
  }

  const queryStr = params.toString();
  return `${origin}${window.location.pathname}${queryStr ? `?${queryStr}` : ''}`;
}

/**
 * 고유 URL에 대한 QR 코드 이미지 Data URL 생성
 */
export async function generateCardQRCode(card: CardData): Promise<string> {
  if (!card) return '';
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
