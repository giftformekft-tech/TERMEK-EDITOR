(function($){
  'use strict';

  const config = window.NB_ADMIN || {};
  const __ = window.wp && window.wp.i18n && window.wp.i18n.__ ? window.wp.i18n.__ : value => value;
  let dirty = false;
  let mockupSaveTimer = null;
  let activeMockupId = '';
  let activeAreaIndex = 0;
  let canvas = null;
  let areaRect = null;

  function text(value){ return value == null ? '' : String(value); }
  function escapeHtml(value){
    return text(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
  }
  function markDirty(){
    dirty = true;
    $('.nb-save-state').text(__('Mentetlen módosítások','nb-designer')).addClass('is-dirty').removeClass('is-saving is-saved is-error');
  }
  function markSaving(){ $('.nb-save-state').text(__('Mentés…','nb-designer')).addClass('is-saving').removeClass('is-dirty is-saved is-error'); }
  function markSaved(){ dirty = false; $('.nb-save-state').text(__('Minden módosítás mentve','nb-designer')).addClass('is-saved').removeClass('is-dirty is-saving is-error'); }
  function markError(message){ $('.nb-save-state').text(message || __('A mentés nem sikerült','nb-designer')).addClass('is-error').removeClass('is-dirty is-saving is-saved'); }

  $(document).on('input change', '[data-dirty-form] :input', function(){
    if (!$(this).is('.nb-save-state')) markDirty();
  });
  $(document).on('submit', 'form', function(){ dirty = false; });
  window.addEventListener('beforeunload', function(event){
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  $('.nb-save-bar').each(function(){
    $('<button type="button" class="button-link nb-undo-last">'+escapeHtml(__('Visszavonás','nb-designer'))+'</button><a class="button-link" href="'+escapeHtml(config.historyUrl||'#')+'">'+escapeHtml(__('Előzmények','nb-designer'))+'</a>').insertBefore($(this).find('.nb-save-state'));
  });
  $(document).on('click','.nb-undo-last',async function(){
    if(!window.confirm(__('Visszaállítod az előző mentés előtti állapotot?','nb-designer')))return;
    markSaving();
    try{const response=await fetch(config.rest+'history/restore',{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':config.restNonce},body:JSON.stringify({index:0})});const data=await response.json();if(!response.ok)throw new Error(data.message||'Nincs visszaállítható előzmény.');dirty=false;window.location.reload();}catch(error){markError(error.message);}
  });

  // WooCommerce product search: only selected products live in the form/DOM.
  let productSearchTimer = null;
  $('#nb-product-search').on('input', function(){
    const term = $(this).val().trim();
    clearTimeout(productSearchTimer);
    if (term.length < 2) { $('#nb-product-search-results').empty(); return; }
    productSearchTimer = setTimeout(async function(){
      const spinner = $('.nb-search-control .spinner').addClass('is-active');
      try {
        const response = await fetch(config.rest + 'products?search=' + encodeURIComponent(term), {headers:{'X-WP-Nonce':config.restNonce}});
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Keresési hiba');
        const selected = new Set($('#nb-selected-products [data-product-id]').map(function(){ return String($(this).data('product-id')); }).get());
        const html = (data.items || []).filter(item => !selected.has(String(item.id))).map(item => '<button type="button" class="nb-product-result" data-id="'+Number(item.id)+'" data-title="'+escapeHtml(item.title)+'"><strong>'+escapeHtml(item.title)+'</strong><small>#'+Number(item.id)+'</small><span>Hozzáadás</span></button>').join('');
        $('#nb-product-search-results').html(html || '<p class="nb-search-empty">Nincs hozzáadható találat.</p>');
      } catch(error) {
        $('#nb-product-search-results').html('<p class="nb-search-error">'+escapeHtml(error.message)+'</p>');
      } finally { spinner.removeClass('is-active'); }
    }, 250);
  });
  $(document).on('click', '.nb-product-result', function(){
    const id = Number($(this).data('id'));
    const title = text($(this).data('title'));
    const card = $('<article class="nb-product-card" data-product-id="'+id+'"><input type="hidden" name="products[]" value="'+id+'"><div class="nb-product-thumb"><span class="dashicons dashicons-format-image"></span></div><div><strong>'+escapeHtml(title)+'</strong><small>#'+id+'</small></div><span class="nb-new-product-note">Mentés után szerkeszthető</span><button type="button" class="button-link-delete nb-remove-product">Eltávolítás</button></article>');
    $('#nb-selected-products').append(card);
    $(this).remove();
    $('#nb-selected-product-count').text($('#nb-selected-products [data-product-id]').length);
    markDirty();
  });
  $(document).on('click', '.nb-remove-product', function(){
    $(this).closest('.nb-product-card').remove();
    $('#nb-selected-product-count').text($('#nb-selected-products [data-product-id]').length);
    markDirty();
  });

  // Repeater and chip primitives.
  $(document).on('click', '.nb-remove-row', function(){ $(this).closest('.nb-repeater-row').remove(); markDirty(); });
  $(document).on('click', '.nb-add-row', function(){
    const target = $(this).data('target');
    const root = $('[data-repeater="'+target+'"]');
    const source = root.children('.nb-repeater-row').last();
    if (!source.length) return;
    const row = source.clone(false, false);
    row.find('input').each(function(){
      $(this).val($(this).attr('type') === 'color' ? '#d1d5db' : '');
    });
    row.find('select').val('');
    root.append(row);
    markDirty();
  });
  $(document).on('keydown', '.nb-chip-editor > input[type="text"]', function(event){
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const value = $(this).val().trim().replace(/,$/, '');
    if (!value) return;
    const editor = $(this).closest('.nb-chip-editor');
    const exists = editor.find('input[type="hidden"]').filter(function(){ return $(this).val().toLowerCase() === value.toLowerCase(); }).length;
    if (!exists) $('<span class="nb-chip"><input type="hidden" name="'+escapeHtml(editor.data('chip-name'))+'" value="'+escapeHtml(value)+'">'+escapeHtml(value)+'<button type="button" aria-label="Törlés">×</button></span>').insertBefore(this);
    $(this).val('');
    markDirty();
  });
  $(document).on('click', '.nb-chip button', function(){ $(this).closest('.nb-chip').remove(); markDirty(); });
  $('#nb-only-missing').on('change', function(){ $('.nb-matrix tbody tr').toggle(!this.checked); if (this.checked) $('.nb-matrix tbody tr.is-missing').show(); });
  $('#nb-fill-missing-front').on('click',function(){const id=$('#nb-bulk-mockup').val();if(!id)return;$('.nb-matrix tbody tr.is-missing').each(function(){const select=$(this).find('select[name^="mockup_id_"]');select.val(id).trigger('change');$(this).removeClass('is-missing');});markDirty();});
  $('#nb-apply-bulk-price').on('click',function(){const value=$('#nb-bulk-price').val();if(value==='')return;const rows=$('#nb-only-missing').is(':checked')?$('.nb-matrix tbody tr:visible'):$('.nb-matrix tbody tr');rows.find('input[name^="percm2_"]').val(value);markDirty();});
  $(document).on('keydown','.nb-matrix select',function(event){if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;const cells=$('.nb-matrix select:visible');const index=cells.index(this);if(index<0)return;const column=$(this).closest('td').index();let target=null;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){const row=$(this).closest('tr');target=row.find('select').eq(event.key==='ArrowLeft'?Math.max(0,row.find('select').index(this)-1):row.find('select').index(this)+1);}else{const nextRow=$(this).closest('tr')[event.key==='ArrowUp'?'prev':'next']();target=nextRow.children().eq(column).find('select');}if(target&&target.length){event.preventDefault();target.trigger('focus');}});

  function updateMockupSelectPreview(select){
    const option = select.options[select.selectedIndex];
    const url = option ? option.dataset.image : '';
    const preview = $(select).siblings('.nb-mockup-select-preview');
    preview.css('background-image', url ? 'url("'+String(url).replace(/["\\]/g, '\\$&')+'")' : '').toggleClass('has-image', !!url);
  }
  $('.nb-mockup-select select').each(function(){ updateMockupSelectPreview(this); }).on('change', function(){ updateMockupSelectPreview(this); });

  // Mockup library/editor.
  function readMockups(){ try { return JSON.parse($('#nb-mockups-json').val() || '[]'); } catch(error) { return []; } }
  function writeMockups(items, autosave){
    $('#nb-mockups-json').val(JSON.stringify(items));
    markDirty();
    if (autosave !== false) scheduleMockupSave();
  }
  function stableId(){
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint32Array(2); window.crypto.getRandomValues(bytes);
      return 'mck_' + Array.from(bytes).map(n => n.toString(36)).join('').slice(0, 12);
    }
    return 'mck_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function defaultArea(role){
    return {id:'area_'+role, role:role, label:role === 'front' ? 'Előlap' : (role === 'back' ? 'Hátlap' : 'Felület'), x:50, y:50, w:200, h:300, canvas_w:420, canvas_h:560, width_mm:300, height_mm:400, dpi:300};
  }
  function normalizeClientMockup(item){
    item = item && typeof item === 'object' ? item : {};
    item.id = /^mck_[a-z0-9_-]+$/i.test(text(item.id)) ? item.id : stableId();
    item.label = text(item.label || 'Új mockup');
    item.image_url = text(item.image_url);
    item.canvas_w = Math.max(1, Number(item.canvas_w) || 420);
    item.canvas_h = Math.max(1, Number(item.canvas_h) || 560);
    item.areas = Array.isArray(item.areas) && item.areas.length ? item.areas : [item.area || defaultArea('front')];
    item.areas = item.areas.map((area, index) => Object.assign(defaultArea(index === 0 ? 'front' : 'area-'+index), area || {}, {canvas_w:item.canvas_w, canvas_h:item.canvas_h}));
    item.guides = Object.assign({snap_to_grid:false,center_lines:true,safety_margin:true}, item.guides || {});
    item.area = item.areas[0];
    return item;
  }
  function usageCount(id){
    let count = 0;
    const catalog = config.settings && config.settings.catalog ? config.settings.catalog : {};
    Object.values(catalog).forEach(cfg => Object.values((cfg && cfg.map) || {}).forEach(entry => {
      if (entry && (entry.mockup_id === id || entry.mockup_back_id === id)) count++;
    }));
    return count;
  }
  function activeMockup(items){ return items.find(item => item.id === activeMockupId) || null; }
  function renderMockups(){
    if (!$('#nb-mockups-app').length) return;
    const items = readMockups().map(normalizeClientMockup);
    $('#nb-mockups-json').val(JSON.stringify(items));
    if (!activeMockupId && items.length) activeMockupId = items[0].id;
    const cards = items.map(item => '<button type="button" class="nb-mockup-card '+(item.id === activeMockupId ? 'is-active' : '')+'" data-id="'+escapeHtml(item.id)+'"><span class="nb-mockup-thumb">'+(item.image_url ? '<img src="'+escapeHtml(item.image_url)+'" alt="">' : '<span class="dashicons dashicons-format-image"></span>')+'</span><strong>'+escapeHtml(item.label)+'</strong><small>'+escapeHtml(item.id)+' · '+usageCount(item.id)+' párosítás</small></button>').join('');
    const current = activeMockup(items);
    $('#nb-mockups-app').html('<div class="nb-mockup-library"><div class="nb-mockup-grid">'+(cards || '<div class="nb-empty-state"><p>Még nincs mockup. Add hozzá az elsőt.</p></div>')+'</div><div class="nb-mockup-detail" id="nb-mockup-detail"></div></div>');
    if (current) renderMockupDetail(current, items);
  }
  function renderMockupDetail(item, items){
    activeAreaIndex = Math.min(activeAreaIndex, item.areas.length - 1);
    const area = item.areas[activeAreaIndex];
    const tabs = item.areas.map((entry, index) => '<button type="button" class="nb-area-tab '+(index===activeAreaIndex?'is-active':'')+'" data-index="'+index+'">'+escapeHtml(entry.label || entry.role)+'</button>').join('');
    $('#nb-mockup-detail').html('<div class="nb-detail-head"><div><p class="nb-eyebrow">'+escapeHtml(item.id)+' · '+usageCount(item.id)+' párosítás</p><input class="nb-detail-label" type="text" value="'+escapeHtml(item.label)+'" aria-label="Mockup neve"></div><div><button type="button" class="button nb-duplicate-mockup">Duplikálás</button> <button type="button" class="button nb-pick-mockup">Kép cseréje</button> <button type="button" class="button-link-delete nb-delete-mockup">Törlés</button></div></div><label class="nb-url-field"><span>Kép URL</span><input class="nb-detail-url" type="url" value="'+escapeHtml(item.image_url)+'"></label><div class="nb-area-tabs">'+tabs+'<button type="button" class="nb-add-area">+ Felület</button></div><div class="nb-mockup-editor"><div class="nb-canvas-wrap"><canvas id="nb-active-canvas" width="'+item.canvas_w+'" height="'+item.canvas_h+'"></canvas></div><div class="nb-area-fields"><label><span>Név</span><input data-area="label" value="'+escapeHtml(area.label)+'"></label><label><span>Szerep</span><select data-area="role"><option value="front" '+(area.role==='front'?'selected':'')+'>Előlap</option><option value="back" '+(area.role==='back'?'selected':'')+'>Hátlap</option><option value="sleeve" '+(area.role==='sleeve'?'selected':'')+'>Ujj</option><option value="custom" '+(!['front','back','sleeve'].includes(area.role)?'selected':'')+'>Egyéb</option></select></label><div class="nb-four-fields">'+['x','y','w','h'].map(key => '<label><span>'+key.toUpperCase()+' (px)</span><input type="number" min="0" data-area="'+key+'" value="'+Number(area[key]||0)+'"></label>').join('')+'</div><div class="nb-three-fields"><label><span>Szélesség (mm)</span><input type="number" min="1" step="0.1" data-area="width_mm" value="'+Number(area.width_mm||300)+'"></label><label><span>Magasság (mm)</span><input type="number" min="1" step="0.1" data-area="height_mm" value="'+Number(area.height_mm||400)+'"></label><label><span>DPI</span><input type="number" min="72" step="1" data-area="dpi" value="'+Number(area.dpi||300)+'"></label></div><fieldset class="nb-guide-fields"><legend>Segédvonalak</legend><label><input type="checkbox" data-guide="snap_to_grid" '+(item.guides.snap_to_grid?'checked':'')+'> Rácsra illesztés</label><label><input type="checkbox" data-guide="center_lines" '+(item.guides.center_lines?'checked':'')+'> Középvonalak</label><label><input type="checkbox" data-guide="safety_margin" '+(item.guides.safety_margin?'checked':'')+'> Biztonsági margó (5 mm)</label></fieldset><p class="nb-area-summary">'+((Number(area.width_mm||0)*Number(area.height_mm||0))/100).toLocaleString('hu-HU')+' cm²</p><button type="button" class="button-link-delete nb-delete-area" '+(item.areas.length===1?'disabled':'')+'>Felület törlése</button></div></div>');
    setupCanvas(item, area, items);
  }
  function setupCanvas(item, area, items){
    if (!window.fabric) return;
    if (canvas) canvas.dispose();
    canvas = new fabric.Canvas('nb-active-canvas', {preserveObjectStacking:true});
    canvas.setWidth(item.canvas_w); canvas.setHeight(item.canvas_h);
    if (item.image_url) fabric.Image.fromURL(item.image_url, image => {
      const scale = Math.min(canvas.width/image.width, canvas.height/image.height);
      image.scale(scale); image.selectable=false; image.evented=false; canvas.add(image); canvas.sendToBack(image); canvas.requestRenderAll();
    }, {crossOrigin:'anonymous'});
    areaRect = new fabric.Rect({left:Number(area.x)||0, top:Number(area.y)||0, width:Number(area.w)||1, height:Number(area.h)||1, fill:'rgba(245,158,11,.16)', stroke:'#f59e0b', strokeWidth:2, cornerStyle:'circle'});
    canvas.add(areaRect); canvas.setActiveObject(areaRect);
    if (item.guides.safety_margin) {
      const marginX=Math.max(1,(Number(area.w)||1)*(5/Math.max(1,Number(area.width_mm)||300))); const marginY=Math.max(1,(Number(area.h)||1)*(5/Math.max(1,Number(area.height_mm)||400)));
      canvas.add(new fabric.Rect({left:Number(area.x)+marginX,top:Number(area.y)+marginY,width:Math.max(1,Number(area.w)-2*marginX),height:Math.max(1,Number(area.h)-2*marginY),fill:'rgba(0,0,0,0)',stroke:'#b45309',strokeDashArray:[5,5],selectable:false,evented:false,excludeFromExport:true}));
    }
    if (item.guides.center_lines) {
      canvas.add(new fabric.Rect({left:Number(area.x)+Number(area.w)/2,top:Number(area.y),width:1,height:Number(area.h),fill:'#f59e0b',selectable:false,evented:false,excludeFromExport:true}));
      canvas.add(new fabric.Rect({left:Number(area.x),top:Number(area.y)+Number(area.h)/2,width:Number(area.w),height:1,fill:'#f59e0b',selectable:false,evented:false,excludeFromExport:true}));
    }
    canvas.setActiveObject(areaRect);
    canvas.on('object:modified', function(){
      const grid=item.guides.snap_to_grid?10:1; area.x=Math.round(areaRect.left/grid)*grid; area.y=Math.round(areaRect.top/grid)*grid; area.w=Math.max(1,Math.round((areaRect.width*areaRect.scaleX)/grid)*grid); area.h=Math.max(1,Math.round((areaRect.height*areaRect.scaleY)/grid)*grid); areaRect.set({left:area.x,top:area.y,width:area.w,height:area.h,scaleX:1,scaleY:1});
      writeMockups(items); renderMockupDetail(item, items);
    });
  }
  function scheduleMockupSave(){
    clearTimeout(mockupSaveTimer);
    mockupSaveTimer = setTimeout(async function(){
      if (!config.rest || !config.restNonce) return;
      markSaving();
      try {
        const response = await fetch(config.rest+'mockups', {method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':config.restNonce},body:JSON.stringify({mockups:readMockups()})});
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'A mentés nem sikerült.');
        $('#nb-mockups-json').val(JSON.stringify(data.mockups || []));
        if (config.settings) config.settings.mockups = data.mockups || [];
        markSaved();
      } catch(error) { markError(error.message); }
    }, 900);
  }
  $(document).on('click', '.nb-mockup-card', function(){ activeMockupId=text($(this).data('id')); activeAreaIndex=0; renderMockups(); });
  $('#nb-add-mockup').on('click', function(){ const items=readMockups(); const item=normalizeClientMockup({id:stableId(),label:'Új mockup',areas:[defaultArea('front')]}); items.push(item); activeMockupId=item.id; activeAreaIndex=0; writeMockups(items); renderMockups(); });
  $(document).on('input change', '.nb-detail-label,.nb-detail-url,[data-area]', function(){
    const items=readMockups(); const item=activeMockup(items); if(!item)return; const area=item.areas[activeAreaIndex];
    if ($(this).hasClass('nb-detail-label')) item.label=$(this).val(); else if($(this).hasClass('nb-detail-url')) item.image_url=$(this).val(); else { const key=$(this).data('area'); area[key]=['label','role'].includes(key)?$(this).val():Number($(this).val()); area.id='area_'+area.role; item.area=item.areas[0]; }
    writeMockups(items); if($(this).is('[data-area]') && !['label','role'].includes($(this).data('area'))) setupCanvas(item,area,items);
  });
  $(document).on('change','[data-guide]',function(){const items=readMockups();const item=activeMockup(items);if(!item)return;item.guides[$(this).data('guide')]=$(this).is(':checked');writeMockups(items);renderMockupDetail(item,items);});
  $(document).on('click', '.nb-area-tab', function(){ activeAreaIndex=Number($(this).data('index'))||0; const items=readMockups(); renderMockupDetail(activeMockup(items),items); });
  $(document).on('click', '.nb-add-area', function(){ const items=readMockups(); const item=activeMockup(items); if(!item)return; item.areas.push(defaultArea(item.areas.some(a=>a.role==='back')?'custom':'back')); activeAreaIndex=item.areas.length-1; writeMockups(items); renderMockupDetail(item,items); });
  $(document).on('click', '.nb-delete-area', function(){ const items=readMockups(); const item=activeMockup(items); if(!item||item.areas.length<2)return; item.areas.splice(activeAreaIndex,1); activeAreaIndex=0; item.area=item.areas[0]; writeMockups(items); renderMockupDetail(item,items); });
  $(document).on('click', '.nb-duplicate-mockup', function(){ const items=readMockups(); const item=activeMockup(items); if(!item)return; const clone=JSON.parse(JSON.stringify(item)); clone.id=stableId(); clone.label=item.label+' – másolat'; items.push(clone); activeMockupId=clone.id; activeAreaIndex=0; writeMockups(items); renderMockups(); });
  $(document).on('click', '.nb-delete-mockup', function(){ const items=readMockups(); const item=activeMockup(items); if(!item)return; const used=usageCount(item.id); if(!window.confirm(used ? 'Ezt a mockupot '+used+' párosítás használja. Biztosan törlöd?' : 'Biztosan törlöd ezt a mockupot?'))return; const next=items.filter(entry=>entry.id!==item.id); activeMockupId=next[0]?next[0].id:''; activeAreaIndex=0; writeMockups(next); renderMockups(); });
  $(document).on('click', '.nb-pick-mockup', function(){ const frame=wp.media({title:'Mockup kiválasztása',multiple:false}); frame.on('select',function(){ const attachment=frame.state().get('selection').first().toJSON(); const items=readMockups(); const item=activeMockup(items); if(!item)return; item.image_url=attachment.url; writeMockups(items); renderMockups(); }); frame.open(); });

  // Pricing validation and server-identical live calculator.
  function validateDiscounts(){
    const rows=$('[data-repeater="discounts"] .nb-repeater-row'); let previousMax=0; let validRowIndex=0; const errors=[];
    rows.each(function(index){ const fields=$(this).find('input'); const min=Number(fields.eq(0).val()); const max=Number(fields.eq(1).val()); const pct=Number(fields.eq(2).val()); if(!min&&!max&&!pct)return; if(min<1||pct<=0||pct>=100)errors.push((index+1)+'. sor: hibás határ vagy kedvezmény.'); if(validRowIndex&&previousMax===0)errors.push('A korlátlan sáv csak az utolsó lehet.'); else if(validRowIndex&&min<=previousMax)errors.push((index+1)+'. sor átfedi az előzőt.'); else if(validRowIndex&&min>previousMax+1)errors.push('Rés van a(z) '+(index+1)+'. sor előtt.'); previousMax=max; validRowIndex++; });
    $('.nb-validation-message').text(errors.join(' ')).toggleClass('is-error',!!errors.length);
    $('[data-pricing-form] button:not([type]),[data-pricing-form] button[type="submit"]').prop('disabled',!!errors.length);
    return !errors.length;
  }
  $(document).on('input', '[data-repeater="discounts"] input', validateDiscounts);
  let calculateTimer=null;
  function syncCalculatorOptions(){
    const productId=String($('[data-calc="product_id"]').val()||''); const catalog=(config.settings&&config.settings.catalog)||{}; const cfg=catalog[productId]||catalog[Number(productId)]||{};
    const typeSelect=$('[data-calc="type"]'); const colorSelect=$('[data-calc="color"]'); const sizeSelect=$('[data-calc="size"]');
    const previousType=typeSelect.val(); const types=Array.isArray(cfg.types)&&cfg.types.length?cfg.types:((config.settings&&config.settings.types)||[]); typeSelect.html(types.map(value=>'<option value="'+escapeHtml(text(value).trim().toLowerCase())+'">'+escapeHtml(value)+'</option>').join('')); if(types.some(value=>text(value).trim().toLowerCase()===previousType))typeSelect.val(previousType);
    const typeKey=typeSelect.val()||''; const colors=cfg.colors_by_type&&Array.isArray(cfg.colors_by_type[typeKey])?cfg.colors_by_type[typeKey]:(Array.isArray(cfg.colors)?cfg.colors:((config.settings&&config.settings.color_palette)||[])); colorSelect.html(colors.map(value=>'<option value="'+escapeHtml(text(value).trim().toLowerCase())+'">'+escapeHtml(value)+'</option>').join(''));
    const sizes=Array.isArray(cfg.sizes)?cfg.sizes:[]; sizeSelect.html(sizes.map(value=>'<option value="'+escapeHtml(value)+'">'+escapeHtml(value)+'</option>').join(''));
  }
  async function calculatePrice(){
    if(!$('#nb-price-breakdown').length||!config.rest)return;
    const product=$('[data-calc="product_id"] option:selected');
    const payload={product_id:Number(product.val()||0),product_price:Number(product.data('price')||0),type:$('[data-calc="type"]').val()||'',color:$('[data-calc="color"]').val()||'',size:$('[data-calc="size"]').val()||'',quantity:Number($('[data-calc="quantity"]').val()||1),two_sided:$('[data-calc="two_sided"]').is(':checked')};
    try{ const response=await fetch(config.rest+'calculate',{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':config.restNonce},body:JSON.stringify(payload)}); const data=await response.json(); if(!response.ok)throw new Error(data.message||'Számítási hiba'); const money=value=>Number(value||0).toLocaleString('hu-HU')+' Ft'; $('#nb-price-breakdown').html('<dl><div><dt>Termék alapára</dt><dd>'+money(data.base_product)+'</dd></div><div><dt>Méretfelár</dt><dd>'+money(data.size_fee)+'</dd></div><div><dt>Nyomás · '+Number(data.area_cm2).toLocaleString('hu-HU')+' cm² × '+data.per_cm2+' Ft</dt><dd>'+money(data.print_fee)+'</dd></div><div><dt>Kétoldalas</dt><dd>'+money(data.double_fee)+'</dd></div><div><dt>Kedvezmény · '+data.discount_percent+'%</dt><dd>−'+money(data.discount)+'</dd></div><div class="is-total"><dt>Egységár</dt><dd>'+money(data.unit_total)+'</dd></div><div class="is-grand-total"><dt>'+data.quantity+' db összesen</dt><dd>'+money(data.total)+'</dd></div></dl>'+(data.uses_fallback_area?'<p class="nb-calc-warning">⚠ A mockup fizikai mérete hiányzik; alapértékkel számoltunk.</p>':'')); }catch(error){ $('#nb-price-breakdown').html('<p class="nb-search-error">'+escapeHtml(error.message)+'</p>'); }
  }
  $(document).on('change','[data-calc="product_id"],[data-calc="type"]',function(){syncCalculatorOptions();});
  $(document).on('input change','[data-calc]',function(){clearTimeout(calculateTimer);calculateTimer=setTimeout(calculatePrice,150);});

  // Font preview.
  function updateFontPreviews(){ $('#nb-fonts .nb-font').each(function(index){ const url=$(this).find('input').val(); if(!url)return; const family='nb-admin-font-'+index; let style=document.getElementById(family); if(!style){style=document.createElement('style');style.id=family;document.head.appendChild(style);} style.textContent='@font-face{font-family:"'+family+'";src:url("'+String(url).replace(/["\\]/g,'\\$&')+'") format("woff2");font-display:swap}'; $(this).find('.nb-font-preview').css('font-family',family+',sans-serif'); }); }
  $(document).on('input','#nb-fonts input',updateFontPreviews);
  $(document).on('click','#nb-add-font',function(){ $('#nb-fonts').append('<div class="nb-font"><input type="url" name="fonts[]" value=""><span class="nb-font-preview">Árvíztűrő tükörfúrógép</span><button type="button" class="button nb-remove-font">Eltávolítás</button></div>');markDirty(); });
  $(document).on('click','.nb-remove-font',function(){$(this).closest('.nb-font').remove();markDirty();});

  function renderUploadPreviews(files){
    const root=$('#nb-upload-previews').empty();
    Array.from(files||[]).forEach(file=>{ const url=URL.createObjectURL(file); const item=$('<figure><img alt=""><figcaption></figcaption></figure>'); item.find('img').attr('src',url).on('load',()=>URL.revokeObjectURL(url)); item.find('figcaption').text(file.name); root.append(item); });
  }
  $('#template_images').on('change',function(){renderUploadPreviews(this.files);});
  $('.nb-upload-dropzone').on('dragover dragenter',function(event){event.preventDefault();$(this).addClass('is-dragging');}).on('dragleave drop',function(event){event.preventDefault();$(this).removeClass('is-dragging');if(event.type==='drop'&&event.originalEvent.dataTransfer){const input=document.getElementById('template_images');input.files=event.originalEvent.dataTransfer.files;renderUploadPreviews(input.files);}});

  if ($('#nb-mockups-app').length) renderMockups();
  if ($('[data-repeater="discounts"]').length) validateDiscounts();
  if ($('#nb-price-breakdown').length) { if(!$('[data-calc="size"]').length)$('<label><span>Méret</span><select data-calc="size"></select></label>').insertBefore($('[data-calc="quantity"]').closest('label')); syncCalculatorOptions(); calculatePrice(); }
  if ($('#nb-fonts').length) updateFontPreviews();
})(jQuery);
