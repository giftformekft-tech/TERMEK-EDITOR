(function () {
  if (typeof fabric === 'undefined') return;
  const canvasEl = document.getElementById('nb-canvas');
  if (!canvasEl) return;

  const baseCanvasSize = {
    w: parseInt(canvasEl.getAttribute('width'), 10) || canvasEl.width || 480,
    h: parseInt(canvasEl.getAttribute('height'), 10) || canvasEl.height || 640
  };
  const settings = (typeof NB_DESIGNER !== 'undefined' && NB_DESIGNER.settings) ? NB_DESIGNER.settings : {};
  let initialDesignImageUrl = (typeof NB_DESIGNER !== 'undefined' && typeof NB_DESIGNER.initial_design_image_url === 'string') ? NB_DESIGNER.initial_design_image_url.trim() : '';
  const c = new fabric.Canvas('nb-canvas', { preserveObjectStacking: true, backgroundColor: '#fff' });
  c.allowTouchScrolling = true;
  // WebGL filter backend mishandles high-DPR (retina) mobile screens — only 1/4 of the
  // filtered image renders. Canvas2D backend handles pixel ratio correctly on all devices.
  fabric.filterBackend = new fabric.Canvas2dFilterBackend();

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

  // Keyboard shortcuts only step aside while the user is actually typing
  // (text fields, selects, sliders); a focused button must not block them.
  function isTypingTarget(target) {
    if (!target || typeof target !== 'object') return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    if (tag === 'textarea' || tag === 'select') return true;
    if (tag === 'input') {
      const type = (target.type || 'text').toLowerCase();
      return ['checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file'].indexOf(type) === -1;
    }
    return false;
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
    borderScaleFactor: fabric.Object.prototype.borderScaleFactor,
  };
  // The canvas keeps a fixed logical size (the mockup reference size) and is
  // only scaled with CSS to fit the stage. Control handles are drawn in logical
  // pixels, so they are compensated by the current CSS scale to keep a steady
  // on-screen size on every device.
  let canvasCssScale = 1;
  function profileForKey(key) {
    const scale = canvasCssScale > 0 ? canvasCssScale : 1;
    const borderScaleFactor = Number.isFinite(baseControlProfile.borderScaleFactor) && baseControlProfile.borderScaleFactor > 0
      ? baseControlProfile.borderScaleFactor
      : 1;
    const toLogical = cssPx => Math.max(4, Math.round(cssPx / scale));
    if (key === 'mobile') {
      const cornerSize = toLogical(18);
      return {
        cornerSize,
        touchCornerSize: Math.max(toLogical(44), cornerSize + 2),
        borderScaleFactor,
      };
    }
    const cornerSize = toLogical(12);
    return {
      cornerSize,
      touchCornerSize: Math.max(toLogical(30), cornerSize + 2),
      borderScaleFactor,
    };
  }
  let activeControlSignature = '';
  const controlMedia = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    ? window.matchMedia('(max-width: 768px), (pointer: coarse)')
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
  const appEl = document.getElementById('nb-designer');
  const modalTypeList = document.getElementById('nb-modal-type-list');
  const modalProductList = document.getElementById('nb-modal-product-list');
  const productGroupEl = document.getElementById('nb-product-group');
  const typeGroupEl = document.getElementById('nb-type-group');
  const modalColorList = document.getElementById('nb-modal-color-list');
  const colorModalLabel = document.getElementById('nb-color-modal-label');
  const sizeButtonsWrap = document.getElementById('nb-size-buttons');
  const sizeValueEl = document.getElementById('nb-size-value');
  const sizeGroupEl = document.getElementById('nb-size-group');
  const productChipTitle = document.getElementById('nb-product-chip-title');
  const productChipMeta = document.getElementById('nb-product-chip-meta');
  const productChipSwatch = document.getElementById('nb-product-chip-swatch');
  const bulkModal = document.getElementById('nb-bulk-modal');
  const bulkModalTrigger = document.getElementById('nb-bulk-modal-trigger');
  const bulkModalList = document.getElementById('nb-bulk-size-list');
  const bulkConfirmBtn = document.getElementById('nb-bulk-confirm');
  const bulkDiscountSection = document.getElementById('nb-bulk-discount-section');
  const bulkDiscountTable = document.getElementById('nb-bulk-discount-table');
  const bulkDiscountHint = document.getElementById('nb-bulk-discount-hint');
  const orderChecklistEl = document.getElementById('nb-order-checklist');
  const productTitleEl = document.getElementById('nb-product-title');
  const priceDisplayEl = document.getElementById('nb-price-display');
  const priceBaseEl = document.getElementById('nb-price-base');
  const priceSurchargeRow = document.getElementById('nb-price-surcharge-row');
  const priceSurchargeValueEl = document.getElementById('nb-price-surcharge');
  const priceTotalEl = document.getElementById('nb-price-total');
  const studioTotalEl = document.getElementById('nb-studio-total');
  const studioOrderBtn = document.getElementById('nb-studio-order');
  const studioDesignStatus = document.getElementById('nb-studio-design-status');
  const studioSelectionHint = document.getElementById('nb-studio-selection-hint');
  const fontFamilySel = document.getElementById('nb-font-family');
  const DEFAULT_FONT_SIZE = 24;
  const DEFAULT_STROKE_WIDTH = 0;
  const DEFAULT_STROKE_COLOR = '#000000';
  const DEFAULT_LINE_HEIGHT = 1.16;
  const DEFAULT_SHADOW_COLOR = '#000000';
  const fontSizeInput = document.getElementById('nb-font-size');
  const fontSizeValue = document.getElementById('nb-font-size-value');
  const fontColorInput = document.getElementById('nb-font-color');
  const fontStrokeColorInput = document.getElementById('nb-font-stroke-color');
  const fontStrokeWidthInput = document.getElementById('nb-font-stroke-width');
  const fontStrokeWidthValue = document.getElementById('nb-font-stroke-width-value');
  const letterSpacingInput = document.getElementById('nb-letter-spacing');
  const letterSpacingValue = document.getElementById('nb-letter-spacing-value');
  const lineHeightInput = document.getElementById('nb-line-height');
  const lineHeightValue = document.getElementById('nb-line-height-value');
  const textShadowColorInput = document.getElementById('nb-text-shadow-color');
  const textShadowBlurInput = document.getElementById('nb-text-shadow-blur');
  const textShadowBlurValue = document.getElementById('nb-text-shadow-blur-value');
  const fontBoldToggle = document.getElementById('nb-font-bold');
  const fontItalicToggle = document.getElementById('nb-font-italic');
  const alignButtons = Array.from(document.querySelectorAll('[data-nb-align]'));
  const textCurveToggle = document.getElementById('nb-text-curve-toggle');
  const textCurveInput = document.getElementById('nb-text-curve');
  const textCurveValue = document.getElementById('nb-text-curve-value');
  const textCurveHint = document.getElementById('nb-text-curve-hint');
  const clearButton = document.getElementById('nb-clear-design');
  const addToCartBtn = document.getElementById('nb-add-to-cart');
  const uploadInput = document.getElementById('nb-upload');
  const addTextBtn = document.getElementById('nb-add-text');
  const layerListEl = document.getElementById('nb-layer-list');
  const groupBtn = document.getElementById('nb-group-btn');
  const ungroupBtn = document.getElementById('nb-ungroup-btn');
  const objectAlignButtons = Array.from(document.querySelectorAll('[data-nb-obj-align]'));
  const distributeHBtn = document.getElementById('nb-distribute-h');
  const distributeVBtn = document.getElementById('nb-distribute-v');
  const opacityInput = document.getElementById('nb-opacity');
  const opacityValue = document.getElementById('nb-opacity-value');
  const flipHBtn = document.getElementById('nb-flip-h');
  const flipVBtn = document.getElementById('nb-flip-v');
  const appearanceFillGroup = document.getElementById('nb-appearance-fill-group');
  const shapeFillInput = document.getElementById('nb-shape-fill');
  const patternUploadBtn = document.getElementById('nb-pattern-upload');
  const patternUploadInput = document.getElementById('nb-pattern-upload-input');
  const patternClearBtn = document.getElementById('nb-pattern-clear');
  const patternScaleWrap = document.getElementById('nb-pattern-scale-wrap');
  const patternScaleInput = document.getElementById('nb-pattern-scale');
  const patternScaleValue = document.getElementById('nb-pattern-scale-value');
  const filterGrayscaleToggle = document.getElementById('nb-filter-grayscale');
  const filterSepiaToggle = document.getElementById('nb-filter-sepia');
  const filterBrightnessInput = document.getElementById('nb-filter-brightness');
  const filterBrightnessValue = document.getElementById('nb-filter-brightness-value');
  const filterContrastInput = document.getElementById('nb-filter-contrast');
  const filterContrastValue = document.getElementById('nb-filter-contrast-value');
  const imageLowResWarningEl = document.getElementById('nb-image-lowres-warning');
  const replaceImageBtn = document.getElementById('nb-replace-image');
  const replaceImageInput = document.getElementById('nb-replace-image-input');
  const cropImageBtn = document.getElementById('nb-crop-image');
  const cropToolbarEl = document.getElementById('nb-crop-toolbar');
  const cropApplyBtn = document.getElementById('nb-crop-apply');
  const cropCancelBtn = document.getElementById('nb-crop-cancel');
  const shapeButtons = Array.from(document.querySelectorAll('[data-nb-shape]'));
  const qrInput = document.getElementById('nb-qr-input');
  const qrAddBtn = document.getElementById('nb-qr-add');
  const qrHintEl = document.getElementById('nb-qr-hint');
  const zoomInBtn = document.getElementById('nb-zoom-in');
  const zoomOutBtn = document.getElementById('nb-zoom-out');
  const zoomResetBtn = document.getElementById('nb-zoom-reset');
  const zoomLevelEl = document.getElementById('nb-zoom-level');
  const doubleSidedToggle = document.getElementById('nb-double-sided-toggle');
  const doubleSidedNote = document.getElementById('nb-double-sided-note');
  const sideStatusEl = document.getElementById('nb-side-status');
  const sideBackFeeEl = document.getElementById('nb-side-back-fee');
  const printSummaryEl = document.getElementById('nb-print-summary');
  const canvasEmptyHintEl = document.getElementById('nb-canvas-empty-hint');
  const sideButtons = Array.from(document.querySelectorAll('button[data-nb-side]'));
  const undoBtn = document.getElementById('nb-undo-btn');
  const redoBtn = document.getElementById('nb-redo-btn');
  const textInputEl = document.getElementById('nb-text-input');
  const textContentEl = document.getElementById('nb-text-content');
  const previewToggleBtn = document.getElementById('nb-preview-toggle');
  const stageCanvasEl = document.getElementById('nb-stage-canvas');
  const canvasFrameEl = document.getElementById('nb-canvas-frame');
  const quickbarEl = document.getElementById('nb-quickbar');
  const quickButtons = {};
  Array.from(document.querySelectorAll('[data-nb-quick]')).forEach(btn => {
    const key = btn.dataset.nbQuick;
    if (key) quickButtons[key] = btn;
  });
  const layerCountBadges = Array.from(document.querySelectorAll('[data-nb-layer-count]'));
  const toastsEl = document.getElementById('nb-toasts');
  const dialogEl = document.getElementById('nb-dialog');
  const propertiesEmptyEl = document.getElementById('nb-properties-empty');
  const templatesList = document.getElementById('nb-templates-list');
  const templatesCats = document.getElementById('nb-template-categories');
  const templateSearch = document.getElementById('nb-template-search-input');

  // Panels: the same markup is a docked column on desktop and a bottom sheet on phones.
  const mobileMedia = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    ? window.matchMedia('(max-width: 768px)')
    : null;
  const tabletMedia = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    ? window.matchMedia('(min-width: 769px) and (max-width: 1199px)')
    : null;
  const sheets = {};
  Array.from(document.querySelectorAll('[data-nb-sheet]')).forEach(el => {
    sheets[el.dataset.nbSheet] = el;
  });
  const toolPanels = new Map();
  Array.from(document.querySelectorAll('[data-nb-panel]')).forEach(el => {
    toolPanels.set(el.dataset.nbPanel, el);
  });
  const toolButtons = Array.from(document.querySelectorAll('[data-nb-tool]'));
  const inspectorTabs = Array.from(document.querySelectorAll('[data-nb-inspector-tab]'));
  const inspectorPanes = new Map();
  Array.from(document.querySelectorAll('[data-nb-inspector-pane]')).forEach(el => {
    inspectorPanes.set(el.dataset.nbInspectorPane, el);
  });
  const propertySections = new Map();
  Array.from(document.querySelectorAll('[data-nb-section]')).forEach(el => {
    propertySections.set(el.dataset.nbSection, el);
  });
  const uiState = {
    tool: 'product',
    inspectorTab: 'properties',
    sheet: '',
    expanded: false,
    historyDepth: 0,
    pendingClose: false,
    preview: false
  };
  let sheetDragState = null;
  const DRAFT_STORAGE_KEY = 'nb_designer_draft_v1';
  const draftState = { savedAt: 0, timer: null, suppressed: false };
  let guideToast = null;
  let layerSelectInProgress = false;

  const loadedFontUrls = new Set();
  const designState = { savedDesignId: null, dirty: true };
  let saving = false;
  let savePromise = null;
  let imageCache = null;
  let imagePregeneTimer = null;
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
  function productList() {
    if (Array.isArray(settings.products) && settings.products.length) return settings.products;
    const catalog = settings.catalog;
    if (!catalog || typeof catalog !== 'object') return [];
    return Object.keys(catalog).filter(key => /^\d+$/.test(String(key)));
  }
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

  function missingSelectionKeys() {
    const sel = currentSelection();
    const missing = [];
    if (!sel || !sel.pid) missing.push('product');
    if (!colorSel.value) missing.push('color');
    if (!hasSizeValue()) missing.push('size');
    return missing;
  }

  function updateDesignStatus() {
    if (!studioDesignStatus) return;
    let state = 'idle';
    let text = 'Még nincs mentve';
    if (saving) {
      state = 'saving';
      text = 'Terv mentése…';
    } else if (!designState.dirty && designState.savedDesignId) {
      state = 'saved';
      text = 'Terv elmentve';
    } else if (draftState.savedAt) {
      state = 'draft';
      text = 'Piszkozat mentve';
    }
    studioDesignStatus.dataset.state = state;
    studioDesignStatus.textContent = text;
  }

  function checklistIcon(done) {
    return '<span class="nb-check-mark" aria-hidden="true">' + (done ? '<svg class="nb-icon"><use href="#nb-i-check"/></svg>' : '') + '</span>';
  }

  function renderOrderChecklist() {
    if (!orderChecklistEl) return;
    const sel = currentSelection();
    const colorLabel = getColorLabel();
    const sizeLabel = sizeSel.value || '';
    const frontHasContent = sideHasContent('front');
    const backHasContent = doubleSidedEnabled && sideHasContent('back');
    const rows = [
      { key: 'product', label: 'Termék', value: sel && sel.pid ? (sel.cfg && sel.cfg.title ? sel.cfg.title : 'kiválasztva') : '', action: 'Választok', hideWhenDone: true },
      { key: 'color', label: 'Szín', value: colorLabel, action: 'Választok' },
      { key: 'size', label: 'Méret', value: sizeLabel, action: 'Választok' },
      { key: 'design', label: 'Terv', value: (frontHasContent || backHasContent) ? (backHasContent ? (frontHasContent ? 'előlap és hátlap' : 'hátlap') : 'előlap') : '', action: 'Tervezek', optional: true }
    ];
    orderChecklistEl.innerHTML = '';
    rows.forEach(row => {
      const done = !!row.value;
      if (done && row.hideWhenDone) return;
      const li = document.createElement('li');
      const inner = document.createElement(done ? 'div' : 'button');
      inner.className = 'nb-check-item ' + (done ? 'is-done' : (row.optional ? 'is-optional' : 'is-missing'));
      if (!done) {
        inner.type = 'button';
        inner.addEventListener('click', () => {
          if (row.key === 'design') {
            openTool('upload');
          } else {
            guideToSelection(row.key);
          }
        });
      }
      inner.innerHTML = checklistIcon(done);
      const label = document.createElement('span');
      label.className = 'nb-check-label';
      label.appendChild(document.createTextNode(row.label + ': '));
      const value = document.createElement('strong');
      value.textContent = done ? row.value : (row.optional ? 'még üres' : 'nincs kiválasztva');
      label.appendChild(value);
      inner.appendChild(label);
      if (!done) {
        const action = document.createElement('span');
        action.className = 'nb-check-action';
        action.textContent = row.action;
        inner.appendChild(action);
      }
      li.appendChild(inner);
      orderChecklistEl.appendChild(li);
    });
  }

  function updateActionStates() {
    const ready = hasCompleteSelection();
    const busy = saving || actionSubmitting;
    if (studioOrderBtn) studioOrderBtn.disabled = busy;
    updateDesignStatus();
    if (studioSelectionHint) {
      const missing = missingSelectionKeys();
      let hint = 'A tervet a kosárba helyezéskor mentjük.';
      if (missing.length) {
        const names = { product: 'terméket', color: 'színt', size: 'méretet' };
        hint = 'A rendeléshez válassz ' + missing.map(k => names[k]).join(', ') + '.';
      }
      studioSelectionHint.textContent = hint;
    }
    // The cart buttons stay clickable when something is missing: a click
    // explains what to choose instead of silently doing nothing.
    if (addToCartBtn) {
      addToCartBtn.disabled = busy;
      addToCartBtn.dataset.ready = ready ? 'true' : 'false';
      addToCartBtn.classList.toggle('is-busy', busy);
    }
    if (bulkModalTrigger) {
      bulkModalTrigger.disabled = busy || !hasSizeOptions();
      bulkModalTrigger.dataset.ready = ready ? 'true' : 'false';
    }
    renderOrderChecklist();
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
      // Sans (alap / UI)
      { label: 'Roboto', family: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
      { label: 'Montserrat', family: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap' },
      { label: 'Lato', family: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' },
      { label: 'Inter', family: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },
      { label: 'Nunito', family: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap' },
      { label: 'Work Sans', family: 'Work Sans', url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&display=swap' },
      { label: 'Rubik', family: 'Rubik', url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap' },
      // Geometrikus / display sans
      { label: 'Poppins', family: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap' },
      { label: 'Quicksand', family: 'Quicksand', url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap' },
      { label: 'Josefin Sans', family: 'Josefin Sans', url: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap' },
      // Kondenzált / bold display (plakát, póló-felirat)
      { label: 'Oswald', family: 'Oswald', url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap' },
      { label: 'Anton', family: 'Anton', url: 'https://fonts.googleapis.com/css2?family=Anton&display=swap' },
      { label: 'Bebas Neue', family: 'Bebas Neue', url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap' },
      { label: 'Archivo Black', family: 'Archivo Black', url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap' },
      // Szerif (elegáns / klasszikus)
      { label: 'Playfair Display', family: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap' },
      { label: 'Merriweather', family: 'Merriweather', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap' },
      { label: 'Lora', family: 'Lora', url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap' },
      // Script / kézírás
      { label: 'Caveat', family: 'Caveat', url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap' },
      { label: 'Dancing Script', family: 'Dancing Script', url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap' },
      { label: 'Pacifico', family: 'Pacifico', url: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap' },
      // Dekoratív / karakteres
      { label: 'Bungee', family: 'Bungee', url: 'https://fonts.googleapis.com/css2?family=Bungee&display=swap' },
      { label: 'Righteous', family: 'Righteous', url: 'https://fonts.googleapis.com/css2?family=Righteous&display=swap' },
      { label: 'Lobster', family: 'Lobster', url: 'https://fonts.googleapis.com/css2?family=Lobster&display=swap' },
      { label: 'Permanent Marker', family: 'Permanent Marker', url: 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap' }
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

  // Common Hungarian colour names, so swatches show a real colour even when
  // the admin has not set a hex code for the colour.
  const HU_COLOR_NAMES = {
    'fekete': '#1c1c1c', 'fehér': '#ffffff', 'natúr': '#efe6d2', 'krém': '#f3ead6', 'ekrü': '#efe6d2',
    'piros': '#d32f2f', 'vörös': '#c62828', 'bordó': '#7b1f2b', 'meggy': '#8e1b32',
    'kék': '#1e5bd8', 'királykék': '#1f4fbf', 'sötétkék': '#1b2a4a', 'tengerészkék': '#1b2a4a', 'navy': '#1b2a4a',
    'világoskék': '#8ec5ff', 'égkék': '#8ec5ff', 'babakék': '#bcdcff', 'türkiz': '#1fb5b0', 'petrol': '#1d5c63',
    'zöld': '#2e7d32', 'sötétzöld': '#1b4d2b', 'világoszöld': '#8bd17c', 'fűzöld': '#4caf50', 'menta': '#a8e6cf',
    'khaki': '#8a8456', 'oliva': '#6b6b2f', 'olíva': '#6b6b2f', 'keki': '#8a8456',
    'sárga': '#f6d32d', 'mustár': '#d4a017', 'narancs': '#f57c00', 'narancssárga': '#f57c00', 'barack': '#ffcba4', 'korall': '#ff7f6e',
    'lila': '#7b3fa6', 'padlizsán': '#4b2a4f', 'levendula': '#b9a3e3', 'rózsaszín': '#f48fb1', 'pink': '#ec407a', 'magenta': '#c2185b',
    'szürke': '#9e9e9e', 'világosszürke': '#d0d0d0', 'sötétszürke': '#4a4a4a', 'melírszürke': '#b5b5b5', 'melír': '#b5b5b5',
    'antracit': '#3b3d40', 'grafit': '#41434a', 'ezüst': '#c0c0c0', 'arany': '#c9a227',
    'barna': '#6d4c41', 'csokoládé': '#4e342e', 'bézs': '#d8c3a5', 'homok': '#d9c7a3', 'teve': '#b38b59'
  };

  function hungarianColorCode(cleaned) {
    if (!cleaned) return '';
    const compact = cleaned.replace(/[\s_-]+/g, '');
    return HU_COLOR_NAMES[cleaned] || HU_COLOR_NAMES[compact] || '';
  }

  function colorCodeFromText(str) {
    if (typeof str !== 'string') return '';
    const configured = settings.color_meta && typeof settings.color_meta === 'object'
      ? settings.color_meta[normalizedColorValue(str.replace(/\([^)]*\)/g, '').trim())]
      : null;
    if (configured && /^#[0-9a-f]{6}$/i.test(configured.hex || '')) return configured.hex;
    const hexMatch = str.match(/#([0-9a-f]{3,8})/i);
    if (hexMatch) return `#${hexMatch[1]}`;
    const cleaned = str.replace(/\([^)]*\)/g, '').trim().toLowerCase();
    const canCheck = typeof CSS !== 'undefined' && typeof CSS.supports === 'function';
    if (cleaned && canCheck && CSS.supports('color', cleaned)) return cleaned;
    return hungarianColorCode(cleaned);
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

  function colorMetaFor(rawColor) {
    if (!settings.color_meta || typeof settings.color_meta !== 'object') return null;
    return settings.color_meta[normalizedColorValue(rawColor)] || null;
  }

  function applySwatchStyle(el, rawColor) {
    if (!el) return;
    el.style.removeProperty('--swatch-color');
    el.style.backgroundImage = '';
    const colorCode = colorCodeFromText(rawColor || '');
    if (colorCode) el.style.setProperty('--swatch-color', colorCode);
    const meta = colorMetaFor(rawColor || '');
    if (meta && meta.texture_url) {
      el.style.backgroundImage = `url("${String(meta.texture_url).replace(/["\\]/g, '\\$&')}")`;
      el.style.backgroundSize = 'cover';
    }
  }

  function renderColorChoices() {
    if (!modalColorList) {
      updateColorTriggerLabel();
      return;
    }
    modalColorList.innerHTML = '';
    const options = Array.from(colorSel.options);
    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Ehhez a termékhez nincs szín beállítva.';
      modalColorList.appendChild(empty);
      updateColorTriggerLabel();
      return;
    }
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = opt.value === colorSel.value;
      btn.className = 'nb-swatch' + (isActive ? ' is-active' : '');
      const label = opt.dataset.display || opt.textContent;
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      const swatch = document.createElement('span');
      swatch.className = 'nb-swatch-color';
      applySwatchStyle(swatch, opt.dataset.rawColor || opt.dataset.original || opt.textContent);
      btn.appendChild(swatch);
      btn.onclick = () => {
        const previous = colorSel.value;
        colorSel.value = opt.value;
        if (colorSel.value !== previous) {
          dispatchChangeEvent(colorSel);
        } else {
          renderColorChoices();
          updateColorTriggerLabel();
        }
      };
      modalColorList.appendChild(btn);
    });
    updateColorTriggerLabel();
  }

  function renderSizeButtons() {
    if (!sizeButtonsWrap) return;
    sizeButtonsWrap.innerHTML = '';
    const options = Array.from(sizeSel.options);
    if (sizeValueEl) sizeValueEl.textContent = sizeSel.value || '';
    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'nb-empty';
      empty.textContent = 'Ehhez a termékhez nincs méret megadva.';
      sizeButtonsWrap.appendChild(empty);
      updateActionStates();
      return;
    }
    options.forEach(opt => {
      if (!opt.value) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = opt.value === sizeSel.value;
      btn.className = 'nb-pill' + (isActive ? ' is-active' : '');
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.textContent = opt.textContent;
      btn.onclick = () => {
        sizeSel.value = opt.value;
        renderSizeButtons();
        updateSelectionSummary();
        scheduleDraftSave();
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
        row.classList.toggle('has-qty', Number.isFinite(parsed) && parsed > 0);
        updateBulkDiscountHint();
      });
      row.classList.toggle('has-qty', Number.isFinite(current) && current > 0);

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
    const typeOptions = types().filter(label => normalizedTypeValue(label));
    if (typeGroupEl) typeGroupEl.hidden = typeOptions.length <= 1;
    if (!typeOptions.length) return;
    const currentValue = normalizedTypeValue(typeSel.value);
    typeOptions.forEach(label => {
      const normalized = normalizedTypeValue(label);
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = normalized === currentValue;
      btn.className = 'nb-chip' + (isActive ? ' is-active' : '');
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.textContent = label;
      btn.onclick = () => {
        const currentNormalized = normalizedTypeValue(typeSel.value);
        if (currentNormalized !== normalized) {
          const match = Array.from(typeSel.options).find(opt => normalizedTypeValue(opt.value) === normalized);
          typeSel.value = match ? match.value : normalized;
          dispatchChangeEvent(typeSel);
        }
      };
      modalTypeList.appendChild(btn);
    });
  }

  function renderModalProducts() {
    if (!modalProductList) return;
    modalProductList.innerHTML = '';
    const cat = getCatalog();
    const options = Array.from(productSel.options);
    const products = productList();
    if (!products.length) {
      if (productGroupEl) productGroupEl.hidden = false;
      const empty = document.createElement('div');
      empty.className = 'nb-modal-empty';
      empty.textContent = 'Nincs elérhető termék. Ellenőrizd az admin Termékek beállításait.';
      modalProductList.appendChild(empty);
      return;
    }
    const currentType = typeSel.value;
    let visible = products.filter(pid => productSupportsType(cat[pid] || cat[String(pid)] || {}, currentType));
    if (!visible.length) visible = products.slice();
    const currentValue = String(productSel.value || '');
    if (productGroupEl) {
      productGroupEl.hidden = visible.length <= 1 && visible.some(pid => String(pid) === currentValue);
    }
    visible.forEach(pid => {
      const key = String(pid);
      const cfg = cat[pid] || cat[key] || {};
      const option = options.find(opt => String(opt.value) === key);
      const title = (cfg.title || option?.textContent || `Termék #${key}`).toString().trim();
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = key === currentValue;
      btn.className = 'nb-product-option nb-modal-product' + (isActive ? ' is-active' : '');
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      const textWrap = document.createElement('span');
      const titleEl = document.createElement('strong');
      titleEl.textContent = title;
      textWrap.appendChild(titleEl);
      const priceText = typeof cfg.price_text === 'string' ? cfg.price_text.trim() : '';
      const priceValue = Number(cfg.price_value);
      const metaText = Number.isFinite(priceValue) && cfg.price_value !== '' && cfg.price_value != null
        ? formatPrice(priceValue)
        : priceText;
      if (metaText) {
        const metaEl = document.createElement('small');
        metaEl.className = 'nb-modal-product-meta';
        metaEl.textContent = metaText;
        textWrap.appendChild(metaEl);
      }
      btn.appendChild(textWrap);
      btn.insertAdjacentHTML('beforeend', '<svg class="nb-icon" aria-hidden="true"><use href="#nb-i-check"/></svg>');
      btn.addEventListener('click', () => {
        if (productSel.value !== key) {
          productSel.value = key;
          dispatchChangeEvent(productSel);
        }
      });
      modalProductList.appendChild(btn);
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
    const anyOpen = (bulkModal && !bulkModal.hidden) || (dialogEl && !dialogEl.hidden);
    document.body.classList.toggle('nb-modal-open', !!anyOpen);
  }

  function getColorLabel() {
    const opt = Array.from(colorSel.options).find(o => o.value === colorSel.value);
    return opt ? (opt.dataset.display || opt.dataset.original || opt.textContent) : '';
  }

  function currentColorRaw() {
    const opt = Array.from(colorSel.options).find(o => o.value === colorSel.value);
    return opt ? (opt.dataset.rawColor || opt.dataset.original || opt.textContent) : '';
  }

  function updateColorTriggerLabel() {
    if (colorModalLabel) colorModalLabel.textContent = getColorLabel();
    applySwatchStyle(productChipSwatch, currentColorRaw());
  }

  function updateSelectionSummary() {
    const sel = currentSelection();
    const colorLabel = getColorLabel();
    const sizeLabel = sizeSel.value || '';
    const title = sel.cfg?.title || 'Termék';
    if (productTitleEl) productTitleEl.textContent = title;
    if (productChipTitle) productChipTitle.textContent = title;
    if (productChipMeta) {
      const parts = [];
      if (colorLabel) parts.push(colorLabel);
      parts.push(sizeLabel ? `${sizeLabel} méret` : (hasSizeOptions() ? 'Válassz méretet!' : ''));
      productChipMeta.textContent = parts.filter(Boolean).join(' · ');
      productChipMeta.classList.toggle('is-missing', !sizeLabel && hasSizeOptions());
    }
    if (sizeValueEl) sizeValueEl.textContent = sizeLabel;
    updateColorTriggerLabel();
    updatePriceDisplay();
    updateActionStates();
    if (guideToast && hasCompleteSelection()) {
      guideToast.dismiss();
      guideToast = null;
    }
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

  function currentProductPriceValue() {
    const sel = currentSelection();
    if (!sel || !sel.cfg) return null;
    const cfg = sel.cfg;
    if (cfg.price_value !== '' && cfg.price_value != null) {
      const value = Number(cfg.price_value);
      if (Number.isFinite(value)) return value;
    }
    const priceText = currentProductPriceText();
    if (!priceText) return null;
    return parsePriceValue(priceText);
  }

  function parsePriceValue(str) {
    if (typeof str !== 'string') return null;
    const matches = str.match(/[0-9][0-9\s.,\u00a0-]*/g);
    if (!matches) return null;
    const parseChunk = (chunk) => {
      let cleaned = chunk.replace(/[^0-9,\.\-]/g, '');
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
    };
    for (let i = matches.length - 1; i >= 0; i -= 1) {
      const parsed = parseChunk(matches[i]);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
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
    const sign = rounded < 0 ? '-' : '';
    // Always group thousands (the hu-HU locale skips 4-digit grouping, which
    // made "6990 Ft" differ from WooCommerce's "6 990 Ft").
    const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return sign + digits + ' Ft';
  }

  function priceMarkupHasSale(markup) {
    return typeof markup === 'string' && /<(del|ins)\b/i.test(markup);
  }

  function updatePriceDisplay() {
    const markup = currentProductPriceMarkup();
    const priceText = currentProductPriceText();
    const baseAmount = currentProductPriceValue();
    const surcharge = shouldApplyDoubleSidedSurcharge() ? doubleSidedFeeValue() : 0;
    const hasBase = Number.isFinite(baseAmount) || (markup && markup.trim()) || (priceText && priceText.trim());
    const totalTargets = [priceTotalEl, studioTotalEl].filter(Boolean);
    updateDoubleSidedHints();
    if (!hasBase) {
      if (priceDisplayEl) priceDisplayEl.classList.add('nb-price-display--pending');
      if (priceBaseEl) priceBaseEl.textContent = '—';
      if (priceSurchargeRow) priceSurchargeRow.hidden = true;
      if (priceSurchargeValueEl) priceSurchargeValueEl.textContent = formatPrice(0);
      totalTargets.forEach(el => { el.textContent = 'Ár nem elérhető'; });
      return;
    }

    if (priceDisplayEl) priceDisplayEl.classList.remove('nb-price-display--pending');

    if (priceBaseEl) {
      if (priceMarkupHasSale(markup)) {
        priceBaseEl.innerHTML = markup;
      } else if (Number.isFinite(baseAmount)) {
        priceBaseEl.textContent = formatPrice(baseAmount);
      } else if (markup && markup !== priceText) {
        priceBaseEl.innerHTML = markup;
      } else {
        priceBaseEl.textContent = priceText || '—';
      }
    }

    if (priceSurchargeRow && priceSurchargeValueEl) {
      priceSurchargeRow.hidden = !(surcharge > 0);
      priceSurchargeValueEl.textContent = surcharge > 0 ? `+${formatPrice(surcharge)}` : formatPrice(0);
    }
    // The base price line only adds information next to a surcharge or a sale price.
    const baseLine = priceBaseEl ? priceBaseEl.closest('.nb-price-line') : null;
    if (baseLine) baseLine.hidden = !(surcharge > 0) && !priceMarkupHasSale(markup);
    if (priceDisplayEl) priceDisplayEl.classList.toggle('is-simple', !(surcharge > 0) && !priceMarkupHasSale(markup));

    if (Number.isFinite(baseAmount)) {
      const total = baseAmount + (Number.isFinite(surcharge) ? surcharge : 0);
      totalTargets.forEach(el => { el.textContent = formatPrice(total); });
    } else if (markup && markup !== priceText) {
      totalTargets.forEach(el => { el.innerHTML = markup; });
    } else {
      totalTargets.forEach(el => { el.textContent = priceText || '—'; });
    }
  }

  function updateDoubleSidedHints() {
    const fee = doubleSidedFeeValue();
    const feeText = fee > 0 ? `+${formatPrice(fee)}` : '';
    if (sideBackFeeEl) {
      sideBackFeeEl.textContent = feeText;
      sideBackFeeEl.hidden = !feeText || doubleSidedEnabled;
    }
    if (doubleSidedNote) {
      if (doubleSidedEnabled) {
        doubleSidedNote.textContent = fee > 0
          ? `Bekapcsolva. A ${feeText} felár csak akkor kerül az árba, ha a hátlapra is teszel mintát.`
          : 'Bekapcsolva. A hátlapot a vászon feletti „Hátlap” gombbal szerkesztheted.';
      } else {
        doubleSidedNote.textContent = fee > 0
          ? `Ha a hátlapra is terveznél (${feeText}).`
          : 'Kapcsold be, ha a hátlapra is terveznél.';
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
    // Measure the stable stage frame (its size depends only on the layout),
    // never the canvas wrapper itself, to avoid a resize feedback loop.
    const frame = canvasFrameEl || canvasEl.closest('.nb-canvas-frame');
    const width = frame ? frame.clientWidth : 0;
    const height = frame ? frame.clientHeight : 0;
    return {
      w: Math.max(120, width || Math.min(window.innerWidth - 32, defaultCanvasSize.w)),
      h: Math.max(160, height || Math.max(220, window.innerHeight - 260))
    };
  }

  // Logical canvas size = mockup reference size. Object coordinates therefore
  // stay identical on every device and never drift when the window, the phone
  // keyboard or a panel changes the available space: only the CSS size follows.
  function fitCanvasToStage() {
    const logicalW = c.getWidth();
    const logicalH = c.getHeight();
    if (!logicalW || !logicalH) return;
    const bounds = preferredCanvasBounds();
    const scale = Math.min(bounds.w / logicalW, bounds.h / logicalH);
    const cssW = Math.max(1, Math.floor(logicalW * scale));
    const cssH = Math.max(1, Math.floor(logicalH * scale));
    const devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio > 0) ? window.devicePixelRatio : 1;
    const ratio = Math.min(4, Math.max(1, devicePixelRatio * Math.max(1, cssW / logicalW)));
    if (Math.abs((fabric.devicePixelRatio || 1) - ratio) > 0.01) {
      fabric.devicePixelRatio = ratio;
      c.setDimensions({ width: logicalW, height: logicalH }, { backstoreOnly: true });
    }
    c.setDimensions({ width: cssW + 'px', height: cssH + 'px' }, { cssOnly: true });
    if (c.wrapperEl) {
      c.wrapperEl.style.width = cssW + 'px';
      c.wrapperEl.style.height = cssH + 'px';
    }
    canvasCssScale = cssW / logicalW;
    if (c.calcOffset) c.calcOffset();
    refreshControlProfile();
    designObjects().forEach(obj => {
      if (obj && typeof obj.setCoords === 'function') obj.setCoords();
    });
    c.requestRenderAll();
    syncStageInset();
  }

  function applyCanvasSize(size) {
    const targetW = Math.max(1, Math.round(positiveNumberOr(size?.w, defaultCanvasSize.w)));
    const targetH = Math.max(1, Math.round(positiveNumberOr(size?.h, defaultCanvasSize.h)));
    if (c.getWidth() !== targetW || c.getHeight() !== targetH) {
      c.setDimensions({ width: targetW, height: targetH }, { backstoreOnly: true });
    }
    fitCanvasToStage();
    return { w: targetW, h: targetH };
  }

  // Objects loaded from JSON saved at another logical size are scaled into the
  // current one. JSON without a stored size (older designs) is left untouched.
  let objectSpace = null;
  function rescaleObjectsToCanvas() {
    const space = objectSpace;
    objectSpace = { w: c.getWidth(), h: c.getHeight() };
    if (!space || !space.w || !space.h) return;
    if (space.w === objectSpace.w && space.h === objectSpace.h) return;
    const fx = objectSpace.w / space.w;
    const fy = objectSpace.h / space.h;
    const f = Math.min(fx, fy);
    designObjects().forEach(obj => {
      obj.set({
        left: (obj.left || 0) * fx,
        top: (obj.top || 0) * fy,
        scaleX: (obj.scaleX || 1) * f,
        scaleY: (obj.scaleY || 1) * f
      });
      obj.setCoords();
    });
  }

  function isDesignObject(obj) {
    return !!obj && !obj.__nb_bg && !obj.__nb_area && !obj.__nb_crop_overlay;
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
      hasContent: false,
      undoStack: [],
      redoStack: [],
      historyBaseline: null
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
  const PRINT_AREA_WIDTH_MM = 300;
  const PRINT_AREA_HEIGHT_MM = 400;
  const MIN_PRINT_DPI = 150;

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
    const activeObject = c.getActiveObject();
    const isMultiSelection = !!activeObject && activeObject.type === 'activeSelection' && typeof activeObject.getObjects === 'function';
    const selectedObjects = isMultiSelection ? activeObject.getObjects().slice() : null;
    if (isMultiSelection) {
      // ActiveSelection stores child left/top relative to the selection center;
      // discard before snapshotting so toJSON sees each object's absolute coords.
      c.discardActiveObject();
    }
    const raw = c.toJSON(['__nb_layer_id', '__nb_layer_name', '__nb_curve', '__nb_pre_pattern_fill']);
    if (selectedObjects && selectedObjects.length) {
      c.setActiveObject(new fabric.ActiveSelection(selectedObjects, { canvas: c }));
    }
    const clean = Object.assign({}, raw);
    clean.__nb_canvas = { w: c.getWidth(), h: c.getHeight() };
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

  let suspendHistory = false;
  let historyDebounceTimer = null;
  let historyOpInProgress = false;
  const HISTORY_LIMIT = 50;

  function historyState(key) {
    return ensureSideState(key || activeSideKey);
  }

  function currentHistorySnapshot() {
    return JSON.stringify(sanitizeCanvasJSON());
  }

  function updateHistoryButtons() {
    const state = historyState(activeSideKey);
    if (undoBtn) undoBtn.disabled = !state.undoStack.length;
    if (redoBtn) redoBtn.disabled = !state.redoStack.length;
  }

  function commitHistory() {
    if (suspendHistory) return;
    const state = historyState(activeSideKey);
    const snapshot = currentHistorySnapshot();
    if (typeof state.historyBaseline !== 'string') {
      state.historyBaseline = snapshot;
      updateHistoryButtons();
      return;
    }
    if (snapshot === state.historyBaseline) return;
    state.undoStack.push(state.historyBaseline);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.redoStack.length = 0;
    state.historyBaseline = snapshot;
    updateHistoryButtons();
  }

  function scheduleHistoryCommit() {
    if (suspendHistory) return;
    if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
    historyDebounceTimer = setTimeout(commitHistory, 500);
  }

  function undoHistory() {
    if (sideLoading || historyOpInProgress) return;
    if (historyDebounceTimer) { clearTimeout(historyDebounceTimer); historyDebounceTimer = null; }
    commitHistory();
    const state = historyState(activeSideKey);
    if (!state.undoStack.length) return;
    const previous = state.undoStack.pop();
    state.redoStack.push(state.historyBaseline);
    if (state.redoStack.length > HISTORY_LIMIT) state.redoStack.shift();
    historyOpInProgress = true;
    loadSideState(activeSideKey, JSON.parse(previous)).finally(() => { historyOpInProgress = false; });
  }

  function redoHistory() {
    if (sideLoading || historyOpInProgress) return;
    if (historyDebounceTimer) { clearTimeout(historyDebounceTimer); historyDebounceTimer = null; }
    const state = historyState(activeSideKey);
    if (!state.redoStack.length) return;
    const next = state.redoStack.pop();
    state.undoStack.push(state.historyBaseline);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    historyOpInProgress = true;
    loadSideState(activeSideKey, JSON.parse(next)).finally(() => { historyOpInProgress = false; });
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
      btn.classList.toggle('has-content', sideHasContent(key) && (key === 'front' || doubleSidedEnabled));
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (key === 'back') {
        btn.classList.toggle('is-offer', !doubleSidedEnabled);
        btn.title = doubleSidedEnabled ? 'Hátlap szerkesztése' : 'Kétoldalas nyomtatás bekapcsolása és a hátlap szerkesztése';
      }
    });
    updateDoubleSidedHints();
  }

  function updateSideStatus() {
    updateSideUiState();
    if (!sideStatusEl) return;
    const badges = Array.from(sideStatusEl.querySelectorAll('[data-nb-side-status]'));
    badges.forEach(el => {
      const key = el.dataset.nbSideStatus === 'back' ? 'back' : 'front';
      const hasContent = sideHasContent(key);
      let statusText = hasContent ? 'van terv' : 'üres';
      if (key === 'back' && !doubleSidedEnabled) {
        statusText = hasContent ? 'kikapcsolva, van terv' : 'kikapcsolva';
      }
      el.textContent = `${sideLabel(key)}: ${statusText}`;
    });
  }

  function setDoubleSided(enabled) {
    if (!doubleSidedToggle) return;
    if (doubleSidedToggle.checked === !!enabled) return;
    doubleSidedToggle.checked = !!enabled;
    dispatchChangeEvent(doubleSidedToggle);
  }

  function requestSide(target) {
    if (target === 'back' && !doubleSidedEnabled) {
      setDoubleSided(true);
      const fee = doubleSidedFeeValue();
      toast(fee > 0
        ? `Kétoldalas nyomtatás bekapcsolva. A ${formatPrice(fee)} felár csak akkor kerül az árba, ha a hátlapra is teszel mintát.`
        : 'Kétoldalas nyomtatás bekapcsolva.', 'info');
    }
    return setActiveSide(target);
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

  function isMobileUi() {
    return !!(mobileMedia && typeof mobileMedia.matches === 'boolean' && mobileMedia.matches);
  }

  function isTabletUi() {
    return !!(tabletMedia && typeof tabletMedia.matches === 'boolean' && tabletMedia.matches);
  }

  function dockIsVisible() {
    if (isMobileUi()) return uiState.sheet === 'dock';
    if (isTabletUi()) return !!(sheets.dock && sheets.dock.classList.contains('is-open'));
    return true;
  }

  function syncToolButtons() {
    const visible = dockIsVisible();
    toolButtons.forEach(btn => {
      const active = visible && btn.dataset.nbTool === uiState.tool;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-expanded', active ? 'true' : 'false');
    });
  }

  function showToolPanel(key) {
    const target = toolPanels.has(key) ? key : 'product';
    uiState.tool = target;
    toolPanels.forEach((panel, panelKey) => {
      panel.hidden = panelKey !== target;
    });
    syncToolButtons();
    if (target === 'templates') ensureTemplatesLoaded();
  }

  function focusFirstIn(container) {
    if (!container) return;
    const target = container.querySelector('textarea, input:not([type="hidden"]):not([type="file"]), select, button:not([data-nb-sheet-close]):not(:disabled)');
    if (target && typeof target.focus === 'function') {
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
  }

  // After something was added the floating panel steps aside so the design is visible.
  function closeTransientPanel() {
    if (isMobileUi()) closeSheet();
    else if (isTabletUi()) setTabletDock(false);
  }

  function setTabletDock(open) {
    if (!sheets.dock) return;
    sheets.dock.classList.toggle('is-open', !!open);
    syncToolButtons();
  }

  function openTool(key, options) {
    const opts = options || {};
    showToolPanel(key);
    if (isMobileUi()) {
      openSheet('dock', opts);
    } else if (isTabletUi()) {
      setTabletDock(true);
    }
    syncToolButtons();
    if (opts.focus) focusFirstIn(toolPanels.get(uiState.tool));
  }

  function toggleTool(key) {
    if (isMobileUi() && uiState.sheet === 'dock' && uiState.tool === key) {
      closeSheet();
      return;
    }
    if (isTabletUi() && dockIsVisible() && uiState.tool === key) {
      setTabletDock(false);
      return;
    }
    openTool(key);
  }

  function setInspectorTab(tab) {
    const target = inspectorPanes.has(tab) ? tab : 'properties';
    uiState.inspectorTab = target;
    inspectorTabs.forEach(btn => {
      const active = btn.dataset.nbInspectorTab === target;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    });
    inspectorPanes.forEach((pane, key) => {
      pane.hidden = key !== target;
    });
  }

  function openInspector(tab) {
    setInspectorTab(tab || uiState.inspectorTab);
    if (isMobileUi()) openSheet('inspector');
  }

  function openOrder() {
    if (isMobileUi()) {
      openSheet('order');
      return;
    }
    if (sheets.order && typeof sheets.order.scrollIntoView === 'function') {
      sheets.order.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function openSheet(name, options) {
    const opts = options || {};
    const sheet = sheets[name];
    if (!sheet || !isMobileUi()) return;
    const wasOpen = !!uiState.sheet;
    Object.keys(sheets).forEach(key => {
      const el = sheets[key];
      const open = key === name;
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-expanded', open && !!opts.expanded);
      el.classList.remove('is-dragging');
      el.style.removeProperty('--nb-sheet-drag');
    });
    uiState.sheet = name;
    uiState.expanded = !!opts.expanded;
    if (appEl) appEl.classList.add('has-sheet');
    if (!wasOpen && typeof history !== 'undefined' && history.pushState && uiState.historyDepth === 0) {
      try {
        history.pushState({ __nb_sheet: true }, document.title, location.href);
        uiState.historyDepth = 1;
      } catch (e) { /* ignore */ }
    }
    syncToolButtons();
    scheduleStageInset();
  }

  function closeSheet(options) {
    const opts = options || {};
    if (!uiState.sheet) return;
    if (!opts.fromPopState && uiState.historyDepth > 0 && typeof history !== 'undefined' && history.back) {
      uiState.pendingClose = true;
      history.back();
      return;
    }
    Object.keys(sheets).forEach(key => {
      const el = sheets[key];
      el.classList.remove('is-open', 'is-expanded', 'is-dragging');
      el.style.removeProperty('--nb-sheet-drag');
    });
    uiState.sheet = '';
    uiState.expanded = false;
    uiState.pendingClose = false;
    if (opts.fromPopState && uiState.historyDepth > 0) {
      uiState.historyDepth = Math.max(0, uiState.historyDepth - 1);
    }
    if (appEl) appEl.classList.remove('has-sheet');
    syncToolButtons();
    scheduleStageInset();
  }

  function setSheetExpanded(expanded) {
    const sheet = uiState.sheet ? sheets[uiState.sheet] : null;
    if (!sheet) return;
    uiState.expanded = !!expanded;
    sheet.classList.toggle('is-expanded', uiState.expanded);
    scheduleStageInset();
  }

  function beginSheetDrag(evt, grip) {
    const sheet = uiState.sheet ? sheets[uiState.sheet] : null;
    if (!sheet || !evt || typeof evt.clientY !== 'number') return;
    sheetDragState = { sheet, grip, startY: evt.clientY, lastY: evt.clientY, moved: false };
    sheet.classList.add('is-dragging');
    if (grip && typeof grip.setPointerCapture === 'function' && evt.pointerId !== undefined) {
      try { grip.setPointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
    }
    window.addEventListener('pointermove', onSheetDragMove);
    window.addEventListener('pointerup', endSheetDrag);
    window.addEventListener('pointercancel', endSheetDrag);
  }

  function onSheetDragMove(evt) {
    if (!sheetDragState || typeof evt.clientY !== 'number') return;
    sheetDragState.lastY = evt.clientY;
    const delta = sheetDragState.lastY - sheetDragState.startY;
    if (Math.abs(delta) > 6) sheetDragState.moved = true;
    sheetDragState.sheet.style.setProperty('--nb-sheet-drag', Math.max(0, delta) + 'px');
  }

  function endSheetDrag(evt) {
    if (!sheetDragState) return;
    const { sheet, grip, moved } = sheetDragState;
    if (evt && typeof evt.clientY === 'number') sheetDragState.lastY = evt.clientY;
    const delta = sheetDragState.lastY - sheetDragState.startY;
    sheetDragState = null;
    sheet.classList.remove('is-dragging');
    sheet.style.removeProperty('--nb-sheet-drag');
    if (grip && typeof grip.releasePointerCapture === 'function' && evt && evt.pointerId !== undefined) {
      try { grip.releasePointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
    }
    window.removeEventListener('pointermove', onSheetDragMove);
    window.removeEventListener('pointerup', endSheetDrag);
    window.removeEventListener('pointercancel', endSheetDrag);
    if (!moved) {
      setSheetExpanded(!uiState.expanded);
      return;
    }
    if (delta > 90) {
      if (uiState.expanded) setSheetExpanded(false);
      else closeSheet();
      return;
    }
    if (delta < -50) setSheetExpanded(true);
  }

  // When a bottom sheet covers part of the stage on phones, the canvas is
  // visually scaled into the remaining space (CSS transform only, so the
  // logical canvas and every object position stay untouched).
  let stageInsetRaf = null;
  function scheduleStageInset() {
    if (stageInsetRaf) cancelAnimationFrame(stageInsetRaf);
    stageInsetRaf = requestAnimationFrame(() => {
      stageInsetRaf = null;
      syncStageInset();
    });
  }

  function clearStageInset() {
    if (!canvasFrameEl) return;
    canvasFrameEl.style.removeProperty('--nb-frame-scale');
    canvasFrameEl.style.removeProperty('--nb-frame-shift');
  }

  function syncStageInset() {
    if (!canvasFrameEl || !stageCanvasEl) return;
    const sheet = uiState.sheet ? sheets[uiState.sheet] : null;
    const tabbar = document.getElementById('nb-tabbar');
    const wrapper = c.wrapperEl;
    if (!isMobileUi() || !sheet || !tabbar || !wrapper) {
      clearStageInset();
      return;
    }
    const stageRect = stageCanvasEl.getBoundingClientRect();
    const sheetTop = tabbar.getBoundingClientRect().top - sheet.offsetHeight;
    const visibleTop = stageRect.top + 54;
    const visibleBottom = Math.min(stageRect.bottom, sheetTop) - 8;
    const canvasH = wrapper.offsetHeight;
    const frameTop = stageRect.top + canvasFrameEl.offsetTop;
    const canvasTopInFrame = Math.max(0, (canvasFrameEl.clientHeight - canvasH) / 2);
    if (!canvasH || frameTop + canvasTopInFrame + canvasH <= visibleBottom) {
      clearStageInset();
      return;
    }
    const available = visibleBottom - visibleTop;
    if (available < 60) {
      clearStageInset();
      return;
    }
    const scale = Math.min(1, available / canvasH);
    const shift = visibleTop - frameTop - canvasTopInFrame * scale;
    canvasFrameEl.style.setProperty('--nb-frame-scale', scale.toFixed(4));
    canvasFrameEl.style.setProperty('--nb-frame-shift', Math.round(shift) + 'px');
  }

  function applyLayoutMode() {
    const mobile = isMobileUi();
    if (!mobile && uiState.sheet) {
      const depth = uiState.historyDepth;
      closeSheet({ fromPopState: true });
      if (depth > 0 && typeof history !== 'undefined' && history.back) {
        uiState.pendingClose = true;
        history.back();
      }
    }
    if (!isTabletUi() && sheets.dock) sheets.dock.classList.remove('is-open');
    showToolPanel(uiState.tool);
    syncQuickbar();
    scheduleStageInset();
  }

  function updateLayerBadges() {
    const count = designObjects().length;
    layerCountBadges.forEach(badge => {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    });
  }

  function syncQuickbar() {
    if (!quickbarEl) return;
    const obj = activeDesignObject();
    const show = !!obj && !cropSession && !uiState.preview;
    quickbarEl.hidden = !show;
    if (!show) return;
    const isMulti = obj.type === 'activeSelection';
    const order = designObjects();
    const index = isMulti ? -1 : designObjectIndex(obj);
    if (quickButtons.forward) quickButtons.forward.disabled = isMulti || index === -1 || index === order.length - 1;
    if (quickButtons.backward) quickButtons.backward.disabled = isMulti || index <= 0;
    if (quickButtons.duplicate) quickButtons.duplicate.disabled = isMulti;
  }

  function syncMobileSelectionUi() {
    updateLayerBadges();
    syncQuickbar();
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

  function loadSideState(key, overrideJson) {
    const state = ensureSideState(key);
    const json = prunePrintAreaObjects(overrideJson || cloneSideJson(state));
    suspendHistory = true;
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
        const storedSpace = json && json.__nb_canvas;
        objectSpace = (storedSpace && Number(storedSpace.w) > 0 && Number(storedSpace.h) > 0)
          ? { w: Number(storedSpace.w), h: Number(storedSpace.h) }
          : null;
        setMockupBgAndArea();
        designObjects().forEach(obj => {
          applyObjectUiDefaults(obj);
          ensureLayerId(obj);
          initializeTextboxCurve(obj);
        });
        c.discardActiveObject();
        captureActiveSideState();
        suspendHistory = false;
        state.historyBaseline = currentHistorySnapshot();
        updateHistoryButtons();
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
    if (obj.type === 'group') {
      return 'Csoport';
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
    const active = c.getActiveObject();
    let items = [obj];
    if (obj.type === 'activeSelection' && typeof obj.getObjects === 'function') {
      items = obj.getObjects().slice();
    }
    const wasActive = active === obj || items.indexOf(active) !== -1 || (active && active.type === 'activeSelection');
    if (wasActive) c.discardActiveObject();
    suspendHistory = true;
    items.forEach(item => c.remove(item));
    suspendHistory = false;
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncLayerList();
    syncTextControls();
    syncImageControls();
    syncPropertiesEmptyState();
    syncMobileSelectionUi();
    toast(items.length > 1 ? `${items.length} elem törölve` : 'Elem törölve', 'info', {
      action: { label: 'Visszavonás', onClick: undoHistory }
    });
  }

  function centerActiveObject() {
    const active = c.getActiveObject();
    if (!active || !isDesignObject(active)) return;
    const area = c.__nb_area || fallbackArea;
    const box = { left: area.x, top: area.y, width: area.w, height: area.h };
    applyAlign(active, 'center-h', box);
    applyAlign(active, 'center-v', box);
    if (active.type === 'activeSelection' && typeof active.getObjects === 'function') {
      active.getObjects().forEach(item => item.setCoords());
    }
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncLayerList();
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
    commitHistory();
    syncLayerList();
    syncTextControls();
    syncMobileSelectionUi();
  }

  function groupActiveSelection() {
    const active = c.getActiveObject();
    if (!active || active.type !== 'activeSelection') return;
    const objects = typeof active.getObjects === 'function' ? active.getObjects() : (active._objects || []);
    if (objects.length < 2) return;
    suspendHistory = true;
    const group = active.toGroup();
    suspendHistory = false;
    if (!group.__nb_layer_name) {
      group.__nb_layer_name = 'Csoport';
    }
    c.setActiveObject(group);
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncLayerList();
    syncTextControls();
    syncMobileSelectionUi();
  }

  function ungroupActiveGroup() {
    const active = c.getActiveObject();
    if (!active || active.type !== 'group' || !isDesignObject(active)) return;
    suspendHistory = true;
    active.toActiveSelection();
    suspendHistory = false;
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncLayerList();
    syncTextControls();
    syncMobileSelectionUi();
  }

  function syncGroupButtons() {
    const active = c.getActiveObject();
    if (groupBtn) {
      const objects = active && active.type === 'activeSelection' && typeof active.getObjects === 'function'
        ? active.getObjects()
        : [];
      groupBtn.disabled = objects.length < 2;
    }
    if (ungroupBtn) {
      ungroupBtn.disabled = !active || active.type !== 'group' || !isDesignObject(active);
    }
  }

  function applyAlign(obj, mode, box) {
    obj.setCoords();
    const rect = obj.getBoundingRect(true, true);
    switch (mode) {
      case 'left':
        obj.left += box.left - rect.left;
        break;
      case 'center-h':
        obj.left += (box.left + box.width / 2) - (rect.left + rect.width / 2);
        break;
      case 'right':
        obj.left += (box.left + box.width) - (rect.left + rect.width);
        break;
      case 'top':
        obj.top += box.top - rect.top;
        break;
      case 'center-v':
        obj.top += (box.top + box.height / 2) - (rect.top + rect.height / 2);
        break;
      case 'bottom':
        obj.top += (box.top + box.height) - (rect.top + rect.height);
        break;
      default:
        return;
    }
    obj.setCoords();
  }

  function alignSelection(mode) {
    const active = c.getActiveObject();
    if (!active || !isDesignObject(active)) return;
    if (active.type === 'activeSelection' && typeof active.getObjects === 'function') {
      const objects = active.getObjects().slice();
      if (objects.length < 2) return;
      c.discardActiveObject();
      let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
      objects.forEach(obj => {
        obj.setCoords();
        const r = obj.getBoundingRect(true, true);
        minLeft = Math.min(minLeft, r.left);
        minTop = Math.min(minTop, r.top);
        maxRight = Math.max(maxRight, r.left + r.width);
        maxBottom = Math.max(maxBottom, r.top + r.height);
      });
      const box = { left: minLeft, top: minTop, width: maxRight - minLeft, height: maxBottom - minTop };
      objects.forEach(obj => applyAlign(obj, mode, box));
      c.setActiveObject(new fabric.ActiveSelection(objects, { canvas: c }));
    } else {
      const area = c.__nb_area || fallbackArea;
      if (!area) return;
      applyAlign(active, mode, { left: area.x, top: area.y, width: area.w, height: area.h });
    }
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncLayerList();
    syncTextControls();
  }

  function distributeSelection(axis) {
    const active = c.getActiveObject();
    if (!active || active.type !== 'activeSelection' || typeof active.getObjects !== 'function') return;
    const objects = active.getObjects().slice();
    if (objects.length < 3) return;
    c.discardActiveObject();
    const items = objects.map(obj => {
      obj.setCoords();
      return { obj, rect: obj.getBoundingRect(true, true) };
    });
    if (axis === 'horizontal') {
      items.sort((a, b) => a.rect.left - b.rect.left);
      const first = items[0], last = items[items.length - 1];
      const totalSpan = (last.rect.left + last.rect.width) - first.rect.left;
      const totalWidth = items.reduce((sum, it) => sum + it.rect.width, 0);
      const gap = (totalSpan - totalWidth) / (items.length - 1);
      let cursor = first.rect.left + first.rect.width;
      for (let i = 1; i < items.length - 1; i++) {
        cursor += gap;
        const it = items[i];
        const dx = cursor - it.rect.left;
        it.obj.left += dx;
        it.obj.setCoords();
        cursor += it.rect.width;
      }
    } else {
      items.sort((a, b) => a.rect.top - b.rect.top);
      const first = items[0], last = items[items.length - 1];
      const totalSpan = (last.rect.top + last.rect.height) - first.rect.top;
      const totalHeight = items.reduce((sum, it) => sum + it.rect.height, 0);
      const gap = (totalSpan - totalHeight) / (items.length - 1);
      let cursor = first.rect.top + first.rect.height;
      for (let i = 1; i < items.length - 1; i++) {
        cursor += gap;
        const it = items[i];
        const dy = cursor - it.rect.top;
        it.obj.top += dy;
        it.obj.setCoords();
        cursor += it.rect.height;
      }
    }
    c.setActiveObject(new fabric.ActiveSelection(objects, { canvas: c }));
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncLayerList();
  }

  function syncAlignButtons() {
    const active = c.getActiveObject();
    const hasSelection = !!active && isDesignObject(active);
    const alignSection = propertySections.get('align');
    if (alignSection) alignSection.hidden = !hasSelection;
    objectAlignButtons.forEach(btn => {
      btn.disabled = !hasSelection;
    });
    const objects = active && active.type === 'activeSelection' && typeof active.getObjects === 'function'
      ? active.getObjects()
      : [];
    const canDistribute = objects.length >= 3;
    if (distributeHBtn) distributeHBtn.disabled = !canDistribute;
    if (distributeVBtn) distributeVBtn.disabled = !canDistribute;
  }

  function activeAppearanceTargets() {
    const active = c.getActiveObject();
    if (!active || !isDesignObject(active)) return [];
    if (active.type === 'activeSelection' && typeof active.getObjects === 'function') {
      return active.getObjects().filter(isDesignObject);
    }
    return [active];
  }

  function syncObjectAppearance() {
    const targets = activeAppearanceTargets();
    const hasTarget = targets.length > 0;
    const appearanceSection = propertySections.get('appearance');
    if (appearanceSection) appearanceSection.hidden = !hasTarget;
    if (opacityInput) opacityInput.disabled = !hasTarget;
    if (flipHBtn) flipHBtn.disabled = !hasTarget;
    if (flipVBtn) flipVBtn.disabled = !hasTarget;
    if (!hasTarget) {
      if (opacityInput) opacityInput.value = '100';
      if (opacityValue) opacityValue.textContent = '100%';
      setPressed(flipHBtn, false);
      setPressed(flipVBtn, false);
      if (appearanceFillGroup) appearanceFillGroup.hidden = true;
      if (shapeFillInput) shapeFillInput.disabled = true;
      if (patternUploadBtn) patternUploadBtn.disabled = true;
      if (patternClearBtn) { patternClearBtn.disabled = true; patternClearBtn.hidden = true; }
      if (patternScaleWrap) patternScaleWrap.hidden = true;
      return;
    }
    const primary = targets[0];
    const opacityPct = Math.round((Number.isFinite(primary.opacity) ? primary.opacity : 1) * 100);
    if (opacityInput) opacityInput.value = opacityPct;
    if (opacityValue) opacityValue.textContent = opacityPct + '%';
    setPressed(flipHBtn, !!primary.flipX);
    setPressed(flipVBtn, !!primary.flipY);
    const allShapes = targets.every(isRecolorableShape);
    if (appearanceFillGroup) appearanceFillGroup.hidden = !allShapes;
    if (shapeFillInput) {
      shapeFillInput.disabled = !allShapes;
      if (patternUploadBtn) patternUploadBtn.disabled = !allShapes;
      const raw = allShapes ? primary[shapeColorProp(primary)] : null;
      const isPattern = !!raw && raw instanceof fabric.Pattern;
      if (allShapes && !isPattern) {
        shapeFillInput.value = toHexColor(typeof raw === 'string' && raw ? raw : '#111827');
      }
      if (patternClearBtn) {
        patternClearBtn.hidden = !isPattern;
        patternClearBtn.disabled = !isPattern;
      }
      if (patternScaleWrap) patternScaleWrap.hidden = !isPattern;
      if (isPattern && patternScaleInput) {
        const scale = Array.isArray(raw.patternTransform) && raw.patternTransform[0] ? raw.patternTransform[0] : 1;
        const pct = Math.round(scale * 100);
        patternScaleInput.value = pct;
        if (patternScaleValue) patternScaleValue.textContent = pct + '%';
      }
    }
  }

  function syncPropertiesEmptyState() {
    if (!propertiesEmptyEl) return;
    const allHidden = ['text', 'image', 'align', 'appearance'].every(key => {
      const section = propertySections.get(key);
      return !section || section.hidden;
    });
    propertiesEmptyEl.hidden = !allHidden;
  }

  function iconMarkup(name, extraClass) {
    return `<svg class="nb-icon${extraClass ? ' ' + extraClass : ''}" aria-hidden="true" focusable="false"><use href="#nb-i-${name}"/></svg>`;
  }

  function layerIconName(obj) {
    if (!obj) return 'shapes';
    if (obj.type === 'textbox') return 'text';
    if (obj.type === 'image') return 'image';
    if (obj.type === 'group') return obj.__nb_layer_name === 'QR kód' ? 'qr' : 'layers';
    return 'shapes';
  }

  function syncLayerList() {
    syncGroupButtons();
    syncAlignButtons();
    syncObjectAppearance();
    updateLayerBadges();
    updateSideUiState();
    if (!layerListEl) return;
    const objects = designObjects();
    layerListEl.innerHTML = '';
    if (!objects.length) {
      const empty = document.createElement('div');
      empty.className = 'nb-layer-empty';
      empty.textContent = 'Ezen az oldalon még nincs elem.';
      layerListEl.appendChild(empty);
      syncMobileSelectionUi();
      return;
    }
    const active = c.getActiveObject();
    const selected = active && active.type === 'activeSelection' && typeof active.getObjects === 'function'
      ? active.getObjects()
      : (active ? [active] : []);
    const topFirst = objects.slice().reverse();
    topFirst.forEach((obj, idx) => {
      ensureLayerId(obj);
      const item = document.createElement('div');
      item.className = 'nb-layer-item';
      if (selected.indexOf(obj) !== -1) item.classList.add('is-active');
      if (obj.visible === false) item.classList.add('is-hidden');
      item.dataset.layerId = obj.__nb_layer_id;

      const info = document.createElement('div');
      info.className = 'nb-layer-info';
      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.innerHTML = iconMarkup(layerIconName(obj), 'nb-icon--sm');
      const nameEl = document.createElement('span');
      nameEl.textContent = layerLabel(obj);
      selectBtn.appendChild(nameEl);
      selectBtn.addEventListener('click', () => {
        if (obj.visible === false) {
          obj.visible = true;
          markDesignDirty();
          commitHistory();
        }
        layerSelectInProgress = true;
        try {
          c.setActiveObject(obj);
        } finally {
          layerSelectInProgress = false;
        }
        c.requestRenderAll();
        syncTextControls();
        syncImageControls();
        syncLayerList();
        syncPropertiesEmptyState();
      });
      info.appendChild(selectBtn);
      item.appendChild(info);

      const controls = document.createElement('div');
      controls.className = 'nb-layer-controls';
      const makeControl = (icon, label, handler, disabled, extraClass) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', label);
        btn.title = label;
        btn.innerHTML = iconMarkup(icon, 'nb-icon--sm');
        if (extraClass) btn.className = extraClass;
        btn.disabled = !!disabled;
        btn.addEventListener('click', handler);
        controls.appendChild(btn);
        return btn;
      };
      makeControl(obj.visible === false ? 'eye-off' : 'eye', obj.visible === false ? 'Megjelenítés' : 'Elrejtés', () => {
        obj.visible = obj.visible === false;
        if (obj.visible === false && c.getActiveObject() === obj) c.discardActiveObject();
        c.requestRenderAll();
        markDesignDirty();
        commitHistory();
        syncLayerList();
      });
      makeControl('arrow-up', 'Feljebb', () => moveLayer(obj, 1), idx === 0);
      makeControl('arrow-down', 'Lejjebb', () => moveLayer(obj, -1), idx === topFirst.length - 1);
      makeControl('trash', 'Törlés', () => removeActiveObject(obj), false, 'nb-layer-delete');
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
    if (!isDesignObject(obj) || obj.group) return;
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

  function nudgeActiveObject(dx, dy) {
    const obj = activeDesignObject();
    if (!obj) return false;
    obj.left += dx;
    obj.top += dy;
    obj.setCoords();
    keepObjectInside(obj, { fit: false });
    markDesignDirty();
    syncLayerList();
    scheduleHistoryCommit();
    return true;
  }

  const SNAP_THRESHOLD = 6;

  function collectSnapTargets(excludeObj) {
    const area = c.__nb_area || fallbackArea;
    const vertical = [];
    const horizontal = [];
    if (area) {
      vertical.push(area.x, area.x + area.w / 2, area.x + area.w);
      horizontal.push(area.y, area.y + area.h / 2, area.y + area.h);
    }
    const excludedChildren = excludeObj && excludeObj.type === 'activeSelection' && typeof excludeObj.getObjects === 'function'
      ? excludeObj.getObjects()
      : [];
    designObjects().forEach(obj => {
      if (obj === excludeObj || excludedChildren.indexOf(obj) !== -1) return;
      obj.setCoords();
      const r = obj.getBoundingRect(true, true);
      vertical.push(r.left, r.left + r.width / 2, r.left + r.width);
      horizontal.push(r.top, r.top + r.height / 2, r.top + r.height);
    });
    return { vertical, horizontal };
  }

  function clearSnapGuides() {
    if (!c.contextTop) return;
    c.clearContext(c.contextTop);
  }

  function drawSnapGuides(xLine, yLine) {
    if (!c.contextTop) return;
    const ctx = c.contextTop;
    c.clearContext(ctx);
    if (xLine == null && yLine == null) return;
    const vpt = c.viewportTransform || [1, 0, 0, 1, 0, 0];
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    if (xLine != null) {
      const sx = xLine * vpt[0] + vpt[4];
      ctx.beginPath();
      ctx.moveTo(sx + 0.5, 0);
      ctx.lineTo(sx + 0.5, c.height);
      ctx.stroke();
    }
    if (yLine != null) {
      const sy = yLine * vpt[3] + vpt[5];
      ctx.beginPath();
      ctx.moveTo(0, sy + 0.5);
      ctx.lineTo(c.width, sy + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function applySnapGuides(e) {
    const target = e && e.target;
    if (!target || !isDesignObject(target) || target.group) {
      clearSnapGuides();
      return;
    }
    target.setCoords();
    const rect = target.getBoundingRect(true, true);
    const targets = collectSnapTargets(target);

    let bestX = null;
    [rect.left, rect.left + rect.width / 2, rect.left + rect.width].forEach(value => {
      targets.vertical.forEach(v => {
        const delta = v - value;
        if (Math.abs(delta) <= SNAP_THRESHOLD && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
          bestX = { delta, line: v };
        }
      });
    });

    let bestY = null;
    [rect.top, rect.top + rect.height / 2, rect.top + rect.height].forEach(value => {
      targets.horizontal.forEach(h => {
        const delta = h - value;
        if (Math.abs(delta) <= SNAP_THRESHOLD && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
          bestY = { delta, line: h };
        }
      });
    });

    if (bestX) target.left += bestX.delta;
    if (bestY) target.top += bestY.delta;
    if (bestX || bestY) target.setCoords();

    drawSnapGuides(bestX ? bestX.line : null, bestY ? bestY.line : null);
  }

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ZOOM_STEP = 0.25;
  let isPanning = false;
  let panLastX = 0;
  let panLastY = 0;

  function clampZoom(z) {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  }

  function clampPan() {
    const zoom = c.getZoom();
    const vpt = c.viewportTransform;
    if (zoom <= 1) {
      vpt[4] = 0;
      vpt[5] = 0;
    } else {
      const maxPanX = c.width * zoom - c.width;
      const maxPanY = c.height * zoom - c.height;
      vpt[4] = Math.min(0, Math.max(vpt[4], -maxPanX));
      vpt[5] = Math.min(0, Math.max(vpt[5], -maxPanY));
    }
    c.setViewportTransform(vpt);
  }

  function syncZoomUi() {
    const zoom = c.getZoom();
    if (zoomLevelEl) zoomLevelEl.textContent = Math.round(zoom * 100) + '%';
    if (zoomOutBtn) zoomOutBtn.disabled = zoom <= ZOOM_MIN + 0.001;
    if (zoomInBtn) zoomInBtn.disabled = zoom >= ZOOM_MAX - 0.001;
  }

  function setZoomLevel(newZoom) {
    const zoom = clampZoom(newZoom);
    c.zoomToPoint(new fabric.Point(c.width / 2, c.height / 2), zoom);
    clampPan();
    c.requestRenderAll();
    syncZoomUi();
  }

  function resetZoom() {
    isPanning = false;
    c.selection = !uiState.preview;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    c.requestRenderAll();
    syncZoomUi();
  }

  function withResetViewport(fn) {
    const previousVpt = c.viewportTransform ? c.viewportTransform.slice() : [1, 0, 0, 1, 0, 0];
    c.viewportTransform = [1, 0, 0, 1, 0, 0];
    if (typeof c.calcViewportBoundaries === 'function') c.calcViewportBoundaries();
    try {
      return fn();
    } finally {
      c.viewportTransform = previousVpt;
      if (typeof c.calcViewportBoundaries === 'function') c.calcViewportBoundaries();
    }
  }

  c.on('mouse:wheel', opt => {
    const evt = opt && opt.e;
    if (!evt || (!evt.ctrlKey && !evt.metaKey)) return;
    evt.preventDefault();
    evt.stopPropagation();
    const pointer = c.getPointer(evt, true);
    const zoom = clampZoom(c.getZoom() * (0.999 ** evt.deltaY));
    c.zoomToPoint(new fabric.Point(pointer.x, pointer.y), zoom);
    clampPan();
    syncZoomUi();
  });

  c.on('mouse:down', opt => {
    const evt = opt && opt.e;
    if (!evt || evt.button !== 1) return;
    evt.preventDefault();
    isPanning = true;
    c.selection = false;
    panLastX = evt.clientX;
    panLastY = evt.clientY;
  });
  c.on('mouse:move', opt => {
    if (!isPanning) return;
    const evt = opt && opt.e;
    if (!evt) return;
    const vpt = c.viewportTransform;
    vpt[4] += evt.clientX - panLastX;
    vpt[5] += evt.clientY - panLastY;
    panLastX = evt.clientX;
    panLastY = evt.clientY;
    clampPan();
    c.requestRenderAll();
  });
  c.on('mouse:up', () => {
    if (!isPanning) return;
    isPanning = false;
    c.selection = !uiState.preview;
  });

  const touchGesture = { active: false, pointers: new Map(), lastDist: 0, lastMidX: 0, lastMidY: 0 };

  function touchPointToCanvas(t) {
    const bounds = c.upperCanvasEl.getBoundingClientRect();
    // Logical canvas units (not retina backstore pixels) so pinch zoom centres correctly.
    const scaleX = bounds.width ? c.getWidth() / bounds.width : 1;
    const scaleY = bounds.height ? c.getHeight() / bounds.height : 1;
    return { x: (t.clientX - bounds.left) * scaleX, y: (t.clientY - bounds.top) * scaleY };
  }

  function twoTouchMetrics() {
    const pts = Array.from(touchGesture.pointers.values()).map(touchPointToCanvas);
    return {
      dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
      midX: (pts[0].x + pts[1].x) / 2,
      midY: (pts[0].y + pts[1].y) / 2
    };
  }

  c.upperCanvasEl.addEventListener('touchstart', e => {
    Array.from(e.changedTouches).forEach(t => touchGesture.pointers.set(t.identifier, t));
    if (touchGesture.pointers.size === 2) {
      touchGesture.active = true;
      c._currentTransform = null;
      c.upperCanvasEl.style.touchAction = 'none';
      const m = twoTouchMetrics();
      touchGesture.lastDist = m.dist;
      touchGesture.lastMidX = m.midX;
      touchGesture.lastMidY = m.midY;
    }
  }, { passive: false });

  c.upperCanvasEl.addEventListener('touchmove', e => {
    if (!touchGesture.active || touchGesture.pointers.size !== 2) return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      if (touchGesture.pointers.has(t.identifier)) touchGesture.pointers.set(t.identifier, t);
    });
    const m = twoTouchMetrics();
    if (touchGesture.lastDist > 0 && m.dist > 0) {
      const zoom = clampZoom(c.getZoom() * (m.dist / touchGesture.lastDist));
      c.zoomToPoint(new fabric.Point(touchGesture.lastMidX, touchGesture.lastMidY), zoom);
    }
    const vpt = c.viewportTransform;
    vpt[4] += m.midX - touchGesture.lastMidX;
    vpt[5] += m.midY - touchGesture.lastMidY;
    clampPan();
    syncZoomUi();
    touchGesture.lastDist = m.dist;
    touchGesture.lastMidX = m.midX;
    touchGesture.lastMidY = m.midY;
  }, { passive: false });

  function endTouchGesture(e) {
    Array.from(e.changedTouches).forEach(t => touchGesture.pointers.delete(t.identifier));
    if (touchGesture.pointers.size < 2) {
      touchGesture.active = false;
    }
    if (touchGesture.pointers.size === 0) {
      c.upperCanvasEl.style.touchAction = 'manipulation';
    }
  }
  c.upperCanvasEl.addEventListener('touchend', endTouchGesture);
  c.upperCanvasEl.addEventListener('touchcancel', endTouchGesture);

  function scheduleImagePregen() {
    if (imagePregeneTimer) clearTimeout(imagePregeneTimer);
    imageCache = null;
    imagePregeneTimer = setTimeout(() => {
      imagePregeneTimer = null;
      if (!hasCompleteSelection() || saving || activeSideKey !== 'front') return;
      const state = ensureSideState('front');
      if (!state || !state.hasContent) return;
      try {
        const preview = withResetViewport(() => c.toDataURL({ format: 'png', multiplier: 1, left: 0, top: 0 }));
        const printData = exportPrintImage();
        imageCache = {
          frontData: {
            key: 'front',
            hasContent: state.hasContent,
            preview,
            printData,
            json: cloneSideJson(state),
            objectCount: state.objectCount || 0
          }
        };
      } catch(e) { imageCache = null; }
    }, 2000);
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
    scheduleImagePregen();
    scheduleDraftSave();
  }

  function setMockupBgAndArea() {
    resetZoom();
    const sel = currentSelection();
    const mockupsBySide = sel.mockups || { front: null, back: null };
    const mk = activeSideKey === 'back'
      ? (mockupsBySide.back || mockupsBySide.front || sel.mockup)
      : (mockupsBySide.front || mockupsBySide.back || sel.mockup);

    c.getObjects().slice().forEach(obj => { if (obj.__nb_bg) c.remove(obj); });
    c.getObjects().slice().forEach(obj => { if (obj.__nb_area) c.remove(obj); });

    const configuredAreas = mk && Array.isArray(mk.areas) ? mk.areas : [];
    const roleArea = configuredAreas.find(candidate => candidate && candidate.role === activeSideKey);
    const firstArea = configuredAreas.find(candidate => candidate && typeof candidate === 'object');
    const areaRaw = roleArea
      ? Object.assign({}, roleArea)
      : (firstArea ? Object.assign({}, firstArea) : (mk && mk.area ? Object.assign({}, mk.area) : Object.assign({}, fallbackArea)));
    const refSize = referenceSizeForMockup(mk, areaRaw);
    const appliedSize = applyCanvasSize(refSize);
    rescaleObjectsToCanvas();

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
    if (uiState.preview) printArea.visible = false;
    c.add(printArea);
    c.__nb_area = area;
    c.__nb_area_physical = {
      width_mm: positiveNumberOr(areaRaw.width_mm, PRINT_AREA_WIDTH_MM),
      height_mm: positiveNumberOr(areaRaw.height_mm, PRINT_AREA_HEIGHT_MM),
      dpi: positiveNumberOr(areaRaw.dpi, 300),
      id: areaRaw.id || '',
      role: areaRaw.role || activeSideKey
    };
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
    clampTextboxToArea(obj);
    obj.dirty = true;
    obj.setCoords();
    c.requestRenderAll();
    markDesignDirty();
    scheduleHistoryCommit();
  }

  function activeTextbox() {
    const obj = c.getActiveObject();
    return (obj && obj.type === 'textbox') ? obj : null;
  }

  function activeImage() {
    const obj = c.getActiveObject();
    return (obj && obj.type === 'image') ? obj : null;
  }

  function findImageFilter(obj, type) {
    return (obj.filters || []).find(f => f && f.type === type) || null;
  }

  function setImageFilter(obj, type, filterInstance) {
    const existing = Array.isArray(obj.filters) ? obj.filters : [];
    obj.filters = existing.filter(f => !(f && f.type === type));
    if (filterInstance) obj.filters.push(filterInstance);
  }

  function applyToActiveImage(cb) {
    const obj = activeImage();
    if (!obj) return;
    cb(obj);
    obj.applyFilters();
    c.requestRenderAll();
    markDesignDirty();
    scheduleHistoryCommit();
  }

  function isVectorImage(img) {
    const src = img && typeof img.getSrc === 'function' ? (img.getSrc() || '') : '';
    return /^data:image\/svg\+xml/i.test(src) || /\.svg(?:[?#]|$)/i.test(src);
  }

  function imageEffectiveDpi(img) {
    if (!img || img.type !== 'image') return null;
    // Vector images stay sharp at any print size.
    if (isVectorImage(img)) return Infinity;
    const area = c.__nb_area || fallbackArea;
    if (!area || !area.w || !area.h) return null;
    const nativeW = img.width || 0;
    const nativeH = img.height || 0;
    if (!nativeW || !nativeH) return null;
    const displayedW = img.getScaledWidth();
    const displayedH = img.getScaledHeight();
    if (!displayedW || !displayedH) return null;
    const physical = c.__nb_area_physical || {};
    const widthInches = (displayedW / area.w) * positiveNumberOr(physical.width_mm, PRINT_AREA_WIDTH_MM) / 25.4;
    const heightInches = (displayedH / area.h) * positiveNumberOr(physical.height_mm, PRINT_AREA_HEIGHT_MM) / 25.4;
    const dpiX = widthInches > 0 ? nativeW / widthInches : Infinity;
    const dpiY = heightInches > 0 ? nativeH / heightInches : Infinity;
    return Math.min(dpiX, dpiY);
  }

  function updateLowResWarning() {
    if (!imageLowResWarningEl) return;
    const img = activeImage();
    const dpi = img ? imageEffectiveDpi(img) : null;
    imageLowResWarningEl.hidden = !(Number.isFinite(dpi) && dpi < MIN_PRINT_DPI);
  }

  function syncImageControls() {
    updateLowResWarning();
    const img = activeImage();
    const hasImage = !!img;
    const cropping = !!cropSession;
    const imageSection = propertySections.get('image');
    // While cropping, the crop frame is the active object; keep the image tools
    // (and the Apply / Cancel buttons) visible.
    if (imageSection) imageSection.hidden = !hasImage && !cropping;
    if (replaceImageBtn) replaceImageBtn.disabled = !hasImage || cropping;
    if (cropImageBtn) cropImageBtn.disabled = !hasImage || cropping;
    [filterGrayscaleToggle, filterSepiaToggle, filterBrightnessInput, filterContrastInput].forEach(ctrl => {
      if (ctrl) ctrl.disabled = !hasImage || cropping;
    });
    if (!hasImage) {
      setPressed(filterGrayscaleToggle, false);
      setPressed(filterSepiaToggle, false);
      if (filterBrightnessInput) filterBrightnessInput.value = '0';
      if (filterBrightnessValue) filterBrightnessValue.textContent = '0';
      if (filterContrastInput) filterContrastInput.value = '0';
      if (filterContrastValue) filterContrastValue.textContent = '0';
      return;
    }
    setPressed(filterGrayscaleToggle, !!findImageFilter(img, 'Grayscale'));
    setPressed(filterSepiaToggle, !!findImageFilter(img, 'Sepia'));
    const brightnessFilter = findImageFilter(img, 'Brightness');
    const brightnessPct = brightnessFilter ? Math.round(brightnessFilter.brightness * 100) : 0;
    if (filterBrightnessInput) filterBrightnessInput.value = brightnessPct;
    if (filterBrightnessValue) filterBrightnessValue.textContent = brightnessPct;
    const contrastFilter = findImageFilter(img, 'Contrast');
    const contrastPct = contrastFilter ? Math.round(contrastFilter.contrast * 100) : 0;
    if (filterContrastInput) filterContrastInput.value = contrastPct;
    if (filterContrastValue) filterContrastValue.textContent = contrastPct;
  }

  let cropSession = null;

  function cropAxisToFull(boxStart, cropStart, cropLength, nativeLength, scale, flipped) {
    return flipped
      ? boxStart + scale * (cropStart + cropLength - nativeLength)
      : boxStart - cropStart * scale;
  }

  function cropAxisFromBox(boxStart, boxLength, fullStart, nativeLength, scale, flipped) {
    const length = boxLength / scale;
    const start = flipped
      ? nativeLength - (boxStart + boxLength - fullStart) / scale
      : (boxStart - fullStart) / scale;
    return { start, length };
  }

  function clampCropOverlay() {
    if (!cropSession) return;
    const MIN_CROP_SIZE = 20;
    const { overlay, bounds } = cropSession;
    overlay.setCoords();
    if (overlay.width * overlay.scaleX < MIN_CROP_SIZE) overlay.scaleX = MIN_CROP_SIZE / overlay.width;
    if (overlay.height * overlay.scaleY < MIN_CROP_SIZE) overlay.scaleY = MIN_CROP_SIZE / overlay.height;
    let w = overlay.width * overlay.scaleX;
    let h = overlay.height * overlay.scaleY;
    if (w > bounds.width) { overlay.scaleX = bounds.width / overlay.width; w = bounds.width; }
    if (h > bounds.height) { overlay.scaleY = bounds.height / overlay.height; h = bounds.height; }
    if (overlay.left < bounds.left) overlay.left = bounds.left;
    if (overlay.top < bounds.top) overlay.top = bounds.top;
    if (overlay.left + w > bounds.left + bounds.width) overlay.left = bounds.left + bounds.width - w;
    if (overlay.top + h > bounds.top + bounds.height) overlay.top = bounds.top + bounds.height - h;
    overlay.setCoords();
    c.requestRenderAll();
  }

  function updateCropToolbarVisibility() {
    if (cropToolbarEl) cropToolbarEl.hidden = !cropSession;
  }

  function startImageCrop() {
    if (cropSession) return;
    const img = activeImage();
    if (!img) return;
    const orig = img.getOriginalSize();
    if (!orig || !orig.width || !orig.height) return;

    const original = {
      cropX: img.cropX || 0,
      cropY: img.cropY || 0,
      width: img.width,
      height: img.height,
      left: img.left,
      top: img.top,
      angle: img.angle || 0,
      originX: img.originX,
      originY: img.originY,
      selectable: img.selectable,
      evented: img.evented,
      opacity: img.opacity
    };

    const cropDisplayW = original.width * img.scaleX;
    const cropDisplayH = original.height * img.scaleY;

    const center = img.getCenterPoint();
    img.angle = 0;
    img.setPositionByOrigin(center, 'center', 'center');
    const topLeftNow = img.getPointByOrigin('left', 'top');
    img.originX = 'left';
    img.originY = 'top';
    img.left = topLeftNow.x;
    img.top = topLeftNow.y;

    const fullLeft = cropAxisToFull(img.left, original.cropX, original.width, orig.width, img.scaleX, !!img.flipX);
    const fullTop = cropAxisToFull(img.top, original.cropY, original.height, orig.height, img.scaleY, !!img.flipY);
    const overlayLeft = img.left;
    const overlayTop = img.top;

    img.set({
      left: fullLeft,
      top: fullTop,
      cropX: 0,
      cropY: 0,
      width: orig.width,
      height: orig.height,
      selectable: false,
      evented: false,
      opacity: 0.45
    });
    img.setCoords();

    const overlay = new fabric.Rect({
      left: overlayLeft,
      top: overlayTop,
      width: cropDisplayW,
      height: cropDisplayH,
      originX: 'left',
      originY: 'top',
      angle: 0,
      fill: 'rgba(37,99,235,0.12)',
      stroke: '#2563eb',
      strokeWidth: 2,
      strokeDashArray: [6, 6],
      strokeUniform: true,
      cornerStyle: 'circle',
      transparentCorners: false,
      lockRotation: true,
      lockScalingFlip: true,
      hasRotatingPoint: false,
      __nb_crop_overlay: true,
      excludeFromExport: true
    });
    overlay.setControlsVisibility({ mtr: false });
    overlay.on('moving', clampCropOverlay);
    overlay.on('scaling', clampCropOverlay);

    cropSession = {
      img,
      overlay,
      original,
      bounds: { left: fullLeft, top: fullTop, width: orig.width * img.scaleX, height: orig.height * img.scaleY }
    };

    c.add(overlay);
    c.setActiveObject(overlay);
    c.requestRenderAll();
    updateCropToolbarVisibility();
    syncImageControls();
    syncPropertiesEmptyState();
    syncQuickbar();
    if (isMobileUi()) openInspector('properties');
  }

  function endImageCrop(apply) {
    if (!cropSession) return;
    const { img, overlay, original, bounds } = cropSession;
    cropSession = null;
    overlay.off('moving', clampCropOverlay);
    overlay.off('scaling', clampCropOverlay);

    if (apply) {
      overlay.setCoords();
      const orig = img.getOriginalSize();
      const xInfo = cropAxisFromBox(overlay.left, overlay.width * overlay.scaleX, bounds.left, orig.width, img.scaleX, !!img.flipX);
      const yInfo = cropAxisFromBox(overlay.top, overlay.height * overlay.scaleY, bounds.top, orig.height, img.scaleY, !!img.flipY);
      const cropW = Math.max(1, Math.min(Math.round(xInfo.length), orig.width));
      const cropH = Math.max(1, Math.min(Math.round(yInfo.length), orig.height));
      const cropX = Math.max(0, Math.min(Math.round(xInfo.start), orig.width - cropW));
      const cropY = Math.max(0, Math.min(Math.round(yInfo.start), orig.height - cropH));

      img.set({ cropX, cropY, width: cropW, height: cropH, left: overlay.left, top: overlay.top });
      const newCenter = img.getCenterPoint();
      img.originX = original.originX;
      img.originY = original.originY;
      img.angle = original.angle;
      img.setPositionByOrigin(newCenter, 'center', 'center');
      img.set({ selectable: original.selectable, evented: original.evented, opacity: original.opacity });
      img.setCoords();

      c.remove(overlay);
      keepObjectInside(img);
      c.setActiveObject(img);
      c.requestRenderAll();
      markDesignDirty();
      commitHistory();
    } else {
      img.set({
        cropX: original.cropX,
        cropY: original.cropY,
        width: original.width,
        height: original.height,
        left: original.left,
        top: original.top,
        angle: original.angle,
        originX: original.originX,
        originY: original.originY,
        selectable: original.selectable,
        evented: original.evented,
        opacity: original.opacity
      });
      img.setCoords();
      c.remove(overlay);
      c.setActiveObject(img);
      c.requestRenderAll();
    }

    updateCropToolbarVisibility();
    syncLayerList();
    syncImageControls();
  }

  function applyImageCrop() { endImageCrop(true); }
  function cancelImageCrop() { endImageCrop(false); }

  function maybeAutoApplyCrop(nextActive) {
    if (cropSession && nextActive !== cropSession.overlay) {
      applyImageCrop();
    }
  }

  const RECOLORABLE_SHAPE_TYPES = ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path', 'line'];

  function isRecolorableShape(obj) {
    return !!obj && RECOLORABLE_SHAPE_TYPES.indexOf(obj.type) !== -1;
  }

  function shapeColorProp(obj) {
    return obj && obj.type === 'line' ? 'stroke' : 'fill';
  }

  function buildStarPoints(spikes, outerRadius, innerRadius) {
    const points = [];
    const step = Math.PI / spikes;
    let rot = -Math.PI / 2;
    for (let i = 0; i < spikes; i++) {
      points.push({ x: Math.cos(rot) * outerRadius, y: Math.sin(rot) * outerRadius });
      rot += step;
      points.push({ x: Math.cos(rot) * innerRadius, y: Math.sin(rot) * innerRadius });
      rot += step;
    }
    return points;
  }

  const HEART_PATH_D = 'M 50 90 L 20 60 C 0 40 0 10 25 10 C 40 10 50 25 50 25 C 50 25 60 10 75 10 C 100 10 100 40 80 60 Z';

  function addShapeToCanvas(kind) {
    const a = c.__nb_area || fallbackArea;
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    const size = Math.max(40, Math.min(a.w, a.h) * 0.4);
    const common = {
      left: cx,
      top: cy,
      originX: 'center',
      originY: 'center',
      fill: '#111827',
      cornerStyle: 'circle',
      transparentCorners: false,
      lockScalingFlip: true
    };
    let shape = null;
    switch (kind) {
      case 'rect':
        shape = new fabric.Rect(Object.assign({}, common, { width: size, height: size * 0.7 }));
        shape.__nb_layer_name = 'Téglalap';
        break;
      case 'circle':
        shape = new fabric.Circle(Object.assign({}, common, { radius: size / 2 }));
        shape.__nb_layer_name = 'Kör';
        break;
      case 'triangle':
        shape = new fabric.Triangle(Object.assign({}, common, { width: size, height: size }));
        shape.__nb_layer_name = 'Háromszög';
        break;
      case 'line':
        shape = new fabric.Line([-size / 2, 0, size / 2, 0], Object.assign({}, common, {
          fill: '',
          stroke: '#111827',
          strokeWidth: Math.max(4, Math.round(size * 0.06))
        }));
        shape.__nb_layer_name = 'Vonal';
        break;
      case 'star':
        shape = new fabric.Polygon(buildStarPoints(5, size / 2, size / 4), Object.assign({}, common));
        shape.__nb_layer_name = 'Csillag';
        break;
      case 'heart':
        shape = new fabric.Path(HEART_PATH_D, Object.assign({}, common));
        shape.scaleToWidth(size);
        shape.__nb_layer_name = 'Szív';
        break;
      default:
        return;
    }
    if (!shape) return;
    c.add(shape).setActiveObject(shape);
    keepObjectInside(shape);
    c.requestRenderAll();
    syncLayerList();
  }

  function qrLibAvailable() {
    return typeof window.qrcode === 'function';
  }

  function buildQrSvgMarkup(text) {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const cellSize = moduleCount > 0 ? Math.max(4, Math.round(220 / moduleCount)) : 6;
    return qr.createSvgTag({ cellSize: cellSize, margin: cellSize * 2 });
  }

  function setQrHint(message) {
    if (!qrHintEl) return;
    if (message) {
      qrHintEl.textContent = message;
      qrHintEl.hidden = false;
    } else {
      qrHintEl.hidden = true;
    }
  }

  function addQrToCanvas(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    if (!qrLibAvailable()) {
      setQrHint('A QR kód generátor jelenleg nem érhető el.');
      return;
    }
    let svg;
    try {
      svg = buildQrSvgMarkup(trimmed);
    } catch (err) {
      setQrHint('Ehhez a szöveghez nem hozható létre QR kód.');
      return;
    }
    fabric.loadSVGFromString(svg, (objects, options) => {
      const group = fabric.util.groupSVGElements(objects, options);
      if (!group) return;
      const a = c.__nb_area || fallbackArea;
      const size = Math.max(60, Math.min(a.w, a.h) * 0.45);
      if (typeof group.scaleToWidth === 'function') group.scaleToWidth(size);
      group.set({
        left: a.x + a.w / 2,
        top: a.y + a.h / 2,
        originX: 'center',
        originY: 'center',
        cornerStyle: 'circle',
        transparentCorners: false,
        lockScalingFlip: true
      });
      group.__nb_layer_name = 'QR kód';
      c.add(group).setActiveObject(group);
      keepObjectInside(group);
      c.requestRenderAll();
      setQrHint(null);
      syncLayerList();
    });
  }

  function applyPatternFillToTargets(pattern) {
    const targets = activeAppearanceTargets().filter(isRecolorableShape);
    if (!targets.length) return;
    targets.forEach(obj => {
      const prop = shapeColorProp(obj);
      const current = obj[prop];
      if (typeof current === 'string' && current) {
        obj.__nb_pre_pattern_fill = current;
      }
      obj.set(prop, pattern);
    });
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncObjectAppearance();
  }

  function clearPatternFillFromTargets() {
    const targets = activeAppearanceTargets().filter(isRecolorableShape);
    if (!targets.length) return;
    targets.forEach(obj => {
      const prop = shapeColorProp(obj);
      if (!(obj[prop] instanceof fabric.Pattern)) return;
      obj.set(prop, obj.__nb_pre_pattern_fill || '#111827');
    });
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncObjectAppearance();
  }

  function updatePatternScaleForTargets(scale) {
    const targets = activeAppearanceTargets().filter(isRecolorableShape);
    let changed = false;
    targets.forEach(obj => {
      const fill = obj[shapeColorProp(obj)];
      if (!(fill instanceof fabric.Pattern)) return;
      fill.patternTransform = [scale, 0, 0, scale, 0, 0];
      changed = true;
    });
    if (!changed) return;
    c.requestRenderAll();
    markDesignDirty();
    scheduleHistoryCommit();
  }

  function loadPatternFromFile(file) {
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt && evt.target && typeof evt.target.result === 'string' ? evt.target.result : '';
      if (!dataUrl) return;
      new fabric.Pattern({
        source: dataUrl,
        repeat: 'repeat',
        patternTransform: [1, 0, 0, 1, 0, 0]
      }, (pattern, isError) => {
        if (isError) return;
        applyPatternFillToTargets(pattern);
      });
    };
    reader.onerror = () => {
      console.error('Nem sikerült beolvasni a minta képfájlt.');
    };
    reader.readAsDataURL(file);
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

  function formatLetterSpacing(value) {
    const num = Number.isFinite(value) ? value : 0;
    return `${Math.round(num)}`;
  }

  function formatShadowBlur(value) {
    const num = Number.isFinite(value) ? value : 0;
    return num > 0 ? `${Math.round(num)} px` : 'Nincs';
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
  const TEXT_CURVE_MAX_WORDS = 6;

  function textTooLongForCurve(textbox) {
    if (!textbox || typeof textbox.text !== 'string') return false;
    const words = textbox.text.split(/\s+/).filter(Boolean);
    return words.length > TEXT_CURVE_MAX_WORDS;
  }

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
    // Above TEXT_CURVE_MAX_WORDS words, flattening to one line (below) would shrink the font
    // to near-illegibility to fit the original width. Treat curve as inactive instead - the
    // user's enabled/amount preference stays stored, so shortening the text back under the
    // limit re-curves it automatically without needing to re-toggle anything.
    const curveActive = cfg.enabled && Math.abs(cfg.amount) >= 1 && hasText && !textTooLongForCurve(textbox);
    // True multi-line curved text (each line on its own concentric arc) isn't implemented -
    // the per-character deltaY stacking further below only works for fabric's normal top-down
    // text flow, but path-mode positions every character along the SAME curve regardless of
    // line index, so multiple lines rendered on top of one another, illegibly overlapping.
    // Flattening to a single line while the curve is active (and restoring the original
    // multi-line text once it's turned off) keeps curved text readable instead.
    if (curveActive) {
      collapseTextboxMultilineForCurve(textbox);
      textValue = typeof textbox.text === 'string' ? textbox.text : '';
    } else {
      restoreTextboxMultilineFromCurve(textbox);
      textValue = typeof textbox.text === 'string' ? textbox.text : '';
    }

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
    // Bend the path symmetrically around y=0 (peak at -amplitude/2, endpoints at +amplitude/2)
    // instead of 0..-amplitude. Combined with the height correction below (which produces a
    // box centered on local y=0 too), this keeps the rendered glyphs roughly centered in the
    // control box instead of hugging one edge with dead space on the other side.
    const halfAmplitude = amplitude / 2;
    const curvePath = new fabric.Path(`M ${-width / 2} ${halfAmplitude} Q 0 ${-halfAmplitude} ${width / 2} ${halfAmplitude}`, {
      visible: false,
      evented: false
    });
    curvePath.pathOffset = new fabric.Point(0, 0);
    if (!curvePath.segmentsInfo && fabric.util && typeof fabric.util.getPathSegmentsInfo === 'function') {
      curvePath.segmentsInfo = fabric.util.getPathSegmentsInfo(curvePath.path);
    }
    // Capture the visual center before mutating path/height so the object doesn't jump on
    // screen once its height is corrected below (see setPositionByOrigin call further down).
    const preCurveCenter = typeof textbox.getCenterPoint === 'function' ? textbox.getCenterPoint() : null;
    // pathSide:'right' isn't "bend the other way" - fabric adds a 180deg rotation to every
    // character for it (see Text#_getCharBoundsForPath), which is what flipped negative-amount
    // curves upside down. The bend direction is already encoded by amplitude's sign above, so
    // pathSide should always stay 'left' (upright characters) regardless of curve direction.
    assignPathProps(curvePath, 'left');
    // fabric's Text#initDimensions() (triggered internally by assignPathProps' set('path', ...))
    // sets width/height to the invisible curvePath's own bounding box - just the bend geometry,
    // not the rendered glyphs. That leaves the resize-handle box far smaller than the actual
    // text, worse with bigger fonts/more lines. Re-derive height from real text metrics so the
    // control box tracks what's actually drawn.
    const lines = textValue.split('\n');
    const curveFontSize = Number.isFinite(textbox.fontSize) ? textbox.fontSize : DEFAULT_FONT_SIZE;
    const curveLineHeight = Number.isFinite(textbox.lineHeight) ? textbox.lineHeight : 1.16;
    const correctedHeight = Math.abs(amplitude) + curveFontSize * curveLineHeight * Math.max(1, lines.length);
    if (typeof textbox.set === 'function') {
      textbox.set('height', correctedHeight);
    } else {
      textbox.height = correctedHeight;
    }
    // Changing height shifts the object's computed center (top/left stay put), which would
    // otherwise make the text jump on screen every time the curve amount changes. Re-anchor
    // the center back to where it was so only the box grows/shrinks, not the visible position.
    if (preCurveCenter && typeof textbox.setPositionByOrigin === 'function') {
      textbox.setPositionByOrigin(preCurveCenter, 'center', 'center');
    }
    if (typeof textbox.setCoords === 'function') textbox.setCoords();
    const nextStyles = cloneTextboxStyles(baseStyles);
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
    const textSection = propertySections.get('text');
    if (textSection) textSection.hidden = !hasTextbox;
    if (textContentEl) {
      textContentEl.disabled = !hasTextbox;
      if (!hasTextbox) {
        textContentEl.value = '';
      } else if (document.activeElement !== textContentEl) {
        textContentEl.value = textbox.text || '';
      }
    }
    if (textbox) initializeTextboxCurve(textbox);
    const controls = [
      fontFamilySel,
      fontSizeInput,
      fontColorInput,
      fontStrokeColorInput,
      fontStrokeWidthInput,
      letterSpacingInput,
      lineHeightInput,
      textShadowColorInput,
      textShadowBlurInput,
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
      if (letterSpacingInput) letterSpacingInput.value = '0';
      if (letterSpacingValue) letterSpacingValue.textContent = formatLetterSpacing(0);
      if (lineHeightInput) lineHeightInput.value = DEFAULT_LINE_HEIGHT;
      if (lineHeightValue) lineHeightValue.textContent = DEFAULT_LINE_HEIGHT.toFixed(2);
      if (textShadowColorInput) textShadowColorInput.value = DEFAULT_SHADOW_COLOR;
      if (textShadowBlurInput) textShadowBlurInput.value = '0';
      if (textShadowBlurValue) textShadowBlurValue.textContent = formatShadowBlur(0);
      if (textCurveToggle) setPressed(textCurveToggle, false);
      if (textCurveInput) {
        textCurveInput.value = '0';
        textCurveInput.disabled = true;
      }
      if (textCurveValue) textCurveValue.textContent = 'Egyenes';
      if (textCurveHint) textCurveHint.hidden = true;
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
    if (letterSpacingInput) {
      const spacing = Number.isFinite(textbox.charSpacing) ? textbox.charSpacing : 0;
      letterSpacingInput.value = spacing;
      if (letterSpacingValue) letterSpacingValue.textContent = formatLetterSpacing(spacing);
    }
    if (lineHeightInput) {
      const lh = Number.isFinite(textbox.lineHeight) ? textbox.lineHeight : DEFAULT_LINE_HEIGHT;
      lineHeightInput.value = lh;
      if (lineHeightValue) lineHeightValue.textContent = lh.toFixed(2);
    }
    if (textShadowBlurInput) {
      const shadow = textbox.shadow;
      const blur = shadow && Number.isFinite(shadow.blur) ? shadow.blur : 0;
      textShadowBlurInput.value = blur;
      if (textShadowBlurValue) textShadowBlurValue.textContent = formatShadowBlur(blur);
      if (textShadowColorInput) textShadowColorInput.value = toHexColor(shadow && shadow.color ? shadow.color : DEFAULT_SHADOW_COLOR);
    }
    setPressed(fontBoldToggle, (textbox.fontWeight || '').toString().toLowerCase() === 'bold' || parseInt(textbox.fontWeight, 10) >= 600);
    setPressed(fontItalicToggle, (textbox.fontStyle || '').toString().toLowerCase() === 'italic');
    alignButtons.forEach(btn => {
      setPressed(btn, textbox.textAlign === btn.dataset.nbAlign);
    });
    const curveState = ensureTextboxCurveState(textbox);
    const curveTooLong = textTooLongForCurve(textbox);
    if (textCurveToggle) {
      textCurveToggle.disabled = curveTooLong;
      setPressed(textCurveToggle, !!curveState.enabled);
    }
    if (textCurveInput) {
      textCurveInput.disabled = curveTooLong || !(curveState.enabled && hasTextbox);
      textCurveInput.value = clampCurveAmount(curveState.amount).toString();
    }
    if (textCurveValue) {
      textCurveValue.textContent = formatCurveLabel(curveState.amount, curveState.enabled && hasTextbox && !curveTooLong);
    }
    if (textCurveHint) textCurveHint.hidden = !curveTooLong;
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

  function currentLetterSpacing() {
    return letterSpacingInput ? parseFloat(letterSpacingInput.value) || 0 : 0;
  }

  function currentLineHeight() {
    return lineHeightInput ? parseFloat(lineHeightInput.value) || DEFAULT_LINE_HEIGHT : DEFAULT_LINE_HEIGHT;
  }

  function currentTextShadow() {
    const blur = textShadowBlurInput ? parseFloat(textShadowBlurInput.value) || 0 : 0;
    if (blur <= 0) return null;
    const color = textShadowColorInput && textShadowColorInput.value ? textShadowColorInput.value : DEFAULT_SHADOW_COLOR;
    const offset = Math.round(blur / 3);
    return { color: color, blur: blur, offsetX: offset, offsetY: offset };
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
    renderModalProducts();
  }

  function populateColorsSizes() {
    const pid = parseInt(productSel.value || 0, 10);
    const cfg = getCatalog()[pid] || {};
    const { entries: filteredColors, restricted, typeConfigured } = availableColorsForType(cfg, typeSel ? typeSel.value : '');
    const fallbackColors = typeConfigured ? [] : colorStringsForType(cfg, '').map(colorEntryFromString).filter(Boolean);
    const colorsToRender = filteredColors.length ? filteredColors : fallbackColors;
    const previousColor = colorSel.value;
    const previousSize = sizeSel.value;
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
    if (previousColor && Array.from(colorSel.options).some(o => o.value === previousColor)) {
      colorSel.value = previousColor;
    }
    ensureSelectValue(colorSel);
    renderColorChoices();

    clearBulkSizeState();
    if (bulkModal && !bulkModal.hidden) {
      closeBulkModal();
    }
    sizeSel.innerHTML = '';
    const sizeValues = (cfg.sizes || []).map(size => (size || '').toString().trim()).filter(Boolean);
    // With several sizes the customer has to pick one explicitly, so nobody
    // ends up with the first size by accident. A single size is preselected.
    if (sizeValues.length > 1) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Válassz méretet';
      sizeSel.appendChild(placeholder);
    }
    sizeValues.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      sizeSel.appendChild(opt);
    });
    if (previousSize && sizeValues.indexOf(previousSize) !== -1) {
      sizeSel.value = previousSize;
    } else {
      sizeSel.value = sizeValues.length === 1 ? sizeValues[0] : '';
    }
    renderSizeButtons();
    renderBulkSizeList();
  }

  function loadInitialDesignImage() {
    const url = initialDesignImageUrl;
    initialDesignImageUrl = '';
    if (!url) return;
    loadMockupImage(url).then(img => {
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
      img.__nb_layer_name = 'Minta';
      c.add(img);
      c.setActiveObject(img);
      syncImageControls();
    }).catch(() => {});
  }

  // initial populate
  populateFontOptions();
  populateTypes();
  populateProducts();

  // Pre-select product from URL ?nb_product=ID (set by "Tervezd meg!" button on product page)
  const urlNbProductId = (typeof NB_DESIGNER !== 'undefined' && NB_DESIGNER.nb_product_id) ? String(NB_DESIGNER.nb_product_id) : '';
  if (urlNbProductId && productSel) {
    const matchOpt = Array.from(productSel.options).find(o => o.value === urlNbProductId);
    if (matchOpt) {
      productSel.value = urlNbProductId;
      dispatchChangeEvent(productSel);
    }
  }

  // Pre-select the configured designer type from homepage links (?nb_type=Label).
  const urlNbType = (typeof NB_DESIGNER !== 'undefined' && NB_DESIGNER.nb_type) ? String(NB_DESIGNER.nb_type) : '';
  if (urlNbType && typeSel) {
    const normalizedUrlType = normalizedTypeValue(urlNbType);
    const matchTypeOpt = Array.from(typeSel.options).find(o => normalizedTypeValue(o.value) === normalizedUrlType);
    if (matchTypeOpt) {
      typeSel.value = matchTypeOpt.value;
      dispatchChangeEvent(typeSel);
    }
  }

  populateColorsSizes();
  initAlignDefault();
  setMockupBgAndArea();
  requestAnimationFrame(() => { setMockupBgAndArea(); loadInitialDesignImage(); });
  updateSelectionSummary();
  syncTextControls();
  syncImageControls();
  captureActiveSideState();
  commitHistory();
  updateCanvasEmptyHint();
  updateSideUiState();
  updateSideStatus();
  updatePrintSummary();
  setInspectorTab('properties');
  applyLayoutMode();
  syncPropertiesEmptyState();

  // --- Értesítések ---------------------------------------------------------
  const TOAST_ICONS = { info: 'info', success: 'check', error: 'alert', warning: 'alert' };
  function toast(message, type, options) {
    if (!toastsEl || !message) return null;
    const opts = options || {};
    const kind = TOAST_ICONS[type] ? type : 'info';
    Array.from(toastsEl.children).forEach(existing => {
      const text = existing.querySelector('.nb-toast-text');
      if (text && text.textContent === message && existing.parentNode) existing.parentNode.removeChild(existing);
    });
    const el = document.createElement('div');
    el.className = `nb-toast nb-toast--${kind}`;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.innerHTML = iconMarkup(TOAST_ICONS[kind]);
    const text = document.createElement('div');
    text.className = 'nb-toast-text';
    text.textContent = message;
    el.appendChild(text);
    let timer = null;
    const dismiss = () => {
      if (!el.isConnected) return;
      clearTimeout(timer);
      el.classList.add('is-leaving');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    };
    if (opts.action && opts.action.label && typeof opts.action.onClick === 'function') {
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'nb-toast-action';
      actionBtn.textContent = opts.action.label;
      actionBtn.addEventListener('click', () => {
        dismiss();
        opts.action.onClick();
      });
      el.appendChild(actionBtn);
    }
    toastsEl.appendChild(el);
    while (toastsEl.children.length > 3) toastsEl.removeChild(toastsEl.firstElementChild);
    timer = setTimeout(dismiss, opts.duration || (kind === 'error' ? 6500 : 4000));
    return { dismiss };
  }

  // --- Megerősítő ablak ----------------------------------------------------
  function confirmDialog(options) {
    const opts = options || {};
    return new Promise(resolve => {
      const titleEl = document.getElementById('nb-dialog-title');
      const textEl = document.getElementById('nb-dialog-text');
      const okBtn = document.getElementById('nb-dialog-ok');
      const cancelBtn = document.getElementById('nb-dialog-cancel');
      if (!dialogEl || !okBtn || !cancelBtn) {
        resolve(window.confirm(opts.message || opts.title || ''));
        return;
      }
      if (titleEl) titleEl.textContent = opts.title || 'Biztos vagy benne?';
      if (textEl) textEl.textContent = opts.message || '';
      okBtn.textContent = opts.confirmLabel || 'Rendben';
      cancelBtn.textContent = opts.cancelLabel || 'Mégse';
      const previousFocus = document.activeElement;
      const cancelEls = Array.from(dialogEl.querySelectorAll('[data-nb-dialog-cancel]'));
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        dialogEl.hidden = true;
        updateModalBodyState();
        okBtn.removeEventListener('click', onOk);
        cancelEls.forEach(el => el.removeEventListener('click', onCancel));
        document.removeEventListener('keydown', onKey, true);
        if (previousFocus && typeof previousFocus.focus === 'function') {
          try { previousFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        }
        resolve(result);
      };
      const onOk = () => finish(true);
      const onCancel = () => finish(false);
      const onKey = evt => {
        if (evt.key === 'Escape') {
          evt.preventDefault();
          evt.stopPropagation();
          onCancel();
        } else if (evt.key === 'Tab') {
          // Keep keyboard focus inside the dialog.
          const focusables = [cancelBtn, okBtn];
          const index = focusables.indexOf(document.activeElement);
          evt.preventDefault();
          const next = evt.shiftKey ? (index <= 0 ? focusables.length - 1 : index - 1) : (index + 1) % focusables.length;
          focusables[next].focus();
        }
      };
      okBtn.addEventListener('click', onOk);
      cancelEls.forEach(el => el.addEventListener('click', onCancel));
      document.addEventListener('keydown', onKey, true);
      dialogEl.hidden = false;
      updateModalBodyState();
      setTimeout(() => okBtn.focus(), 0);
    });
  }

  // --- Hiányzó választás jelzése ------------------------------------------
  function guideToSelection(preferredKey) {
    const missing = missingSelectionKeys();
    const key = preferredKey || missing[0] || 'size';
    const names = { product: 'terméket', color: 'színt', size: 'méretet' };
    openTool('product');
    const groups = {
      product: productGroupEl && !productGroupEl.hidden ? productGroupEl : typeGroupEl,
      color: document.getElementById('nb-color-group'),
      size: sizeGroupEl
    };
    const group = groups[key];
    if (group) {
      group.classList.remove('is-attention');
      void group.offsetWidth;
      group.classList.add('is-attention');
      setTimeout(() => group.classList.remove('is-attention'), 1400);
      if (typeof group.scrollIntoView === 'function') {
        setTimeout(() => group.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
      }
    }
    if (missing.length) {
      if (guideToast) guideToast.dismiss();
      guideToast = toast(`A rendeléshez válassz ${names[key] || 'méretet'}.`, 'warning');
    }
  }

  // --- Piszkozat automatikus mentése ---------------------------------------
  function sideObjectCount(json) {
    return json && Array.isArray(json.objects) ? json.objects.length : 0;
  }

  function serializeDraft() {
    captureActiveSideState();
    const front = cloneSideJson(ensureSideState('front'));
    const back = cloneSideJson(ensureSideState('back'));
    if (!sideObjectCount(front) && !sideObjectCount(back)) return null;
    return {
      v: 1,
      savedAt: Date.now(),
      product: productSel.value || '',
      type: typeSel.value || '',
      color: colorSel.value || '',
      size: sizeSel.value || '',
      doubleSided: !!doubleSidedEnabled,
      layers: { front, back }
    };
  }

  function draftStorage() {
    try {
      return window.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function scheduleDraftSave() {
    if (draftState.suppressed) return;
    if (draftState.timer) clearTimeout(draftState.timer);
    draftState.timer = setTimeout(saveDraftNow, 900);
  }

  function saveDraftNow() {
    draftState.timer = null;
    if (draftState.suppressed) return;
    if (sideLoading || saving || historyOpInProgress || cropSession) {
      scheduleDraftSave();
      return;
    }
    const storage = draftStorage();
    if (!storage) return;
    const draft = serializeDraft();
    try {
      if (!draft) {
        storage.removeItem(DRAFT_STORAGE_KEY);
        draftState.savedAt = 0;
      } else {
        storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        draftState.savedAt = draft.savedAt;
      }
    } catch (e) {
      // Large photos can exceed the browser quota; the editor keeps working.
      draftState.savedAt = 0;
    }
    updateDesignStatus();
  }

  function readDraft() {
    const storage = draftStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft || draft.v !== 1 || !draft.layers) return null;
      if (!draft.savedAt || Date.now() - draft.savedAt > 30 * 24 * 3600 * 1000) {
        storage.removeItem(DRAFT_STORAGE_KEY);
        return null;
      }
      if (!sideObjectCount(draft.layers.front) && !sideObjectCount(draft.layers.back)) return null;
      return draft;
    } catch (e) {
      return null;
    }
  }

  function clearDraft() {
    if (draftState.timer) {
      clearTimeout(draftState.timer);
      draftState.timer = null;
    }
    const storage = draftStorage();
    try {
      if (storage) storage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) { /* ignore */ }
    draftState.savedAt = 0;
    updateDesignStatus();
  }

  function selectOptionValue(selectEl, value) {
    if (!selectEl || !value) return false;
    const match = Array.from(selectEl.options).find(o => o.value === value);
    if (!match || selectEl.value === value) return !!match;
    selectEl.value = value;
    dispatchChangeEvent(selectEl);
    return true;
  }

  async function restoreDraft(draft) {
    draftState.suppressed = true;
    try {
      selectOptionValue(typeSel, draft.type);
      selectOptionValue(productSel, draft.product);
      selectOptionValue(colorSel, draft.color);
      selectOptionValue(sizeSel, draft.size);
      await loadDesign({ layers: draft.layers }, { doubleSided: !!draft.doubleSided });
      updateSelectionSummary();
    } finally {
      draftState.suppressed = false;
    }
    draftState.savedAt = draft.savedAt;
    updateDesignStatus();
    toast('Visszatöltöttük a korábbi tervedet.', 'success');
  }

  function formatDraftTime(timestamp) {
    try {
      return new Date(timestamp).toLocaleString('hu-HU', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  // --- Képek: feltöltés, behúzás, beillesztés ------------------------------
  const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
  const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

  function validateImageFile(file) {
    if (!file) return 'Nem sikerült beolvasni a fájlt.';
    const type = (file.type || '').toLowerCase();
    const typeOk = ACCEPTED_IMAGE_TYPES.indexOf(type) !== -1 || /\.(png|jpe?g|svg|webp)$/i.test(file.name || '');
    if (!typeOk) return 'Ez a fájltípus nem támogatott. PNG, JPG, SVG vagy WEBP képet tölts fel.';
    if (file.size > MAX_UPLOAD_BYTES) return 'A kép túl nagy, legfeljebb 25 MB lehet.';
    return '';
  }

  function addImageFromFile(file) {
    const error = validateImageFile(file);
    if (error) {
      toast(error, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt && evt.target && typeof evt.target.result === 'string' ? evt.target.result : '';
      if (!dataUrl) {
        toast('Nem sikerült beolvasni a képet.', 'error');
        return;
      }
      fabric.Image.fromURL(dataUrl, (img, isError) => {
        if (isError || !img || !img.width || !img.height) {
          toast('Nem sikerült megnyitni a képet.', 'error');
          return;
        }
        if (uiState.preview) setPreviewMode(false);
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
        if (typeof file.name === 'string' && file.name) {
          const baseName = file.name.split(/[/\\]/).pop() || file.name;
          img.__nb_layer_name = baseName.replace(/\.[^.]+$/, '') || 'Kép';
        }
        c.add(img);
        c.setActiveObject(img);
        keepObjectInside(img);
        syncImageControls();
        closeTransientPanel();
        const dpi = imageEffectiveDpi(img);
        if (Number.isFinite(dpi) && dpi < MIN_PRINT_DPI) {
          toast('A kép felbontása alacsony, nyomtatásban pixeles lehet. Kicsinyítsd, vagy tölts fel nagyobb képet.', 'warning', { duration: 7000 });
        } else {
          toast('Kép hozzáadva.', 'success');
        }
      });
    };
    reader.onerror = () => toast('Nem sikerült beolvasni a képet.', 'error');
    reader.readAsDataURL(file);
  }

  function firstImageFile(fileList) {
    const files = Array.from(fileList || []);
    return files.find(f => /^image\//i.test(f.type || '') || /\.(png|jpe?g|svg|webp)$/i.test(f.name || '')) || files[0] || null;
  }

  function enableFileDrop(zone) {
    if (!zone) return;
    let depth = 0;
    const hasFiles = evt => !!(evt.dataTransfer && Array.from(evt.dataTransfer.types || []).indexOf('Files') !== -1);
    zone.addEventListener('dragenter', evt => {
      if (!hasFiles(evt)) return;
      evt.preventDefault();
      depth += 1;
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragover', evt => {
      if (!hasFiles(evt)) return;
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy';
    });
    zone.addEventListener('dragleave', evt => {
      if (!hasFiles(evt)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) zone.classList.remove('is-dragover');
    });
    zone.addEventListener('drop', evt => {
      if (!hasFiles(evt)) return;
      evt.preventDefault();
      depth = 0;
      zone.classList.remove('is-dragover');
      const file = firstImageFile(evt.dataTransfer.files);
      if (file) addImageFromFile(file);
    });
  }

  enableFileDrop(stageCanvasEl);
  enableFileDrop(document.querySelector('#nb-designer .nb-dropzone'));

  document.addEventListener('paste', evt => {
    if (isTypingTarget(evt.target)) return;
    if (!appEl || !document.body.contains(appEl)) return;
    const items = Array.from((evt.clipboardData && evt.clipboardData.items) || []);
    const item = items.find(i => i.kind === 'file' && /^image\//i.test(i.type || ''));
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    evt.preventDefault();
    addImageFromFile(file);
  });

  // --- Előnézet mód --------------------------------------------------------
  function setPreviewMode(on) {
    uiState.preview = !!on;
    if (appEl) appEl.classList.toggle('is-preview', uiState.preview);
    if (previewToggleBtn) {
      previewToggleBtn.setAttribute('aria-pressed', uiState.preview ? 'true' : 'false');
      previewToggleBtn.setAttribute('aria-label', uiState.preview ? 'Előnézet bezárása' : 'Előnézet');
      previewToggleBtn.title = uiState.preview ? 'Vissza a szerkesztéshez' : 'Előnézet segédvonalak nélkül';
      const use = previewToggleBtn.querySelector('use');
      if (use) use.setAttribute('href', uiState.preview ? '#nb-i-eye-off' : '#nb-i-eye');
    }
    if (uiState.preview) {
      maybeAutoApplyCrop(null);
      c.discardActiveObject();
      resetZoom();
    }
    if (c.__nb_area_rect) c.__nb_area_rect.visible = !uiState.preview;
    c.skipTargetFind = uiState.preview;
    c.selection = !uiState.preview;
    c.requestRenderAll();
    syncQuickbar();
  }

  if (previewToggleBtn) {
    previewToggleBtn.addEventListener('click', () => setPreviewMode(!uiState.preview));
  }

  // --- Súgó ----------------------------------------------------------------
  const studioHelp = document.getElementById('nb-studio-help');
  const helpToggles = Array.from(document.querySelectorAll('[data-nb-help-toggle]'));
  function setHelpOpen(open) {
    if (!studioHelp) return;
    studioHelp.hidden = !open;
    helpToggles.forEach(btn => {
      if (btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  helpToggles.forEach(btn => {
    btn.addEventListener('click', () => setHelpOpen(!!(studioHelp && studioHelp.hidden)));
  });

  // --- Panelek és eszközök -------------------------------------------------
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (uiState.preview) setPreviewMode(false);
      const key = btn.dataset.nbTool;
      toggleTool(key);
      if (key === 'text' && !isMobileUi() && dockIsVisible()) focusFirstIn(toolPanels.get('text'));
    });
  });

  document.querySelectorAll('[data-nb-tool-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (uiState.preview) setPreviewMode(false);
      const key = btn.dataset.nbToolOpen;
      openTool(key, { focus: key === 'text' && !isMobileUi() });
    });
  });

  inspectorTabs.forEach((btn, index) => {
    btn.addEventListener('click', () => setInspectorTab(btn.dataset.nbInspectorTab));
    btn.addEventListener('keydown', evt => {
      if (evt.key !== 'ArrowRight' && evt.key !== 'ArrowLeft') return;
      evt.preventDefault();
      const next = inspectorTabs[(index + (evt.key === 'ArrowRight' ? 1 : inspectorTabs.length - 1)) % inspectorTabs.length];
      setInspectorTab(next.dataset.nbInspectorTab);
      next.focus();
    });
  });

  document.querySelectorAll('[data-nb-inspector-open]').forEach(btn => {
    btn.addEventListener('click', () => openInspector(btn.dataset.nbInspectorOpen));
  });

  document.querySelectorAll('[data-nb-sheet-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isMobileUi()) closeSheet();
      else if (isTabletUi()) setTabletDock(false);
    });
  });

  document.querySelectorAll('[data-nb-sheet-grip]').forEach(grip => {
    grip.addEventListener('pointerdown', evt => beginSheetDrag(evt, grip));
  });

  if (typeof ResizeObserver === 'function') {
    const sheetResizeObserver = new ResizeObserver(() => scheduleStageInset());
    Object.keys(sheets).forEach(key => sheetResizeObserver.observe(sheets[key]));
  }

  if (studioOrderBtn) {
    studioOrderBtn.addEventListener('click', () => {
      if (!hasCompleteSelection()) {
        guideToSelection();
        return;
      }
      openOrder();
    });
  }

  Object.keys(quickButtons).forEach(key => {
    const btn = quickButtons[key];
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const obj = activeDesignObject();
      switch (key) {
        case 'edit':
          openInspector('properties');
          break;
        case 'duplicate':
          duplicateActiveObject();
          break;
        case 'forward':
          if (obj) moveLayer(obj, 1);
          break;
        case 'backward':
          if (obj) moveLayer(obj, -1);
          break;
        case 'center':
          centerActiveObject();
          break;
        case 'delete':
          removeActiveObject();
          break;
      }
    });
  });

  // Auto-load saved design from URL ?nb_design_id=ID (set by "Saját Terveim" edit button)
  const urlNbDesignId = (typeof NB_DESIGNER !== 'undefined' && NB_DESIGNER.nb_design_id) ? parseInt(NB_DESIGNER.nb_design_id, 10) : 0;
  if (urlNbDesignId) {
    fetch(NB_DESIGNER.rest + 'load-design?id=' + urlNbDesignId, { headers: { 'X-WP-Nonce': NB_DESIGNER.nonce } })
      .then(r => r.json())
      .then(data => {
        if (!data || !data.layers) return;
        // Restore product/type/color/size from saved attributes before loading canvas
        const attrs = (data.meta && data.meta.attributes_json) ? data.meta.attributes_json : null;
        const savedPid = data.meta && data.meta.product_id ? String(data.meta.product_id) : '';
        if (savedPid && productSel) {
          const opt = Array.from(productSel.options).find(o => o.value === savedPid);
          if (opt) { productSel.value = savedPid; dispatchChangeEvent(productSel); }
        }
        if (attrs && typeSel && attrs.pa_type) {
          const tOpt = Array.from(typeSel.options).find(o => o.value === attrs.pa_type || o.textContent.trim() === attrs.type_label);
          if (tOpt) { typeSel.value = tOpt.value; dispatchChangeEvent(typeSel); }
        }
        if (attrs && colorSel && attrs.pa_color) {
          const cOpt = Array.from(colorSel.options).find(o => o.value === attrs.pa_color || o.dataset.original === attrs.pa_color);
          if (cOpt) { colorSel.value = cOpt.value; dispatchChangeEvent(colorSel); }
        }
        if (attrs && sizeSel && attrs.pa_size) {
          const sOpt = Array.from(sizeSel.options).find(o => o.value === attrs.pa_size);
          if (sOpt) { sizeSel.value = sOpt.value; dispatchChangeEvent(sizeSel); }
        }
        loadDesign(data);
        designState.savedDesignId = urlNbDesignId;
        designState.dirty = false;
      })
      .catch(() => {});
  }

  sideButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      requestSide(btn.dataset.nbSide === 'back' ? 'back' : 'front');
    });
  });

  const onLayoutChange = () => {
    applyLayoutMode();
    refreshControlProfile();
    fitCanvasToStage();
  };
  [mobileMedia, tabletMedia].forEach(media => {
    if (!media) return;
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onLayoutChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(onLayoutChange);
    }
  });

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
    renderModalProducts();
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
      commitHistory();
      syncLayerList();
    }
  });
  c.on('object:moving', e => { keepObjectInside(e.target, { fit: false }); applySnapGuides(e); });
  c.on('object:scaling', e => {
    if (e.target && e.target.__nb_crop_overlay) return;
    keepObjectInside(e.target); markDesignDirty(); syncLayerList(); updateLowResWarning();
  });
  c.on('object:rotating', e => {
    if (e.target) {
      const snapping = !!(e.e && e.e.shiftKey);
      e.target.snapAngle = snapping ? 15 : 0;
      e.target.snapThreshold = 5;
    }
    keepObjectInside(e.target);
    markDesignDirty();
    syncLayerList();
  });
  c.on('object:modified', e => {
    clearSnapGuides();
    if (e.target) e.target.snapAngle = 0;
    if (isDesignObject(e.target)) { markDesignDirty(); commitHistory(); syncLayerList(); }
    updateLowResWarning();
  });
  c.on('mouse:up', () => clearSnapGuides());
  c.on('object:removed', e => { if (isDesignObject(e.target)) { markDesignDirty(); commitHistory(); syncLayerList(); } });

  function onSelectionChanged() {
    maybeAutoApplyCrop(c.getActiveObject());
    syncTextControls();
    syncImageControls();
    syncLayerList();
    syncMobileSelectionUi();
    syncPropertiesEmptyState();
    if (!isMobileUi() && !layerSelectInProgress && activeDesignObject()) setInspectorTab('properties');
  }
  c.on('selection:created', onSelectionChanged);
  c.on('selection:updated', onSelectionChanged);
  c.on('selection:cleared', () => {
    maybeAutoApplyCrop(null);
    syncTextControls();
    syncImageControls();
    syncLayerList();
    syncMobileSelectionUi();
    syncPropertiesEmptyState();
  });
  c.on('text:changed', e => {
    if (!isDesignObject(e.target)) return;
    initializeTextboxCurve(e.target);
    applyTextboxCurve(e.target);
    markDesignDirty();
    if (typeof c.requestRenderAll === 'function') {
      c.requestRenderAll();
    }
    syncLayerList();
    syncTextControls();
  });

  if (textContentEl) {
    textContentEl.addEventListener('input', () => {
      const textbox = activeTextbox();
      if (!textbox) return;
      const value = textContentEl.value;
      applyToActiveText(obj => { obj.set('text', value); });
      initializeTextboxCurve(textbox);
      applyTextboxCurve(textbox);
      c.requestRenderAll();
      syncLayerList();
      syncTextControls();
    });
  }

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

  if (letterSpacingInput) {
    letterSpacingInput.addEventListener('input', () => {
      const spacing = parseFloat(letterSpacingInput.value) || 0;
      if (letterSpacingValue) letterSpacingValue.textContent = formatLetterSpacing(spacing);
      applyToActiveText(obj => { obj.set('charSpacing', spacing); });
    });
  }

  if (lineHeightInput) {
    lineHeightInput.addEventListener('input', () => {
      const lh = parseFloat(lineHeightInput.value) || DEFAULT_LINE_HEIGHT;
      if (lineHeightValue) lineHeightValue.textContent = lh.toFixed(2);
      applyToActiveText(obj => { obj.set('lineHeight', lh); });
    });
  }

  function applyTextShadow() {
    const blur = textShadowBlurInput ? parseFloat(textShadowBlurInput.value) || 0 : 0;
    if (textShadowBlurValue) textShadowBlurValue.textContent = formatShadowBlur(blur);
    applyToActiveText(obj => {
      if (blur <= 0) {
        obj.set('shadow', null);
        return;
      }
      const color = textShadowColorInput && textShadowColorInput.value ? textShadowColorInput.value : DEFAULT_SHADOW_COLOR;
      const offset = Math.round(blur / 3);
      obj.set('shadow', { color: color, blur: blur, offsetX: offset, offsetY: offset });
    });
  }

  if (textShadowBlurInput) {
    textShadowBlurInput.addEventListener('input', applyTextShadow);
  }
  if (textShadowColorInput) {
    textShadowColorInput.onchange = applyTextShadow;
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

  renderBulkDiscountTable();
  updateBulkDiscountHint();

  if (bulkModalTrigger) {
    bulkModalTrigger.addEventListener('click', () => {
      if (bulkModalTrigger.disabled) return;
      if (!hasCompleteSelection() && missingSelectionKeys().some(key => key !== 'size')) {
        guideToSelection();
        return;
      }
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
      if (cropSession) {
        cancelImageCrop();
        return;
      }
      if (bulkModal && !bulkModal.hidden) {
        closeBulkModal();
        return;
      }
      if (studioHelp && !studioHelp.hidden) {
        setHelpOpen(false);
        return;
      }
      if (uiState.sheet) {
        closeSheet();
        return;
      }
      if (isTabletUi() && dockIsVisible()) {
        setTabletDock(false);
        return;
      }
      if (uiState.preview) {
        setPreviewMode(false);
        return;
      }
      if (activeDesignObject() && !isTypingTarget(evt.target)) {
        c.discardActiveObject();
        c.requestRenderAll();
      }
      return;
    }
    if ((key === 'd' || key === 'D') && (evt.ctrlKey || evt.metaKey) && !isTypingTarget(evt.target)) {
      if (activeDesignObject()) {
        evt.preventDefault();
        duplicateActiveObject();
      }
      return;
    }
    if ((key === 'Delete' || key === 'Backspace') && !isTypingTarget(evt.target)) {
      const active = activeDesignObject();
      if (active) {
        evt.preventDefault();
        removeActiveObject(active);
      }
    }
    if ((key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') && !isTypingTarget(evt.target)) {
      const step = evt.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (key === 'ArrowUp') dy = -step;
      else if (key === 'ArrowDown') dy = step;
      else if (key === 'ArrowLeft') dx = -step;
      else dx = step;
      if (nudgeActiveObject(dx, dy)) {
        evt.preventDefault();
        return;
      }
    }
    if ((key === 'z' || key === 'Z') && (evt.ctrlKey || evt.metaKey) && !isTypingTarget(evt.target)) {
      evt.preventDefault();
      if (evt.shiftKey) {
        redoHistory();
      } else {
        undoHistory();
      }
      return;
    }
    if ((key === 'y' || key === 'Y') && (evt.ctrlKey || evt.metaKey) && !isTypingTarget(evt.target)) {
      evt.preventDefault();
      redoHistory();
      return;
    }
    if ((key === '+' || key === '=') && (evt.ctrlKey || evt.metaKey) && !isTypingTarget(evt.target)) {
      evt.preventDefault();
      setZoomLevel(c.getZoom() + ZOOM_STEP);
      return;
    }
    if ((key === '-' || key === '_') && (evt.ctrlKey || evt.metaKey) && !isTypingTarget(evt.target)) {
      evt.preventDefault();
      setZoomLevel(c.getZoom() - ZOOM_STEP);
      return;
    }
    if (key === '0' && (evt.ctrlKey || evt.metaKey) && !isTypingTarget(evt.target)) {
      evt.preventDefault();
      resetZoom();
      return;
    }
  });

  if (undoBtn) undoBtn.addEventListener('click', undoHistory);
  if (redoBtn) redoBtn.addEventListener('click', redoHistory);
  updateHistoryButtons();

  if (groupBtn) groupBtn.addEventListener('click', groupActiveSelection);
  if (ungroupBtn) ungroupBtn.addEventListener('click', ungroupActiveGroup);
  objectAlignButtons.forEach(btn => {
    btn.addEventListener('click', () => alignSelection(btn.dataset.nbObjAlign));
  });
  if (distributeHBtn) distributeHBtn.addEventListener('click', () => distributeSelection('horizontal'));
  if (distributeVBtn) distributeVBtn.addEventListener('click', () => distributeSelection('vertical'));

  if (opacityInput) {
    opacityInput.addEventListener('input', () => {
      const pct = parseInt(opacityInput.value, 10);
      const normalized = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 100;
      if (opacityValue) opacityValue.textContent = normalized + '%';
      const targets = activeAppearanceTargets();
      if (!targets.length) return;
      targets.forEach(obj => obj.set('opacity', normalized / 100));
      c.requestRenderAll();
      markDesignDirty();
      scheduleHistoryCommit();
    });
  }

  function toggleFlip(axis) {
    const targets = activeAppearanceTargets();
    if (!targets.length) return;
    const prop = axis === 'horizontal' ? 'flipX' : 'flipY';
    const next = !targets[0][prop];
    targets.forEach(obj => obj.set(prop, next));
    c.requestRenderAll();
    markDesignDirty();
    commitHistory();
    syncObjectAppearance();
  }

  if (flipHBtn) flipHBtn.addEventListener('click', () => toggleFlip('horizontal'));
  if (flipVBtn) flipVBtn.addEventListener('click', () => toggleFlip('vertical'));

  if (shapeFillInput) {
    shapeFillInput.addEventListener('input', () => {
      const targets = activeAppearanceTargets().filter(isRecolorableShape);
      if (!targets.length) return;
      targets.forEach(obj => obj.set(shapeColorProp(obj), shapeFillInput.value));
      c.requestRenderAll();
      markDesignDirty();
      scheduleHistoryCommit();
    });
  }

  if (patternUploadBtn && patternUploadInput) {
    patternUploadBtn.addEventListener('click', () => patternUploadInput.click());
    patternUploadInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) loadPatternFromFile(file);
    });
  }

  if (patternClearBtn) {
    patternClearBtn.addEventListener('click', () => clearPatternFillFromTargets());
  }

  if (patternScaleInput) {
    patternScaleInput.addEventListener('input', () => {
      const pct = parseInt(patternScaleInput.value, 10) || 100;
      if (patternScaleValue) patternScaleValue.textContent = pct + '%';
      updatePatternScaleForTargets(pct / 100);
    });
  }

  if (filterGrayscaleToggle) {
    filterGrayscaleToggle.onclick = () => {
      const next = filterGrayscaleToggle.getAttribute('aria-pressed') !== 'true';
      setPressed(filterGrayscaleToggle, next);
      applyToActiveImage(obj => {
        setImageFilter(obj, 'Grayscale', next ? new fabric.Image.filters.Grayscale() : null);
      });
    };
  }
  if (filterSepiaToggle) {
    filterSepiaToggle.onclick = () => {
      const next = filterSepiaToggle.getAttribute('aria-pressed') !== 'true';
      setPressed(filterSepiaToggle, next);
      applyToActiveImage(obj => {
        setImageFilter(obj, 'Sepia', next ? new fabric.Image.filters.Sepia() : null);
      });
    };
  }
  if (filterBrightnessInput) {
    filterBrightnessInput.addEventListener('input', () => {
      const pct = parseInt(filterBrightnessInput.value, 10) || 0;
      if (filterBrightnessValue) filterBrightnessValue.textContent = pct;
      applyToActiveImage(obj => {
        setImageFilter(obj, 'Brightness', pct !== 0 ? new fabric.Image.filters.Brightness({ brightness: pct / 100 }) : null);
      });
    });
  }
  if (filterContrastInput) {
    filterContrastInput.addEventListener('input', () => {
      const pct = parseInt(filterContrastInput.value, 10) || 0;
      if (filterContrastValue) filterContrastValue.textContent = pct;
      applyToActiveImage(obj => {
        setImageFilter(obj, 'Contrast', pct !== 0 ? new fabric.Image.filters.Contrast({ contrast: pct / 100 }) : null);
      });
    });
  }

  function replaceImageWithFile(img, file) {
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt && evt.target && typeof evt.target.result === 'string' ? evt.target.result : '';
      if (!dataUrl || c.getObjects().indexOf(img) === -1) return;
      fabric.Image.fromURL(dataUrl, newImg => {
        const index = c.getObjects().indexOf(img);
        if (index === -1) return;
        newImg.set({
          left: img.left,
          top: img.top,
          originX: img.originX,
          originY: img.originY,
          angle: img.angle,
          scaleX: img.scaleX,
          scaleY: img.scaleY,
          flipX: img.flipX,
          flipY: img.flipY,
          opacity: img.opacity,
          selectable: true,
          cornerStyle: 'circle',
          transparentCorners: false,
          lockScalingFlip: true
        });
        newImg.filters = (img.filters || []).slice();
        newImg.__nb_layer_name = img.__nb_layer_name;
        newImg.__nb_layer_id = img.__nb_layer_id;
        suspendHistory = true;
        c.remove(img);
        c.insertAt(newImg, index, false);
        suspendHistory = false;
        newImg.applyFilters();
        c.setActiveObject(newImg);
        c.requestRenderAll();
        markDesignDirty();
        commitHistory();
        syncImageControls();
      });
    };
    reader.onerror = () => {
      console.error('Nem sikerült beolvasni a képfájlt.');
    };
    reader.readAsDataURL(file);
  }

  let replaceImageTarget = null;
  if (replaceImageBtn && replaceImageInput) {
    replaceImageBtn.addEventListener('click', () => {
      replaceImageTarget = activeImage();
      if (!replaceImageTarget) return;
      replaceImageInput.click();
    });
    replaceImageInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      const target = replaceImageTarget;
      replaceImageTarget = null;
      if (file && target) replaceImageWithFile(target, file);
    });
  }

  if (cropImageBtn) cropImageBtn.addEventListener('click', () => startImageCrop());
  if (cropApplyBtn) cropApplyBtn.addEventListener('click', () => applyImageCrop());
  if (cropCancelBtn) cropCancelBtn.addEventListener('click', () => cancelImageCrop());

  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (uiState.preview) setPreviewMode(false);
      addShapeToCanvas(btn.dataset.nbShape);
      closeTransientPanel();
    });
  });

  if (qrInput && qrAddBtn) {
    const syncQrAddState = () => {
      qrAddBtn.disabled = !qrInput.value.trim();
    };
    qrInput.addEventListener('input', () => {
      setQrHint(null);
      syncQrAddState();
    });
    qrAddBtn.addEventListener('click', () => {
      if (uiState.preview) setPreviewMode(false);
      const before = designObjects().length;
      addQrToCanvas(qrInput.value);
      if (designObjects().length > before) {
        qrInput.value = '';
        closeTransientPanel();
      }
      syncQrAddState();
    });
    syncQrAddState();
  }

  if (zoomInBtn) zoomInBtn.addEventListener('click', () => setZoomLevel(c.getZoom() + ZOOM_STEP));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoomLevel(c.getZoom() - ZOOM_STEP));
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetZoom);
  syncZoomUi();

  let resizeRaf = null;
  function scheduleStageResize() {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      refreshControlProfile();
      fitCanvasToStage();
    });
  }
  window.addEventListener('resize', scheduleStageResize);

  if (typeof ResizeObserver === 'function' && canvasFrameEl) {
    const stageResizeObserver = new ResizeObserver(() => {
      scheduleStageResize();
    });
    stageResizeObserver.observe(canvasFrameEl);
  }

  window.addEventListener('load', () => {
    fitCanvasToStage();
  });

  if (typeof history !== 'undefined' && history.replaceState) {
    try {
      history.replaceState({ __nb_root: true }, document.title, location.href);
    } catch (e) { /* ignore */ }
  }

  window.addEventListener('popstate', () => {
    if (uiState.historyDepth > 0 && uiState.sheet) {
      closeSheet({ fromPopState: true });
      return;
    }
    if (uiState.pendingClose) {
      uiState.pendingClose = false;
      return;
    }
    if (isMobileUi()) {
      const hasContent = sideHasContent('front') || sideHasContent('back');
      if (hasContent && designState.dirty && !draftState.savedAt) {
        const leave = window.confirm('Kilépsz a tervezőből? A jelenlegi terv még nincs elmentve.');
        if (!leave && typeof history !== 'undefined' && history.pushState) {
          history.pushState({ __nb_root: true }, document.title, location.href);
        }
      }
    }
  });

  syncLayerList();
  syncPropertiesEmptyState();

  function addTextFromInput() {
    if (uiState.preview) setPreviewMode(false);
    const raw = textInputEl ? textInputEl.value : '';
    const typed = raw.trim().length > 0;
    const content = typed ? raw.replace(/\s+$/, '') : 'Írd ide a feliratot';
    const a = c.__nb_area || fallbackArea;
    const textboxWidth = Math.max(80, a.w - 40);
    const t = new fabric.Textbox(content, {
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
      charSpacing: currentLetterSpacing(),
      lineHeight: currentLineHeight(),
      shadow: currentTextShadow(),
      cornerStyle: 'circle',
      transparentCorners: false,
      lockScalingFlip: true
    });
    applyObjectUiDefaults(t);
    initializeTextboxCurve(t);
    c.add(t).setActiveObject(t);
    keepObjectInside(t);
    syncTextControls();
    if (textInputEl) textInputEl.value = '';
    setInspectorTab('properties');
    if (isMobileUi()) openInspector('properties');
    else if (isTabletUi()) setTabletDock(false);
    if (!typed && textContentEl) {
      // The placeholder text is selected, so typing replaces it right away.
      setTimeout(() => {
        try { textContentEl.focus({ preventScroll: true }); } catch (e) { textContentEl.focus(); }
        textContentEl.select();
      }, 60);
    }
  }

  if (addTextBtn) {
    addTextBtn.onclick = addTextFromInput;
  }

  if (textInputEl) {
    textInputEl.addEventListener('keydown', evt => {
      if (evt.key === 'Enter' && (evt.ctrlKey || evt.metaKey)) {
        evt.preventDefault();
        addTextFromInput();
      }
    });
  }

  if (uploadInput) {
    uploadInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) addImageFromFile(file);
    });
  }

  if (clearButton) {
    clearButton.onclick = async () => {
      if (!designObjects().length) {
        toast('Ezen az oldalon nincs mit törölni.', 'info');
        return;
      }
      const ok = await confirmDialog({
        title: `${sideLabel(activeSideKey)} ürítése`,
        message: `Minden elem törlődik a(z) ${sideLabel(activeSideKey).toLowerCase()} oldalról. A Visszavonás gombbal még visszahozhatod.`,
        confirmLabel: 'Ürítés',
        cancelLabel: 'Mégse'
      });
      if (!ok) return;
      c.discardActiveObject();
      suspendHistory = true;
      designObjects().forEach(obj => c.remove(obj));
      suspendHistory = false;
      c.requestRenderAll();
      markDesignDirty();
      commitHistory();
      syncTextControls();
      syncImageControls();
      syncLayerList();
      syncPropertiesEmptyState();
      toast('Az oldal kiürítve.', 'info', { action: { label: 'Visszavonás', onClick: undoHistory } });
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
    const targetWidth = 2000;
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
      dataUrl = withResetViewport(() => c.toDataURL({
        format: 'png',
        left,
        top,
        width,
        height,
        multiplier,
        enableRetinaScaling: false
      }));
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
      preview = withResetViewport(() => c.toDataURL({ format: 'png', multiplier: 1, left: 0, top: 0 }));
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
      await new Promise(r => setTimeout(r, 0));
      captureActiveSideState();
      const previousSide = activeSideKey;
      let frontData;
      if (imageCache && previousSide === 'front') {
        const freshState = ensureSideState('front');
        frontData = {
          ...imageCache.frontData,
          json: cloneSideJson(freshState || {}),
          hasContent: freshState ? freshState.hasContent : imageCache.frontData.hasContent,
          objectCount: freshState ? (freshState.objectCount || 0) : imageCache.frontData.objectCount
        };
      } else {
        frontData = await exportSideForSaving('front');
      }
      const backData = await exportSideForSaving('back');
      await setActiveSide(previousSide);
      const shouldIncludeBack = doubleSidedEnabled && backData.hasContent;
      const previewPng = frontData.preview || withResetViewport(() => c.toDataURL({ format: 'png', multiplier: 1, left: 0, top: 0 }));
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
      const physicalArea = c.__nb_area_physical || {};
      const meta = {
        width_mm: positiveNumberOr(physicalArea.width_mm, PRINT_AREA_WIDTH_MM),
        height_mm: positiveNumberOr(physicalArea.height_mm, PRINT_AREA_HEIGHT_MM),
        dpi: positiveNumberOr(physicalArea.dpi, 300),
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
        err.userMessage = 'Hálózati hiba. Ellenőrizd az internetkapcsolatot, majd próbáld újra.';
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
        toast('Adj meg legalább egy darabszámot.', 'warning');
        return;
      }
      bulkConfirmBtn.disabled = true;
      actionSubmitting = true;
      updateActionStates();
      showProcessingOverlay();
      await new Promise(r => requestAnimationFrame(r));
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
          err.userMessage = 'Hálózati hiba. Ellenőrizd az internetkapcsolatot, majd próbáld újra.';
          throw err;
        }
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          hideProcessingOverlay();
          toast((j && j.message) ? j.message : 'Nem sikerült a kosárba tenni. Próbáld újra.', 'error');
          return;
        }
        closeBulkModal();
        clearDraft();
        if (j.redirect) {
          window.location = j.redirect;
        } else {
          hideProcessingOverlay();
          toast('A termékek a kosárba kerültek.', 'success');
        }
      } catch (e) {
        hideProcessingOverlay();
        toast(e && e.userMessage ? e.userMessage : 'Hálózati hiba. Próbáld újra.', 'error');
      } finally {
        bulkConfirmBtn.disabled = false;
        actionSubmitting = false;
        updateActionStates();
      }
    };
  }

  const processingOverlay = document.createElement('div');
  processingOverlay.id = 'nb-processing-overlay';
  processingOverlay.setAttribute('role', 'status');
  processingOverlay.style.display = 'none';
  processingOverlay.innerHTML = '<div class="nb-processing-box"><div class="nb-processing-spinner"></div><p class="nb-processing-text">Kis türelmet, a terv feldolgozása folyamatban…</p></div>';
  document.body.appendChild(processingOverlay);

  function showProcessingOverlay() {
    processingOverlay.style.display = 'flex';
  }
  function hideProcessingOverlay() {
    processingOverlay.style.display = 'none';
  }

  if (addToCartBtn) {
    addToCartBtn.onclick = async () => {
      if (addToCartBtn.disabled) return;
      if (!hasCompleteSelection()) {
        guideToSelection();
        return;
      }
      actionSubmitting = true;
      updateActionStates();
      showProcessingOverlay();
      await new Promise(r => requestAnimationFrame(r));
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
          err.userMessage = 'Hálózati hiba. Ellenőrizd az internetkapcsolatot, majd próbáld újra.';
          throw err;
        }
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          hideProcessingOverlay();
          toast((j && j.message) ? j.message : 'Nem sikerült a kosárba tenni. Próbáld újra.', 'error');
          return;
        }
        clearDraft();
        if (j.redirect) {
          window.location = j.redirect;
        } else {
          hideProcessingOverlay();
          toast('A termék a kosárba került.', 'success');
        }
      } catch (e) {
        hideProcessingOverlay();
        toast(e && e.userMessage ? e.userMessage : 'Hálózati hiba. Próbáld újra.', 'error');
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
    const modal = document.getElementById('nb-' + key);
    if (modal) {
      modal.setAttribute('hidden', '');
      updateModalBodyState();
      e.preventDefault();
    }
  });

  // --- Sablonok a panelben ---
  const templateState = { loaded: false, loading: false, category: 0, search: '', requestId: 0, categories: [] };
  let templateSearchTimer = null;

  function setTemplateStatus(message) {
    if (!templatesList) return;
    templatesList.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'nb-template-status';
    p.textContent = message;
    templatesList.appendChild(p);
  }

  function renderTemplateSkeleton() {
    if (!templatesList) return;
    templatesList.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const sk = document.createElement('div');
      sk.className = 'nb-skeleton';
      templatesList.appendChild(sk);
    }
  }

  function ensureTemplatesLoaded() {
    if (templateState.loaded || templateState.loading) return;
    fetchTemplates(0, '');
  }

  async function fetchTemplates(catId, searchVal) {
    if (!templatesList || typeof NB_DESIGNER === 'undefined') return;
    templateState.category = catId || 0;
    templateState.search = searchVal || '';
    templateState.loading = true;
    const requestId = ++templateState.requestId;
    renderCategories(templateState.categories);
    renderTemplateSkeleton();
    try {
      const url = new URL(NB_DESIGNER.rest + 'templates', window.location.href);
      if (templateState.category) url.searchParams.append('category', templateState.category);
      if (templateState.search) url.searchParams.append('search', templateState.search);
      const res = await fetch(url.toString(), { headers: { 'X-WP-Nonce': NB_DESIGNER.nonce } });
      const data = await res.json();
      if (requestId !== templateState.requestId) return;
      if (Array.isArray(data.categories) && (!templateState.loaded || !templateState.categories.length)) {
        templateState.categories = data.categories;
      }
      templateState.loaded = true;
      renderCategories(templateState.categories);
      renderTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (e) {
      if (requestId !== templateState.requestId) return;
      setTemplateStatus('Nem sikerült betölteni a sablonokat. Próbáld újra később.');
    } finally {
      if (requestId === templateState.requestId) templateState.loading = false;
    }
  }

  function renderCategories(cats) {
    if (!templatesCats) return;
    templatesCats.innerHTML = '';
    const list = Array.isArray(cats) ? cats : [];
    if (!list.length) {
      templatesCats.hidden = true;
      return;
    }
    templatesCats.hidden = false;
    const entries = [{ id: 0, name: 'Összes' }].concat(list);
    entries.forEach(cat => {
      const id = parseInt(cat.id, 10) || 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = id === templateState.category;
      btn.className = 'nb-chip' + (isActive ? ' is-active' : '');
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.textContent = (cat.name || '').toString();
      if (id && Number.isFinite(Number(cat.count))) {
        const count = document.createElement('small');
        count.textContent = String(cat.count);
        btn.appendChild(count);
      }
      btn.addEventListener('click', () => fetchTemplates(id, templateSearch ? templateSearch.value.trim() : ''));
      templatesCats.appendChild(btn);
    });
  }

  function renderTemplates(list) {
    if (!templatesList) return;
    templatesList.innerHTML = '';
    if (!list.length) {
      setTemplateStatus(templateState.search ? 'Nincs a keresésnek megfelelő sablon.' : 'Ebben a kategóriában még nincs sablon.');
      return;
    }
    list.forEach(tpl => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'nb-template-card';
      const title = (tpl.title || 'Sablon').toString();
      card.setAttribute('aria-label', `${title} sablon betöltése`);
      const preview = document.createElement('div');
      preview.className = 'nb-template-preview';
      if (tpl.preview_url) {
        const img = document.createElement('img');
        img.src = tpl.preview_url;
        img.alt = '';
        img.loading = 'lazy';
        preview.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'nb-template-placeholder';
        preview.appendChild(placeholder);
      }
      const titleEl = document.createElement('div');
      titleEl.className = 'nb-template-title';
      titleEl.textContent = title;
      card.appendChild(preview);
      card.appendChild(titleEl);
      card.addEventListener('click', () => loadTemplate(tpl.id, title));
      templatesList.appendChild(card);
    });
  }

  if (templateSearch) {
    templateSearch.addEventListener('input', () => {
      clearTimeout(templateSearchTimer);
      templateSearchTimer = setTimeout(() => {
        fetchTemplates(templateState.category, templateSearch.value.trim());
      }, 400);
    });
  }

  async function loadTemplate(id, title) {
    const hasDesign = sideHasContent('front') || (doubleSidedEnabled && sideHasContent('back')) || designObjects().length > 0;
    if (hasDesign) {
      const ok = await confirmDialog({
        title: 'Lecseréled a tervet?',
        message: 'A sablon a jelenlegi terv helyére kerül. Ezt nem lehet visszavonni.',
        confirmLabel: 'Sablon betöltése',
        cancelLabel: 'Mégse'
      });
      if (!ok) return;
    }
    try {
      const res = await fetch(NB_DESIGNER.rest + 'load-design?id=' + encodeURIComponent(id), {
        headers: { 'X-WP-Nonce': NB_DESIGNER.nonce }
      });
      const data = await res.json();
      if (!data || !data.layers) throw new Error('empty-template');
      if (uiState.preview) setPreviewMode(false);
      await loadDesign(data);
      markDesignDirty();
      closeTransientPanel();
      toast(`„${title}” sablon betöltve. Most már testre szabhatod.`, 'success');
    } catch (e) {
      toast('Nem sikerült betölteni a sablont.', 'error');
    }
  }

  function layersHaveObjects(json) {
    if (!json) return false;
    if (Array.isArray(json)) return json.length > 0;
    return Array.isArray(json.objects) && json.objects.length > 0;
  }

  async function loadDesign(data, options) {
    const opts = options || {};
    sideStates.front = emptySideSnapshot();
    sideStates.back = emptySideSnapshot();

    const layers = data && data.layers ? data.layers : null;
    if (layers && (layers.front || layers.back)) {
      if (layers.front) {
        sideStates.front.json = layers.front;
        sideStates.front.hasContent = layersHaveObjects(layers.front);
      }
      if (layers.back) {
        sideStates.back.json = layers.back;
        sideStates.back.hasContent = layersHaveObjects(layers.back);
      }
    } else if (layers) {
      // Templates and legacy designs store a single side.
      sideStates.front.json = layers;
      sideStates.front.hasContent = layersHaveObjects(layers);
    }

    // A saved two-sided design must show its back side again.
    if (sideStates.back.hasContent || opts.doubleSided) {
      if (doubleSidedToggle && !doubleSidedToggle.checked) {
        doubleSidedToggle.checked = true;
        doubleSidedEnabled = true;
      }
    }

    activeSideKey = 'front';
    await loadSideState('front');
    updateSideUiState();
    updateSideStatus();
    updatePrintSummary();
    updatePriceDisplay();
    updateActionStates();
  }

  // --- Korábbi piszkozat felajánlása ---
  const hasPresetDesign = !!urlNbDesignId || !!initialDesignImageUrl;
  if (!hasPresetDesign) {
    const draft = readDraft();
    if (draft) {
      // Do not overwrite the stored draft while the customer decides.
      draftState.suppressed = true;
      setTimeout(async () => {
        const when = formatDraftTime(draft.savedAt);
        const ok = await confirmDialog({
          title: 'Folytatod a korábbi tervedet?',
          message: when
            ? `Van egy befejezetlen terved (${when}). Szeretnéd onnan folytatni?`
            : 'Van egy befejezetlen terved. Szeretnéd onnan folytatni?',
          confirmLabel: 'Folytatom',
          cancelLabel: 'Újat kezdek'
        });
        if (ok) {
          restoreDraft(draft).catch(() => {
            draftState.suppressed = false;
            toast('Nem sikerült visszatölteni a tervet.', 'error');
          });
        } else {
          draftState.suppressed = false;
          clearDraft();
        }
      }, 300);
    }
  }
})();
