const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

function seededRandom(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }
function seededInt(seed, min, max) { return Math.floor(seededRandom(seed) * (max - min + 1)) + min; }
function seededFloat(seed, min, max) { return seededRandom(seed) * (max - min) + min; }
function pct(n){return `${n.toFixed(0)}%`; }
function money(n){return `$${n.toLocaleString(undefined,{maximumFractionDigits:0})}`;}
function cpkWh(n){return `${n.toFixed(1)}¢/kWh`; }

const SUPPLIERS=["AEP Energy","Energy Harbor","Dynegy","Constellation NewEnergy","NOPEC Standard","IGS Energy","CleanChoice Energy","SOPEC Cooperative"];
const UTILITIES=["AEP Ohio","FirstEnergy (Ohio Edison)","FirstEnergy (CEI)","Duke Energy Ohio","AES Ohio","Toledo Edison"];
const AVG_KWH_YR=10800;

function profileForZIP(zip){
  const seed=Number(zip)||43110;
  const supplier=SUPPLIERS[seededInt(seed,0,SUPPLIERS.length-1)];
  const utility=UTILITIES[seededInt(seed+1,0,UTILITIES.length-1)];
  const isAggregationMember=seededRandom(seed+2)>0.35;
  const communityRate=seededFloat(seed+3,8.0,10.0);
  const marketRate=communityRate+seededFloat(seed+4,0.6,2.0);
  const solar=seededInt(seed+5,8,16),wind=seededInt(seed+6,10,26),hydro=seededInt(seed+7,1,4),
  nuclear=seededInt(seed+8,10,20),gas=seededInt(seed+9,25,35);
  const coal=Math.max(5,100-(solar+wind+hydro+nuclear+gas)),other=1;
  const mix={solar,wind,hydro,nuclear,gas,coal,other};
  const renewable=solar+wind+hydro,conventional=100-renewable;
  const annualSavings=Math.max(0,(marketRate-communityRate)/100*AVG_KWH_YR);
  const avoided_tons=(AVG_KWH_YR*0.45*(renewable/100*0.6))/1000;
  const participants=100+seededInt(seed+10,0,900);
  return{zip,supplier,utility,isAggregationMember,communityRate,marketRate,mix,renewable,conventional,annualSavings,avoided_tons,participants};
}

function populateUI(zip,p){
  $("mockZip").textContent=zip;
  $("p_supplier").textContent=p.supplier;
  $("p_status").textContent=p.isAggregationMember?"Aggregation Member":"Not a Member";
  $("p_utility").textContent=p.utility;
  $("p_cleanShare").textContent=pct(p.renewable);
  $("p_commRate").textContent=cpkWh(p.communityRate);
  $("p_marketRate").textContent=cpkWh(p.marketRate);
  $("p_hhSavings").textContent=money(p.annualSavings);
  $("supplierName").textContent=p.supplier;
  $("statusTag").textContent=p.isAggregationMember?"Aggregation Member":"Not a Member";
  $("utilityName").textContent=p.utility;
  $("mixRenewPct").textContent=pct(p.renewable);
  $("mixConvPct").textContent=pct(p.conventional);
  $("communityRate").textContent=cpkWh(p.communityRate);
  $("marketRate").textContent=cpkWh(p.marketRate);
  $("hhSavings").textContent=money(p.annualSavings);
  $("cleanShare").textContent=pct(p.renewable);
  $("savings").textContent=money(p.annualSavings);
  $("co2").textContent=`${p.avoided_tons.toFixed(1)} tons`;
  $("impactParticipants").textContent=p.participants;
  $("impactSavings").textContent=money(p.participants*p.annualSavings);
  $("impactCO2").textContent=`${(p.participants*p.avoided_tons).toFixed(0)} tons`;
  paintMixViz(p.mix);
  paintChain(p.participants,"chainViz");
}

function paintChain(count,id){
  const el=$(id);el.innerHTML="";
  const n=Math.min(40,count,12);
  for(let i=1;i<=n;i++){const d=document.createElement("div");d.className="chain-node";d.textContent=i;el.appendChild(d);}
}
function colorFor(k){return{solar:"#ffd166",wind:"#6ee7ff",hydro:"#7dd3fc",nuclear:"#a78bfa",gas:"#60a5fa",coal:"#94a3b8",other:"#cbd5e1"}[k]||"#ccc";}
function paintMixViz(mix){
  const svg=$("mixViz");while(svg.firstChild)svg.removeChild(svg.firstChild);
  let x=30,y=40;
  Object.entries(mix).forEach(([k,v])=>{
    const r=8+(v/100)*60;if(x+r>400){x=30;y+=80;}
    const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx",x+r);c.setAttribute("cy",y);c.setAttribute("r",r);
    c.setAttribute("fill",colorFor(k));c.setAttribute("opacity","0.9");svg.appendChild(c);
    const t=document.createElementNS("http://www.w3.org/2000/svg","text");
    t.setAttribute("x",x+r);t.setAttribute("y",y+4);t.setAttribute("text-anchor","middle");
    t.setAttribute("font-size","12");t.setAttribute("fill","#0b0d12");
    t.textContent=`${k.charAt(0).toUpperCase()+k.slice(1)} ${v}%`;svg.appendChild(t);
    x+=r*2+18;
  });
}

$("zipForm").addEventListener("submit",(e)=>{
  e.preventDefault();
  const zip=$("zip").value.trim();
  if(!/^\d{5}$/.test(zip))return;
  populateUI(zip,profileForZIP(zip));
});

$("makeCard").addEventListener("click",()=>{
  const zip=$("mockZip").textContent||"—";
  const supplier=$("p_supplier").textContent||"—";
  const utility=$("p_utility").textContent||"—";
  const clean=$("p_cleanShare").textContent||"—";
  const comm=$("p_commRate").textContent||"—";
  const market=$("p_marketRate").textContent||"—";
  const hh=$("p_hhSavings").textContent||"—";
  const canvas=$("cardCanvas"),ctx=canvas.getContext("2d");
  ctx.fillStyle="#0b0d12";ctx.fillRect(0,0,1080,1080);
  ctx.fillStyle="#e6ecff";ctx.font="bold 56px system-ui";ctx.fillText("WattWise • WattLink",60,110);
  ctx.fillStyle="#6ee7ff";ctx.font="bold 120px system-ui";ctx.fillText(zip,60,240);
  ctx.fillStyle="#e6ecff";ctx.font="30px system-ui";
  ctx.fillText(`Supplier: ${supplier}`,60,320);
  ctx.fillText(`Utility: ${utility}`,60,370);
  ctx.fillText(`Clean Share: ${clean}`,60,420);
  ctx.fillText(`Rate: ${comm} / ${market}`,60,470);
  ctx.fillStyle="#52ffa8";ctx.fillText(`Savings/HH: ${hh}`,60,520);
  const today=new Date().toLocaleDateString();
  ctx.fillStyle="#8891a7";ctx.fillText(`Generated ${today} • wattwise-theta.vercel.app`,60,980);
  const link=$("downloadLink");
  link.href=canvas.toDataURL("image/png");
  link.download=`WattWise_${zip}.png`;
  link.classList.remove("hidden");
});

populateUI("00000",profileForZIP("00000"));
