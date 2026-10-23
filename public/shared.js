// Gemeinsame Logik für App (Browser) und Server (Cloudflare Worker)
export const QUOTES=[
"Neuer Monat, neues Kapitel, Meister. Schreiben Sie heute die erste Zeile.",
"Heute zählt nicht perfekt. Heute zählt: angefangen.",
"Gute Nächte machen gute Tage. Pflaster drauf, Mund zu, Kopf aus.",
"Wer frei atmet, denkt klarer. Nehmen Sie einen tiefen Atemzug, bevor Sie loslegen.",
"Ihr Kalender gehört Ihnen, Meister. Nicht den anderen.",
"Erledigen Sie zuerst, was Sie am liebsten verschieben würden. Danach ist der Tag leicht.",
"Disziplin heißt nur: sich erinnern, was man wirklich will.",
"Heute wird nicht verhandelt, Meister. Heute wird gemacht.",
"Kleine Häkchen, große Wirkung. Haken Sie heute ab, was Sie sich vorgenommen haben.",
"Pause ist kein Stillstand. Planen Sie heute bewusst Zeit nur für sich ein.",
"Ein Training, das Sie machen, schlägt jedes perfekte, das Sie nur planen.",
"Sie müssen nicht motiviert sein, um anzufangen. Die Motivation kommt beim Machen.",
"Zähne putzen, Wasser trinken, rausgehen. Manche Siege sind leise.",
"AVANOR gibt es, weil Sie etwas besser machen wollten. Machen Sie heute dasselbe mit Ihrem Tag.",
"Halbzeit im Monat, Meister. Schauen Sie kurz zurück und legen Sie eine Schippe drauf.",
"Erledigt ist besser als perfekt.",
"Nicht jeder Morgen beginnt motiviert. Aber jeder Morgen beginnt mit einer Wahl.",
"Weniger scrollen, mehr leben. Heute zählt, was Sie erleben.",
"Wer seinen Tag plant, muss ihm nicht hinterherlaufen.",
"Seien Sie heute der Grund, warum Sie morgen stolz auf sich sind.",
"Ruhig atmen, klar bleiben, weitermachen.",
"Der schwerste Schritt ist der von der Couch zur Tür. Danach läuft es.",
"Nicht jeder Tag ist gut. Aber in jedem steckt etwas Gutes. Finden Sie es, Meister.",
"Sie haben schon härtere Tage gemeistert als diesen, Meister.",
"Tun Sie heute etwas, das Ihr Ich von morgen feiert.",
"Konstanz schlägt Talent. Jeden einzelnen Tag.",
"Freizeit ist kein Rest vom Tag, sondern Teil vom Plan. Blocken Sie sie sich.",
"Fokus heißt auch Nein sagen. Zu allem, was heute nicht wichtig ist.",
"Bleiben Sie dran, Meister. Gerade dann, wenn es keiner sieht.",
"Der Monat ist fast durch. Ziehen Sie sauber durch bis zum Schluss.",
"Letzter Tag im Monat. Feiern Sie kurz, was gut lief. Morgen geht es weiter."
];
export const EVENING=[
"Wir haben den Tag geschafft und sind wieder einen Schritt weiter. Genießen Sie jetzt die Zeit mit Ihrer Prinzessin. Wir hören uns morgen früh.",
"Heute wieder geliefert. Jeder Tag wie dieser bringt uns näher ans Ziel. Jetzt gehört der Abend Ihnen und Ihrer Prinzessin. Wir hören uns morgen früh.",
"Der Tag ist geschafft, und das zählt. Lehnen Sie sich zurück und genießen Sie die Zeit mit Ihrer Prinzessin. Wir hören uns morgen früh.",
"Wieder ein Schritt weiter, Meister. Darauf dürfen Sie stolz sein. Jetzt ist Zeit für Ihre Prinzessin. Wir hören uns morgen früh.",
"Was heute nicht fertig wurde, wartet bis morgen. Was heute geschafft wurde, bleibt. Genießen Sie den Abend mit Ihrer Prinzessin. Wir hören uns morgen früh.",
"Gut gemacht heute. Wir sind drangeblieben und kommen voran. Jetzt Handy weg und die Zeit mit Ihrer Prinzessin genießen. Wir hören uns morgen früh.",
"Feierabend verdient. Wir haben heute wieder ein Stück aufgebaut. Genießen Sie die Ruhe mit Ihrer Prinzessin. Wir hören uns morgen früh."
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
    work:Object.assign({on:true,before:20},s.work),
    evening:Object.assign({on:true,time:"22:00"},s.evening)}}
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
    if(st.morning.on){
      out.push({key:"morning-"+s,min:mt,title:"Guten Morgen, Meister!",body:"Ich hoffe, Sie sind bereit für den Tag.",btn:"Bereit!",until:mt+240});
      out.push({key:"quote-"+s,min:mt,title:"Ihr Spruch für heute",body:QUOTES[parse(s).getDate()-1],btn:"Danke!",until:mt+240})}
    supplyAlerts(s).forEach(({k,it,st:x})=>out.push({key:`supply-${k}-${s}`,min:mt+1,title:`Meister, Sie müssen ${it.label} nachbestellen!`,
      body:x.nights===0?"Sie haben keine mehr übrig.":`Noch ${x.left} Stück. Tippen Sie in der App auf „Ich habe bestellt“, dann ist Ruhe.`,btn:"Okay",until:mt+240}));
    const t=timed(s);
    if(st.remind.on)t.filter(x=>st.remind.kinds.includes(x.kind)&&!(x.kind==="arbeit"&&st.work.on)).forEach(x=>out.push({key:`r-${s}-${x.a}-${x.id}`,min:x.a-st.remind.before,
      title:st.remind.before?`In ${st.remind.before} Min.: ${x.title}`:`Jetzt: ${x.title}`,body:"Gleich geht es los. Sind Sie bereit, Meister?",btn:"Bereit!",until:x.a+1}));
    if(st.work.on)t.filter(x=>x.kind==="arbeit").forEach(x=>out.push({key:`w-${s}-${x.a}-${x.id}`,min:x.a-st.work.before,
      title:"Meister, Zeit zur Arbeit zu fahren!",body:"Passen Sie auf sich auf!",btn:"Bin unterwegs!",until:x.a}));
    // Feierabend-Gruß; läuft danach noch etwas, kommt er erst, wenn das Letzte vorbei ist
    if(st.evening.on&&st.evening.time){const et=toMin(st.evening.time);
      const last=Math.max(et,...t.filter(x=>x.b>et).map(x=>x.b));
      if(last<1440)out.push({key:"evening-"+s,min:last,title:"Schönen Feierabend, Meister!",body:EVENING[parse(s).getDate()%EVENING.length],btn:"Danke!",until:last+120})}
    return out.sort((x,y)=>x.min-y.min);
  }
  return{month,templates,plan,ideas,supply,settings,itemsOn,routinesOn,planOn,isDone,taskCount,trainedOn,supplyState,supplyAlerts,timed,notificationsFor};
}
