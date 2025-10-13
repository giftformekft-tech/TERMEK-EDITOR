(function(){
  const settings = (typeof NB_DESIGNER!=='undefined' && NB_DESIGNER.settings) ? NB_DESIGNER.settings : {};
  const c = new fabric.Canvas('nb-canvas',{preserveObjectStacking:true, backgroundColor:'#fff'});

  const defaultCanvasSize = {w: c.width, h: c.height};
  const fallbackArea = {
    x: Math.round(defaultCanvasSize.w * 0.15),
    y: Math.round(defaultCanvasSize.h * 0.15),
    w: Math.round(defaultCanvasSize.w * 0.7),
    h: Math.round(defaultCanvasSize.h * 0.7),
    canvas_w: defaultCanvasSize.w,
    canvas_h: defaultCanvasSize.h
  };

  function getCatalog(){ return settings.catalog || {}; }
  function productList(){ return settings.products || []; }
  function mockups(){ return settings.mockups || []; }
  function types(){ return settings.types || ['Póló','Pulóver']; }

  const typeSel=document.getElementById('nb-type');
  const productSel=document.getElementById('nb-product');
  const colorSel=document.getElementById('nb-color');
  const sizeSel=document.getElementById('nb-size');
  const colorSwatchesWrap=document.getElementById('nb-color-swatches');
  const sizeOptionsWrap=document.getElementById('nb-size-options');
  const productTitleEl=document.getElementById('nb-product-title');
  const summaryTypeEl=document.getElementById('nb-summary-type');
  const summaryColorEl=document.getElementById('nb-summary-color');
  const summarySizeEl=document.getElementById('nb-summary-size');
  const summaryPriceEl=document.getElementById('nb-summary-price');

  function currentSelection(){
    const pid = parseInt(productSel.value||0, 10);
    const type = typeSel.value||'';
    const color = colorSel.value||'';
    const size = sizeSel.value||'';
    const cfg = getCatalog()[pid] || {};
    const key = (type+'|'+color).toLowerCase();
    const mapping = (cfg.map||{})[key] || {};
    const mk = mockups()[parseInt(mapping.mockup_index||-1, 10)] || null;
    return {pid, type, color, size, cfg, mapping, mockup: mk};
  }

  function normalizeKey(str){
    const lower = (str||'').toString().toLowerCase();
    if (typeof lower.normalize === 'function'){
      return lower.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    }
    return lower;
  }

  function colorNameToCss(name){
    if (!name) return '#ddd';
    const trimmed = name.toString().trim();
    if (/^#/.test(trimmed) || /^rgb/.test(trimmed)) return trimmed;
    const key = normalizeKey(trimmed);
    const map = {
      fekete:'#111111', black:'#111111',
      feher:'#ffffff', white:'#ffffff',
      piros:'#e53935', red:'#e53935',
      voros:'#c62828', bordo:'#7b1e3c', burgundy:'#7b1e3c',
      narancs:'#fb8c00', orange:'#fb8c00',
      sarga:'#fdd835', yellow:'#fdd835',
      arany:'#d4af37', gold:'#d4af37',
      ezust:'#c0c0c0', silver:'#c0c0c0',
      zold:'#43a047', green:'#43a047',
      sotetzold:'#2e7d32', vilagoszold:'#81c784', lime:'#81c784',
      kek:'#1e88e5', blue:'#1e88e5',
      sotetkek:'#1565c0', navy:'#1565c0',
      vilagoskek:'#64b5f6', lightblue:'#64b5f6',
      lila:'#8e24aa', purple:'#8e24aa',
      pink:'#f06292', magenta:'#d81b60',
      barna:'#8d6e63', brown:'#8d6e63',
      krem:'#f5e6c4', cream:'#f5e6c4', beige:'#d7c0a6',
      szurke:'#9e9e9e', grey:'#9e9e9e', gray:'#9e9e9e',
      sotetszurke:'#616161', vilagosszurke:'#cfcfcf',
      grafit:'#4b4b4b', charcoal:'#4b4b4b',
      oliva:'#556b2f', olive:'#556b2f',
      menta:'#98ff98', mint:'#98ff98',
      turkiz:'#00bcd4', turquoise:'#00bcd4'
    };
    if (map[key]) return map[key];
    const parts = key.split(/[^a-z0-9]+/);
    for (let i=0;i<parts.length;i++){
      const part = parts[i];
      if (map[part]) return map[part];
    }
    return '#ddd';
  }

  function selectedOptionText(sel){
    if (!sel || sel.selectedIndex < 0) return '';
    const opt = sel.options[sel.selectedIndex];
    return opt ? (opt.textContent || opt.innerText || '') : '';
  }

  function highlightColor(value){
    if (!colorSwatchesWrap) return;
    Array.from(colorSwatchesWrap.querySelectorAll('.nb-color-swatch')).forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  function highlightSize(value){
    if (!sizeOptionsWrap) return;
    Array.from(sizeOptionsWrap.querySelectorAll('.nb-size-option')).forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  function triggerChange(el){
    if (!el) return;
    let ev;
    if (typeof Event === 'function'){ ev = new Event('change', {bubbles:true}); }
    else {
      ev = document.createEvent('Event');
      ev.initEvent('change', true, true);
    }
    el.dispatchEvent(ev);
  }

  function formatHUF(value){
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    try{
      return new Intl.NumberFormat('hu-HU',{style:'currency',currency:'HUF',maximumFractionDigits:0}).format(value);
    }catch(e){
      return Math.round(value)+' Ft';
    }
  }

  function calculateDisplayedPrice(sel){
    if (!sel || !sel.mapping) return null;
    const base = parseFloat(sel.mapping.base_fee);
    if (Number.isNaN(base)) return null;
    let price = base;
    const surcharges = sel.cfg?.size_surcharge || {};
    if (sel.size && surcharges && Object.prototype.hasOwnProperty.call(surcharges, sel.size)){
      const add = parseFloat(surcharges[sel.size]);
      if (!Number.isNaN(add)) price += add;
    }
    return price;
  }

  function updateSummary(){
    const sel = currentSelection();
    if (productTitleEl){
      const label = selectedOptionText(productSel) || 'Válaszd ki a terméket';
      productTitleEl.textContent = label;
    }
    if (summaryTypeEl){
      summaryTypeEl.textContent = selectedOptionText(typeSel) || '–';
    }
    if (summaryColorEl){
      const colorLabel = selectedOptionText(colorSel);
      summaryColorEl.textContent = colorLabel || '–';
    }
    if (summarySizeEl){
      summarySizeEl.textContent = sel.size ? sel.size.toUpperCase() : '–';
    }
    if (summaryPriceEl){
      const price = calculateDisplayedPrice(sel);
      const formatted = price !== null ? formatHUF(price) : null;
      summaryPriceEl.textContent = formatted || ' ';
    }
  }

  function referenceSizeForMockup(mk, area){
    const areaW = area?.canvas_w;
    const areaH = area?.canvas_h;
    if (areaW && areaH){
      return {w: areaW, h: areaH};
    }
    if (mk){
      if (mk.canvas && mk.canvas.w && mk.canvas.h){
        return {w: mk.canvas.w, h: mk.canvas.h};
      }
      if (mk.canvas_w && mk.canvas_h){
        return {w: mk.canvas_w, h: mk.canvas_h};
      }
    }
    return {w: defaultCanvasSize.w, h: defaultCanvasSize.h};
  }

  function applyCanvasSize(size){
    const canvasEl = c.getElement();
    let changed = false;
    const targetW = size?.w > 0 ? size.w : defaultCanvasSize.w;
    const targetH = size?.h > 0 ? size.h : defaultCanvasSize.h;
    if (c.width !== targetW){
      c.setWidth(targetW);
      canvasEl.width = targetW;
      canvasEl.style.width = targetW + 'px';
      changed = true;
    }
    if (c.height !== targetH){
      c.setHeight(targetH);
      canvasEl.height = targetH;
      canvasEl.style.height = targetH + 'px';
      changed = true;
    }
    if (changed){
      c.calcOffset();
    }
    return {w: targetW, h: targetH};
  }

  function isDesignObject(obj){
    return !!obj && !obj.__nb_bg && !obj.__nb_area;
  }

  function designObjects(){
    return c.getObjects().filter(isDesignObject);
  }

  function fitWithinArea(obj){
    const area = c.__nb_area || fallbackArea;
    if (!area) return;
    obj.setCoords();
    let rect = obj.getBoundingRect(true, true);
    if (!rect.width || !rect.height) return;
    let scaled = false;
    if (rect.width > area.w){
      const scale = area.w / rect.width;
      obj.scaleX *= scale;
      obj.scaleY *= scale;
      scaled = true;
    }
    if (scaled){
      obj.setCoords();
      rect = obj.getBoundingRect(true, true);
    }
    if (rect.height > area.h){
      const scale = area.h / rect.height;
      obj.scaleX *= scale;
      obj.scaleY *= scale;
      obj.setCoords();
    }
  }

  function constrainToArea(obj){
    const area = c.__nb_area || fallbackArea;
    if (!area) return;
    obj.setCoords();
    let rect = obj.getBoundingRect(true, true);
    if (rect.left < area.x){
      obj.left += area.x - rect.left;
    }
    if (rect.top < area.y){
      obj.top += area.y - rect.top;
    }
    obj.setCoords();
    rect = obj.getBoundingRect(true, true);
    const areaRight = area.x + area.w;
    const areaBottom = area.y + area.h;
    const rectRight = rect.left + rect.width;
    const rectBottom = rect.top + rect.height;
    if (rectRight > areaRight){
      obj.left -= rectRight - areaRight;
    }
    if (rectBottom > areaBottom){
      obj.top -= rectBottom - areaBottom;
    }
    obj.setCoords();
  }

  function keepObjectInside(obj, options){
    if (!isDesignObject(obj)) return;
    const opts = Object.assign({fit:true}, options||{});
    if (opts.fit){
      fitWithinArea(obj);
    }
    constrainToArea(obj);
    c.requestRenderAll();
  }

  function enforceAllObjectsInside(){
    designObjects().forEach(obj=>keepObjectInside(obj));
  }

  function populateTypes(){
    const prev = typeSel.value;
    typeSel.innerHTML='';
    types().forEach(t=>{
      const o=document.createElement('option');
      o.value=t.toLowerCase();
      o.textContent=t;
      typeSel.appendChild(o);
    });
    if (typeSel.options.length){
      const values = Array.from(typeSel.options).map(opt=>opt.value);
      typeSel.value = (prev && values.includes(prev)) ? prev : typeSel.options[0].value;
    }
  }

  function populateProducts(){
    const cat = getCatalog();
    const prev = productSel.value;
    productSel.innerHTML='';
    (productList()).forEach(pid=>{
      const o=document.createElement('option');
      o.value=pid;
      o.textContent=(cat[pid]?.title||('Termék #'+pid));
      productSel.appendChild(o);
    });
    if (productSel.options.length){
      const values = Array.from(productSel.options).map(opt=>opt.value);
      productSel.value = (prev && values.includes(prev)) ? prev : productSel.options[0].value;
    }
  }

  function populateColorsSizes(){
    const pid = parseInt(productSel.value||0, 10);
    const cfg = getCatalog()[pid] || {};
    const prevColor = colorSel.value;
    const prevSize = sizeSel.value;

    colorSel.innerHTML='';
    if (colorSwatchesWrap) colorSwatchesWrap.innerHTML='';
    (cfg.colors||[]).forEach(cn=>{
      const label = (cn ?? '').toString();
      const value = label.toLowerCase();
      const o=document.createElement('option');
      o.value=value;
      o.textContent=label;
      colorSel.appendChild(o);
      if (colorSwatchesWrap){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='nb-color-swatch';
        btn.dataset.value=value;
        btn.dataset.label=label;
        btn.style.setProperty('--swatch-color', colorNameToCss(label));
        btn.title=label;
        btn.addEventListener('click', ()=>{
          colorSel.value=value;
          triggerChange(colorSel);
        });
        colorSwatchesWrap.appendChild(btn);
      }
    });
    if (colorSel.options.length){
      const values = Array.from(colorSel.options).map(opt=>opt.value);
      const target = (prevColor && values.includes(prevColor)) ? prevColor : colorSel.options[0].value;
      colorSel.value = target;
    }else{
      colorSel.value='';
    }
    highlightColor(colorSel.value);

    sizeSel.innerHTML='';
    if (sizeOptionsWrap) sizeOptionsWrap.innerHTML='';
    (cfg.sizes||[]).forEach(sz=>{
      const label = (sz ?? '').toString();
      const value = label;
      const o=document.createElement('option');
      o.value=value;
      o.textContent=label;
      sizeSel.appendChild(o);
      if (sizeOptionsWrap){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='nb-size-option';
        btn.dataset.value=value;
        btn.textContent=label;
        btn.addEventListener('click', ()=>{
          sizeSel.value=value;
          triggerChange(sizeSel);
        });
        sizeOptionsWrap.appendChild(btn);
      }
    });
    if (sizeSel.options.length){
      const values = Array.from(sizeSel.options).map(opt=>opt.value);
      const target = (prevSize && values.includes(prevSize)) ? prevSize : sizeSel.options[0].value;
      sizeSel.value = target;
    }else{
      sizeSel.value='';
    }
    highlightSize(sizeSel.value);
    updateSummary();
  }

  function setMockupBgAndArea(){
    const {mockup: mk} = currentSelection();

    c.getObjects().slice().forEach(obj=>{ if (obj.__nb_bg){ c.remove(obj); } });
    c.getObjects().slice().forEach(obj=>{ if (obj.__nb_area){ c.remove(obj); } });

    const areaRaw = mk && mk.area ? Object.assign({}, mk.area) : Object.assign({}, fallbackArea);
    const refSize = referenceSizeForMockup(mk, areaRaw);
    const appliedSize = applyCanvasSize(refSize);

    const baseArea = {
      x: typeof areaRaw.x === 'number' ? areaRaw.x : fallbackArea.x,
      y: typeof areaRaw.y === 'number' ? areaRaw.y : fallbackArea.y,
      w: typeof areaRaw.w === 'number' ? areaRaw.w : fallbackArea.w,
      h: typeof areaRaw.h === 'number' ? areaRaw.h : fallbackArea.h
    };

    const scaleX = refSize.w ? appliedSize.w / refSize.w : 1;
    const scaleY = refSize.h ? appliedSize.h / refSize.h : 1;

    const area = {
      x: Math.round(baseArea.x * scaleX),
      y: Math.round(baseArea.y * scaleY),
      w: Math.round(baseArea.w * scaleX),
      h: Math.round(baseArea.h * scaleY)
    };

    const printArea = new fabric.Rect({
      left: area.x,
      top: area.y,
      width: area.w,
      height: area.h,
      originX: 'left',
      originY: 'top',
      fill: 'rgba(0,0,0,0)',
      stroke: '#888',
      strokeWidth: 2,
      strokeDashArray: [5,5],
      selectable: false,
      evented: false
    });
    printArea.__nb_area=true;
    c.add(printArea);
    c.__nb_area = area;
    c.__nb_area_rect = printArea;

    if (mk && mk.image_url){
      fabric.Image.fromURL(mk.image_url, img=>{
        const scale = Math.min(c.width / img.width, c.height / img.height);
        img.scale(scale);
        img.set({left:0, top:0, selectable:false, evented:false, originX:'left', originY:'top'});
        img.__nb_bg=true;
        c.add(img);
        img.moveTo(0);
        if (c.__nb_area_rect){
          c.__nb_area_rect.moveTo(1);
        }
        c.requestRenderAll();
      }, {crossOrigin:'anonymous'});
    }

    enforceAllObjectsInside();
  }

  // Initial populate
  populateTypes();
  populateProducts();
  populateColorsSizes();
  setMockupBgAndArea();

  typeSel.onchange = ()=>{ populateColorsSizes(); setMockupBgAndArea(); };
  productSel.onchange = ()=>{ populateColorsSizes(); setMockupBgAndArea(); };
  colorSel.onchange = ()=>{ highlightColor(colorSel.value); updateSummary(); setMockupBgAndArea(); };
  sizeSel.onchange = ()=>{ highlightSize(sizeSel.value); updateSummary(); };

  // Apply constraints on interactions
  c.on('object:added', e=>{ keepObjectInside(e.target); });
  c.on('object:moving', e=>{ keepObjectInside(e.target, {fit:false}); });
  c.on('object:scaling', e=>{ keepObjectInside(e.target); });
  c.on('object:rotating', e=>{ keepObjectInside(e.target); });
  c.on('object:modified', e=>{ keepObjectInside(e.target); });

  // Tools
  document.getElementById('nb-add-text').onclick = () => {
    const a = c.__nb_area || fallbackArea;
    const textboxWidth = Math.max(60, a.w - 20);
    const t = new fabric.Textbox('Saját szöveg',{
      fill:'#000',
      fontSize:48,
      width: textboxWidth,
      left:a.x + 10,
      top:a.y + 10
    });
    c.add(t).setActiveObject(t);
    keepObjectInside(t);
  };

  document.getElementById('nb-upload').onchange = e=>{
    const f=e.target.files[0]; if(!f) return;
    const url=URL.createObjectURL(f);
    fabric.Image.fromURL(url, img=>{
      URL.revokeObjectURL(url);
      const a = c.__nb_area || fallbackArea;
      const maxW=a.w*0.95, maxH=a.h*0.95;
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      img.scale(scale);
      img.set({
        left:a.x + (a.w - img.getScaledWidth())/2,
        top:a.y + (a.h - img.getScaledHeight())/2,
        selectable:true,
        cornerStyle:'circle',
        transparentCorners:false,
        lockScalingFlip:true
      });
      c.add(img);
      c.setActiveObject(img);
      keepObjectInside(img);
    });
  };

  let savedDesignId=null;
  document.getElementById('nb-save').onclick = async ()=>{
    const png = c.toDataURL({format:'png', multiplier:2, left:0, top:0});
    const sel = currentSelection();
    const size  = sizeSel.value||'';
    const price_ctx = {product_id:sel.pid, type:sel.type, color:sel.color, size};
    const meta={width_mm:300, height_mm:400, dpi:300, product_id:sel.pid, attributes_json:{pa_type:sel.type, pa_color: sel.color, pa_size: size}, price_ctx};
    try{
      const res = await fetch(NB_DESIGNER.rest+'save',{method:'POST',
        headers:{'X-WP-Nonce':NB_DESIGNER.nonce,'Content-Type':'application/json'},
        body:JSON.stringify({png_base64:png, layers:c.toJSON(), meta})
      });
      const j=await res.json(); if(!res.ok){alert(j.message||'Mentési hiba'); return;}
      savedDesignId=j.design_id;
      document.getElementById('nb-add-to-cart').disabled=false;
      alert('Mentve! ID: '+savedDesignId);
    }catch(e){ alert('Hálózati hiba'); }
  };

  document.getElementById('nb-add-to-cart').onclick = async ()=>{
    if(!savedDesignId) return alert('Előbb ments!');
    try{
      const res = await fetch(NB_DESIGNER.rest+'add-to-cart',{method:'POST',
        headers:{'X-WP-Nonce':NB_DESIGNER.nonce,'Content-Type':'application/json'},
        body:JSON.stringify({design_id:savedDesignId})
      });
      const j=await res.json(); if(!res.ok){alert(j.message||'Kosár hiba'); return;}
      window.location = j.redirect;
    }catch(e){ alert('Hálózati hiba'); }
  };
})();
