(() => {
  'use strict';

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let active = null;
  const styles = document.createElement('style');
  styles.textContent = `.voice-journal{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:7px 0 10px}.voice-journal button{min-height:38px;border:1px solid #cbdcca;border-radius:10px;background:#eff6ed;color:#28543b;padding:8px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.voice-journal button[aria-pressed="true"]{background:#315b43;color:#fff}.voice-journal button:disabled{opacity:.55;cursor:not-allowed}.voice-journal-status{font-size:11px;color:#5d6d61;line-height:1.5}.voice-journal-help{display:block;margin:0 0 10px;color:#6c786e;font-size:10px;line-height:1.5}`;
  document.head.appendChild(styles);

  const status = (entry, message) => { entry.querySelector('.voice-journal-status').textContent = message; };
  function stopActive() {
    if (!active) return;
    try { active.recognition.stop(); } catch { /* already ended */ }
  }
  function mount(textarea) {
    if (!textarea || textarea.dataset.voiceMounted) return;
    textarea.dataset.voiceMounted = 'true';
    const entry = document.createElement('div');
    entry.className = 'voice-journal';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = Recognition ? '🎙 음성으로 메모' : '음성 입력 미지원';
    button.setAttribute('aria-label', `${textarea.id === 'manualNote' ? '자유 운동 기록' : '운동 기록'} 메모 음성 입력`);
    button.setAttribute('aria-pressed', 'false');
    button.disabled = !Recognition;
    const label = document.createElement('span');
    label.className = 'voice-journal-status';
    label.setAttribute('role', 'status');
    label.textContent = Recognition ? '말한 내용은 확인 후 저장할 수 있어요.' : '이 브라우저에서는 키보드로 입력해주세요.';
    entry.append(button, label);
    const field = textarea.closest('label') || textarea;
    field.insertAdjacentElement('afterend', entry);
    const help = document.createElement('small');
    help.className = 'voice-journal-help';
    help.textContent = '마이크를 누르면 음성이 브라우저의 인식 서비스에서 처리될 수 있습니다. 페이스핏은 음성 파일을 저장하지 않으며, 인식된 글은 기록 저장 버튼을 누를 때만 저장합니다.';
    entry.insertAdjacentElement('afterend', help);

    button.addEventListener('click', () => {
      if (!Recognition) return;
      if (active?.button === button) { stopActive(); return; }
      if (active) {
        const previous = active;
        active = null;
        previous.button.setAttribute('aria-pressed', 'false');
        previous.button.textContent = '🎙 음성으로 메모';
        status(previous.entry, '다른 메모로 음성 입력을 전환했어요.');
        try { previous.recognition.abort(); } catch { /* already ended */ }
      }
      const recognition = new Recognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      const current = {recognition,button,textarea,entry};
      active = current;
      button.setAttribute('aria-pressed', 'true');
      button.textContent = '■ 듣기 중지';
      status(entry, '마이크를 연결하고 있어요…');
      recognition.onstart = () => { if (active === current) status(entry, '듣고 있어요. 운동 내용을 말해주세요.'); };
      recognition.onresult = event => {
        if (active !== current || !document.contains(textarea)) return;
        const spoken = Array.from(event.results).filter(result => result.isFinal)
          .map(result => result[0]?.transcript?.trim()).filter(Boolean).join(' ');
        if (!spoken) return;
        const combined = [textarea.value.trim(), spoken].filter(Boolean).join('\n');
        const limit = textarea.maxLength > 0 ? textarea.maxLength : 1000;
        textarea.value = combined.slice(0, limit);
        textarea.dispatchEvent(new Event('input', {bubbles:true}));
        status(entry, combined.length > limit ? '글자 수 제한까지 입력했어요. 내용을 확인해주세요.' : '인식한 글을 메모에 넣었어요. 확인 후 기록을 저장하세요.');
      };
      recognition.onerror = event => {
        if (active !== current) return;
        const messages = {'not-allowed':'마이크 권한이 없어요. 브라우저 설정을 확인해주세요.','audio-capture':'마이크를 찾지 못했어요.','no-speech':'음성이 들리지 않았어요. 다시 시도해주세요.','network':'음성 인식 서비스에 연결하지 못했어요.','language-not-supported':'한국어 음성 인식을 사용할 수 없어요.'};
        status(entry, messages[event.error] || '음성을 인식하지 못했어요. 다시 시도해주세요.');
      };
      recognition.onend = () => {
        if (active !== current) return;
        active = null;
        button.setAttribute('aria-pressed', 'false');
        button.textContent = '🎙 음성으로 메모';
        if (label.textContent.includes('듣고 있어요') || label.textContent.includes('연결하고')) status(entry, '입력이 끝났어요. 메모를 확인해주세요.');
      };
      try { recognition.start(); }
      catch { recognition.onend(); status(entry, '음성 입력을 시작하지 못했어요. 다시 시도해주세요.'); }
    });
  }
  mount(document.getElementById('workoutNote'));
  mount(document.getElementById('manualNote'));
  const trainerOverlay = document.getElementById('trainerOverlay');
  if (trainerOverlay) new MutationObserver(() => {
    const note = trainerOverlay.querySelector('#trainerRecordForm textarea[name="note"]');
    if (note) mount(note);
    if (active && !document.contains(active.textarea)) stopActive();
  }).observe(trainerOverlay, {childList:true,subtree:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopActive(); });
})();

