// games.js — interactive minigames using visual code-blocks (drag/drop + mobile tap controls + safety limit + step highlighting)
(function(){
  const STORAGE_KEY = 'kidcode_game_scores';
  const MAX_STEPS_DEFAULT = 80;
  const STEP_MS = 450;
  const MOVE_PX = 60;
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  function $(s){ return document.querySelector(s); }
  function $all(s){ return Array.from(document.querySelectorAll(s)); }

  function saveScore(entry){
    try{
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      arr.push(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }catch(e){ console.error(e); }
  }

  function renderLeaderboard(game){
    const container = $('#game-leaderboard');
    if(!container) return;
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter(a=>a.game===game);
    if(arr.length===0){ container.innerHTML = '<p>No scores yet — be the first!</p>'; return; }
    const sorted = arr.sort((a,b)=>a.score - b.score).slice(0,10);
    let html = '<h4>Top Scores</h4><ol>' + sorted.map(r=>`<li>${escapeHtml(r.name||'Player')} — ${r.score} ${r.metric || ''} <small style="color:#64748B">(${new Date(r.ts).toLocaleString()})</small></li>`).join('') + '</ol>';
    container.innerHTML = html;
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Create a stylized code block element (SVG artwork + label)
  function createCodeBlock(action, label){
    const el = document.createElement('div');
    el.className = 'code-block';
    el.tabIndex = 0;
    el.draggable = !isTouch;
    el.dataset.type = 'action';
    el.dataset.action = action;
    const svg = makeBlockSVG(action.toUpperCase());
    const span = document.createElement('span'); span.className = 'label'; span.innerText = label || action.toUpperCase();
    el.appendChild(svg); el.appendChild(span);

    // desktop: click removes; mobile: tap selects for mobile controls
    el.addEventListener('click', (e)=>{
      if(isTouch){
        selectBlockForMobile(el);
      } else {
        // allow click removal for quick edits
        if(e.target === el || e.target === span) { el.remove(); }
      }
    });
    el.addEventListener('keydown', (e)=>{ if(e.key==='Delete' || e.key==='Backspace' || e.key==='Enter') { el.remove(); } });
    return el;
  }

  // Simple SVG block generator (lightweight)
  function makeBlockSVG(text){
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('width','46');
    svg.setAttribute('height','28');
    svg.setAttribute('viewBox','0 0 120 48');
    const rect = document.createElementNS(ns,'rect');
    rect.setAttribute('x','4'); rect.setAttribute('y','4'); rect.setAttribute('rx','8'); rect.setAttribute('ry','8');
    rect.setAttribute('width','112'); rect.setAttribute('height','40'); rect.setAttribute('fill','#EEF2FF'); rect.setAttribute('stroke','#0F172A'); rect.setAttribute('stroke-width','2');
    const txt = document.createElementNS(ns,'text'); txt.setAttribute('x','60'); txt.setAttribute('y','30'); txt.setAttribute('text-anchor','middle'); txt.setAttribute('font-size','14'); txt.setAttribute('fill','#0F172A'); txt.setAttribute('font-weight','700');
    txt.textContent = text.length>8? text.slice(0,8) : text;
    svg.appendChild(rect); svg.appendChild(txt);
    return svg;
  }

  // Mobile selection controls (tap to select then move/remove)
  let selectedBlock = null;
  function selectBlockForMobile(el){
    // create control bar on demand
    let bar = $('#mobile-block-controls');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'mobile-block-controls';
      bar.style.display = 'flex'; bar.style.gap = '8px'; bar.style.marginTop = '8px';
      bar.style.flexWrap = 'wrap';
      const left = document.createElement('button'); left.className='btn-secondary'; left.innerText='Move ←'; left.addEventListener('click', ()=> moveSelected(-1));
      const right = document.createElement('button'); right.className='btn-secondary'; right.innerText='Move →'; right.addEventListener('click', ()=> moveSelected(1));
      const del = document.createElement('button'); del.className='btn-secondary'; del.innerText='Remove'; del.addEventListener('click', ()=> { if(selectedBlock){ const p = selectedBlock.parentElement; selectedBlock.remove(); selectedBlock=null; bar.style.display='none'; }});
      bar.appendChild(left); bar.appendChild(right); bar.appendChild(del);
      // place bar next to the shared controls area so it's visible
      const sharedControls = $('#game-controls');
      if(sharedControls) sharedControls.appendChild(bar);
    }
    selectedBlock = el;
    bar.style.display = 'flex';
  }

  function moveSelected(direction){
    if(!selectedBlock) return;
    const parent = selectedBlock.parentElement;
    if(direction < 0 && selectedBlock.previousElementSibling) parent.insertBefore(selectedBlock, selectedBlock.previousElementSibling);
    if(direction > 0 && selectedBlock.nextElementSibling) parent.insertBefore(selectedBlock.nextElementSibling, selectedBlock);
  }

  // Attach drag handlers for desktop
  function attachDragHandlers(node){
    if(!node) return;
    if(!isTouch){
      node.addEventListener('dragstart', dragStart);
      node.addEventListener('dragend', dragEnd);
      node.addEventListener('dragover', dragOver);
      node.addEventListener('drop', drop);
    } else {
      // on touch keep tap->select behavior which is already wired in createCodeBlock
    }
  }
  let dragged = null;
  function dragStart(e){ dragged = e.currentTarget; try{ e.dataTransfer.setData('text/plain','drag'); }catch(_){ } dragged.classList.add('dragging'); }
  function dragEnd(e){ if(dragged) dragged.classList.remove('dragging'); dragged = null; }
  function dragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; e.currentTarget.classList.add('drop-target'); }
  function drop(e){ e.preventDefault(); e.currentTarget.classList.remove('drop-target'); if(!dragged || dragged === e.currentTarget) return; const parent = e.currentTarget.parentElement; if(parent) parent.insertBefore(dragged, e.currentTarget); }

  // Walk DOM workspace and expand loops/repeats into flat actions + refs
  function expandWorkspaceToFlat(workspace){
    const flat = [], refs = [];
    function walk(node){
      const kids = Array.from(node.children);
      for(const ch of kids){
        if(ch.dataset && ch.dataset.type === 'action'){
          const action = ch.dataset.action;
          if(action === 'repeat2' || action === 'repeat3'){
            // repeat token: treat it as a repeat marker - expand using next sibling where applicable
            // for simplicity, if a repeat is present we try to expand next sibling action
            const next = ch.nextElementSibling;
            const n = action === 'repeat2' ? 2 : 3;
            if(next && next.dataset && next.dataset.type === 'action'){
              for(let i=0;i<n;i++){ flat.push(next.dataset.action); refs.push(next); }
            }
          } else {
            flat.push(action); refs.push(ch);
          }
        } else if(ch.dataset && ch.dataset.type === 'loop'){
          const cnt = parseInt(ch.dataset.count) || 1;
          const inner = ch.querySelector('.loop-inner');
          for(let i=0;i<cnt;i++){
            walk(inner);
          }
        } else {
          // skip other elements
        }
      }
    }
    walk(workspace);
    return {flat, refs};
  }

  // Safety check
  function checkSafetyCount(count){
    const max = (window.KidCodeGamesMaxSteps || MAX_STEPS_DEFAULT);
    if(count > max){
      return confirm(`Program expands to ${count} steps which exceeds the safety limit of ${max}. Continue?`);
    }
    return true;
  }

  function askNameAndSave(game, score, metric){
    const name = prompt('Enter a name for your score (or Cancel to skip)') || 'Player';
    const rec = {game:game, name:name, score:score, metric:metric, ts: Date.now()};
    saveScore(rec);
    renderLeaderboard(game);
  }

  // Highlight helpers
  function highlightRef(ref){
    if(!ref) return;
    ref.classList.add('running');
  }
  function unhighlightRef(ref){
    if(!ref) return;
    ref.classList.remove('running');
  }

  // Per-game initializers — each will use the code-block insertion model
  function initPuppy(){
    showGameArea('Puppy Maze Quest');
    const ui = $('#game-ui'); ui.innerHTML = '';
    const controls = $('#game-controls'); controls.innerHTML = '';

    const gridSize = 5;
    const start = {x:0,y:4};
    const goal = {x:4,y:0};
    const obstacles = [{x:2,y:3},{x:3,y:2}];

    // palette: left/right/up/down/jump
    const palette = document.createElement('div'); palette.className='toolbar';
    ['left','right','up','down','jump'].forEach(act=>{
      const b = document.createElement('button'); b.className='block-btn'; b.innerText = act.toUpperCase(); b.dataset.action = act;
      b.addEventListener('click', ()=>{ const blk = createCodeBlock(act); const workspace = $('#puppy-workspace'); workspace.appendChild(blk); attachDragHandlers(blk); });
      palette.appendChild(b);
    });
    ui.appendChild(palette);

    const workspace = document.createElement('div'); workspace.className='workspace-area'; workspace.id='puppy-workspace'; ui.appendChild(workspace);

    // grid
    const grid = document.createElement('div'); grid.style.margin='12px 0'; grid.style.display='grid'; grid.style.gridTemplateColumns = `repeat(${gridSize},56px)`; grid.style.gap='6px';
    const cells = [];
    for(let y=0;y<gridSize;y++){
      for(let x=0;x<gridSize;x++){
        const cell = document.createElement('div');
        cell.style.width='56px'; cell.style.height='56px'; cell.style.background='#fff'; cell.style.border='2px solid var(--border-color)'; cell.style.borderRadius='8px';
        cell.style.display='flex'; cell.style.alignItems='center'; cell.style.justifyContent='center'; cell.style.fontSize='24px';
        if(x===start.x && y===start.y) cell.innerText='🐶';
        else if(x===goal.x && y===goal.y) cell.innerText='🏁';
        else if(obstacles.some(o=>o.x===x && o.y===y)) cell.innerText='🌵';
        else cell.innerText='';
        grid.appendChild(cell);
        cells.push({x,y,el:cell});
      }
    }
    ui.appendChild(grid);

    // controls: Run / Reset
    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Run'; run.addEventListener('click', ()=> runPuppy());
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset';
    reset.addEventListener('click', ()=> { workspace.innerHTML=''; $('#game-message').innerText=''; renderLeaderboard('Puppy Maze'); });
    controls.appendChild(run); controls.appendChild(reset);

    function resetGrid(){
      cells.forEach(c=>{ c.el.style.background='#fff'; if(c.x===start.x && c.y===start.y) c.el.innerText='🐶'; else if(c.x===goal.x && c.y===goal.y) c.el.innerText='🏁'; else if(obstacles.some(o=>o.x===c.x && o.y===c.y)) c.el.innerText='🌵'; else c.el.innerText=''; });
    }

    async function runPuppy(){
      const expanded = expandWorkspaceToFlat(workspace);
      const actions = expanded.flat;
      const refs = expanded.refs;
      if(actions.length === 0){ $('#game-message').innerText = 'Add blocks to play!'; return; }
      if(!checkSafetyCount(actions.length)) return;

      $('#game-message').innerText = 'Running...';
      let pos = {x:start.x,y:start.y};
      resetGrid(); setCell(pos.x,pos.y,'');
      for(let i=0;i<actions.length;i++){
        const a = actions[i];
        const ref = refs[i];
        highlightRef(ref);
        const prev = {...pos};
        if(a==='left') pos.x = Math.max(0,pos.x-1);
        if(a==='right') pos.x = Math.min(gridSize-1,pos.x+1);
        if(a==='up') pos.y = Math.max(0,pos.y-1);
        if(a==='down') pos.y = Math.min(gridSize-1,pos.y+1);
        if(a==='jump') pos.y = Math.max(0,pos.y-2);

        if(obstacles.some(o=>o.x===pos.x && o.y===pos.y)){
          setCell(pos.x,pos.y,'💥');
          $('#game-message').innerText='Oh no! Barnaby bumped an obstacle. Try again.';
          unhighlightRef(ref);
          return;
        }

        setCell(pos.x,pos.y,'🐶'); highlightCell(pos.x,pos.y);
        await delay(STEP_MS);
        // clear previous (unless goal)
        if(!(prev.x===goal.x && prev.y===goal.y)) setCell(prev.x,prev.y,'');
        unhighlightRef(ref);
      }

      // finish check
      if(pos.x===goal.x && pos.y===goal.y){
        $('#game-message').innerText='Great! Barnaby reached the goal 🐾';
        askNameAndSave('Puppy Maze', actions.length, 'steps');
      } else {
        $('#game-message').innerText='Barnaby did not reach the goal — try changing the sequence.';
      }
    }

    function setCell(x,y,content){
      const idx = y*gridSize + x; const c = cells[idx]; if(c) c.el.innerText = content;
    }
    function highlightCell(x,y){
      const idx = y*gridSize + x; const c = cells[idx]; if(!c) return; const orig = c.el.style.background; c.el.style.background = '#FEF08A'; setTimeout(()=>{ c.el.style.background = orig; }, 350);
    }

    renderLeaderboard('Puppy Maze');
  }

  // Rocket game: palette includes thrust and repeat tokens; blocks are inserted into workspace similarly
  function initRocket(){
    showGameArea('Rocket Loop Launch');
    const ui = $('#game-ui'); ui.innerHTML = '';
    const controls = $('#game-controls'); controls.innerHTML = '';

    const palette = document.createElement('div'); palette.className='toolbar';
    const thrust = document.createElement('button'); thrust.className='block-btn'; thrust.innerText='THRUST'; thrust.dataset.action='thrust';
    const rep2 = document.createElement('button'); rep2.className='block-btn'; rep2.innerText='REPEAT x2'; rep2.dataset.action='repeat2';
    const rep3 = document.createElement('button'); rep3.className='block-btn'; rep3.innerText='REPEAT x3'; rep3.dataset.action='repeat3';
    [thrust, rep2, rep3].forEach(b=>{
      b.addEventListener('click', ()=>{ const blk = createCodeBlock(b.dataset.action, b.innerText); const ws = $('#rocket-workspace'); ws.appendChild(blk); attachDragHandlers(blk); });
      palette.appendChild(b);
    });
    ui.appendChild(palette);

    const workspace = document.createElement('div'); workspace.className='workspace-area'; workspace.id='rocket-workspace'; ui.appendChild(workspace);

    const rocketStage = document.createElement('div'); rocketStage.style.height='260px'; rocketStage.style.display='flex'; rocketStage.style.alignItems='flex-end'; rocketStage.style.justifyContent='center';
    const rocket = document.createElement('div'); rocket.innerText='🚀'; rocket.style.fontSize='56px'; rocket.style.transition='transform 0.6s ease-out'; rocketStage.appendChild(rocket);
    ui.appendChild(rocketStage);

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Launch'; run.addEventListener('click', ()=> launch());
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=> { workspace.innerHTML=''; $('#game-message').innerText=''; renderLeaderboard('Rocket Loop'); });
    controls.appendChild(run); controls.appendChild(reset);

    async function launch(){
      const expanded = expandWorkspaceToFlat(workspace);
      const actions = expanded.flat;
      const refs = expanded.refs;
      if(actions.length===0){ $('#game-message').innerText='Add thrust blocks then press Launch!'; return; }
      if(!checkSafetyCount(actions.length)) return;

      let thrustTotal = 0;
      $('#game-message').innerText='Launching...';
      for(let i=0;i<actions.length;i++){
        const a = actions[i]; const ref = refs[i];
        highlightRef(ref);
        if(a==='thrust'){
          thrustTotal += 1;
          const height = -20 - (thrustTotal*30);
          rocket.style.transform = `translateY(${height}px)`;
          rocket.style.filter = 'drop-shadow(0 6px 6px rgba(250,204,21,0.45))';
          await delay(STEP_MS);
          rocket.style.filter = 'none';
        } else {
          // other tokens ignored for rocket except repeats handled during expansion
          await delay(STEP_MS/2);
        }
        unhighlightRef(ref);
      }
      const needed = 4;
      if(thrustTotal>=needed){
        $('#game-message').innerText='Boom! Rocket reached orbit 🚀';
        setTimeout(()=>{ const score = Math.max(1, Math.round(100/(thrustTotal||1))); askNameAndSave('Rocket Loop', score, 'efficiency'); renderLeaderboard('Rocket Loop'); }, 600);
      } else {
        $('#game-message').innerText='Not enough thrust — try adding more thrust or using repeats.';
      }
    }

    renderLeaderboard('Rocket Loop');
  }

  // Frog game — interactive code-block entry instead of prebuilt tiles
  function initFrog(){
    showGameArea('Frog Hop Debugger');
    const ui = $('#game-ui'); ui.innerHTML = '';
    const controls = $('#game-controls'); controls.innerHTML = '';

    const correct = ['right','right','jump','right'];
    // palette
    const palette = document.createElement('div'); palette.className='toolbar';
    ['left','right','jump'].forEach(a=>{
      const b = document.createElement('button'); b.className='block-btn'; b.innerText = a.toUpperCase(); b.dataset.action = a;
      b.addEventListener('click', ()=>{ const blk = createCodeBlock(a); const ws = $('#frog-seq'); ws.appendChild(blk); attachDragHandlers(blk); });
      palette.appendChild(b);
    });
    ui.appendChild(palette);

    const seqDiv = document.createElement('div'); seqDiv.className='workspace-area'; seqDiv.id='frog-seq'; ui.appendChild(seqDiv);

    const pads = document.createElement('div'); pads.style.display='flex'; pads.style.gap='12px'; pads.style.marginTop='12px';
    const totalPads = 6; const padEls = [];
    for(let i=0;i<totalPads;i++){
      const p = document.createElement('div'); p.style.width='80px'; p.style.height='60px'; p.style.background='#E6FFFA'; p.style.border='2px solid var(--border-color)'; p.style.borderRadius='10px';
      p.style.display='flex'; p.style.alignItems='center'; p.style.justifyContent='center'; p.style.fontSize='28px';
      p.innerText = i===0? '🐸' : '';
      pads.appendChild(p); padEls.push(p);
    }
    ui.appendChild(pads);

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Run'; run.addEventListener('click', ()=> runSeq());
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=> { seqDiv.innerHTML=''; $('#game-message').innerText=''; renderLeaderboard('Frog Debugger'); });
    controls.appendChild(run); controls.appendChild(reset);

    function resetPads(){ padEls.forEach((p,i)=>{ p.innerText = i===0? '🐸':''; p.style.background='#E6FFFA'; }); }

    async function runSeq(){
      const expanded = expandWorkspaceToFlat(seqDiv);
      const actions = expanded.flat;
      const refs = expanded.refs;
      if(actions.length===0){ $('#game-message').innerText='Add blocks to run the frog!'; return; }
      if(!checkSafetyCount(actions.length)) return;

      resetPads();
      let pos = 0;
      for(let i=0;i<actions.length;i++){
        const s = actions[i]; const ref = refs[i];
        highlightRef(ref);
        if(s==='right') pos = Math.min(totalPads-1, pos+1);
        if(s==='left') pos = Math.max(0, pos-1);
        if(s==='jump') pos = Math.min(totalPads-1, pos+1);
        animateFrog(pos, padEls);
        await delay(STEP_MS + 100);
        unhighlightRef(ref);
      }

      // evaluate success: need to be at targetIndex and sequence logically match correct pattern
      const targetIndex = 4;
      // For the Frog we require both position and that the visible sequence equals correct (not expanded)
      const visible = Array.from(seqDiv.querySelectorAll('[data-action]')).map(n=>n.dataset.action);
      if(pos>=targetIndex && arraysEqual(visible, correct)){
        $('#game-message').innerText='Nice fix! Freddie crossed the pond 🐸';
        const score = visible.length;
        askNameAndSave('Frog Debugger', score, 'moves');
        renderLeaderboard('Frog Debugger');
      } else {
        $('#game-message').innerText='Almost — check the sequence and try swapping one block.';
      }
    }

    function animateFrog(pos, padEls){
      padEls.forEach(p=> p.innerText='');
      padEls[pos].innerText = '🐸';
      padEls[pos].style.background = '#FEF08A';
      setTimeout(()=>{ padEls[pos].style.background = '#E6FFFA'; }, 400);
    }

    function arraysEqual(a,b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }

    renderLeaderboard('Frog Debugger');
  }

  // Utility: delay promise
  function delay(ms){ return new Promise(res => setTimeout(res, ms)); }

  // Show/hide shared game area that hosts the game UI
  function showGameArea(title){
    const area = $('#game-area');
    if(!area) return;
    area.style.display = '';
    $('#game-header').innerHTML = `<h2 class="section-title">${escapeHtml(title)}</h2>`;
    $('#exit-game').style.display = 'inline-block';
  }
  function hideGameArea(){
    const area = $('#game-area'); if(!area) return;
    area.style.display = 'none';
    $('#game-ui').innerHTML = '';
    $('#game-controls').innerHTML = '';
    $('#game-message').innerText = '';
    $('#game-leaderboard').innerHTML = '';
    $('#exit-game').style.display = 'none';
  }

  // Wire up game selection and exit
  document.addEventListener('DOMContentLoaded', ()=>{
    $all('.start-game').forEach(btn=> btn.addEventListener('click', ()=>{
      // find the game card's dataset.game (some pages may use different markup)
      const card = btn.closest('.game-card');
      const g = card ? card.dataset.game : btn.dataset.game;
      if(g==='puppy') initPuppy();
      if(g==='rocket') initRocket();
      if(g==='frog') initFrog();
      // append a small mobile helper note
      if(isTouch) $('#game-message').innerText = 'Tip: tap blocks to select, then use Move/Remove controls in the game controls area.';
    }));

    const exit = $('#exit-game'); if(exit) exit.addEventListener('click', hideGameArea);
  });

})();
