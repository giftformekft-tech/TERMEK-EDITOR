(function () {
  if (typeof fabric === 'undefined') return;
  const canvasEl = document.getElementById('nb-canvas');
  if (!canvasEl) return;

  const baseCanvasSize = {
    w: parseInt(canvasEl.getAttribute('width'), 10) || canvasEl.width || 480,
    h: parseInt(canvasEl.getAttribute('height'), 10) || canvasEl.height || 640
  };
  const settings = (typeof NB_DESIGNER !== 'undefined' && NB_DESIGNER.settings) ? NB_DESIGNER.settings : {};
  const c = new fabric.Canvas('nb-canvas', { preserveObjectStacking: true, backgroundColor: '#fff' });
  c.allowTouchScrolling = true;

  function applyTouchAction(el) {
    if (!el || !el.style) return;
    el.style.touchAction = 'manipulation';
  }

  applyTouchAction(c.wrapperEl);
  applyTouchAction(c.upperCanvasEl);
  applyTouchAction(c.lowerCanvasEl);

  function isTouchLikeEvent(nativeEvent) {
    if (!nativeEvent || typeof nativeEvent !== 'object') return false;
    if (typeof nativeEvent.pointerType === 'string' && nativeEvent.pointerType.toLowerCase() === 'touch') {
      return true;
    }
    if (typeof nativeEvent.type === 'string' && nativeEvent.type.indexOf('touch') === 0) {
      return true;
    }
    if (typeof nativeEvent.touches !== 'undefined') { // TouchEvent
      return true;
    }
    return false;
  }

  function isEditableTarget(target) {
    if (!target || typeof target !== 'object') return false;
    if (target.isContentEditable) return true;
    if (target.ownerDocument && target.ownerDocument.designMode === 'on') return true;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button';
  }

  let touchDragActive = false;
  function restoreTouchScrolling() {
    touchDragActive = false;
    c.allowTouchScrolling = true;
  }

  c.on('mouse:down', evt => {
    if (!evt || !evt.e || !isTouchLikeEvent(evt.e)) return;
    touchDragActive = !!evt.target;
    c.allowTouchScrolling = !touchDragActive;
  });

  c.on('mouse:up', () => {
    restoreTouchScrolling();
  });

  c.on('mouse:out', () => {
    restoreTouchScrolling();
  });

  c.on('selection:cleared', () => {
    restoreTouchScrolling();
  });

  c.on('mouse:move', evt => {
    if (!evt || !evt.e || !isTouchLikeEvent(evt.e)) return;
    if (!evt.target && !touchDragActive) {
      c.allowTouchScrolling = true;
    }
  });

  c.on('touch:gesture', evt => {
    if (!evt || !evt.e) return;
    if (!isTouchLikeEvent(evt.e)) return;
    if (evt.self && evt.self.state === 'end') {
      restoreTouchScrolling();
    } else {
      c.allowTouchScrolling = !touchDragActive;
    }
  });

  const objectUiDefaults = {
    cornerStyle: 'circle',
    transparentCorners: false,
    hasBorders: false,
    borderColor: 'rgba(0,0,0,0)',
    borderOpacityWhenMoving: 0,
    padding: 0,
    cornerPadding: 0
  };

  function applyObjectUiDefaults(obj) {
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
  function getRetinaScale() {
    if (typeof c.getRetinaScaling === 'function') {
      const scaling = c.getRetinaScaling();
      if (Number.isFinite(scaling) && scaling > 0) {
        return scaling;
      }
    }
    if (typeof fabric.devicePixelRatio === 'number' && fabric.devicePixelRatio > 0) {
      return fabric.devicePixelRatio;
    }
    if (typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 0) {
      return window.devicePixelRatio;
    }
    return 1;
  }
  function profileForKey(key) {
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
    const clampCorner = (cssPx, minCss) => {
      const desiredCss = Math.max(minCss, cssPx);
      const raw = desiredCss / (retina || 1);
      return Math.max(4, Math.round(raw));
    };
    if (key === 'mobile') {
      const cornerSize = clampCorner(baseCorner * 1.75, 34);
      const touchCornerSize = clampCorner(Math.max(baseTouch * 1.6, baseCorner * 4), 64);
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

  function applyControlProfile(profile) {
    if (!profile) return;
    const { cornerSize, touchCornerSize, borderScaleFactor } = profile;
    fabric.Object.prototype.cornerSize = cornerSize;
    fabric.Object.prototype.touchCornerSize = touchCornerSize;
    fabric.Object.prototype.borderScaleFactor = borderScaleFactor;
    applyObjectUiDefaults(fabric.Object.prototype);
    designObjects().forEach(obj => {
      obj.cornerSize = cornerSize;
      obj.touchCornerSize = touchCornerSize;
      obj.borderScaleFactor = borderScaleFactor;
      applyObjectUiDefaults(obj);
      if (typeof obj.setCoords === 'function') {
        obj.setCoords();
      }
    });
    c.requestRenderAll();
  }

  function refreshControlProfile() {
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
  if (controlMedia) {
    const mediaListener = () => refreshControlProfile();
    if (typeof controlMedia.addEventListener === 'function') {
      controlMedia.addEventListener('change', mediaListener);
    } else if (typeof controlMedia.addListener === 'function') {
      controlMedia.addListener(mediaListener);
    }
  }

  const defaultCanvasSize = { w: baseCanvasSize.w, h: baseCanvasSize.h };
  const fallbackArea = {
    x: Math.round(defaultCanvasSize.w * 0.15),
    y: Math.round(defaultCanvasSize.h * 0.15),
    w: Math.round(defaultCanvasSize.w * 0.7),
    h: Math.round(defaultCanvasSize.h * 0.7),
    canvas_w: defaultCanvasSize.w,
    canvas_h: defaultCanvasSize.h
  };

  function parseNumeric(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const num = Number(trimmed);
      if (Number.isFinite(num)) return num;
    }
    return null;
  }

  function numberOr(value, fallback) {
    const num = parseNumeric(value);
    return num === null ? fallback : num;
  }

  function positiveNumberOr(value, fallback) {
    const num = parseNumeric(value);
    return (num === null || num <= 0) ? fallback : num;
  }

  function loadMockupImage(url) {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('no-url'));
        return;
      }
      const attempt = (crossOrigin, next) => {
        fabric.util.loadImage(url, (img, isError) => {
          if (isError || !img) {
            if (typeof next === 'function') {
              next();
            } else {
              reject(new Error('mockup-load-failed'));
            }
            return;
          }
          resolve(new fabric.Image(img, { crossOrigin: crossOrigin || '' }));
        }, null, crossOrigin);
      };
      attempt('anonymous', () => attempt(null, null));
    });
  }

  function mockupImageUrl(mk) {
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
    for (let i = 0; i < candidates.length; i++) {
      const value = candidates[i];
      if (typeof value === 'string' && value.trim()) {
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
  const priceBaseEl = document.getElementById('nb-price-base');
  const priceSurchargeRow = document.getElementById('nb-price-surcharge-row');
  const priceSurchargeValueEl = document.getElementById('nb-price-surcharge');
  const priceTotalEl = document.getElementById('nb-price-total');
  const priceTotalMobileEl = document.getElementById('nb-price-total-mobile');
  const fontFamilySel = document.getElementById('nb-font-family');
  const DEFAULT_FONT_SIZE = 24;
  const DEFAULT_STROKE_WIDTH = 0;
  const DEFAULT_STROKE_COLOR = '#000000';
  const fontSizeInput = document.getElementById('nb-font-size');
  const fontSizeValue = document.getElementById('nb-font-size-value');
  const fontColorInput = document.getElementById('nb-font-color');
  const fontStrokeColorInput = document.getElementById('nb-font-stroke-color');
  const fontStrokeWidthInput = document.getElementById('nb-font-stroke-width');
  const fontStrokeWidthValue = document.getElementById('nb-font-stroke-width-value');
  const fontBoldToggle = document.getElementById('nb-font-bold');
  const fontItalicToggle = document.getElementById('nb-font-italic');
  const alignButtons = Array.from(document.querySelectorAll('[data-nb-align]'));
  const textCurveToggle = document.getElementById('nb-text-curve-toggle');
  const textCurveInput = document.getElementById('nb-text-curve');
  const textCurveValue = document.getElementById('nb-text-curve-value');
  const clearButton = document.getElementById('nb-clear-design');
  const addToCartBtn = document.getElementById('nb-add-to-cart');
  const uploadInput = document.getElementById('nb-upload');
  const addTextBtn = document.getElementById('nb-add-text');
  const layerListEl = document.getElementById('nb-layer-list');
  const summaryCardEl = document.querySelector('.nb-summary-card');
  if (summaryCardEl) {
    const straySummaryToggle = summaryCardEl.querySelector('.nb-double-sided');
    if (straySummaryToggle) {
      straySummaryToggle.remove();
    }
  }
  const doubleSidedToggle = document.getElementById('nb-double-sided-toggle');
  const sideStatusEl = document.getElementById('nb-side-status');
  const printSummaryEl = document.getElementById('nb-print-summary');
  const canvasEmptyHintEl = document.getElementById('nb-canvas-empty-hint');
  const sideButtons = Array.from(document.querySelectorAll('[data-nb-side]'));
  const sideFabButton = document.getElementById('nb-side-toggle-mobile');
  const mobileMedia = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    ? window.matchMedia('(max-width: 768px)')
    : null;
  const mobileToolbar = document.getElementById('nb-mobile-toolbar');
  const mobileStatusBar = document.getElementById('nb-mobile-status');
  const mobileSelectionLabel = document.getElementById('nb-mobile-selection-label');
  const mobileCompleteBtn = document.getElementById('nb-mobile-complete');
  const mobileBulkBtn = document.getElementById('nb-mobile-bulk');
  const mobileSheet = document.getElementById('nb-mobile-sheet');
  const mobileSheetContent = document.getElementById('nb-mobile-sheet-content');
  const mobileSheetTitle = document.getElementById('nb-mobile-sheet-title');
  const mobileSheetClose = document.getElementById('nb-mobile-sheet-close');
  const mobileSheetOverlay = document.getElementById('nb-mobile-sheet-overlay');
  const mobileSheetHandle = document.getElementById('nb-mobile-sheet-handle');
  const mobileQuickButtons = {};
  Array.from(document.querySelectorAll('[data-nb-mobile-action]')).forEach(btn => {
    const key = btn.dataset.nbMobileAction;
    if (!key) return;
    mobileQuickButtons[key] = btn;
  });
  const mobileToolbarButtons = new Map();
  if (mobileToolbar) {
    Array.from(mobileToolbar.querySelectorAll('[data-nb-sheet-target]')).forEach(btn => {
      const key = btn.dataset.nbSheetTarget;
      if (!key) return;
      mobileToolbarButtons.set(key, btn);
    });
  }
  const sheetSources = new Map();
  Array.from(document.querySelectorAll('[data-nb-sheet-source]')).forEach(node => {
    const key = node.dataset.nbSheetSource;
    if (!key || sheetSources.has(key)) return;
    const title = (node.dataset.nbSheetTitle || (node.getAttribute('aria-label') || '')).trim() || (function () {
      const heading = node.querySelector('h2,h3');
      return heading && heading.textContent ? heading.textContent.trim() : '';
    })();
    sheetSources.set(key, {
      key,
      node,
      parent: node.parentNode,
      nextSibling: node.nextSibling,
      title
    });
  });
  const sheetBundles = {
    sides: ['sides', 'double'],
    elements: ['elements'],
    upload: ['upload', 'templates'],
    text: ['text'],
    product: ['product', 'color', 'size', 'double'],
    layers: ['layers']
  };
  const sheetState = {
    activeKey: '',
    expanded: false,
    historyDepth: 0,
    pendingClose: false
  };
  let sheetDragState = null;

  const loadedFontUrls = new Set();
  const designState = { savedDesignId: null, dirty: true };
  let saving = false;
  let savePromise = null;
  let actionSubmitting = false;
  let layerIdSeq = 1;
  const availableSides = [
    { key: 'front', label: 'Előlap' },
    { key: 'back', label: 'Hátlap' }
  ];
  const sideStates = {};
  let activeSideKey = 'front';
  let doubleSidedEnabled = false;
  let sideLoading = false;
  let sideLoadSequence = Promise.resolve();
  if (doubleSidedToggle && doubleSidedToggle.checked) {
    doubleSidedEnabled = true;
  }
  const bulkSizeState = {};
  const bulkDiscountTiers = (() => {
    const raw = settings.bulk_discounts;
    const tiers = [];
    if (Array.isArray(raw)) {
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
        if (!Number.isFinite(max) || max <= 0) {
          max = 0;
        }
        if (max > 0 && max < min) {
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
    tiers.sort((a, b) => {
      if (a.min === b.min) {
        const aMax = a.max > 0 ? a.max : Number.MAX_SAFE_INTEGER;
        const bMax = b.max > 0 ? b.max : Number.MAX_SAFE_INTEGER;
        if (aMax === bMax) {
          return b.percent - a.percent;
        }
        return aMax - bMax;
      }
      return a.min - b.min;
    });
    return tiers;
  })();

  function getCatalog() { return settings.catalog || {}; }
  function productList() { return settings.products || []; }
  function mockups() {
    const raw = settings.mockups;
    if (Array.isArray(raw)) {
      return raw.filter(Boolean);
    }
    if (raw && typeof raw === 'object') {
      return Object.keys(raw).map(key => raw[key]).filter(Boolean);
    }
    return [];
  }

  function mockupIndexById(id, arr) {
    if (id === undefined || id === null) return -1;
    const key = String(id).trim();
    if (!key) return -1;
    const list = Array.isArray(arr) ? arr : mockups();
    const keyNumeric = parseNumeric(key);
    for (let i = 0; i < list.length; i++) {
      const mk = list[i];
      if (!mk || mk.id === undefined || mk.id === null) continue;
      const mkId = String(mk.id).trim();
      if (!mkId) continue;
      if (mkId === key) return i;
      if (keyNumeric !== null && mkId === String(keyNumeric)) return i;
    }
    return -1;
  }
  function types() { return settings.types || ['Póló', 'Pulóver']; }
  function fontEntries() { return settings.fonts || []; }

  const typeProductAssignments = (() => {
    const raw = settings.type_products;
    const map = {};
    if (raw && typeof raw === 'object') {
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

  function typeProductMap() {
    return typeProductAssignments;
  }

  function hasSizeValue() {
    if (!sizeSel) return false;
    const value = (sizeSel.value || '').toString().trim();
    return value !== '';
  }

  function hasSizeOptions() {
    if (!sizeSel) return false;
    return Array.from(sizeSel.options || []).some(opt => {
      return ((opt.value || '').toString().trim() !== '');
    });
  }

  function hasCompleteSelection() {
    const sel = currentSelection();
    if (!sel || !sel.pid) return false;
    if (!sel.type) return false;
    if (!sel.color) return false;
    return hasSizeValue();
  }

  function updateActionStates() {
    const ready = hasCompleteSelection();
    const busy = saving || actionSubmitting;
    if (addToCartBtn) {
      addToCartBtn.disabled = !ready || busy;
    }
    if (bulkModalTrigger) {
      const sizesAvailable = hasSizeOptions();
      bulkModalTrigger.disabled = !ready || !sizesAvailable || busy;
    }
    syncMobileCompleteState();
    syncMobileBulkState();
  }

  function parseFontEntry(entry) {
    if (typeof entry !== 'string') return null;
    const parts = entry.split('|').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    if (parts.length === 1) {
      return { label: parts[0], family: parts[0], url: '' };
    }
    if (parts.length === 2) {
      return { label: parts[0], family: parts[0], url: parts[1] };
    }
    return { label: parts[0], family: parts[1], url: parts[2] };
  }

  function ensureFontLoaded(font) {
    if (!font || !font.url || loadedFontUrls.has(font.url)) return;
    loadedFontUrls.add(font.url);
    if (/\.(woff2?|ttf|otf|eot)$/i.test(font.url) && typeof FontFace !== 'undefined') {
      try {
        const face = new FontFace(font.family, `url(${font.url})`);
        face.load().then(f => {
          if (document.fonts && document.fonts.add) {
            document.fonts.add(f);
          }
          c.requestRenderAll();
        }).catch(() => { });
      } catch (e) { /* ignore */ }
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);
    }
  }

  function addFontOption(font) {
    if (!fontFamilySel || !font || !font.family) return;
    const exists = Array.from(fontFamilySel.options).some(opt => opt.value === font.family);
    if (exists) return;
    const opt = document.createElement('option');
    opt.value = font.family;
    opt.textContent = font.label || font.family;
    fontFamilySel.appendChild(opt);
    ensureFontLoaded(font);
  }

  function populateFontOptions() {
    if (!fontFamilySel) return;
    fontFamilySel.innerHTML = '';
    const defaults = [
      { label: 'Arial', family: 'Arial' },
      { label: 'Roboto', family: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
      { label: 'Montserrat', family: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap' },
      { label: 'Lato', family: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' }
    ];
    defaults.forEach(addFontOption);
    fontEntries().map(parseFontEntry).forEach(addFontOption);
    if (!fontFamilySel.value && fontFamilySel.options.length) {
      fontFamilySel.value = fontFamilySel.options[0].value;
    }
  }

  function formatColorLabel(str) {
    if (typeof str !== 'string') return '';
    const trimmed = str.trim();
    const bracket = trimmed.replace(/\s*\([^)]*\)\s*$/, '');
    if (bracket.length) return bracket;
    return trimmed;
  }

  function normalizedTypeValue(value) {
    if (value === undefined || value === null) return '';
    return value.toString().trim().toLowerCase();
  }

  function normalizedColorValue(value) {
    if (value === undefined || value === null) return '';
    return value.toString().trim().toLowerCase();
  }

  function colorEntryFromString(colorName) {
    const original = (colorName || '').toString().trim();
    if (!original) return null;
    const normalized = normalizedColorValue(original);
    if (!normalized) return null;
    const label = formatColorLabel(original);
    if (!label) return null;
    return { original, normalized, label };
  }

  function flattenTypeColorMap(cfg) {
    const map = cfg && cfg.colors_by_type && typeof cfg.colors_by_type === 'object' ? cfg.colors_by_type : null;
    if (!map) return [];
    const seen = new Set();
    const result = [];
    Object.keys(map).forEach(typeKey => {
      const list = Array.isArray(map[typeKey]) ? map[typeKey] : [];
      list.forEach(colorName => {
        const entry = colorEntryFromString(colorName);
        if (!entry) return;
        if (seen.has(entry.normalized)) return;
        seen.add(entry.normalized);
        result.push(entry.original);
      });
    });
    return result;
  }

  function hasTypeColorConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return false;
    const map = cfg.colors_by_type;
    if (!map || typeof map !== 'object') return false;
    return Object.keys(map).some(key => Array.isArray(map[key]));
  }

  function colorStringsForType(cfg, typeValue) {
    const normalizedType = normalizedTypeValue(typeValue);
    const map = cfg && cfg.colors_by_type && typeof cfg.colors_by_type === 'object' ? cfg.colors_by_type : null;
    const hasTypeConfig = hasTypeColorConfig(cfg);

    if (map && normalizedType) {
      if (Object.prototype.hasOwnProperty.call(map, normalizedType)) {
        return Array.isArray(map[normalizedType]) ? map[normalizedType] : [];
      }
      if (hasTypeConfig) {
        return [];
      }
    }

    if (map && !normalizedType) {
      const flattened = flattenTypeColorMap(cfg);
      if (flattened.length) return flattened;
    }

    if (!hasTypeConfig && Array.isArray(cfg?.colors)) {
      return cfg.colors;
    }

    return [];
  }

  function productSupportsType(cfg, typeValue) {
    const normalized = normalizedTypeValue(typeValue);
    if (!normalized) return true;
    const list = Array.isArray(cfg?.types) && cfg.types.length ? cfg.types : types();
    return list.some(entry => normalizedTypeValue(entry) === normalized);
  }

  function colorCodeFromText(str) {
    if (typeof str !== 'string') return '';
    const hexMatch = str.match(/#([0-9a-f]{3,8})/i);
    if (hexMatch) return `#${hexMatch[1]}`;
    const cleaned = str.replace(/\([^)]*\)/g, '').trim().toLowerCase();
    const canCheck = typeof CSS !== 'undefined' && typeof CSS.supports === 'function';
    if (cleaned && canCheck && CSS.supports('color', cleaned)) return cleaned;
    return '';
  }

  function variantHasActiveMockup(cfg, typeValue, colorValue, list) {
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

  function availableColorsForType(cfg, typeValue) {
    const typeConfigured = hasTypeColorConfig(cfg);
    const colors = colorStringsForType(cfg, typeValue);
    if (!colors.length) return { entries: [], restricted: false, typeConfigured };
    const map = cfg?.map && typeof cfg.map === 'object' ? cfg.map : {};
    const mkList = mockups();
    const hasAnyActiveMapping = Object.keys(map).some(key => resolveMockupIndex(map[key], mkList) >= 0);
    const normalizedType = normalizedTypeValue(typeValue);
    const entries = [];

    colors.forEach(colorName => {
      const entry = colorEntryFromString(colorName);
      if (!entry) return;
      let include = true;
      if (hasAnyActiveMapping) {
        if (normalizedType) {
          include = variantHasActiveMockup(cfg, normalizedType, entry.normalized, mkList);
        } else {
          include = Object.keys(map).some(key => {
            const parts = key.split('|');
            if (parts.length !== 2) return false;
            if (parts[1] !== entry.normalized) return false;
            return resolveMockupIndex(map[key], mkList) >= 0;
          });
        }
      }
      if (include) {
        entries.push(entry);
      }
    });

    return { entries, restricted: hasAnyActiveMapping, typeConfigured };
  }

  function ensureSelectValue(selectEl) {
    if (!selectEl) return;
    const values = Array.from(selectEl.options).map(o => o.value);
    if (!values.length) {
      selectEl.value = '';
      return;
    }
    if (!values.includes(selectEl.value)) {
      selectEl.value = values[0];
    }
  }

  function dispatchChangeEvent(el) {
    if (!el) return;
    try {
      const evt = new Event('change', { bubbles: true });
      el.dispatchEvent(evt);
    } catch (err) {
      if (typeof document !== 'undefined' && document.createEvent) {
        const legacyEvt = document.createEvent('Event');
        legacyEvt.initEvent('change', true, false);
        el.dispatchEvent(legacyEvt);
      }
    }
  }

  function renderColorChoices() {
    if (!modalColorList) {
      updateColorTriggerLabel();
      return;
    }
    modalColorList.innerHTML = '';
    const options = Array.from(colorSel.options);
    const hasOptions = options.length > 0;
    if (colorModalTrigger) {
      if (hasOptions) {
        colorModalTrigger.removeAttribute('disabled');
      } else {
        colorModalTrigger.setAttribute('disabled', 'disabled');
      }
    }
    if (!hasOptions) {
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Ehhez a termékhez nincs szín beállítva.';
      modalColorList.appendChild(empty);
      closeColorModal();
      updateColorTriggerLabel();
      return;
    }
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-modal-swatch' + (opt.value === colorSel.value ? ' is-active' : '');
      const colorCode = colorCodeFromText(opt.dataset.rawColor || opt.dataset.original || opt.textContent);
      if (colorCode) {
        btn.style.setProperty('--swatch-color', colorCode);
      }
      const label = opt.dataset.display || opt.textContent;
      btn.innerHTML = `<span class="nb-modal-swatch-color"></span><span class="nb-modal-swatch-label">${label}</span>`;
      btn.onclick = () => {
        const previous = colorSel.value;
        colorSel.value = opt.value;
        if (colorSel.value !== previous) {
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

  function renderSizeButtons() {
    if (!sizeButtonsWrap) return;
    sizeButtonsWrap.innerHTML = '';
    const options = Array.from(sizeSel.options);
    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'nb-empty';
      empty.textContent = 'Nincs méret megadva.';
      sizeButtonsWrap.appendChild(empty);
      updateActionStates();
      return;
    }
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-pill' + (opt.value === sizeSel.value ? ' is-active' : '');
      btn.textContent = opt.textContent;
      btn.onclick = () => {
        sizeSel.value = opt.value;
        renderSizeButtons();
        updateSelectionSummary();
      };
      sizeButtonsWrap.appendChild(btn);
    });
    updateActionStates();
  }

  function clearBulkSizeState() {
    Object.keys(bulkSizeState).forEach(key => { delete bulkSizeState[key]; });
    updateBulkDiscountHint();
  }

  function hasBulkDiscounts() {
    return Array.isArray(bulkDiscountTiers) && bulkDiscountTiers.length > 0;
  }

  function totalBulkQuantity() {
    return Object.keys(bulkSizeState).reduce((sum, key) => {
      const qty = parseInt(bulkSizeState[key], 10);
      if (!Number.isFinite(qty) || qty <= 0) {
        return sum;
      }
      return sum + qty;
    }, 0);
  }

  function resolveBulkDiscountForQuantity(qty) {
    const quantity = parseInt(qty, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }
    let matched = null;
    bulkDiscountTiers.forEach(tier => {
      if (!tier) return;
      if (quantity < tier.min) return;
      if (tier.max > 0 && quantity > tier.max) return;
      if (!matched || tier.percent > matched.percent || (tier.percent === matched.percent && tier.min > matched.min)) {
        matched = tier;
      }
    });
    return matched;
  }

  function nextBulkDiscountAfter(qty) {
    const quantity = parseInt(qty, 10);
    if (!Number.isFinite(quantity)) {
      return null;
    }
    for (let i = 0; i < bulkDiscountTiers.length; i++) {
      const tier = bulkDiscountTiers[i];
      if (!tier) continue;
      if (quantity < tier.min) {
        return tier;
      }
    }
    return null;
  }

  function formatPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '0';
    }
    const fractionDigits = Math.abs(num - Math.round(num)) < 0.005 ? 0 : 2;
    try {
      return num.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 });
    } catch (e) {
      return num.toFixed(fractionDigits);
    }
  }

  function renderBulkDiscountTable() {
    if (!bulkDiscountSection || !bulkDiscountTable) {
      return;
    }
    if (!hasBulkDiscounts()) {
      bulkDiscountSection.hidden = true;
      bulkDiscountTable.innerHTML = '';
      if (bulkDiscountHint) {
        bulkDiscountHint.textContent = '';
      }
      return;
    }
    bulkDiscountSection.hidden = false;
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Darabtól', 'Darabig', 'Kedvezmény'].forEach(label => {
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

  function updateBulkDiscountHint() {
    if (!bulkDiscountHint || !hasBulkDiscounts()) {
      if (bulkDiscountHint) {
        bulkDiscountHint.textContent = '';
      }
      return;
    }
    const qty = totalBulkQuantity();
    if (!qty) {
      bulkDiscountHint.textContent = 'Adj meg mennyiségeket a kedvezmény kiszámításához.';
      return;
    }
    const active = resolveBulkDiscountForQuantity(qty);
    if (active) {
      bulkDiscountHint.innerHTML = `Jelenleg <strong>${qty} db</strong> után <strong>${formatPercent(active.percent)}% kedvezmény</strong> jár.`;
      return;
    }
    const upcoming = nextBulkDiscountAfter(qty);
    if (upcoming) {
      const remaining = Math.max(0, upcoming.min - qty);
      bulkDiscountHint.textContent = `Még ${remaining} darabnál indul a ${formatPercent(upcoming.percent)}% kedvezmény.`;
      return;
    }
    bulkDiscountHint.textContent = '';
  }

  function renderBulkSizeList() {
    if (!bulkModalList) return;
    bulkModalList.innerHTML = '';
    const options = sizeSel ? Array.from(sizeSel.options) : [];
    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Nincs méret megadva.';
      bulkModalList.appendChild(empty);
      updateActionStates();
      return;
    }
    options.forEach(opt => {
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
      if (Number.isFinite(current) && current > 0) {
        input.value = String(current);
      } else {
        input.value = '';
      }
      input.placeholder = '0';

      input.addEventListener('input', () => {
        const digitsOnly = input.value.replace(/[^0-9]/g, '');
        if (digitsOnly !== input.value) {
          input.value = digitsOnly;
        }
      });

      input.addEventListener('change', () => {
        const parsed = parseInt(input.value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
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

  function collectBulkSizeEntries() {
    if (!bulkModalList) return [];
    const entries = [];
    const rows = Array.from(bulkModalList.querySelectorAll('.nb-bulk-size-row'));
    rows.forEach(row => {
      const value = (row.dataset.sizeValue || '').toString();
      if (!value) return;
      const label = row.dataset.sizeLabel || value;
      const input = row.querySelector('input');
      const raw = input ? input.value : '';
      const qty = parseInt(raw, 10);
      if (!Number.isFinite(qty) || qty <= 0) {
        if (Object.prototype.hasOwnProperty.call(bulkSizeState, value)) {
          delete bulkSizeState[value];
        }
        if (input && raw !== '') {
          input.value = '';
        }
        return;
      }
      bulkSizeState[value] = qty;
      entries.push({ value, label, quantity: qty });
    });
    updateActionStates();
    updateBulkDiscountHint();
    return entries;
  }

  function openBulkModal() {
    if (!bulkModal) return;
    renderBulkSizeList();
    renderBulkDiscountTable();
    updateBulkDiscountHint();
    bulkModal.hidden = false;
    updateModalBodyState();
  }

  function closeBulkModal() {
    if (!bulkModal) return;
    bulkModal.hidden = true;
    updateModalBodyState();
  }

  function renderModalTypes() {
    if (!modalTypeList) return;
    modalTypeList.innerHTML = '';
    const typeOptions = types();
    if (!typeOptions.length) {
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Nincs típus konfigurálva.';
      modalTypeList.appendChild(empty);
      return;
    }
    const currentValue = normalizedTypeValue(typeSel.value);
    typeOptions.forEach(label => {
      const normalized = normalizedTypeValue(label);
      if (!normalized) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-modal-type' + (normalized === currentValue ? ' is-active' : '');
      btn.textContent = label;
      btn.onclick = () => {
        const currentNormalized = normalizedTypeValue(typeSel.value);
        if (currentNormalized !== normalized) {
          const match = Array.from(typeSel.options).find(opt => normalizedTypeValue(opt.value) === normalized);
          typeSel.value = match ? match.value : normalized;
          dispatchChangeEvent(typeSel);
        }
        closeProductModal();
      };
      modalTypeList.appendChild(btn);
    });
  }

  function firstProductForType(typeValue) {
    const cat = getCatalog();
    const normalized = normalizedTypeValue(typeValue);
    const list = productList();
    const assignedMap = typeProductMap();
    if (normalized && assignedMap && Object.prototype.hasOwnProperty.call(assignedMap, normalized)) {
      const assigned = assignedMap[normalized];
      if (assigned && list.some(pid => String(pid) === assigned)) {
        const assignedId = parseInt(assigned, 10);
        const assignedCfg = cat[assignedId] || {};
        if (!assignedId || productSupportsType(assignedCfg, typeValue) || !Array.isArray(assignedCfg?.types) || !assignedCfg.types.length) {
          return assigned;
        }
      }
    }
    for (let i = 0; i < list.length; i++) {
      const pid = list[i];
      const cfg = cat[pid] || {};
      if (!normalized || productSupportsType(cfg, normalized)) {
        return String(pid);
      }
    }
    return productSel.options[0]?.value || '';
  }

  function ensureProductMatchesType() {
    if (!productSel.options.length) return;
    const currentType = typeSel.value;
    const normalizedType = normalizedTypeValue(currentType);
    const assignedMap = typeProductMap();
    if (normalizedType && assignedMap && Object.prototype.hasOwnProperty.call(assignedMap, normalizedType)) {
      const assigned = assignedMap[normalizedType];
      if (assigned && Array.from(productSel.options).some(opt => opt.value === assigned)) {
        if (productSel.value !== assigned) {
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
    if (fallback && productSel.value !== fallback) {
      productSel.value = fallback;
      dispatchChangeEvent(productSel);
    }
  }

  function updateModalBodyState() {
    const anyOpen = (productModal && !productModal.hidden) || (colorModal && !colorModal.hidden) || (bulkModal && !bulkModal.hidden);
    if (anyOpen) {
      document.body.classList.add('nb-modal-open');
    } else {
      document.body.classList.remove('nb-modal-open');
    }
  }

  function openProductModal() {
    if (!productModal) return;
    renderModalTypes();
    productModal.hidden = false;
    updateModalBodyState();
  }

  function closeProductModal() {
    if (!productModal) return;
    productModal.hidden = true;
    updateModalBodyState();
  }

  function openColorModal() {
    if (!colorModal) return;
    renderColorChoices();
    if (colorModalTrigger && colorModalTrigger.hasAttribute('disabled')) return;
    colorModal.hidden = false;
    updateModalBodyState();
  }

  function closeColorModal() {
    if (!colorModal) return;
    colorModal.hidden = true;
    updateModalBodyState();
  }

  function getColorLabel() {
    const opt = Array.from(colorSel.options).find(o => o.value === colorSel.value);
    return opt ? (opt.dataset.display || opt.dataset.original || opt.textContent) : '';
  }

  function updateColorTriggerLabel() {
    if (!colorModalLabel) return;
    const label = getColorLabel();
    colorModalLabel.textContent = label ? `Szín: ${label}` : 'Válassz színt';
  }

  function updateSelectionSummary() {
    const sel = currentSelection();
    const typeLabel = typeSel.selectedOptions[0]?.dataset?.label || typeSel.selectedOptions[0]?.textContent || '';
    const colorLabel = getColorLabel();
    const sizeLabel = sizeSel.value || '';
    if (productTitleEl) {
      productTitleEl.textContent = sel.cfg?.title || 'Termék';
    }
    if (selectionSummaryEl) {
      selectionSummaryEl.innerHTML = '';
      if (typeLabel) {
        const chip = document.createElement('span');
        chip.textContent = `Típus: ${typeLabel}`;
        selectionSummaryEl.appendChild(chip);
      }
      if (colorLabel) {
        const chip = document.createElement('span');
        chip.textContent = `Szín: ${colorLabel}`;
        selectionSummaryEl.appendChild(chip);
      }
      if (sizeLabel) {
        const chip = document.createElement('span');
        chip.textContent = `Méret: ${sizeLabel}`;
        selectionSummaryEl.appendChild(chip);
      }
    }
    updateColorTriggerLabel();
    updatePriceDisplay();
    updateActionStates();
  }

  function currentProductPriceMarkup() {
    const sel = currentSelection();
    if (!sel || !sel.cfg) return '';
    const cfg = sel.cfg;
    if (cfg.price_html && typeof cfg.price_html === 'string' && cfg.price_html.trim()) {
      return cfg.price_html;
    }
    if (cfg.price_text && typeof cfg.price_text === 'string' && cfg.price_text.trim()) {
      return cfg.price_text;
    }
    return '';
  }

  function currentProductPriceText() {
    const sel = currentSelection();
    if (!sel || !sel.cfg) return '';
    const cfg = sel.cfg;
    if (cfg.price_text && typeof cfg.price_text === 'string') {
      return cfg.price_text;
    }
    if (cfg.price_html && typeof cfg.price_html === 'string') {
      return cfg.price_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  function parsePriceValue(str) {
    if (typeof str !== 'string') return null;
    let cleaned = str.replace(/[^0-9,\.\-]/g, '');
    if (!cleaned) return null;
    cleaned = cleaned.replace(/,/g, '.');
    const dotMatches = cleaned.match(/\./g) || [];
    if (dotMatches.length > 1) {
      const lastDot = cleaned.lastIndexOf('.');
      const integerPart = cleaned.slice(0, lastDot).replace(/\./g, '');
      const decimalPart = cleaned.slice(lastDot + 1);
      cleaned = integerPart + (decimalPart !== '' ? '.' + decimalPart : '');
    } else if (dotMatches.length === 1) {
      const dotPos = cleaned.indexOf('.');
      const decimals = cleaned.length - dotPos - 1;
      if (decimals === 3) {
        cleaned = cleaned.replace('.', '');
      }
    }
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }

  function doubleSidedFeeValue() {
    return positiveNumberOr(settings.double_sided_fee, 0);
  }

  function shouldApplyDoubleSidedSurcharge() {
    return doubleSidedEnabled && sideHasContent('back') && doubleSidedFeeValue() > 0;
  }

  function formatPrice(amount) {
    if (!Number.isFinite(amount)) return '';
    const rounded = Math.round(amount);
    try {
      return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rounded);
    } catch (e) {
      return rounded.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' Ft';
    }
  }

  function updatePriceDisplay() {
    if (!priceDisplayEl) return;
    const markup = currentProductPriceMarkup();
    const priceText = currentProductPriceText();
    const baseAmount = parsePriceValue(priceText);
    const surcharge = shouldApplyDoubleSidedSurcharge() ? doubleSidedFeeValue() : 0;
    const hasBase = (markup && markup.trim()) || (priceText && priceText.trim());
    const totalTargets = [priceTotalEl, priceTotalMobileEl].filter(Boolean);
    const surchargeTargets = [];
    if (priceSurchargeRow && priceSurchargeValueEl) {
      surchargeTargets.push({ row: priceSurchargeRow, value: priceSurchargeValueEl });
    }
    if (!hasBase) {
      priceDisplayEl.classList.add('nb-price-display--pending');
      if (priceBaseEl) priceBaseEl.textContent = '—';
      surchargeTargets.forEach(target => {
        target.row.hidden = true;
        target.value.textContent = formatPrice(0);
      });
      totalTargets.forEach(el => {
        el.textContent = 'Ár nem elérhető.';
      });
      return;
    }

    priceDisplayEl.classList.remove('nb-price-display--pending');

    if (priceBaseEl) {
      if (markup && markup !== priceText) {
        priceBaseEl.innerHTML = markup;
      } else {
        priceBaseEl.textContent = priceText;
      }
    } else if (markup) {
      priceDisplayEl.innerHTML = markup;
    }

    surchargeTargets.forEach(target => {
      if (surcharge > 0) {
        target.row.hidden = false;
        target.value.textContent = `+${formatPrice(surcharge)}`;
      } else {
        target.row.hidden = true;
        target.value.textContent = formatPrice(0);
      }
    });

    if (totalTargets.length) {
      if (Number.isFinite(baseAmount)) {
        const total = baseAmount + (Number.isFinite(surcharge) ? surcharge : 0);
        totalTargets.forEach(el => {
          el.textContent = formatPrice(total);
        });
      } else if (markup && markup !== priceText) {
        totalTargets.forEach(el => {
          el.innerHTML = markup;
        });
      } else {
        totalTargets.forEach(el => {
          el.textContent = priceText || '—';
        });
      }
    }
  }

  function resolveMockupPointer(value, arr) {
    if (value === undefined || value === null) return -1;
    const list = Array.isArray(arr) ? arr : mockups();
    if (!list.length) return -1;
    const numeric = parseNumeric(value);
    if (numeric !== null) {
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
    if (tokens) {
      for (let i = 0; i < tokens.length; i++) {
        const token = parseInt(tokens[i], 10);
        if (!Number.isFinite(token)) continue;
        if (token >= 0 && token < list.length) return token;
        const byId = mockupIndexById(token, list);
        if (byId >= 0) return byId;
      }
    }
    return -1;
  }

  function normalizedMockupIndex(value, arr) {
    return resolveMockupPointer(value, arr);
  }

  function resolveMockupIndex(mapping, arr, opts) {
    const list = Array.isArray(arr) ? arr : mockups();
    const normalizedSide = (opts && opts.side === 'back') ? 'back' : 'front';
    if (!mapping || typeof mapping !== 'object') {
      return normalizedMockupIndex(mapping, list);
    }

    const frontCandidates = [
      mapping.mockup_index,
      mapping.mockupIndex,
      mapping.mockup_id,
      mapping.mockupId,
      mapping.mockup
    ];
    const backCandidates = [
      mapping.mockup_back_index,
      mapping.mockupBackIndex,
      mapping.mockup_back_id,
      mapping.mockupBackId,
      mapping.mockup_back,
      mapping.mockupBack
    ];

    const pickFrom = normalizedSide === 'back' ? backCandidates : frontCandidates;
    for (let i = 0; i < pickFrom.length; i++) {
      const idx = normalizedMockupIndex(pickFrom[i], list);
      if (idx >= 0) return idx;
    }

    const nested = (mapping.mockups && typeof mapping.mockups === 'object') ? mapping.mockups : null;
    if (nested) {
      const nestedCandidates = normalizedSide === 'back'
        ? [nested.back, nested.back_index, nested.backIndex, nested.back_id, nested.backId]
        : [nested.front, nested.front_index, nested.frontIndex, nested.front_id, nested.frontId, nested.default];
      for (let i = 0; i < nestedCandidates.length; i++) {
        const idx = normalizedMockupIndex(nestedCandidates[i], list);
        if (idx >= 0) return idx;
      }
      if (normalizedSide === 'back' && Object.prototype.hasOwnProperty.call(nested, 'front')) {
        const idx = normalizedMockupIndex(nested.front, list);
        if (idx >= 0) return idx;
      }
    }

    if (normalizedSide === 'back') {
      for (let i = 0; i < frontCandidates.length; i++) {
        const idx = normalizedMockupIndex(frontCandidates[i], list);
        if (idx >= 0) return idx;
      }
      if (nested && Object.prototype.hasOwnProperty.call(nested, 'default')) {
        const idx = normalizedMockupIndex(nested.default, list);
        if (idx >= 0) return idx;
      }
    }

    return -1;
  }

  function currentSelection() {
    const pid = parseInt(productSel.value || 0, 10);
    const type = typeSel.value || '';
    const color = colorSel.value || '';
    const cfg = getCatalog()[pid] || {};
    const key = (type + '|' + color).toLowerCase();
    const mapping = (cfg.map || {})[key] || {};
    const list = mockups();
    const frontIndex = resolveMockupIndex(mapping, list, { side: 'front' });
    const backIndex = resolveMockupIndex(mapping, list, { side: 'back' });
    const frontMockup = frontIndex >= 0 ? (list[frontIndex] || null) : null;
    const backMockup = backIndex >= 0 ? (list[backIndex] || null) : null;
    const activeSide = activeSideKey === 'back' ? 'back' : 'front';
    let selectedMockup = activeSide === 'back' ? (backMockup || frontMockup) : (frontMockup || backMockup);
    if (!selectedMockup) {
      selectedMockup = null;
    }
    return {
      pid,
      type,
      color,
      cfg,
      mapping,
      mockup: selectedMockup,
      mockups: { front: frontMockup, back: backMockup },
      mockupIndex: frontIndex,
      mockupBackIndex: backIndex
    };
  }

  function referenceSizeForMockup(mk, area) {
    const areaW = positiveNumberOr(area?.canvas_w, null);
    const areaH = positiveNumberOr(area?.canvas_h, null);
    if (areaW && areaH) {
      return { w: areaW, h: areaH };
    }
    if (mk) {
      const nestedW = positiveNumberOr(mk.canvas?.w, null);
      const nestedH = positiveNumberOr(mk.canvas?.h, null);
      if (nestedW && nestedH) {
        return { w: nestedW, h: nestedH };
      }
      const canvasW = positiveNumberOr(mk.canvas_w, null);
      const canvasH = positiveNumberOr(mk.canvas_h, null);
      if (canvasW && canvasH) {
        return { w: canvasW, h: canvasH };
      }
    }
    return { w: defaultCanvasSize.w, h: defaultCanvasSize.h };
  }

  function preferredCanvasBounds() {
    const stageColumn = canvasEl.closest('.nb-column--stage');
    const stageFrame = canvasEl.closest('.nb-product-frame');
    const widthConstraints = [];
    const heightConstraints = [];

    if (stageColumn) {
      const rect = stageColumn.getBoundingClientRect();
      if (rect) {
        if (rect.width) {
          widthConstraints.push(Math.floor(rect.width));
        }
        if (rect.height) {
          heightConstraints.push(Math.floor(rect.height - 32));
        }
      }
    }

    if (stageFrame) {
      const rect = stageFrame.getBoundingClientRect();
      if (rect) {
        if (rect.width) {
          widthConstraints.push(Math.floor(rect.width));
        }
        if (rect.height) {
          heightConstraints.push(Math.floor(rect.height - 24));
        }
      }
    }

    if (window.innerWidth) {
      widthConstraints.push(Math.floor(window.innerWidth - 24));
    }
    if (window.innerHeight) {
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

  function applyCanvasSize(size) {
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
    if (!Number.isFinite(scaleX) || scaleX <= 0) {
      scaleX = 1;
    }
    if (!Number.isFinite(scaleY) || scaleY <= 0) {
      scaleY = 1;
    }

    const narrowLayout = (containerWidth && containerWidth <= 640)
      || (!containerWidth && window.innerWidth && window.innerWidth <= 768);
    let scale = narrowLayout ? scaleX : Math.min(scaleX, scaleY);
    if (!Number.isFinite(scale) || scale <= 0) {
      scale = narrowLayout ? scaleX : 1;
    }
    if (!Number.isFinite(scale) || scale <= 0) {
      scale = 1;
    }

    let appliedW = Math.max(1, Math.round(targetW * scale));
    let appliedH = Math.max(1, Math.round(targetH * scale));

    if (containerWidth && appliedW > containerWidth) {
      const containerScale = containerWidth / appliedW;
      appliedW = Math.max(1, Math.round(appliedW * containerScale));
      appliedH = Math.max(1, Math.round(appliedH * containerScale));
    }

    const dims = { width: appliedW, height: appliedH };
    const cssDims = { cssOnly: true };
    c.setDimensions(dims);
    c.setDimensions(dims, cssDims);

    const canvasWrapper = canvasElement.parentElement;
    if (canvasWrapper) {
      canvasWrapper.style.maxWidth = '100%';
      canvasWrapper.style.width = appliedW + 'px';
      canvasWrapper.style.height = appliedH + 'px';
    }

    canvasElement.style.maxWidth = '100%';
    canvasElement.style.width = appliedW + 'px';
    canvasElement.style.height = appliedH + 'px';

    if (c.calcOffset) {
      c.calcOffset();
    }
    designObjects().forEach(obj => {
      if (obj && typeof obj.setCoords === 'function') {
        obj.setCoords();
      }
    });
    if (typeof c.requestRenderAll === 'function') {
      c.requestRenderAll();
    }
    return { w: appliedW, h: appliedH };
  }

  function isDesignObject(obj) {
    return !!obj && !obj.__nb_bg && !obj.__nb_area;
  }

  function designObjects() {
    return c.getObjects().filter(isDesignObject);
  }

  function activeDesignObject() {
    const obj = c.getActiveObject();
    return isDesignObject(obj) ? obj : null;
  }

  function designObjectIndex(obj) {
    if (!isDesignObject(obj)) return -1;
    return designObjects().indexOf(obj);
  }

  function sideLabel(key) {
    const entry = availableSides.find(s => s.key === key);
    return entry ? entry.label : key;
  }

  function emptySideSnapshot() {
    return {
      json: { version: (c && c.version) || '5.0.0', objects: [] },
      objectCount: 0,
      hasContent: false
    };
  }

  function ensureSideState(key) {
    const normalized = key === 'back' ? 'back' : 'front';
    if (!sideStates[normalized]) {
      sideStates[normalized] = emptySideSnapshot();
    }
    return sideStates[normalized];
  }

  const PRINT_AREA_FILL = 'rgba(59,130,246,0.08)';
  const PRINT_AREA_STROKE = '#2563eb';

  function isPrintAreaDescriptor(obj) {
    if (!obj || obj.type !== 'rect') return false;
    if (obj.selectable !== false || obj.evented !== false) return false;
    if (obj.stroke !== PRINT_AREA_STROKE) return false;
    const fill = (typeof obj.fill === 'string') ? obj.fill.replace(/\s+/g, '') : '';
    if (fill !== PRINT_AREA_FILL) return false;
    if (!Array.isArray(obj.strokeDashArray)) return false;
    if (obj.strokeDashArray.length < 2) return false;
    if (obj.strokeDashArray[0] !== 10 || obj.strokeDashArray[1] !== 6) return false;
    return true;
  }

  function prunePrintAreaObjects(json) {
    if (!json || !Array.isArray(json.objects)) return json;
    json.objects = json.objects.filter(obj => !isPrintAreaDescriptor(obj));
    return json;
  }

  function sanitizeCanvasJSON() {
    const raw = c.toJSON(['__nb_layer_id', '__nb_layer_name', '__nb_curve']);
    const clean = Object.assign({}, raw);
    clean.background = 'rgba(0,0,0,0)';
    clean.backgroundImage = null;
    if (Array.isArray(clean.objects)) {
      clean.objects = clean.objects
        .filter(obj => !obj.__nb_bg && !obj.__nb_area)
        .filter(obj => !isPrintAreaDescriptor(obj));
    } else {
      clean.objects = [];
    }
    return clean;
  }

  function captureActiveSideState() {
    const state = ensureSideState(activeSideKey);
    const snapshot = sanitizeCanvasJSON();
    state.json = snapshot;
    state.objectCount = designObjects().length;
    state.hasContent = state.objectCount > 0;
  }

  function sideHasContent(key) {
    return ensureSideState(key).hasContent;
  }

  function updateCanvasEmptyHint() {
    if (!canvasEmptyHintEl) return;
    const hasContent = designObjects().length > 0;
    if (hasContent) {
      canvasEmptyHintEl.setAttribute('hidden', '');
    } else {
      canvasEmptyHintEl.removeAttribute('hidden');
    }
  }

  function updateSideUiState() {
    sideButtons.forEach(btn => {
      if (!btn) return;
      const key = btn.dataset.nbSide === 'back' ? 'back' : 'front';
      const isActive = key === activeSideKey;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (key === 'back') {
        btn.disabled = !doubleSidedEnabled;
      }
    });
    if (sideFabButton) {
      if (doubleSidedEnabled) {
        sideFabButton.removeAttribute('hidden');
      } else {
        sideFabButton.setAttribute('hidden', '');
      }
      const nextSide = activeSideKey === 'front' ? 'back' : 'front';
      sideFabButton.setAttribute('aria-label', `Váltás: ${sideLabel(nextSide)}`);
    }
  }

  function updateSideStatus() {
    if (!sideStatusEl) return;
    const badges = Array.from(sideStatusEl.querySelectorAll('[data-nb-side]'));
    badges.forEach(el => {
      const key = el.dataset.nbSide === 'back' ? 'back' : 'front';
      const hasContent = sideHasContent(key);
      let statusText = hasContent ? 'van terv' : 'üres';
      if (key === 'back' && !doubleSidedEnabled) {
        statusText = hasContent ? 'kikapcsolva, van terv' : 'kikapcsolva';
      }
      el.textContent = `${sideLabel(key)}: ${statusText}`;
    });
  }

  function totalSideCount() {
    return doubleSidedEnabled ? 2 : 1;
  }

  function usedSideCount() {
    const frontUsed = sideHasContent('front') ? 1 : 0;
    const backUsed = (doubleSidedEnabled && sideHasContent('back')) ? 1 : 0;
    return frontUsed + backUsed;
  }

  function updatePrintSummary() {
    if (!printSummaryEl) return;
    const used = usedSideCount();
    const total = totalSideCount();
    printSummaryEl.textContent = `Nyomtatási oldalak: ${used} / ${total}`;
  }

  function sheetKeysForTarget(key) {
    if (!key) return [];
    const bundle = sheetBundles[key];
    if (Array.isArray(bundle) && bundle.length) {
      return bundle.filter(entry => sheetSources.has(entry));
    }
    return sheetSources.has(key) ? [key] : [];
  }

  function restoreSheetSources(keys) {
    if (!Array.isArray(keys)) return;
    keys.forEach(sheetKey => {
      const source = sheetSources.get(sheetKey);
      if (!source || !source.node || !source.parent) return;
      const parent = source.parent;
      const sibling = source.nextSibling;
      if (source.node.parentNode === parent) return;
      if (sibling && sibling.parentNode === parent) {
        parent.insertBefore(source.node, sibling);
      } else {
        parent.appendChild(source.node);
      }
    });
  }

  function restoreAllSheetSources() {
    sheetSources.forEach(source => {
      if (!source || !source.node || !source.parent) return;
      if (source.node.parentNode === source.parent) return;
      const sibling = source.nextSibling;
      if (sibling && sibling.parentNode === source.parent) {
        source.parent.insertBefore(source.node, sibling);
      } else {
        source.parent.appendChild(source.node);
      }
    });
  }

  function updateToolbarActiveState() {
    mobileToolbarButtons.forEach((btn, key) => {
      if (!btn) return;
      const isActive = sheetState.activeKey === key;
      if (isActive) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  }

  function mobileUiEnabled() {
    return !!(mobileMedia && typeof mobileMedia.matches === 'boolean' && mobileMedia.matches);
  }

  function syncMobileCompleteState() {
    if (!mobileCompleteBtn) return;
    if (!mobileUiEnabled()) {
      mobileCompleteBtn.setAttribute('hidden', '');
      return;
    }
    mobileCompleteBtn.removeAttribute('hidden');
    if (addToCartBtn) {
      mobileCompleteBtn.disabled = !!addToCartBtn.disabled;
    } else {
      mobileCompleteBtn.disabled = true;
    }
  }

  function syncMobileBulkState() {
    if (!mobileBulkBtn) return;
    if (!mobileUiEnabled()) {
      mobileBulkBtn.setAttribute('hidden', '');
      return;
    }
    mobileBulkBtn.removeAttribute('hidden');
    const ready = hasCompleteSelection();
    const sizesAvailable = hasSizeOptions();
    const busy = saving || actionSubmitting;
    mobileBulkBtn.disabled = !ready || !sizesAvailable || busy;
  }

  function updateMobileLayerBadge() {
    const btn = mobileToolbarButtons.get('layers');
    if (!btn) return;
    const badge = btn.querySelector('.nb-mobile-icon-badge');
    const count = designObjects().length;
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.removeAttribute('hidden');
      } else {
        badge.setAttribute('hidden', '');
      }
    }
    if (activeDesignObject()) {
      btn.classList.add('has-selection');
    } else {
      btn.classList.remove('has-selection');
    }
  }

  function mobileSelectionLabelText() {
    const obj = activeDesignObject();
    if (!obj) return 'Nincs kiválasztott elem';
    const label = layerLabel(obj) || '';
    return label || 'Kijelölt elem';
  }

  function syncMobileSelectionUi() {
    if (!mobileUiEnabled()) return;
    if (mobileSelectionLabel) {
      mobileSelectionLabel.textContent = mobileSelectionLabelText();
    }
    const obj = activeDesignObject();
    const hasSelection = !!obj;
    const order = designObjects();
    const index = hasSelection ? designObjectIndex(obj) : -1;
    Object.keys(mobileQuickButtons).forEach(key => {
      const btn = mobileQuickButtons[key];
      if (!btn) return;
      let disabled = !hasSelection;
      if (hasSelection) {
        if (key === 'forward') {
          disabled = index === order.length - 1;
        } else if (key === 'backward') {
          disabled = index <= 0;
        }
        if (key === 'visibility') {
          btn.textContent = obj.visible === false ? 'Mutat' : 'Elrejt';
        }
      }
      btn.disabled = !!disabled;
    });
    updateMobileLayerBadge();
  }

  function closeMobileSheet(options) {
    const opts = options || {};
    if (!mobileSheet || !sheetState.activeKey) return;
    if (!opts.fromPopState && sheetState.historyDepth > 0 && typeof history !== 'undefined' && history.back) {
      sheetState.pendingClose = true;
      history.back();
      return;
    }
    const keys = sheetKeysForTarget(sheetState.activeKey);
    restoreSheetSources(keys);
    if (mobileSheetContent) {
      while (mobileSheetContent.firstChild) {
        const child = mobileSheetContent.firstChild;
        mobileSheetContent.removeChild(child);
      }
    }
    sheetState.activeKey = '';
    sheetState.expanded = false;
    sheetState.pendingClose = false;
    if (opts.fromPopState && sheetState.historyDepth > 0) {
      sheetState.historyDepth = Math.max(0, sheetState.historyDepth - 1);
    }
    if (mobileSheetOverlay) {
      mobileSheetOverlay.setAttribute('hidden', '');
    }
    mobileSheet.classList.remove('is-open', 'is-expanded', 'is-dragging');
    mobileSheet.setAttribute('hidden', '');
    mobileSheet.setAttribute('aria-hidden', 'true');
    mobileSheet.style.transform = '';
    updateToolbarActiveState();
  }

  function openMobileSheet(key) {
    if (!mobileUiEnabled() || !mobileSheet || !mobileSheetContent) return;
    if (!key) return;
    if (sheetState.activeKey === key) {
      closeMobileSheet();
      return;
    }
    const wasActive = !!sheetState.activeKey;
    if (sheetState.activeKey) {
      const previousKeys = sheetKeysForTarget(sheetState.activeKey);
      restoreSheetSources(previousKeys);
      while (mobileSheetContent.firstChild) {
        mobileSheetContent.removeChild(mobileSheetContent.firstChild);
      }
    }
    const keys = sheetKeysForTarget(key);
    if (!keys.length) {
      sheetState.activeKey = '';
      updateToolbarActiveState();
      return;
    }
    const titles = [];
    keys.forEach(sheetKey => {
      const source = sheetSources.get(sheetKey);
      if (!source || !source.node) return;
      source.parent = source.node.parentNode;
      source.nextSibling = source.node.nextSibling;
      if (source.title) {
        titles.push(source.title);
      }
      mobileSheetContent.appendChild(source.node);
    });
    if (mobileSheetTitle) {
      const label = titles.length ? titles.join(' • ') : '';
      if (label) {
        mobileSheetTitle.textContent = label;
      } else {
        const btn = mobileToolbarButtons.get(key);
        mobileSheetTitle.textContent = btn ? (btn.getAttribute('aria-label') || btn.textContent || '') : '';
      }
    }
    if (!wasActive) {
      if (mobileSheetOverlay) {
        mobileSheetOverlay.removeAttribute('hidden');
      }
      mobileSheet.removeAttribute('hidden');
      mobileSheet.setAttribute('aria-hidden', 'false');
      mobileSheet.classList.add('is-open');
      if (typeof history !== 'undefined' && history.pushState && sheetState.historyDepth === 0) {
        try {
          history.pushState({ __nb_sheet: true }, document.title, location.href);
          sheetState.historyDepth = 1;
        } catch (e) { /* ignore */ }
      }
    }
    mobileSheet.classList.remove('is-expanded');
    sheetState.expanded = false;
    sheetState.pendingClose = false;
    sheetState.activeKey = key;
    updateToolbarActiveState();
  }

  function refreshMobileUi() {
    const enabled = mobileUiEnabled();
    if (mobileToolbar) {
      if (enabled) {
        mobileToolbar.removeAttribute('hidden');
      } else {
        mobileToolbar.setAttribute('hidden', '');
      }
    }
    if (mobileStatusBar) {
      if (enabled) {
        mobileStatusBar.removeAttribute('hidden');
      } else {
        mobileStatusBar.setAttribute('hidden', '');
      }
    }
    if (!enabled) {
      const previousDepth = sheetState.historyDepth;
      closeMobileSheet({ fromPopState: true });
      restoreAllSheetSources();
      if (previousDepth > 0 && typeof history !== 'undefined' && history.back) {
        sheetState.pendingClose = true;
        history.back();
      }
    }
    syncMobileSelectionUi();
    syncMobileCompleteState();
    syncMobileBulkState();
  }

  function toggleSheetExpansion() {
    if (!mobileSheet || !sheetState.activeKey) return;
    sheetState.expanded = !sheetState.expanded;
    mobileSheet.classList.toggle('is-expanded', sheetState.expanded);
  }

  function beginSheetDrag(evt) {
    if (!mobileSheet || !mobileSheetHandle || !sheetState.activeKey) return;
    if (!evt || typeof evt.clientY !== 'number') {
      return toggleSheetExpansion();
    }
    sheetDragState = {
      startY: evt.clientY,
      lastY: evt.clientY,
      moved: false
    };
    mobileSheet.classList.add('is-dragging');
    if (typeof mobileSheetHandle.setPointerCapture === 'function' && evt.pointerId !== undefined) {
      try { mobileSheetHandle.setPointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
    }
    window.addEventListener('pointermove', onSheetDragMove);
    window.addEventListener('pointerup', endSheetDrag);
    window.addEventListener('pointercancel', endSheetDrag);
  }

  function onSheetDragMove(evt) {
    if (!sheetDragState || !mobileSheet) return;
    if (typeof evt.clientY !== 'number') return;
    sheetDragState.lastY = evt.clientY;
    const delta = sheetDragState.lastY - sheetDragState.startY;
    if (Math.abs(delta) > 6) {
      sheetDragState.moved = true;
    }
    if (delta > 0) {
      mobileSheet.style.transform = `translateY(${delta}px)`;
    } else {
      mobileSheet.style.transform = 'translateY(0)';
    }
  }

  function endSheetDrag(evt) {
    if (!sheetDragState || !mobileSheet) return;
    if (typeof evt.clientY === 'number') {
      sheetDragState.lastY = evt.clientY;
    }
    const delta = sheetDragState.lastY - sheetDragState.startY;
    const moved = sheetDragState.moved;
    sheetDragState = null;
    mobileSheet.classList.remove('is-dragging');
    mobileSheet.style.transform = '';
    if (mobileSheetHandle && typeof mobileSheetHandle.releasePointerCapture === 'function' && evt.pointerId !== undefined) {
      try { mobileSheetHandle.releasePointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
    }
    window.removeEventListener('pointermove', onSheetDragMove);
    window.removeEventListener('pointerup', endSheetDrag);
    window.removeEventListener('pointercancel', endSheetDrag);
    if (!moved) {
      toggleSheetExpansion();
      return;
    }
    if (delta > 120) {
      closeMobileSheet();
      return;
    }
    if (delta < -80) {
      sheetState.expanded = true;
      mobileSheet.classList.add('is-expanded');
      return;
    }
    mobileSheet.classList.toggle('is-expanded', sheetState.expanded);
  }

  function cloneSideJson(state) {
    if (!state || !state.json) {
      return { version: (c && c.version) || '5.0.0', objects: [] };
    }
    try {
      const parsed = JSON.parse(JSON.stringify(state.json));
      // If it's an array (from templates), wrap it in a proper Fabric.js canvas state
      if (Array.isArray(parsed)) {
        return { version: (c && c.version) || '5.0.0', objects: parsed };
      }
      // Otherwise it's already a full canvas state object
      return parsed;
    } catch (e) {
      return { version: (c && c.version) || '5.0.0', objects: [] };
    }
  }

  function loadSideState(key) {
    const state = ensureSideState(key);
    const json = prunePrintAreaObjects(cloneSideJson(state));
    return new Promise(resolve => {
      const previousBg = (typeof c.backgroundColor !== 'undefined' && c.backgroundColor) ? c.backgroundColor : '#fff';
      if (typeof c.clear === 'function') {
        c.clear();
        c.backgroundColor = previousBg || '#fff';
      } else {
        const existing = c.getObjects ? c.getObjects().slice() : [];
        existing.forEach(obj => {
          c.remove(obj);
        });
      }
      c.__nb_area = null;
      c.__nb_area_rect = null;
      if (typeof c.discardActiveObject === 'function') {
        c.discardActiveObject();
      }
      c.loadFromJSON(json, () => {
        setMockupBgAndArea();
        designObjects().forEach(obj => {
          applyObjectUiDefaults(obj);
          ensureLayerId(obj);
          initializeTextboxCurve(obj);
        });
        c.discardActiveObject();
        captureActiveSideState();
        updateCanvasEmptyHint();
        syncLayerList();
        syncTextControls();
        updateSideStatus();
        updatePrintSummary();
        updatePriceDisplay();
        if (typeof c.requestRenderAll === 'function') {
          c.requestRenderAll();
        }
        // Add small delay to ensure images from URLs have time to load
        setTimeout(() => {
          c.requestRenderAll();
          resolve();
        }, 100);
      }, (o, obj) => {
        applyObjectUiDefaults(obj);
      });
    });
  }

  function setActiveSide(key, options) {
    const target = key === 'back' ? 'back' : 'front';
    const opts = options || {};
    if (!doubleSidedEnabled && target === 'back') {
      return Promise.resolve();
    }
    if (sideLoading) {
      sideLoadSequence = sideLoadSequence.then(() => setActiveSide(target, opts));
      return sideLoadSequence;
    }
    if (target === activeSideKey && !opts.force) {
      updateSideUiState();
      updateCanvasEmptyHint();
      updateSideStatus();
      return Promise.resolve();
    }
    captureActiveSideState();
    activeSideKey = target;
    updateSideUiState();
    sideLoading = true;
    const loader = loadSideState(target).finally(() => {
      sideLoading = false;
      updateSideUiState();
    });
    sideLoadSequence = loader;
    return loader;
  }

  function ensureLayerId(obj) {
    if (!obj) return '';
    if (!obj.__nb_layer_id) {
      obj.__nb_layer_id = 'nb-layer-' + (layerIdSeq++);
    }
    return obj.__nb_layer_id;
  }

  function layerLabel(obj) {
    if (!obj) return '';
    if (obj.__nb_layer_name) {
      return obj.__nb_layer_name;
    }
    if (obj.type === 'textbox') {
      const raw = (obj.text || '').toString().replace(/\s+/g, ' ').trim();
      if (raw) {
        return raw.length > 28 ? raw.slice(0, 25) + '…' : raw;
      }
      return 'Szöveg';
    }
    if (obj.type === 'image') {
      return 'Kép';
    }
    return 'Elem';
  }

  function applyDesignOrder(order) {
    if (!Array.isArray(order) || !order.length) return;
    const objects = c.getObjects();
    let firstIndex = -1;
    for (let i = 0; i < objects.length; i++) {
      if (isDesignObject(objects[i])) {
        firstIndex = i;
        break;
      }
    }
    if (firstIndex === -1) return;
    order.forEach((obj, offset) => {
      if (isDesignObject(obj)) {
        c.moveTo(obj, firstIndex + offset);
      }
    });
    if (c.__nb_area_rect) {
      c.bringToFront(c.__nb_area_rect);
    }
  }

  function duplicateActiveObject() {
    const obj = activeDesignObject();
    if (!obj || typeof obj.clone !== 'function') return;
    obj.clone(clone => {
      if (!clone) return;
      applyObjectUiDefaults(clone);
      ensureLayerId(clone);
      clone.set({
        left: (obj.left || 0) + 20,
        top: (obj.top || 0) + 20
      });
      c.add(clone);
      c.setActiveObject(clone);
      c.requestRenderAll();
      markDesignDirty();
      syncLayerList();
      syncMobileSelectionUi();
    });
  }

  function removeActiveObject(target) {
    const obj = target && isDesignObject(target) ? target : activeDesignObject();
    if (!obj) return;
    const wasActive = c.getActiveObject() === obj;
    c.remove(obj);
    if (wasActive) {
      c.discardActiveObject();
    }
    c.requestRenderAll();
    markDesignDirty();
    syncLayerList();
    syncMobileSelectionUi();
  }

  function toggleActiveVisibility() {
    const obj = activeDesignObject();
    if (!obj) return;
    const next = obj.visible === false ? true : false;
    obj.visible = next;
    if (!next) {
      c.discardActiveObject();
    }
    c.requestRenderAll();
    markDesignDirty();
    syncLayerList();
    syncMobileSelectionUi();
  }

  function moveLayer(obj, delta) {
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
    syncMobileSelectionUi();
  }

  function syncLayerList() {
    if (!layerListEl) return;
    const objects = designObjects();
    layerListEl.innerHTML = '';
    if (!objects.length) {
      const empty = document.createElement('div');
      empty.className = 'nb-layer-empty';
      empty.textContent = 'Nincs feltöltött elem';
      layerListEl.appendChild(empty);
      syncMobileSelectionUi();
      return;
    }
    const active = c.getActiveObject();
    const topFirst = objects.slice().reverse();
    topFirst.forEach((obj, idx) => {
      ensureLayerId(obj);
      const item = document.createElement('div');
      item.className = 'nb-layer-item';
      if (active === obj) {
        item.classList.add('is-active');
      }
      item.dataset.layerId = obj.__nb_layer_id;

      const info = document.createElement('div');
      info.className = 'nb-layer-info';
      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.textContent = layerLabel(obj);
      selectBtn.addEventListener('click', () => {
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
      if (idx === 0) {
        upBtn.disabled = true;
      }
      upBtn.addEventListener('click', () => {
        moveLayer(obj, 1);
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.setAttribute('aria-label', 'Lejjebb');
      downBtn.innerHTML = '▼';
      if (idx === topFirst.length - 1) {
        downBtn.disabled = true;
      }
      downBtn.addEventListener('click', () => {
        moveLayer(obj, -1);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'nb-layer-delete';
      deleteBtn.setAttribute('aria-label', 'Törlés');
      deleteBtn.innerHTML = '✕';
      deleteBtn.addEventListener('click', () => {
        removeActiveObject(obj);
      });

      controls.appendChild(upBtn);
      controls.appendChild(downBtn);
      controls.appendChild(deleteBtn);
      item.appendChild(controls);

      layerListEl.appendChild(item);
    });
    syncMobileSelectionUi();
  }

  function fitWithinArea(obj) {
    const area = c.__nb_area || fallbackArea;
    if (!area) return;
    obj.setCoords();
    let rect = obj.getBoundingRect(true, true);
    if (!rect.width || !rect.height) return;
    let scaled = false;
    if (rect.width > area.w) {
      const scale = area.w / rect.width;
      obj.scaleX *= scale;
      obj.scaleY *= scale;
      scaled = true;
    }
    if (scaled) {
      obj.setCoords();
      rect = obj.getBoundingRect(true, true);
    }
    if (rect.height > area.h) {
      const scale = area.h / rect.height;
      obj.scaleX *= scale;
      obj.scaleY *= scale;
      obj.setCoords();
    }
  }

  function constrainToArea(obj) {
    const area = c.__nb_area || fallbackArea;
    if (!area) return;
    obj.setCoords();
    let rect = obj.getBoundingRect(true, true);
    if (rect.left < area.x) {
      obj.left += area.x - rect.left;
    }
    if (rect.top < area.y) {
      obj.top += area.y - rect.top;
    }
    obj.setCoords();
    rect = obj.getBoundingRect(true, true);
    const areaRight = area.x + area.w;
    const areaBottom = area.y + area.h;
    const rectRight = rect.left + rect.width;
    const rectBottom = rect.top + rect.height;
    if (rectRight > areaRight) {
      obj.left -= rectRight - areaRight;
    }
    if (rectBottom > areaBottom) {
      obj.top -= rectBottom - areaBottom;
    }
    obj.setCoords();
  }

  function keepObjectInside(obj, options) {
    if (!isDesignObject(obj)) return;
    const opts = Object.assign({ fit: true }, options || {});
    if (opts.fit) {
      fitWithinArea(obj);
    }
    constrainToArea(obj);
    c.requestRenderAll();
  }

  function enforceAllObjectsInside() {
    designObjects().forEach(obj => keepObjectInside(obj));
  }

  function markDesignDirty() {
    if (sideLoading) return;
    designState.savedDesignId = null;
    designState.dirty = true;
    captureActiveSideState();
    updateCanvasEmptyHint();
    updateSideStatus();
    updatePrintSummary();
    updatePriceDisplay();
    updateActionStates();
    syncMobileSelectionUi();
  }

  function setMockupBgAndArea() {
    const sel = currentSelection();
    const mockupsBySide = sel.mockups || { front: null, back: null };
    const mk = activeSideKey === 'back'
      ? (mockupsBySide.back || mockupsBySide.front || sel.mockup)
      : (mockupsBySide.front || mockupsBySide.back || sel.mockup);

    c.getObjects().slice().forEach(obj => { if (obj.__nb_bg) c.remove(obj); });
    c.getObjects().slice().forEach(obj => { if (obj.__nb_area) c.remove(obj); });

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
      fill: PRINT_AREA_FILL,
      stroke: PRINT_AREA_STROKE,
      strokeWidth: 2,
      strokeDashArray: [10, 6],
      selectable: false,
      evented: false,
      excludeFromExport: true
    });
    printArea.__nb_area = true;
    c.add(printArea);
    c.__nb_area = area;
    c.__nb_area_rect = printArea;

    const loadToken = Symbol('mockup');
    c.__nb_bg_token = loadToken;
    c.setBackgroundImage(null, c.renderAll.bind(c));
    const mockupUrl = mockupImageUrl(mk);
    if (mockupUrl) {
      loadMockupImage(mockupUrl).then(img => {
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
      }).catch(() => {
        if (c.__nb_bg_token !== loadToken) return;
        c.requestRenderAll();
      });
    }

    enforceAllObjectsInside();
    updateCanvasEmptyHint();
  }

  function applyToActiveText(cb) {
    const obj = c.getActiveObject();
    if (!obj || obj.type !== 'textbox') return;
    cb(obj);
    if (typeof obj.initDimensions === 'function') obj.initDimensions();
    obj.dirty = true;
    obj.setCoords();
    c.requestRenderAll();
    markDesignDirty();
  }

  function activeTextbox() {
    const obj = c.getActiveObject();
    return (obj && obj.type === 'textbox') ? obj : null;
  }

  function toHexColor(color) {
    if (!color) return '#ff0000';
    if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
    const tester = document.createElement('canvas');
    tester.width = tester.height = 1;
    const ctx = tester.getContext && tester.getContext('2d');
    if (!ctx) return '#ff0000';
    try {
      ctx.fillStyle = color;
      return ctx.fillStyle || '#ff0000';
    } catch (e) {
      return '#ff0000';
    }
  }

  function formatStrokeWidth(value) {
    const num = Number.isFinite(value) ? value : 0;
    const rounded = Math.round(num * 10) / 10;
    return `${rounded} px`;
  }

  function setPressed(btn, state) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', state ? 'true' : 'false');
    if (state) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  const TEXT_CURVE_MIN = -100;
  const TEXT_CURVE_MAX = 100;

  function clampCurveAmount(value) {
    if (!Number.isFinite(value)) return 0;
    const rounded = Math.round(value);
    if (rounded > TEXT_CURVE_MAX) return TEXT_CURVE_MAX;
    if (rounded < TEXT_CURVE_MIN) return TEXT_CURVE_MIN;
    return rounded;
  }

  function defaultCurveState() {
    return { enabled: false, amount: 0 };
  }

  function ensureTextboxCurveState(textbox) {
    if (!textbox || textbox.type !== 'textbox') return defaultCurveState();
    const raw = textbox.__nb_curve;
    const normalized = {
      enabled: !!(raw && typeof raw === 'object' && raw.enabled),
      amount: clampCurveAmount(raw && typeof raw === 'object' ? raw.amount : 0)
    };
    textbox.__nb_curve = normalized;
    if (typeof textbox.set === 'function') {
      textbox.set('__nb_curve', normalized);
    }
    return normalized;
  }

  function formatCurveLabel(amount, enabled) {
    if (!enabled || Math.abs(amount) < 1) {
      return 'Egyenes';
    }
    const direction = amount > 0 ? 'Felfelé ív' : 'Lefelé ív';
    return `${direction} (${Math.abs(amount)})`;
  }

  function ensureTextboxCurveBinding(textbox) {
    if (!textbox || textbox.type !== 'textbox') return;
    if (textbox.__nb_curve_bound) return;
    textbox.__nb_curve_bound = true;
    textbox.on('changed', () => applyTextboxCurve(textbox));
    textbox.on('modified', () => applyTextboxCurve(textbox));
  }

  function curveDefaultAmount(textbox) {
    if (!textbox || textbox.type !== 'textbox') return 35;
    const width = Math.max(80, textbox.width || 0);
    if (width >= 260) return 30;
    if (width >= 200) return 35;
    return 40;
  }

  function cloneTextboxStyles(styles) {
    const clone = {};
    if (!styles || typeof styles !== 'object') return clone;
    Object.keys(styles).forEach(lineKey => {
      const srcLine = styles[lineKey];
      if (!srcLine || typeof srcLine !== 'object') return;
      const destLine = {};
      Object.keys(srcLine).forEach(charKey => {
        const entry = srcLine[charKey];
        destLine[charKey] = entry && typeof entry === 'object' ? Object.assign({}, entry) : {};
      });
      clone[lineKey] = destLine;
    });
    return clone;
  }

  function stripCurveDelta(styles) {
    if (!styles || typeof styles !== 'object') return {};
    const cleaned = cloneTextboxStyles(styles);
    Object.keys(cleaned).forEach(lineKey => {
      const line = cleaned[lineKey];
      if (!line || typeof line !== 'object') {
        delete cleaned[lineKey];
        return;
      }
      Object.keys(line).forEach(charKey => {
        const entry = line[charKey];
        if (!entry || typeof entry !== 'object') {
          delete line[charKey];
          return;
        }
        if (Object.prototype.hasOwnProperty.call(entry, 'deltaY')) {
          const next = Object.assign({}, entry);
          delete next.deltaY;
          if (Object.keys(next).length) {
            line[charKey] = next;
          } else {
            delete line[charKey];
          }
        }
      });
      if (!Object.keys(line).length) {
        delete cleaned[lineKey];
      }
    });
    return cleaned;
  }

  function baseTextboxStyles(textbox) {
    if (!textbox || textbox.type !== 'textbox') return {};
    const cleaned = stripCurveDelta(textbox.styles || {});
    textbox.__nb_curve_baseStyles = cloneTextboxStyles(cleaned);
    return cleaned;
  }

  const TEXT_CURVE_MIN_FONT_SIZE = 12;

  function measureTextboxWidth(textbox) {
    if (!textbox || textbox.type !== 'textbox') return 0;
    const widths = [];
    const rawWidth = Number.isFinite(textbox.width) ? textbox.width : null;
    if (Number.isFinite(rawWidth)) widths.push(rawWidth);
    if (typeof textbox.getScaledWidth === 'function') {
      const scaled = textbox.getScaledWidth();
      if (Number.isFinite(scaled)) widths.push(scaled);
    }
    if (typeof textbox.calcTextWidth === 'function') {
      const calc = textbox.calcTextWidth();
      if (Number.isFinite(calc)) widths.push(calc);
    }
    if (!widths.length) {
      return 0;
    }
    return Math.max.apply(null, widths);
  }

  function shrinkTextboxFontToFit(textbox, maxWidth) {
    if (!textbox || textbox.type !== 'textbox') return null;
    if (!Number.isFinite(maxWidth) || maxWidth <= 0) return null;
    let fontSize = Number.isFinite(textbox.fontSize) ? Math.round(textbox.fontSize) : null;
    if (!Number.isFinite(fontSize)) return null;
    if (typeof textbox.initDimensions === 'function') textbox.initDimensions();
    let currentWidth = measureTextboxWidth(textbox);
    if (!Number.isFinite(currentWidth) || currentWidth <= maxWidth) return fontSize;
    const minSize = TEXT_CURVE_MIN_FONT_SIZE;
    let iterations = 0;
    while (currentWidth > maxWidth && fontSize > minSize && iterations < 25) {
      fontSize = Math.max(minSize, Math.round(fontSize * 0.9));
      if (typeof textbox.set === 'function') {
        textbox.set('fontSize', fontSize);
      } else {
        textbox.fontSize = fontSize;
      }
      if (typeof textbox.initDimensions === 'function') textbox.initDimensions();
      currentWidth = measureTextboxWidth(textbox);
      iterations++;
    }
    if (typeof textbox.setCoords === 'function') textbox.setCoords();
    textbox.dirty = true;
    if (fontSizeInput) {
      fontSizeInput.value = fontSize;
      if (fontSizeValue) fontSizeValue.textContent = fontSize + ' px';
    }
    if (c && typeof c.requestRenderAll === 'function') c.requestRenderAll();
    return fontSize;
  }

  function clampTextboxToArea(textbox) {
    if (!textbox || textbox.type !== 'textbox') return;
    if (!c || !c.width) return;
    const area = c.__nb_area || fallbackArea;
    const maxWidth = area ? area.w * 0.9 : c.width * 0.85;
    if (!Number.isFinite(maxWidth) || maxWidth <= 0) return;

    if (typeof textbox.initDimensions === 'function') textbox.initDimensions();

    shrinkTextboxFontToFit(textbox, maxWidth);

    let currentWidth = measureTextboxWidth(textbox);
    if (currentWidth > maxWidth) {
      const wrapped = wrapTextboxTextToWidth(textbox, maxWidth);
      if (wrapped && typeof textbox.initDimensions === 'function') {
        textbox.initDimensions();
        currentWidth = measureTextboxWidth(textbox);
      }
    }

    const unscaledMax = maxWidth / (textbox.scaleX || 1);
    if (Number.isFinite(unscaledMax) && Number.isFinite(textbox.width) && textbox.width > unscaledMax) {
      if (typeof textbox.set === 'function') {
        textbox.set('width', unscaledMax);
      } else {
        textbox.width = unscaledMax;
      }
    }

    textbox.dirty = true;
    if (typeof textbox.setCoords === 'function') textbox.setCoords();
  }

  function wrapTextboxTextToWidth(textbox, maxWidth) {
    if (!textbox || textbox.type !== 'textbox') return null;
    const textValue = typeof textbox.text === 'string' ? textbox.text : '';
    if (!textValue.length) return null;
    if (!Number.isFinite(maxWidth) || maxWidth <= 0) return null;
    if (typeof fabric === 'undefined' || !fabric.Text) return null;

    const availableWidth = maxWidth / (textbox.scaleX || 1);
    const measureProps = {
      fontSize: textbox.fontSize,
      fontFamily: textbox.fontFamily,
      fontWeight: textbox.fontWeight,
      fontStyle: textbox.fontStyle,
      charSpacing: textbox.charSpacing,
      splitByGrapheme: textbox.splitByGrapheme
    };

    const measure = str => {
      const temp = new fabric.Text(str || '', measureProps);
      return typeof temp.calcTextWidth === 'function' ? temp.calcTextWidth() : 0;
    };

    const lines = [];
    let current = '';
    const tokens = textValue.split(/(\s+)/);

    const pushCurrent = () => {
      if (current.length) {
        lines.push(current.replace(/\s+$/g, ''));
        current = '';
      }
    };

    tokens.forEach(token => {
      if (!token) return;
      const isWhitespace = !token.trim();
      if (isWhitespace) {
        current += token;
        return;
      }

      const tokenNormalized = current.length ? token : token.replace(/^\s+/g, '');
      if (!tokenNormalized.length) return;

      const tentative = current + tokenNormalized;
      if (!current.length || measure(tentative) <= availableWidth) {
        current = tentative;
        return;
      }

      pushCurrent();

      if (measure(tokenNormalized) <= availableWidth) {
        current = tokenNormalized;
        return;
      }

      // Token alone is too long: hard-wrap it by characters
      let chunk = '';
      tokenNormalized.split('').forEach(ch => {
        const candidate = chunk + ch;
        if (!chunk.length || measure(candidate) <= availableWidth) {
          chunk = candidate;
        } else {
          if (chunk.length) lines.push(chunk);
          chunk = ch;
        }
      });
      current = chunk;
    });

    pushCurrent();

    const wrapped = lines.join('\n');
    if (wrapped && wrapped !== textValue) {
      if (typeof textbox.set === 'function') {
        textbox.set('text', wrapped);
      } else {
        textbox.text = wrapped;
      }
      if (typeof textbox.initDimensions === 'function') textbox.initDimensions();
      textbox.dirty = true;
      if (typeof textbox.setCoords === 'function') textbox.setCoords();
      return wrapped;
    }

    return null;
  }

  function collapseTextboxMultilineForCurve(textbox) {
    if (!textbox || textbox.type !== 'textbox') return;
    const textValue = typeof textbox.text === 'string' ? textbox.text : '';
    if (!textValue.length || textValue.indexOf('\n') === -1) return;
    const originalFontSize = Number.isFinite(textbox.fontSize) ? textbox.fontSize : DEFAULT_FONT_SIZE;
    const originalWidth = measureTextboxWidth(textbox);
    const rawLines = textValue.split('\n');
    const condensed = rawLines.map(line => line.trim()).filter(line => line.length);
    const joined = (condensed.length ? condensed : rawLines).join(' ');
    const normalizedText = joined.replace(/\s{2,}/g, ' ').trim();
    if (!normalizedText.length) return;
    const lineCount = Math.max(1, condensed.length || rawLines.length);
    let targetSize = Math.max(TEXT_CURVE_MIN_FONT_SIZE, Math.round(originalFontSize / lineCount));
    textbox.__nb_curve_multilineBackup = {
      text: textValue,
      fontSize: originalFontSize,
      flattened: normalizedText,
      flattenedSize: targetSize,
      originalWidth: Number.isFinite(originalWidth) ? originalWidth : null
    };
    const updates = {};
    if (textbox.text !== normalizedText) {
      updates.text = normalizedText;
    }
    if (!Number.isFinite(textbox.fontSize) || Math.round(textbox.fontSize) !== targetSize) {
      updates.fontSize = targetSize;
    }
    if (!Object.keys(updates).length) return;
    if (typeof textbox.set === 'function') {
      textbox.set(updates);
    } else {
      if (Object.prototype.hasOwnProperty.call(updates, 'text')) textbox.text = updates.text;
      if (Object.prototype.hasOwnProperty.call(updates, 'fontSize')) textbox.fontSize = updates.fontSize;
    }
    if (typeof textbox.initDimensions === 'function') {
      textbox.initDimensions();
    }
    if (Number.isFinite(originalWidth)) {
      const adjustedSize = shrinkTextboxFontToFit(textbox, originalWidth);
      if (Number.isFinite(adjustedSize)) {
        targetSize = adjustedSize;
      }
    }
    textbox.dirty = true;
    if (typeof textbox.setCoords === 'function') textbox.setCoords();
    if (fontSizeInput) {
      const nextSize = Math.round(textbox.fontSize || targetSize);
      fontSizeInput.value = nextSize;
      if (fontSizeValue) fontSizeValue.textContent = nextSize + ' px';
    }
    if (c && typeof c.requestRenderAll === 'function') c.requestRenderAll();
    const backup = textbox.__nb_curve_multilineBackup;
    if (backup && typeof backup === 'object') {
      backup.flattenedSize = Math.round(targetSize);
    }
  }

  function restoreTextboxMultilineFromCurve(textbox) {
    if (!textbox || textbox.type !== 'textbox') return;
    const backup = textbox.__nb_curve_multilineBackup;
    if (!backup || typeof backup !== 'object') return;
    const updates = {};
    const currentText = typeof textbox.text === 'string' ? textbox.text : '';
    const matchesFlattened = typeof backup.flattened === 'string' && currentText === backup.flattened;
    if (matchesFlattened && typeof backup.text === 'string') {
      updates.text = backup.text;
    }
    if (matchesFlattened && Number.isFinite(backup.fontSize)) {
      const currentSize = Number.isFinite(textbox.fontSize) ? Math.round(textbox.fontSize) : null;
      const flattenedSize = Number.isFinite(backup.flattenedSize) ? Math.round(backup.flattenedSize) : null;
      if (currentSize === flattenedSize || currentSize === null) {
        updates.fontSize = backup.fontSize;
      }
    }
    if (!Object.keys(updates).length) {
      delete textbox.__nb_curve_multilineBackup;
      return;
    }
    if (typeof textbox.set === 'function') {
      textbox.set(updates);
    } else {
      if (Object.prototype.hasOwnProperty.call(updates, 'text') && typeof updates.text === 'string') textbox.text = updates.text;
      if (Object.prototype.hasOwnProperty.call(updates, 'fontSize') && Number.isFinite(updates.fontSize)) textbox.fontSize = updates.fontSize;
    }
    if (typeof textbox.initDimensions === 'function') {
      textbox.initDimensions();
    }
    textbox.dirty = true;
    if (typeof textbox.setCoords === 'function') textbox.setCoords();
    if (fontSizeInput) {
      const nextSize = Math.round(textbox.fontSize || updates.fontSize || backup.fontSize || DEFAULT_FONT_SIZE);
      fontSizeInput.value = nextSize;
      if (fontSizeValue) fontSizeValue.textContent = nextSize + ' px';
    }
    if (c && typeof c.requestRenderAll === 'function') c.requestRenderAll();
    delete textbox.__nb_curve_multilineBackup;
  }

  function applyTextboxCurve(textbox, state) {
    if (!textbox || textbox.type !== 'textbox') return;
    const cfg = state ? { enabled: !!state.enabled, amount: clampCurveAmount(state.amount) } : ensureTextboxCurveState(textbox);
    let textValue = typeof textbox.text === 'string' ? textbox.text : '';
    const hasText = !!(textValue && textValue.length);
    const curveActive = cfg.enabled && Math.abs(cfg.amount) >= 1 && hasText;
    // Remove collapse/restore logic to support true multi-line curved text
    // if (curveActive) {
    //   collapseTextboxMultilineForCurve(textbox);
    //   textValue = typeof textbox.text === 'string' ? textbox.text : '';
    // } else {
    //   restoreTextboxMultilineFromCurve(textbox);
    //   textValue = typeof textbox.text === 'string' ? textbox.text : '';
    // }

    const baseStyles = baseTextboxStyles(textbox);
    const assignStyles = styles => {
      textbox.styles = styles;
      if (typeof textbox.set === 'function') {
        textbox.set('styles', textbox.styles);
      }
    };
    const assignPathProps = (path, side) => {
      const props = {
        path: path || null,
        pathStartOffset: 0,
        pathAlign: 'center',
        pathSide: side || 'left'
      };
      if (typeof textbox.set === 'function') {
        textbox.set(props);
      } else {
        textbox.path = props.path;
        textbox.pathStartOffset = props.pathStartOffset;
        textbox.pathAlign = props.pathAlign;
        textbox.pathSide = props.pathSide;
      }
      if (props.path) {
        if (typeof fabric.util === 'object' && typeof fabric.util.getPathSegmentsInfo === 'function') {
          textbox.pathInfo = props.path.segmentsInfo || fabric.util.getPathSegmentsInfo(props.path.path);
        }
      } else if (Object.prototype.hasOwnProperty.call(textbox, 'pathInfo')) {
        textbox.pathInfo = null;
      }
      textbox.dirty = true;
      if (typeof textbox.setCoords === 'function') textbox.setCoords();
    };
    if (!curveActive || !textbox.text || !textbox.text.length) {
      clampTextboxToArea(textbox);
      assignStyles(baseStyles);
      assignPathProps(null, 'left');
      if (typeof textbox.set === 'function') {
        textbox.set('textBaseline', 'alphabetic');
      } else {
        textbox.textBaseline = 'alphabetic';
      }
      delete textbox.__nb_curve_baseStyles;
      return;
    }
    if (typeof textbox.initDimensions === 'function') textbox.initDimensions();
    let width = measureTextboxWidth(textbox);
    if (!Number.isFinite(width) || width <= 0) {
      width = Math.max(20, textbox.width || 0);
    }
    width = Math.max(20, width);

    // Fix for overlapping text: Ensure path width is at least the full text width (unwrapped)
    if (typeof fabric !== 'undefined' && fabric.Text) {
      const tempText = new fabric.Text(textValue, {
        fontSize: textbox.fontSize,
        fontFamily: textbox.fontFamily,
        fontWeight: textbox.fontWeight,
        fontStyle: textbox.fontStyle,
        charSpacing: textbox.charSpacing
      });
      let textWidth = tempText.calcTextWidth();
      const scaleX = textbox.scaleX || 1;

      // Auto-scale font size if text is too wide for the canvas
      const area = c && (c.__nb_area || fallbackArea) ? (c.__nb_area || fallbackArea) : null;
      let maxWidth = null;
      if (c && c.width) {
        maxWidth = (area ? area.w * 0.9 : c.width * 0.85); // Prefer print area width when available
        let currentFontSize = textbox.fontSize;
        const minFontSize = 10;

        while ((textWidth * scaleX) > maxWidth && currentFontSize > minFontSize) {
          currentFontSize -= 1;
          tempText.set('fontSize', currentFontSize);
          textWidth = tempText.calcTextWidth();
        }

        if (currentFontSize < textbox.fontSize) {
          if (typeof textbox.set === 'function') {
            textbox.set('fontSize', currentFontSize);
          } else {
            textbox.fontSize = currentFontSize;
          }
          // Update UI input if exists
          if (typeof fontSizeInput !== 'undefined' && fontSizeInput) {
            fontSizeInput.value = currentFontSize;
          }
          if (typeof fontSizeValue !== 'undefined' && fontSizeValue) {
            fontSizeValue.textContent = currentFontSize + ' px';
          }
        }

        if ((textWidth * scaleX) > maxWidth && currentFontSize <= minFontSize) {
          const wrapped = wrapTextboxTextToWidth(textbox, maxWidth);
          if (wrapped) {
            textValue = wrapped;
            tempText.set('text', wrapped);
            textWidth = tempText.calcTextWidth();
          }
        }
      }

      if (textWidth > width) {
        width = textWidth + 50; // Add buffer
        // IMPORTANT: Update the actual textbox width to prevent soft-wrapping!
        // Soft-wrapping causes lines to render on top of each other because we only calculate offsets for hard newlines.
        if (typeof textbox.set === 'function') {
          textbox.set('width', width);
        } else {
          textbox.width = width;
        }
      }

      if (c && c.width && maxWidth) {
        const maxUnscaled = maxWidth / scaleX;
        const minNeeded = Math.max(textWidth + 20, 20);
        const desiredWidth = Math.min(maxUnscaled, minNeeded);
        const clampedWidth = Math.min(width, desiredWidth);
        if (clampedWidth !== width) {
          width = clampedWidth;
          if (typeof textbox.set === 'function') {
            textbox.set('width', width);
          } else {
            textbox.width = width;
          }
        }
      }
    }

    const amplitude = (cfg.amount / 100) * width * 0.8;
    const curvePath = new fabric.Path(`M ${-width / 2} 0 Q 0 ${-amplitude} ${width / 2} 0`, {
      visible: false,
      evented: false
    });
    curvePath.pathOffset = new fabric.Point(0, 0);
    if (!curvePath.segmentsInfo && fabric.util && typeof fabric.util.getPathSegmentsInfo === 'function') {
      curvePath.segmentsInfo = fabric.util.getPathSegmentsInfo(curvePath.path);
    }
    assignPathProps(curvePath, cfg.amount >= 0 ? 'left' : 'right');
    const nextStyles = cloneTextboxStyles(baseStyles);
    const lines = textValue.split('\n');
    if (lines.length > 1) {
      const fontSize = Number.isFinite(textbox.fontSize) ? textbox.fontSize : DEFAULT_FONT_SIZE;
      const lineHeight = Number.isFinite(textbox.lineHeight) ? textbox.lineHeight : 1.16;
      const step = Math.max(1, fontSize * lineHeight);
      // Always shift down for subsequent lines to prevent overlap/inversion
      const direction = 1;
      lines.forEach((lineText, lineIndex) => {
        const offset = lineIndex * step * direction;
        const key = lineIndex.toString();
        const lineStyles = nextStyles[key] || {};
        for (let i = 0; i < lineText.length; i++) {
          const entry = lineStyles.hasOwnProperty(i) ? Object.assign({}, lineStyles[i]) : {};
          entry.deltaY = offset;
          lineStyles[i] = entry;
        }
        Object.keys(lineStyles).forEach(charKey => {
          const entry = lineStyles[charKey];
          if (!entry || typeof entry !== 'object') {
            delete lineStyles[charKey];
            return;
          }
          entry.deltaY = offset;
        });
        nextStyles[key] = lineStyles;
      });
    }
    assignStyles(nextStyles);
    if (typeof textbox.set === 'function') {
      textbox.set('textBaseline', 'alphabetic');
    } else {
      textbox.textBaseline = 'alphabetic';
    }
  }

  function storeTextboxCurveState(textbox, state) {
    if (!textbox || textbox.type !== 'textbox') return;
    const cfg = state ? { enabled: !!state.enabled, amount: clampCurveAmount(state.amount) } : defaultCurveState();
    textbox.__nb_curve = cfg;
    if (typeof textbox.set === 'function') {
      textbox.set('__nb_curve', cfg);
    }
    ensureTextboxCurveBinding(textbox);
    applyTextboxCurve(textbox, cfg);
  }

  function initializeTextboxCurve(textbox) {
    if (!textbox || textbox.type !== 'textbox') return;
    const cfg = ensureTextboxCurveState(textbox);
    ensureTextboxCurveBinding(textbox);
    applyTextboxCurve(textbox, cfg);
  }

  function syncTextControls() {
    const textbox = activeTextbox();
    const hasTextbox = !!textbox;
    if (textbox) initializeTextboxCurve(textbox);
    const controls = [
      fontFamilySel,
      fontSizeInput,
      fontColorInput,
      fontStrokeColorInput,
      fontStrokeWidthInput,
      fontBoldToggle,
      fontItalicToggle,
      textCurveToggle,
      textCurveInput
    ].concat(alignButtons);
    controls.forEach(ctrl => { if (ctrl) ctrl.disabled = !hasTextbox; });
    if (!hasTextbox) {
      setPressed(fontBoldToggle, false);
      setPressed(fontItalicToggle, false);
      alignButtons.forEach(btn => setPressed(btn, false));
      if (fontSizeValue) fontSizeValue.textContent = (fontSizeInput ? fontSizeInput.value : '0') + ' px';
      if (fontStrokeWidthInput) fontStrokeWidthInput.value = DEFAULT_STROKE_WIDTH;
      if (fontStrokeWidthValue) fontStrokeWidthValue.textContent = formatStrokeWidth(DEFAULT_STROKE_WIDTH);
      if (fontStrokeColorInput) fontStrokeColorInput.value = DEFAULT_STROKE_COLOR;
      if (textCurveToggle) setPressed(textCurveToggle, false);
      if (textCurveInput) {
        textCurveInput.value = '0';
        textCurveInput.disabled = true;
      }
      if (textCurveValue) textCurveValue.textContent = 'Egyenes';
      return;
    }
    if (fontFamilySel) {
      const exists = Array.from(fontFamilySel.options).some(opt => opt.value === textbox.fontFamily);
      if (!exists && textbox.fontFamily) {
        const opt = document.createElement('option');
        opt.value = textbox.fontFamily;
        opt.textContent = textbox.fontFamily;
        fontFamilySel.appendChild(opt);
      }
      if (textbox.fontFamily) {
        fontFamilySel.value = textbox.fontFamily;
      }
    }
    if (fontSizeInput) {
      const size = Math.round(textbox.fontSize || parseInt(fontSizeInput.value, 10) || DEFAULT_FONT_SIZE);
      fontSizeInput.value = size;
      if (fontSizeValue) fontSizeValue.textContent = size + ' px';
    }
    if (fontColorInput) {
      fontColorInput.value = toHexColor(textbox.fill || '#ff0000');
    }
    if (fontStrokeColorInput) {
      fontStrokeColorInput.value = toHexColor(textbox.stroke || DEFAULT_STROKE_COLOR);
    }
    if (fontStrokeWidthInput) {
      const width = Number.isFinite(textbox.strokeWidth) ? textbox.strokeWidth : DEFAULT_STROKE_WIDTH;
      fontStrokeWidthInput.value = width;
      if (fontStrokeWidthValue) fontStrokeWidthValue.textContent = formatStrokeWidth(width);
    }
    setPressed(fontBoldToggle, (textbox.fontWeight || '').toString().toLowerCase() === 'bold' || parseInt(textbox.fontWeight, 10) >= 600);
    setPressed(fontItalicToggle, (textbox.fontStyle || '').toString().toLowerCase() === 'italic');
    alignButtons.forEach(btn => {
      setPressed(btn, textbox.textAlign === btn.dataset.nbAlign);
    });
    const curveState = ensureTextboxCurveState(textbox);
    if (textCurveToggle) {
      textCurveToggle.disabled = false;
      setPressed(textCurveToggle, !!curveState.enabled);
    }
    if (textCurveInput) {
      textCurveInput.disabled = !(curveState.enabled && hasTextbox);
      textCurveInput.value = clampCurveAmount(curveState.amount).toString();
    }
    if (textCurveValue) {
      textCurveValue.textContent = formatCurveLabel(curveState.amount, curveState.enabled && hasTextbox);
    }
  }

  function currentFontFamily() {
    return fontFamilySel && fontFamilySel.value ? fontFamilySel.value : 'Arial';
  }

  function currentFontSize() {
    return fontSizeInput ? parseInt(fontSizeInput.value, 10) || DEFAULT_FONT_SIZE : DEFAULT_FONT_SIZE;
  }

  function currentFontColor() {
    return fontColorInput && fontColorInput.value ? fontColorInput.value : '#ff0000';
  }

  function currentFontStrokeColor() {
    return fontStrokeColorInput && fontStrokeColorInput.value ? fontStrokeColorInput.value : DEFAULT_STROKE_COLOR;
  }

  function currentFontStrokeWidth() {
    return fontStrokeWidthInput ? parseFloat(fontStrokeWidthInput.value) || DEFAULT_STROKE_WIDTH : DEFAULT_STROKE_WIDTH;
  }

  function currentFontWeight() {
    return fontBoldToggle && fontBoldToggle.getAttribute('aria-pressed') === 'true' ? '700' : '400';
  }

  function currentFontStyle() {
    return fontItalicToggle && fontItalicToggle.getAttribute('aria-pressed') === 'true' ? 'italic' : 'normal';
  }

  function currentTextAlign() {
    const btn = alignButtons.find(b => b.getAttribute('aria-pressed') === 'true');
    return btn ? btn.dataset.nbAlign : 'center';
  }

  function initAlignDefault() {
    if (!alignButtons.length) return;
    let found = alignButtons.some(btn => btn.getAttribute('aria-pressed') === 'true');
    if (!found) {
      const centerBtn = alignButtons.find(btn => btn.dataset.nbAlign === 'center');
      if (centerBtn) {
        setPressed(centerBtn, true);
      }
    }
  }

  function populateTypes() {
    typeSel.innerHTML = '';
    types().forEach(t => {
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

  function populateProducts() {
    const cat = getCatalog();
    productSel.innerHTML = '';
    productList().forEach(pid => {
      const cfg = cat[pid] || {};
      const opt = document.createElement('option');
      opt.value = pid;
      opt.textContent = cfg.title || ('Termék #' + pid);
      productSel.appendChild(opt);
    });
    ensureSelectValue(productSel);
    ensureProductMatchesType();
  }

  function populateColorsSizes() {
    const pid = parseInt(productSel.value || 0, 10);
    const cfg = getCatalog()[pid] || {};
    const { entries: filteredColors, restricted, typeConfigured } = availableColorsForType(cfg, typeSel ? typeSel.value : '');
    const fallbackColors = typeConfigured ? [] : colorStringsForType(cfg, '').map(colorEntryFromString).filter(Boolean);
    const colorsToRender = filteredColors.length ? filteredColors : fallbackColors;
    colorSel.innerHTML = '';
    colorsToRender.forEach(entry => {
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
    if (bulkModal && !bulkModal.hidden) {
      closeBulkModal();
    }
    sizeSel.innerHTML = '';
    (cfg.sizes || []).forEach(size => {
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
  requestAnimationFrame(() => { setMockupBgAndArea(); });
  updateSelectionSummary();
  syncTextControls();
  captureActiveSideState();
  updateCanvasEmptyHint();
  updateSideUiState();
  updateSideStatus();
  updatePrintSummary();
  refreshMobileUi();

  sideButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.nbSide === 'back' ? 'back' : 'front';
      setActiveSide(target);
    });
  });

  if (sideFabButton) {
    sideFabButton.addEventListener('click', () => {
      if (!doubleSidedEnabled) return;
      const next = activeSideKey === 'front' ? 'back' : 'front';
      setActiveSide(next);
    });
  }

  if (mobileMedia) {
    const mobileListener = () => { refreshMobileUi(); };
    if (typeof mobileMedia.addEventListener === 'function') {
      mobileMedia.addEventListener('change', mobileListener);
    } else if (typeof mobileMedia.addListener === 'function') {
      mobileMedia.addListener(mobileListener);
    }
  }

  if (mobileToolbarButtons.size) {
    mobileToolbarButtons.forEach((btn, key) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (!mobileUiEnabled()) return;
        openMobileSheet(key);
      });
    });
  }

  if (mobileSheetClose) {
    mobileSheetClose.addEventListener('click', () => {
      closeMobileSheet();
    });
  }

  if (mobileSheetHandle) {
    mobileSheetHandle.addEventListener('pointerdown', beginSheetDrag);
  }

  Object.keys(mobileQuickButtons).forEach(key => {
    const btn = mobileQuickButtons[key];
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      switch (key) {
        case 'duplicate':
          duplicateActiveObject();
          break;
        case 'delete':
          removeActiveObject();
          break;
        case 'visibility':
          toggleActiveVisibility();
          break;
        case 'forward': {
          const obj = activeDesignObject();
          if (obj) moveLayer(obj, 1);
          break;
        }
        case 'backward': {
          const obj = activeDesignObject();
          if (obj) moveLayer(obj, -1);
          break;
        }
      }
    });
  });

  if (mobileCompleteBtn) {
    mobileCompleteBtn.addEventListener('click', () => {
      if (!mobileUiEnabled()) return;
      if (addToCartBtn && !addToCartBtn.disabled) {
        addToCartBtn.click();
      }
    });
  }

  if (mobileBulkBtn) {
    mobileBulkBtn.addEventListener('click', () => {
      if (!mobileUiEnabled()) return;
      if (mobileBulkBtn.disabled) return;
      openBulkModal();
    });
  }

  if (doubleSidedToggle) {
    doubleSidedToggle.onchange = () => {
      doubleSidedEnabled = !!doubleSidedToggle.checked;
      updateSideUiState();
      updateSideStatus();
      updatePrintSummary();
      updatePriceDisplay();
      const afterSwitch = () => {
        markDesignDirty();
      };
      if (!doubleSidedEnabled && activeSideKey === 'back') {
        setActiveSide('front').then(afterSwitch);
      } else {
        afterSwitch();
      }
    };
  }

  if (typeSel) typeSel.onchange = () => {
    const previousProduct = productSel ? productSel.value : '';
    ensureProductMatchesType();
    if (!productSel || productSel.value === previousProduct) {
      populateColorsSizes();
    }
    renderModalTypes();
    setMockupBgAndArea();
    updateSelectionSummary();
    markDesignDirty();
  };
  if (productSel) productSel.onchange = () => {
    populateColorsSizes();
    setMockupBgAndArea();
    updateSelectionSummary();
    markDesignDirty();
  };
  if (colorSel) colorSel.onchange = () => { renderColorChoices(); setMockupBgAndArea(); updateSelectionSummary(); markDesignDirty(); };
  if (sizeSel) sizeSel.onchange = () => { renderSizeButtons(); updateSelectionSummary(); markDesignDirty(); };

  c.on('object:added', e => {
    if (isDesignObject(e.target)) {
      applyObjectUiDefaults(e.target);
      ensureLayerId(e.target);
      keepObjectInside(e.target);
      initializeTextboxCurve(e.target);
      markDesignDirty();
      syncLayerList();
    }
  });
  c.on('object:moving', e => { keepObjectInside(e.target, { fit: false }); });
  c.on('object:scaling', e => { keepObjectInside(e.target); markDesignDirty(); syncLayerList(); });
  c.on('object:rotating', e => { keepObjectInside(e.target); markDesignDirty(); syncLayerList(); });
  c.on('object:modified', e => { if (isDesignObject(e.target)) { markDesignDirty(); syncLayerList(); } });
  c.on('object:removed', e => { if (isDesignObject(e.target)) { markDesignDirty(); syncLayerList(); } });
  c.on('selection:created', () => { syncTextControls(); syncLayerList(); syncMobileSelectionUi(); });
  c.on('selection:updated', () => { syncTextControls(); syncLayerList(); syncMobileSelectionUi(); });
  c.on('selection:cleared', () => { syncTextControls(); syncLayerList(); syncMobileSelectionUi(); });
  c.on('text:changed', e => {
    if (!isDesignObject(e.target)) return;
    initializeTextboxCurve(e.target);
    applyTextboxCurve(e.target);
    markDesignDirty();
    if (typeof c.requestRenderAll === 'function') {
      c.requestRenderAll();
    }
    syncLayerList();
  });

  if (fontFamilySel) {
    fontFamilySel.onchange = () => {
      const family = fontFamilySel.value;
      applyToActiveText(obj => { obj.set('fontFamily', family); });
    };
  }

  if (fontSizeInput) {
    fontSizeInput.oninput = () => {
      const size = parseInt(fontSizeInput.value, 10) || 12;
      if (fontSizeValue) fontSizeValue.textContent = size + ' px';
      applyToActiveText(obj => { obj.set('fontSize', size); });
    };
  }

  if (fontColorInput) {
    fontColorInput.onchange = () => {
      const color = fontColorInput.value || '#ff0000';
      applyToActiveText(obj => { obj.set('fill', color); });
    };
  }

  if (fontStrokeColorInput) {
    fontStrokeColorInput.onchange = () => {
      const color = fontStrokeColorInput.value || DEFAULT_STROKE_COLOR;
      applyToActiveText(obj => {
        obj.set('stroke', color);
        obj.set('paintFirst', 'stroke');
        obj.set('strokeUniform', true);
      });
    };
  }

  if (fontStrokeWidthInput) {
    fontStrokeWidthInput.addEventListener('input', () => {
      const width = parseFloat(fontStrokeWidthInput.value) || 0;
      if (fontStrokeWidthValue) fontStrokeWidthValue.textContent = formatStrokeWidth(width);
      applyToActiveText(obj => {
        obj.set('strokeWidth', width);
        obj.set('paintFirst', 'stroke');
        obj.set('strokeUniform', true);
      });
    });
  }

  if (fontBoldToggle) {
    fontBoldToggle.onclick = () => {
      const next = fontBoldToggle.getAttribute('aria-pressed') !== 'true';
      setPressed(fontBoldToggle, next);
      applyToActiveText(obj => { obj.set('fontWeight', next ? '700' : '400'); });
    };
  }

  if (fontItalicToggle) {
    fontItalicToggle.onclick = () => {
      const next = fontItalicToggle.getAttribute('aria-pressed') !== 'true';
      setPressed(fontItalicToggle, next);
      applyToActiveText(obj => { obj.set('fontStyle', next ? 'italic' : 'normal'); });
    };
  }

  alignButtons.forEach(btn => {
    btn.onclick = () => {
      alignButtons.forEach(other => setPressed(other, other === btn));
      const value = btn.dataset.nbAlign || 'left';
      applyToActiveText(obj => { obj.set('textAlign', value); });
    };
  });

  if (textCurveToggle) {
    textCurveToggle.onclick = () => {
      const next = textCurveToggle.getAttribute('aria-pressed') !== 'true';
      setPressed(textCurveToggle, next);
      applyToActiveText(obj => {
        const state = ensureTextboxCurveState(obj);
        state.enabled = next;
        if (next && Math.abs(state.amount) < 1) {
          state.amount = curveDefaultAmount(obj);
        }
        storeTextboxCurveState(obj, state);
      });
      syncTextControls();
    };
  }

  if (textCurveInput) {
    textCurveInput.addEventListener('input', () => {
      const raw = parseInt(textCurveInput.value, 10);
      const value = clampCurveAmount(Number.isFinite(raw) ? raw : 0);
      if (textCurveValue) {
        const enabled = textCurveToggle ? textCurveToggle.getAttribute('aria-pressed') === 'true' : false;
        textCurveValue.textContent = formatCurveLabel(value, enabled);
      }
      applyToActiveText(obj => {
        const state = ensureTextboxCurveState(obj);
        state.amount = value;
        storeTextboxCurveState(obj, state);
      });
      syncTextControls();
    });
  }

  if (productModalTrigger) {
    productModalTrigger.addEventListener('click', openProductModal);
  }

  if (productModal) {
    const closeButtons = Array.from(productModal.querySelectorAll('[data-nb-close="product-modal"]'));
    closeButtons.forEach(btn => btn.addEventListener('click', closeProductModal));
    productModal.addEventListener('click', evt => {
      if (evt.target && evt.target.dataset && evt.target.dataset.nbClose === 'product-modal') {
        closeProductModal();
      }
    });
  }

  if (colorModalTrigger) {
    colorModalTrigger.addEventListener('click', openColorModal);
  }

  if (colorModal) {
    const closeButtons = Array.from(colorModal.querySelectorAll('[data-nb-close="color-modal"]'));
    closeButtons.forEach(btn => btn.addEventListener('click', closeColorModal));
    colorModal.addEventListener('click', evt => {
      if (evt.target && evt.target.dataset && evt.target.dataset.nbClose === 'color-modal') {
        closeColorModal();
      }
    });
  }

  renderBulkDiscountTable();
  updateBulkDiscountHint();

  if (bulkModalTrigger) {
    bulkModalTrigger.addEventListener('click', () => {
      if (bulkModalTrigger.disabled) return;
      openBulkModal();
    });
  }

  if (bulkModal) {
    const closeButtons = Array.from(bulkModal.querySelectorAll('[data-nb-close="bulk-modal"]'));
    closeButtons.forEach(btn => btn.addEventListener('click', closeBulkModal));
    bulkModal.addEventListener('click', evt => {
      if (evt.target && evt.target.dataset && evt.target.dataset.nbClose === 'bulk-modal') {
        closeBulkModal();
      }
    });
  }

  document.addEventListener('keydown', evt => {
    const key = evt.key;
    if (key === 'Escape') {
      if (mobileSheet && sheetState.activeKey) {
        closeMobileSheet();
        return;
      }
      if (bulkModal && !bulkModal.hidden) {
        closeBulkModal();
        return;
      }
      if (colorModal && !colorModal.hidden) {
        closeColorModal();
        return;
      }
      if (productModal && !productModal.hidden) {
        closeProductModal();
      }
      return;
    }
    if ((key === 'Delete' || key === 'Backspace') && !isEditableTarget(evt.target)) {
      const active = activeDesignObject();
      if (active) {
        evt.preventDefault();
        removeActiveObject(active);
      }
    }
  });

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      refreshControlProfile();
      setMockupBgAndArea();
    });
  });

  window.addEventListener('load', () => {
    setMockupBgAndArea();
  });

  if (typeof history !== 'undefined' && history.replaceState) {
    try {
      history.replaceState({ __nb_root: true }, document.title, location.href);
    } catch (e) { /* ignore */ }
  }

  window.addEventListener('popstate', evt => {
    if (sheetState.historyDepth > 0 && sheetState.activeKey) {
      closeMobileSheet({ fromPopState: true });
      return;
    }
    if (sheetState.pendingClose) {
      sheetState.pendingClose = false;
      return;
    }
    if (mobileUiEnabled()) {
      if (designState.dirty) {
        const leave = window.confirm('Kilépsz a tervezőből? A jelenlegi terv még nincs elmentve.');
        if (!leave && typeof history !== 'undefined' && history.pushState) {
          history.pushState({ __nb_root: true }, document.title, location.href);
        }
      }
    }
  });

  syncLayerList();

  if (addTextBtn) {
    addTextBtn.onclick = () => {
      const a = c.__nb_area || fallbackArea;
      const textboxWidth = Math.max(80, a.w - 40);
      const t = new fabric.Textbox('Írd ide a feliratot', {
        fill: currentFontColor(),
        stroke: currentFontStrokeColor(),
        strokeWidth: currentFontStrokeWidth(),
        strokeUniform: true,
        paintFirst: 'stroke',
        fontSize: currentFontSize(),
        width: textboxWidth,
        left: a.x + (a.w - textboxWidth) / 2,
        top: a.y + 20,
        fontFamily: currentFontFamily(),
        fontWeight: currentFontWeight(),
        fontStyle: currentFontStyle(),
        textAlign: currentTextAlign(),
        cornerStyle: 'circle',
        transparentCorners: false,
        lockScalingFlip: true
      });
      applyObjectUiDefaults(t);
      initializeTextboxCurve(t);
      c.add(t).setActiveObject(t);
      keepObjectInside(t);
      syncTextControls();
    };
  }

  if (uploadInput) {
    uploadInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = evt => {
        const dataUrl = evt && evt.target && typeof evt.target.result === 'string'
          ? evt.target.result
          : '';
        if (!dataUrl) {
          e.target.value = '';
          return;
        }
        fabric.Image.fromURL(dataUrl, img => {
          const a = c.__nb_area || fallbackArea;
          const maxW = a.w * 0.95;
          const maxH = a.h * 0.95;
          const scale = Math.min(1, maxW / img.width, maxH / img.height);
          img.scale(scale);
          img.set({
            left: a.x + (a.w - img.getScaledWidth()) / 2,
            top: a.y + (a.h - img.getScaledHeight()) / 2,
            selectable: true,
            cornerStyle: 'circle',
            transparentCorners: false,
            lockScalingFlip: true
          });
          applyObjectUiDefaults(img);
          if (file && typeof file.name === 'string' && file.name) {
            const baseName = file.name.split(/[/\\]/).pop() || file.name;
            img.__nb_layer_name = baseName.replace(/\.[^.]+$/, '') || 'Kép';
          }
          c.add(img);
          c.setActiveObject(img);
          keepObjectInside(img);
        });
        e.target.value = '';
      };
      reader.onerror = () => {
        console.error('Nem sikerült beolvasni a képfájlt.');
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    });
  }

  if (clearButton) {
    clearButton.onclick = () => {
      designObjects().forEach(obj => c.remove(obj));
      c.discardActiveObject();
      c.requestRenderAll();
      markDesignDirty();
      syncTextControls();
      syncLayerList();
    };
  }

  function exportPrintImage() {
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
    if (c.__nb_area_rect && c.__nb_area_rect.visible !== false) {
      c.__nb_area_rect.visible = false;
      hiddenObjects.push(c.__nb_area_rect);
    }

    const bgImage = c.backgroundImage || null;
    if (bgImage) {
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
      if (bgImage) {
        c.backgroundImage = bgImage;
      }
      c.backgroundColor = originalBgColor;
      hiddenObjects.forEach(obj => { obj.visible = true; });
      c.renderAll();
    }

    return {
      dataUrl,
      width: Math.round(width * multiplier),
      height: Math.round(height * multiplier)
    };
  }

  async function exportSideForSaving(sideKey) {
    const normalized = sideKey === 'back' ? 'back' : 'front';
    const initialState = ensureSideState(normalized);
    const canRender = (normalized === 'front') || doubleSidedEnabled;
    if (canRender) {
      await setActiveSide(normalized);
      captureActiveSideState();
    }
    const state = ensureSideState(normalized);
    const hasContent = state.hasContent;
    let preview = '';
    let printData = { dataUrl: '', width: 0, height: 0 };
    if (hasContent && canRender) {
      preview = c.toDataURL({ format: 'png', multiplier: 2, left: 0, top: 0 });
      printData = exportPrintImage();
    }
    return {
      key: normalized,
      hasContent,
      preview,
      printData,
      json: cloneSideJson(state || initialState),
      objectCount: state ? state.objectCount : (initialState.objectCount || 0)
    };
  }

  async function persistCurrentDesign() {
    if (!hasCompleteSelection()) {
      const err = new Error('incomplete-selection');
      err.userMessage = 'Kérjük válaszd ki a terméket, színt és méretet!';
      throw err;
    }
    if (!c) {
      const err = new Error('canvas-missing');
      err.userMessage = 'Nem sikerült betölteni a vásznat.';
      throw err;
    }
    if (saving && savePromise) {
      return savePromise;
    }
    saving = true;
    updateActionStates();
    const saveTask = (async () => {
      captureActiveSideState();
      const previousSide = activeSideKey;
      const frontData = await exportSideForSaving('front');
      const backData = await exportSideForSaving('back');
      await setActiveSide(previousSide);
      const shouldIncludeBack = doubleSidedEnabled && backData.hasContent;
      const previewPng = frontData.preview || c.toDataURL({ format: 'png', multiplier: 2, left: 0, top: 0 });
      const printExport = frontData.printData || exportPrintImage();
      if (!printExport.dataUrl) {
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
      const printedSideCount = (frontData.hasContent ? 1 : 0) + (shouldIncludeBack ? 1 : 0);
      const surchargeValue = shouldIncludeBack ? doubleSidedFeeValue() : 0;
      const price_ctx = { product_id: sel.pid, type: sel.type, color: sel.color, size };
      if (typeLabel) price_ctx.type_label = typeLabel;
      if (colorLabel) price_ctx.color_label = colorLabel;
      if (sizeLabel) price_ctx.size_label = sizeLabel;
      const attributes_json = { pa_type: sel.type, pa_color: sel.color, pa_size: size };
      if (typeLabel) attributes_json.type_label = typeLabel;
      if (colorLabel) attributes_json.color_label = colorLabel;
      if (sizeLabel) attributes_json.size_label = sizeLabel;
      const meta = {
        width_mm: 300,
        height_mm: 400,
        dpi: 300,
        product_id: sel.pid,
        attributes_json,
        price_ctx,
        double_sided_enabled: doubleSidedEnabled ? 1 : 0,
        printed_side_count: printedSideCount,
        double_sided_surcharge: surchargeValue,
        printed_sides: {
          front: {
            has_content: frontData.hasContent,
            object_count: frontData.objectCount,
            included: frontData.hasContent
          },
          back: {
            has_content: backData.hasContent,
            object_count: backData.objectCount,
            included: shouldIncludeBack
          }
        }
      };
      let res;
      const requestBody = {
        png_base64: previewPng,
        print_png_base64: printExport.dataUrl,
        print_width_px: printExport.width,
        print_height_px: printExport.height,
        layers: {
          front: frontData.json,
          back: backData.json
        },
        meta
      };
      if (shouldIncludeBack) {
        requestBody.png_back_base64 = backData.preview || '';
        requestBody.print_png_back_base64 = backData.printData?.dataUrl || '';
        requestBody.print_back_width_px = backData.printData?.width || 0;
        requestBody.print_back_height_px = backData.printData?.height || 0;
      }
      try {
        res = await fetch(NB_DESIGNER.rest + 'save', {
          method: 'POST',
          headers: { 'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      } catch (networkError) {
        const err = new Error('network');
        err.userMessage = 'Hálózati hiba';
        throw err;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
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

  async function ensureDesignSaved() {
    if (!designState.dirty && designState.savedDesignId) {
      return designState.savedDesignId;
    }
    return persistCurrentDesign();
  }

  if (bulkConfirmBtn) {
    bulkConfirmBtn.onclick = async () => {
      const entries = collectBulkSizeEntries();
      if (!entries.length) {
        alert('Adj meg legalább egy mennyiséget!');
        return;
      }
      bulkConfirmBtn.disabled = true;
      actionSubmitting = true;
      updateActionStates();
      try {
        const designId = await ensureDesignSaved();
        let res;
        try {
          res = await fetch(NB_DESIGNER.rest + 'add-to-cart', {
            method: 'POST',
            headers: { 'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type': 'application/json' },
            body: JSON.stringify({ design_id: designId, bulk_sizes: entries })
          });
        } catch (networkError) {
          const err = new Error('network');
          err.userMessage = 'Hálózati hiba';
          throw err;
        }
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert((j && j.message) ? j.message : 'Kosár hiba');
          return;
        }
        closeBulkModal();
        if (j.redirect) {
          window.location = j.redirect;
        }
      } catch (e) {
        if (e && e.userMessage) {
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

  if (addToCartBtn) {
    addToCartBtn.onclick = async () => {
      if (addToCartBtn.disabled) return;
      actionSubmitting = true;
      updateActionStates();
      try {
        const designId = await ensureDesignSaved();
        let res;
        try {
          res = await fetch(NB_DESIGNER.rest + 'add-to-cart', {
            method: 'POST',
            headers: { 'X-WP-Nonce': NB_DESIGNER.nonce, 'Content-Type': 'application/json' },
            body: JSON.stringify({ design_id: designId })
          });
        } catch (networkError) {
          const err = new Error('network');
          err.userMessage = 'Hálózati hiba';
          throw err;
        }
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert((j && j.message) ? j.message : 'Kosár hiba');
          return;
        }
        if (j.redirect) {
          window.location = j.redirect;
        }
      } catch (e) {
        if (e && e.userMessage) {
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

  // --- Generic Modal Close ---
  document.addEventListener('click', (e) => {
    const closeTrigger = e.target.closest('[data-nb-close]');
    if (!closeTrigger) return;
    const key = closeTrigger.dataset.nbClose;
    if (!key) return;
    const modalId = 'nb-' + key;
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.setAttribute('hidden', '');
      e.preventDefault();
    }
  });

  // --- Template System ---
  const templatesModal = document.getElementById('nb-templates-modal');
  const templatesTrigger = document.getElementById('nb-templates-trigger');
  const templatesList = document.getElementById('nb-templates-list');
  const templatesCats = document.getElementById('nb-template-categories');
  const templateSearch = document.getElementById('nb-template-search-input');
  let currentCat = 0;
  let searchTimer = null;

  if (templatesTrigger) {
    templatesTrigger.onclick = function () {
      openTemplatesModal();
    };
  }

  if (templateSearch) {
    templateSearch.oninput = function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        fetchTemplates(currentCat, this.value);
      }, 500);
    };
  }

  async function openTemplatesModal() {
    if (!templatesModal) return;
    templatesModal.removeAttribute('hidden');
    templatesList.innerHTML = '<p>Betöltés...</p>';

    // Reset filters
    currentCat = 0;
    if (templateSearch) templateSearch.value = '';

    try {
      const res = await fetch(NB_DESIGNER.rest + 'templates', {
        headers: { 'X-WP-Nonce': NB_DESIGNER.nonce }
      });
      const data = await res.json();

      renderCategories(data.categories || []);
      renderTemplates(data.templates || []);
    } catch (e) {
      templatesList.innerHTML = '<p>Hiba a sablonok betöltésekor.</p>';
    }
  }

  async function fetchTemplates(catId, searchVal) {
    templatesList.innerHTML = '<p>Keresés...</p>';
    currentCat = catId;

    // Update active state in sidebar
    const links = templatesCats.querySelectorAll('li');
    links.forEach(li => li.classList.remove('active'));
    const activeLi = templatesCats.querySelector(`li[data-id="${catId}"]`);
    if (activeLi) activeLi.classList.add('active');

    const url = new URL(NB_DESIGNER.rest + 'templates');
    if (catId) url.searchParams.append('category', catId);
    if (searchVal) url.searchParams.append('search', searchVal);

    try {
      const res = await fetch(url.toString(), {
        headers: { 'X-WP-Nonce': NB_DESIGNER.nonce }
      });
      const data = await res.json();
      renderTemplates(data.templates || []);
    } catch (e) {
      templatesList.innerHTML = '<p>Hiba a keresés során.</p>';
    }
  }

  function renderCategories(cats) {
    if (!templatesCats) return;
    let html = `<li data-id="0" class="active">Összes</li>`;
    cats.forEach(c => {
      html += `<li data-id="${c.id}">${c.name} <small>(${c.count})</small></li>`;
    });
    templatesCats.innerHTML = html;

    templatesCats.querySelectorAll('li').forEach(li => {
      li.onclick = () => {
        const id = parseInt(li.dataset.id);
        fetchTemplates(id, templateSearch ? templateSearch.value : '');
      };
    });
  }

  function renderTemplates(list) {
    templatesList.innerHTML = '';
    if (!list || !list.length) {
      templatesList.innerHTML = '<p>Nincs találat.</p>';
      return;
    }
    list.forEach(tpl => {
      const div = document.createElement('div');
      div.className = 'nb-template-card';

      const img = tpl.preview_url ? `<img src="${tpl.preview_url}" alt="${tpl.title}">` : '<div class="nb-template-placeholder"></div>';

      div.innerHTML = `
        <div class="nb-template-preview">${img}</div>
        <div class="nb-template-title">${tpl.title}</div>
      `;
      div.onclick = () => loadTemplate(tpl.id);
      templatesList.appendChild(div);
    });
  }

  async function loadTemplate(id) {
    try {
      const res = await fetch(NB_DESIGNER.rest + 'load-design?id=' + id, {
        headers: { 'X-WP-Nonce': NB_DESIGNER.nonce }
      });
      const data = await res.json();
      if (data && data.layers) {
        await loadDesign(data);
        if (templatesModal) templatesModal.setAttribute('hidden', '');
      }
    } catch (e) {
      alert('Hiba a sablon betöltésekor.');
    }
  }

  async function loadDesign(data) {
    // Reset sides
    sideStates.front = { json: null, preview: null, hasContent: false, undoStack: [], redoStack: [] };
    sideStates.back = { json: null, preview: null, hasContent: false, undoStack: [], redoStack: [] };

    const layers = data.layers;
    // Check if layers has explicit front/back properties (saved designs)
    if (layers && layers.front) {
      sideStates.front.json = layers.front;
      sideStates.front.hasContent = true;
    }
    if (layers && layers.back) {
      sideStates.back.json = layers.back;
      sideStates.back.hasContent = true;
    }

    // If no explicit front/back, treat the entire layers as front side (templates, legacy)
    if (!layers.front && !layers.back && layers) {
      sideStates.front.json = layers;
      sideStates.front.hasContent = true;
    }

    // Switch to front and load
    activeSideKey = 'front';
    await loadSideState('front');
    updateSideUiState();
    updatePriceDisplay();
  }

})();
