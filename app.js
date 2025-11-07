(function(){
  const mixViz = document.getElementById('mixViz');
  const mockZipEl = document.getElementById('mockZip');
  const zipForm = document.getElementById('zipForm');
  const zipInput = document.getElementById('zip');

  // Snapshot fields
  const supplierEl = document.getElementById('supplier');
  const statusEl = document.getElementById('status');
  const utilityEl = document.getElementById('utility');
  const mixRenewEl = document.getElementById('mixRenew');
  const mixConvEl = document.getElementById('mixConv');
  const commRateEl = document.getElementById('commRate');
  const mktRateEl = document.getElementById('mktRate');
  const savingsHHEl = document.getElementById('savingsHH');
  const collectiveSavingsEl = document.getElementById('collectiveSavings');
  const collectiveCO2El = document.getElementById('collectiveCO2');

  // Mini fields (phone preview)
  const miniSupplier = document.getElementById('miniSupplier');
  const miniStatus = document.getElementById('miniStatus');
  const miniUtility = document.getElementById('miniUtility');

  // Viz stats
  const cleanShareEl = document.getElementById('cleanShare');
  const renewOnlyEl = document.getElementById('renewOnly');
  const co2HH = document.getElementById('co2HH');

  const chainViz = document.getElementById('chainViz');
  const makeCardBtn = document.getElementById('makeCard');
  const shareBtn = document.getElementById('shareBtn');
  const cardCanvas = document.getElementById('cardCanvas');
  const downloadLink = document.getElementById('downloadLink');
  const yearEl = document.getElementById('year');
  yearEl.textContent = new Date().getFullYear();

  const COLORS = {
    solar: '#ffd166',
    wind: '#6ee7ff',
    hydro: '#7bd3ff',
    nuclear: '#c7b8ff',
    gas: '#ffb4b4',
    coal: '#ff6b6b',
    other: '#a0aec0'
  };

  function seededRandom(seed){
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // --- Data models (demo approximations) ---
  function getUtilityForZip(zip){
    const z = parseInt(zip.slice(0,1)) || 4;
    if([4,5].includes(z)) return "AEP Ohio";
    if([6,7].includes(z)) return "FirstEnergy (Illuminating Company)";
    if(z === 8) return "AES Ohio (Dayton Power & Light)";
    return "Duke Energy Ohio";
  }

  function getSupplierForZip(zip){
    // 60% chance community uses an aggregator (NOPEC-like), else default retail supplier
    const r = seededRandom(parseInt(zip)||10);
    return r > 0.4 ? "NOPEC (Community Aggregation)" : "Default Retail Supplier";
  }

  function isAggregationMember(zip){
    // membership true if supplier indicates aggregator OR seeded toggle
    const sup = getSupplierForZip(zip);
    if(sup.includes("NOPEC")) return true;
    return seededRandom(parseInt(zip)+3) > 0.7;
  }

  function getMixForZip(zip){
    let n = parseInt(zip.slice(-2)) || 37;
    let s = 15 + Math.floor(seededRandom(n) * 25);  // solar
    let w = 10 + Math.floor(seededRandom(n+1) * 25); // wind
    let h = 2 + Math.floor(seededRandom(n+2) * 6);   // hydro
    let nu = 10 + Math.floor(seededRandom(n+3) * 25); // nuclear (low-carbon but conventional here)
    let fossil = 100 - (s+w+h+nu);
    let gas = Math.max(0, Math.round(fossil * .7));
    let coal = Math.max(0, fossil - gas);
    const mix = { solar:s, wind:w, hydro:h, nuclear:nu, gas, coal };
    const total = Object.values(mix).reduce((a,b)=>a+b,0);
    const factor = 100/total;
    for(const k in mix) mix[k] = Math.round(mix[k]*factor);
    return mix;
  }

  function sumCleanInclNuclear(mix){ return mix.solar + mix.wind + mix.hydro + mix.nuclear; }
  function sumRenewableOnly(mix){ return mix.solar + mix.wind + mix.hydro; }

  function getRates(zip){
    // Demo rates: community vs market
    // Community slightly below market with variance by seed
    const seed = parseInt(zip.slice(-2)) || 12;
    const market = 12 + Math.round(seededRandom(seed)*6*10)/10; // 12–18 ¢/kWh
    const community = Math.max(8, Math.round((market - (1.0 + seededRandom(seed+2)*1.5))*10)/10);
    return { communityRate: community, marketRate: market };
  }

  function estimateSavingsPerHH(zip){
    const {communityRate, marketRate} = getRates(zip);
    const kWhYear = 10800; // ~900 kWh/month
    const diff = (marketRate - communityRate)/100; // convert to $/kWh
    return Math.max(0, Math.round(diff * kWhYear));
  }

  function estimateCO2PerHH(zip){
    // Simple model: renewable share reduces intensity
    const mix = getMixForZip(zip);
    const renew = sumRenewableOnly(mix); // %
    // baseline intensity 0.45 t/MWh; reduce with renewables
    const intensity = 0.45 * (1 - renew/140); // crude reduction
    const tons = (intensity * 10.8); // 10.8 MWh/yr
    return Math.max(0, tons).toFixed(2);
  }

  function participantsForZip(zip){
    // Use chain size as proxy participants
    return 200 + Math.floor(seededRandom(parseInt(zip)+7)*800); // 200–1000
  }

  // --- Rendering ---
  function renderLegend(mix){
    const container = document.createElement('div');
    container.className = 'mix-legend';
    Object.keys(mix).forEach(k => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = COLORS[k] || '#999';
      const label = document.createElement('span');
      label.textContent = `${k.toUpperCase()} — ${mix[k]}%`;
      item.appendChild(sw);
      item.appendChild(label);
      container.appendChild(item);
    });
    return container;
  }

  function renderMixSVG(mix){
    const w = 420, h = 280;
    mixViz.setAttribute('viewBox', `0 0 ${w} ${h}`);
    mixViz.innerHTML = '';

    const entries = Object.entries(mix).map(([k,v])=>{
      return { key:k, val:v, r: Math.max(10, v * 1.2) };
    }).sort((a,b)=> b.val - a.val);

    const cols = 3;
    const colW = w / cols;
    const rowH = h / 2;

    entries.forEach((e, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * colW + colW/2 + (Math.random()*10-5);
      const cy = row * rowH + rowH/2 + (Math.random()*10-5);
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      const c = document.createElementNS('http://www.w3.org/200svg','circle');
    });
    // Corrected creation (avoid partial write issues)
    mixViz.innerHTML = '';
    const entries2 = Object.entries(mix).map(([k,v])=>({key:k,val:v,r:Math.max(10,v*1.2)})).sort((a,b)=>b.val-a.val);
    const cols2=3, colW2=w/cols2, rowH2=h/2;
    entries2.forEach((e,i)=>{
      const col=i%cols2, row=Math.floor(i/cols2);
      const cx=col*colW2+colW2/2+(Math.random()*10-5);
      const cy=row*rowH2+rowH2/2+(Math.random()*10-5);
      const g=document.createElementNS('http://www.w3.org/2000/svg','g');
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r',e.r);
      c.setAttribute('fill', COLORS[e.key]||'#999'); c.setAttribute('opacity','.9');
      const t=document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('x',cx); t.setAttribute('y',cy+4); t.setAttribute('text-anchor','middle');
      t.setAttribute('font-size','12'); t.setAttribute('fill','#0b0d12');
      t.textContent = `${e.key} ${e.val}%`;
      g.appendChild(c); g.appendChild(t); mixViz.appendChild(g);
    });

    const svgWrap = mixViz.parentElement;
    const oldLegend = svgWrap.querySelector('.mix-legend');
    if(oldLegend) oldLegend.remove();
    svgWrap.appendChild(renderLegend(mix));
  }

  function renderChain(seedZip){
    chainViz.innerHTML = '';
    const size = 30 + (parseInt(seedZip.slice(-1))||5);
    for(let i=0;i<size;i++){
      const node = document.createElement('div');
      node.className = 'chain-node';
      const initials = String.fromCharCode(65 + Math.floor(Math.random()*26)) + String.fromCharCode(65 + Math.floor(Math.random()*26));
      node.textContent = initials;
      chainViz.appendChild(node);
    }
  }

  function updateStats(zip){
    const mix = getMixForZip(zip);
    const renew = sumRenewableOnly(mix);
    const conventional = 100 - renew;
    const cleanInclNuc = sumCleanInclNuclear(mix);
    const rates = getRates(zip);
    const savingsHH = estimateSavingsPerHH(zip);
    const co2PerHH = estimateCO2PerHH(zip);
    const participants = participantsForZip(zip);
    const collectiveSavings = participants * savingsHH;
    const collectiveCO2 = participants * parseFloat(co2PerHH);

    // Snapshot
    const supplier = getSupplierForZip(zip);
    const status = isAggregationMember(zip) ? "Aggregation Member" : "Not Enrolled";
    const utility = getUtilityForZip(zip);

    supplierEl.textContent = supplier;
    statusEl.textContent = status;
    utilityEl.textContent = utility;
    mixRenewEl.textContent = renew + "%";
    mixConvEl.textContent = conventional + "%";
    commRateEl.textContent = rates.communityRate.toFixed(1);
    mktRateEl.textContent = rates.marketRate.toFixed(1);
    savingsHHEl.textContent = savingsHH.toLocaleString();
    collectiveSavingsEl.textContent = "$" + collectiveSavings.toLocaleString();
    collectiveCO2El.textContent = collectiveCO2.toFixed(0).toLocaleString();

    // Phone mini
    miniSupplier.textContent = supplier.includes("NOPEC") ? "NOPEC" : "Retail";
    miniStatus.textContent = status;
    miniUtility.textContent = utility;

    // Viz stats
    cleanShareEl.textContent = cleanInclNuc + "%";
    renewOnlyEl.textContent = renew + "%";
    co2HH.textContent = co2PerHH + " tons";

    renderMixSVG(mix);
    renderChain(zip);
  }

  function drawShareCard(zip){
    const supplier = getSupplierForZip(zip);
    const status = isAggregationMember(zip) ? "Aggregation Member" : "Not Enrolled";
    const utility = getUtilityForZip(zip);
    const mix = getMixForZip(zip);
    const renew = sumRenewableOnly(mix);
    const conv = 100 - renew;
    const {communityRate, marketRate} = getRates(zip);
    const savingsHH = estimateSavingsPerHH(zip);

    const canvas = cardCanvas;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Background
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0,0,W,H);

    // Title
    ctx.fillStyle = '#e6ecff';
    ctx.font = 'bold 84px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('WattLink', 64, 140);
    // Subtitle
    ctx.fillStyle = '#8891a7';
    ctx.font = '36px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Community Energy Snapshot', 64, 190);

    // Card block
    const blockY = 250;
    roundRect(ctx, 64, blockY, W-128, 820, 28, true, '#1f2636');

    // Columns
    const leftX = 100, rightX = W/2 + 20;
    let y = blockY + 100;

    ctx.fillStyle = '#6ee7ff';
    ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('ZIP ' + zip, leftX, y); y += 40;

    ctx.fillStyle = '#e6ecff'; ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Supplier: ' + supplier, leftX, y); y += 36;
    ctx.fillText('Status: ' + status, leftX, y); y += 36;
    ctx.fillText('Utility: ' + utility, leftX, y); y += 52;

    ctx.fillStyle = '#6ee7ff'; ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Rates & Savings', leftX, y); y += 36;
    ctx.fillStyle = '#e6ecff'; ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(`Community: ${communityRate.toFixed(1)}¢/kWh`, leftX, y); y += 32;
    ctx.fillText(`Market: ${marketRate.toFixed(1)}¢/kWh`, leftX, y); y += 32;
    ctx.fillStyle = '#52ffa8'; ctx.fillText(`Savings/HH: $${savingsHH.toLocaleString()}/yr`, leftX, y);

    // Right column - Mix
    y = blockY + 100;
    ctx.fillStyle = '#6ee7ff'; ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Energy Mix', rightX, y); y += 36;
    ctx.fillStyle = '#e6ecff'; ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(`Renewable: ${renew}%`, rightX, y); y += 32;
    ctx.fillText(`Conventional: ${conv}%`, rightX, y); y += 48;

    // Legend
    ctx.font = '26px system-ui, -apple-system, Segoe UI, Roboto';
    const entries = Object.entries(mix);
    entries.forEach(([k,v],i)=>{
      ctx.fillStyle = (k==='solar')?'#ffd166':(k==='wind')?'#6ee7ff':(k==='hydro')?'#7bd3ff':(k==='nuclear')?'#c7b8ff':(k==='gas')?'#ffb4b4':'#ff6b6b';
      ctx.fillRect(rightX, y-20, 20, 20);
      ctx.fillStyle = '#e6ecff';
      ctx.fillText(`${k.toUpperCase()} — ${v}%`, rightX+28, y-4);
      y += 32;
    });

    // Footer
    ctx.fillStyle = '#8891a7';
    ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(new Date().toLocaleDateString(), leftX, H-120);
    ctx.fillText('Join the Community Chain → wattlink.io', rightX, H-120);

    const url = canvas.toDataURL('image/png');
    downloadLink.href = url;
    downloadLink.download = `WattLink_${zip}_Snapshot.png`;
    downloadLink.classList.remove('hidden');
    return url;
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    if(fill){ ctx.fillStyle = fill === true ? '#121723' : fill; ctx.fill(); }
    if(stroke){ ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  // Events
  zipForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const zip = (zipInput.value||'').trim();
    if(zip.length !== 5){ alert('Please enter a 5‑digit ZIP.'); return; }
    mockZipEl.textContent = zip;
    updateStats(zip);
  });

  document.getElementById('makeCard').addEventListener('click', ()=>{
    const zip = (zipInput.value||'').trim();
    if(zip.length !== 5){ alert('Enter a ZIP first.'); return; }
    drawShareCard(zip);
  });

  document.getElementById('shareBtn').addEventListener('click', async ()=>{
    const zip = (zipInput.value||'').trim();
    if(zip.length !== 5){ alert('Enter a ZIP first.'); return; }
    const dataUrl = drawShareCard(zip);
    try{
      if(navigator.canShare && navigator.canShare()){
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `WattLink_${zip}.png`, { type:'image/png' });
        await navigator.share({ files:[file], title:'WattLink', text:`Community energy snapshot — ZIP ${zip}` });
      } else {
        alert('Share not supported. A download link has appeared below.');
      }
    } catch(err){
      console.warn('Share failed:', err);
    }
  });

  // Initial load
  mockZipEl.textContent = '43210';
  updateStats('43210');
})(); 
