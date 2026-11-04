import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { LETTERS, emptyCounts, voteCounts, result } from './state.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="topbar"><div class="identity"><div class="logo">✋</div><div><b>举手课堂</b><small>CLASSROOM FEEDBACK</small></div><span class="demo-tag">DEMO</span></div><div class="top-right"><span class="privacy">● 本机识别 · 无需登录</span><button class="text-button" id="settingsToggle">⚙ 教师设置</button></div></header>
  <main class="layout">
    <section class="main-column">
      <div class="page-heading"><div><div class="eyebrow">CLASSROOM / LIVE FEEDBACK</div><h1>让每一次举手，都被看见。</h1><p>一个简单的课堂即时反馈工具，给思考一点时间。</p></div><div class="round-badge"><span class="pulse"></span><span id="roundStatus">等待开始</span></div></div>
      <article class="question-card"><div class="section-label"><span>QUESTION <em>01</em></span><span>单项选择</span></div><h2 id="questionDisplay">请老师口述题目，或在设置中输入题目</h2><p class="question-sub">举起 1–4 根手指，选择你认为正确的答案</p><div class="option-grid" id="options"></div></article>
      <div class="control-card"><div class="control-title"><div><b>课堂控制台</b><small id="controlHint">开启摄像头，或进入演示模式体验</small></div><div class="total"><span>有效票数</span><strong id="total">0</strong><small>票</small></div></div><div class="controls"><button class="primary" id="startBtn">◉ &nbsp;开启摄像头</button><button id="demoBtn">✦ &nbsp;演示模式</button><button id="freezeBtn" disabled>Ⅱ &nbsp;定格统计</button><button id="revealBtn">✓ &nbsp;公布答案</button><button id="resetBtn" class="reset">↻ &nbsp;新一轮</button></div><div id="message" class="message" role="status">每只被识别的手计为一票，人数较多或手部遮挡时可能出现误差。</div><div class="demo-controls" id="demoControls" hidden><span>演示投票</span><div id="demoVotes"></div><button id="demoClear" class="mini">清空模拟票</button><small>模拟数据不会使用摄像头</small></div></div>
    </section>
    <aside class="sidebar"><div class="camera-card"><div class="card-head"><div><span class="eyebrow">CAMERA</span><h3>识别画面</h3></div><span class="camera-state" id="cameraState">未开启</span></div><div class="camera"><video id="video" autoplay playsinline muted></video><canvas id="canvas"></canvas><div class="camera-placeholder" id="cameraPlaceholder"><div class="camera-icon">⌁</div><b>准备好了吗？</b><span>开启摄像头后，在这里预览画面</span></div></div><div class="camera-footer"><span class="camera-dot"></span><span id="cameraHint">识别资源已包含在应用中</span><button id="stopBtn" class="text-button" hidden>关闭</button></div></div>
      <div class="guide-card"><div class="card-head"><div><span class="eyebrow">HOW IT WORKS</span><h3>三步开始互动</h3></div><span class="sparkle">✳</span></div><div class="step"><span>01</span><div><b>准备题目</b><p>在教师设置中填写题目，或通过 PPT 展示。</p></div></div><div class="step"><span>02</span><div><b>举手作答</b><p>手掌面向镜头，伸出 1–4 根手指。</p></div></div><div class="step"><span>03</span><div><b>查看结果</b><p>定格统计后选择正确答案，公布答案和正确率。</p></div></div><div class="guide-note">不统计拇指；一只手代表一票，无法识别学生身份。</div></div>
    </aside>
  </main>
  <dialog id="settings"><form method="dialog" id="settingsForm"><div class="dialog-head"><div><span class="eyebrow">TEACHER SETTINGS</span><h2>设置本轮题目</h2><p>题目和选项可以留空，配合课堂 PPT 使用。</p></div><button type="button" class="close" id="closeSettings" aria-label="关闭">×</button></div><label class="field-label" for="questionInput">题目 <span>选填</span></label><textarea id="questionInput" rows="3" maxlength="200" placeholder="例如：下列哪个选项是正确的？"></textarea><div class="field-label">选项内容 <span>选填</span></div><div id="optionInputs" class="option-inputs"></div><p class="dialog-hint">设置仅保存在当前页面内。应用设置会开启新一轮并清空统计。</p><div class="dialog-actions"><button type="button" id="cancelSettings">取消</button><button type="submit" class="primary">应用并开始新一轮</button></div></form></dialog>
  <dialog id="answerDialog"><form id="answerForm"><div class="dialog-head"><div><h2>选择正确答案</h2><p>本轮统计已定格，确认后将公布答案和正确率。</p></div><button type="button" class="close" id="closeAnswer" aria-label="关闭">×</button></div><div class="field-label">正确答案</div><div class="answer-grid" id="answerInputs"></div><div class="dialog-actions"><button type="button" id="cancelAnswer">取消</button><button type="submit" class="primary">确认公布</button></div></form></dialog>
`;
const $ = id => document.getElementById(id);
let state = { mode: 'idle', counts: emptyCounts(), frozen: false, revealed: false, answer: null, question: '', options: ['', '', '', ''] };
let stream = null, detector = null, raf = 0, lastTime = -1, starting = false;
const video = $('video'), canvas = $('canvas'), ctx = canvas.getContext('2d');
$('options').innerHTML = LETTERS.map((letter, i) => `<div class="option" id="option${i}"><div class="option-top"><span class="option-letter">${letter}</span><span class="fingers">${i + 1} 指</span></div><div class="option-text" id="optionText${i}">选项 ${letter}</div><div class="option-bottom"><strong id="count${i}">0</strong><span>票</span><b id="percent${i}">0%</b></div><div class="bar"><i id="bar${i}"></i></div></div>`).join('');
$('optionInputs').innerHTML = LETTERS.map((l, i) => `<label><b>${l}</b><input id="input${i}" maxlength="80" placeholder="选项 ${l}（选填）"></label>`).join('');
$('answerInputs').innerHTML = LETTERS.map((l, i) => `<label><input type="radio" name="answer" value="${i}" required><span>${l}</span></label>`).join('');
$('demoVotes').innerHTML = LETTERS.map((l, i) => `<button type="button" class="mini vote" data-index="${i}">+ ${l}</button>`).join('');
function render() {
  const total = state.counts.reduce((a, b) => a + b, 0);
  $('questionDisplay').textContent = state.question || '请老师口述题目，或在设置中输入题目';
  LETTERS.forEach((l, i) => {
    const pct = total ? Math.round(state.counts[i] / total * 100) : 0;
    $(`optionText${i}`).textContent = state.options[i] || `选项 ${l}`;
    $(`count${i}`).textContent = state.counts[i];
    $(`percent${i}`).textContent = `${pct}%`;
    $(`bar${i}`).style.width = `${pct}%`;
    $(`option${i}`).classList.toggle('correct', state.revealed && state.answer === i);
  });
  $('total').textContent = total;
  $('roundStatus').textContent = state.frozen ? '本轮已定格' : state.mode === 'camera' ? '正在识别' : state.mode === 'demo' ? '演示模式' : '等待开始';
  $('freezeBtn').disabled = state.mode === 'idle';
  $('revealBtn').disabled = !state.frozen;
  $('freezeBtn').textContent = state.frozen ? '▶  继续统计' : 'Ⅱ  定格统计';
  $('demoControls').hidden = state.mode !== 'demo';
  $('demoVotes').querySelectorAll('button').forEach(button => button.disabled = state.frozen);
  $('demoClear').disabled = state.frozen;
  $('cameraState').textContent = state.mode === 'camera' ? '识别中' : state.mode === 'demo' ? '演示模式' : '未开启';
  $('cameraPlaceholder').hidden = state.mode === 'camera';
  $('startBtn').disabled = starting || state.mode === 'camera';
  $('startBtn').textContent = starting ? '正在启动…' : state.mode === 'camera' ? '✓  摄像头已开启' : '◉  开启摄像头';
  $('stopBtn').hidden = state.mode !== 'camera';
  $('controlHint').textContent = state.mode === 'demo' ? '演示模式 · 下方按钮添加模拟票' : state.mode === 'camera' ? '请将手掌正对镜头并张开手指' : '开启摄像头，或进入演示模式体验';
  $('cameraHint').textContent = state.mode === 'camera' ? '画面仅用于本机手势识别' : state.mode === 'demo' ? '当前为模拟数据，摄像头未开启' : '识别资源已包含在应用中';
  if (state.revealed) {
    const r = result(state.counts, state.answer);
    $('message').textContent = r.total ? `正确答案 ${LETTERS[state.answer]} · 答对 ${r.right} / ${r.total} 票 · 正确率 ${r.rate}%` : `正确答案 ${LETTERS[state.answer]} · 本轮没有有效票数，暂无法计算正确率`;
    $('message').classList.add('success');
  } else {
    $('message').textContent = state.frozen ? '本轮结果已定格，可以公布答案。' : '每只被识别的手计为一票，人数较多或手部遮挡时可能出现误差。';
    $('message').classList.remove('success');
  }
}
function resetRound() { state.counts = emptyCounts(); state.frozen = false; state.revealed = false; state.answer = null; render(); }
function stopCamera() {
  cancelAnimationFrame(raf); stream?.getTracks().forEach(track => track.stop()); stream = null; video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height); if (state.mode === 'camera') state.mode = 'idle';
}
function frame() {
  if (state.mode !== 'camera') return;
  if (video.readyState >= 2 && video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    try {
      const found = detector.detectForVideo(video, performance.now());
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      for (const hand of found.landmarks || []) for (const p of hand) { ctx.beginPath(); ctx.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, 2 * Math.PI); ctx.fillStyle = '#78f7c9'; ctx.fill(); }
      if (!state.frozen) { state.counts = voteCounts(found.landmarks || []); render(); }
    } catch (error) { console.error(error); stopCamera(); render(); $('message').textContent = `识别中断：${error.message}。请重试或使用演示模式。`; return; }
  }
  raf = requestAnimationFrame(frame);
}
async function makeDetector() {
  const vision = await FilesetResolver.forVisionTasks('./wasm');
  const base = { modelAssetPath: './hand_landmarker.task' };
  try { return await HandLandmarker.createFromOptions(vision, { baseOptions: { ...base, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 20 }); }
  catch (error) { console.warn('GPU unavailable, trying CPU', error); return HandLandmarker.createFromOptions(vision, { baseOptions: { ...base, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 20 }); }
}
$('startBtn').onclick = async () => {
  if (starting) return;
  starting = true; render(); $('message').textContent = '正在加载本地模型并启动摄像头，请稍候…';
  try {
    detector ||= await makeDetector();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前环境不支持摄像头访问');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream; await video.play(); state.mode = 'camera'; lastTime = -1; resetRound(); frame();
  } catch (error) { stopCamera(); state.mode = 'idle'; resetRound(); $('message').textContent = `启动失败：${error.message}。请检查摄像头权限及占用情况。`; }
  finally { starting = false; $('startBtn').disabled = state.mode === 'camera'; $('startBtn').textContent = state.mode === 'camera' ? '✓  摄像头已开启' : '◉  开启摄像头'; }
};
$('stopBtn').onclick = () => { stopCamera(); resetRound(); };
$('demoBtn').onclick = () => { if (starting) return; stopCamera(); state.mode = 'demo'; resetRound(); };
$('demoVotes').onclick = event => { const i = event.target.dataset.index; if (i !== undefined && !state.frozen) { state.counts[Number(i)]++; render(); } };
$('demoClear').onclick = () => { state.counts = emptyCounts(); render(); };
$('freezeBtn').onclick = () => { state.frozen = !state.frozen; if (!state.frozen) state.revealed = false; render(); };
$('revealBtn').onclick = () => { if (!state.frozen) return; document.querySelectorAll('[name=answer]').forEach(input => { input.checked = Number(input.value) === state.answer; }); $('answerDialog').showModal(); };
$('closeAnswer').onclick = $('cancelAnswer').onclick = () => $('answerDialog').close();
$('answerForm').onsubmit = event => { event.preventDefault(); const selected = document.querySelector('[name=answer]:checked'); if (!selected) return; state.answer = Number(selected.value); state.revealed = true; $('answerDialog').close(); render(); };
$('resetBtn').onclick = resetRound;
$('settingsToggle').onclick = () => { $('questionInput').value = state.question; state.options.forEach((value, i) => { $(`input${i}`).value = value; }); $('settings').showModal(); };
$('closeSettings').onclick = $('cancelSettings').onclick = () => $('settings').close();
$('settingsForm').onsubmit = event => { event.preventDefault(); state.question = $('questionInput').value.trim(); state.options = LETTERS.map((_, i) => $(`input${i}`).value.trim()); $('settings').close(); resetRound(); };
window.addEventListener('beforeunload', stopCamera);
render();
