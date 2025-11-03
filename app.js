
(function(){
  const mixViz = document.getElementById('mixViz');
  const mockZipEl = document.getElementById('mockZip');
  const zipForm = document.getElementById('zipForm');
  const zipInput = document.getElementById('zip');
  const mixLegend = document.getElementById('mixLegend');
  const cleanShareEl = document.getElementById('cleanShare');
  const savingsEl = document.getElementById('savings');
  const co2El = document.getElementById('co2');
  const yearEl = document.getElementById('year');
  const chainViz = document.getElementById('chainViz');
  const makeCardBtn = document.getElementById('makeCard');
  const shareBtn = document.getElementById('shareBtn');
  const cardCanvas = document.getElementById('cardCanvas');
  const downloadLink = document.getElementById('downloadLink');

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

  function getMixForZip(zip){
    // Demo data logic: vary mix by last two digits
    let n = parseInt(zip.slice(-2)) || 37;
    let s = 20 + Math.floor(seededRandom(n) * 30);
    let w = 10 + Math.floor(seededRandom(n+1) * 25);
    let h = 3 + Math.floor(seededRandom(n+2) * 6);
    let nu = 15 + Math.floor(seededRandom(n+3) * 20);
    let fossil = 100 - (s+w+h+nu);
    let gas = Math.max(0, Math.round(fossil * .7));
    let coal = Math.max(0, fossil - gas);
    const mix = { solar:s, wind:w, hydro:h, nuclear:nu, gas, coal };
    // Normalize to 100 due to rounding
    const total = Object.values(mix).reduce((a,b)=>a+b,0);
    const factor = 100/total;
    for(const k in mix) mix[k] = Math.round(mix[k]*factor);
    return mix;
  }

  function sumClean(mix){
    return mix.solar + mix.wind + mix.hydro + mix.nuclear;
  }

  function estimateSavings(zip){
    // Simple demo model: $ per household per year based on clean share + seed
    const base = 60 + (parseInt(zip.slice(-1))||3) * 6;
    return Math.round(base + sumClean(getMixForZip(zip)) * 0.8);
  }

  function estimateCO2(zip){
    // Demo model: tons avoided per household equivalence
    return (sumClean(getMixForZip(zip)) * 0.012 + (parseInt(zip.slice(-2))||10)/400).toFixed(2);
  }

  function renderLegend(mix){
    mixLegend.innerHTML = '';
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
      mixLegend.appendChild(item);
    });
  }

  function renderMixSVG(mix){
    // Bubble layout (pack) using naive positioning
    const w = 420, h = 280;
    mixViz.setAttribute('viewBox', `0 0 ${w} ${h}`);
    mixViz.innerHTML = '';

    const entries = Object.entries(mix).map(([k,v])=>{
      return { key:k, val:v, r: Math.max(10, v * 1.2) };
    }).sort((a,b)=> b.val - a.val);

    // Simple grid placement
    const cols = 3;
    const colW = w / cols;
    const rowH = h / 2;

    entries.forEach((e, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * colW + colW/2 + (Math.random()*10-5);
      const cy = row * rowH + rowH/2 + (Math.random()*10-5);
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', e.r);
      c.setAttribute('fill', COLORS[e.key] || '#999');
      c.setAttribute('opacity', '.9');
      const t = document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('x', cx);
      t.setAttribute('y', cy+4);
      t.setAttribute('text-anchor','middle');
      t.setAttribute('font-size','12');
      t.setAttribute('fill','#0b0d12');
      t.textContent = `${e.key} ${e.val}%`;
      g.appendChild(c);
      g.appendChild(t);
      mixViz.appendChild(g);
    });
  }

  function renderChain(seedZip){
    chainViz.innerHTML = '';
    const size = 28 + (parseInt(seedZip.slice(-1))||5);
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
    cleanShareEl.textContent = sumClean(mix) + '%';
    savingsEl.textContent = '$' + estimateSavings(zip);
    co2El.textContent = estimateCO2(zip) + ' tons';
    renderLegend(mix);
    renderMixSVG(mix);
    renderChain(zip);
  }

  function drawShareCard(zip){
    const mix = getMixForZip(zip);
    const clean = sumClean(mix);
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
    ctx.fillText('Social Energy Transparency', 64, 190);

    // Card block
    const blockY = 260;
    ctx.fillStyle = '#121723';
    roundRect(ctx, 64, blockY, W-128, 740, 28, true, '#1f2636');

    // ZIP & Date
    ctx.fillStyle = '#e6ecff';
    ctx.font = 'bold 60px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('ZIP ' + zip, 100, blockY+100);
    ctx.fillStyle = '#8891a7';
    ctx.font = '34px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(new Date().toLocaleDateString(), 100, blockY+150);

    // Clean Share
    ctx.fillStyle = '#6ee7ff';
    ctx.font = 'bold 90px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText(clean + '% Clean', 100, blockY+265);

    // Mix legend
    ctx.font = '32px system-ui, -apple-system, Segoe UI, Roboto';
    let y = blockY + 330;
    const entries = Object.entries(mix);
    entries.forEach(([k,v])=>{
      // swatch
      ctx.fillStyle = COLORS[k] || '#a0aec0';
      ctx.fillRect(100, y-24, 28, 28);
      ctx.fillStyle = '#e6ecff';
      ctx.fillText(k.toUpperCase() + ' — ' + v + '%', 140, y);
      y += 52;
    });

    // Footer
    ctx.fillStyle = '#8891a7';
    ctx.font = '30px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Join the Community Chain → wattlink.io', 100, H-120);

    // Return data URL
    const url = canvas.toDataURL('image/png');
    downloadLink.href = url;
    downloadLink.download = `WattLink_${zip}_ShareCard.png`;
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

  makeCardBtn.addEventListener('click', ()=>{
    const zip = (zipInput.value||'').trim();
    if(zip.length !== 5){ alert('Enter a ZIP first.'); return; }
    drawShareCard(zip);
  });

  shareBtn.addEventListener('click', async ()=>{
    const zip = (zipInput.value||'').trim();
    if(zip.length !== 5){ alert('Enter a ZIP first.'); return; }
    const dataUrl = drawShareCard(zip);
    try{
      if(navigator.canShare && navigator.canShare()){
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `WattLink_${zip}.png`, { type:'image/png' });
        await navigator.share({ files:[file], title:'WattLink', text:`My town's energy mix — ZIP ${zip}` });
      } else {
        // Fallback: show download link
        alert('Share not supported. A download link has appeared below.');
      }
    } catch(err){
      console.warn('Share failed:', err);
    }
  });

  // Initial state
  mockZipEl.textContent = '43210';
  updateStats('43210');
})(); 
