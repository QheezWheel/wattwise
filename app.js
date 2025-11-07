// WattWise — WattLink campaign demo (Ohio realistic data, seeded random per ZIP)
const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

// --- helpers -----------------------------------------------------------
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function seededInt(seed, min, max) {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}
function seededFloat(seed, min, max) {
  return seededRandom(seed) * (max - min) + min;
}
function pct(n) { return `${n.toFixed(0)}%`; }
function money(n) { return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }
function cpkWh(n) { return `${n.toFixed(1)}¢/kWh`; }

// --- data pools -------------------------------------------------------
const SUPPLIERS = [
  "AEP Energy", "Energy Harbor", "Dynegy", "Constellation NewEnergy",
  "NOPEC Standard", "IGS Energy", "CleanChoice Energy", "SOPEC Cooperative"
];
const UTILITIES = [
  "AEP Ohio", "FirstEnergy (Ohio Edison)", "FirstEnergy (CEI)",
  "Duke Energy Ohio", "AES Ohio", "Toledo Edison"
];
const AVG_KWH_YR = 10800;

// --- core generation ---------------------------------------------------
function profileForZIP(zip) {
  const seed = Number(zip) || 43110;
  const sr = (off) => seededRandom(seed + off);

  // Supplier & Utility
  const supplier = SUPPLIERS[seededInt(seed + 10, 0, SUPPLIERS.length - 1)];
  const utility = UTILITIES[seededInt(seed + 20, 0, UTILITIES.length - 1)];
  const isAggregationMember = sr(30) > 0.35; // ~65% in Ohio are members

  // Rates (Ohio realistic: 8–12¢/kWh)
  const communityRate = seededFloat(seed + 40, 8.0, 10.0);
  const marketRate = communityRate + seededFloat(seed + 50, 0.6, 2.0);

  // Energy mix
  const solar = seededInt(seed + 60, 8, 16);
  const wind = seededInt(seed + 70, 10, 26);
  const hydro = seededInt(seed + 80, 1, 4);
  const nuclear = seededInt(seed + 90, 10, 20);
  const gas = seededInt(seed + 100, 25, 35);
  const coal = Math.max(5, 100 - (solar + wind + hydro + nuclear + gas));
  const other = Math.max(1, 100 - (solar + wind + hydro + nuclear + gas + coal));

  const mix = { solar, wind, hydro, nuclear, gas, coal, other };
  const { renewable, conventional } = splitMix(mix);

  // Derived metrics
  const delta_cents = marketRate - communityRate;
  const delta_dollars = delta_cents / 100;
  const annualSavings = Math.max(0, delta_dollars * AVG_KWH_YR);
  const cleanFactor = Math.min(0.6, renewable / 100 * 0.6);
  const avoided_tons = (AVG_KWH_YR * 0.45 * cleanFactor) / 1000;

  // Collective community impact (simulate scaling by ZIP seed)
  const participants = 100 + seededInt(seed + 110, 0, 900);
  const totalSavings = participants * annualSavings;
  const totalCO2 = participants * avoided_tons;

  return {
    zip,
    supplier,
    utility,
    isAggregationMember,
    communityRate,
    marketRate,
    mix,
    renewable,
    conventional,
    annualSavings,
    avoided_tons,
    participants,
    totalSavings,
    totalCO2
  };
}

// --- calculations reused ------------------------------------------------
function splitMix(mix) {
  const renewable = (mix.solar || 0) + (mix.wind || 0) + (mix.hydro || 0);
  const conventional =
    (mix.nuclear || 0) + (mix.gas || 0) + (mix.coal || 0) + (mix.other || 0);
  return { renewable, conventional };
}
function colorFor(key) {
  switch (key) {
    case "solar": return "#ffd166";
    case "wind": return "#6ee7ff";
    case "hydro": return "#7dd3fc";
    case "nuclear": return "#a78bfa";
    case "gas": return "#60a5fa";
    case "coal": return "#94a3b8";
    default: return "#cbd5e1";
  }
}
function labelFor(key) {
  return {
    solar: "Solar",
    wind: "Wind",
    hydro: "Hydro",
    nuclear: "Nuclear",
    gas: "Natural Gas",
    coal: "Coal",
    other: "Other",
  }[key] || key;
}

// --- UI painters --------------------------------------------------------
function paintLegend(mix) {
  const legend = $("mixLegend");
  legend.innerHTML = "";
  for (const [k, v] of Object.entries(mix)) {
    const item = document.createElement("div");
    item.className = "legend-item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = colorFor(k);
    item.appendChild(sw);
    item.appendChild(document.createTextNode(`${labelFor(k)} ${pct(v)}`));
    legend.appendChild(item);
  }
}
function paintMixViz(mix) {
  const svg = $("mixViz");
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const entries = Object.entries(mix);
  let x = 30, y = 40;
  entries.forEach(([k, v]) => {
    const r = 8 + (v / 100) * 60;
    if (x + r > 400) { x = 30; y += 80; }
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x + r);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", colorFor(k));
    circle.setAttribute("opacity", "0.9");
    svg.appendChild(circle);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x + r);
    text.setAttribute("y", y + 4);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "12");
    text.setAttribute("fill", "#0b0d12");
    text.textContent = `${labelFor(k)} ${v}%`;
    svg.appendChild(text);
    x += r * 2 + 18;
  });
}
function paintChain(count, targetId) {
  const container = $(targetId);
  container.innerHTML = "";
  const n = Math.min(40, count);
  for (let i = 0; i < n; i++) {
    const node = document.createElement("div");
    node.className = "chain-node";
    node.textContent = i + 1;
    container.appendChild(node);
  }
}

// --- UI populate --------------------------------------------------------
function populateUI(zip, p) {
  // phone card
  $("mockZip").textContent = zip;
  $("p_supplier").textContent = p.supplier;
  $("p_status").textContent = p.isAggregationMember ? "Aggregation Member" : "Not a Member";
  $("p_utility").textContent = p.utility;
  $("p_cleanShare").textContent = pct(p.renewable);
  $("p_commRate").textContent = cpkWh(p.communityRate);
  $("p_marketRate").textContent = cpkWh(p.marketRate);
  $("p_hhSavings").textContent = money(p.annualSavings);

  paintLegend(p.mix);
  paintMixViz(p.mix);

  // statline
  $("cleanShare").textContent = pct(p.renewable);
  $("savings").textContent = money(p.annualSavings);
  $("co2").textContent = `${p.avoided_tons.toFixed(1)} tons`;

  // dashboard cards
  $("supplierName").textContent = p.supplier;
  $("statusTag").textContent = p.isAggregationMember ? "Aggregation Member" : "Not a Member";
  $("utilityName").textContent = p.utility;
  $("mixRenewPct").textContent = pct(p.renewable);
  $("mixConvPct").textContent = pct(p.conventional);
  $("communityRate").textContent = cpkWh(p.communityRate);
  $("marketRate").textContent = cpkWh(p.marketRate);
  $("hhSavings").textContent = money(p.annualSavings);
  $("impactParticipants").textContent = p.participants.toLocaleString();
  $("impactSavings").textContent = money(p.totalSavings);
  $("impactCO2").textContent = `${p.totalCO2.toFixed(0)} tons`;

  paintChain(p.participants, "chainMini");
  paintChain(p.participants, "chainViz");
}

// --- events -------------------------------------------------------------
$("zipForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const zip = $("zip").value.trim();
  if (!/^\d{5}$/.test(zip)) return;
  const p = profileForZIP(zip);
  populateUI(zip, p);
});

$("shareBtn").addEventListener("click", () => {
  $("makeCard").scrollIntoView({ behavior: "smooth", block: "center" });
});

$("makeCard").addEventListener("click", () => {
  const zip = $("mockZip").textContent || "—";
  const supplier = $("p_supplier").textContent || "—";
  const clean = $("p_cleanShare").textContent || "—";
  const hh = $("p_hhSavings").textContent || "—";
  const canvas = $("cardCanvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = "#e6ecff";
  ctx.font = "bold 56px system-ui";
  ctx.fillText("WattWise • WattLink", 60, 110);
  ctx.font = "bold 140px system-ui";
  ctx.fillStyle = "#6ee7ff";
  ctx.fillText(zip, 60, 260);
  ctx.font = "28px system-ui";
  ctx.fillStyle = "#8891a7";
  ctx.fillText(`Supplier: ${supplier}`, 60, 320);
  ctx.fillStyle = "#e6ecff";
  ctx.font = "bold 80px system-ui";
  ctx.fillText(`Clean Share: ${clean}`, 60, 440);
  ctx.font = "bold 64px system-ui";
  ctx.fillStyle = "#52ffa8";
  ctx.fillText(`Savings/HH: ${hh}`, 60, 540);
  const today = new Date().toLocaleDateString();
  ctx.font = "28px system-ui";
  ctx.fillStyle = "#8891a7";
  ctx.fillText(`Generated ${today} • wattwise-theta.vercel.app`, 60, 980);
  const link = $("downloadLink");
  link.href = canvas.toDataURL("image/png");
  link.download = `WattWise_${zip}.png`;
  link.classList.remove("hidden");
  canvas.classList.remove("hidden");
});

// seed default
populateUI("00000", profileForZIP("00000"));


