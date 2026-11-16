/**
 * card3d.js : Three.js 기반 3D 카드 렌더링, 360° 물리 회전, 180° 플립 및 5종 스킨 셰이더 엔진
 */

class Card3DEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cardMesh = null;
    
    // 회전 물리 파라미터
    this.isDragging = false;
    this.prevPointerPos = { x: 0, y: 0 };
    this.angularVelocity = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };
    
    // 180도 플립 상태 (false = 앞면, true = 뒷면)
    this.isFlipped = false;
    this.flipProgress = 0; // 0 (0 rad) ~ 1 (PI rad)
    this.isFlipping = false;
    
    // 자이로스코프 기울기 오프셋
    this.gyroOffset = { x: 0, y: 0 };
    
    // 현재 표시 중인 명함 데이터 & 스킨 ID
    this.currentCard = null;
    this.currentSkinId = 'hologram';

    this.initScene();
    this.setupEventListeners();
    this.animate();
  }

  initScene() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // 1. 씬 & 카메라
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 7.2);

    // 2. 렌더러 (투명 배경 및 안티에일리어싱)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 3. 조명 (PBR 메탈릭 반사를 위한 3점 조명)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 7, 6);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-6, -4, 4);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xa855f7, 1.0, 10);
    pointLight.position.set(0, 3, 4);
    this.scene.add(pointLight);

    // 4. 카드 메시 생성 (신용카드 비율 85.6mm : 54mm -> 3.4 x 2.15 x 0.04)
    this.createCardMesh();
  }

  // 카드 3D 지오메트리 및 멀티 머티리얼 구성
  createCardMesh() {
    const geom = new THREE.BoxGeometry(3.38, 2.14, 0.04);
    
    // 박스 6개 면: [우, 좌, 상, 하, 앞(Front), 뒤(Back)]
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x222230, metalness: 0.8, roughness: 0.3 });
    const frontMaterial = this.getSkinMaterial('hologram', true);
    const backMaterial = this.getSkinMaterial('hologram', false);

    const materials = [
      edgeMaterial, // +X
      edgeMaterial, // -X
      edgeMaterial, // +Y
      edgeMaterial, // -Y
      frontMaterial, // +Z (앞면)
      backMaterial   // -Z (뒷면)
    ];

    this.cardMesh = new THREE.Mesh(geom, materials);
    this.scene.add(this.cardMesh);
  }

  // 5종 스킨 PBR 머티리얼 생성기
  getSkinMaterial(skinId, isFront) {
    const cardData = this.currentCard || window.walletManager.getActiveCard();
    const texture = this.createCardCanvasTexture(cardData, skinId, isFront);

    let mat;
    switch (skinId) {
      case 'hologram':
        mat = new THREE.MeshPhysicalMaterial({
          map: texture,
          metalness: 0.85,
          roughness: 0.15,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          reflectivity: 0.9
        });
        break;
      case 'matte':
        mat = new THREE.MeshStandardMaterial({
          map: texture,
          color: 0xffffff,
          metalness: 0.2,
          roughness: 0.8
        });
        break;
      case 'glass':
        mat = new THREE.MeshPhysicalMaterial({
          map: texture,
          metalness: 0.1,
          roughness: 0.2,
          transmission: 0.7,
          transparent: true,
          opacity: 0.95
        });
        break;
      case 'neon':
        mat = new THREE.MeshStandardMaterial({
          map: texture,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.18,
          metalness: 0.6,
          roughness: 0.3
        });
        break;
      case 'gold':
        mat = new THREE.MeshStandardMaterial({
          map: texture,
          metalness: 0.9,
          roughness: 0.25
        });
        break;
      default:
        mat = new THREE.MeshStandardMaterial({ map: texture });
    }
    return mat;
  }

  // HTML5 가상 Canvas를 활용한 고해상도 앞/뒷면 텍스처 드로잉
  createCardCanvasTexture(card, skinId, isFront) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 648;
    const ctx = canvas.getContext('2d');

    // 1. 스킨별 배경 그라디언트 채우기
    this.drawCardBackground(ctx, skinId, isFront);

    if (isFront) {
      // [앞면 디자인]
      // 이름 & 닉네임
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px sans-serif';
      ctx.fillText(card.name, 60, 140);

      // 소속 태그 배지
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      this.roundRect(ctx, 60, 180, 480, 50, 12, true);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(card.affiliation, 80, 214);

      // 직무 / 타이틀
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 32px sans-serif';
      ctx.fillText(card.occupation, 60, 300);

      // 연락처 및 이메일
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '26px sans-serif';
      ctx.fillText('✉ ' + card.email, 60, 480);
      ctx.fillText('☎ ' + card.phone, 60, 530);

      // 우측 상단 고유 식별자 코드 배지
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(card.uniqueCode || '#CARD-01', 960, 90);
      ctx.textAlign = 'left';

      // 칩/로고 장식 원형
      ctx.beginPath();
      ctx.arc(880, 510, 45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

    } else {
      // [뒷면 디자인]
      // 상단 타이틀
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('IDENTITY & PORTFOLIO', 60, 90);

      // 바이오 / 비전 문구
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '500 28px sans-serif';
      this.wrapText(ctx, '"' + (card.bio || '새로운 디지털 인터랙션을 만듭니다.') + '"', 60, 170, 900, 42);

      // 링크 섹션 안내
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '22px sans-serif';
      ctx.fillText('CONNECT VIA HYPERLINKS', 60, 350);

      // 뒷면 가상 링크 칩 버튼들 드로잉
      const links = card.links || [];
      let lx = 60;
      links.forEach(l => {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        this.roundRect(ctx, lx, 380, 240, 56, 14, true);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(l.label, lx + 20, 416);
        lx += 260;
      });

      // 하단 안내
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '20px monospace';
      ctx.fillText('DOUBLE CLICK TO FLIP FRONT ↔ BACK', 60, 560);
      ctx.textAlign = 'right';
      ctx.fillText(card.uniqueCode, 960, 560);
      ctx.textAlign = 'left';
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  drawCardBackground(ctx, skinId, isFront) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    let grad;

    switch (skinId) {
      case 'hologram':
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.3, '#312e81');
        grad.addColorStop(0.6, '#4338ca');
        grad.addColorStop(1, '#0f172a');
        break;
      case 'matte':
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#14141c');
        grad.addColorStop(1, '#09090d');
        break;
      case 'glass':
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0c4a6e');
        grad.addColorStop(0.5, '#0369a1');
        grad.addColorStop(1, '#082f49');
        break;
      case 'neon':
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.7, '#083344');
        grad.addColorStop(1, '#030712');
        break;
      case 'gold':
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#713f12');
        grad.addColorStop(0.5, '#a16207');
        grad.addColorStop(1, '#451a03');
        break;
      default:
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 테두리 글로우 라인
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  }

  // 명함 데이터 및 스킨 업데이트 반영
  updateCard(card, skinId) {
    this.currentCard = card;
    this.currentSkinId = skinId || card.skinId || 'hologram';
    if (!this.cardMesh) return;

    // 머티리얼 교체
    this.cardMesh.material[4] = this.getSkinMaterial(this.currentSkinId, true);
    this.cardMesh.material[5] = this.getSkinMaterial(this.currentSkinId, false);
  }

  // 180도 플립 토글 (앞면 <-> 뒷면)
  flipCard() {
    this.isFlipped = !this.isFlipped;
    this.targetRotation.y = this.isFlipped ? Math.PI : 0;
    this.targetRotation.x = 0;
  }

  // 이벤트 리스너 (마우스/터치 드래그, 틸트, 자이로스코프)
  setupEventListeners() {
    const dom = this.renderer.domElement;

    // --- 마우스 드래그 인터랙션 ---
    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevPointerPos.x;
      const dy = e.clientY - this.prevPointerPos.y;

      this.targetRotation.y += dx * 0.009;
      this.targetRotation.x += dy * 0.009;
      this.targetRotation.x = Math.max(-0.9, Math.min(0.9, this.targetRotation.x));

      this.prevPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // --- 모바일 터치 드래그 인터랙션 ---
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.prevPointerPos.x;
      const dy = e.touches[0].clientY - this.prevPointerPos.y;

      this.targetRotation.y += dx * 0.009;
      this.targetRotation.x += dy * 0.009;
      this.targetRotation.x = Math.max(-0.9, Math.min(0.9, this.targetRotation.x));

      this.prevPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // 더블 클릭 시 180도 플립
    dom.addEventListener('dblclick', () => {
      this.flipCard();
    });

    // --- 스마트폰 자이로스코프 센서 연동 (기울기 반응) ---
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && e.beta !== null) {
          // gamma: 좌우 롤 (-90 ~ 90), beta: 상하 피치 (-180 ~ 180)
          this.gyroOffset.y = (e.gamma / 90) * 0.35;
          this.gyroOffset.x = ((e.beta - 45) / 90) * 0.35;
        }
      });
    }

    // 윈도우 리사이즈
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  // 60fps 애니메이션 렌더 루프
  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.cardMesh) {
      // 댐핑(Damping) 보간을 통한 부드러운 회전 반응
      this.currentRotation.x += (this.targetRotation.x + this.gyroOffset.x - this.currentRotation.x) * 0.1;
      this.currentRotation.y += (this.targetRotation.y + this.gyroOffset.y - this.currentRotation.y) * 0.1;

      this.cardMesh.rotation.x = this.currentRotation.x;
      this.cardMesh.rotation.y = this.currentRotation.y;

      // 미세한 부유(Floating) 모션 효과
      const time = performance.now() * 0.0015;
      this.cardMesh.position.y = Math.sin(time) * 0.08;
    }

    this.renderer.render(this.scene, this.camera);
  }

  // 유틸리티: 둥근 모서리 사각형 드로잉
  roundRect(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  // 유틸리티: 긴 텍스트 자동 줄바꿈
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }
}

window.Card3DEngine = Card3DEngine;
