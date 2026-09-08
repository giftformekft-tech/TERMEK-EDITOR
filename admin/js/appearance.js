(function(){
  'use strict';

  var form = document.querySelector('.nb-appearance-form');
  if (!form) return;

  var preview = document.getElementById('nb-appearance-preview');
  var defaults = {};
  try {
    defaults = JSON.parse(form.getAttribute('data-appearance-defaults') || '{}');
  } catch (error) {
    defaults = {};
  }

  function applyToken(key, value){
    if (!preview) return;
    var cssKey = '--nb-' + key.replace(/_/g, '-');
    preview.style.setProperty(cssKey, key === 'radius' ? String(parseInt(value, 10) || 0) + 'px' : value);
  }

  function syncField(field){
    if (!field) return;
    var key = field.getAttribute('data-appearance-key');
    applyToken(key, field.value);
    if (key === 'radius') {
      var output = form.querySelector('[data-appearance-radius-output]');
      if (output) output.textContent = String(parseInt(field.value, 10) || 0) + ' px';
    } else {
      var code = field.parentNode.querySelector('code');
      if (code) code.textContent = field.value;
    }
  }

  function refresh(){
    var fields = form.querySelectorAll('[data-appearance-key]');
    for (var i = 0; i < fields.length; i++) syncField(fields[i]);
  }

  ['input', 'change'].forEach(function(type){
    form.addEventListener(type, function(event){
      if (event.target.matches('[data-appearance-key]')) syncField(event.target);
    });
  });
  form.querySelector('[data-appearance-reset]').addEventListener('click', function(){
    var fields = form.querySelectorAll('[data-appearance-key]');
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-appearance-key');
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        fields[i].value = defaults[key];
        fields[i].dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });

  refresh();
})();
