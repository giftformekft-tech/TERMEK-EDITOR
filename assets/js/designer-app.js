(function(){
  function run(){
  const settings = (typeof NB_DESIGNER!=='undefined' && NB_DESIGNER.settings) ? NB_DESIGNER.settings : {};
  if (typeof fabric === 'undefined' || typeof fabric.Canvas !== 'function'){
    return;
  }
  const canvasElement = document.getElementById('nb-canvas');
  if (!canvasElement){
    return;
  }
  const c = new fabric.Canvas(canvasElement,{preserveObjectStacking:true, backgroundColor:'#fff'});

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
  function productList(){
    if (Array.isArray(settings.products) && settings.products.length){
      return settings.products;
    }
    if (settings.catalog && typeof settings.catalog === 'object'){
      return Object.keys(settings.catalog);
    }
    return [];
  }
  function mockups(){ return settings.mockups || []; }
  function types(){ return settings.types || ['Póló eleje','Póló hátulja']; }

  const productSel=document.getElementById('nb-product');
  const viewSel=document.getElementById('nb-view');
  const colorSel=document.getElementById('nb-color');
  const sizeSel=document.getElementById('nb-size');
  if (!productSel || !viewSel || !colorSel || !sizeSel){
    return;
  }
  const colorSwatchesWrap=document.getElementById('nb-color-swatches');
  const sizeOptionsWrap=document.getElementById('nb-size-options');
  const viewOptionsWrap=document.getElementById('nb-view-options');
  const productTitleEl=document.getElementById('nb-product-title');
  const summaryTypeEl=document.getElementById('nb-summary-type');
  const summaryColorEl=document.getElementById('nb-summary-color');
  const summarySizeEl=document.getElementById('nb-summary-size');
  const summaryPriceEl=document.getElementById('nb-summary-price');
  const quantityInput=document.getElementById('nb-quantity');
  const qtyMinusBtn=document.getElementById('nb-qty-minus');
  const qtyPlusBtn=document.getElementById('nb-qty-plus');
  const addToCartBtn=document.getElementById('nb-add-to-cart');
  const textSettings=document.getElementById('nb-text-settings');
  const textFontSelect=document.getElementById('nb-text-font');
  const textSizeInput=document.getElementById('nb-text-size');
  const textColorInput=document.getElementById('nb-text-color');
  const textAlignButtons=Array.from(document.querySelectorAll('.nb-text-align-btn'));
  const textBoldBtn=document.getElementById('nb-text-bold');
  const textItalicBtn=document.getElementById('nb-text-italic');

  const viewStates={};
  let remoteSettingsRequested=false;
  let lastSelectionKey=null;
  let savedDesignId=null;
  let isRestoring=false;

  function hydrateFromSettings(data){
    if (!data || typeof data !== 'object') return;
    if (Array.isArray(data.fonts)) settings.fonts = data.fonts;
    if (Array.isArray(data.products)) settings.products = data.products;
    if (Array.isArray(data.types)) settings.types = data.types;
    if (data.catalog && typeof data.catalog === 'object') settings.catalog = data.catalog;
    if (Array.isArray(data.mockups)) settings.mockups = data.mockups;
    populateFontOptions();
    populateProducts();
    populateViews();
    populateColorsSizes();
    setMockupBgAndArea();
    restoreDesignForKey(viewKey());
    updateSummary();
    updateLastSelectionKey();
  }

  function maybeFetchRemoteSettings(){
    if (productSel.options.length || remoteSettingsRequested) return;
    if (typeof NB_DESIGNER === 'undefined' || !NB_DESIGNER.rest) return;
    remoteSettingsRequested=true;
    fetch(NB_DESIGNER.rest+'settings',{credentials:'same-origin'})
      .then(res=>res.ok ? res.json() : null)
      .then(data=>{ if (data && typeof data === 'object'){ hydrateFromSettings(data); } })
      .catch(()=>{});
  }

  function viewOptionsContainer(){ return viewOptionsWrap; }

  function currentSelection(){
    const pid = parseInt(productSel.value||0, 10);
    const type = viewSel ? (viewSel.value||'') : '';
    const color = colorSel.value||'';
    const size = sizeSel.value||'';
    const cfg = getCatalog()[pid] || {};
    const key = (type+'|'+color).toLowerCase();
    const mapping = (cfg.map||{})[key] || {};
    const mk = mockups()[parseInt(mapping.mockup_index||-1, 10)] || null;
    const quantity = quantityInput ? sanitizeQuantity(quantityInput.value) : 1;
    return {pid, type, color, size, quantity, cfg, mapping, mockup: mk};
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

  function toNumber(value, fallback){
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function sanitizeQuantity(value){
    const num = parseInt(value, 10);
    return Number.isFinite(num) && num > 0 ? num : 1;
  }

  function rgbToHex(str){
    if (typeof str !== 'string') return '#000000';
    const match = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!match) return '#000000';
    const r = Math.max(0, Math.min(255, parseInt(match[1],10))).toString(16).padStart(2,'0');
    const g = Math.max(0, Math.min(255, parseInt(match[2],10))).toString(16).padStart(2,'0');
    const b = Math.max(0, Math.min(255, parseInt(match[3],10))).toString(16).padStart(2,'0');
    return '#'+r+g+b;
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

  function highlightView(value){
    const wrap = viewOptionsContainer();
    if (!wrap) return;
    Array.from(wrap.querySelectorAll('.nb-view-option')).forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  function toggleTextSettings(show){
    if (!textSettings) return;
    textSettings.classList.toggle('nb-hidden', !show);
  }

  function isTextObject(obj){
    if (!obj) return false;
    return obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text';
  }

  function viewKey(sel){
    const selection = sel || currentSelection();
    const pid = selection?.pid ? String(selection.pid) : '0';
    const type = selection?.type || 'default';
    return pid + '|' + type;
  }

  function storeCurrentDesign(key){
    if (!key || isRestoring) return;
    const objects = designObjects().map(obj=>obj.toObject(['fontFamily','fontWeight','fontStyle','textAlign','charSpacing','lineHeight','styles','fill']));
    viewStates[key] = objects;
  }

  function clearDesignObjects(){
    designObjects().forEach(obj=>c.remove(obj));
  }

  function restoreDesignForKey(key){
    clearDesignObjects();
    const stored = viewStates[key] || [];
    viewStates[key] = stored;
    if (!stored.length){
      c.requestRenderAll();
      return;
    }
    isRestoring=true;
    fabric.util.enlivenObjects(stored, objects=>{
      objects.forEach(obj=>{
        c.add(obj);
      });
      isRestoring=false;
      enforceAllObjectsInside();
      c.requestRenderAll();
    });
  }

  function updateLastSelectionKey(){
    lastSelectionKey = viewKey();
  }

  function markDirty(){
    if (savedDesignId){
      savedDesignId=null;
      if (addToCartBtn){ addToCartBtn.disabled=true; }
    }
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
      summaryTypeEl.textContent = selectedOptionText(viewSel) || '–';
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
      const qty = quantityInput ? sanitizeQuantity(quantityInput.value) : 1;
      const total = price !== null ? price * qty : null;
      const formatted = total !== null ? formatHUF(total) : null;
      summaryPriceEl.textContent = formatted || ' ';
    }
  }

  function referenceSizeForMockup(mk, area){
    const areaW = toNumber(area?.canvas_w, null);
    const areaH = toNumber(area?.canvas_h, null);
    if (areaW && areaH){
      return {w: areaW, h: areaH};
    }
    if (mk){
      if (mk.canvas && mk.canvas.w && mk.canvas.h){
        return {w: toNumber(mk.canvas.w, defaultCanvasSize.w), h: toNumber(mk.canvas.h, defaultCanvasSize.h)};
      }
      if (mk.canvas_w && mk.canvas_h){
        return {w: toNumber(mk.canvas_w, defaultCanvasSize.w), h: toNumber(mk.canvas_h, defaultCanvasSize.h)};
      }
    }
    return {w: defaultCanvasSize.w, h: defaultCanvasSize.h};
  }

  function applyCanvasSize(size){
    const canvasEl = c.getElement();
    let changed = false;
    const targetW = toNumber(size?.w, defaultCanvasSize.w) || defaultCanvasSize.w;
    const targetH = toNumber(size?.h, defaultCanvasSize.h) || defaultCanvasSize.h;
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

  function typesForProduct(pid){
    const cfg = getCatalog()[pid] || {};
    const list = Array.isArray(cfg.types) ? cfg.types : [];
    if (list.length){
      return list;
    }
    return types();
  }

  function populateViews(){
    if (!viewSel) return;
    const prev = viewSel.value;
    const pid = parseInt(productSel.value||0,10);
    const views = typesForProduct(pid);
    viewSel.innerHTML='';
    const wrap = viewOptionsContainer();
    if (wrap){ wrap.innerHTML=''; }
    views.forEach(v=>{
      const value = (v ?? '').toString().toLowerCase();
      const o=document.createElement('option');
      o.value=value;
      o.textContent=v;
      viewSel.appendChild(o);
      if (wrap){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='nb-view-option';
        btn.dataset.value=value;
        btn.textContent=v;
        btn.addEventListener('click', ()=>{
          if (viewSel.value === value) return;
          storeCurrentDesign(lastSelectionKey);
          viewSel.value=value;
          triggerChange(viewSel);
        });
        wrap.appendChild(btn);
      }
    });
    if (viewSel.options.length){
      const values = Array.from(viewSel.options).map(opt=>opt.value);
      const target = (prev && values.includes(prev)) ? prev : viewSel.options[0].value;
      viewSel.value = target;
    }else{
      viewSel.value='';
    }
    highlightView(viewSel.value);
  }

  function availableFonts(){
    const list=[];
    if (Array.isArray(settings.fonts)){
      settings.fonts.forEach(f=>{
        if (!f) return;
        const str = f.toString().trim();
        if (!str) return;
        if (/^https?:/i.test(str)){
          const last = str.split('/').pop() || '';
          const name = last.split('.')[0] || last;
          const pretty = name.replace(/[-_]+/g,' ');
          if (pretty) list.push(pretty.charAt(0).toUpperCase()+pretty.slice(1));
        }else{
          list.push(str);
        }
      });
    }
    ['Montserrat','Arial','Helvetica','Roboto','Open Sans','Oswald','Times New Roman'].forEach(font=>list.push(font));
    const unique=[];
    list.forEach(font=>{
      const normalized = font.trim();
      if (!normalized) return;
      if (!unique.includes(normalized)) unique.push(normalized);
    });
    return unique;
  }

  function populateFontOptions(){
    if (!textFontSelect) return;
    const prev = textFontSelect.value;
    textFontSelect.innerHTML='';
    availableFonts().forEach(font=>{
      const opt=document.createElement('option');
      opt.value=font;
      opt.textContent=font;
      textFontSelect.appendChild(opt);
    });
    if (textFontSelect.options.length){
      const values = Array.from(textFontSelect.options).map(opt=>opt.value);
      textFontSelect.value = (prev && values.includes(prev)) ? prev : textFontSelect.options[0].value;
    }
  }

  function viewLabelForValue(pid, value){
    const list = typesForProduct(pid);
    const lower = (value || '').toString().toLowerCase();
    const found = list.find(v=>v.toLowerCase() === lower);
    return found || value;
  }

  function collectCurrentViewStates(){
    const sel = currentSelection();
    const pidPrefix = String(sel.pid || 0) + '|';
    const states={};
    const labels={};
    Object.entries(viewStates).forEach(([key, objects])=>{
      if (pidPrefix && !key.startsWith(pidPrefix)) return;
      const viewValue = key.slice(pidPrefix.length);
      states[viewValue] = objects;
      labels[viewValue] = viewLabelForValue(sel.pid, viewValue);
    });
    const currentKey = viewKey(sel).slice(pidPrefix.length);
    typesForProduct(sel.pid).forEach(name=>{
      const value = (name ?? '').toString().toLowerCase();
      if (!states[value]){
        states[value] = viewStates[pidPrefix + value] || [];
      }
      if (!labels[value]){
        labels[value] = viewLabelForValue(sel.pid, value);
      }
    });
    return {states, labels, current: currentKey};
  }

  function ensureFontOption(font){
    if (!textFontSelect || !font) return;
    const values = Array.from(textFontSelect.options).map(opt=>opt.value);
    if (!values.includes(font)){
      const opt=document.createElement('option');
      opt.value=font;
      opt.textContent=font;
      textFontSelect.appendChild(opt);
    }
  }

  function applyToActiveText(mutator){
    const obj = c.getActiveObject();
    if (!isTextObject(obj)) return null;
    mutator(obj);
    markDirty();
    obj.setCoords();
    c.requestRenderAll();
    storeCurrentDesign(viewKey());
    return obj;
  }

  function syncTextControls(obj){
    if (!obj || !isTextObject(obj)){ toggleTextSettings(false); return; }
    toggleTextSettings(true);
    if (textFontSelect){
      const font = (obj.fontFamily || textFontSelect.value || '').toString();
      if (font){
        ensureFontOption(font);
        textFontSelect.value = font;
      }
    }
    if (textSizeInput){
      textSizeInput.value = Math.round(obj.fontSize || 48);
    }
    if (textColorInput){
      if (typeof obj.fill === 'string' && /^#/.test(obj.fill)){
        textColorInput.value = obj.fill;
      }else if (typeof obj.fill === 'string' && /^rgb/.test(obj.fill)){
        textColorInput.value = rgbToHex(obj.fill);
      }
    }
    textAlignButtons.forEach(btn=>{
      const align = btn.dataset.align;
      btn.classList.toggle('active', align === obj.textAlign);
    });
    if (textBoldBtn){
      const weight = (obj.fontWeight || '').toString().toLowerCase();
      const isBold = weight === 'bold' || parseInt(weight,10) >= 600;
      textBoldBtn.classList.toggle('active', !!isBold);
    }
    if (textItalicBtn){
      const style = (obj.fontStyle || '').toString().toLowerCase();
      textItalicBtn.classList.toggle('active', style === 'italic');
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
      x: toNumber(areaRaw.x, fallbackArea.x),
      y: toNumber(areaRaw.y, fallbackArea.y),
      w: toNumber(areaRaw.w, fallbackArea.w),
      h: toNumber(areaRaw.h, fallbackArea.h)
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
  populateFontOptions();
  populateProducts();
  populateViews();
  populateColorsSizes();
  setMockupBgAndArea();
  restoreDesignForKey(viewKey());
  updateSummary();
  updateLastSelectionKey();
  maybeFetchRemoteSettings();

  if (productSel){
    productSel.addEventListener('change', ()=>{
      const prevKey = lastSelectionKey;
      if (prevKey){ storeCurrentDesign(prevKey); }
      populateViews();
      populateColorsSizes();
      setMockupBgAndArea();
      restoreDesignForKey(viewKey());
      updateSummary();
      updateLastSelectionKey();
      markDirty();
    });
  }

  if (viewSel){
    viewSel.addEventListener('change', ()=>{
      const prevKey = lastSelectionKey;
      if (prevKey && prevKey !== viewKey()){ storeCurrentDesign(prevKey); }
      highlightView(viewSel.value);
      setMockupBgAndArea();
      restoreDesignForKey(viewKey());
      updateSummary();
      updateLastSelectionKey();
    });
  }

  if (colorSel){
    colorSel.addEventListener('change', ()=>{
      storeCurrentDesign(viewKey());
      highlightColor(colorSel.value);
      updateSummary();
      setMockupBgAndArea();
      restoreDesignForKey(viewKey());
      markDirty();
    });
  }

  if (sizeSel){
    sizeSel.addEventListener('change', ()=>{
      highlightSize(sizeSel.value);
      updateSummary();
      storeCurrentDesign(viewKey());
      markDirty();
    });
  }

  // Apply constraints on interactions
  c.on('object:added', e=>{
    const obj = e.target;
    if (!obj || isRestoring) return;
    if (isDesignObject(obj)){
      keepObjectInside(obj);
      markDirty();
      storeCurrentDesign(viewKey());
    }
  });
  c.on('object:moving', e=>{ keepObjectInside(e.target, {fit:false}); });
  c.on('object:scaling', e=>{ keepObjectInside(e.target); });
  c.on('object:rotating', e=>{ keepObjectInside(e.target); });
  c.on('object:modified', e=>{
    const obj = e.target;
    if (!obj) return;
    keepObjectInside(obj);
    if (isDesignObject(obj)){
      markDirty();
      storeCurrentDesign(viewKey());
    }
  });
  c.on('object:removed', e=>{
    if (isRestoring) return;
    if (isDesignObject(e.target)){
      markDirty();
      storeCurrentDesign(viewKey());
    }
  });

  function handleSelectionChange(){
    syncTextControls(c.getActiveObject());
  }

  c.on('selection:created', handleSelectionChange);
  c.on('selection:updated', handleSelectionChange);
  c.on('selection:cleared', ()=>{ toggleTextSettings(false); });

  // Tools
  document.getElementById('nb-add-text').onclick = () => {
    const a = c.__nb_area || fallbackArea;
    const textboxWidth = Math.max(60, a.w - 20);
    const t = new fabric.Textbox('Saját szöveg',{
      fill:'#000',
      fontSize:48,
      width: textboxWidth,
      left:a.x + 10,
      top:a.y + 10,
      fontFamily: textFontSelect ? textFontSelect.value : undefined
    });
    c.add(t).setActiveObject(t);
    keepObjectInside(t);
    syncTextControls(t);
    markDirty();
    storeCurrentDesign(viewKey());
  };

  const uploadInput = document.getElementById('nb-upload');
  if (uploadInput){
    uploadInput.onchange = e=>{
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
        markDirty();
        storeCurrentDesign(viewKey());
      });
    };
  }

  if (quantityInput){
    quantityInput.value = sanitizeQuantity(quantityInput.value);
    quantityInput.addEventListener('change', ()=>{
      quantityInput.value = sanitizeQuantity(quantityInput.value);
      updateSummary();
    });
    quantityInput.addEventListener('input', ()=>{
      quantityInput.value = sanitizeQuantity(quantityInput.value);
      updateSummary();
    });
  }
  if (qtyMinusBtn){
    qtyMinusBtn.addEventListener('click', ()=>{
      if (!quantityInput) return;
      const next = Math.max(1, sanitizeQuantity(quantityInput.value) - 1);
      quantityInput.value = next;
      updateSummary();
    });
  }
  if (qtyPlusBtn){
    qtyPlusBtn.addEventListener('click', ()=>{
      if (!quantityInput) return;
      const next = sanitizeQuantity(quantityInput.value) + 1;
      quantityInput.value = next;
      updateSummary();
    });
  }

  if (textFontSelect){
    textFontSelect.addEventListener('change', ()=>{
      const font = textFontSelect.value;
      applyToActiveText(obj=>obj.set('fontFamily', font));
      syncTextControls(c.getActiveObject());
    });
  }
  if (textSizeInput){
    const applySize = ()=>{
      const size = parseFloat(textSizeInput.value);
      if (!Number.isFinite(size) || size <= 0) return;
      applyToActiveText(obj=>obj.set('fontSize', size));
    };
    textSizeInput.addEventListener('change', applySize);
    textSizeInput.addEventListener('input', applySize);
  }
  if (textColorInput){
    textColorInput.addEventListener('input', ()=>{
      const color = textColorInput.value;
      applyToActiveText(obj=>obj.set('fill', color));
    });
  }
  textAlignButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const align = btn.dataset.align;
      const result = applyToActiveText(obj=>obj.set('textAlign', align));
      if (!result) return;
      textAlignButtons.forEach(other=>other.classList.toggle('active', other === btn));
    });
  });
  if (textBoldBtn){
    textBoldBtn.addEventListener('click', ()=>{
      const obj = c.getActiveObject();
      if (!isTextObject(obj)) return;
      const willBeBold = !textBoldBtn.classList.contains('active');
      applyToActiveText(target=>target.set('fontWeight', willBeBold ? 'bold' : 'normal'));
      textBoldBtn.classList.toggle('active', willBeBold);
    });
  }
  if (textItalicBtn){
    textItalicBtn.addEventListener('click', ()=>{
      const obj = c.getActiveObject();
      if (!isTextObject(obj)) return;
      const willBeItalic = !textItalicBtn.classList.contains('active');
      applyToActiveText(target=>target.set('fontStyle', willBeItalic ? 'italic' : 'normal'));
      textItalicBtn.classList.toggle('active', willBeItalic);
    });
  }

  const saveBtn = document.getElementById('nb-save');
  if (saveBtn){
    saveBtn.onclick = async ()=>{
      storeCurrentDesign(viewKey());
      const png = c.toDataURL({format:'png', multiplier:2, left:0, top:0});
      const sel = currentSelection();
      const size  = sizeSel.value||'';
      const price_ctx = {product_id:sel.pid, type:sel.type, color:sel.color, size, quantity:sel.quantity};
      const viewPayload = collectCurrentViewStates();
      const meta={
        width_mm:300,
        height_mm:400,
        dpi:300,
        product_id:sel.pid,
        attributes_json:{pa_type:sel.type, pa_color: sel.color, pa_size: size},
        price_ctx,
        quantity: sel.quantity,
        view_states:viewPayload.states,
        view_labels:viewPayload.labels,
        active_view:viewPayload.current
      };
      const layersPayload = {
        active_view: viewPayload.current,
        active_canvas: c.toJSON(),
        views: viewPayload.states
      };
      try{
        const res = await fetch(NB_DESIGNER.rest+'save',{method:'POST',
          headers:{'X-WP-Nonce':NB_DESIGNER.nonce,'Content-Type':'application/json'},
          body:JSON.stringify({png_base64:png, layers:layersPayload, meta})
        });
        const j=await res.json(); if(!res.ok){alert(j.message||'Mentési hiba'); return;}
        savedDesignId=j.design_id;
        if (addToCartBtn){ addToCartBtn.disabled=false; }
        alert('Mentve! ID: '+savedDesignId);
      }catch(e){ alert('Hálózati hiba'); }
    };
  }

  if (addToCartBtn){
    addToCartBtn.disabled=true;
    addToCartBtn.onclick = async ()=>{
      if(!savedDesignId) return alert('Előbb ments!');
      try{
        const res = await fetch(NB_DESIGNER.rest+'add-to-cart',{method:'POST',
          headers:{'X-WP-Nonce':NB_DESIGNER.nonce,'Content-Type':'application/json'},
          body:JSON.stringify({design_id:savedDesignId, quantity: currentSelection().quantity})
        });
        const j=await res.json(); if(!res.ok){alert(j.message||'Kosár hiba'); return;}
        window.location = j.redirect;
      }catch(e){ alert('Hálózati hiba'); }
    };
  }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
