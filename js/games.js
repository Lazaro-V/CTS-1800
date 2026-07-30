// games.js — playable minigames with visual animation for Puppy Maze, Rocket Loop, and Frog Debugger
(function(){
  function $(s){return document.querySelector(s);} 
  function $all(s){return Array.from(document.querySelectorAll(s));}

  const STORAGE_KEY = 'kidcode_game_scores';

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
    if(arr.length===0){ container.innerHTML = '<p>No scores yet — be the first!'; return; }
    const sorted = arr.sort((a,b)=>a.score - b.score).slice(0,10);
    let html = '<h4>Top Scores</h4><ol>' + sorted.map(r=>`<li>${escapeHtml(r.name||'Player')} — ${r.score} ${r.metric || ''} <small style="color:#64748B">(${new Date(r.ts).toLocaleString()})</small></li>`).join('') + '</ol>';
    container.innerHTML = html;
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Basic UI helpers
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

  /* ---------- Puppy Maze Quest (playable) ---------- */
  function initPuppy(){
    showGameArea('Puppy Maze Quest');
    const ui = $('#game-ui'); ui.innerHTML = '';
    const controls = $('#game-controls'); controls.innerHTML = '';

    const gridSize = 5;
    const start = {x:0,y:4};
    const goal = {x:4,y:0};
    const obstacles = [{x:2,y:3},{x:3,y:2}];

    // palette
    const palette = document.createElement('div'); palette.className='toolbar';
    ['left','right','up','down','jump'].forEach(act=>{
      const b = document.createElement('button'); b.className='block-btn'; b.innerText = act.toUpperCase(); b.dataset.action=act;
      b.addEventListener('click', ()=>{ addTile(act); }); palette.appendChild(b);
    });
    ui.appendChild(palette);

    const workspace = document.createElement('div'); workspace.className='workspace-area'; workspace.id='puppy-workspace'; ui.appendChild(workspace);

    // create visual grid
    const grid = document.createElement('div'); grid.style.margin='12px 0'; grid.style.display='grid'; grid.style.gridTemplateColumns=`repeat(${gridSize},56px)`; grid.style.gap='6px';
    const cells = [];
    for(let y=0;y<gridSize;y++){
      for(let x=0;x<gridSize;x++){
        const cell = document.createElement('div');
        cell.style.width='56px'; cell.style.height='56px'; cell.style.background='#fff'; cell.style.border='2px solid var(--border-color)'; cell.style.borderRadius='8px'; cell.style.display='flex'; cell.style.alignItems='center'; cell.style.justifyContent='center';
        cell.style.fontSize='24px';
        if(x===start.x && y===start.y) cell.innerText='🐶';
        else if(x===goal.x && y===goal.y) cell.innerText='🏁';
        else if(obstacles.some(o=>o.x===x && o.y===y)) cell.innerText='🌵';
        else cell.innerText='';
        grid.appendChild(cell);
        cells.push({x,y,el:cell});
      }
    }
    ui.appendChild(grid);

    let sequence = [];
    function addTile(act){
      sequence.push(act);
      const tile = document.createElement('div'); tile.className='tile'; tile.style.cssText='background:#4F46E5;color:#fff;padding:6px 10px;border-radius:8px;font-weight:700;border:2px solid #0F172A;margin-right:6px;cursor:default'; tile.innerText=act;
      workspace.appendChild(tile);
    }

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Run'; run.disabled = sequence.length===0; run.addEventListener('click', ()=>{ runSequence(); });
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=>{ sequence=[]; workspace.innerHTML=''; $('#game-message').innerText=''; resetGrid(); });
    controls.appendChild(run); controls.appendChild(reset);

    function resetGrid(){
      cells.forEach(c=>{ c.el.style.background='#fff'; if(c.x===start.x && c.y===start.y) c.el.innerText='🐶'; else if(c.x===goal.x && c.y===goal.y) c.el.innerText='🏁'; else if(obstacles.some(o=>o.x===c.x && o.y===c.y)) c.el.innerText='🌵'; else c.el.innerText=''; });
    }

    function runSequence(){
      if(sequence.length===0){ $('#game-message').innerText='Add blocks to play!'; return; }
      run.disabled = true;
      let pos = {x:start.x,y:start.y};
      // clear start
      resetGrid();
      setCell(pos.x,pos.y,'');
      let idx=0;

      function step(){
        if(idx>=sequence.length){ finish(); return; }
        const a = sequence[idx];
        const prev = {...pos};
        if(a==='left') pos.x = Math.max(0,pos.x-1);
        if(a==='right') pos.x = Math.min(gridSize-1,pos.x+1);
        if(a==='up') pos.y = Math.max(0,pos.y-1);
        if(a==='down') pos.y = Math.min(gridSize-1,pos.y+1);
        if(a==='jump') pos.y = Math.max(0,pos.y-2);

        // collision check
        if(obstacles.some(o=>o.x===pos.x && o.y===pos.y)){
          // show collision
          setCell(pos.x,pos.y,'💥');
          $('#game-message').innerText='Oh no! Barnaby bumped an obstacle. Try again.';
          run.disabled = false;
          return;
        }

        // animate move: show puppy in new cell and highlight
        setCell(pos.x,pos.y,'🐶');
        highlightCell(pos.x,pos.y);
        // clear previous after a short delay
        setTimeout(()=>{
          if(!(prev.x===goal.x && prev.y===goal.y)) setCell(prev.x,prev.y,'');
        }, 250);

        idx++;
        setTimeout(step, 450);
      }

      function finish(){
        run.disabled = false;
        if(pos.x===goal.x && pos.y===goal.y){
          $('#game-message').innerText='Great! Barnaby reached the goal 🐾';
          const score = sequence.length || 0; askNameAndSave('Puppy Maze', score, 'steps');
        } else {
          $('#game-message').innerText='Barnaby did not reach the goal — try changing the sequence.';
        }
      }

      step();
    }

    function setCell(x,y,content){
      const idx = y*gridSize + x;
      const c = cells[idx]; if(c) c.el.innerText = content;
    }
    function highlightCell(x,y){
      const idx = y*gridSize + x; const c = cells[idx]; if(!c) return; const orig = c.el.style.background; c.el.style.background = '#FEF08A'; setTimeout(()=>{ c.el.style.background = orig; }, 350);
    }

    function askNameAndSave(game,score,metric){
      const name = prompt('Enter a name for your score (or Cancel to skip)') || 'Player';
      const rec = {game:game, name:name, score:score, metric:metric, ts: Date.now()}; saveScore(rec); renderLeaderboard(game);
    }

    renderLeaderboard('Puppy Maze');
  }

  /* ---------- Rocket Loop Launch (playable) ---------- */
  function initRocket(){
    showGameArea('Rocket Loop Launch');
    const ui = $('#game-ui'); ui.innerHTML=''; const controls = $('#game-controls'); controls.innerHTML='';

    const palette = document.createElement('div'); palette.className='toolbar';
    const thrust = document.createElement('button'); thrust.className='block-btn'; thrust.innerText='THRUST'; thrust.dataset.action='thrust';
    const rep2 = document.createElement('button'); rep2.className='block-btn'; rep2.innerText='REPEAT x2'; rep2.dataset.action='repeat2';
    const rep3 = document.createElement('button'); rep3.className='block-btn'; rep3.innerText='REPEAT x3'; rep3.dataset.action='repeat3';
    [thrust, rep2, rep3].forEach(b=>{ b.addEventListener('click', ()=> addTile(b.dataset.action)); palette.appendChild(b); });
    ui.appendChild(palette);

    const workspace = document.createElement('div'); workspace.className='workspace-area'; workspace.id='rocket-workspace'; ui.appendChild(workspace);

    const rocketStage = document.createElement('div'); rocketStage.style.height='260px'; rocketStage.style.display='flex'; rocketStage.style.alignItems='flex-end'; rocketStage.style.justifyContent='center'; rocketStage.style.marginTop='12px';
    const rocket = document.createElement('div'); rocket.innerText='🚀'; rocket.style.fontSize='56px'; rocket.style.transition='transform 0.6s ease-out'; rocketStage.appendChild(rocket);
    ui.appendChild(rocketStage);

    let sequence=[];
    function addTile(a){ sequence.push(a); const t=document.createElement('div'); t.className='tile'; t.style.cssText='background:#4F46E5;color:#fff;padding:6px 10px;border-radius:8px;font-weight:700;margin-right:6px;cursor:default'; t.innerText=a; workspace.appendChild(t); }

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Launch'; run.addEventListener('click', ()=>{ launch(); });
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=>{ sequence=[]; workspace.innerHTML=''; $('#game-message').innerText=''; rocket.style.transform='translateY(0)'; });
    controls.appendChild(run); controls.appendChild(reset);

    function expandSequence(seq){
      const out = [];
      for(let i=0;i<seq.length;i++){
        const s = seq[i];
        if(s.startsWith('repeat')){
          const n = s==='repeat2'?2:(s==='repeat3'?3:1);
          const next = seq[i+1];
          if(next) { for(let k=0;k<n;k++) out.push(next); }
        } else {
          out.push(s);
        }
      }
      return out;
    }

    function launch(){
      if(sequence.length===0){ $('#game-message').innerText='Add thrust blocks then press Launch!'; return; }
      const actions = expandSequence(sequence);
      let thrustTotal = 0;
      let stepIdx = 0;
      $('#game-message').innerText='Launching...';

      function step(){
        if(stepIdx>=actions.length){
          // final check
          const needed = 4;
          if(thrustTotal>=needed){
            $('#game-message').innerText='Boom! Rocket reached orbit 🚀';
            rocket.style.transform='translateY(-180px)';
            setTimeout(()=>{ const score = Math.max(1, Math.round(100/(thrustTotal||1))); askNameAndSave('Rocket Loop', score, 'efficiency'); renderLeaderboard('Rocket Loop'); }, 800);
          } else {
            $('#game-message').innerText='Not enough thrust — try adding more thrust or using repeats.';
            rocket.style.transform='translateY(-40px)';
          }
          return;
        }
        const a = actions[stepIdx];
        if(a==='thrust'){
          thrustTotal += 1;
          // small boost animation per thrust
          const height = -20 - (thrustTotal*30);
          rocket.style.transform = `translateY(${height}px)`;
          // flame flash
          rocket.style.filter = 'drop-shadow(0 6px 6px rgba(250,204,21,0.45))';
          setTimeout(()=>{ rocket.style.filter='none'; }, 300);
        }
        stepIdx++;
        setTimeout(step, 450);
      }

      step();
    }

    function askNameAndSave(game,score,metric){ const name = prompt('Enter name for your score') || 'Player'; saveScore({game:game,name:name,score:score,metric:metric,ts:Date.now()}); }
    renderLeaderboard('Rocket Loop');
  }

  /* ---------- Frog Hopper Debugger (playable) ---------- */
  function initFrog(){
    showGameArea('Frog Hop Debugger');
    const ui = $('#game-ui'); ui.innerHTML=''; const controls = $('#game-controls'); controls.innerHTML='';

    // correct sequence and buggy seed
    const correct = ['right','right','jump','right'];
    let buggy = ['right','left','jump','right'];

    const palette = document.createElement('div'); palette.className='toolbar'; ['left','right','jump'].forEach(a=>{ const b=document.createElement('button'); b.className='block-btn'; b.innerText=a; b.addEventListener('click', ()=>{ addToSeq(a); }); palette.appendChild(b); });
    ui.appendChild(palette);

    const seqDiv = document.createElement('div'); seqDiv.className='workspace-area'; seqDiv.id='frog-seq'; ui.appendChild(seqDiv);

    // lily pads
    const pads = document.createElement('div'); pads.style.display='flex'; pads.style.gap='12px'; pads.style.marginTop='12px';
    const totalPads = 6; // goal is pad index 4
    const padEls = [];
    for(let i=0;i<totalPads;i++){
      const p = document.createElement('div'); p.style.width='80px'; p.style.height='60px'; p.style.background='#E6FFFA'; p.style.border='2px solid var(--border-color)'; p.style.borderRadius='10px'; p.style.display='flex'; p.style.alignItems='center'; p.style.justifyContent='center'; p.style.fontSize='28px'; p.innerText = i===0? '🐸' : '';
      pads.appendChild(p); padEls.push(p);
    }
    ui.appendChild(pads);

    function renderSeq(){ seqDiv.innerHTML=''; buggy.forEach((s,i)=>{ const d=document.createElement('div'); d.style.cssText='background:#4F46E5;color:#fff;padding:6px 10px;border-radius:8px;font-weight:700;margin-right:6px;display:inline-block;cursor:pointer'; d.innerText=s; d.tabIndex=0; d.title='Click to cycle'; d.addEventListener('click', ()=>{ const opts=['left','right','jump']; const idx=opts.indexOf(buggy[i]); buggy[i]=opts[(opts.indexOf(buggy[i])+1)%opts.length]; renderSeq(); }); seqDiv.appendChild(d); }); }
    renderSeq();

    function addToSeq(a){ buggy.push(a); renderSeq(); }

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Run'; run.addEventListener('click', ()=>{ runSeq(); });
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=>{ buggy = ['right','left','jump','right']; renderSeq(); $('#game-message').innerText=''; resetPads(); });
    controls.appendChild(run); controls.appendChild(reset);

    function resetPads(){ padEls.forEach((p,i)=>{ p.innerText = i===0? '🐸':''; p.style.background='#E6FFFA'; }); }

    function runSeq(){
      resetPads();
      let pos = 0; // pad index
      let i=0;
      function step(){
        if(i>=buggy.length){ finish(); return; }
        const s = buggy[i];
        if(s==='right') pos = Math.min(totalPads-1, pos+1);
        if(s==='left') pos = Math.max(0, pos-1);
        if(s==='jump') pos = Math.min(totalPads-1, pos+1);

        // animate frog move
        animateFrog(pos);
        i++;
        setTimeout(step, 550);
      }

      function finish(){
        const targetIndex = 4; // pad index required
        if(pos>=targetIndex && arraysEqual(buggy, correct)){
          $('#game-message').innerText='Nice fix! Freddie crossed the pond 🐸'; const score = buggy.length; const name = prompt('Save your score as') || 'Player'; saveScore({game:'Frog Debugger',name:name,score:score,metric:'moves',ts:Date.now()}); renderLeaderboard('Frog Debugger');
        } else {
          $('#game-message').innerText='Almost — check the sequence and try swapping one block.';
        }
      }

      step();
    }

    function animateFrog(pos){
      // clear frog
      padEls.forEach(p=> p.innerText='');
      // add frog to target
      padEls[pos].innerText = '🐸';
      padEls[pos].style.background = '#FEF08A';
      setTimeout(()=>{ padEls[pos].style.background = '#E6FFFA'; }, 400);
    }

    function arraysEqual(a,b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }

    renderLeaderboard('Frog Debugger');
  }

  // Wire up game selection
  document.addEventListener('DOMContentLoaded', ()=>{
    $all('.start-game').forEach(btn=> btn.addEventListener('click', ()=>{
      const g = btn.closest('.game-card').dataset.game;
      if(g==='puppy') initPuppy();
      if(g==='rocket') initRocket();
      if(g==='frog') initFrog();
    }));

    const exit = $('#exit-game'); if(exit) exit.addEventListener('click', hideGameArea);
  });

})();
