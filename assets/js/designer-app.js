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

  function currentSelection(){
    const pid = parseInt(productSel.value||0, 10);
    const type = typeSel.value||'';
    const color = colorSel.value||'';
    const cfg = getCatalog()[pid] || {};
    const key = (type+'|'+color).toLowerCase();
    const mapping = (cfg.map||{})[key] || {};
    const mk = mockups()[parseInt(mapping.mockup_index||-1, 10)] || null;
    return {pid, type, color, cfg, mapping, mockup: mk};
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
    typeSel.innerHTML='';
    types().forEach(t=>{ const o=document.createElement('option'); o.value=t.toLowerCase(); o.textContent=t; typeSel.appendChild(o); });
  }

  function populateProducts(){
    const cat = getCatalog();
    productSel.innerHTML='';
    (productList()).forEach(pid=>{
      const o=document.createElement('option');
      o.value=pid; o.textContent=(cat[pid]?.title||('Termék #'+pid));
      productSel.appendChild(o);
    });
  }

  function populateColorsSizes(){
    const pid = parseInt(productSel.value||0, 10);
    const cfg = getCatalog()[pid] || {};
    colorSel.innerHTML=''; sizeSel.innerHTML='';
    (cfg.colors||[]).forEach(cn=>{ const o=document.createElement('option'); o.value=cn.toLowerCase(); o.textContent=cn; colorSel.appendChild(o); });
    (cfg.sizes||[]).forEach(sz=>{ const o=document.createElement('option'); o.value=sz; o.textContent=sz; sizeSel.appendChild(o); });
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
      fill: '',
      stroke: '#888',
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

  typeSel.onchange = ()=>{ setMockupBgAndArea(); };
  productSel.onchange = ()=>{ populateColorsSizes(); setMockupBgAndArea(); };
  colorSel.onchange = ()=>{ setMockupBgAndArea(); };

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
