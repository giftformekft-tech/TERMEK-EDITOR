(function (blocks, blockEditor, components, element, serverSideRender) {
  'use strict';

  var el = element.createElement;
  var Fragment = element.Fragment;
  var InspectorControls = blockEditor.InspectorControls;
  var MediaUpload = blockEditor.MediaUpload;
  var MediaUploadCheck = blockEditor.MediaUploadCheck;
  var PanelBody = components.PanelBody;
  var ColorPalette = components.ColorPalette;
  var Button = components.Button;
  var TextControl = components.TextControl;
  var ServerSideRender = serverSideRender && (serverSideRender.default || serverSideRender);

  function MediaSlot(props) {
    var url = props.attributes[props.urlKey] || '';
    var id = props.attributes[props.idKey] || 0;
    var alt = props.attributes[props.altKey] || '';
    var update = props.setAttributes;

    return el(Fragment, null,
      el('h4', null, props.title),
      url
        ? el('img', { src: url, alt: alt, style: { display: 'block', maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', marginBottom: '12px' } })
        : el('p', null, 'Nincs kép kiválasztva. Átlátszó hátterű PNG ajánlott.'),
      el(MediaUploadCheck, null,
        el(MediaUpload, {
          allowedTypes: ['image'],
          value: id,
          onSelect: function (media) {
            var next = {};
            next[props.idKey] = Number(media.id) || 0;
            next[props.urlKey] = media.url || '';
            next[props.altKey] = media.alt || props.defaultAlt;
            update(next);
          },
          render: function (mediaProps) {
            return el(Button, { variant: 'secondary', onClick: mediaProps.open }, url ? 'PNG cseréje' : 'PNG kiválasztása');
          }
        })
      ),
      url && el(Button, {
        variant: 'tertiary',
        isDestructive: true,
        onClick: function () {
          var next = {};
          next[props.idKey] = 0;
          next[props.urlKey] = '';
          update(next);
        }
      }, 'Kép eltávolítása'),
      el(TextControl, {
        label: 'Helyettesítő szöveg',
        value: alt,
        onChange: function (value) {
          var next = {};
          next[props.altKey] = value;
          update(next);
        }
      })
    );
  }

  blocks.registerBlockType('nano-banana/teamwear-landing', {
    apiVersion: 2,
    title: 'Csapatpóló landing oldal',
    description: 'Professzionális csapatpóló és munkaruha oldal kedvezményekkel és kabalafigurákkal.',
    icon: 'groups',
    category: 'widgets',
    supports: { align: ['wide', 'full'], html: false },
    attributes: {
      inkColor: { type: 'string', default: '#17191c' },
      paperColor: { type: 'string', default: '#f5f2eb' },
      accentColor: { type: 'string', default: '#f2d04f' },
      finalColor: { type: 'string', default: '#397fc2' },
      heroMascotId: { type: 'number', default: 0 },
      heroMascotUrl: { type: 'string', default: '' },
      heroMascotAlt: { type: 'string', default: 'Céges kabalafigura' },
      discountMascotId: { type: 'number', default: 0 },
      discountMascotUrl: { type: 'string', default: '' },
      discountMascotAlt: { type: 'string', default: 'Céges kabalafigura a kedvezmények mellett' },
      finalMascotId: { type: 'number', default: 0 },
      finalMascotUrl: { type: 'string', default: '' },
      finalMascotAlt: { type: 'string', default: 'Céges kabalafigura' }
    },

    edit: function (props) {
      var attributes = props.attributes;
      var setAttributes = props.setAttributes;

      return el(Fragment, null,
        el(InspectorControls, null,
          el(PanelBody, { title: 'Oldal színei', initialOpen: true },
            el('p', null, 'Sötét alapszín'),
            el(ColorPalette, { value: attributes.inkColor, clearable: false, onChange: function (value) { setAttributes({ inkColor: value || '#17191c' }); } }),
            el('p', null, 'Világos háttér'),
            el(ColorPalette, { value: attributes.paperColor, clearable: false, onChange: function (value) { setAttributes({ paperColor: value || '#f5f2eb' }); } }),
            el('p', null, 'Kiemelő szín'),
            el(ColorPalette, { value: attributes.accentColor, clearable: false, onChange: function (value) { setAttributes({ accentColor: value || '#f2d04f' }); } }),
            el('p', null, 'Záró szekció színe'),
            el(ColorPalette, { value: attributes.finalColor, clearable: false, onChange: function (value) { setAttributes({ finalColor: value || '#397fc2' }); } })
          ),
          el(PanelBody, { title: 'Kabalafigurák', initialOpen: true },
            el(MediaSlot, {
              title: '1. Nyitó szekció', attributes: attributes, setAttributes: setAttributes,
              idKey: 'heroMascotId', urlKey: 'heroMascotUrl', altKey: 'heroMascotAlt', defaultAlt: 'Céges kabalafigura'
            }),
            el(MediaSlot, {
              title: '2. Kedvezmények mellett', attributes: attributes, setAttributes: setAttributes,
              idKey: 'discountMascotId', urlKey: 'discountMascotUrl', altKey: 'discountMascotAlt', defaultAlt: 'Céges kabalafigura a kedvezmények mellett'
            }),
            el(MediaSlot, {
              title: '3. Záró felhívás', attributes: attributes, setAttributes: setAttributes,
              idKey: 'finalMascotId', urlKey: 'finalMascotUrl', altKey: 'finalMascotAlt', defaultAlt: 'Céges kabalafigura'
            })
          )
        ),
        ServerSideRender
          ? el(ServerSideRender, { block: 'nano-banana/teamwear-landing', attributes: attributes })
          : el('p', null, 'Az oldal előnézete a mentés után jelenik meg.')
      );
    },

    save: function () { return null; }
  });
})(window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.serverSideRender);
