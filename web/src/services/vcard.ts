import type { CardData } from '../types/card';

/**
 * vCard (.vcf) 생성 및 스마트폰 주소록 저장 다운로더
 * iOS Contacts 및 Android 연락처 앱과 100% 호환되는 vCard 3.0 포맷
 */
export function generateVCardString(card: CardData): string {
  // vCard 3.0 포맷 구성
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${card.name};;;;`,
    `FN:${card.name}`,
    `ORG:${card.affiliation}`,
    `TITLE:${card.occupation}`,
    `TEL;TYPE=CELL,VOICE:${card.phone}`,
    `EMAIL;TYPE=WORK,INTERNET:${card.email}`,
    `NOTE:${card.bio.replace(/\n/g, ' ')} [CardFlip ID: ${card.uniqueCode}]`
  ];

  // 주요 링크를 URL 필드로 추가
  if (card.links && card.links.length > 0) {
    lines.push(`URL:${card.links[0].url}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * 모바일 및 데스크톱에서 .vcf 파일을 즉시 다운로드하거나 주소록 앱으로 연결
 */
export function downloadVCard(card: CardData): void {
  const vcfContent = generateVCardString(card);
  const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const fileName = `${card.name}_${card.uniqueCode.replace(/[^a-zA-Z0-9_-]/g, '')}.vcf`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
