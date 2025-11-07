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
function paintMiniChain(count, id) {
  const el = $(id);
  el.innerHTML = "";
  const n = Math.min(count, 12);
  for (let i = 1; i <= n; i++) {
    const d = document.createElement("div");
    d.className = "chain-node";
    d.textContent = i;
    el.appendChild(d);
  }
}

function paintFullChain(count, id) {
  const el = $(id);
  el.innerHTML = "";
  const n = Math.min(count, 40);
  for (let i = 1; i <= n; i++) {
    const d = document.createElement("div");
    d.className = "chain-node";
    d.textContent = i;
    el.appendChild(d);
  }
}

// --------- main UI population updates ----------
function populateUI(zip, p) {
  $("mockZip").textContent = zip;
  $("p_supplier").textContent = p.supplier;
  $("p_status").textContent = p.isAggregationMember ? "Aggregation Member" : "Not a Member";
  $("p_utility").textContent = p.utility;
  $("p_cleanShare").textContent = pct(p.renewable);
  $("p_commRate").textContent = cpkWh(p.communityRate);
  $("p_marketRate").textContent = cpkWh(p.marketRate);
  $("p_hhSavings").textContent = money(p.annualSavings);

  $("supplierName").textContent = p.supplier;
  $("statusTag").textContent = p.isAggregationMember ? "Aggregation Member" : "Not a Member";
  $("utilityName").textContent = p.utility;
  $("mixRenewPct").textContent = pct(p.renewable);
  $("mixConvPct").textContent = pct(p.conventional);
  $("communityRate").textContent = cpkWh(p.communityRate);
  $("marketRate").textContent = cpkWh(p.marketRate);
  $("hhSavings").textContent = money(p.annualSavings);

  $("cleanShare").textContent = pct(p.renewable);
  $("savings").textContent = money(p.annualSavings);
  $("co2").textContent = `${p.avoided_tons.toFixed(1)} tons`;

  $("impactParticipants").textContent = p.participants;
  $("impactSavings").textContent = money(p.participants * p.annualSavings);
  $("impactCO2").textContent = `${(p.participants * p.avoided_tons).toFixed(0)} tons`;

  paintMixViz(p.mix);
  paintMiniChain(p.participants, "chainMini");   // optional: if you have a small chain placeholder
  paintFullChain(p.participants, "chainViz");    // full 40-node community chain
}
