(function(){
  if (typeof fabric === 'undefined') return;
  const canvasEl = document.getElementById('nb-canvas');
  if (!canvasEl) return;

  const settings = (typeof NB_DESIGNER !== 'undefined' && NB_DESIGNER.settings) ? NB_DESIGNER.settings : {};
  const c = new fabric.Canvas('nb-canvas', {preserveObjectStacking:true, backgroundColor:'#fff'});

  const defaultCanvasSize = {w:c.width, h:c.height};
  const fallbackArea = {
    x: Math.round(defaultCanvasSize.w * 0.15),
    y: Math.round(defaultCanvasSize.h * 0.15),
    w: Math.round(defaultCanvasSize.w * 0.7),
    h: Math.round(defaultCanvasSize.h * 0.7),
    canvas_w: defaultCanvasSize.w,
    canvas_h: defaultCanvasSize.h
  };

  function parseNumeric(value){
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string'){
      const trimmed = value.trim();
      if (!trimmed) return null;
      const num = Number(trimmed);
      if (Number.isFinite(num)) return num;
    }
    return null;
  }

  function numberOr(value, fallback){
    const num = parseNumeric(value);
    return num === null ? fallback : num;
  }

  function positiveNumberOr(value, fallback){
    const num = parseNumeric(value);
    return (num === null || num <= 0) ? fallback : num;
  }

  function loadMockupImage(url){
    return new Promise((resolve, reject)=>{
      if (!url){
        reject(new Error('no-url'));
        return;
      }
      const attempt = (crossOrigin, next)=>{
        fabric.util.loadImage(url, (img, isError)=>{
          if (isError || !img){
            if (typeof next === 'function'){
              next();
            } else {
              reject(new Error('mockup-load-failed'));
            }
            return;
          }
          resolve(new fabric.Image(img, {crossOrigin: crossOrigin || ''}));
        }, null, crossOrigin);
      };
      attempt('anonymous', ()=>attempt(null, null));
    });
  }

  function mockupImageUrl(mk){
    if (!mk || typeof mk !== 'object') return '';
    const candidates = [
      mk.image_url,
      mk.imageUrl,
      mk.url,
      mk.image,
      mk.src,
      mk.background_url,
      mk.backgroundUrl,
      mk.background
    ];
    for (let i=0;i<candidates.length;i++){
      const value = candidates[i];
      if (typeof value === 'string' && value.trim()){
        return value.trim();
      }
    }
    return '';
  }

  const typeSel = document.getElementById('nb-type');
  const productSel = document.getElementById('nb-product');
  const colorSel = document.getElementById('nb-color');
  const sizeSel = document.getElementById('nb-size');
  if (!typeSel || !productSel || !colorSel || !sizeSel) return;
  const typePills = document.getElementById('nb-type-pills');
  const colorSwatches = document.getElementById('nb-color-swatches');
  const sizeButtonsWrap = document.getElementById('nb-size-buttons');
  const selectionSummaryEl = document.getElementById('nb-selection-summary');
  const productTitleEl = document.getElementById('nb-product-title');
  const productMetaEl = document.getElementById('nb-product-meta');
  const priceDisplayEl = document.getElementById('nb-price-display');
  const fontFamilySel = document.getElementById('nb-font-family');
  const fontSizeInput = document.getElementById('nb-font-size');
  const fontSizeValue = document.getElementById('nb-font-size-value');
  const fontColorInput = document.getElementById('nb-font-color');
  const fontBoldToggle = document.getElementById('nb-font-bold');
  const fontItalicToggle = document.getElementById('nb-font-italic');
  const alignButtons = Array.from(document.querySelectorAll('[data-nb-align]'));
  const clearButton = document.getElementById('nb-clear-design');
  const addToCartBtn = document.getElementById('nb-add-to-cart');
  const saveBtn = document.getElementById('nb-save');
  const uploadInput = document.getElementById('nb-upload');
  const addTextBtn = document.getElementById('nb-add-text');

  const toggleButtons = Array.from(document.querySelectorAll('[data-nb-toggle]'));
  toggleButtons.forEach(btn=>{
    const target = btn.dataset.nbToggle;
    if (!target) return;
    const panel = document.querySelector(`[data-nb-panel="${target}"]`);
    if (!panel) return;
    let expanded = !panel.hasAttribute('hidden');
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    btn.addEventListener('click', ()=>{
      expanded = !expanded;
      panel.hidden = !expanded;
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  });

  const loadedFontUrls = new Set();
  const designState = {savedDesignId:null};

  function getCatalog(){ return settings.catalog || {}; }
  function productList(){ return settings.products || []; }
  function mockups(){
    const raw = settings.mockups;
    if (Array.isArray(raw)){
      return raw.filter(Boolean);
    }
    if (raw && typeof raw === 'object'){
      return Object.keys(raw).map(key=>raw[key]).filter(Boolean);
    }
    return [];
  }

  function mockupIndexById(id, arr){
    if (id === undefined || id === null) return -1;
    const key = String(id).trim();
    if (!key) return -1;
    const list = Array.isArray(arr) ? arr : mockups();
    const keyNumeric = parseNumeric(key);
    for (let i=0;i<list.length;i++){
      const mk = list[i];
      if (!mk || mk.id === undefined || mk.id === null) continue;
      const mkId = String(mk.id).trim();
      if (!mkId) continue;
      if (mkId === key) return i;
      if (keyNumeric !== null && mkId === String(keyNumeric)) return i;
    }
    return -1;
  }
  function types(){ return settings.types || ['Póló','Pulóver']; }
  function fontEntries(){ return settings.fonts || []; }

  function parseFontEntry(entry){
    if (typeof entry !== 'string') return null;
    const parts = entry.split('|').map(p=>p.trim()).filter(Boolean);
    if (!parts.length) return null;
    if (parts.length === 1){
      return {label: parts[0], family: parts[0], url: ''};
    }
    if (parts.length === 2){
      return {label: parts[0], family: parts[0], url: parts[1]};
    }
    return {label: parts[0], family: parts[1], url: parts[2]};
  }

  function ensureFontLoaded(font){
    if (!font || !font.url || loadedFontUrls.has(font.url)) return;
    loadedFontUrls.add(font.url);
    if (/\.(woff2?|ttf|otf|eot)$/i.test(font.url) && typeof FontFace !== 'undefined'){
      try {
        const face = new FontFace(font.family, `url(${font.url})`);
        face.load().then(f=>{
          if (document.fonts && document.fonts.add){
            document.fonts.add(f);
          }
          c.requestRenderAll();
        }).catch(()=>{});
      } catch(e){ /* ignore */ }
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);
    }
  }

  function addFontOption(font){
    if (!fontFamilySel || !font || !font.family) return;
    const exists = Array.from(fontFamilySel.options).some(opt=>opt.value === font.family);
    if (exists) return;
    const opt = document.createElement('option');
    opt.value = font.family;
    opt.textContent = font.label || font.family;
    fontFamilySel.appendChild(opt);
    ensureFontLoaded(font);
  }

  function populateFontOptions(){
    if (!fontFamilySel) return;
    fontFamilySel.innerHTML = '';
    const defaults = [
      {label:'Arial', family:'Arial'},
      {label:'Roboto', family:'Roboto', url:'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'},
      {label:'Montserrat', family:'Montserrat', url:'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap'},
      {label:'Lato', family:'Lato', url:'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap'}
    ];
    defaults.forEach(addFontOption);
    fontEntries().map(parseFontEntry).forEach(addFontOption);
    if (!fontFamilySel.value && fontFamilySel.options.length){
      fontFamilySel.value = fontFamilySel.options[0].value;
    }
  }

  function formatColorLabel(str){
    if (typeof str !== 'string') return '';
    const trimmed = str.trim();
    const bracket = trimmed.replace(/\s*\([^)]*\)\s*$/, '');
    if (bracket.length) return bracket;
    return trimmed;
  }

  function colorCodeFromText(str){
    if (typeof str !== 'string') return '';
    const hexMatch = str.match(/#([0-9a-f]{3,8})/i);
    if (hexMatch) return `#${hexMatch[1]}`;
    const cleaned = str.replace(/\([^)]*\)/g,'').trim().toLowerCase();
    const canCheck = typeof CSS !== 'undefined' && typeof CSS.supports === 'function';
    if (cleaned && canCheck && CSS.supports('color', cleaned)) return cleaned;
    return '';
  }

  function ensureSelectValue(selectEl){
    if (!selectEl) return;
    const values = Array.from(selectEl.options).map(o=>o.value);
    if (!values.length){
      selectEl.value = '';
      return;
    }
    if (!values.includes(selectEl.value)){
      selectEl.value = values[0];
    }
  }

  function renderTypePills(){
    if (!typePills) return;
    typePills.innerHTML = '';
    Array.from(typeSel.options).forEach(opt=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-pill' + (opt.value === typeSel.value ? ' is-active' : '');
      btn.textContent = opt.dataset.label || opt.textContent;
      btn.onclick = () => {
        typeSel.value = opt.value;
        renderTypePills();
        setMockupBgAndArea();
        updateSelectionSummary();
      };
      typePills.appendChild(btn);
    });
    if (!typeSel.options.length){
      const span = document.createElement('div');
      span.className = 'nb-empty';
      span.textContent = 'Nincs típus konfigurálva.';
      typePills.appendChild(span);
    }
  }

  function renderColorSwatches(){
    if (!colorSwatches) return;
    colorSwatches.innerHTML = '';
    const options = Array.from(colorSel.options);
    if (!options.length){
      const empty = document.createElement('div');
      empty.className = 'nb-empty';
      empty.textContent = 'Ehhez a termékhez nincs szín beállítva.';
      colorSwatches.appendChild(empty);
      return;
    }
    options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-swatch' + (opt.value === colorSel.value ? ' is-active' : '');
      const colorCode = colorCodeFromText(opt.dataset.rawColor || opt.dataset.original || opt.textContent);
      if (colorCode){
        btn.style.setProperty('--swatch-color', colorCode);
      }
      const label = opt.dataset.display || opt.textContent;
      btn.innerHTML = `<span class="nb-swatch-color"></span><span class="nb-swatch-label">${label}</span>`;
      btn.onclick = ()=>{
        colorSel.value = opt.value;
        renderColorSwatches();
        setMockupBgAndArea();
        updateSelectionSummary();
      };
      colorSwatches.appendChild(btn);
    });
  }

  function renderSizeButtons(){
    if (!sizeButtonsWrap) return;
    sizeButtonsWrap.innerHTML = '';
    const options = Array.from(sizeSel.options);
    if (!options.length){
      const empty = document.createElement('div');
      empty.className = 'nb-empty';
      empty.textContent = 'Nincs méret megadva.';
      sizeButtonsWrap.appendChild(empty);
      return;
    }
    options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-pill' + (opt.value === sizeSel.value ? ' is-active' : '');
      btn.textContent = opt.textContent;
      btn.onclick = ()=>{
        sizeSel.value = opt.value;
        renderSizeButtons();
        updateSelectionSummary();
      };
      sizeButtonsWrap.appendChild(btn);
    });
  }

  function getColorLabel(){
    const opt = Array.from(colorSel.options).find(o=>o.value === colorSel.value);
    return opt ? (opt.dataset.original || opt.textContent) : '';
  }

  function updateSelectionSummary(){
    const sel = currentSelection();
    const typeLabel = typeSel.selectedOptions[0]?.dataset?.label || typeSel.selectedOptions[0]?.textContent || '';
    const colorLabel = getColorLabel();
    const sizeLabel = sizeSel.value || '';
    if (productTitleEl){
      productTitleEl.textContent = sel.cfg?.title || 'Termék';
    }
    if (productMetaEl){
      const parts = [];
      if (typeLabel) parts.push(`Típus: ${typeLabel}`);
      if (colorLabel) parts.push(`Szín: ${colorLabel}`);
      if (sizeLabel) parts.push(`Méret: ${sizeLabel}`);
      productMetaEl.textContent = parts.join(' • ');
    }
    if (selectionSummaryEl){
      selectionSummaryEl.innerHTML = '';
      if (typeLabel){
        const chip = document.createElement('span');
        chip.textContent = `Típus: ${typeLabel}`;
        selectionSummaryEl.appendChild(chip);
      }
      if (colorLabel){
        const chip = document.createElement('span');
        chip.textContent = `Szín: ${colorLabel}`;
        selectionSummaryEl.appendChild(chip);
      }
      if (sizeLabel){
        const chip = document.createElement('span');
        chip.textContent = `Méret: ${sizeLabel}`;
        selectionSummaryEl.appendChild(chip);
      }
    }
    updatePriceDisplay();
  }

  function updatePriceDisplay(){
    if (!priceDisplayEl) return;
    if (designState.savedDesignId){
      priceDisplayEl.textContent = `Mentve (#${designState.savedDesignId})`;
    } else {
      priceDisplayEl.textContent = 'Az egyedi felár a mentés után kerül kiszámításra.';
    }
  }

  function resolveMockupPointer(value, arr){
    if (value === undefined || value === null) return -1;
    const list = Array.isArray(arr) ? arr : mockups();
    if (!list.length) return -1;
    const numeric = parseNumeric(value);
    if (numeric !== null){
      const idx = Math.floor(numeric);
      if (Number.isFinite(idx) && idx >= 0 && idx < list.length) return idx;
      const byId = mockupIndexById(numeric, list);
      if (byId >= 0) return byId;
    }
    const str = String(value).trim();
    if (!str) return -1;
    const direct = mockupIndexById(str, list);
    if (direct >= 0) return direct;
    const tokens = str.match(/-?\d+/g);
    if (tokens){
      for (let i=0;i<tokens.length;i++){
        const token = parseInt(tokens[i], 10);
        if (!Number.isFinite(token)) continue;
        if (token >= 0 && token < list.length) return token;
        const byId = mockupIndexById(token, list);
        if (byId >= 0) return byId;
      }
    }
    return -1;
  }

  function normalizedMockupIndex(value, arr){
    return resolveMockupPointer(value, arr);
  }

  function resolveMockupIndex(mapping, arr){
    const list = Array.isArray(arr) ? arr : mockups();
    if (!mapping || typeof mapping !== 'object'){
      return normalizedMockupIndex(mapping, list);
    }
    const candidates = [
      mapping.mockup_index,
      mapping.mockupIndex,
      mapping.mockup_id,
      mapping.mockupId,
      mapping.mockup
    ];
    for (let i=0;i<candidates.length;i++){
      const idx = normalizedMockupIndex(candidates[i], list);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function currentSelection(){
    const pid = parseInt(productSel.value || 0, 10);
    const type = typeSel.value || '';
    const color = colorSel.value || '';
    const cfg = getCatalog()[pid] || {};
    const key = (type + '|' + color).toLowerCase();
    const mapping = (cfg.map || {})[key] || {};
    const list = mockups();
    const mkIndex = resolveMockupIndex(mapping, list);
    const mk = mkIndex >= 0 ? (list[mkIndex] || null) : null;
    return {pid, type, color, cfg, mapping, mockup: mk};
  }

  function referenceSizeForMockup(mk, area){
    const areaW = positiveNumberOr(area?.canvas_w, null);
    const areaH = positiveNumberOr(area?.canvas_h, null);
    if (areaW && areaH){
      return {w: areaW, h: areaH};
    }
    if (mk){
      const nestedW = positiveNumberOr(mk.canvas?.w, null);
      const nestedH = positiveNumberOr(mk.canvas?.h, null);
      if (nestedW && nestedH){
        return {w: nestedW, h: nestedH};
      }
      const canvasW = positiveNumberOr(mk.canvas_w, null);
      const canvasH = positiveNumberOr(mk.canvas_h, null);
      if (canvasW && canvasH){
        return {w: canvasW, h: canvasH};
      }
    }
    return {w: defaultCanvasSize.w, h: defaultCanvasSize.h};
  }

  function applyCanvasSize(size){
    const canvasElement = c.getElement();
    const sizeW = positiveNumberOr(size?.w, defaultCanvasSize.w);
    const sizeH = positiveNumberOr(size?.h, defaultCanvasSize.h);
    const targetW = sizeW > 0 ? sizeW : defaultCanvasSize.w;
    const targetH = sizeH > 0 ? sizeH : defaultCanvasSize.h;
    let changed = false;
    if (c.width !== targetW){
      c.setWidth(targetW);
      canvasElement.width = targetW;
      canvasElement.style.width = targetW + 'px';
      changed = true;
    }
    if (c.height !== targetH){
      c.setHeight(targetH);
      canvasElement.height = targetH;
      canvasElement.style.height = targetH + 'px';
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
    const opts = Object.assign({fit:true}, options || {});
    if (opts.fit){
      fitWithinArea(obj);
    }
    constrainToArea(obj);
    c.requestRenderAll();
  }

  function enforceAllObjectsInside(){
    designObjects().forEach(obj=>keepObjectInside(obj));
  }

  function markDesignDirty(){
    designState.savedDesignId = null;
    if (addToCartBtn) addToCartBtn.disabled = true;
    updatePriceDisplay();
  }

  function setMockupBgAndArea(){
    const {mockup: mk} = currentSelection();

    c.getObjects().slice().forEach(obj=>{ if (obj.__nb_bg) c.remove(obj); });
    c.getObjects().slice().forEach(obj=>{ if (obj.__nb_area) c.remove(obj); });

    const areaRaw = mk && mk.area ? Object.assign({}, mk.area) : Object.assign({}, fallbackArea);
    const refSize = referenceSizeForMockup(mk, areaRaw);
    const appliedSize = applyCanvasSize(refSize);

    const baseArea = {
      x: numberOr(areaRaw.x, fallbackArea.x),
      y: numberOr(areaRaw.y, fallbackArea.y),
      w: positiveNumberOr(areaRaw.w, fallbackArea.w),
      h: positiveNumberOr(areaRaw.h, fallbackArea.h)
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
      fill: 'rgba(59,130,246,0.08)',
      stroke: '#2563eb',
      strokeWidth: 2,
      strokeDashArray: [10,6],
      selectable: false,
      evented: false
    });
    printArea.__nb_area = true;
    c.add(printArea);
    c.__nb_area = area;
    c.__nb_area_rect = printArea;

    const loadToken = Symbol('mockup');
    c.__nb_bg_token = loadToken;
    c.setBackgroundImage(null, c.renderAll.bind(c));
    const mockupUrl = mockupImageUrl(mk);
    if (mockupUrl){
      loadMockupImage(mockupUrl).then(img=>{
        if (c.__nb_bg_token !== loadToken) return;
        const scale = Math.min(c.width / img.width, c.height / img.height) || 1;
        img.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          scaleX: scale,
          scaleY: scale
        });
        c.setBackgroundImage(img, c.renderAll.bind(c));
      }).catch(()=>{
        if (c.__nb_bg_token !== loadToken) return;
        c.requestRenderAll();
      });
    }

    enforceAllObjectsInside();
  }

  function applyToActiveText(cb){
    const obj = c.getActiveObject();
    if (!obj || obj.type !== 'textbox') return;
    cb(obj);
    obj.setCoords();
    c.requestRenderAll();
    markDesignDirty();
  }

  function activeTextbox(){
    const obj = c.getActiveObject();
    return (obj && obj.type === 'textbox') ? obj : null;
  }

  function toHexColor(color){
    if (!color) return '#000000';
    if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
    const tester = document.createElement('canvas');
    tester.width = tester.height = 1;
    const ctx = tester.getContext && tester.getContext('2d');
    if (!ctx) return '#000000';
    try{
      ctx.fillStyle = color;
      return ctx.fillStyle || '#000000';
    }catch(e){
      return '#000000';
    }
  }

  function setPressed(btn, state){
    if (!btn) return;
    btn.setAttribute('aria-pressed', state ? 'true' : 'false');
    if (state){
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  function syncTextControls(){
    const textbox = activeTextbox();
    const hasTextbox = !!textbox;
    const controls = [fontFamilySel, fontSizeInput, fontColorInput, fontBoldToggle, fontItalicToggle].concat(alignButtons);
    controls.forEach(ctrl=>{ if (ctrl) ctrl.disabled = !hasTextbox; });
    if (!hasTextbox){
      setPressed(fontBoldToggle, false);
      setPressed(fontItalicToggle, false);
      alignButtons.forEach(btn=>setPressed(btn, false));
      if (fontSizeValue) fontSizeValue.textContent = (fontSizeInput ? fontSizeInput.value : '0') + ' px';
      return;
    }
    if (fontFamilySel){
      const exists = Array.from(fontFamilySel.options).some(opt=>opt.value === textbox.fontFamily);
      if (!exists && textbox.fontFamily){
        const opt = document.createElement('option');
        opt.value = textbox.fontFamily;
        opt.textContent = textbox.fontFamily;
        fontFamilySel.appendChild(opt);
      }
      if (textbox.fontFamily){
        fontFamilySel.value = textbox.fontFamily;
      }
    }
    if (fontSizeInput){
      const size = Math.round(textbox.fontSize || parseInt(fontSizeInput.value,10) || 48);
      fontSizeInput.value = size;
      if (fontSizeValue) fontSizeValue.textContent = size + ' px';
    }
    if (fontColorInput){
      fontColorInput.value = toHexColor(textbox.fill || '#000000');
    }
    setPressed(fontBoldToggle, (textbox.fontWeight || '').toString().toLowerCase() === 'bold' || parseInt(textbox.fontWeight,10) >= 600);
    setPressed(fontItalicToggle, (textbox.fontStyle || '').toString().toLowerCase() === 'italic');
    alignButtons.forEach(btn=>{
      setPressed(btn, textbox.textAlign === btn.dataset.nbAlign);
    });
  }

  function currentFontFamily(){
    return fontFamilySel && fontFamilySel.value ? fontFamilySel.value : 'Arial';
  }

  function currentFontSize(){
    return fontSizeInput ? parseInt(fontSizeInput.value, 10) || 48 : 48;
  }

  function currentFontColor(){
    return fontColorInput && fontColorInput.value ? fontColorInput.value : '#000000';
  }

  function currentFontWeight(){
    return fontBoldToggle && fontBoldToggle.getAttribute('aria-pressed') === 'true' ? '700' : '400';
  }

  function currentFontStyle(){
    return fontItalicToggle && fontItalicToggle.getAttribute('aria-pressed') === 'true' ? 'italic' : 'normal';
  }

  function currentTextAlign(){
    const btn = alignButtons.find(b=>b.getAttribute('aria-pressed') === 'true');
    return btn ? btn.dataset.nbAlign : 'center';
  }

  function initAlignDefault(){
    if (!alignButtons.length) return;
    let found = alignButtons.some(btn=>btn.getAttribute('aria-pressed') === 'true');
    if (!found){
      const centerBtn = alignButtons.find(btn=>btn.dataset.nbAlign === 'center');
      if (centerBtn){
        setPressed(centerBtn, true);
      }
    }
  }

  function populateTypes(){
    typeSel.innerHTML = '';
    types().forEach(t=>{
      const label = (t || '').toString().trim();
      if (!label) return;
      const opt = document.createElement('option');
      opt.value = label.toLowerCase();
      opt.textContent = label;
      opt.dataset.label = label;
      typeSel.appendChild(opt);
    });
    ensureSelectValue(typeSel);
    renderTypePills();
  }

  function populateProducts(){
    const cat = getCatalog();
    productSel.innerHTML = '';
    productList().forEach(pid=>{
      const cfg = cat[pid] || {};
      const opt = document.createElement('option');
      opt.value = pid;
      opt.textContent = cfg.title || ('Termék #' + pid);
      productSel.appendChild(opt);
    });
    ensureSelectValue(productSel);
  }

  function populateColorsSizes(){
    const pid = parseInt(productSel.value || 0, 10);
    const cfg = getCatalog()[pid] || {};
    colorSel.innerHTML = '';
    (cfg.colors || []).forEach(colorName=>{
      const original = (colorName || '').toString().trim();
      if (!original) return;
      const opt = document.createElement('option');
      opt.value = original.toLowerCase();
      opt.textContent = formatColorLabel(original);
      opt.dataset.original = original;
      opt.dataset.display = formatColorLabel(original);
      opt.dataset.rawColor = original;
      colorSel.appendChild(opt);
    });
    ensureSelectValue(colorSel);
    renderColorSwatches();

    sizeSel.innerHTML = '';
    (cfg.sizes || []).forEach(size=>{
      const val = (size || '').toString().trim();
      if (!val) return;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      sizeSel.appendChild(opt);
    });
    ensureSelectValue(sizeSel);
    renderSizeButtons();
  }

  // initial populate
  populateFontOptions();
  populateTypes();
  populateProducts();
  populateColorsSizes();
  initAlignDefault();
  setMockupBgAndArea();
  updateSelectionSummary();
  syncTextControls();

  if (typeSel) typeSel.onchange = ()=>{ renderTypePills(); setMockupBgAndArea(); updateSelectionSummary(); markDesignDirty(); };
  if (productSel) productSel.onchange = ()=>{ populateColorsSizes(); setMockupBgAndArea(); updateSelectionSummary(); markDesignDirty(); };
  if (colorSel) colorSel.onchange = ()=>{ renderColorSwatches(); setMockupBgAndArea(); updateSelectionSummary(); markDesignDirty(); };
  if (sizeSel) sizeSel.onchange = ()=>{ renderSizeButtons(); updateSelectionSummary(); markDesignDirty(); };

  c.on('object:added', e=>{ if (isDesignObject(e.target)){ keepObjectInside(e.target); markDesignDirty(); }});
  c.on('object:moving', e=>{ keepObjectInside(e.target, {fit:false}); });
  c.on('object:scaling', e=>{ keepObjectInside(e.target); markDesignDirty(); });
  c.on('object:rotating', e=>{ keepObjectInside(e.target); markDesignDirty(); });
  c.on('object:modified', e=>{ if (isDesignObject(e.target)) markDesignDirty(); });
  c.on('object:removed', e=>{ if (isDesignObject(e.target)) markDesignDirty(); });
  c.on('selection:created', ()=>{ syncTextControls(); });
  c.on('selection:updated', ()=>{ syncTextControls(); });
  c.on('selection:cleared', ()=>{ syncTextControls(); });

  if (fontFamilySel){
    fontFamilySel.onchange = ()=>{
      const family = fontFamilySel.value;
      applyToActiveText(obj=>{ obj.set('fontFamily', family); });
    };
  }

  if (fontSizeInput){
    fontSizeInput.oninput = ()=>{
      const size = parseInt(fontSizeInput.value, 10) || 12;
      if (fontSizeValue) fontSizeValue.textContent = size + ' px';
      applyToActiveText(obj=>{ obj.set('fontSize', size); });
    };
  }

  if (fontColorInput){
    fontColorInput.onchange = ()=>{
      const color = fontColorInput.value || '#000000';
      applyToActiveText(obj=>{ obj.set('fill', color); });
    };
  }

  if (fontBoldToggle){
    fontBoldToggle.onclick = ()=>{
      const next = fontBoldToggle.getAttribute('aria-pressed') !== 'true';
      setPressed(fontBoldToggle, next);
      applyToActiveText(obj=>{ obj.set('fontWeight', next ? '700' : '400'); });
    };
  }

  if (fontItalicToggle){
    fontItalicToggle.onclick = ()=>{
      const next = fontItalicToggle.getAttribute('aria-pressed') !== 'true';
      setPressed(fontItalicToggle, next);
      applyToActiveText(obj=>{ obj.set('fontStyle', next ? 'italic' : 'normal'); });
    };
  }

  alignButtons.forEach(btn=>{
    btn.onclick = ()=>{
      alignButtons.forEach(other=>setPressed(other, other === btn));
      const value = btn.dataset.nbAlign || 'left';
      applyToActiveText(obj=>{ obj.set('textAlign', value); });
    };
  });

  if (addTextBtn){
    addTextBtn.onclick = () => {
      const a = c.__nb_area || fallbackArea;
      const textboxWidth = Math.max(80, a.w - 40);
      const t = new fabric.Textbox('Írd ide a feliratot',{ 
        fill: currentFontColor(),
        fontSize: currentFontSize(),
        width: textboxWidth,
        left: a.x + (a.w - textboxWidth)/2,
        top: a.y + 20,
        fontFamily: currentFontFamily(),
        fontWeight: currentFontWeight(),
        fontStyle: currentFontStyle(),
        textAlign: currentTextAlign(),
        cornerStyle:'circle',
        transparentCorners:false,
        lockScalingFlip:true
      });
      c.add(t).setActiveObject(t);
      keepObjectInside(t);
      syncTextControls();
    };
  }

  if (uploadInput){
    uploadInput.addEventListener('change', e=>{
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      fabric.Image.fromURL(url, img=>{
        URL.revokeObjectURL(url);
        const a = c.__nb_area || fallbackArea;
        const maxW = a.w * 0.95;
        const maxH = a.h * 0.95;
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        img.scale(scale);
        img.set({
          left: a.x + (a.w - img.getScaledWidth())/2,
          top: a.y + (a.h - img.getScaledHeight())/2,
          selectable: true,
          cornerStyle: 'circle',
          transparentCorners: false,
          lockScalingFlip: true
        });
        c.add(img);
        c.setActiveObject(img);
        keepObjectInside(img);
      });
      e.target.value = '';
    });
  }

  if (clearButton){
    clearButton.onclick = ()=>{
      designObjects().forEach(obj=>c.remove(obj));
      c.discardActiveObject();
      c.requestRenderAll();
      markDesignDirty();
      syncTextControls();
    };
  }

  let saving = false;
  if (saveBtn){
    saveBtn.onclick = async ()=>{
      if (saving) return;
      saving = true;
      try{
        const png = c.toDataURL({format:'png', multiplier:2, left:0, top:0});
        const sel = currentSelection();
        const size = sizeSel.value || '';
        const price_ctx = {product_id: sel.pid, type: sel.type, color: sel.color, size};
        const meta = {width_mm:300, height_mm:400, dpi:300, product_id: sel.pid, attributes_json:{pa_type: sel.type, pa_color: sel.color, pa_size: size}, price_ctx};
        const res = await fetch(NB_DESIGNER.rest + 'save', {
          method:'POST',
          headers:{'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type':'application/json'},
          body: JSON.stringify({png_base64: png, layers: c.toJSON(), meta})
        });
        const j = await res.json();
        if (!res.ok){
          alert(j.message || 'Mentési hiba');
          return;
        }
        designState.savedDesignId = j.design_id;
        if (addToCartBtn) addToCartBtn.disabled = false;
        alert('Mentve! ID: ' + designState.savedDesignId);
        updatePriceDisplay();
      }catch(e){
        alert('Hálózati hiba');
      } finally {
        saving = false;
      }
    };
  }

  if (addToCartBtn){
    addToCartBtn.onclick = async ()=>{
      if (!designState.savedDesignId){
        alert('Előbb mentsd a tervet!');
        return;
      }
      try{
        const res = await fetch(NB_DESIGNER.rest + 'add-to-cart', {
          method:'POST',
          headers:{'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type':'application/json'},
          body: JSON.stringify({design_id: designState.savedDesignId})
        });
        const j = await res.json();
        if (!res.ok){
          alert(j.message || 'Kosár hiba');
          return;
        }
        window.location = j.redirect;
      }catch(e){
        alert('Hálózati hiba');
      }
    };
  }
})();
