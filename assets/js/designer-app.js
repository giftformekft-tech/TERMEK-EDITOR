(function(){
  if (typeof fabric === 'undefined') return;
  const canvasEl = document.getElementById('nb-canvas');
  if (!canvasEl) return;

  const baseCanvasSize = {
    w: parseInt(canvasEl.getAttribute('width'), 10) || canvasEl.width || 480,
    h: parseInt(canvasEl.getAttribute('height'), 10) || canvasEl.height || 640
  };
  const settings = (typeof NB_DESIGNER !== 'undefined' && NB_DESIGNER.settings) ? NB_DESIGNER.settings : {};
  const c = new fabric.Canvas('nb-canvas', {preserveObjectStacking:true, backgroundColor:'#fff'});

  const objectUiDefaults = {
    cornerStyle: 'circle',
    transparentCorners: false,
    hasBorders: false,
    borderColor: 'rgba(0,0,0,0)',
    borderOpacityWhenMoving: 0,
    padding: 0,
    cornerPadding: 0
  };

  function applyObjectUiDefaults(obj){
    if (!obj || typeof obj !== 'object') return;
    if (typeof objectUiDefaults.cornerStyle !== 'undefined') obj.cornerStyle = objectUiDefaults.cornerStyle;
    if (typeof objectUiDefaults.transparentCorners !== 'undefined') obj.transparentCorners = objectUiDefaults.transparentCorners;
    if (typeof objectUiDefaults.hasBorders !== 'undefined') obj.hasBorders = objectUiDefaults.hasBorders;
    if (typeof objectUiDefaults.borderColor !== 'undefined') obj.borderColor = objectUiDefaults.borderColor;
    if (typeof objectUiDefaults.borderOpacityWhenMoving !== 'undefined') obj.borderOpacityWhenMoving = objectUiDefaults.borderOpacityWhenMoving;
    if (typeof objectUiDefaults.padding !== 'undefined') obj.padding = objectUiDefaults.padding;
    if (typeof objectUiDefaults.cornerPadding !== 'undefined' && typeof obj.cornerPadding !== 'undefined') obj.cornerPadding = objectUiDefaults.cornerPadding;
  }

  applyObjectUiDefaults(fabric.Object.prototype);

  const baseControlProfile = {
    cornerSize: fabric.Object.prototype.cornerSize,
    touchCornerSize: fabric.Object.prototype.touchCornerSize,
    borderScaleFactor: fabric.Object.prototype.borderScaleFactor,
  };
  function getRetinaScale(){
    if (typeof c.getRetinaScaling === 'function'){
      const scaling = c.getRetinaScaling();
      if (Number.isFinite(scaling) && scaling > 0){
        return scaling;
      }
    }
    if (typeof fabric.devicePixelRatio === 'number' && fabric.devicePixelRatio > 0){
      return fabric.devicePixelRatio;
    }
    if (typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 0){
      return window.devicePixelRatio;
    }
    return 1;
  }
  function profileForKey(key){
    const retina = Math.max(1, getRetinaScale());
    const baseCorner = Number.isFinite(baseControlProfile.cornerSize) && baseControlProfile.cornerSize > 0
      ? baseControlProfile.cornerSize
      : 13;
    const baseTouch = Number.isFinite(baseControlProfile.touchCornerSize) && baseControlProfile.touchCornerSize > 0
      ? baseControlProfile.touchCornerSize
      : Math.max(baseCorner * 2, 26);
    const borderScaleFactor = Number.isFinite(baseControlProfile.borderScaleFactor) && baseControlProfile.borderScaleFactor > 0
      ? baseControlProfile.borderScaleFactor
      : 1;
    const clampCorner = (cssPx, minCss)=>{
      const desiredCss = Math.max(minCss, cssPx);
      const raw = desiredCss / (retina || 1);
      return Math.max(4, Math.round(raw));
    };
    if (key === 'mobile'){
      const cornerSize = clampCorner(baseCorner * 0.55, 8);
      const touchCornerSize = clampCorner(baseTouch * 0.6, 18);
      return {
        cornerSize,
        touchCornerSize: Math.max(touchCornerSize, cornerSize + 2),
        borderScaleFactor,
      };
    }
    const cornerSize = clampCorner(baseCorner, baseCorner);
    const touchCornerSize = clampCorner(baseTouch, baseTouch);
    return {
      cornerSize,
      touchCornerSize: Math.max(touchCornerSize, cornerSize + 2),
      borderScaleFactor,
    };
  }
  let activeControlSignature = '';
  const controlMedia = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    ? window.matchMedia('(max-width: 720px)')
    : null;

  function applyControlProfile(profile){
    if (!profile) return;
    const {cornerSize, touchCornerSize, borderScaleFactor} = profile;
    fabric.Object.prototype.cornerSize = cornerSize;
    fabric.Object.prototype.touchCornerSize = touchCornerSize;
    fabric.Object.prototype.borderScaleFactor = borderScaleFactor;
    applyObjectUiDefaults(fabric.Object.prototype);
    designObjects().forEach(obj=>{
      obj.cornerSize = cornerSize;
      obj.touchCornerSize = touchCornerSize;
      obj.borderScaleFactor = borderScaleFactor;
      applyObjectUiDefaults(obj);
      if (typeof obj.setCoords === 'function'){
        obj.setCoords();
      }
    });
    c.requestRenderAll();
  }

  function refreshControlProfile(){
    const nextKey = controlMedia && controlMedia.matches ? 'mobile' : 'desktop';
    const nextProfile = profileForKey(nextKey);
    const signature = nextProfile
      ? [nextKey, nextProfile.cornerSize, nextProfile.touchCornerSize, nextProfile.borderScaleFactor].join('|')
      : '';
    if (signature && signature === activeControlSignature) return;
    activeControlSignature = signature;
    applyControlProfile(nextProfile || profileForKey('desktop'));
  }

  refreshControlProfile();
  designObjects().forEach(applyObjectUiDefaults);
  if (controlMedia){
    const mediaListener = () => refreshControlProfile();
    if (typeof controlMedia.addEventListener === 'function'){
      controlMedia.addEventListener('change', mediaListener);
    } else if (typeof controlMedia.addListener === 'function'){
      controlMedia.addListener(mediaListener);
    }
  }

  const defaultCanvasSize = {w:baseCanvasSize.w, h:baseCanvasSize.h};
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
  const productModal = document.getElementById('nb-product-modal');
  const productModalTrigger = document.getElementById('nb-product-modal-trigger');
  const modalTypeList = document.getElementById('nb-modal-type-list');
  const colorModal = document.getElementById('nb-color-modal');
  const colorModalTrigger = document.getElementById('nb-color-modal-trigger');
  const modalColorList = document.getElementById('nb-modal-color-list');
  const colorModalLabel = document.getElementById('nb-color-modal-label');
  const sizeButtonsWrap = document.getElementById('nb-size-buttons');
  const bulkModal = document.getElementById('nb-bulk-modal');
  const bulkModalTrigger = document.getElementById('nb-bulk-modal-trigger');
  const bulkModalList = document.getElementById('nb-bulk-size-list');
  const bulkConfirmBtn = document.getElementById('nb-bulk-confirm');
  const bulkDiscountSection = document.getElementById('nb-bulk-discount-section');
  const bulkDiscountTable = document.getElementById('nb-bulk-discount-table');
  const bulkDiscountHint = document.getElementById('nb-bulk-discount-hint');
  const selectionSummaryEl = document.getElementById('nb-selection-summary');
  const productTitleEl = document.getElementById('nb-product-title');
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
  const uploadInput = document.getElementById('nb-upload');
  const addTextBtn = document.getElementById('nb-add-text');
  const layerListEl = document.getElementById('nb-layer-list');

  const loadedFontUrls = new Set();
  const designState = {savedDesignId:null, dirty:true};
  let saving = false;
  let savePromise = null;
  let actionSubmitting = false;
  let layerIdSeq = 1;
  const bulkSizeState = {};
  const bulkDiscountTiers = (()=>{
    const raw = settings.bulk_discounts;
    const tiers = [];
    if (Array.isArray(raw)){
      raw.forEach(entry => {
        if (!entry) return;
        const minRaw = entry.min_qty ?? entry.min ?? entry.from;
        const maxRaw = entry.max_qty ?? entry.max ?? entry.to;
        const pctRaw = entry.percent ?? entry.discount;
        let min = parseInt(minRaw, 10);
        const pct = parseFloat(pctRaw);
        if (!Number.isFinite(min) || min <= 0) return;
        if (!Number.isFinite(pct) || pct <= 0) return;
        let max = parseInt(maxRaw, 10);
        if (!Number.isFinite(max) || max <= 0){
          max = 0;
        }
        if (max > 0 && max < min){
          const temp = min;
          min = max;
          max = temp;
        }
        tiers.push({
          min,
          max,
          percent: pct,
        });
      });
    }
    tiers.sort((a, b)=>{
      if (a.min === b.min){
        const aMax = a.max > 0 ? a.max : Number.MAX_SAFE_INTEGER;
        const bMax = b.max > 0 ? b.max : Number.MAX_SAFE_INTEGER;
        if (aMax === bMax){
          return b.percent - a.percent;
        }
        return aMax - bMax;
      }
      return a.min - b.min;
    });
    return tiers;
  })();

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

  const typeProductAssignments = (() => {
    const raw = settings.type_products;
    const map = {};
    if (raw && typeof raw === 'object'){
      Object.keys(raw).forEach(key => {
        const normalizedKey = normalizedTypeValue(key);
        if (!normalizedKey) return;
        const rawValue = raw[key];
        const parsed = parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        map[normalizedKey] = String(parsed);
      });
    }
    return map;
  })();

  function typeProductMap(){
    return typeProductAssignments;
  }

  function hasSizeValue(){
    if (!sizeSel) return false;
    const value = (sizeSel.value || '').toString().trim();
    return value !== '';
  }

  function hasSizeOptions(){
    if (!sizeSel) return false;
    return Array.from(sizeSel.options || []).some(opt=>{
      return ((opt.value || '').toString().trim() !== '');
    });
  }

  function hasCompleteSelection(){
    const sel = currentSelection();
    if (!sel || !sel.pid) return false;
    if (!sel.type) return false;
    if (!sel.color) return false;
    return hasSizeValue();
  }

  function updateActionStates(){
    const ready = hasCompleteSelection();
    const busy = saving || actionSubmitting;
    if (addToCartBtn){
      addToCartBtn.disabled = !ready || busy;
    }
    if (bulkModalTrigger){
      const sizesAvailable = hasSizeOptions();
      bulkModalTrigger.disabled = !ready || !sizesAvailable || busy;
    }
  }

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

  function normalizedTypeValue(value){
    if (value === undefined || value === null) return '';
    return value.toString().trim().toLowerCase();
  }

  function normalizedColorValue(value){
    if (value === undefined || value === null) return '';
    return value.toString().trim().toLowerCase();
  }

  function colorEntryFromString(colorName){
    const original = (colorName || '').toString().trim();
    if (!original) return null;
    const normalized = normalizedColorValue(original);
    if (!normalized) return null;
    const label = formatColorLabel(original);
    if (!label) return null;
    return {original, normalized, label};
  }

  function flattenTypeColorMap(cfg){
    const map = cfg && cfg.colors_by_type && typeof cfg.colors_by_type === 'object' ? cfg.colors_by_type : null;
    if (!map) return [];
    const seen = new Set();
    const result = [];
    Object.keys(map).forEach(typeKey=>{
      const list = Array.isArray(map[typeKey]) ? map[typeKey] : [];
      list.forEach(colorName=>{
        const entry = colorEntryFromString(colorName);
        if (!entry) return;
        if (seen.has(entry.normalized)) return;
        seen.add(entry.normalized);
        result.push(entry.original);
      });
    });
    return result;
  }

  function hasTypeColorConfig(cfg){
    if (!cfg || typeof cfg !== 'object') return false;
    const map = cfg.colors_by_type;
    if (!map || typeof map !== 'object') return false;
    return Object.keys(map).some(key=>Array.isArray(map[key]));
  }

  function colorStringsForType(cfg, typeValue){
    const normalizedType = normalizedTypeValue(typeValue);
    const map = cfg && cfg.colors_by_type && typeof cfg.colors_by_type === 'object' ? cfg.colors_by_type : null;
    const hasTypeConfig = hasTypeColorConfig(cfg);

    if (map && normalizedType){
      if (Object.prototype.hasOwnProperty.call(map, normalizedType)){
        return Array.isArray(map[normalizedType]) ? map[normalizedType] : [];
      }
      if (hasTypeConfig){
        return [];
      }
    }

    if (map && !normalizedType){
      const flattened = flattenTypeColorMap(cfg);
      if (flattened.length) return flattened;
    }

    if (!hasTypeConfig && Array.isArray(cfg?.colors)){
      return cfg.colors;
    }

    return [];
  }

  function productSupportsType(cfg, typeValue){
    const normalized = normalizedTypeValue(typeValue);
    if (!normalized) return true;
    const list = Array.isArray(cfg?.types) && cfg.types.length ? cfg.types : types();
    return list.some(entry=>normalizedTypeValue(entry) === normalized);
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

  function variantHasActiveMockup(cfg, typeValue, colorValue, list){
    if (!cfg || typeof cfg !== 'object') return false;
    const map = cfg.map;
    if (!map || typeof map !== 'object') return false;
    const mkList = Array.isArray(list) ? list : mockups();
    const normalizedType = normalizedTypeValue(typeValue);
    const normalizedColor = normalizedColorValue(colorValue);
    if (!normalizedType || !normalizedColor) return false;
    const entry = map[normalizedType + '|' + normalizedColor];
    if (!entry) return false;
    return resolveMockupIndex(entry, mkList) >= 0;
  }

  function availableColorsForType(cfg, typeValue){
    const typeConfigured = hasTypeColorConfig(cfg);
    const colors = colorStringsForType(cfg, typeValue);
    if (!colors.length) return {entries: [], restricted: false, typeConfigured};
    const map = cfg?.map && typeof cfg.map === 'object' ? cfg.map : {};
    const mkList = mockups();
    const hasAnyActiveMapping = Object.keys(map).some(key=>resolveMockupIndex(map[key], mkList) >= 0);
    const normalizedType = normalizedTypeValue(typeValue);
    const entries = [];

    colors.forEach(colorName=>{
      const entry = colorEntryFromString(colorName);
      if (!entry) return;
      let include = true;
      if (hasAnyActiveMapping){
        if (normalizedType){
          include = variantHasActiveMockup(cfg, normalizedType, entry.normalized, mkList);
        } else {
          include = Object.keys(map).some(key=>{
            const parts = key.split('|');
            if (parts.length !== 2) return false;
            if (parts[1] !== entry.normalized) return false;
            return resolveMockupIndex(map[key], mkList) >= 0;
          });
        }
      }
      if (include){
        entries.push(entry);
      }
    });

    return {entries, restricted: hasAnyActiveMapping, typeConfigured};
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

  function dispatchChangeEvent(el){
    if (!el) return;
    try {
      const evt = new Event('change', {bubbles:true});
      el.dispatchEvent(evt);
    } catch (err){
      if (typeof document !== 'undefined' && document.createEvent){
        const legacyEvt = document.createEvent('Event');
        legacyEvt.initEvent('change', true, false);
        el.dispatchEvent(legacyEvt);
      }
    }
  }

  function renderColorChoices(){
    if (!modalColorList){
      updateColorTriggerLabel();
      return;
    }
    modalColorList.innerHTML = '';
    const options = Array.from(colorSel.options);
    const hasOptions = options.length > 0;
    if (colorModalTrigger){
      if (hasOptions){
        colorModalTrigger.removeAttribute('disabled');
      } else {
        colorModalTrigger.setAttribute('disabled', 'disabled');
      }
    }
    if (!hasOptions){
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Ehhez a termékhez nincs szín beállítva.';
      modalColorList.appendChild(empty);
      closeColorModal();
      updateColorTriggerLabel();
      return;
    }
    options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-modal-swatch' + (opt.value === colorSel.value ? ' is-active' : '');
      const colorCode = colorCodeFromText(opt.dataset.rawColor || opt.dataset.original || opt.textContent);
      if (colorCode){
        btn.style.setProperty('--swatch-color', colorCode);
      }
      const label = opt.dataset.display || opt.textContent;
      btn.innerHTML = `<span class="nb-modal-swatch-color"></span><span class="nb-modal-swatch-label">${label}</span>`;
      btn.onclick = ()=>{
        const previous = colorSel.value;
        colorSel.value = opt.value;
        if (colorSel.value !== previous){
          dispatchChangeEvent(colorSel);
        } else {
          renderColorChoices();
          updateColorTriggerLabel();
        }
        closeColorModal();
      };
      modalColorList.appendChild(btn);
    });
    updateColorTriggerLabel();
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
      updateActionStates();
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
    updateActionStates();
  }

  function clearBulkSizeState(){
    Object.keys(bulkSizeState).forEach(key=>{ delete bulkSizeState[key]; });
    updateBulkDiscountHint();
  }

  function hasBulkDiscounts(){
    return Array.isArray(bulkDiscountTiers) && bulkDiscountTiers.length > 0;
  }

  function totalBulkQuantity(){
    return Object.keys(bulkSizeState).reduce((sum, key)=>{
      const qty = parseInt(bulkSizeState[key], 10);
      if (!Number.isFinite(qty) || qty <= 0){
        return sum;
      }
      return sum + qty;
    }, 0);
  }

  function resolveBulkDiscountForQuantity(qty){
    const quantity = parseInt(qty, 10);
    if (!Number.isFinite(quantity) || quantity <= 0){
      return null;
    }
    let matched = null;
    bulkDiscountTiers.forEach(tier => {
      if (!tier) return;
      if (quantity < tier.min) return;
      if (tier.max > 0 && quantity > tier.max) return;
      if (!matched || tier.percent > matched.percent || (tier.percent === matched.percent && tier.min > matched.min)){
        matched = tier;
      }
    });
    return matched;
  }

  function nextBulkDiscountAfter(qty){
    const quantity = parseInt(qty, 10);
    if (!Number.isFinite(quantity)){
      return null;
    }
    for (let i = 0; i < bulkDiscountTiers.length; i++){
      const tier = bulkDiscountTiers[i];
      if (!tier) continue;
      if (quantity < tier.min){
        return tier;
      }
    }
    return null;
  }

  function formatPercent(value){
    const num = Number(value);
    if (!Number.isFinite(num)){
      return '0';
    }
    const fractionDigits = Math.abs(num - Math.round(num)) < 0.005 ? 0 : 2;
    try {
      return num.toLocaleString(undefined, {minimumFractionDigits:fractionDigits, maximumFractionDigits:2});
    } catch(e){
      return num.toFixed(fractionDigits);
    }
  }

  function renderBulkDiscountTable(){
    if (!bulkDiscountSection || !bulkDiscountTable){
      return;
    }
    if (!hasBulkDiscounts()){
      bulkDiscountSection.hidden = true;
      bulkDiscountTable.innerHTML = '';
      if (bulkDiscountHint){
        bulkDiscountHint.textContent = '';
      }
      return;
    }
    bulkDiscountSection.hidden = false;
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Darabtól','Darabig','Kedvezmény'].forEach(label=>{
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    bulkDiscountTiers.forEach(tier => {
      if (!tier) return;
      const row = document.createElement('tr');
      const fromCell = document.createElement('td');
      fromCell.textContent = tier.min.toString();
      const toCell = document.createElement('td');
      toCell.textContent = tier.max > 0 ? tier.max.toString() : '∞';
      const pctCell = document.createElement('td');
      pctCell.textContent = formatPercent(tier.percent) + ' %';
      row.appendChild(fromCell);
      row.appendChild(toCell);
      row.appendChild(pctCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    bulkDiscountTable.innerHTML = '';
    bulkDiscountTable.appendChild(table);
  }

  function updateBulkDiscountHint(){
    if (!bulkDiscountHint || !hasBulkDiscounts()){
      if (bulkDiscountHint){
        bulkDiscountHint.textContent = '';
      }
      return;
    }
    const qty = totalBulkQuantity();
    if (!qty){
      bulkDiscountHint.textContent = 'Adj meg mennyiségeket a kedvezmény kiszámításához.';
      return;
    }
    const active = resolveBulkDiscountForQuantity(qty);
    if (active){
      bulkDiscountHint.innerHTML = `Jelenleg <strong>${qty} db</strong> után <strong>${formatPercent(active.percent)}% kedvezmény</strong> jár.`;
      return;
    }
    const upcoming = nextBulkDiscountAfter(qty);
    if (upcoming){
      const remaining = Math.max(0, upcoming.min - qty);
      bulkDiscountHint.textContent = `Még ${remaining} darabnál indul a ${formatPercent(upcoming.percent)}% kedvezmény.`;
      return;
    }
    bulkDiscountHint.textContent = '';
  }

  function renderBulkSizeList(){
    if (!bulkModalList) return;
    bulkModalList.innerHTML = '';
    const options = sizeSel ? Array.from(sizeSel.options) : [];
    if (!options.length){
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Nincs méret megadva.';
      bulkModalList.appendChild(empty);
      updateActionStates();
      return;
    }
    options.forEach(opt=>{
      const value = (opt.value || '').toString();
      if (!value) return;
      const label = opt.dataset.label || opt.textContent || value;
      const row = document.createElement('div');
      row.className = 'nb-bulk-size-row';
      row.dataset.sizeValue = value;
      row.dataset.sizeLabel = label;

      const title = document.createElement('span');
      title.className = 'nb-bulk-size-label';
      title.textContent = label;

      const inputWrap = document.createElement('div');
      inputWrap.className = 'nb-bulk-size-input';

      const qtyLabel = document.createElement('span');
      qtyLabel.textContent = 'Darab';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.inputMode = 'numeric';
      const current = Object.prototype.hasOwnProperty.call(bulkSizeState, value) ? parseInt(bulkSizeState[value], 10) : 0;
      if (Number.isFinite(current) && current > 0){
        input.value = String(current);
      } else {
        input.value = '';
      }
      input.placeholder = '0';

      input.addEventListener('input', ()=>{
        const digitsOnly = input.value.replace(/[^0-9]/g, '');
        if (digitsOnly !== input.value){
          input.value = digitsOnly;
        }
      });

      input.addEventListener('change', ()=>{
        const parsed = parseInt(input.value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0){
          delete bulkSizeState[value];
          input.value = '';
        } else {
          bulkSizeState[value] = parsed;
          input.value = String(parsed);
        }
        updateBulkDiscountHint();
      });

      inputWrap.appendChild(qtyLabel);
      inputWrap.appendChild(input);
      row.appendChild(title);
      row.appendChild(inputWrap);
      bulkModalList.appendChild(row);
    });
    updateBulkDiscountHint();
  }

  function collectBulkSizeEntries(){
    if (!bulkModalList) return [];
    const entries = [];
    const rows = Array.from(bulkModalList.querySelectorAll('.nb-bulk-size-row'));
    rows.forEach(row=>{
      const value = (row.dataset.sizeValue || '').toString();
      if (!value) return;
      const label = row.dataset.sizeLabel || value;
      const input = row.querySelector('input');
      const raw = input ? input.value : '';
      const qty = parseInt(raw, 10);
      if (!Number.isFinite(qty) || qty <= 0){
        if (Object.prototype.hasOwnProperty.call(bulkSizeState, value)){
          delete bulkSizeState[value];
        }
        if (input && raw !== ''){
          input.value = '';
        }
        return;
      }
      bulkSizeState[value] = qty;
      entries.push({value, label, quantity: qty});
    });
    updateActionStates();
    updateBulkDiscountHint();
    return entries;
  }

  function openBulkModal(){
    if (!bulkModal) return;
    renderBulkSizeList();
    renderBulkDiscountTable();
    updateBulkDiscountHint();
    bulkModal.hidden = false;
    updateModalBodyState();
  }

  function closeBulkModal(){
    if (!bulkModal) return;
    bulkModal.hidden = true;
    updateModalBodyState();
  }

  function renderModalTypes(){
    if (!modalTypeList) return;
    modalTypeList.innerHTML = '';
    const typeOptions = types();
    if (!typeOptions.length){
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Nincs típus konfigurálva.';
      modalTypeList.appendChild(empty);
      return;
    }
    const currentValue = normalizedTypeValue(typeSel.value);
    typeOptions.forEach(label=>{
      const normalized = normalizedTypeValue(label);
      if (!normalized) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-modal-type' + (normalized === currentValue ? ' is-active' : '');
      btn.textContent = label;
      btn.onclick = ()=>{
        const currentNormalized = normalizedTypeValue(typeSel.value);
        if (currentNormalized !== normalized){
          const match = Array.from(typeSel.options).find(opt=>normalizedTypeValue(opt.value) === normalized);
          typeSel.value = match ? match.value : normalized;
          dispatchChangeEvent(typeSel);
        }
        closeProductModal();
      };
      modalTypeList.appendChild(btn);
    });
  }

  function firstProductForType(typeValue){
    const cat = getCatalog();
    const normalized = normalizedTypeValue(typeValue);
    const list = productList();
    const assignedMap = typeProductMap();
    if (normalized && assignedMap && Object.prototype.hasOwnProperty.call(assignedMap, normalized)){
      const assigned = assignedMap[normalized];
      if (assigned && list.some(pid => String(pid) === assigned)){
        const assignedId = parseInt(assigned, 10);
        const assignedCfg = cat[assignedId] || {};
        if (!assignedId || productSupportsType(assignedCfg, typeValue) || !Array.isArray(assignedCfg?.types) || !assignedCfg.types.length){
          return assigned;
        }
      }
    }
    for (let i=0;i<list.length;i++){
      const pid = list[i];
      const cfg = cat[pid] || {};
      if (!normalized || productSupportsType(cfg, normalized)){
        return String(pid);
      }
    }
    return productSel.options[0]?.value || '';
  }

  function ensureProductMatchesType(){
    if (!productSel.options.length) return;
    const currentType = typeSel.value;
    const normalizedType = normalizedTypeValue(currentType);
    const assignedMap = typeProductMap();
    if (normalizedType && assignedMap && Object.prototype.hasOwnProperty.call(assignedMap, normalizedType)){
      const assigned = assignedMap[normalizedType];
      if (assigned && Array.from(productSel.options).some(opt => opt.value === assigned)){
        if (productSel.value !== assigned){
          productSel.value = assigned;
          dispatchChangeEvent(productSel);
          return;
        }
      }
    }
    const pid = parseInt(productSel.value || 0, 10);
    const cfg = getCatalog()[pid] || {};
    if (productSel.value && productSupportsType(cfg, currentType)) return;
    const fallback = firstProductForType(currentType);
    if (fallback && productSel.value !== fallback){
      productSel.value = fallback;
      dispatchChangeEvent(productSel);
    }
  }

  function updateModalBodyState(){
    const anyOpen = (productModal && !productModal.hidden) || (colorModal && !colorModal.hidden) || (bulkModal && !bulkModal.hidden);
    if (anyOpen){
      document.body.classList.add('nb-modal-open');
    } else {
      document.body.classList.remove('nb-modal-open');
    }
  }

  function openProductModal(){
    if (!productModal) return;
    renderModalTypes();
    productModal.hidden = false;
    updateModalBodyState();
  }

  function closeProductModal(){
    if (!productModal) return;
    productModal.hidden = true;
    updateModalBodyState();
  }

  function openColorModal(){
    if (!colorModal) return;
    renderColorChoices();
    if (colorModalTrigger && colorModalTrigger.hasAttribute('disabled')) return;
    colorModal.hidden = false;
    updateModalBodyState();
  }

  function closeColorModal(){
    if (!colorModal) return;
    colorModal.hidden = true;
    updateModalBodyState();
  }

  function getColorLabel(){
    const opt = Array.from(colorSel.options).find(o=>o.value === colorSel.value);
    return opt ? (opt.dataset.display || opt.dataset.original || opt.textContent) : '';
  }

  function updateColorTriggerLabel(){
    if (!colorModalLabel) return;
    const label = getColorLabel();
    colorModalLabel.textContent = label ? `Szín: ${label}` : 'Válassz színt';
  }

  function updateSelectionSummary(){
    const sel = currentSelection();
    const typeLabel = typeSel.selectedOptions[0]?.dataset?.label || typeSel.selectedOptions[0]?.textContent || '';
    const colorLabel = getColorLabel();
    const sizeLabel = sizeSel.value || '';
    if (productTitleEl){
      productTitleEl.textContent = sel.cfg?.title || 'Termék';
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
    updateColorTriggerLabel();
    updatePriceDisplay();
    updateActionStates();
  }

  function currentProductPriceMarkup(){
    const sel = currentSelection();
    if (!sel || !sel.cfg) return '';
    const cfg = sel.cfg;
    if (cfg.price_html && typeof cfg.price_html === 'string' && cfg.price_html.trim()){
      return cfg.price_html;
    }
    if (cfg.price_text && typeof cfg.price_text === 'string' && cfg.price_text.trim()){
      return cfg.price_text;
    }
    return '';
  }

  function updatePriceDisplay(){
    if (!priceDisplayEl) return;
    priceDisplayEl.classList.remove('nb-price-display--pending');
    const markup = currentProductPriceMarkup();
    if (markup){
      priceDisplayEl.innerHTML = markup;
      return;
    }
    priceDisplayEl.textContent = 'Ár nem elérhető.';
    priceDisplayEl.classList.add('nb-price-display--pending');
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

  function preferredCanvasBounds(){
    const stageColumn = canvasEl.closest('.nb-column--stage');
    const stageFrame = canvasEl.closest('.nb-product-frame');
    const widthConstraints = [];
    const heightConstraints = [];

    if (stageColumn){
      const rect = stageColumn.getBoundingClientRect();
      if (rect){
        if (rect.width){
          widthConstraints.push(Math.floor(rect.width));
        }
        if (rect.height){
          heightConstraints.push(Math.floor(rect.height - 32));
        }
      }
    }

    if (stageFrame){
      const rect = stageFrame.getBoundingClientRect();
      if (rect){
        if (rect.width){
          widthConstraints.push(Math.floor(rect.width));
        }
        if (rect.height){
          heightConstraints.push(Math.floor(rect.height - 24));
        }
      }
    }

    if (window.innerWidth){
      widthConstraints.push(Math.floor(window.innerWidth - 24));
    }
    if (window.innerHeight){
      heightConstraints.push(Math.floor(window.innerHeight - 140));
    }

    const positiveMin = (values, fallback) => {
      const filtered = values.filter(v => Number.isFinite(v) && v > 0);
      if (!filtered.length) return fallback;
      return Math.max(220, Math.min(...filtered));
    };

    const widthAvailable = positiveMin(widthConstraints, defaultCanvasSize.w);
    const heightAvailable = positiveMin(heightConstraints, defaultCanvasSize.h);

    return {
      w: Math.max(widthAvailable, 220),
      h: Math.max(heightAvailable, 220)
    };
  }

  function applyCanvasSize(size){
    const canvasElement = c.getElement();
    const sizeW = positiveNumberOr(size?.w, defaultCanvasSize.w);
    const sizeH = positiveNumberOr(size?.h, defaultCanvasSize.h);
    const targetW = sizeW > 0 ? sizeW : defaultCanvasSize.w;
    const targetH = sizeH > 0 ? sizeH : defaultCanvasSize.h;

    const canvasContainer = canvasElement?.parentElement || null;
    const containerRect = canvasContainer && typeof canvasContainer.getBoundingClientRect === 'function'
      ? canvasContainer.getBoundingClientRect()
      : null;
    const containerWidth = containerRect && containerRect.width ? Math.floor(containerRect.width) : 0;

    const bounds = preferredCanvasBounds();
    let scaleX = bounds.w / targetW;
    let scaleY = bounds.h / targetH;
    if (!Number.isFinite(scaleX) || scaleX <= 0){
      scaleX = 1;
    }
    if (!Number.isFinite(scaleY) || scaleY <= 0){
      scaleY = 1;
    }

    const narrowLayout = (containerWidth && containerWidth <= 640)
      || (!containerWidth && window.innerWidth && window.innerWidth <= 768);
    let scale = narrowLayout ? scaleX : Math.min(scaleX, scaleY);
    if (!Number.isFinite(scale) || scale <= 0){
      scale = narrowLayout ? scaleX : 1;
    }
    if (!Number.isFinite(scale) || scale <= 0){
      scale = 1;
    }

    let appliedW = Math.max(1, Math.round(targetW * scale));
    let appliedH = Math.max(1, Math.round(targetH * scale));

    if (containerWidth && appliedW > containerWidth){
      const containerScale = containerWidth / appliedW;
      appliedW = Math.max(1, Math.round(appliedW * containerScale));
      appliedH = Math.max(1, Math.round(appliedH * containerScale));
    }

    const dims = {width: appliedW, height: appliedH};
    const cssDims = {cssOnly: true};
    c.setDimensions(dims);
    c.setDimensions(dims, cssDims);
    canvasElement.width = appliedW;
    canvasElement.height = appliedH;

    const canvasWrapper = canvasElement.parentElement;
    if (canvasWrapper){
      canvasWrapper.style.maxWidth = '100%';
      canvasWrapper.style.width = appliedW + 'px';
      canvasWrapper.style.height = appliedH + 'px';
    }

    canvasElement.style.maxWidth = '100%';
    canvasElement.style.width = appliedW + 'px';
    canvasElement.style.height = appliedH + 'px';

    if (c.calcOffset){
      c.calcOffset();
    }
    return {w: appliedW, h: appliedH};
  }

  function isDesignObject(obj){
    return !!obj && !obj.__nb_bg && !obj.__nb_area;
  }

  function designObjects(){
    return c.getObjects().filter(isDesignObject);
  }

  function ensureLayerId(obj){
    if (!obj) return '';
    if (!obj.__nb_layer_id){
      obj.__nb_layer_id = 'nb-layer-' + (layerIdSeq++);
    }
    return obj.__nb_layer_id;
  }

  function layerLabel(obj){
    if (!obj) return '';
    if (obj.__nb_layer_name){
      return obj.__nb_layer_name;
    }
    if (obj.type === 'textbox'){
      const raw = (obj.text || '').toString().replace(/\s+/g,' ').trim();
      if (raw){
        return raw.length > 28 ? raw.slice(0,25) + '…' : raw;
      }
      return 'Szöveg';
    }
    if (obj.type === 'image'){
      return 'Kép';
    }
    return 'Elem';
  }

  function applyDesignOrder(order){
    if (!Array.isArray(order) || !order.length) return;
    const objects = c.getObjects();
    let firstIndex = -1;
    for (let i=0;i<objects.length;i++){
      if (isDesignObject(objects[i])){
        firstIndex = i;
        break;
      }
    }
    if (firstIndex === -1) return;
    order.forEach((obj, offset)=>{
      if (isDesignObject(obj)){
        c.moveTo(obj, firstIndex + offset);
      }
    });
    if (c.__nb_area_rect){
      c.bringToFront(c.__nb_area_rect);
    }
  }

  function moveLayer(obj, delta){
    if (!isDesignObject(obj) || !Number.isInteger(delta) || !delta) return;
    const order = designObjects();
    const currentIndex = order.indexOf(obj);
    if (currentIndex === -1) return;
    const targetIndex = Math.max(0, Math.min(order.length - 1, currentIndex + delta));
    if (targetIndex === currentIndex) return;
    order.splice(currentIndex, 1);
    order.splice(targetIndex, 0, obj);
    applyDesignOrder(order);
    c.setActiveObject(obj);
    c.requestRenderAll();
    markDesignDirty();
    syncLayerList();
    syncTextControls();
  }

  function syncLayerList(){
    if (!layerListEl) return;
    const objects = designObjects();
    layerListEl.innerHTML = '';
    if (!objects.length){
      const empty = document.createElement('div');
      empty.className = 'nb-layer-empty';
      empty.textContent = 'Nincs feltöltött elem';
      layerListEl.appendChild(empty);
      return;
    }
    const active = c.getActiveObject();
    const topFirst = objects.slice().reverse();
    topFirst.forEach((obj, idx)=>{
      ensureLayerId(obj);
      const item = document.createElement('div');
      item.className = 'nb-layer-item';
      if (active === obj){
        item.classList.add('is-active');
      }
      item.dataset.layerId = obj.__nb_layer_id;

      const info = document.createElement('div');
      info.className = 'nb-layer-info';
      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.textContent = layerLabel(obj);
      selectBtn.addEventListener('click', ()=>{
        c.setActiveObject(obj);
        c.requestRenderAll();
        syncTextControls();
        syncLayerList();
      });
      info.appendChild(selectBtn);
      item.appendChild(info);

      const controls = document.createElement('div');
      controls.className = 'nb-layer-controls';
      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.setAttribute('aria-label', 'Feljebb');
      upBtn.innerHTML = '▲';
      if (idx === 0){
        upBtn.disabled = true;
      }
      upBtn.addEventListener('click', ()=>{
        moveLayer(obj, 1);
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.setAttribute('aria-label', 'Lejjebb');
      downBtn.innerHTML = '▼';
      if (idx === topFirst.length - 1){
        downBtn.disabled = true;
      }
      downBtn.addEventListener('click', ()=>{
        moveLayer(obj, -1);
      });

      controls.appendChild(upBtn);
      controls.appendChild(downBtn);
      item.appendChild(controls);

      layerListEl.appendChild(item);
    });
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
    designState.dirty = true;
    updatePriceDisplay();
    updateActionStates();
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
    renderModalTypes();
    ensureProductMatchesType();
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
    ensureProductMatchesType();
  }

  function populateColorsSizes(){
    const pid = parseInt(productSel.value || 0, 10);
    const cfg = getCatalog()[pid] || {};
    const {entries: filteredColors, restricted, typeConfigured} = availableColorsForType(cfg, typeSel ? typeSel.value : '');
    const fallbackColors = typeConfigured ? [] : colorStringsForType(cfg, '').map(colorEntryFromString).filter(Boolean);
    const colorsToRender = filteredColors.length ? filteredColors : fallbackColors;
    colorSel.innerHTML = '';
    colorsToRender.forEach(entry=>{
      const opt = document.createElement('option');
      opt.value = entry.normalized;
      opt.textContent = entry.label;
      opt.dataset.original = entry.original;
      opt.dataset.display = entry.label;
      opt.dataset.rawColor = entry.original;
      colorSel.appendChild(opt);
    });
    ensureSelectValue(colorSel);
    renderColorChoices();

    clearBulkSizeState();
    if (bulkModal && !bulkModal.hidden){
      closeBulkModal();
    }
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
    renderBulkSizeList();
  }

  // initial populate
  populateFontOptions();
  populateTypes();
  populateProducts();
  populateColorsSizes();
  initAlignDefault();
  setMockupBgAndArea();
  requestAnimationFrame(()=>{ setMockupBgAndArea(); });
  updateSelectionSummary();
  syncTextControls();

  if (typeSel) typeSel.onchange = ()=>{
    const previousProduct = productSel ? productSel.value : '';
    ensureProductMatchesType();
    if (!productSel || productSel.value === previousProduct){
      populateColorsSizes();
    }
    renderModalTypes();
    setMockupBgAndArea();
    updateSelectionSummary();
    markDesignDirty();
  };
  if (productSel) productSel.onchange = ()=>{
    populateColorsSizes();
    setMockupBgAndArea();
    updateSelectionSummary();
    markDesignDirty();
  };
  if (colorSel) colorSel.onchange = ()=>{ renderColorChoices(); setMockupBgAndArea(); updateSelectionSummary(); markDesignDirty(); };
  if (sizeSel) sizeSel.onchange = ()=>{ renderSizeButtons(); updateSelectionSummary(); markDesignDirty(); };

  c.on('object:added', e=>{
    if (isDesignObject(e.target)){
      applyObjectUiDefaults(e.target);
      ensureLayerId(e.target);
      keepObjectInside(e.target);
      markDesignDirty();
      syncLayerList();
    }
  });
  c.on('object:moving', e=>{ keepObjectInside(e.target, {fit:false}); });
  c.on('object:scaling', e=>{ keepObjectInside(e.target); markDesignDirty(); syncLayerList(); });
  c.on('object:rotating', e=>{ keepObjectInside(e.target); markDesignDirty(); syncLayerList(); });
  c.on('object:modified', e=>{ if (isDesignObject(e.target)){ markDesignDirty(); syncLayerList(); }});
  c.on('object:removed', e=>{ if (isDesignObject(e.target)){ markDesignDirty(); syncLayerList(); }});
  c.on('selection:created', ()=>{ syncTextControls(); syncLayerList(); });
  c.on('selection:updated', ()=>{ syncTextControls(); syncLayerList(); });
  c.on('selection:cleared', ()=>{ syncTextControls(); syncLayerList(); });
  c.on('text:changed', e=>{ if (isDesignObject(e.target)) syncLayerList(); });

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

  if (productModalTrigger){
    productModalTrigger.addEventListener('click', openProductModal);
  }

  if (productModal){
    const closeButtons = Array.from(productModal.querySelectorAll('[data-nb-close="product-modal"]'));
    closeButtons.forEach(btn=>btn.addEventListener('click', closeProductModal));
    productModal.addEventListener('click', evt=>{
      if (evt.target && evt.target.dataset && evt.target.dataset.nbClose === 'product-modal'){
        closeProductModal();
      }
    });
  }

  if (colorModalTrigger){
    colorModalTrigger.addEventListener('click', openColorModal);
  }

  if (colorModal){
    const closeButtons = Array.from(colorModal.querySelectorAll('[data-nb-close="color-modal"]'));
    closeButtons.forEach(btn=>btn.addEventListener('click', closeColorModal));
    colorModal.addEventListener('click', evt=>{
      if (evt.target && evt.target.dataset && evt.target.dataset.nbClose === 'color-modal'){
        closeColorModal();
      }
    });
  }

  renderBulkDiscountTable();
  updateBulkDiscountHint();

  if (bulkModalTrigger){
    bulkModalTrigger.addEventListener('click', ()=>{
      if (bulkModalTrigger.disabled) return;
      openBulkModal();
    });
  }

  if (bulkModal){
    const closeButtons = Array.from(bulkModal.querySelectorAll('[data-nb-close="bulk-modal"]'));
    closeButtons.forEach(btn=>btn.addEventListener('click', closeBulkModal));
    bulkModal.addEventListener('click', evt=>{
      if (evt.target && evt.target.dataset && evt.target.dataset.nbClose === 'bulk-modal'){
        closeBulkModal();
      }
    });
  }

  document.addEventListener('keydown', evt=>{
    if (evt.key === 'Escape'){
      if (bulkModal && !bulkModal.hidden){
        closeBulkModal();
        return;
      }
      if (colorModal && !colorModal.hidden){
        closeColorModal();
        return;
      }
      if (productModal && !productModal.hidden){
        closeProductModal();
      }
    }
  });

  let resizeRaf = null;
  window.addEventListener('resize', ()=>{
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(()=>{
      refreshControlProfile();
      setMockupBgAndArea();
    });
  });

  window.addEventListener('load', ()=>{
    setMockupBgAndArea();
  });

  syncLayerList();

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
      applyObjectUiDefaults(t);
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
        applyObjectUiDefaults(img);
        if (f && typeof f.name === 'string' && f.name){
          const baseName = f.name.split(/[/\\]/).pop() || f.name;
          img.__nb_layer_name = baseName.replace(/\.[^.]+$/, '') || 'Kép';
        }
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
      syncLayerList();
    };
  }

  function exportPrintImage(){
    const area = Object.assign({
      x: 0,
      y: 0,
      w: c.width,
      h: c.height
    }, c.__nb_area || {});

    const width = Math.max(1, area.w || c.width || 1);
    const height = Math.max(1, area.h || c.height || 1);
    const left = Math.max(0, area.x || 0);
    const top = Math.max(0, area.y || 0);
    const targetWidth = 3000;
    const multiplierRaw = targetWidth / width;
    const multiplier = Number.isFinite(multiplierRaw) && multiplierRaw > 0 ? multiplierRaw : 1;

    const hiddenObjects = [];
    if (c.__nb_area_rect && c.__nb_area_rect.visible !== false){
      c.__nb_area_rect.visible = false;
      hiddenObjects.push(c.__nb_area_rect);
    }

    const bgImage = c.backgroundImage || null;
    if (bgImage){
      c.backgroundImage = null;
    }

    const originalBgColor = c.backgroundColor;
    c.backgroundColor = 'rgba(0,0,0,0)';

    c.renderAll();

    let dataUrl = '';
    try {
      dataUrl = c.toDataURL({
        format: 'png',
        left,
        top,
        width,
        height,
        multiplier,
        enableRetinaScaling: false
      });
    } finally {
      if (bgImage){
        c.backgroundImage = bgImage;
      }
      c.backgroundColor = originalBgColor;
      hiddenObjects.forEach(obj=>{ obj.visible = true; });
      c.renderAll();
    }

    return {
      dataUrl,
      width: Math.round(width * multiplier),
      height: Math.round(height * multiplier)
    };
  }

  async function persistCurrentDesign(){
    if (!hasCompleteSelection()){
      const err = new Error('incomplete-selection');
      err.userMessage = 'Kérjük válaszd ki a terméket, színt és méretet!';
      throw err;
    }
    if (!c){
      const err = new Error('canvas-missing');
      err.userMessage = 'Nem sikerült betölteni a vásznat.';
      throw err;
    }
    if (saving && savePromise){
      return savePromise;
    }
    saving = true;
    updateActionStates();
    const saveTask = (async ()=>{
      const previewPng = c.toDataURL({format:'png', multiplier:2, left:0, top:0});
      const printExport = exportPrintImage();
      if (!printExport.dataUrl){
        const err = new Error('print-export-failed');
        err.userMessage = 'Nem sikerült előállítani a nyomdai PNG fájlt.';
        throw err;
      }
      const sel = currentSelection();
      const size = sizeSel.value || '';
      const typeLabel = (typeSel.selectedOptions[0]?.dataset?.label || typeSel.selectedOptions[0]?.textContent || '').toString().trim();
      const colorLabel = (getColorLabel() || '').toString().trim();
      const rawSizeLabel = sizeSel.selectedOptions[0]?.dataset?.label || sizeSel.selectedOptions[0]?.textContent || '';
      const sizeLabel = (rawSizeLabel || size || '').toString().trim();
      const price_ctx = {product_id: sel.pid, type: sel.type, color: sel.color, size};
      if (typeLabel) price_ctx.type_label = typeLabel;
      if (colorLabel) price_ctx.color_label = colorLabel;
      if (sizeLabel) price_ctx.size_label = sizeLabel;
      const attributes_json = {pa_type: sel.type, pa_color: sel.color, pa_size: size};
      if (typeLabel) attributes_json.type_label = typeLabel;
      if (colorLabel) attributes_json.color_label = colorLabel;
      if (sizeLabel) attributes_json.size_label = sizeLabel;
      const meta = {width_mm:300, height_mm:400, dpi:300, product_id: sel.pid, attributes_json, price_ctx};
      let res;
      try {
        res = await fetch(NB_DESIGNER.rest + 'save', {
          method:'POST',
          headers:{'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type':'application/json'},
          body: JSON.stringify({
            png_base64: previewPng,
            print_png_base64: printExport.dataUrl,
            print_width_px: printExport.width,
            print_height_px: printExport.height,
            layers: c.toJSON(),
            meta
          })
        });
      } catch (networkError){
        const err = new Error('network');
        err.userMessage = 'Hálózati hiba';
        throw err;
      }
      const j = await res.json().catch(()=>({}));
      if (!res.ok){
        const err = new Error('save-failed');
        err.userMessage = (j && j.message) ? j.message : 'Mentési hiba';
        throw err;
      }
      designState.savedDesignId = j.design_id;
      designState.dirty = false;
      updatePriceDisplay();
      return designState.savedDesignId;
    })();
    savePromise = saveTask;
    try {
      return await saveTask;
    } finally {
      savePromise = null;
      saving = false;
      updateActionStates();
    }
  }

  async function ensureDesignSaved(){
    if (!designState.dirty && designState.savedDesignId){
      return designState.savedDesignId;
    }
    return persistCurrentDesign();
  }

  if (bulkConfirmBtn){
    bulkConfirmBtn.onclick = async ()=>{
      const entries = collectBulkSizeEntries();
      if (!entries.length){
        alert('Adj meg legalább egy mennyiséget!');
        return;
      }
      bulkConfirmBtn.disabled = true;
      actionSubmitting = true;
      updateActionStates();
      try{
        const designId = await ensureDesignSaved();
        let res;
        try {
          res = await fetch(NB_DESIGNER.rest + 'add-to-cart', {
            method:'POST',
            headers:{'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type':'application/json'},
            body: JSON.stringify({design_id: designId, bulk_sizes: entries})
          });
        } catch (networkError){
          const err = new Error('network');
          err.userMessage = 'Hálózati hiba';
          throw err;
        }
        const j = await res.json().catch(()=>({}));
        if (!res.ok){
          alert((j && j.message) ? j.message : 'Kosár hiba');
          return;
        }
        closeBulkModal();
        if (j.redirect){
          window.location = j.redirect;
        }
      }catch(e){
        if (e && e.userMessage){
          alert(e.userMessage);
        } else {
          alert('Hálózati hiba');
        }
      } finally {
        bulkConfirmBtn.disabled = false;
        actionSubmitting = false;
        updateActionStates();
      }
    };
  }

  if (addToCartBtn){
    addToCartBtn.onclick = async ()=>{
      if (addToCartBtn.disabled) return;
      actionSubmitting = true;
      updateActionStates();
      try{
        const designId = await ensureDesignSaved();
        let res;
        try {
          res = await fetch(NB_DESIGNER.rest + 'add-to-cart', {
            method:'POST',
            headers:{'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type':'application/json'},
            body: JSON.stringify({design_id: designId})
          });
        } catch (networkError){
          const err = new Error('network');
          err.userMessage = 'Hálózati hiba';
          throw err;
        }
        const j = await res.json().catch(()=>({}));
        if (!res.ok){
          alert((j && j.message) ? j.message : 'Kosár hiba');
          return;
        }
        if (j.redirect){
          window.location = j.redirect;
        }
      }catch(e){
        if (e && e.userMessage){
          alert(e.userMessage);
        } else {
          alert('Hálózati hiba');
        }
      } finally {
        actionSubmitting = false;
        updateActionStates();
      }
    };
  }
})();
