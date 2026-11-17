import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CardData, SkinId } from '../types/card';

interface Card3DViewerProps {
  card: CardData;
  skinId?: SkinId;
  isFlipped?: boolean;
  onFlipToggle?: () => void;
  className?: string;
  allowDrag?: boolean;
  isLarge?: boolean;
  isHorizontal?: boolean;
}

export const Card3DViewer: React.FC<Card3DViewerProps> = ({
  card,
  skinId,
  isFlipped = false,
  onFlipToggle,
  className = '',
  allowDrag = true,
  isLarge = false,
  isHorizontal = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardMeshRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameId = useRef<number | null>(null);
  const isLargeRef = useRef(isLarge);
  isLargeRef.current = isLarge;

  // 물리 회전 및 관성(Inertia) 상태
  const isDragging = useRef(false);
  const isAligning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0, time: 0 });
  const pointerStart = useRef({ x: 0, y: 0, time: 0 });
  const hasMovedSignificantly = useRef(false);
  const currentRotation = useRef({ x: 0, y: isFlipped ? Math.PI : 0 });
  const targetRotation = useRef({ x: 0, y: isFlipped ? Math.PI : 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const gyroOffset = useRef({ x: 0, y: 0 });
  const aspectRef = useRef(1.0);

  const activeSkin = skinId || card?.skinId || 'hologram';

  if (!card) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center text-slate-500 text-xs ${className}`}>
        명함 정보를 불러올 수 없습니다.
      </div>
    );
  }

  // 1. Three.js 씬 및 정면 고휘도 조명 시스템 초기화
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // [정면 조명 시스템] 명함 정면을 수직 방향에서 환하고 또렷하게 비추도록 조명 각도 최적화
    // 1) 균일한 환경광 (기본 밝기 확보)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    // 2) 정면 상단 좌/우에서 명함 앞면을 직접 비추는 듀얼 정면 키라이트
    const frontLightLeft = new THREE.DirectionalLight(0xffffff, 0.95);
    frontLightLeft.position.set(-1.8, 2.2, 5.5);
    scene.add(frontLightLeft);

    const frontLightRight = new THREE.DirectionalLight(0xffffff, 0.95);
    frontLightRight.position.set(1.8, 2.2, 5.5);
    scene.add(frontLightRight);

    // 3) 정면 하단 쿨톤 필라이트 (입체감 보정)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(0, -2.5, 4.5);
    scene.add(fillLight);

    // 4) 후면 키라이트 (뒷면 뒤집힘 대응)
    const backKeyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    backKeyLight.position.set(0, 1.5, -6.5);
    scene.add(backKeyLight);

    // 카드 메시 생성 (isHorizontal ? 가로 85.6mm : 54mm : 세로 54mm : 85.6mm)
    const geom = isHorizontal
      ? new THREE.BoxGeometry(3.38, 2.14, 0.04)
      : new THREE.BoxGeometry(2.14, 3.38, 0.04);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x333345,
      metalness: 0.7,
      roughness: 0.3
    });

    const frontMat = createSkinMaterial(card, activeSkin, true, isHorizontal);
    const backMat = createSkinMaterial(card, activeSkin, false, isHorizontal);

    const materials = [
      edgeMaterial, // +X
      edgeMaterial, // -X
      edgeMaterial, // +Y
      edgeMaterial, // -Y
      frontMat,     // +Z 앞면
      backMat       // -Z 뒷면
    ];

    const cardMesh = new THREE.Mesh(geom, materials);
    scene.add(cardMesh);
    cardMeshRef.current = cardMesh;

    // 렌더 및 관성 회전 루프
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);

      if (cameraRef.current) {
        let targetZ = isHorizontal ? 3.2 : (isLargeRef.current ? 5.3 : 7.2);
        let targetY = isHorizontal ? 0 : (isLargeRef.current ? 0.22 : 0);
        cameraRef.current.position.z += (targetZ - cameraRef.current.position.z) * 0.1;
        cameraRef.current.position.x += (0 - cameraRef.current.position.x) * 0.1;
        cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.1;
      }

      if (cardMeshRef.current) {
        if (isAligning.current) {
          // 한번 탭 클릭 시 앞면/뒷면 수직 똑바로 정렬 애니메이션
          currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.14;
          currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.14;

          if (
            Math.abs(targetRotation.current.x - currentRotation.current.x) < 0.001 &&
            Math.abs(targetRotation.current.y - currentRotation.current.y) < 0.001
          ) {
            currentRotation.current.x = targetRotation.current.x;
            currentRotation.current.y = targetRotation.current.y;
            isAligning.current = false;
          }
        } else if (!isDragging.current) {
          // [관성 회전 & 감속] 손가락 뗀 후 잔여 속도 반영하여 서서히 감속 후 정지
          if (Math.abs(velocity.current.x) > 0.0001 || Math.abs(velocity.current.y) > 0.0001) {
            currentRotation.current.x += velocity.current.x;
            currentRotation.current.y += velocity.current.y;
            currentRotation.current.x = Math.max(-0.95, Math.min(0.95, currentRotation.current.x));

            // 감속비 0.94 적용: 서서히 멈춤 (멈췄을 때 정면 아니어도 그 각도에 멈춤)
            velocity.current.x *= 0.94;
            velocity.current.y *= 0.94;
          } else {
            velocity.current.x = 0;
            velocity.current.y = 0;
          }
        }

        // 메시 회전 적용 (+ 자이로스코프 센서 미세 오프셋)
        cardMeshRef.current.rotation.x = currentRotation.current.x + gyroOffset.current.x;
        cardMeshRef.current.rotation.y = currentRotation.current.y + gyroOffset.current.y;

        // 미세 부유 애니메이션
        const time = performance.now() * 0.0015;
        cardMeshRef.current.position.y = Math.sin(time) * 0.07;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 컨테이너 크기 변화 감지
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          aspectRef.current = w / h;
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 자이로스코프 센서
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        gyroOffset.current.y = (e.gamma / 90) * 0.35;
        gyroOffset.current.x = ((e.beta - 45) / 90) * 0.35;
      }
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      resizeObserver.disconnect();
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      geom.dispose();
      renderer.dispose();
    };
  }, []);

  // 2. 머티리얼 업데이트
  useEffect(() => {
    if (!cardMeshRef.current) return;
    const mesh = cardMeshRef.current;
    if (Array.isArray(mesh.material)) {
      const oldFront = mesh.material[4] as THREE.MeshStandardMaterial;
      const oldBack = mesh.material[5] as THREE.MeshStandardMaterial;
      if (oldFront.map) oldFront.map.dispose();
      if (oldBack.map) oldBack.map.dispose();
      oldFront.dispose();
      oldBack.dispose();

      mesh.material[4] = createSkinMaterial(card, activeSkin, true, isHorizontal);
      mesh.material[5] = createSkinMaterial(card, activeSkin, false, isHorizontal);
    }
  }, [card, activeSkin, isHorizontal]);

  // 3. 플립 상태 변경 외부 반영
  useEffect(() => {
    targetRotation.current.x = 0;
    targetRotation.current.y = isFlipped ? Math.PI : 0;
    isAligning.current = true;
  }, [isFlipped]);

  // 마우스/터치 드래그 및 단일 탭 제스처 리스너
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!allowDrag) return;
    isDragging.current = true;
    isAligning.current = false;
    velocity.current = { x: 0, y: 0 };
    hasMovedSignificantly.current = false;
    const now = performance.now();
    lastPointer.current = { x: clientX, y: clientY, time: now };
    pointerStart.current = { x: clientX, y: clientY, time: now };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!allowDrag || !isDragging.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastPointer.current.time);
    const dx = clientX - lastPointer.current.x;
    const dy = clientY - lastPointer.current.y;

    const distFromStart = Math.hypot(clientX - pointerStart.current.x, clientY - pointerStart.current.y);
    if (distFromStart > 6) {
      hasMovedSignificantly.current = true;
    }

    // 손가락 움직임 속도 계산 (low-pass filter로 부드러운 가속)
    const instantVx = (dy / dt) * 0.045;
    const instantVy = (dx / dt) * 0.045;
    velocity.current.x = velocity.current.x * 0.35 + instantVx * 0.65;
    velocity.current.y = velocity.current.y * 0.35 + instantVy * 0.65;

    // 손가락에 따라 즉각 3D 틸트/회전 반영
    currentRotation.current.y += dx * 0.008;
    currentRotation.current.x += dy * 0.008;
    currentRotation.current.x = Math.max(-0.95, Math.min(0.95, currentRotation.current.x));

    lastPointer.current = { x: clientX, y: clientY, time: now };
  };

  // 단 한 번의 가벼운 터치/클릭 시 똑바로 정렬(앞면 ↔ 뒷면)
  const triggerSingleTapAlign = () => {
    velocity.current = { x: 0, y: 0 };
    const curY = currentRotation.current.y;
    const cosY = Math.cos(curY);

    // X축 틸트는 0으로 완전 제거(수직 똑바로 정렬)
    targetRotation.current.x = 0;

    if (cosY >= 0) {
      // 현재 앞면을 보고 있는 각도 -> 가장 가까운 뒷면 각도 ((2k+1)*PI)로 똑바로 정렬
      const k = Math.round((curY - Math.PI) / (2 * Math.PI));
      targetRotation.current.y = (2 * k + 1) * Math.PI;
    } else {
      // 현재 뒷면을 보고 있는 각도 -> 가장 가까운 앞면 각도 (2k*PI)로 똑바로 정렬
      const k = Math.round(curY / (2 * Math.PI));
      targetRotation.current.y = 2 * k * Math.PI;
    }

    isAligning.current = true;
    onFlipToggle?.();
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const now = performance.now();
    const duration = now - pointerStart.current.time;

    // 손가락이 멈춘 상태로 80ms 이상 머무른 후 뗐다면 관성 속도 0 처리
    if (now - lastPointer.current.time > 80) {
      velocity.current = { x: 0, y: 0 };
    } else {
      // 최대 회전 속도 제한 (자연스러운 스핀)
      const maxSpeed = 0.055;
      velocity.current.y = Math.max(-maxSpeed, Math.min(maxSpeed, velocity.current.y));
      velocity.current.x = Math.max(-maxSpeed * 0.5, Math.min(maxSpeed * 0.5, velocity.current.x));
    }

    // [단 한 번의 터치/클릭] 시 앞면 혹은 뒷면으로 똑바로 정렬
    if (!hasMovedSignificantly.current && duration < 350) {
      triggerSingleTapAlign();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
      onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handlePointerUp}
    />
  );
};

// --- Three.js 머티리얼 & 2D 캔버스 텍스처 팩토리 함수 ---

function createSkinMaterial(card: CardData, skinId: SkinId, isFront: boolean, isHorizontal = false): THREE.Material {
  const texture = createCardCanvasTexture(card, skinId, isFront, isHorizontal);

  switch (skinId) {
    case 'hologram':
      return new THREE.MeshPhysicalMaterial({
        map: texture,
        metalness: 0.35,
        roughness: 0.32,
        clearcoat: 0.7,
        clearcoatRoughness: 0.25,
        reflectivity: 0.75
      });
    case 'matte':
      return new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        metalness: 0.15,
        roughness: 0.65
      });
    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        map: texture,
        metalness: 0.1,
        roughness: 0.18,
        transmission: 0.75,
        transparent: true,
        opacity: 0.96
      });
    case 'neon':
      return new THREE.MeshStandardMaterial({
        map: texture,
        emissive: new THREE.Color(0x06b6d4),
        emissiveIntensity: 0.28,
        metalness: 0.55,
        roughness: 0.25
      });
    case 'gold':
      return new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.88,
        roughness: 0.18
      });
    default:
      return new THREE.MeshStandardMaterial({ map: texture });
  }
}

function createCardCanvasTexture(card: CardData, skinId: SkinId, isFront: boolean, isHorizontal = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  if (isHorizontal) {
    canvas.width = 1024;
    canvas.height = 648;
  } else {
    canvas.width = 648;
    canvas.height = 1024;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  if (!isHorizontal) {
    // 세로 모드일 때만 시계방향 90도 회전 변환 적용 (가로 1024x648 -> 세로 648x1024)
    ctx.save();
    ctx.translate(648, 0);
    ctx.rotate(Math.PI / 2);
  }

  // 배경 그라디언트 채우기 (가로 기준 1024 x 648, 고휘도 밝은 톤)
  drawCardBackground(ctx, skinId, 1024, 648);

  if (isFront) {
    // [앞면 디자인] 선명한 백색 타이포 및 드롭 섀도우
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Pretendard, system-ui, -apple-system, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillText(card?.name || '', 64, 140);
    ctx.shadowColor = 'transparent';

    // 소속 태그 배지
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    roundRect(ctx, 64, 175, 520, 56, 14, true);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px Pretendard, system-ui, -apple-system, sans-serif';
    ctx.fillText(card?.affiliation || '', 84, 212);

    // 직업/직무
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 34px Pretendard, system-ui, -apple-system, sans-serif';
    ctx.fillText(card?.occupation || '', 64, 295);

    // 미니멀 구분선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 380);
    ctx.lineTo(960, 380);
    ctx.stroke();

    // 연락처 및 이메일
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '500 28px Pretendard, system-ui, -apple-system, sans-serif';
    ctx.fillText('✉  ' + (card?.email || ''), 64, 465);
    ctx.fillText('☎  ' + (card?.phone || ''), 64, 520);

    // 고유 식별자 코드 배지
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(card?.uniqueCode || '#CARD', 960, 95);
    ctx.textAlign = 'left';

    // 엠블럼 데코레이션 서클
    ctx.beginPath();
    ctx.arc(880, 500, 48, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.stroke();
  } else {
    // [뒷면 디자인]
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('IDENTITY & PORTFOLIO', 60, 90);

    // 바이오 문구
    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 28px sans-serif';
    wrapText(ctx, '"' + (card?.bio || '새로운 디지털 인터랙션을 만듭니다.') + '"', 60, 170, 900, 42);

    // 링크 헤더
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '22px sans-serif';
    ctx.fillText('CONNECT VIA HYPERLINKS', 60, 350);

    // 링크 칩 가상 드로잉
    const links = card?.links || [];
    let lx = 60;
    links.forEach((l) => {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      roundRect(ctx, lx, 380, 240, 56, 14, true);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(l?.label || '', lx + 20, 416);
      lx += 260;
    });

    // 하단 문구
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('TAP TO FLIP FRONT ↔ BACK', 64, 560);
    ctx.textAlign = 'right';
    ctx.fillText(card?.uniqueCode || '#CARD', 960, 560);
    ctx.textAlign = 'left';
  }

  if (!isHorizontal) {
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function drawCardBackground(ctx: CanvasRenderingContext2D, skinId: SkinId, w = 1024, h = 648) {
  let grad: CanvasGradient;

  switch (skinId) {
    case 'hologram':
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.3, '#312e81');
      grad.addColorStop(0.65, '#4338ca');
      grad.addColorStop(1, '#0f172a');
      break;
    case 'matte':
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1f202b');
      grad.addColorStop(0.5, '#161720');
      grad.addColorStop(1, '#0d0e14');
      break;
    case 'glass':
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.5, '#0369a1');
      grad.addColorStop(1, '#075985');
      break;
    case 'neon':
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#083344');
      grad.addColorStop(0.5, '#0e7490');
      grad.addColorStop(1, '#030712');
      break;
    case 'gold':
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#a16207');
      grad.addColorStop(0.4, '#eab308');
      grad.addColorStop(0.7, '#ca8a04');
      grad.addColorStop(1, '#854d0e');
      break;
    default:
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 미세한 상단 반사 하이라이트 (글레어 없는 은은한 입체감)
  const highlight = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  highlight.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlight;
  ctx.fillRect(0, 0, w, h * 0.35);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
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
