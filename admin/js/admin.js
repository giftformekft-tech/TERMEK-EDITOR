(function($){
  // Fonts repeater
  $(document).on('click','#nb-add-font', function(e){
    e.preventDefault();
    $('#nb-fonts').append('<div class="nb-font"><input type="text" name="fonts[]" value="" size="80"> <button class="button nb-remove-font">Eltávolítás</button></div>');
  });
  $(document).on('click','.nb-remove-font', function(e){
    e.preventDefault(); $(this).closest('.nb-font').remove();
  });

  // Mockup editor
  function readMockups(){
    try{ return JSON.parse($('#nb-mockups-json').val()||'[]'); }catch(e){ return []; }
  }
  function writeMockups(arr){
    $('#nb-mockups-json').val(JSON.stringify(arr));
  }
  function renderMockups(){
    const arr = readMockups();
    const root = $('#nb-mockups-app').empty();
    arr.forEach((m,i)=>{
      const id='nb-canvas-'+i;
      const html = `
        <div class="nb-mockup">
          <div class="nb-row">
            <label>Címke: <input class="nb-label" data-i="${i}" type="text" value="${m.label||''}"></label>
            <label>Kép URL: <input class="nb-url" data-i="${i}" type="text" value="${m.image_url||''}" size="60"></label>
            <button class="button nb-pick" data-i="${i}">Média...</button>
            <button class="button nb-del" data-i="${i}">Törlés</button>
          </div>
          <div class="nb-editor">
            <canvas id="${id}" width="420" height="560"></canvas>
            <div class="nb-fields">
              <label>X: <input class="nb-x" data-i="${i}" type="number" value="${m.area?.x||50}"></label>
              <label>Y: <input class="nb-y" data-i="${i}" type="number" value="${m.area?.y||50}"></label>
              <label>W: <input class="nb-w" data-i="${i}" type="number" value="${m.area?.w||200}"></label>
              <label>H: <input class="nb-h" data-i="${i}" type="number" value="${m.area?.h||300}"></label>
              <button class="button nb-apply" data-i="${i}">Alkalmaz</button>
            </div>
          </div>
        </div>`;
      root.append(html);
      setupCanvas(i,id);
    });
  }
  function setupCanvas(i,id){
    const arr=readMockups(); const m=arr[i]||{};
    const canvas = new fabric.Canvas(id,{preserveObjectStacking:true});
    if (m.image_url){
      fabric.Image.fromURL(m.image_url, img=>{
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        img.scale(scale); img.selectable=false; canvas.add(img); canvas.sendToBack(img);
      }, {crossOrigin:'anonymous'});
    }
    const r = new fabric.Rect({left:(m.area?.x||50), top:(m.area?.y||50), width:(m.area?.w||200), height:(m.area?.h||300), fill:'rgba(255,255,0,0.15)', stroke:'#f90', strokeWidth:2, cornerStyle:'circle'});
    r.__nb_area=true; canvas.add(r); canvas.setActiveObject(r);
    canvas.on('object:modified', ()=>{
      arr[i].area={x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width*r.scaleX),h:Math.round(r.height*r.scaleY)};
      writeMockups(arr);
    });
    $(document).on('click',`.nb-apply[data-i="${i}"]`, function(e){
      e.preventDefault();
      const a=arr[i].area||{x:50,y:50,w:200,h:300};
      a.x = parseInt($(`.nb-x[data-i="${i}"]`).val()||a.x,10);
      a.y = parseInt($(`.nb-y[data-i="${i}"]`).val()||a.y,10);
      a.w = parseInt($(`.nb-w[data-i="${i}"]`).val()||a.w,10);
      a.h = parseInt($(`.nb-h[data-i="${i}"]`).val()||a.h,10);
      arr[i].area=a; writeMockups(arr);
      r.set({left:a.x, top:a.y, scaleX:1, scaleY:1, width:a.w, height:a.h}); canvas.requestRenderAll();
    });
  }
  $(document).on('click','#nb-add-mockup', function(e){
    e.preventDefault();
    const arr=readMockups();
    arr.push({id: Date.now(), label:'Új mockup', image_url:'', area:{x:50,y:50,w:200,h:300}});
    writeMockups(arr); renderMockups();
  });
  $(document).on('click','.nb-del', function(e){
    e.preventDefault();
    const i=parseInt($(this).data('i'),10);
    const arr=readMockups(); arr.splice(i,1); writeMockups(arr); renderMockups();
  });
  $(document).on('click','.nb-pick', function(e){
    e.preventDefault();
    const i=parseInt($(this).data('i'),10);
    const frame = wp.media({title:'Mockup kiválasztása', multiple:false});
    frame.on('select', function(){
      const att = frame.state().get('selection').first().toJSON();
      const arr=readMockups(); arr[i].image_url = att.url; writeMockups(arr); renderMockups();
    });
    frame.open();
  });
  $(document).on('input','.nb-label, .nb-url, .nb-x, .nb-y, .nb-w, .nb-h', function(){
    const i=parseInt($(this).data('i'),10);
    const arr=readMockups(); const m=arr[i]||{};
    if ($(this).hasClass('nb-label')) m.label = $(this).val();
    if ($(this).hasClass('nb-url'))   m.image_url = $(this).val();
    if (!m.area) m.area={x:50,y:50,w:200,h:300};
    writeMockups(arr);
  });

  if ($('#nb-mockups-app').length){ renderMockups(); }
})(jQuery);
