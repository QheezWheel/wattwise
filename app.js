// WattWise (WattLink campaign) — Ohio realistic seeded demo data

const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

// ---------------- Seeded random helper ----------------
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromZip(zip) {
  return zip.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7) >>> 0;
}

// ---------------- Constants ----------------
const AVG_KWH_YR = 10800;
const SUPPLIERS = ["AEP Energy", "Energy Harbor", "Constellation NewEnergy", "Dynegy", "IGS Energy", "NOPEC Aggregate"];
const UTILITIES = ["AEP Ohio", "FirstEnergy (CEI)", "FirstEnergy (Ohio Edison)", "AES Ohio", "Duke Energy Ohio"];

// ---------------- Data generator ----------------
function profileForZip(zip) {
  const rand = mulberry32(seedFromZip(zip));

  const supplier = SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)];
  const utility = UTILITIES[Math.floor(rand() * UTILITIES.length)];
  const isAggregationMember = rand() < 0.7;

  // Rates realistic for Ohio
  const commRate = 7.5 + rand() * 2;    // 7.5–9.5¢
  const marketRate = 9.5 + rand() * 3;  // 9.5–12.5¢

  // Renewable share 20–35%
  const renewable = 20 + rand() * 15;
  const nuclear = 12 + rand() * 8;
  const gas = 35 - rand() * 8;
  const coal = 25 - rand() * 10;
  const hydro = 2 + rand() * 3;
  const solar = renewable * 0.45;
  const wind = renewable * 0.55;
  const other = 100 - (solar + wind + hydro + nuclear + gas + coal);

  return {
    supplier,
    utility,
    isAggregationMember,
    communityRate_cpkWh: commRate,
    marketRate_cpkWh: marketRate,
    mix: { solar, wind, hydro, nuclear, gas, coal, other }
  };
}

// ---------------- Math helpers ----------------
const pct = (n) => `${n.toFixed(0)}%`;
const money = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const cpkWh = (n) => `${n.toFixed(1)}¢/kWh`;

function splitMix(mix) {
  const renewable = (mix.solar || 0) + (mix.wind || 0) + (mix.hydro || 0);
  const conventional = 100 - renewable;
  return { renewable, conventional };
}

function estimate(profile) {
  const delta_cents = profile.marketRate_cpkWh - profile.communityRate_cpkWh;
  const annualSavings = Math.max(0, (delta_cents / 100) * AVG_KWH_YR);
  const { renewable } = splitMix(profile.mix);
  const avoided_tons = (AVG_KWH_YR * 0.45 * (renewable / 100) * 0.6) / 1000;
  return { annualSavings, avoided_tons };
}

// ---------------- Visualization helpers ----------------
function colorFor(k) {
  return {
    solar: "#ffd166",
    wind: "#6ee7ff",
    hydro: "#7dd3fc",
    nuclear: "#a78bfa",
    gas: "#60a5fa",
    coal: "#94a3b8",
    other: "#cbd5e1"
  }[k] || "#ccc";
}
function labelFor(k) {
  return {
    solar: "Solar", wind: "Wind", hydro: "Hydro",
    nuclear: "Nuclear", gas: "Natural Gas",
    coal: "Coal", other: "Other"
  }[k] || k;
}

function paintLegend(mix) {
  const legend = $("mixLegend");
  legend.innerHTML = "";
  Object.entries(mix).forEach(([k, v]) => {
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

function paintMixViz(mix) {
  const svg = $("mixViz");
  svg.innerHTML = "";
  let x = 30, y = 40;
  for (const [k, v] of Object.entries(mix)) {
    const r = 8 + (v / 100) * 60;
    if (x + r > 400) { x = 30; y += 80; }
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", x + r);
    c.setAttribute("cy", y);
    c.setAttribute("r", r);
    c.setAttribute("fill", colorFor(k));
    c.setAttribute("opacity", "0.9");
    svg.appendChild(c);

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x + r);
    t.setAttribute("y", y + 4);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", "12");
    t.setAttribute("fill", "#0b0d12");
    t.textContent = `${labelFor(k)} ${v.toFixed(0)}%`;
    svg.appendChild(t);
    x += r * 2 + 18;
  }
}

function paintChain(count, id) {
  const container = $(id);
  container.innerHTML = "";
  const n = Math.min(40, count);
  for (let i = 0; i < n; i++) {
    const node = document.createElement("div");
    node.className = "chain-node";
    node.textContent = i + 1;
    container.appendChild(node);
  }
}

// ---------------- UI population ----------------
function populateUI(zip, profile) {
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

  // Chart + legend
  paintLegend(profile.mix);
  paintMixViz(profile.mix);

  // Summary line
  $("cleanShare").textContent = pct(renewable);
  $("savings").textContent = money(annualSavings);
  $("co2").textContent = `${avoided_tons.toFixed(1)} tons`;

  // Dashboard
  $("supplierName").textContent = profile.supplier;
  $("statusTag").textContent = profile.isAggregationMember ? "Aggregation Member" : "Not a Member";
  $("utilityName").textContent = profile.utility;
  $("mixRenewPct").textContent = pct(renewable);
  $("mixConvPct").textContent = pct(conventional);
  $("communityRate").textContent = cpkWh(profile.communityRate_cpkWh);
  $("marketRate").textContent = cpkWh(profile.marketRate_cpkWh);
  $("hhSavings").textContent = money(annualSavings);

  // Collective impact
  const participants = 100 + Math.floor(seedFromZip(zip) % 100);
  const totalSavings = participants * annualSavings;
  const totalCO2 = participants * avoided_tons;
  $("impactParticipants").textContent = participants.toLocaleString();
  $("impactSavings").textContent = money(totalSavings);
  $("impactCO2").textContent = `${totalCO2.toFixed(0)} tons`;

  paintChain(participants, "chainMini");
  paintChain(participants, "chainViz");
}

// ---------------- Events ----------------
$("zipForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const zip = $("zip").value.trim();
  if (!/^\d{5}$/.test(zip)) return;
  const profile = profileForZip(zip);
  populateUI(zip, profile);
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

$("shareBtn").addEventListener("click", () => {
  $("makeCard").scrollIntoView({ behavior: "smooth", block: "center" });
});

// Initialize default display
populateUI("43210", profileForZip("43210"));

