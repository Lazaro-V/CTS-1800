// games.js — lightweight prototypes for Puppy Maze, Rocket Loop, and Frog Debugger
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
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter(a=>a.game===game);
    if(arr.length===0){ container.innerHTML = '<p>No scores yet — be the first!'; return; }
    const sorted = arr.sort((a,b)=>a.score - b.score).slice(0,10);
    let html = '<h4>Top Scores</h4><ol>' + sorted.map(r=>`<li>${escapeHtml(r.name||'Player')} — ${r.score} ${r.metric || ''} <small style="color:#64748B">(${new Date(r.ts).toLocaleString()})</small></li>`).join('') + '</ol>';
    container.innerHTML = html;
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Basic UI helpers
  function showGameArea(title){
    $('#game-area').style.display = '';
    $('#game-header').innerHTML = `<h2 class="section-title">${escapeHtml(title)}</h2>`;
    $('#exit-game').style.display = 'inline-block';
  }
  function hideGameArea(){
    $('#game-area').style.display = 'none';
    $('#game-ui').innerHTML = '';
    $('#game-controls').innerHTML = '';
    $('#game-message').innerText = '';
    $('#game-leaderboard').innerHTML = '';
    $('#exit-game').style.display = 'none';
  }

  // Puppy Maze Quest
  function initPuppy(){
    showGameArea('Puppy Maze Quest');
    const ui = $('#game-ui'); ui.innerHTML = '';
    const controls = $('#game-controls'); controls.innerHTML = '';

    const gridSize = 5;
    const start = {x:0,y:4};
    const goal = {x:4,y:0};
    const obstacles = [{x:2,y:3},{x:3,y:2}];

    // create palette
    const palette = document.createElement('div'); palette.className='toolbar';
    ['up','left','right','down','jump'].forEach(act=>{
      const b = document.createElement('button'); b.className='block-btn'; b.innerText = act.toUpperCase(); b.dataset.action=act;
      b.addEventListener('click', ()=>{ addTile(act); }); palette.appendChild(b);
    });
    ui.appendChild(palette);

    const workspace = document.createElement('div'); workspace.className='workspace-area'; workspace.id='puppy-workspace'; ui.appendChild(workspace);

    // grid visual
    const grid = document.createElement('div'); grid.style.margin='12px 0'; grid.style.display='grid'; grid.style.gridTemplateColumns=`repeat(${gridSize},48px)`; grid.style.gap='6px';
    for(let y=0;y<gridSize;y++){
      for(let x=0;x<gridSize;x++){
        const cell = document.createElement('div'); cell.style.width='48px'; cell.style.height='48px'; cell.style.background='#fff'; cell.style.border='2px solid var(--border-color)'; cell.style.borderRadius='8px'; cell.style.display='flex'; cell.style.alignItems='center'; cell.style.justifyContent='center';
        if(x===start.x && y===start.y) cell.innerText='🤖';
        else if(x===goal.x && y===goal.y) cell.innerText='🏁';
        else if(obstacles.some(o=>o.x===x && o.y===y)) cell.innerText='🌵';
        grid.appendChild(cell);
      }
    }
    ui.appendChild(grid);

    let sequence = [];
    function addTile(act){
      sequence.push(act);
      const tile = document.createElement('div'); tile.className='tile'; tile.style.cssText='background:#4F46E5;color:#fff;padding:6px 10px;border-radius:8px;font-weight:700;border:2px solid #0F172A;margin-right:6px'; tile.innerText=act;
      workspace.appendChild(tile);
    }

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Run'; run.addEventListener('click', ()=>{ runSequence(); });
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=>{ sequence=[]; workspace.innerHTML=''; $('#game-message').innerText=''; });
    controls.appendChild(run); controls.appendChild(reset);

    function runSequence(){
      let pos = {x:start.x,y:start.y};
      let idx=0;
      const interval = setInterval(()=>{
        if(idx>=sequence.length){ clearInterval(interval); checkWin(pos); return; }
        const a = sequence[idx];
        if(a==='left') pos.x = Math.max(0,pos.x-1);
        if(a==='right') pos.x = Math.min(gridSize-1,pos.x+1);
        if(a==='up') pos.y = Math.max(0,pos.y-1);
        if(a==='down') pos.y = Math.min(gridSize-1,pos.y+1);
        if(a==='jump') { pos.y = Math.max(0,pos.y-2); }
        // collision check
        if(obstacles.some(o=>o.x===pos.x && o.y===pos.y)){
          clearInterval(interval); $('#game-message').innerText='Oh no! Barnaby bumped into an obstacle. Try again.'; return;
        }
        // animate: regenerate grid cells briefly show puppy
        // simple visual: highlight cell by briefly changing background
        idx++;
      }, 450);
    }

    function checkWin(pos){
      if(pos.x===goal.x && pos.y===goal.y){ $('#game-message').innerText='Great! Barnaby reached the goal 🐾'; const score = sequence.length || 0; askNameAndSave('Puppy Maze', score, 'steps'); }
      else{ $('#game-message').innerText='Barnaby did not reach the goal — try changing the sequence.'; }
    }

    function askNameAndSave(game,score,metric){
      const name = prompt('Enter a name for your score (or Cancel to skip)') || 'Player';
      const rec = {game:game, name:name, score:score, metric:metric, ts: Date.now()}; saveScore(rec); renderLeaderboard(game);
    }

    renderLeaderboard('Puppy Maze');
  }

  // Rocket Loop Launch — simple repeat logic
  function initRocket(){
    showGameArea('Rocket Loop Launch');
    const ui = $('#game-ui'); ui.innerHTML=''; const controls = $('#game-controls'); controls.innerHTML='';

    const palette = document.createElement('div'); palette.className='toolbar';
    const thrust = document.createElement('button'); thrust.className='block-btn'; thrust.innerText='THRUST'; thrust.dataset.action='thrust';
    const repeat = document.createElement('button'); repeat.className='block-btn'; repeat.innerText='REPEAT x2'; repeat.dataset.action='repeat2';
    const repeat3 = document.createElement('button'); repeat3.className='block-btn'; repeat3.innerText='REPEAT x3'; repeat3.dataset.action='repeat3';
    [thrust, repeat, repeat3].forEach(b=>{ b.addEventListener('click', ()=> addTile(b.dataset.action)); palette.appendChild(b); });
    ui.appendChild(palette);

    const workspace = document.createElement('div'); workspace.className='workspace-area'; workspace.id='rocket-workspace'; ui.appendChild(workspace);

    const rocketStage = document.createElement('div'); rocketStage.style.height='220px'; rocketStage.style.display='flex'; rocketStage.style.alignItems='flex-end'; rocketStage.style.justifyContent='center';
    const rocket = document.createElement('div'); rocket.innerText='🚀'; rocket.style.fontSize='48px'; rocket.style.transition='transform 1s'; rocketStage.appendChild(rocket);
    ui.appendChild(rocketStage);

    let sequence=[];
    function addTile(a){ sequence.push(a); const t=document.createElement('div'); t.className='tile'; t.style.cssText='background:#4F46E5;color:#fff;padding:6px 10px;border-radius:8px;font-weight:700;margin-right:6px'; t.innerText=a; workspace.appendChild(t); }

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Launch'; run.addEventListener('click', ()=>{ launch(); });
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=>{ sequence=[]; workspace.innerHTML=''; $('#game-message').innerText=''; rocket.style.transform='translateY(0)'; });
    controls.appendChild(run); controls.appendChild(reset);

    function computeThrust(seq){
      let thrust=0; for(let i=0;i<seq.length;i++){ const s=seq[i]; if(s==='thrust') thrust+=1; if(s==='repeat2'){ // next item repeated twice
        const next=seq[i+1]; if(next==='thrust') thrust+=2; }
        if(s==='repeat3'){ const next=seq[i+1]; if(next==='thrust') thrust+=3; }
      } return thrust;
    }

    function launch(){
      const t = computeThrust(sequence);
      // target thrust 4
      const needed = 4;
      if(t>=needed){ $('#game-message').innerText='Boom! Rocket reached orbit 🚀'; rocket.style.transform='translateY(-140px)'; setTimeout(()=>{ askNameAndSave('Rocket Loop', Math.max(1, Math.round(100/t)), 'efficiency'); renderLeaderboard('Rocket Loop'); }, 800); }
      else{ $('#game-message').innerText='Not enough thrust — try adding more thrust or using repeats.'; rocket.style.transform='translateY(-40px)'; }
    }

    function askNameAndSave(game,score,metric){ const name = prompt('Enter name for your score') || 'Player'; saveScore({game:game,name:name,score:score,metric:metric,ts:Date.now()}); }
    renderLeaderboard('Rocket Loop');
  }

  // Frog Hopper Debugger — small edit puzzle
  function initFrog(){
    showGameArea('Frog Hop Debugger');
    const ui = $('#game-ui'); ui.innerHTML=''; const controls = $('#game-controls'); controls.innerHTML='';

    // puzzle: correct sequence ['right','right','jump','right'] but show buggy version
    let correct = ['right','right','jump','right'];
    let buggy = ['right','left','jump','right'];

    const palette = document.createElement('div'); palette.className='toolbar'; ['left','right','jump'].forEach(a=>{ const b=document.createElement('button'); b.className='block-btn'; b.innerText=a; b.addEventListener('click', ()=>{ addToSeq(a); }); palette.appendChild(b); });
    ui.appendChild(palette);

    const seqDiv = document.createElement('div'); seqDiv.className='workspace-area'; seqDiv.id='frog-seq'; ui.appendChild(seqDiv);

    function renderSeq(){ seqDiv.innerHTML=''; buggy.forEach((s,i)=>{ const d=document.createElement('div'); d.style.cssText='background:#4F46E5;color:#fff;padding:6px 10px;border-radius:8px;font-weight:700;margin-right:6px;display:inline-block'; d.innerText=s; d.tabIndex=0; d.addEventListener('click', ()=>{ // cycle value
          const opts=['left','right','jump']; const idx=opts.indexOf(buggy[i]); buggy[i]=opts[(opts.indexOf(buggy[i])+1)%opts.length]; renderSeq(); }); seqDiv.appendChild(d); }); }
    renderSeq();

    function addToSeq(a){ buggy.push(a); renderSeq(); }

    const run = document.createElement('button'); run.className='btn-primary'; run.innerText='Run'; run.addEventListener('click', ()=>{ runSeq(); });
    const reset = document.createElement('button'); reset.className='btn-secondary'; reset.style.marginLeft='8px'; reset.innerText='Reset'; reset.addEventListener('click', ()=>{ buggy=['right','left','jump','right']; renderSeq(); $('#game-message').innerText=''; });
    controls.appendChild(run); controls.appendChild(reset);

    function runSeq(){
      // simulate positions
      let pos=0; for(let i=0;i<buggy.length;i++){ const s=buggy[i]; if(s==='right') pos+=1; if(s==='left') pos-=1; if(s==='jump') pos+=1; }
      // correct target is 4
      const target = 4;
      if(pos>=target && arraysEqual(buggy, correct)){
        $('#game-message').innerText='Nice fix! Freddie crossed the pond 🐸'; const score = buggy.length; const name = prompt('Save your score as') || 'Player'; saveScore({game:'Frog Debugger',name:name,score:score,metric:'moves',ts:Date.now()}); renderLeaderboard('Frog Debugger');
      } else {
        $('#game-message').innerText='Almost — check the sequence and try swapping one block.';
      }
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

    $('#exit-game').addEventListener('click', hideGameArea);
  });

})();
