
/* ================= 数据 ================= */
const FAM = {
  wind:{name:'风起',emoji:'🍂',words:['烦躁','焦虑','愤怒','紧张','委屈','有压力'],val:-1,aro:1,cat:'wind.webp',
    t:mint('--fr-t'),m:mint('--fr-m'),d:mint('--fr-d')},
  sun:{name:'日晴',emoji:'☀️',words:['开心','兴奋','期待','惊喜','自豪','有干劲'],val:1,aro:1,cat:'sunny.webp',
    t:mint('--fy-t'),m:mint('--fy-m'),d:mint('--fy-d')},
  rain:{name:'夜雨',emoji:'🌧️',words:['低落','难过','疲惫','孤独','空落','提不起劲'],val:-1,aro:-1,cat:'rain.webp',
    t:mint('--fb-t'),m:mint('--fb-m'),d:mint('--fb-d')},
  breeze:{name:'微风',emoji:'🍃',words:['平静','放松','安心','舒服','淡淡的幸福','感恩'],val:1,aro:-1,cat:'breeze.webp',
    t:mint('--fg-t'),m:mint('--fg-m'),d:mint('--fg-d')},
};
function mint(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
const TRIGGERS=['学习','工作','人际','家人','恋爱','身体','睡眠','独处','刷手机','说不清'];
// 近两周种子数据（旧 13 条，今天实时新增）
let logs=[
  {d:-13,fam:'rain',word:'疲惫',i:3,tr:['工作'],note:'连着加了三天班'},
  {d:-12,fam:'breeze',word:'平静',i:2,tr:['学习'],note:'图书馆待了一下午'},
  {d:-11,fam:'wind',word:'焦虑',i:4,tr:['学习'],note:'下周要交开题'},
  {d:-10,fam:'sun',word:'开心',i:4,tr:['人际'],note:'和室友吃了火锅'},
  {d:-9,fam:null},
  {d:-8,fam:'rain',word:'低落',i:3,tr:['工作','睡眠'],note:'躺到一点才睡'},
  {d:-7,fam:'sun',word:'期待',i:4,tr:['人际'],note:'周末约了展览'},
  {d:-6,fam:'wind',word:'有压力',i:4,tr:['工作','学习'],note:'两件事撞在一起'},
  {d:-5,fam:'breeze',word:'放松',i:2,tr:['人际'],note:'公园走了走'},
  {d:-4,fam:null},
  {d:-3,fam:'rain',word:'疲惫',i:4,tr:['工作'],note:'被 deadline 追着跑'},
  {d:-2,fam:'wind',word:'紧张',i:3,tr:['学习'],note:'pre 前一晚'},
  {d:-1,fam:'sun',word:'开心',i:4,tr:['人际'],note:'和朋友唱了歌'},
];
const MA={
  rain:[['💧','喝一杯温水','慢慢喝完它'],['🪟','开窗站一分钟','看看远处'],['🫧','做一轮 4-7-8 呼吸','团子陪你'],['🧣','裹紧毯子抱一下自己','30 秒就好']],
  wind:[['📝','写下最坏的情况','三行就停'],['🏃','原地快走五分钟','把风放出去'],['✊','攥拳—松开 ×5','肩膀也松开'],['🌬','长长地呼一口气','呼得比吸长']],
  sun:[['🌟','存一个值得记住的瞬间','留给未来的你'],['💌','把开心分享给一个人','快乐会变大'],['📷','拍下今天的天空','存进你的合集']],
  breeze:[['🌿','记一句此刻的感受','轻轻收好'],['☕','认真喝一杯东西','只做这一件事'],['🐈','看看团子','它也在看你']],
};
const RESP={
  rain:(w,tr)=>[`被${tr}压得有点沉的「${w}」——今天辛苦了，团子都看到了。`,`在这样的日子里感到${w}，是很自然的事。很多走过同样一天的人，也会这样。`,`如果想的话，让团子陪你做一件 30 秒的小事。慢慢来，天空会亮的。`],
  wind:(w,tr)=>[`面对${tr}时的「${w}」，真实又汹涌，团子都感受到了。`,`被追赶的时候心里起风，是身体在认真保护你——这不是你的错。`,`风会停的。先呼一口长长的气，把风一点点放出去。`],
  sun:(w,tr)=>[`今天的「${w}」像晴朗的天空，值得被好好记住。`,`${tr?tr+'带来的': ''}快乐的时候，允许自己尽兴地快乐——这也是自我关怀。`,`要不要存一个「值得纪念的瞬间」，留给某个下雨的日子？`],
  breeze:(w,tr)=>[`此刻的「${w}」很珍贵，像微风掠过湖面。`,`平静不是没有情绪，而是情绪刚好被安放。你已经很会照顾自己了。`,`团子会帮你把这个瞬间轻轻收好，不会弄丢。`],
};

/* ================= 基础 UI ================= */
const $=id=>document.getElementById(id);
let todayLog=null;

function toast(t){const el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2200)}
function go(pg,btn){document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));$(pg).classList.add('on');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));btn.classList.add('on');}
function scrollTo0(id){go('pg-care',document.querySelector('[data-pg=pg-care]'));setTimeout(()=>$('pg-care').scrollTo({top:$(id).offsetTop-80,behavior:'smooth'}),120)}

/* 时钟 & 问候 */
function tick(){const n=new Date();$('clock').textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')}
tick();setInterval(tick,15000);
(function(){const n=new Date();const wd=['日','一','二','三','四','五','六'][n.getDay()];
  $('dateline').textContent=`${n.getMonth()+1}月${n.getDate()}日`;$('weekline').textContent='星期'+wd;
  const h=n.getHours();
  $('greet').textContent=h<5?'夜深了':h<11?'早上好':h<14?'中午好':h<18?'下午好':h<23?'晚上好':'夜深了';})();

/* ================= 今日页渲染 ================= */
function renderHome(){
  const sky=$('sky');
  if(!todayLog){
    sky.style.background='linear-gradient(160deg,#F0F1F3 0%,var(--fog) 100%)';
    sky.innerHTML=`<div class="empty">
      <div class="t1">今天的天空还空白着</div>
      <div class="t2">情绪像天气，来了也会走。<br>看看此刻是什么天气，只要 30 秒。</div></div>
      <div class="cat-plate"><img src="assets/mascot.webp"></div>
      <button class="cta" onclick="openRecord()">看看此刻的天气 →</button>`;
    $('respHome').style.display='none';
  }else{
    const f=FAM[todayLog.fam];
    sky.style.background=`linear-gradient(160deg,${f.t} -8%,${f.m} 130%)`;
    sky.innerHTML=`<div class="info">
        <div class="big">${f.emoji} ${f.name} · ${todayLog.word}</div>
        <div class="sm">今天 ${todayLog.time} · 强度 ${'●'.repeat(todayLog.i)}${'○'.repeat(5-todayLog.i)}<br>已收好，被团子看见了</div></div>
      <div class="cat-plate"><img src="assets/${f.cat}"></div>`;
    $('respHome').style.display='block';
    $('respHome').innerHTML=`<div class="rcard">
      <div class="plate"><img src="assets/comfort.webp"></div>
      <div class="tx"><div class="who">团子 · 今天</div>
        <div class="body">${todayLog.resp[0]}</div>
        <span class="act ${todayLog.actDone?'done':''}" onclick="doHomeAct()">${todayLog.actDone?'✓ '+todayLog.act:'→ 去做：'+todayLog.act}</span>
      </div></div>`;
  }
  // 时间线
  const past=logs.filter(l=>l.fam).slice().reverse().slice(0,6);
  $('tlList').innerHTML=past.map(l=>{const f=FAM[l.fam];
    return `<div class="row" style="color:${f.m}">
      <div class="dot" style="background:${f.m};color:${f.m}"></div>
      <div class="when">${l.d===-1?'昨天':(-l.d)+' 天前'}</div>
      <div class="what"><div class="w1" style="color:${f.d}">${f.emoji} ${f.word}</div>
      <div class="w2">${l.note||f.name+' · '+l.tr.join('、')}</div></div></div>`}).join('');
}
function doHomeAct(){if(!todayLog)return;todayLog.actDone=true;toast('今天也照顾了自己 🌱');renderHome()}

/* ================= 洞察渲染 ================= */
function lastNDays(n){const out=[];for(let i=n-1;i>=0;i--){const l=logs.find(x=>x.d===-i);out.push(l||{d:-i,fam:null})}if(todayLog)out[out.length-1]=todayLog;return out}
function renderInsight(){
  const wk=lastNDays(7);
  const names=['一','二','三','四','五','六','日'];
  const todayIdx=(new Date().getDay()+6)%7;
  $('rainbow').innerHTML=wk.map((l,i)=>{const f=l.fam?FAM[l.fam]:null;
    return `<div class="d"><div class="b ${i===todayIdx?'today':''}" style="background:${f?f.m:'var(--surface2)'};border:2px solid ${f?'transparent':'var(--line)'}">${f?f.emoji:''}</div>${i===todayIdx?'今天':'周'+names[i]}</div>`}).join('');
  // 曲线（14 天）
  const days=lastNDays(14);const W=320,H=130,pad=14;
  const pts=days.map((l,i)=>{const f=l.fam?FAM[l.fam]:null;const v=f?f.val*f.aro*.9+ (l.i-3)*.28*f.val:0;
    const x=pad+i*(W-2*pad)/13;const y=H/2 - v*(H/2-18);return{x,y,f:l.fam}});
  let path='M'+pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
  $('curve').innerHTML=`
    <line x1="${pad}" y1="${H/2}" x2="${W-pad}" y2="${H/2}" stroke="var(--line)" stroke-dasharray="3 4"/>
    <path d="${path} L${W-pad},${H/2} L${pad},${H/2} Z" fill="url(#gg)" opacity=".5"/>
    <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${FAM.sun.m}"/><stop offset="1" stop-color="${FAM.rain.m}"/></linearGradient></defs>
    <path d="${path}" fill="none" stroke="var(--brand)" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
    ${pts.map((p,i)=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${i===13?5:3.6}" fill="${p.f?FAM[p.f].m:'var(--line)'}" stroke="var(--bg)" stroke-width="1.6"/>`).join('')}`;
  // 触发因素
  const cnt={};logs.filter(l=>l.fam).concat(todayLog?[todayLog]:[]).forEach(l=>l.tr.forEach(t=>{cnt[t]=cnt[t]||{n:0,fams:{}};cnt[t].n++;cnt[t].fams[l.fam]=(cnt[t].fams[l.fam]||0)+1}));
  const top=Object.entries(cnt).sort((a,b)=>b[1].n-a[1].n).slice(0,3);
  const max=top[0]?top[0][1].n:1;
  $('triggers').innerHTML=top.map(([k,v])=>{const main=Object.entries(v.fams).sort((a,b)=>b[1]-a[1])[0][0];
    return `<div class="tbar"><div class="lb"><b>${k}</b><span style="color:var(--ink3)">${v.n} 次</span></div>
    <div class="tr"><div class="fl" style="width:${v.n/max*100}%;background:${FAM[main].m}"></div></div></div>`}).join('');
  // 分布
  const dc={wind:0,sun:0,rain:0,breeze:0};
  logs.filter(l=>l.fam).concat(todayLog?[todayLog]:[]).forEach(l=>dc[l.fam]++);
  $('dist').innerHTML=Object.entries(FAM).map(([k,f])=>`<div class="tbar"><div class="lb"><b style="color:${f.d}">${f.emoji} ${f.name}</b><span style="color:var(--ink3)">${dc[k]} 次</span></div>
    <div class="tr"><div class="fl" style="width:${dc[k]/13*100}%;background:linear-gradient(90deg,${f.t},${f.m})"></div></div></div>`).join('');
}
function openWeekly(){
  $('wkBody').innerHTML=`本周你记录了 <b>${logs.filter(l=>l.d>=-6&&l.fam).length+(todayLog?1:0)} 次</b>天空。两场「夜雨」都落在工作日的晚上——<b>deadline 前夜</b>，这不是巧合。<br><br>触发因素Top3 是 <b>工作、学习、人际</b>。周五的雨最大，周日就晴了——你看，天气真的会自己变。`;
  $('wkKeep').innerHTML=`<b>🌤 值得保留的瞬间</b><br>周三 · ☀️ 开心（和室友吃了火锅）<div class="dt">收进你的天空合集 · 2026 第 45 周</div>`;
  $('weekly').classList.add('on');
}

/* ================= 关怀页 ================= */
let acts=MA.rain.map((a,i)=>({em:a[0],t:a[1],s:a[2],done:i===0}));
function renderActs(){$('actList').innerHTML=acts.map((a,i)=>`<div class="actrow">
  <div class="chk ${a.done?'on':''}" onclick="acts[${i}].done=!acts[${i}].done;renderActs()">${a.done?'✓':''}</div>
  <div><div class="t1" style="font-size:13.5px;font-weight:700">${a.em} ${a.t}</div><div style="font-size:11px;color:var(--ink3);margin-top:2px">${a.s}</div></div></div>`).join('')}
renderActs();
let letters=[{t:'这一周辛苦了，你是很努力的小孩。',d:'11 月 1 日 · 给 11.2 的我'}];
function renderLetters(){$('letters').innerHTML=letters.map(l=>`<div class="letter">「${l.t}」<div class="dt">✉︎ ${l.d}</div></div>`).join('')}
renderLetters();
function saveLetter(){const v=$('letterIn').value.trim();if(!v)return;
  letters.unshift({t:v,d:'刚刚 · 给明天的我'});$('letterIn').value='';renderLetters();toast('已存好，明晚拆开 💌')}
function openHelp(){$('help').classList.add('on')}

/* ================= 记录流程 ================= */
let rec={fam:null,word:null,i:3,tr:[],note:''};
function openRecord(){rec={fam:null,word:null,i:3,tr:[],note:''};
  $('record').classList.add('on');$('steps').scrollTop=0;
  showStep(1);renderQuads()}
function closeRecord(fromResp){
  $('record').classList.remove('on');$('resp').classList.remove('on');
  resetSteps();
  if(fromResp){renderHome();renderInsight();go('pg-home',document.querySelector('[data-pg=pg-home]'));
    if(rec.fam==='rain'&&rec.i>=4){document.body.classList.add('soft');setTimeout(()=>document.body.classList.remove('soft'),30000)}}
}
function resetSteps(){$('st1').style.display='';$('st2').style.display='none';$('st3').style.display='none';
  $('st3opts').style.display='';$('st3say').style.display='none';$('st3write').style.display='none';$('st3chat').style.display='none';
  $('words').classList.remove('show');$('quads').style.display='';setProg(1)}
function setProg(n){$('prog').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('on',i<n))}
function showStep(n){setProg(n);$('st1').style.display=n===1?'':'none';$('st2').style.display=n===2?'':'none';$('st3').style.display=n===3?'':'none';$('steps').scrollTop=0}
function renderQuads(){
  $('quads').innerHTML=Object.entries(FAM).map(([k,f])=>`<button class="quad" style="background:linear-gradient(155deg,${f.t} -10%,${f.m} 135%)" onclick="pickFam('${k}')">
    <div class="em">${f.emoji}</div><div class="mini"><img src="assets/${f.cat}"></div>
    <div class="nm">${f.name}</div><div class="wd">${f.words.slice(0,3).join(' · ')}</div></button>`).join('');
}
function pickFam(k){rec.fam=k;const f=FAM[k];
  $('quads').style.display='none';
  const w=$('words');w.classList.add('show');
  w.innerHTML=f.words.map(word=>`<button class="wchip" onclick="pickWord('${k}','${word}',this)">${word}</button>`).join('');
  w.style.setProperty('--sc',f.m);
}
function pickWord(k,word,el){rec.word=word;rec.i=FAM[k].aro>0?4:3;
  document.querySelectorAll('.wchip').forEach(c=>{c.classList.remove('sel');c.style.background='';c.style.color=''});
  el.classList.add('sel');el.style.background=FAM[k].t;el.style.color=FAM[k].d;
  setTimeout(()=>{showStep(2);renderStep2()},330);
}
function renderStep2(){const f=FAM[rec.fam];
  $('st2pill').innerHTML=`<span class="pill" style="background:${f.t};color:${f.d}">${f.emoji} ${f.name} · ${rec.word}</span>`;
  const s=$('intensity');s.value=rec.i;s.style.background=`linear-gradient(90deg,${f.t},${f.m})`;
  s.oninput=()=>rec.i=+s.value;
  $('tags').innerHTML=TRIGGERS.map(t=>`<button class="tag" onclick="this.classList.toggle('sel');tagToggle('${t}')">${t}</button>`).join('');
}
function tagToggle(t){const i=rec.tr.indexOf(t);i>=0?rec.tr.splice(i,1):rec.tr.push(t)}
function toStep3(){showStep(3);$('skipBtn').style.visibility='hidden'}
function recordSkip(){
  if($('st1').style.display!=='none'&&!rec.word){closeRecord();return}
  respond(rec.note);
}
/* Step3 三选项 */
function sayIt(){$('st3opts').style.display='none';$('st3skip').style.display='none';$('st3say').style.display='block';
  $('wavbars').innerHTML=Array.from({length:22},(_,i)=>`<i style="animation-delay:${i*90}ms"></i>`).join('');
  setTimeout(()=>{const txt=`${rec.tr[0]||'今天'}的事让我有点${rec.word}，说完好像轻了一点…`;
    typeOut($('typedOut'),txt,()=>setTimeout(()=>respond(txt),700))},1600)}
function writeIt(){$('st3opts').style.display='none';$('st3skip').style.display='none';$('st3write').style.display='block';$('noteIn').focus()}
function finishNote(){respond($('noteIn').value.trim())}
function chatIt(){$('st3opts').style.display='none';$('st3skip').style.display='none';$('st3chat').style.display='block';
  const box=$('chatBox');box.innerHTML='';
  const add=(cls,txt,d=600)=>new Promise(r=>setTimeout(()=>{const d0=document.createElement('div');d0.className='bub '+cls;d0.textContent=txt;box.appendChild(d0);r()},d));
  (async()=>{
    await add('ai',`我在呢 🍊 今天的「${rec.word}」，是从哪里来的？`);
    await add('me',`${rec.tr.length?rec.tr.join('和'):'一些事'}，让我觉得${rec.word}`);
    await add('ai','嗯…这种时候，身体是什么感觉？');
    const q=document.createElement('div');q.className='qchips';
    ['心跳有点快','肩膀绷着','脑袋停不下来','说不上来'].forEach(t=>{const b=document.createElement('button');b.className='qchip';b.textContent=t;
      b.onclick=()=>{rec.note=`${rec.tr.join('、')}让我${rec.word}，${t}`;respond(rec.note)};q.appendChild(b)});
    setTimeout(()=>box.appendChild(q),400);
  })()
}
function typeOut(el,txt,done){el.textContent='';let i=0;const t=setInterval(()=>{el.textContent=txt.slice(0,++i);if(i>=txt.length){clearInterval(t);done&&done()}},55)}

/* 回应 */
function respond(note){
  rec.note=note||rec.note;
  const f=FAM[rec.fam];
  const n=new Date();
  todayLog={d:0,fam:rec.fam,word:rec.word,i:rec.i,tr:rec.tr.length?rec.tr:['说不清'],note:rec.note,
    time:String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')};
  const tr=todayLog.tr.filter(t=>t!=='说不清').join('和')||'今天的事';
  todayLog.resp=RESP[rec.fam](rec.word,tr);
  const pool=MA[rec.fam];todayLog.act=pool[0][1];todayLog.actDone=false;todayLog.maPool=pool;
  // 回应屏
  $('record').classList.remove('on');
  const r=$('resp');r.style.background=`linear-gradient(175deg,${f.t} 0%,var(--bg) 62%)`;
  $('respCat').src='assets/comfort.webp';
  $('respTag').textContent=`${f.emoji} ${f.name} · ${rec.word}，已收好`;
  $('respTag').style.background=`linear-gradient(140deg,${f.m},${f.d})`;
  $('respBody').innerHTML=todayLog.resp.map(p=>`<p>${p}</p>`).join('');
  $('maList').innerHTML=pool.slice(0,3).map((a,i)=>`<button onclick="pickMa(${i},this)">
    <div class="em">${a[0]}</div><div style="flex:1"><div class="t1">${a[1]}</div><div class="t2">${a[2]}</div></div></button>`).join('');
  r.classList.add('on');resetSteps();
}
function pickMa(i,btn){btn.classList.add('done');btn.querySelector('.em').textContent='✓';
  todayLog.act=btn.querySelector('.t1').textContent;todayLog.actDone=true;toast('今天也照顾了自己 🌱')}

/* ================= 呼吸 4-7-8 ================= */
let bTimer=null,bCycle=0;
function openBreath(night){
  const b=$('breath');b.classList.add('on');b.classList.toggle('nightmode',!!night);
  $('bcat').src=night?'assets/night.webp':'assets/breeze.webp';
  $('breathT').textContent=night?'睡 前 · 4 · 7 · 8':'4 · 7 · 8 呼 吸';
  $('calmDone').classList.remove('on');bCycle=0;breathPhase('inhale',4);
}
function breathPhase(ph,sec){
  const b=$('breath'),cir=$('bcir');
  const map={inhale:['吸气',4],hold:['屏住',7],exhale:['呼气·慢慢',8]};
  let left=sec;
  $('bphase').textContent=map[ph][0];$('bcnt').textContent=left;
  if(ph==='inhale'){cir.style.transitionDuration='4s';cir.style.transform='scale(1.38)'}
  if(ph==='hold'){b.classList.add('hold');cir.style.transform='scale(1.38)'}
  if(ph==='exhale'){b.classList.remove('hold');cir.style.transitionDuration='8s';cir.style.transform='scale(1)'}
  clearInterval(bTimer);
  bTimer=setInterval(()=>{left--;if(left>0){$('bcnt').textContent=left;return}
    clearInterval(bTimer);
    if(ph==='inhale')breathPhase('hold',7);
    else if(ph==='hold')breathPhase('exhale',8);
    else{bCycle++;$('bcycles').textContent=`第 ${bCycle+1} 轮 · 团子和你一起`;
      if(bCycle>=1&&!$('calmDone').classList.contains('on'))$('calmDone').classList.add('on');
      breathPhase('inhale',4)}
  },1000);
}
function breathDone(){$('calmDone').classList.add('on')}
function closeBreath(){clearInterval(bTimer);$('breath').classList.remove('on')}

/* ================= 冥想 ================= */
let mTimer=null;
function openMeditate(){
  $('medi').classList.add('on');
  let t=300;$('mediCir').style.transform='scale(1.12)';
  const tips=['从头顶…慢慢注意到眉心','肩膀，松开','呼吸，进…出','胸口起伏…肚子起伏','膝盖…脚踝…脚趾','很好，就这样'];
  let ti=0;$('mediTip').textContent=tips[0];
  clearInterval(mTimer);
  mTimer=setInterval(()=>{t--;if(t<=0){medExit();toast('这一节完成了 🌊');return}
    const mm=Math.floor(t/60),ss=t%60;$('mediCnt').textContent=`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    if(t%25===0){ti=(ti+1)%tips.length;$('mediTip').textContent=tips[ti]}},1000);
}
function medExit(){clearInterval(mTimer);$('mediCir').style.transform='scale(1)';$('medi').classList.remove('on')}

/* ================= 主题 ================= */
let autoTheme=false;
function setTheme(night,auto){
  autoTheme=!!auto;
  if(auto){const h=new Date().getHours();night=(h>=22||h<6)}
  document.body.classList.toggle('night',!!night);
  document.body.classList.toggle('night-stage',!!night);
  $('themeChip').textContent=night?'☀️':'🌙';
  document.querySelectorAll('#themeSeg button').forEach((b,i)=>b.classList.toggle('on',(auto&&i===2)||(!auto&&((i===0)==!night))));
  // 重建依赖色值的图表
  Object.keys(FAM).forEach(k=>{const f=FAM[k];f.t=mint(k==='wind'?'--fr-t':k==='sun'?'--fy-t':k==='rain'?'--fb-t':'--fg-t');
    f.m=mint(k==='wind'?'--fr-m':k==='sun'?'--fy-m':k==='rain'?'--fb-m':'--fg-m');f.d=mint(k==='wind'?'--fr-d':k==='sun'?'--fy-d':k==='rain'?'--fb-d':'--fg-d')});
  renderHome();renderInsight();
}
$('themeChip').onclick=()=>setTheme(!document.body.classList.contains('night'),false);
// 起点 сегment 默认
document.querySelectorAll('#paceSeg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#paceSeg button').forEach(x=>x.classList.remove('on'));b.classList.add('on')});

/* 初始 */
renderHome();renderInsight();
// 自动进入深夜（如当前为夜间）
(function(){const h=new Date().getHours();if(h>=22||h<6)setTheme(true,false);else setTheme(false,false)})();
