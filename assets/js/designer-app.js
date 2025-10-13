(function(){
  const settings = (typeof NB_DESIGNER!=='undefined' && NB_DESIGNER.settings) ? NB_DESIGNER.settings : {};
  const c = new fabric.Canvas('nb-canvas',{preserveObjectStacking:true, backgroundColor:'#fff'});

  function getCatalog(){ return settings.catalog || {}; }
  function productList(){ return settings.products || []; }
  function mockups(){ return settings.mockups || []; }
  function types(){ return settings.types || ['Póló','Pulóver']; }

  const typeSel=document.getElementById('nb-type');
  const productSel=document.getElementById('nb-product');
  const colorSel=document.getElementById('nb-color');
  const sizeSel=document.getElementById('nb-size');

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
    const pid = parseInt(productSel.value||0);
    const cfg = getCatalog()[pid] || {};
    colorSel.innerHTML=''; sizeSel.innerHTML='';
    (cfg.colors||[]).forEach(cn=>{ const o=document.createElement('option'); o.value=cn.toLowerCase(); o.textContent=cn; colorSel.appendChild(o); });
    (cfg.sizes||[]).forEach(sz=>{ const o=document.createElement('option'); o.value=sz; o.textContent=sz; sizeSel.appendChild(o); });
  }

  function getAreaForCurrent(){
    const pid = parseInt(productSel.value||0);
    const type = typeSel.value||'';
    const color = colorSel.value||'';
    const cfg = getCatalog()[pid] || {};
    const key = (type+'|'+color).toLowerCase();
    const m = (cfg.map||{})[key] || {};
    const mk = mockups()[parseInt(m.mockup_index||-1)] || null;
    return mk && mk.area ? mk.area : {x:100,y:150,w:500,h:600};
  }

  function setMockupBgAndArea(){
    const pid = parseInt(productSel.value||0);
    const type = typeSel.value||'';
    const color = colorSel.value||'';
    const cfg = getCatalog()[pid] || {};
    const key = (type+'|'+color).toLowerCase();
    const m = (cfg.map||{})[key] || {};
    const mk = mockups()[parseInt(m.mockup_index||-1)] || null;

    // remove existing bg images
    c.getObjects('image').forEach(img=>{ if(img.__nb_bg) c.remove(img); });
    if (mk && mk.image_url){
      fabric.Image.fromURL(mk.image_url, img=>{
        const scale = Math.min(c.width / img.width, c.height / img.height);
        img.scale(scale); img.selectable=false; img.__nb_bg=true; c.add(img); c.sendToBack(img);
      }, {crossOrigin:'anonymous'});
    }

    // draw/refresh print area
    c.getObjects('rect').forEach(r=>{ if(r.__nb_area){ c.remove(r); } });
    const area = mk && mk.area ? mk.area : {x:100,y:150,w:500,h:600};
    const printArea = new fabric.Rect({left:area.x, top:area.y, width:area.w, height:area.h, fill:'', stroke:'#888', strokeDashArray:[5,5], selectable:false, evented:false});
    printArea.__nb_area=true; c.add(printArea); c.sendToBack(printArea);
    c.__nb_area = area;
    c.requestRenderAll();
  }

  function constrainToArea(obj){
    const a = c.__nb_area || {x:100,y:150,w:500,h:600};
    const minLeft = a.x;
    const minTop  = a.y;
    const maxLeft = a.x + a.w - obj.getScaledWidth();
    const maxTop  = a.y + a.h - obj.getScaledHeight();
    if (obj.left < minLeft) obj.left = minLeft;
    if (obj.top  < minTop)  obj.top  = minTop;
    if (obj.left > maxLeft) obj.left = maxLeft;
    if (obj.top  > maxTop)  obj.top  = maxTop;
  }

  // Apply constraints on move/scale
  c.on('object:moving', e=>{ const o=e.target; if(!o || o.__nb_bg) return; constrainToArea(o); });
  c.on('object:scaling', e=>{ const o=e.target; if(!o || o.__nb_bg) return; constrainToArea(o); });

  // Initial populate
  populateTypes();
  populateProducts();
  populateColorsSizes();
  setMockupBgAndArea();

  typeSel.onchange = ()=>{ setMockupBgAndArea(); };
  productSel.onchange = ()=>{ populateColorsSizes(); setMockupBgAndArea(); };
  colorSel.onchange = ()=>{ setMockupBgAndArea(); };

  // Tools
  document.getElementById('nb-add-text').onclick = () => {
    const a = c.__nb_area || {x:100,y:150,w:500,h:600};
    const t = new fabric.Textbox('Saját szöveg',{fill:'#000', fontSize:48, left:a.x+10, top:a.y+10});
    c.add(t).setActiveObject(t); c.requestRenderAll();
  };
  document.getElementById('nb-upload').onchange = e=>{
    const f=e.target.files[0]; if(!f) return;
    const url=URL.createObjectURL(f);
    fabric.Image.fromURL(url, img=>{
      const a = c.__nb_area || {x:100,y:150,w:500,h:600};
      // scale to fit if larger than area
      const maxW=a.w*0.9, maxH=a.h*0.9;
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      img.scale(scale);
      img.set({left:a.x + (a.w - img.getScaledWidth())/2, top:a.y + (a.h - img.getScaledHeight())/2, selectable:true, cornerStyle:'circle'});
      c.add(img); c.setActiveObject(img); c.requestRenderAll();
    });
  };

  let savedDesignId=null;
  document.getElementById('nb-save').onclick = async ()=>{
    const png = c.toDataURL({format:'png', multiplier:2, left:0, top:0});
    const pid = parseInt(productSel.value||0);
    const type = typeSel.value||'';
    const color = colorSel.value||'';
    const size  = sizeSel.value||'';
    const price_ctx = {product_id:pid, type, color, size};
    const meta={width_mm:300, height_mm:400, dpi:300, product_id:pid, attributes_json:{pa_type:type, pa_color: color, pa_size: size}, price_ctx};
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
