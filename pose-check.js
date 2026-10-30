(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const backdrop = $('poseBackdrop');
  if (!backdrop) return;

  const video = $('poseVideo');
  const canvas = $('poseCanvas');
  const ctx = canvas.getContext('2d');
  const startButton = $('startPoseCamera');
  const stopButton = $('stopPoseCamera');
  const stageMessage = $('poseStageMessage');
  const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

  let stream = null;
  let landmarker = null;
  let frameRequest = 0;
  let lastVideoTime = -1;
  let repCount = 0;
  let hasReachedBottom = false;
  let lastRepAt = 0;
  let cameraRunning = false;
  let startGeneration = 0;

  const status = (message, feedback = '') => {
    stageMessage.textContent = message;
    stageMessage.hidden = cameraRunning;
    if (feedback) $('poseFeedback').textContent = feedback;
  };

  function openDialog() {
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    $('closePoseCheck').focus();
  }

  function angleAt(a, b, c) {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
    if (!mag) return null;
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
  }

  function chooseVisibleSide(points) {
    const sides = [[23, 25, 27], [24, 26, 28]];
    let best = null;
    for (const ids of sides) {
      const joints = ids.map((id) => points[id]);
      const visibility = Math.min(...joints.map((point) => point?.visibility ?? 0));
      if (visibility > (best?.visibility ?? 0)) best = { ids, joints, visibility };
    }
    return best?.visibility >= 0.45 ? best : null;
  }

  function drawPose(points, ids) {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);
    const visible = (id) => points[id] && (points[id].visibility ?? 0) >= 0.35;
    const chains = [[11, 23, ids[1], ids[2]], [12, 24, ids[1], ids[2]], [11, 12], [23, 24], [11, 13, 15], [12, 14, 16]];
    ctx.lineWidth = Math.max(3, width * 0.006);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d9ed81';
    ctx.fillStyle = '#ffffff';
    for (const chain of chains) {
      for (let i = 0; i < chain.length - 1; i += 1) {
        const a = points[chain[i]];
        const b = points[chain[i + 1]];
        if (!visible(chain[i]) || !visible(chain[i + 1])) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
      }
    }
    for (const point of points) {
      if (!point || (point.visibility ?? 0) < 0.45) continue;
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, Math.max(3, width * 0.008), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function processPose(result) {
    const points = result.landmarks?.[0];
    if (!points) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      $('poseKneeAngle').textContent = '—';
      $('posePhase').textContent = '인식 중';
      $('poseFeedback').textContent = '전신이 화면 안에 들어오도록 위치를 조정해보세요.';
      return;
    }

    const side = chooseVisibleSide(points);
    if (!side) {
      $('poseKneeAngle').textContent = '—';
      $('posePhase').textContent = '확인 중';
      $('poseFeedback').textContent = '무릎과 발목이 가려지지 않도록 옆면에서 촬영해주세요.';
      return;
    }

    drawPose(points, side.ids);
    const innerAngle = angleAt(side.joints[0], side.joints[1], side.joints[2]);
    if (innerAngle === null) return;
    const bend = Math.max(0, 180 - innerAngle);
    $('poseKneeAngle').textContent = `${Math.round(bend)}°`;

    if (bend >= 38) {
      hasReachedBottom = true;
      $('posePhase').textContent = '내려가는 구간';
      $('poseFeedback').textContent = '무릎이 굽혀지는 움직임으로 보여요. 편안한 범위에서 이어가세요.';
    } else if (bend <= 22) {
      $('posePhase').textContent = '서 있는 구간';
      $('poseFeedback').textContent = '다시 서 있는 구간으로 보여요. 무리 없이 호흡을 이어가세요.';
      const now = performance.now();
      if (hasReachedBottom && now - lastRepAt > 650) {
        repCount += 1;
        lastRepAt = now;
        $('poseRepCount').textContent = `${repCount}회`;
        hasReachedBottom = false;
      }
    } else {
      $('posePhase').textContent = '중간 구간';
      $('poseFeedback').textContent = '움직임을 추적 중이에요. 본인에게 편한 깊이로 진행하세요.';
    }
  }

  function renderLoop() {
    if (!cameraRunning || !landmarker) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
      try {
        processPose(landmarker.detectForVideo(video, performance.now()));
      } catch (error) {
        console.warn('Pose frame skipped', error);
      }
      lastVideoTime = video.currentTime;
    }
    frameRequest = requestAnimationFrame(renderLoop);
  }

  async function stopCamera(showMessage = true) {
    startGeneration += 1;
    cameraRunning = false;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
    if (landmarker) {
      try { landmarker.close(); } catch { /* already closed */ }
    }
    landmarker = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    startButton.disabled = false;
    stopButton.disabled = true;
    $('posePhase').textContent = '대기 중';
    $('poseKneeAngle').textContent = '—';
    if (showMessage) status('카메라가 꺼졌어요. 필요할 때 다시 시작할 수 있습니다.', '영상은 저장되지 않았어요.');
  }

  async function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      status('카메라 사용은 HTTPS로 열린 사이트나 localhost에서만 가능합니다.', '현재 주소에서는 카메라를 열 수 없어요.');
      return;
    }
    const generation = ++startGeneration;
    startButton.disabled = true;
    $('poseRepCount').textContent = '0회';
    repCount = 0;
    hasReachedBottom = false;
    status('카메라 권한을 확인하고 있어요. 브라우저의 허용을 눌러주세요.');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
      if (generation !== startGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
        return;
      }
      video.srcObject = stream;
      await video.play();
      status('관절 분석 모델을 준비 중이에요. 첫 실행은 잠시 걸릴 수 있어요.');
      const vision = await import(`${CDN}/vision_bundle.mjs`);
      if (generation !== startGeneration) return;
      const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      if (generation !== startGeneration) return;
      const options = {
        baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO', numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      };
      try {
        landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options);
      } catch (gpuError) {
        if (generation !== startGeneration) return;
        console.info('GPU pose delegate unavailable; retrying with CPU.', gpuError);
        options.baseOptions = { modelAssetPath: MODEL, delegate: 'CPU' };
        landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options);
      }
      if (generation !== startGeneration) {
        try { landmarker.close(); } catch { /* already closed */ }
        landmarker = null;
        return;
      }
      cameraRunning = true;
      stageMessage.hidden = true;
      stopButton.disabled = false;
      $('posePhase').textContent = '인식 중';
      $('poseFeedback').textContent = '옆면에서 전신이 잘 보이도록 서주세요.';
      renderLoop();
    } catch (error) {
      if (generation !== startGeneration) return;
      console.error('Pose camera setup failed', error);
      await stopCamera(false);
      const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
      status(denied ? '카메라 권한이 허용되지 않았어요. 주소창의 카메라 권한을 확인해주세요.' : '카메라 또는 분석 모델을 불러오지 못했어요. 인터넷 연결과 카메라를 확인한 뒤 다시 시도해주세요.', denied ? '브라우저 설정에서 카메라를 허용한 뒤 다시 시도하세요.' : '오류가 계속되면 다른 최신 브라우저에서 열어보세요.');
      startButton.disabled = false;
    }
  }

  $('openPoseCheck').addEventListener('click', openDialog);
  $('closePoseCheck').addEventListener('click', async () => {
    await stopCamera();
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    $('openPoseCheck').focus();
  });
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) $('closePoseCheck').click();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && backdrop.classList.contains('open')) $('closePoseCheck').click();
  });
  startButton.addEventListener('click', startCamera);
  stopButton.addEventListener('click', () => stopCamera());
})();
