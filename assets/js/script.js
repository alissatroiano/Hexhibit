// Hexhibit — 3D corridor: gallery mode (light) and one-way escape room (dark)
const P=[
{t:"The Hollow Watcher",a:"Unknown, c. 1884",l:"Recovered from the Blackwood Estate. The eyes seem to shift when you look away.",q:"I have keys but no locks, and space but no room. You can enter, but never leave. What am I?",ans:["keyboard"],d:7,h:"You’re probably touching one right now.",c:["#7a1f2b","#120609"]},
{t:"Ashes of St. Jude",a:"M. Harrow, 1912",l:"Painted by candlelight during a three-day blackout. The canvas stays cold to the touch.",q:"Add together every digit of the year this painting was made. What’s the sum?",ans:["13"],d:3,h:"1 + 9 + 1 + 2",c:["#b4631f","#1a0d05"]},
{t:"Nocturne in Crimson",a:"V. Draven, 1899",l:"Donated anonymously. No parish archive has any record of the artist.",q:"How many letters are in the artist’s surname?",ans:["6","six"],d:2,h:"D-R-A-V-E-N",c:["#8c1d40","#0b0309"]},
{t:"Whispers in the Fog",a:"E. Graves, 1904",l:"Hung in a sealed conservatory. Scratch marks were found beneath the varnish.",q:"A Caesar cipher was scratched into the frame: KDXQWHG. Each letter was shifted forward by 3. Decode it.",ans:["haunted"],d:9,h:"Shift every letter back three places: K → H.",c:["#3d6b75","#06100f"]},
{t:"The Pale Threshold",a:"C. Moreau, 1921",l:"Depicts the exact corridor leading to the locked basement wing.",q:"Read the label backwards: “MOOD”. What does it say?",ans:["doom"],d:5,h:"Spell it from right to left.",c:["#c9c3b0","#17150f"]},
{t:"Last Vigil",a:"A. Thorne, 1876",l:"The final work completed before the Thorne Manor fire.",q:"I have a face and two hands, but no arms or legs. What am I?",ans:["clock","a clock"],d:1,h:"Tick, tock.",c:["#d98b2b","#0d0702"]}
];
const CODE=P.map(p=>p.d).join(""),PRE=190,STOPS=P.map((_,i)=>450*(i+1)-PRE),DOOR=2800,ALL=[...STOPS,DOOR];
// Click assist: a painting is clickable while you are within this window of its stop
const inRange=i=>{const x=S.d-STOPS[i];return x>-330&&x<90};let pending=null,lastIn=0;
const $=id=>document.getElementById(id),world=$("world"),door=$("door");
const viewed=new Set();let escaped=false;const solved=new Set();let unlocked=false,mode=null,cur=0;
const S={d:0,td:0,yaw:0,ty:0,pit:0,tp:0,fy:0,k:{}};
const INFO=[
{m:"Oil on canvas",s:"92 × 76 cm",w:"North Wall",n:"Note how the sitter’s gaze seems to follow you along the corridor."},
{m:"Oil on linen",s:"110 × 84 cm",w:"South Wall",n:"The restricted palette reflects the candlelit conditions of its making."},
{m:"Oil on panel",s:"64 × 48 cm",w:"North Wall",n:"Draven’s crimson glazes are unusually rich for the period."},
{m:"Oil and graphite on canvas",s:"120 × 90 cm",w:"South Wall",n:"Look for the faint linework visible beneath the varnish."},
{m:"Oil on canvas",s:"98 × 130 cm",w:"North Wall",n:"A study in perspective: the corridor appears to recede forever."},
{m:"Oil on canvas",s:"75 × 100 cm",w:"South Wall",n:"Among the last works from the Thorne collection."}
];
// Build paintings
P.forEach((p,i)=>{const side=i%2?1:-1,f=document.createElement("figure");f.className="artwork";f.tabIndex=0;
 f.style.cssText=`--x:${side*244}px;--z:${-450*(i+1)}px;--ry:${-side*90}deg`;
 f.innerHTML=`<div class="art" style="background:radial-gradient(circle at 50% 40%,${p.c[0]},transparent 55%),linear-gradient(160deg,${p.c[0]}55,${p.c[1]})"></div><figcaption>${p.t}</figcaption>`;
 f.onclick=()=>pick(i);f.onkeydown=e=>{if(e.key==="Enter")pick(i)};world.appendChild(f)});
const arts=[...document.querySelectorAll(".artwork")];
function slots(){$("slots").innerHTML=P.map((p,i)=>`<span class="slot ${solved.has(i)?"on":""}">${solved.has(i)?p.d:"•"}</span>`).join("");
 const dk=document.documentElement.dataset.theme==="dark";$("slots").style.display=dk?"":"none";$("prog").textContent=dk?`${solved.size}/6 solved`:`${viewed.size}/6 artworks viewed`}
slots();
// Theme
const root=document.documentElement,dark=()=>root.dataset.theme==="dark";
function theme(t){root.dataset.theme=t;const b=$("theme"),lock=t==="dark"&&!escaped;
 b.textContent=t==="dark"?(escaped?"Back to gallery":"Locked in"):"Enter escape room →";b.disabled=lock;b.style.opacity=lock?.6:1;
 slots();try{localStorage.setItem("hx-theme",lock?"dark":"light")}catch(e){}}
let saved=null;try{saved=localStorage.getItem("hx-theme")}catch(e){}
theme(saved==="dark"?"dark":"light");
// Modal
const M=$("modal"),open=()=>{M.classList.add("open");M.setAttribute("aria-hidden","false");$("ans").value="";$("fb").textContent="";setTimeout(()=>$("ans").focus(),50)};
function close(){M.classList.remove("open");M.setAttribute("aria-hidden","true");mode=null}
$("close").onclick=close;M.onclick=e=>{if(e.target===M)close()};
function ui(q,inp,c,h){$("mq").style.display=q?"":"none";$("ans").style.display=inp?"":"none";$("check").textContent=c;$("hintBtn").style.display=h?"":"none";$("hintBtn").textContent=h||"Hint"}
function maxD(){return dark()&&unlocked?2950:DOOR}
function txt(t,a,l,q,img,pl){$("mt").textContent=t;$("ma").textContent=a;$("ml").textContent=l;$("mq").textContent=q;$("mp").innerHTML=pl||"";
 if(img!=null)$("mimg").setAttribute("style",arts[img].firstChild.getAttribute("style")+";height:170px;border-radius:8px;margin-bottom:1rem");else $("mimg").style.display="none"}
function pick(i){if(!inRange(i)){S.td=STOPS[i];pending=i;return}pending=null;
 cur=i;const p=P[i],f=INFO[i];
 if(!dark()){mode="info";viewed.add(i);arts[i].classList.add("done");slots();
  txt(p.t,p.a,p.l,"Curator’s note: "+f.n,i,`<dt>Medium</dt><dd>${f.m}</dd><dt>Size</dt><dd>${f.s}</dd><dt>On view</dt><dd>${f.w}</dd>`);ui(1,0,"Continue","");open();return}
 mode="art";txt(p.t,p.a,p.l,solved.has(i)?`Solved — this painting gave you the digit ${p.d}.`:p.q);
 $("ans").placeholder="Your answer";$("ans").inputMode="text";ui(1,1,"Check",solved.has(i)?"":"Hint");open()}
door.onclick=()=>{if(S.d<DOOR-200){S.td=DOOR;return}
 if(!dark()){mode="info";txt("The Archive","Staff only","The permanent archive is closed to visitors. Thank you for visiting Hexhibit.","Gallery hours: 10am – 6pm daily.");ui(1,0,"Continue","");open();return}
 if(unlocked){door.classList.toggle("open");return}
 mode="door";txt("The Archive Door","Sealed with a six-digit lock",solved.size<6?`The lock is cold. You’ve found ${solved.size} of 6 digits. Solve every painting’s puzzle to decipher the code.`:"You’ve collected every digit. Enter them in painting order, left to right.","Enter the 6-digit code.");
 $("ans").placeholder="••••••";$("ans").inputMode="numeric";ui(1,1,"Check","");open()};
$("theme").onclick=()=>{if(dark()){if(escaped)home();return}
 mode="enter";txt("Enter the escape room?","There’s no going back","The lights will die and the doors will seal behind you. You’ll have to solve every painting’s puzzle, decipher the door code and escape before you can return to the gallery.","Are you sure?");ui(1,0,"Step inside","Stay in the gallery");open()};
function home(){close();solved.clear();viewed.clear();unlocked=false;escaped=false;$("lock").textContent="LOCKED";door.classList.remove("open");arts.forEach(a=>a.classList.remove("done"));S.td=0;theme("light")}
function check(){const v=$("ans").value.trim().toLowerCase(),fb=$("fb");let ok;
 if(mode==="enter"){close();theme("dark");return}
 if(mode==="escaped")return home();
 if(mode==="info")return close();
 if(mode==="art"){if(solved.has(cur))return close();ok=P[cur].ans.includes(v);
  if(ok){solved.add(cur);arts[cur].classList.add("done");slots();fb.style.color="var(--accent)";fb.textContent=`Correct! Digit ${P[cur].d} revealed.`;setTimeout(close,1100);return}}
 else{ok=v===CODE;if(ok){if(solved.size<6){fb.textContent="You’re guessing! Decipher all six clues first.";return}
  unlocked=true;$("lock").textContent="UNLOCKED";close();S.td=2950;setTimeout(()=>door.classList.add("open"),1600);
  setTimeout(()=>{escaped=true;theme("dark");mode="escaped";txt("You escaped!","Hexhibit · Escape complete","The door swings open and the cold air outside has never felt so good.","Return to the gallery, or stay a moment in the corridor.");ui(1,0,"Return to the gallery","Stay a moment");open()},4200);return}}
 fb.style.color="#e5484d";fb.textContent="Not quite. Try again.";M.firstElementChild.classList.remove("shake");void M.offsetWidth;M.firstElementChild.classList.add("shake")}
$("check").onclick=check;$("ans").onkeydown=e=>{if(e.key==="Enter")check()};
$("hintBtn").onclick=()=>{if(mode==="enter"||mode==="escaped")return close();$("fb").style.color="var(--muted)";$("fb").textContent="Hint: "+P[cur].h};
// Movement
addEventListener("keydown",e=>{if(e.key==="Escape")return close();if(M.classList.contains("open"))return;S.k[e.key.toLowerCase()]=1});
addEventListener("keyup",e=>S.k[e.key.toLowerCase()]=0);
addEventListener("mousemove",e=>{if(M.classList.contains("open"))return;if(e.target.closest&&e.target.closest(".artwork"))return;S.ty=(e.clientX/innerWidth*2-1)*12;S.tp=-(e.clientY/innerHeight*2-1)*6});
addEventListener("wheel",e=>{if(!M.classList.contains("open")){S.td+=e.deltaY*.9;pending=null;lastIn=performance.now()}},{passive:true});
function step(dir){pending=null;const n=ALL.findIndex(s=>dir>0?s>S.td+20:false);
 if(dir>0){S.td=n<0?maxD():ALL[n]}else{const p=[...ALL].reverse().find(s=>s<S.td-20);S.td=p===undefined?0:p}}
$("next").onclick=()=>step(1);$("prev").onclick=()=>step(-1);
function tick(){const open=M.classList.contains("open");
 if(!open){if(S.k.w||S.k.arrowup||S.k.s||S.k.arrowdown){pending=null;lastIn=performance.now()}if(S.k.w||S.k.arrowup)S.td+=16;if(S.k.s||S.k.arrowdown)S.td-=16}
 S.td=Math.max(0,Math.min(maxD(),S.td));
 if(!open&&performance.now()-lastIn>400){const k=ALL.findIndex(s=>Math.abs(S.td-s)<110);if(k>=0)S.td=ALL[k]}
 S.d+=(S.td-S.d)*.1;S.yaw+=(S.ty-S.yaw)*.08;S.pit+=(S.tp-S.pit)*.08;
 // Turn to face the painting you are stopped at
 let fw=0,fs=0;STOPS.forEach((s,i)=>{const w=Math.max(0,1-Math.abs(S.d-s)/150);if(w>fw){fw=w;fs=i%2?1:-1}});S.fy+=(fs*50*fw-S.fy)*.1;
 if(pending!==null&&!open&&Math.abs(S.d-STOPS[pending])<12){const i=pending;pending=null;pick(i)}
 const sc=innerWidth<innerHeight?Math.max(.7,Math.min(1.1,innerHeight/800)):Math.max(.5,Math.min(1.25,Math.min(innerWidth/900,innerHeight/640)));
 world.style.transform=`scale(${sc}) translateZ(750px) rotateX(${S.pit.toFixed(2)}deg) rotateY(${(S.yaw+S.fy).toFixed(2)}deg) translateZ(${S.d.toFixed(2)}px)`;
 arts.forEach((a,i)=>{a.classList.toggle("near",inRange(i));a.classList.toggle("focus",Math.abs(S.d-STOPS[i])<60)});
 door.classList.toggle("near",(!dark()||!unlocked)&&S.d>DOOR-200);
 requestAnimationFrame(tick)}
tick();
