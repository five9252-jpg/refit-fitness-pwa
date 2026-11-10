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
  const finishButton = $('finishPoseCheck');
  const exerciseSelect = $('poseExercise');
  const resultPanel = $('poseResult');
  const stageMessage = $('poseStageMessage');
  const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

  let stream = null;
  let landmarker = null;
  let frameRequest = 0;
  let lastVideoTime = -1;
  let repCount = 0;
  let lastRepAt = 0;
  let cameraRunning = false;
  let startGeneration = 0;
  let trackedFrames = 0;
  let deepestBend = 0;
  let smallestMetric = Infinity;
  let startedAt = 0;
  let armed = false;
  let activeExercise = 'squat';

  const EXERCISES = {
    squat: { name: '스쿼트', joint: 'knee', label: '무릎 굽힘 추정', maxLabel: '최대 무릎 굽힘', guide: '옆면에서 머리부터 발끝까지 보이게 촬영하세요.', work: 45, rest: 22, countOnWork: false, workPhase: '내려가는 구간', restPhase: '일어선 구간', cue: '엉덩이를 낮췄다가 다시 일어나는 움직임을 추적해요.' },
    overhead: { name: '오버헤드 프레스', joint: 'elbow', label: '팔꿈치 펴짐 추정', maxLabel: '최대 팔꿈치 펴짐', guide: '몸 옆에서 어깨·팔꿈치·손목과 머리 위까지 보이게 촬영하세요.', work: 155, rest: 115, countOnWork: true, workPhase: '위로 미는 구간', restPhase: '어깨 높이 구간', cue: '어깨 높이에서 팔을 머리 위로 뻗는 움직임을 추적해요.' },
    bench: { name: '벤치프레스', joint: 'elbow', label: '팔꿈치 펴짐 추정', maxLabel: '최대 팔꿈치 펴짐', guide: '벤치 옆에서 어깨·팔꿈치·손목이 기구에 가리지 않게 촬영하세요.', work: 150, rest: 110, countOnWork: true, workPhase: '위로 미는 구간', restPhase: '가슴 쪽으로 내린 구간', cue: '팔을 굽혔다 펴는 움직임만 추적해요. 바벨 위치나 무게는 분석하지 않아요.' },
    deadlift: { name: '데드리프트', joint: 'hip', label: '엉덩관절 펴짐 추정', maxLabel: '최대 엉덩관절 펴짐', guide: '몸 옆에서 어깨·엉덩이·무릎과 발이 보이게 촬영하세요.', work: 160, rest: 120, countOnWork: true, workPhase: '일어서는 구간', restPhase: '몸을 숙인 구간', cue: '몸을 숙였다 일어서는 움직임만 추적해요. 바벨 경로나 허리의 안전성은 판정하지 않아요.' },
    lunge: { name: '런지', joint: 'knee', label: '앞무릎 굽힘 추정', maxLabel: '최대 앞무릎 굽힘', guide: '몸 옆에서 양쪽 다리와 발이 보이게 촬영하세요.', work: 50, rest: 25, countOnWork: false, workPhase: '내려가는 구간', restPhase: '일어선 구간', cue: '앞무릎을 굽혔다가 다시 일어나는 움직임을 추적해요.' },
  };
  const MOVEMENT_GUIDES = {
    squat: '준비: 발을 안정적으로 두고 엉덩이를 뒤로 보내며 내려가요. 운동 중: 무릎과 엉덩이를 굽힌 뒤 발로 바닥을 밀며 일어나요.',
    overhead: '준비: 손을 어깨 높이에 두고 몸통을 안정적으로 세워요. 운동 중: 팔꿈치를 펴며 머리 위로 밀고 천천히 내려요.',
    bench: '준비: 벤치에 안정적으로 누워 바를 가슴 쪽으로 조절해요. 운동 중: 팔꿈치를 굽혔다 펴며 바를 밀어요.',
    deadlift: '준비: 바 가까이 서서 엉덩이와 무릎을 굽혀 잡아요. 운동 중: 발로 바닥을 밀며 엉덩관절을 펴고 다시 천천히 내려요.',
    lunge: '준비: 한 발을 앞으로 내디디고 균형을 잡아요. 운동 중: 앞무릎과 엉덩이를 굽혀 내려갔다가 밀어 올라와요.',
  };

  function updateExerciseCopy() {
    const exercise = EXERCISES[exerciseSelect.value] || EXERCISES.squat;
    $('poseTitle').textContent = `${exercise.name} 자세 체크`;
    $('poseGuideText').textContent = exercise.guide;
    $('poseMetricLabel').textContent = exercise.label;
    $('poseResultMetricLabel').textContent = exercise.maxLabel;
    $('poseFeedback').textContent = exercise.cue;
    $('posePhase').textContent = '대기 중';
    $('poseKneeAngle').textContent = '—';
    resultPanel.hidden = true;
  }

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
    const width = video.videoWidth || 1;
    const height = video.videoHeight || 1;
    const ab = { x: (a.x - b.x) * width, y: (a.y - b.y) * height };
    const cb = { x: (c.x - b.x) * width, y: (c.y - b.y) * height };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
    if (!mag) return null;
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
  }

  function chooseVisibleSide(points, joint) {
    const sides = joint === 'elbow' ? [[11, 13, 15], [12, 14, 16]]
      : joint === 'hip' ? [[11, 23, 25], [12, 24, 26]]
        : [[23, 25, 27], [24, 26, 28]];
    let best = null;
    for (const ids of sides) {
      const joints = ids.map((id) => points[id]);
      const visibility = Math.min(...joints.map((point) => point?.visibility ?? 0));
      if (visibility > (best?.visibility ?? 0)) best = { ids, joints, visibility };
    }
    if (joint === 'knee' && activeExercise === 'lunge') {
      const visibleSides = sides.map((ids) => ({ ids, joints: ids.map((id) => points[id]) }))
        .filter((side) => side.joints.every((point) => (point?.visibility ?? 0) >= 0.45));
      return visibleSides.sort((a, b) => angleAt(a.joints[0], a.joints[1], a.joints[2]) - angleAt(b.joints[0], b.joints[1], b.joints[2]))[0] || null;
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
    const chains = [[11, 23], [12, 24], [23, 25, 27], [24, 26, 28], [11, 12], [23, 24], [11, 13, 15], [12, 14, 16]];
    ctx.save();
    ctx.lineWidth = Math.max(2.5, width * 0.005);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#54e4ee';
    ctx.shadowColor = '#35dce8';
    ctx.shadowBlur = Math.max(7, width * 0.018);
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
    ctx.shadowBlur = 0;
    const measured = new Set(ids || []);
    points.forEach((point, id) => {
      if (!point || (point.visibility ?? 0) < 0.45) return;
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, Math.max(4, width * 0.009), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5, 24, 30, .9)';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, width * 0.003);
      ctx.strokeStyle = measured.has(id) ? '#d9ef6d' : '#8ff5f3';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, Math.max(1.7, width * 0.004), 0, Math.PI * 2);
      ctx.fillStyle = measured.has(id) ? '#eaff9a' : '#f1ffff';
      ctx.fill();
    });
    ctx.restore();
  }


  function processPose(result) {
    const exercise = EXERCISES[activeExercise];
    const points = result.landmarks?.[0];
    if (!points) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      $('poseKneeAngle').textContent = '—';
      $('posePhase').textContent = '인식 중';
      $('poseFeedback').textContent = `관절이 보이지 않아요. ${exercise.guide}`;
      return;
    }

    const side = chooseVisibleSide(points, exercise.joint);
    if (!side) {
      $('poseKneeAngle').textContent = '—';
      $('posePhase').textContent = '확인 중';
      $('poseFeedback').textContent = `필요한 관절이 가려졌어요. ${exercise.guide}`;
      return;
    }

    drawPose(points, side.ids);
    const innerAngle = angleAt(side.joints[0], side.joints[1], side.joints[2]);
    if (innerAngle === null) return;
    const metric = exercise.joint === 'knee' ? Math.max(0, 180 - innerAngle) : innerAngle;
    trackedFrames += 1;
    deepestBend = Math.max(deepestBend, metric);
    smallestMetric = Math.min(smallestMetric, metric);
    $('poseKneeAngle').textContent = `${Math.round(metric)}°`;

    if (metric >= exercise.work) {
      $('posePhase').textContent = exercise.workPhase;
      $('poseFeedback').textContent = exercise.cue;
      if (exercise.countOnWork && armed && performance.now() - lastRepAt > 650) {
        repCount += 1;
        lastRepAt = performance.now();
        $('poseRepCount').textContent = `${repCount}회`;
        armed = false;
      } else if (!exercise.countOnWork) armed = true;
    } else if (metric <= exercise.rest) {
      $('posePhase').textContent = exercise.restPhase;
      $('poseFeedback').textContent = exercise.cue;
      const now = performance.now();
      if (!exercise.countOnWork && armed && now - lastRepAt > 650) {
        repCount += 1;
        lastRepAt = now;
        $('poseRepCount').textContent = `${repCount}회`;
        armed = false;
      } else if (exercise.countOnWork) armed = true;
    } else {
      $('posePhase').textContent = '중간 구간';
      $('poseFeedback').textContent = exercise.cue;
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
    finishButton.disabled = true;
    exerciseSelect.disabled = false;
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
    armed = false;
    lastRepAt = 0;
    lastVideoTime = -1;
    activeExercise = exerciseSelect.value in EXERCISES ? exerciseSelect.value : 'squat';
    exerciseSelect.disabled = true;
    trackedFrames = 0;
    deepestBend = 0;
    smallestMetric = Infinity;
    startedAt = 0;
    resultPanel.hidden = true;
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
      startedAt = performance.now();
      stageMessage.hidden = true;
      stopButton.disabled = false;
      finishButton.disabled = false;
      $('posePhase').textContent = '인식 중';
      $('poseFeedback').textContent = EXERCISES[activeExercise].cue;
      renderLoop();
    } catch (error) {
      if (generation !== startGeneration) return;
      console.error('Pose camera setup failed', error);
      await stopCamera(false);
      const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
      status(denied ? '카메라 권한이 허용되지 않았어요. 주소창의 카메라 권한을 확인해주세요.' : '카메라 또는 분석 모델을 불러오지 못했어요. 인터넷 연결과 카메라를 확인한 뒤 다시 시도해주세요.', denied ? '브라우저 설정에서 카메라를 허용한 뒤 다시 시도하세요.' : '오류가 계속되면 다른 최신 브라우저에서 열어보세요.');
      startButton.disabled = false;
      exerciseSelect.disabled = false;
    }
  }

  async function finishCheck() {
    if (!cameraRunning) return;
    const seconds = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
    const count = repCount;
    const frames = trackedFrames;
    const maxBend = Math.round(deepestBend);
    const exercise = EXERCISES[activeExercise];
    await stopCamera(false);
    resultPanel.hidden = false;
    $('poseResultTitle').textContent = `${exercise.name} 분석 결과`;
    $('poseResultCount').textContent = `${count}회`;
    $('poseResultTime').textContent = `${seconds}초`;
    $('poseResultBend').textContent = frames ? `${maxBend}°` : '—';
    $('poseReference').textContent = MOVEMENT_GUIDES[activeExercise];
    $('poseObserved').textContent = frames
      ? `${exercise.label}: 약 ${Math.round(smallestMetric)}°–${maxBend}° 범위가 감지됐고, 완성된 반복은 ${count}회로 추정됐어요. 화면에 보인 관절 한 곳의 움직임만 측정한 값이에요.`
      : '관절이 충분히 보이지 않아 움직임 범위를 표시할 수 없어요. 촬영 위치를 조정해 다시 확인해주세요.';
    $('poseResultMessage').textContent = !frames
      ? `관절을 인식하지 못했어요. ${exercise.guide}`
      : !count
        ? `${exercise.name} 관절 움직임은 감지했지만 완성된 반복은 세지 못했어요. ${exercise.guide}`
        : `${exercise.name} ${count}회의 움직임을 감지했어요. ${exercise.maxLabel}은 약 ${maxBend}°로 추정됩니다. 이 수치만으로 자세의 안전성이나 정확도를 판정할 수는 없어요.`;
    status('분석을 마쳤어요. 아래 결과를 확인해주세요.');
    resultPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
  finishButton.addEventListener('click', finishCheck);
  exerciseSelect.addEventListener('change', updateExerciseCopy);
  updateExerciseCopy();
})();
