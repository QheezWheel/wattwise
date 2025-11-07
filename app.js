// Minimal demo data model & UI logic for WattWise (WattLink campaign)

const $ = (id) => document.getElementById(id);
const nowYear = new Date().getFullYear();
$("year").textContent = nowYear;

// --- Demo data --------------------------------------------------------------
// Assumptions for savings calc
const AVG_KWH_YR = 10800; // household annual kWh (demo)

// Zip “profiles”. You can expand this list as needed.
const ZIP_DATA = {
  "43210": {
    city: "Columbus, OH",
    supplier: "AEP Energy",
    utility: "AEP Ohio",
    isAggregationMember: true,
    communityRate_cpkWh: 8.9,   // cents/kWh
    marketRate_cpkWh: 11.2,     // cents/kWh
    mix: { solar: 12, wind: 20, hydro: 3, nuclear: 10, gas: 35, coal: 18, other: 2 }
  },
  "44114": {
    city: "Cleveland, OH",
    supplier: "Energy Harbor",
    utility: "FirstEnergy (CEI)",
    isAggregationMember: true,
    communityRate_cpkWh: 8.2,
    marketRate_cpkWh: 12.0,
    mix: { solar: 10, wind: 24, hydro: 4, nuclear: 18, gas: 28, coal: 14, other: 2 }
  },
  "44308": {
    city: "Akron, OH",
    supplier: "Constellation NewEnergy",
    utility: "FirstEnergy (Ohio Edison)",
    isAggregationMember: false,
    communityRate_cpkWh: 10.8,
    marketRate_cpkWh: 11.3,
    mix: { solar: 8, wind: 14, hydro: 2, nuclear: 22, gas: 32, coal: 20, other: 2 }
  }
};

// Fallback profile if we don’t recognize the ZIP exactly
function makeFallback(zip) {
  const seed = Number(zip.slice(-2)) || 17;
  const ren = 25 + ((seed % 10) - 5); // ~20–30%
  const nuc = 12 + (seed % 5);        // ~12–16%
  const gas = 34 - (seed % 7);
  const coal = 22 - (seed % 6);
  const other = 100 - (ren + nuc + gas + coal);
  return {
    city: "Your Community",
    supplier: "Your Aggregation Supplier",
    utility: "Your Local Utility",
    isAggregationMember: seed % 2 === 0,
    communityRate_cpkWh: 9.6,
    marketRate_cpkWh: 11.4,
    mix: { solar: Math.max(6, ren * 0.4), wind: Math.max(8, ren * 0.6), hydro: 3, nuclear: nuc, gas, coal, other }
  };
}

// --- Helpers ----------------------------------------------------------------
function pct(n) { return `${n.toFixed(0)}%`; }
function money(n) { return `$${n.toLocaleString(undefined, {maximumFractionDigits:0})}`; }
function cpkWh(n){ return `${n.toFixed(1)}¢/kWh`; }

// Renewable vs Conventional split
function splitMix(mix){
  const renewable = (mix.solar||0)+(mix.wind||0)+(mix.hydro||0);
  const conventional = (mix.nuclear||0)+(mix.gas||0)+(mix.coal||0)+(mix.other||0);
  return { renewable, conventional };
}

// Estimate savings & CO2
function estimate(zipProfile){
  const delta_cents = zipProfile.marketRate_cpkWh - zipProfile.communityRate_cpkWh;
  const delta_dollars_per_kWh = delta_cents / 100;
  const annualSavings = Math.max(0, delta_dollars_per_kWh * AVG_KWH_YR);
  // Very rough demo CO2: assume 0.45 kg/kWh baseline reduced proportional to renewable share
  const { renewable } = splitMix(zipProfile.mix);
  const cleanFactor = Math.min(0.6, renewable/100 * 0.6); // cap influence for demo
  const avoided_tons = (AVG_KWH_YR * 0.45 * cleanFactor) / 1000; // tons CO2/yr per HH
  return { annualSavings, avoided_tons };
}

// --- UI paint ---------------------------------------------------------------
function paintLegend(mix){
  const legend = $("mixLegend");
  legend.innerHTML = "";
  const entries = Object.entries(mix);
  entries.forEach(([k,v])=>{
    const item = document.createElement("div");
    item.className = "legend-item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = colorFor(k);
    item.appendChild(sw);
    item.appendChild(document.createTextNode(`${labelFor(k)} ${pct(v)}`));
    legend.appendChild(item);
  });
}

function colorFor(key){
  switch(key){
    case "solar": return "#ffd166";
    case "wind": return "#6ee7ff";
    case "hydro": return "#7dd3fc";
    case "nuclear": return "#a78bfa";
    case "gas": return "#60a5fa";
    case "coal": return "#94a3b8";
    default: return "#cbd5e1";
  }
}
function labelFor(key){
  return ({
    solar: "Solar",
    wind: "Wind",
    hydro: "Hydro",
    nuclear: "Nuclear",
    gas: "Natural Gas",
    coal: "Coal",
    other: "Other"
  })[key] || key;
}

// simple bubbles
function paintMixViz(mix){
  const svg = $("mixViz");
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const entries = Object.entries(mix);
  const total = 100;
  const w = svg.viewBox.baseVal.width || svg.getAttribute("width");
  const h = svg.viewBox.baseVal.height || svg.getAttribute("height");
  let x = 30, y = 40;

  entries.forEach(([k,v],i)=>{
    const r = 8 + (v/100)*60; // size by %
    if (x + r > 400){ x = 30; y += 80; }
    const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
    circle.setAttribute("cx", x + r);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", colorFor(k));
    circle.setAttribute("opacity", "0.9");
    svg.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg","text");
    text.setAttribute("x", x + r);
    text.setAttribute("y", y + 4);
    text.setAttribute("text-anchor","middle");
    text.setAttribute("font-size","12");
    text.setAttribute("fill","#0b0d12");
    text.textContent = `${labelFor(k)} ${v}%`;
    svg.appendChild(text);

    x += r*2 + 18;
  });
}

// chain viz (main + mini)
function paintChain(count, targetId){
  const container = $(targetId);
  container.innerHTML = "";
  const n = Math.min(40, count);
  for (let i=0;i<n;i++){
    const node = document.createElement("div");
    node.className = "chain-node";
    node.textContent = i+1;
    container.appendChild(node);
  }
}

// sparkline stub
function paintSparkline(){
  const el = $("sparkline");
  el.innerHTML = "";
  // decorative only
}

// populate both phone and dashboard
function populateUI(zip, profile){
  const { renewable, conventional } = splitMix(profile.mix);
  const { annualSavings, avoided_tons } = estimate(profile);

  // Phone
  $("mockZip").textContent = zip;
  $("p_supplier").textContent = profile.supplier;
  $("p_status").textContent = profile.isAggregationMember ? "Aggregation Member" : "Not a Member";
  $("p_utility").textContent = profile.utility;
  $("p_cleanShare").textContent = pct(renewable);
  $("p_commRate").textContent = cpkWh(profile.communityRate_cpkWh);
  $("p_marketRate").textContent = cpkWh(profile.marketRate_cpkWh);
  $("p_hhSavings").textContent = money(annualSavings);

  paintLegend(profile.mix);
  paintMixViz(profile.mix);
  paintSparkline();

  // Stat line
  $("cleanShare").textContent = pct(renewable);
  $("savings").textContent = money(annualSavings);
  $("co2").textContent = `${avoided_tons.toFixed(1)} tons`;

  // Dashboard cards
  $("supplierName").textContent = profile.supplier;
  $("statusTag").textContent = profile.isAggregationMember ? "Aggregation Member" : "Not a Member";
  $("utilityName").textContent = profile.utility;

  $("mixRenewPct").textContent = pct(renewable);
  $("mixConvPct").textContent = pct(conventional);

  $("communityRate").textContent = cpkWh(profile.communityRate_cpkWh);
  $("marketRate").textContent = cpkWh(profile.marketRate_cpkWh);
  $("hhSavings").textContent = money(annualSavings);

  // Mini + main chain and collective impact (demo)
  const participants = 127 + (Number(zip.slice(-2)) || 0);
  const totalSavings = participants * annualSavings;
  const totalCO2 = participants * avoided_tons;

  $("impactParticipants").textContent = participants.toLocaleString();
  $("impactSavings").textContent = money(totalSavings);
  $("impactCO2").textContent = `${totalCO2.toFixed(0)} tons`;

  paintChain(participants, "chainMini");
  paintChain(participants, "chainViz");
}

// --- ZIP handling -----------------------------------------------------------
$("zipForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const zip = $("zip").value.trim();
  if (!/^\d{5}$/.test(zip)) return;

  const profile = ZIP_DATA[zip] || makeFallback(zip);
  populateUI(zip, profile);
});

// --- Share card (smaller area & 1080x1080) ---------------------------------
$("makeCard").addEventListener("click", ()=>{
  const zip = $("mockZip").textContent || "—";
  const supplier = $("p_supplier").textContent || "—";
  const clean = $("p_cleanShare").textContent || "—";
  const hh = $("p_hhSavings").textContent || "—";
  const canvas = $("cardCanvas");
  const ctx = canvas.getContext("2d");

  // Bg
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0,0,1080,1080);

  // Header
  ctx.fillStyle = "#e6ecff";
  ctx.font = "bold 56px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.fillText("WattWise • WattLink", 60, 110);

  // ZIP + supplier
  ctx.font = "bold 140px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.fillStyle = "#6ee7ff";
  ctx.fillText(zip, 60, 260);

  ctx.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.fillStyle = "#8891a7";
  ctx.fillText(`Supplier: ${supplier}`, 60, 320);

  // Clean share & savings
  ctx.fillStyle = "#e6ecff";
  ctx.font = "bold 80px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.fillText(`Clean Share: ${clean}`, 60, 440);

  ctx.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.fillStyle = "#52ffa8";
  ctx.fillText(`Savings/HH: ${hh}`, 60, 540);

  // Footer
  const today = new Date().toLocaleDateString();
  ctx.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.fillStyle = "#8891a7";
  ctx.fillText(`Generated ${today} • wattwise-theta.vercel.app`, 60, 980);

  // Download
  const link = $("downloadLink");
  link.href = canvas.toDataURL("image/png");
  link.download = `WattWise_${zip}.png`;
  link.classList.remove("hidden");
  canvas.classList.remove("hidden");
});

// also allow the “Generate share card” button in hero to scroll to card
$("shareBtn").addEventListener("click", ()=>{
  const el = $("makeCard");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
});

// seed initial chain/ui
populateUI("— — — — —", makeFallback("00000"));
