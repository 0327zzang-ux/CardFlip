import React, { useState } from 'react';
import { type CardData, type SkinId, type LinkItem, SKINS } from '../types/card';
import { X, Plus, Trash2, Check } from 'lucide-react';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: CardData | null;
  onSave: (card: CardData) => void;
}

export const EditCardModal: React.FC<EditCardModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
  onSave
}) => {
  const isNew = !cardToEdit;

  const [name, setName] = useState(cardToEdit?.name || '');
  const [affiliation, setAffiliation] = useState(cardToEdit?.affiliation || '');
  const [occupation, setOccupation] = useState(cardToEdit?.occupation || '');
  const [email, setEmail] = useState(cardToEdit?.email || '');
  const [phone, setPhone] = useState(cardToEdit?.phone || '');
  const [bio, setBio] = useState(cardToEdit?.bio || '');
  const [uniqueCode, setUniqueCode] = useState(cardToEdit?.uniqueCode || '@my_id');
  const [skinId, setSkinId] = useState<SkinId>(cardToEdit?.skinId || 'hologram');
  const [links, setLinks] = useState<LinkItem[]>(cardToEdit?.links || []);

  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  if (!isOpen) return null;

  const handleAddLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setLinks([...links, { platform: 'portfolio', label: newLinkLabel.trim(), url: newLinkUrl.trim() }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let formattedCode = uniqueCode.trim();
    if (!formattedCode.startsWith('@')) {
      formattedCode = '@' + formattedCode;
    }

    const updatedCard: CardData = {
      id: cardToEdit?.id || `card_${Date.now()}`,
      uniqueCode: formattedCode,
      name: name.trim(),
      affiliation: affiliation.trim(),
      occupation: occupation.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      skinId,
      links,
      isPrimary: cardToEdit?.isPrimary || false
    };

    onSave(updatedCard);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#151622] border border-white/10 rounded-3xl p-5 text-white shadow-2xl max-h-[90vh] flex flex-col space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="font-bold text-base">
            {isNew ? '✨ 새 3D 명함 만들기' : '✏️ 명함 정보 수정'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {/* 스킨 선택 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">시그니처 3D 스킨</label>
            <div className="grid grid-cols-5 gap-1.5">
              {SKINS.map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSkinId(s.id)}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 border text-center transition-all ${
                    skinId === s.id
                      ? 'border-sky-400 bg-sky-500/20 font-bold shadow-sm'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] truncate max-w-full">{s.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-slate-400 block mb-1">이름</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">고유 ID (@)</label>
              <input
                type="text"
                required
                value={uniqueCode}
                onChange={e => setUniqueCode(e.target.value)}
                placeholder="@gildong_dev"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-slate-400 block mb-1">소속 (회사/학교)</label>
              <input
                type="text"
                value={affiliation}
                onChange={e => setAffiliation(e.target.value)}
                placeholder="네오스튜디오"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">직무 / 타이틀</label>
              <input
                type="text"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                placeholder="UI/UX 디자이너"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-slate-400 block mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hello@cardflip.io"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>
          </div>

          {/* 한 줄 소개 / 비전 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">한 줄 소개 / 비전 문구</label>
            <textarea
              rows={2}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="뒷면에 새겨질 나의 가치관 및 소개 문구입니다."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
            />
          </div>

          {/* 링크 추가 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">스마트 하이퍼링크 (포트폴리오, GitHub 등)</label>
            <div className="space-y-1.5">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <div className="truncate max-w-[260px]">
                    <span className="font-semibold text-sky-400 mr-2">{link.label}</span>
                    <span className="text-slate-400 text-[11px] truncate">{link.url}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={e => setNewLinkLabel(e.target.value)}
                  placeholder="라벨 (예: GitHub)"
                  className="w-1/3 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500"
                />
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-sky-400"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-sm font-bold shadow-lg shadow-sky-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isNew ? '명함 생성 완료' : '변경사항 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
