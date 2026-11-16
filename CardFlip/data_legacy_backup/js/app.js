/**
 * app.js : 2축 제스처, UI 컨트롤, 교환 모달 및 명함첩 뷰 통합 컨트롤러
 */

document.addEventListener('DOMContentLoaded', () => {
  const wallet = window.walletManager;
  const card3d = new window.Card3DEngine('canvas-container');

  // DOM 엘리먼트 캐싱
  const cardIndicator = document.getElementById('card-indicator');
  const skinIndicator = document.getElementById('skin-indicator');
  const flipBtn = document.getElementById('flip-btn');
  const linksDock = document.getElementById('links-dock');
  const toast = document.getElementById('toast');

  // 교환 모달
  const qrCameraBtn = document.getElementById('qr-camera-btn');
  const exchangeSheet = document.getElementById('exchange-sheet');
  const sheetCloseBtn = document.getElementById('sheet-close-btn');
  const sheetHandle = document.getElementById('sheet-handle');
  const demoQrBtn = document.getElementById('demo-qr-btn');
  const idInput = document.getElementById('exchange-id-input');
  const idSubmitBtn = document.getElementById('exchange-id-submit');
  const toggleMyQrBtn = document.getElementById('toggle-my-qr-btn');
  const myQrContainer = document.getElementById('my-qr-container');
  const cameraVideo = document.getElementById('camera-video');

  // 명함첩 드로어
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const walletDrawer = document.getElementById('wallet-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const walletList = document.getElementById('wallet-list');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const resetDataBtn = document.getElementById('reset-data-btn');

  // 신규 명함 모달
  const newCardModal = document.getElementById('new-card-modal');
  const newCardSubmitBtn = document.getElementById('new-card-submit');
  const newCardCancelBtn = document.getElementById('new-card-cancel');

  let activeTab = 'all';
  let videoStream = null;

  // --- 화면 갱신 함수 ---
  function updateUI() {
    const activeCard = wallet.getActiveCard();
    const myCards = wallet.getMyCards();
    const activeIdx = wallet.getActiveCardIndex();

    // 1. 3D 카드 갱신
    card3d.updateCard(activeCard, activeCard.skinId);

    // 2. 인디케이터 배지 갱신
    cardIndicator.textContent = `명함 ${activeIdx + 1}/${myCards.length}`;
    const currentSkin = window.SKINS.find(s => s.id === (activeCard.skinId || 'hologram'));
    skinIndicator.textContent = `스킨: ${currentSkin ? currentSkin.name : '기본'}`;

    // 3. 하단 스마트 링크 독 갱신
    linksDock.innerHTML = '';
    (activeCard.links || []).forEach(link => {
      const chip = document.createElement('a');
      chip.className = 'link-chip';
      chip.href = link.url;
      chip.target = '_blank';
      chip.rel = 'noopener noreferrer';
      chip.innerHTML = `${link.label} <span style="font-size:9px;opacity:0.6;">↗</span>`;
      linksDock.appendChild(chip);
    });
  }

  // 토스트 메시지 출력
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // --- 2축 제스처 내비게이션 (터치 & 키보드) ---
  let touchStartX = 0, touchStartY = 0;

  window.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (exchangeSheet.classList.contains('open') || walletDrawer.classList.contains('open')) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      // [X축: 좌우 스와이프] -> 내 다른 명함 전환
      if (dx < 0) {
        nextCard();
      } else {
        prevCard();
      }
    } else if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)) {
      // [Y축: 상하 스와이프] -> 스킨 실시간 변경
      if (dy < 0) {
        cycleSkin(1);
      } else {
        cycleSkin(-1);
      }
    }
  }, { passive: true });

  // 키보드 단축키
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight') nextCard();
    else if (e.key === 'ArrowLeft') prevCard();
    else if (e.key === 'ArrowDown') cycleSkin(1);
    else if (e.key === 'ArrowUp') cycleSkin(-1);
    else if (e.key === ' ' || e.key === 'Enter') {
      card3d.flipCard();
    }
  });

  function nextCard() {
    const myCards = wallet.getMyCards();
    const currentIdx = wallet.getActiveCardIndex();
    if (currentIdx < myCards.length - 1) {
      wallet.setActiveCardIndex(currentIdx + 1);
      updateUI();
      showToast(`명함 전환: ${wallet.getActiveCard().name} (${wallet.getActiveCard().occupation})`);
    } else {
      // 끝단 도달 시 신규 명함 작성 제안
      openNewCardModal();
    }
  }

  function prevCard() {
    const currentIdx = wallet.getActiveCardIndex();
    if (currentIdx > 0) {
      wallet.setActiveCardIndex(currentIdx - 1);
      updateUI();
      showToast(`명함 전환: ${wallet.getActiveCard().name} (${wallet.getActiveCard().occupation})`);
    }
  }

  // 스킨 롤링 적용
  function cycleSkin(direction) {
    const activeCard = wallet.getActiveCard();
    const currentSkinId = activeCard.skinId || 'hologram';
    const skinList = window.SKINS;
    const currentIndex = skinList.findIndex(s => s.id === currentSkinId);
    let nextIndex = (currentIndex + direction + skinList.length) % skinList.length;
    const newSkin = skinList[nextIndex];

    wallet.applySkinToActiveCard(newSkin.id);
    updateUI();
    showToast(`스킨 적용: ${newSkin.name}`);
  }

  // 플립 버튼 클릭
  flipBtn.addEventListener('click', () => {
    card3d.flipCard();
  });

  // --- 하단 교환 모달 (바텀 시트) ---
  qrCameraBtn.addEventListener('click', () => {
    openExchangeSheet();
  });

  sheetCloseBtn.addEventListener('click', closeExchangeSheet);
  sheetHandle.addEventListener('click', closeExchangeSheet);

  function openExchangeSheet() {
    exchangeSheet.classList.add('open');
    startCamera();
  }

  function closeExchangeSheet() {
    exchangeSheet.classList.remove('open');
    stopCamera();
    myQrContainer.style.display = 'none';
  }

  // 웹캠 뷰파인더 구동
  function startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          videoStream = stream;
          cameraVideo.srcObject = stream;
        })
        .catch(err => {
          // 보안 차단 또는 웹캠 부재 시 조용히 넘김 (1초 테스트 버튼 사용 가능)
          console.log('[Camera] Not available or blocked on HTTP:', err.message);
        });
    }
  }

  function stopCamera() {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
  }

  // [1초 테스트 QR 자동 인식] 버튼 (시연 전용 폴백)
  demoQrBtn.addEventListener('click', () => {
    const pool = window.MOCK_EXCHANGE_POOL;
    const sample = pool[Math.floor(Math.random() * pool.length)];
    const result = wallet.addExchangedCard(sample);

    if (result.success) {
      showToast(`🎉 새로운 명함 교환 성공: ${sample.name} (${sample.affiliation})`);
      closeExchangeSheet();
      renderWalletList();
    } else {
      showToast(result.message);
    }
  });

  // 고유 ID 수동 교환
  idSubmitBtn.addEventListener('click', () => {
    const code = idInput.value.trim();
    if (!code) {
      showToast('고유 ID를 입력해주세요.');
      return;
    }

    const newExCard = {
      uniqueCode: code.startsWith('@') ? code : '@' + code,
      name: '파트너 (' + code + ')',
      affiliation: '크리에이티브 네트웍스',
      occupation: '인터랙션 디렉터',
      email: 'contact@network.io',
      phone: '010-1234-5678',
      skinId: 'gold',
      bio: 'ID 입력을 통해 원격으로 교환된 명함입니다.',
      links: [{ platform: 'website', label: '공식 웹사이트', url: 'https://github.com' }]
    };

    const res = wallet.addExchangedCard(newExCard);
    if (res.success) {
      showToast(`🎉 명함 교환 완료: ${newExCard.name}`);
      idInput.value = '';
      closeExchangeSheet();
      renderWalletList();
    } else {
      showToast(res.message);
    }
  });

  // 내 명함 QR 토글
  toggleMyQrBtn.addEventListener('click', () => {
    if (myQrContainer.style.display === 'none' || !myQrContainer.style.display) {
      myQrContainer.style.display = 'flex';
      myQrContainer.innerHTML = '';
      const activeCard = wallet.getActiveCard();
      new QRCode(myQrContainer, {
        text: JSON.stringify({ code: activeCard.uniqueCode, name: activeCard.name }),
        width: 140,
        height: 140,
        colorDark: "#000000",
        colorLight: "#ffffff"
      });
    } else {
      myQrContainer.style.display = 'none';
    }
  });

  // --- 좌측 명함첩 드로어 & 자동 분류 ---
  hamburgerBtn.addEventListener('click', () => {
    walletDrawer.classList.add('open');
    renderWalletList();
  });

  drawerCloseBtn.addEventListener('click', () => {
    walletDrawer.classList.remove('open');
  });

  // 탭 전환
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderWalletList();
    });
  });

  function renderWalletList() {
    walletList.innerHTML = '';

    if (activeTab === 'all') {
      const cards = wallet.getExchangedCards();
      renderCardItems(cards, walletList);
    } else if (activeTab === 'affiliation') {
      // 🏢 소속별 자동 분류 렌더링
      const groups = wallet.groupByAffiliation();
      Object.keys(groups).forEach(aff => {
        const groupEl = document.createElement('div');
        groupEl.className = 'category-group';
        groupEl.innerHTML = `
          <div class="category-title">
            <span>🏢 ${aff}</span>
            <span style="font-size:11px;opacity:0.7;">${groups[aff].length}장</span>
          </div>
        `;
        renderCardItems(groups[aff], groupEl);
        walletList.appendChild(groupEl);
      });
    } else if (activeTab === 'occupation') {
      // 💼 직무별 자동 분류 렌더링
      const categories = wallet.groupByOccupation();
      Object.keys(categories).forEach(cat => {
        if (categories[cat].length > 0) {
          const groupEl = document.createElement('div');
          groupEl.className = 'category-group';
          groupEl.innerHTML = `
            <div class="category-title">
              <span>💼 ${cat}</span>
              <span style="font-size:11px;opacity:0.7;">${categories[cat].length}장</span>
            </div>
          `;
          renderCardItems(categories[cat], groupEl);
          walletList.appendChild(groupEl);
        }
      });
    } else if (activeTab === 'starred') {
      const cards = wallet.getExchangedCards().filter(c => c.isStarred);
      renderCardItems(cards, walletList);
    }
  }

  function renderCardItems(cards, container) {
    if (!cards || cards.length === 0) {
      container.innerHTML += `<div style="text-align:center;padding:24px;color:#64748b;font-size:12px;">등록된 명함이 없습니다.</div>`;
      return;
    }

    cards.forEach(card => {
      const item = document.createElement('div');
      item.className = 'wallet-card-item';
      item.innerHTML = `
        <div class="card-item-info">
          <h4>${card.name}</h4>
          <p>${card.affiliation} · ${card.occupation}</p>
        </div>
        <div class="card-item-tag">${card.uniqueCode}</div>
      `;

      item.addEventListener('click', () => {
        card3d.updateCard(card, card.skinId);
        showToast(`${card.name}님의 명함이 3D 스테이지에 로드되었습니다.`);
        walletDrawer.classList.remove('open');
      });

      container.appendChild(item);
    });
  }

  // 시연 데이터 초기화
  resetDataBtn.addEventListener('click', () => {
    if (confirm('시연 샘플 데이터(기본 명함 3장, 교환 명함 8장)로 복원하시겠습니까?')) {
      wallet.resetDemoData();
      updateUI();
      renderWalletList();
      showToast('초기 시연 데이터로 복원되었습니다.');
    }
  });

  // --- 신규 명함 모달 ---
  function openNewCardModal() {
    newCardModal.style.display = 'flex';
  }

  newCardCancelBtn.addEventListener('click', () => {
    newCardModal.style.display = 'none';
  });

  newCardSubmitBtn.addEventListener('click', () => {
    const name = document.getElementById('new-name').value.trim();
    const aff = document.getElementById('new-aff').value.trim();
    const occ = document.getElementById('new-occ').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const phone = document.getElementById('new-phone').value.trim();

    if (!name || !aff) {
      alert('이름과 소속을 입력해주세요.');
      return;
    }

    const newCard = wallet.createNewCard({
      name,
      affiliation: aff,
      occupation: occ || '크리에이터',
      email: email || 'contact@cardflip.app',
      phone: phone || '010-1234-5678'
    });

    newCardModal.style.display = 'none';
    updateUI();
    showToast(`새로운 명함이 추가되었습니다: ${newCard.name}`);
  });

  // 초기 실행
  updateUI();
});
