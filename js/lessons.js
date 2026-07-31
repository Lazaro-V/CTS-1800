// lessons.js — enhanced Robot Playground with debug stepping, safety limits, improved SVG artwork & snap animations, ARIA live announcements, mobile interaction tweaks
(function () {
  const PALETTE_SELECTOR = '#robot-palette';
  const WORKSPACE_SELECTOR = '#robot-workspace';
  const STAGE_ROBOT = '#robot';
  const CONTROLS_CONTAINER = '#robot-controls';
  const MESSAGE_SELECTOR = '#robot-message';
  const LIVE_ANNOUNCE = '#robot-live';
  const STORAGE_KEY = 'kidcode_robot_program_v3'; // bumped key

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  const STEP_MS = 450;
  const MOVE_PX = 60;
  let MAX_STEPS = 80; // safety limit (modifiable)

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  document.addEventListener('DOMContentLoaded', () => {
    const palette = $(PALETTE_SELECTOR);
    const workspace = $(WORKSPACE_SELECTOR);
    const robot = $(STAGE_ROBOT);
    const controls = $(CONTROLS_CONTAINER);
    const message = $(MESSAGE_SELECTOR);
    const live = $(LIVE_ANNOUNCE);

    if (!palette || !workspace || !robot || !controls) {
      console.warn('Robot playground elements missing from page.');
      return;
    }

    // Add Loop button to palette dynamically if not present
    if (!palette.querySelector('[data-action="loop"]')){
      const loopBtn = document.createElement('button');
      loopBtn.className = 'block-btn'; loopBtn.dataset.action='loop'; loopBtn.innerText='LOOP'; palette.appendChild(loopBtn);
    }

    // Wire palette click
    palette.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=> onPaletteClick(btn.dataset.action));
      btn.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); onPaletteClick(btn.dataset.action);} });
    });

    // render controls including debug/step UI
    renderControls();

    // mobile selected block controls (for touch devices)
    let selectedBlock = null;
    let mobileControlBar = null;
    if(isTouch){ mobileControlBar = createMobileControlBar(); controls.appendChild(mobileControlBar); }

    // load saved program (new format supports nested blocks)
    const saved = loadProgram();
    if(saved){ try{ rebuildWorkspaceFromSaved(saved); setMessage('Restored saved program.'); }catch(e){ console.warn(e); } }

    // debug state
    let isDebug = false;
    let isPlaying = false;
    let flatActions = []; // array of actions
    let flatRefs = []; // array of DOM nodes that correspond to each flat action
    let currentStep = -1;

    function onPaletteClick(action){
      if(action==='loop'){
        const count = parseInt(prompt('Repeat count?', '2')) || 2;
        const loopNode = createLoopBlock(count);
        workspace.appendChild(loopNode);
        attachDragHandlers(loopNode);
        animateSnap(loopNode);
      } else {
        const blk = createCodeBlock(action);
        workspace.appendChild(blk);
        attachDragHandlers(blk);
        animateSnap(blk);
      }
      saveCurrentProgram();
    }

    // create visual "SVG-like" code block element with improved artwork
    function createCodeBlock(action,label){
      const el = document.createElement('div');
      el.className='code-block'; el.tabIndex=0; el.draggable=!isTouch; el.dataset.type='action'; el.dataset.action = action;
      const svg = makeFancyBlockSVG(action.toUpperCase());
      const span = document.createElement('span'); span.className='label'; span.innerText = label || action.toUpperCase();
      el.appendChild(svg); el.appendChild(span);

      // click selects on touch devices, removes on non-touch
      el.addEventListener('click', (e)=>{
        if(isTouch){ selectBlockForMobile(el); }
        else { if(e.target===el || e.target===span) { el.remove(); saveCurrentProgram(); } }
      });
      // keyboard to remove
      el.addEventListener('keydown', (e)=>{ if(e.key==='Delete' || e.key==='Backspace' || e.key==='Enter') { el.remove(); saveCurrentProgram(); } });
      return el;
    }

    function selectBlockForMobile(el){
      if(selectedBlock) selectedBlock.classList.remove('selected');
      selectedBlock = el; selectedBlock.classList.add('selected');
      showMobileControlsFor(selectedBlock);
    }

    function showMobileControlsFor(el){ if(!mobileControlBar) return; mobileControlBar.style.display='flex'; mobileControlBar.querySelector('.mc-move-left').disabled = (el.previousElementSibling==null); mobileControlBar.querySelector('.mc-move-right').disabled = (el.nextElementSibling==null); }

    function hideMobileControls(){ if(!mobileControlBar) return; mobileControlBar.style.display='none'; if(selectedBlock){ selectedBlock.classList.remove('selected'); selectedBlock=null; } }

    function createMobileControlBar(){
      const bar = document.createElement('div'); bar.style.display='none'; bar.style.gap='8px'; bar.style.marginTop='8px';
      const left = document.createElement('button'); left.className='btn-secondary mc-move-left'; left.innerText='Move ←'; left.addEventListener('click', ()=>{ if(!selectedBlock) return; if(selectedBlock.previousElementSibling) selectedBlock.parentElement.insertBefore(selectedBlock, selectedBlock.previousElementSibling); saveCurrentProgram(); showMobileControlsFor(selectedBlock); });
      const right = document.createElement('button'); right.className='btn-secondary mc-move-right'; right.innerText='Move →'; right.addEventListener('click', ()=>{ if(!selectedBlock) return; if(selectedBlock.nextElementSibling) selectedBlock.parentElement.insertBefore(selectedBlock.nextElementSibling, selectedBlock); saveCurrentProgram(); showMobileControlsFor(selectedBlock); });
      const del = document.createElement('button'); del.className='btn-secondary'; del.innerText='Remove'; del.addEventListener('click', ()=>{ if(!selectedBlock) return; const p = selectedBlock.parentElement; selectedBlock.remove(); selectedBlock=null; saveCurrentProgram(); hideMobileControls(); });
      bar.appendChild(left); bar.appendChild(right); bar.appendChild(del);
      return bar;
    }

    function animateSnap(el){ el.classList.add('snap'); setTimeout(()=>el.classList.remove('snap'),280); }

    // create loop block
    function createLoopBlock(count){
      const container = document.createElement('div'); container.className='loop-block'; container.draggable=!isTouch; container.dataset.type='loop'; container.dataset.count = String(count);
      const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';
      const title = document.createElement('div'); title.className='label'; title.innerText = `LOOP x${count}`;
      const badge = document.createElement('div'); badge.className='loop-badge'; badge.innerText = `x${count}`;
      header.appendChild(title); header.appendChild(badge);
      const inner = document.createElement('div'); inner.className='loop-inner'; inner.dataset.type='loop-inner'; inner.addEventListener('dragover', innerDragOver);
      inner.addEventListener('drop', innerDrop);

      container.appendChild(header); container.appendChild(inner);

      header.addEventListener('dblclick', ()=>{ const n = parseInt(prompt('New repeat count?', container.dataset.count)) || container.dataset.count; container.dataset.count = n; badge.innerText = 'x'+n; saveCurrentProgram(); });
      return container;
    }

    // improved SVG generator (custom artwork)
    function makeFancyBlockSVG(text){
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns,'svg'); svg.setAttribute('width','48'); svg.setAttribute('height','32'); svg.setAttribute('viewBox','0 0 120 48');
      const defs = document.createElementNS(ns,'defs');
      const grad = document.createElementNS(ns,'linearGradient'); grad.setAttribute('id','g'+Math.random().toString(36).slice(2,7)); grad.setAttribute('x1','0%'); grad.setAttribute('x2','100%');
      const stop1 = document.createElementNS(ns,'stop'); stop1.setAttribute('offset','0%'); stop1.setAttribute('stop-color','#EEF2FF');
      const stop2 = document.createElementNS(ns,'stop'); stop2.setAttribute('offset','100%'); stop2.setAttribute('stop-color','#E9D5FF');
      grad.appendChild(stop1); grad.appendChild(stop2); defs.appendChild(grad);
      svg.appendChild(defs);
      const path = document.createElementNS(ns,'path'); path.setAttribute('d','M6 6 h84 a8 8 0 0 1 8 8 v20 a6 6 0 0 1 -6 6 h-86 a6 6 0 0 1 -6 -6 v-24 a6 6 0 0 1 6 -6 z'); path.setAttribute('fill','url(#'+grad.id+')'); path.setAttribute('stroke','#0F172A'); path.setAttribute('stroke-width','2');
      svg.appendChild(path);
      const txt = document.createElementNS(ns,'text'); txt.setAttribute('x','54'); txt.setAttribute('y','30'); txt.setAttribute('text-anchor','middle'); txt.setAttribute('font-size','18'); txt.setAttribute('fill','#0F172A'); txt.setAttribute('font-weight','700'); txt.textContent = text.length>8? text.slice(0,8) : text;
      svg.appendChild(txt);
      return svg;
    }

    // Drag and drop helpers
    function attachDragHandlers(node){
      if(!isTouch){
        node.addEventListener('dragstart', dragStart);
        node.addEventListener('dragend', dragEnd);
        node.addEventListener('dragover', dragOver);
        node.addEventListener('drop', drop);
      } else {
        // touch: clicking selects
        node.addEventListener('click', ()=> selectBlockForMobile(node));
      }

      if(node.classList.contains('loop-block')){
        const inner = node.querySelector('.loop-inner'); inner.addEventListener('dragover', innerDragOver); inner.addEventListener('drop', innerDrop);
      }
    }

    let dragged = null;
    function dragStart(e){ dragged = e.currentTarget; e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain','drag'); }catch(_){} dragged.classList.add('dragging'); }
    function dragEnd(e){ if(dragged) dragged.classList.remove('dragging'); dragged=null; }
    function dragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; const target = e.currentTarget; target.classList.add('drop-target'); }
    function drop(e){ e.preventDefault(); const target = e.currentTarget; target.classList.remove('drop-target'); if(!dragged || dragged === target) return; if(target.dataset.type === 'loop-inner'){ target.appendChild(dragged); saveCurrentProgram(); animateSnap(dragged); return; } const parent = target.parentElement; if(parent === workspace){ workspace.insertBefore(dragged, target); } else { workspace.appendChild(dragged); } saveCurrentProgram(); animateSnap(dragged); }
    function innerDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; e.currentTarget.classList.add('drop-target'); }
    function innerDrop(e){ e.preventDefault(); e.currentTarget.classList.remove('drop-target'); if(dragged) e.currentTarget.appendChild(dragged); saveCurrentProgram(); animateSnap(dragged); }

    workspace.addEventListener('dragover', (e)=>{ e.preventDefault(); });

    // Controls
    function renderControls(){ controls.innerHTML = '';
      const runBtn = document.createElement('button'); runBtn.className='btn-primary'; runBtn.innerText='Run'; runBtn.addEventListener('click', ()=>{ runProgram(false); });
      const debugToggle = document.createElement('label'); debugToggle.style.marginLeft='8px'; debugToggle.style.display='inline-flex'; debugToggle.style.alignItems='center'; const cb = document.createElement('input'); cb.type='checkbox'; cb.style.marginRight='6px'; cb.addEventListener('change', (e)=>{ isDebug = e.target.checked; if(isDebug){ setMessage('Debug mode: step controls enabled. Use Step/Back to move.'); } else { setMessage(''); } }); debugToggle.appendChild(cb); const dbgText = document.createElement('span'); dbgText.innerText='Debug'; debugToggle.appendChild(dbgText);

      const stepBack = document.createElement('button'); stepBack.className='btn-secondary'; stepBack.innerText='◀ Back'; stepBack.style.marginLeft='8px'; stepBack.addEventListener('click', stepBackOne);
      const stepForward = document.createElement('button'); stepForward.className='btn-secondary'; stepForward.innerText='Forward ▶'; stepForward.style.marginLeft='6px'; stepForward.addEventListener('click', stepForwardOne);

      const clearBtn = document.createElement('button'); clearBtn.className='btn-secondary'; clearBtn.innerText='Clear'; clearBtn.style.marginLeft='8px'; clearBtn.addEventListener('click', ()=>{ workspace.innerHTML=''; saveCurrentProgram(); resetRobot(); setMessage('Cleared'); hideMobileControls(); });
      const saveBtn = document.createElement('button'); saveBtn.className='block-btn'; saveBtn.innerText='Save'; saveBtn.style.marginLeft='8px'; saveBtn.addEventListener('click', ()=>{ saveCurrentProgram(true); setMessage('Saved'); });

      const stepLimitInput = document.createElement('input'); stepLimitInput.type='number'; stepLimitInput.value = MAX_STEPS; stepLimitInput.min='10'; stepLimitInput.style.width='72px'; stepLimitInput.title='Max expanded steps (safety)'; stepLimitInput.style.marginLeft='8px'; stepLimitInput.addEventListener('change', ()=>{ const v = parseInt(stepLimitInput.value)||MAX_STEPS; MAX_STEPS = v; setMessage(`Safety limit set to ${v}`); });
      const stepLimitLabel = document.createElement('span'); stepLimitLabel.style.marginLeft='6px'; stepLimitLabel.innerText='MaxSteps';

      controls.appendChild(runBtn); controls.appendChild(debugToggle); controls.appendChild(stepBack); controls.appendChild(stepForward); controls.appendChild(clearBtn); controls.appendChild(saveBtn); controls.appendChild(stepLimitLabel); controls.appendChild(stepLimitInput);
    }

    // Read program: returns nested with refs
    function readProgramFromDOMWithRefs(root, refs){
      const out = [];
      const children = Array.from(root.children);
      children.forEach(ch=>{
        if(ch.dataset && ch.dataset.type==='action'){
          const node = {type:'action', action: ch.dataset.action, _ref: ch}; out.push(node); if(refs) refs.push(ch);
        } else if(ch.dataset && ch.dataset.type==='loop'){
          const count = parseInt(ch.dataset.count) || 2;
          const inner = ch.querySelector('.loop-inner');
          const node = {type:'loop', count: count, body: []};
          out.push(node);
          if(refs) refs.push(ch);
          // body
          node.body = readProgramFromDOMWithRefs(inner, refs);
        }
      });
      return out;
    }

    function saveCurrentProgram(showMsg){ const prog = readProgramFromDOMWithRefs(workspace, null); localStorage.setItem(STORAGE_KEY, JSON.stringify(prog)); if(showMsg) setMessage('Program saved locally'); }
    function loadProgram(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):null; }catch(e){ return null; } }

    function rebuildWorkspaceFromSaved(saved){ workspace.innerHTML=''; saved.forEach(node=>{
      if(node.type==='action'){ const blk = createCodeBlock(node.action); attachDragHandlers(blk); workspace.appendChild(blk); }
      else if(node.type==='loop'){ const loop = createLoopBlock(node.count); attachDragHandlers(loop); // rebuild inner
        if(Array.isArray(node.body)){
          const inner = loop.querySelector('.loop-inner'); node.body.forEach(nc=>{
            if(nc.type==='action'){ const b = createCodeBlock(nc.action); attachDragHandlers(b); inner.appendChild(b); }
            else if(nc.type==='loop'){ const nested = createLoopBlock(nc.count); attachDragHandlers(nested); inner.appendChild(nested); }
          });
        }
        workspace.appendChild(loop);
      }
    }); }

    // Expand program and build refs mapping by walking DOM (accurate mapping)
    function expandProgramWithRefs(){
      const f=[]; const r=[];
      function recurseDOM(parent){
        const children = Array.from(parent.children);
        children.forEach(ch=>{
          if(ch.dataset && ch.dataset.type==='action'){
            f.push(ch.dataset.action); r.push(ch);
          } else if(ch.dataset && ch.dataset.type==='loop'){
            const cnt = parseInt(ch.dataset.count) || 1;
            const inner = ch.querySelector('.loop-inner');
            for(let i=0;i<cnt;i++) recurseDOM(inner);
          }
        });
      }
      recurseDOM(workspace);
      return {flat:f, refs:r};
    }

    // Step controls
    function stepForwardOne(){ if(isPlaying) return; const expanded = expandProgramWithRefs(); flatActions = expanded.flat; flatRefs = expanded.refs; if(flatActions.length===0){ setMessage('No actions to step through.'); return; } if(flatActions.length>MAX_STEPS){ if(!confirm(`Program expands to ${flatActions.length} steps which exceeds the safety limit of ${MAX_STEPS}. Continue?`)) return; } if(currentStep < flatActions.length-1){ currentStep++; highlightStep(currentStep); announceStep(currentStep); awaitNoop(30); } }
    function stepBackOne(){ if(isPlaying) return; if(currentStep> -1){ unhighlightStep(currentStep); currentStep--; if(currentStep>=0){ highlightStep(currentStep); announceStep(currentStep); } else setMessage('At start'); } }

    function awaitNoop(ms){ return new Promise(res=>setTimeout(res,ms)); }

    function highlightStep(idx){ // clear previous
      workspace.querySelectorAll('.step-highlight').forEach(e=>e.classList.remove('step-highlight'));
      const node = flatRefs[idx]; if(node){ node.classList.add('step-highlight'); node.scrollIntoView({behavior:'smooth', block:'center', inline:'nearest'}); }
    }
    function unhighlightStep(idx){ const node = flatRefs[idx]; if(node) node.classList.remove('step-highlight'); }

    function announceStep(idx){ const act = flatActions[idx]; setMessage(`Step ${idx+1}/${flatActions.length}: ${act}`); if(live) live.innerText = `Step ${idx+1} ${act}`; }

    // Run program (autoplay) or in debug mode we can play sequentially with step highlighting
    async function runProgram(overrideDebug){
      const expanded = expandProgramWithRefs(); flatActions = expanded.flat; flatRefs = expanded.refs;
      if(flatActions.length===0){ setMessage('Add blocks to the workspace first.'); return; }
      if(flatActions.length>MAX_STEPS){ if(!confirm(`Program expands to ${flatActions.length} steps which exceeds the safety limit of ${MAX_STEPS}. Continue?`)) return; }

      if(isDebug && !overrideDebug){ // prepare for debugging playback (auto-step)
        currentStep = -1; isPlaying = true; setMessage('Debug autoplay running...'); for(let i=0;i<flatActions.length;i++){ currentStep = i; highlightStep(i); announceStep(i); await performAction(flatActions[i], i); unhighlightStep(i); }
        setMessage('Debug autoplay finished'); isPlaying=false; currentStep=-1; return;
      }

      // regular play
      setMessage('Running...'); disableUI(true);
      for(let i=0;i<flatActions.length;i++){
        const ref = flatRefs[i]; if(ref) ref.classList.add('running'); await performAction(flatActions[i], i); if(ref) ref.classList.remove('running'); }
      disableUI(false); setMessage('Done! Nice program.');
    }

    function disableUI(dis){ palette.querySelectorAll('button').forEach(b=>b.disabled=dis); controls.querySelectorAll('button').forEach(b=>b.disabled=dis); workspace.querySelectorAll('.code-block, .loop-block').forEach(b=>b.draggable = !dis && !isTouch); }

    function performAction(action,index){ return new Promise(resolve=>{
      if(flatRefs && flatRefs[index]){ const el = flatRefs[index]; el.style.boxShadow = '0 10px 0 rgba(250,204,21,0.5)'; setTimeout(()=> el.style.boxShadow='0 4px 0 rgba(15,23,42,0.9)', 300); }
      if(action==='left'){ robotState.x -= MOVE_PX; robot.style.transition='transform 0.35s'; robot.style.transform = `translate(${robotState.x}px, ${robotState.y}px) rotate(${robotState.angle}deg)`; setTimeout(resolve, STEP_MS); }
      else if(action==='right'){ robotState.x += MOVE_PX; robot.style.transition='transform 0.35s'; robot.style.transform = `translate(${robotState.x}px, ${robotState.y}px) rotate(${robotState.angle}deg)`; setTimeout(resolve, STEP_MS); }
      else if(action==='up'){ robotState.y -= MOVE_PX/2; robot.style.transition='transform 0.35s'; robot.style.transform = `translate(${robotState.x}px, ${robotState.y}px) rotate(${robotState.angle}deg)`; setTimeout(resolve, STEP_MS); }
      else if(action==='down'){ robotState.y += MOVE_PX/2; robot.style.transition='transform 0.35s'; robot.style.transform = `translate(${robotState.x}px, ${robotState.y}px) rotate(${robotState.angle}deg)`; setTimeout(resolve, STEP_MS); }
      else if(action==='spin'){ robotState.angle += 360; robot.style.transition='transform 0.5s'; robot.style.transform = `translate(${robotState.x}px, ${robotState.y}px) rotate(${robotState.angle}deg)`; setTimeout(resolve, STEP_MS+150); }
      else if(action==='beep'){ robot.style.transition='transform 0.15s'; robot.style.transform = `translate(${robotState.x}px, ${robotState.y}px) scale(1.08)`; setTimeout(()=>{ robot.style.transform = `translate(${robotState.x}px, ${robotState.y}px) rotate(${robotState.angle}deg)`; },140);
        try{ const ctx = new (window.AudioContext||window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(880,ctx.currentTime); o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.0001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.08,ctx.currentTime+0.01); o.start(); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.12); o.stop(ctx.currentTime+0.13);}catch(e){}
        setTimeout(resolve, STEP_MS); }
      else { setTimeout(resolve, STEP_MS/2); }
    }); }

    // robot
    let robotState = { x:0, y:0, angle:0 };
    function resetRobot(){ robotState = {x:0,y:0,angle:0}; robot.style.transform = 'translate(0px,0px) rotate(0deg)'; }

    // Utilities
    function setMessage(text){ if(!message) return; message.innerText = text || ''; if(live) live.innerText = text || ''; }

    // expose API
    window.KidCodeRobot = { addAction: (a)=>{ const b = createCodeBlock(a); workspace.appendChild(b); attachDragHandlers(b); saveCurrentProgram(); }, reset: resetRobot, run: runProgram };

    // initial reset
    resetRobot();
  });
})();
