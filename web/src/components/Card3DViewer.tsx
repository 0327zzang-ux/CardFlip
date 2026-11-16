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
}

export const Card3DViewer: React.FC<Card3DViewerProps> = ({
  card,
  skinId,
  isFlipped = false,
  onFlipToggle,
  className = '',
  allowDrag = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardMeshRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameId = useRef<number | null>(null);

  // 물리 회전 상태
  const isDragging = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: isFlipped ? Math.PI : 0 });
  const currentRotation = useRef({ x: 0, y: isFlipped ? Math.PI : 0 });
  const gyroOffset = useRef({ x: 0, y: 0 });

  const activeSkin = skinId || card.skinId || 'hologram';

  // 1. Three.js 씬 초기화
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
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3점 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 7, 6);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.85);
    dirLight2.position.set(-6, -4, 4);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xa855f7, 1.2, 12);
    pointLight.position.set(0, 3, 4);
    scene.add(pointLight);

    // 카드 메시 생성 (표준 명함 비율 85.6mm : 54mm)
    const geom = new THREE.BoxGeometry(3.38, 2.14, 0.04);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x222230,
      metalness: 0.8,
      roughness: 0.3
    });

    const frontMat = createSkinMaterial(card, activeSkin, true);
    const backMat = createSkinMaterial(card, activeSkin, false);

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

    // 렌더 루프
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);

      if (cardMeshRef.current) {
        currentRotation.current.x += (targetRotation.current.x + gyroOffset.current.x - currentRotation.current.x) * 0.1;
        currentRotation.current.y += (targetRotation.current.y + gyroOffset.current.y - currentRotation.current.y) * 0.1;

        cardMeshRef.current.rotation.x = currentRotation.current.x;
        cardMeshRef.current.rotation.y = currentRotation.current.y;

        const time = performance.now() * 0.0015;
        cardMeshRef.current.position.y = Math.sin(time) * 0.07;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

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
      window.removeEventListener('resize', handleResize);
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      geom.dispose();
      renderer.dispose();
    };
  }, []);

  // 2. 카드 데이터 또는 스킨 변경 시 머티리얼 텍스처 업데이트
  useEffect(() => {
    if (!cardMeshRef.current) return;
    const mesh = cardMeshRef.current;
    if (Array.isArray(mesh.material)) {
      // 이전 텍스처 메모리 해제
      const oldFront = mesh.material[4] as THREE.MeshStandardMaterial;
      const oldBack = mesh.material[5] as THREE.MeshStandardMaterial;
      if (oldFront.map) oldFront.map.dispose();
      if (oldBack.map) oldBack.map.dispose();
      oldFront.dispose();
      oldBack.dispose();

      mesh.material[4] = createSkinMaterial(card, activeSkin, true);
      mesh.material[5] = createSkinMaterial(card, activeSkin, false);
    }
  }, [card, activeSkin]);

  // 3. 플립 상태 변경 반영
  useEffect(() => {
    targetRotation.current.y = isFlipped ? Math.PI : 0;
    targetRotation.current.x = 0;
  }, [isFlipped]);

  // 마우스/터치 드래그 리스너
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!allowDrag) return;
    isDragging.current = true;
    prevPointer.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!allowDrag || !isDragging.current) return;
    const dx = clientX - prevPointer.current.x;
    const dy = clientY - prevPointer.current.y;

    targetRotation.current.y += dx * 0.009;
    targetRotation.current.x += dy * 0.009;
    targetRotation.current.x = Math.max(-0.9, Math.min(0.9, targetRotation.current.x));

    prevPointer.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
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
      onDoubleClick={onFlipToggle}
    />
  );
};

// --- Three.js 머티리얼 & 2D 캔버스 텍스처 팩토리 함수 ---

function createSkinMaterial(card: CardData, skinId: SkinId, isFront: boolean): THREE.Material {
  const texture = createCardCanvasTexture(card, skinId, isFront);

  switch (skinId) {
    case 'hologram':
      return new THREE.MeshPhysicalMaterial({
        map: texture,
        metalness: 0.85,
        roughness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        reflectivity: 0.95
      });
    case 'matte':
      return new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        metalness: 0.2,
        roughness: 0.8
      });
    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        map: texture,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.75,
        transparent: true,
        opacity: 0.95
      });
    case 'neon':
      return new THREE.MeshStandardMaterial({
        map: texture,
        emissive: new THREE.Color(0x06b6d4),
        emissiveIntensity: 0.2,
        metalness: 0.65,
        roughness: 0.3
      });
    case 'gold':
      return new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.92,
        roughness: 0.22
      });
    default:
      return new THREE.MeshStandardMaterial({ map: texture });
  }
}

function createCardCanvasTexture(card: CardData, skinId: SkinId, isFront: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 648;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 배경 그라디언트 채우기
  drawCardBackground(ctx, skinId);

  if (isFront) {
    // [앞면 디자인]
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(card.name, 60, 140);

    // 소속 태그 배지
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    roundRect(ctx, 60, 180, 500, 52, 12, true);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(card.affiliation, 80, 215);

    // 직업/직무
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(card.occupation, 60, 300);

    // 연락처 및 이메일
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '26px sans-serif';
    ctx.fillText('✉ ' + card.email, 60, 480);
    ctx.fillText('☎ ' + card.phone, 60, 530);

    // 고유 식별자 코드 배지
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(card.uniqueCode || '#CARD', 960, 90);
    ctx.textAlign = 'left';

    // 엠블럼 데코레이션 서클
    ctx.beginPath();
    ctx.arc(880, 510, 45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();
  } else {
    // [뒷면 디자인]
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('IDENTITY & PORTFOLIO', 60, 90);

    // 바이오 문구
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '500 28px sans-serif';
    wrapText(ctx, '"' + (card.bio || '새로운 디지털 인터랙션을 만듭니다.') + '"', 60, 170, 900, 42);

    // 링크 헤더
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '22px sans-serif';
    ctx.fillText('CONNECT VIA HYPERLINKS', 60, 350);

    // 링크 칩 가상 드로잉
    const links = card.links || [];
    let lx = 60;
    links.forEach((l) => {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      roundRect(ctx, lx, 380, 240, 56, 14, true);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(l.label, lx + 20, 416);
      lx += 260;
    });

    // 하단 문구
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '20px monospace';
    ctx.fillText('DOUBLE TAP TO FLIP FRONT ↔ BACK', 60, 560);
    ctx.textAlign = 'right';
    ctx.fillText(card.uniqueCode, 960, 560);
    ctx.textAlign = 'left';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function drawCardBackground(ctx: CanvasRenderingContext2D, skinId: SkinId) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  let grad: CanvasGradient;

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean
) {
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
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
