// Gemeinsame Logik für App (Browser) und Server (Cloudflare Worker)
export const QUOTES=[
"Neuer Monat, neues Kapitel. Steve, schreib heute die erste Zeile.",
"Heute zählt nicht perfekt. Heute zählt: angefangen.",
"Gute Nächte machen gute Tage. Pflaster drauf, Mund zu, Kopf aus.",
"Wer frei atmet, denkt klarer. Nimm dir heute einen tiefen Atemzug, bevor du loslegst.",
"Dein Kalender gehört dir. Nicht den anderen.",
"Mach zuerst das, was du am liebsten verschieben würdest. Danach ist der Tag leicht.",
"Disziplin heißt nur: sich erinnern, was man wirklich will.",
"Heute wird nicht verhandelt. Heute wird gemacht.",
"Kleine Häkchen, große Wirkung. Hak heute ab, was du dir vorgenommen hast.",
"Pause ist kein Stillstand. Plan heute bewusst Zeit nur für dich ein.",
"Ein Training, das du machst, schlägt jedes perfekte, das du nur planst.",
"Du musst nicht motiviert sein, um anzufangen. Die Motivation kommt beim Machen.",
"Zähne putzen, Wasser trinken, rausgehen. Manche Siege sind leise.",
"AVANOR gibt es, weil du etwas besser machen wolltest. Mach heute dasselbe mit deinem Tag.",
"Halbzeit im Monat. Schau kurz zurück, was du geschafft hast, und leg eine Schippe drauf.",
"Erledigt ist besser als perfekt.",
"Du wachst nicht jeden Tag motiviert auf. Aber du wachst jeden Tag mit einer Wahl auf.",
"Weniger scrollen, mehr leben. Heute zählt, was du erlebst.",
"Wer seinen Tag plant, muss ihm nicht hinterherlaufen.",
"Sei heute der Grund, warum du morgen stolz auf dich bist.",
"Ruhig atmen, klar bleiben, weitermachen.",
"Der schwerste Schritt ist der von der Couch zur Tür. Danach läuft's.",
"Nicht jeder Tag ist gut. Aber in jedem steckt etwas Gutes. Such es dir.",
"Du hast schon härtere Tage geschafft als diesen.",
"Mach heute etwas, das dein Ich von morgen feiert.",
"Konstanz schlägt Talent. Jeden einzelnen Tag.",
"Freizeit ist kein Rest vom Tag, sondern Teil vom Plan. Block sie dir.",
"Fokus heißt auch Nein sagen. Zu allem, was heute nicht wichtig ist.",
"Bleib dran, Steve. Gerade dann, wenn's keiner sieht.",
"Der Monat ist fast durch. Zieh sauber durch bis zum Schluss.",
"Letzter Tag im Monat. Feier kurz, was gut lief, und morgen geht's weiter."
];
export const DEFAULT_IDEAS=["Spaziergang im Wald","Neues Café ausprobieren","Radtour","Buch im Park lesen","Freunde anrufen","Neues Rezept kochen","Schwimmen gehen","Museum besuchen","Kino","Sauna","Fotospaziergang","Brettspielabend","Flohmarkt","Sonnenuntergang anschauen","Bouldern","Picknick","Podcast beim Gehen","Tagebuch schreiben","Ausflug in eine Nachbarstadt","Ausschlafen ohne Wecker"];
export const WD=["Mo","Di","Mi","Do","Fr","Sa","So"];
export const KIND={termin:"Termin",arbeit:"Arbeit",aufgabe:"Aufgabe",frei:"Freizeit",training:"Training"};
export const ALL_KINDS=["termin","arbeit","aufgabe","training","frei"];
export const SUPPLY_DEF={strips:"Nasenpflaster",tape:"Mundtapes"};
export const WARN_DAYS=7, PER_NIGHT=1;

export const pad=n=>String(n).padStart(2,"0");
export const ds=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parse=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
export const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ds(d)};
export const diffDays=(a,b)=>{const A=parse(a),B=parse(b);return Math.round((Date.UTC(B.getFullYear(),B.getMonth(),B.getDate())-Date.UTC(A.getFullYear(),A.getMonth(),A.getDate()))/864e5)};
export const wday=s=>(parse(s).getDay()+6)%7+1;
export const toMin=t=>{const[h,m]=t.split(":").map(Number);return h*60+(m||0)};
export const hm=n=>`${pad(Math.floor(n/60)%24)}:${pad(n%60)}`;
export const dur=n=>`${Math.floor(n/60)} Std.${n%60?" "+(n%60)+" Min.":""}`;
export const mkey=s=>"m-"+s.slice(0,7);
// Zeitspanne eines Eintrags; ohne Ende 30 Min., über Mitternacht bis 24 Uhr
export function span(i){const a=toMin(i.start);let b=i.end?toMin(i.end):a+30;if(b<=a)b=i.end?1440:a+30;b=Math.min(b,1440);return{a,b,len:b-a}}

// get(id, fallback) liefert ein Dokument (im Browser eine Kopie), today() das heutige Datum
export function model(get,today){
  const month=s=>get(mkey(s),{items:{},done:{}});
  const templates=()=>get("templates",{list:[]}).list;
  const plan=()=>get("training",{plan:[]}).plan;
  const ideas=()=>get("ideas",{list:DEFAULT_IDEAS}).list;
  const supply=()=>get("supply",{items:{}});
  function settings(){const s=get("settings",{});return{
    morning:Object.assign({on:true,time:"08:30"},s.morning),
    remind:Object.assign({on:true,before:5,kinds:ALL_KINDS},s.remind),
    work:Object.assign({on:true,before:20},s.work)}}
  function itemsOn(s){return Object.values(month(s).items||{}).filter(i=>i.date===s).sort((a,b)=>(a.start||"99").localeCompare(b.start||"99"))}
  function routinesOn(s){const w=wday(s);return templates().filter(t=>t.active!==false&&(t.repeat==="daily"||(t.repeat==="weekly"&&(t.days||[]).includes(w))))}
  function planOn(s){const w=wday(s);return plan().filter(p=>(p.days||[]).includes(w))}
  function isDone(s,id){const d=month(s).done||{};return !!(d[s]&&d[s][id])}
  function taskCount(s){const r=routinesOn(s),o=itemsOn(s).filter(i=>i.kind==="aufgabe");return{total:r.length+o.length,done:r.filter(t=>isDone(s,t.id)).length+o.filter(i=>i.done).length}}
  function trainedOn(s){return planOn(s).some(p=>isDone(s,p.id))||itemsOn(s).some(i=>i.kind==="training")}
  function supplyState(it,ref=today()){
    const used=Math.max(0,diffDays(it.asOf,ref))*PER_NIGHT;
    const left=Math.max(0,it.count-used);const nights=Math.floor(left/PER_NIGHT);
    return{left,nights,runOut:addDays(ref,nights),warn:nights<=WARN_DAYS&&!it.ordered,ordered:!!it.ordered&&nights<=WARN_DAYS};
  }
  function supplyAlerts(ref=today()){const s=supply();return Object.entries(s.items).map(([k,it])=>({k,it,st:supplyState(it,ref)})).filter(x=>x.st.warn)}
  // Alles mit Uhrzeit an einem Tag: Einträge (ohne erledigte Aufgaben) und offene Vorlagen-Aufgaben
  function timed(s){const out=[];
    itemsOn(s).filter(i=>i.start&&!(i.kind==="aufgabe"&&i.done)).forEach(i=>{const{a,b}=span(i);out.push({s,a,b,id:i.id,title:i.title,kind:i.kind,end:i.end})});
    routinesOn(s).filter(t=>t.time&&!isDone(s,t.id)).forEach(t=>{const a=toMin(t.time);out.push({s,a,b:a+30,id:t.id,title:t.title,kind:"aufgabe",routine:true})});
    return out.sort((x,y)=>x.a-y.a)}
  // Alle Mitteilungen eines Tages; min = Minute des Tages (kann vor 0 liegen)
  function notificationsFor(s){
    const st=settings(), out=[], mt=toMin(st.morning.time||"08:30");
    if(st.morning.on)out.push({key:"morning-"+s,min:mt,title:"Guten Morgen, Steve!",body:QUOTES[parse(s).getDate()-1],btn:"Danke!",until:mt+240});
    supplyAlerts(s).forEach(({k,it,st:x})=>out.push({key:`supply-${k}-${s}`,min:mt+1,title:`Ey, du musst ${it.label} nachbestellen!`,
      body:x.nights===0?"Du hast keine mehr übrig.":`Noch ${x.left} Stück. Tippe in der App auf „Hab ich bestellt“, dann ist Ruhe.`,btn:"Okay",until:mt+240}));
    const t=timed(s);
    if(st.remind.on)t.filter(x=>st.remind.kinds.includes(x.kind)).forEach(x=>out.push({key:`r-${s}-${x.a}-${x.id}`,min:x.a-st.remind.before,
      title:st.remind.before?`In ${st.remind.before} Min.: ${x.title}`:`Jetzt: ${x.title}`,body:"Gleich geht's los. Bist du bereit?",btn:"Bereit!",until:x.a+1}));
    if(st.work.on)t.filter(x=>x.kind==="arbeit").forEach(x=>out.push({key:`w-${s}-${x.a}-${x.id}`,min:x.a-st.work.before,
      title:"Zeit, zur Arbeit loszufahren!",body:`Arbeitsbeginn um ${hm(x.a)}. Bist du ready?`,btn:"Bin unterwegs!",until:x.a}));
    return out.sort((x,y)=>x.min-y.min);
  }
  return{month,templates,plan,ideas,supply,settings,itemsOn,routinesOn,planOn,isDone,taskCount,trainedOn,supplyState,supplyAlerts,timed,notificationsFor};
}
