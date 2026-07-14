(function (blocks, blockEditor, components, element, i18n) {
  'use strict';

  var el = element.createElement;
  var registerBlockType = blocks.registerBlockType;
  var InspectorControls = blockEditor.InspectorControls;
  var RichText = blockEditor.RichText;
  var PanelBody = components.PanelBody;
  var ToggleControl = components.ToggleControl;
  var TextControl = components.TextControl;
  var SelectControl = components.SelectControl;
  var ColorPalette = components.ColorPalette;
  var Button = components.Button;
  var MediaUpload = blockEditor.MediaUpload;
  var MediaUploadCheck = blockEditor.MediaUploadCheck;
  var types = (window.NB_HOME_BLOCK && Array.isArray(window.NB_HOME_BLOCK.types))
    ? window.NB_HOME_BLOCK.types
    : [];

  function TypeCards(props) {
    var hidden = props.hiddenTypeKeys || [];
    var visible = types.filter(function (type) {
      return hidden.indexOf(type.key) === -1;
    });

    if (!visible.length) {
      return el('p', { className: 'nb-home-showcase__empty' }, 'Jelenleg nincs megjeleníthető terméktípus.');
    }

    return el('div', { className: 'nb-home-products' }, visible.map(function (type) {
      return el('article', { className: 'nb-home-product', key: type.key },
        el('div', { className: 'nb-home-product__image' },
          type.image
            ? el('img', { src: type.image, alt: type.label })
            : el('div', { className: 'nb-home-product__placeholder', 'aria-hidden': true }, '◆')
        ),
        el('div', { className: 'nb-home-product__body' },
          el('div', null,
            el('h3', null, type.label),
            type.price ? el('p', { className: 'nb-home-product__price' }, type.price) : null
          ),
          el('span', { className: 'nb-home-product__link' }, 'Tervezd meg →')
        )
      );
    }));
  }

  registerBlockType('nano-banana/designer-showcase', {
    apiVersion: 2,
    title: 'Egyedi terméktervező – főoldali blokk',
    description: 'Tervezhető termékek és csapatruházati ajánlat megjelenítése.',
    icon: 'art',
    category: 'widgets',
    keywords: ['terméktervező', 'póló', 'csapatruha'],
    supports: { align: ['wide', 'full'], html: false },
    attributes: {
      eyebrow: { type: 'string', default: 'ALKOSS VALAMI SAJÁTOT' },
      heading: { type: 'string', default: 'Válassz terméket, és tervezd meg' },
      intro: { type: 'string', default: 'Tölts fel képet vagy logót, adj hozzá szöveget, és nézd meg az eredményt azonnal.' },
      hiddenTypeKeys: { type: 'array', default: [], items: { type: 'string' } },
      showTeamSection: { type: 'boolean', default: true },
      teamEyebrow: { type: 'string', default: 'CSAPATOKNAK ÉS CÉGEKNEK' },
      teamHeading: { type: 'string', default: 'Egységes megjelenés, kedvezőbb darabár' },
      teamText: { type: 'string', default: 'Csapatpóló, logózott munkaruha vagy rendezvényruha? Tervezd meg egyszer, válaszd ki a méreteket, és rendelj mennyiségi kedvezménnyel. Minél többet rendelsz, annál többet spórolsz.' },
      teamButtonText: { type: 'string', default: 'Csapatruhát tervezek' },
      teamButtonUrl: { type: 'string', default: '' },
      inkColor: { type: 'string', default: '#171717' },
      paperColor: { type: 'string', default: '#f5f1e8' },
      accentColor: { type: 'string', default: '#f4d35e' },
      mascotId: { type: 'number', default: 0 },
      mascotUrl: { type: 'string', default: '' },
      mascotAlt: { type: 'string', default: 'Céges kabalafigura' },
      mascotPosition: { type: 'string', default: 'right' }
    },

    edit: function (props) {
      var attributes = props.attributes;
      var setAttributes = props.setAttributes;
      var hidden = attributes.hiddenTypeKeys || [];

      function setTypeVisible(typeKey, visible) {
        var next = hidden.filter(function (hiddenKey) { return hiddenKey !== typeKey; });
        if (!visible) next.push(typeKey);
        setAttributes({ hiddenTypeKeys: next });
      }

      return el(element.Fragment, null,
        el(InspectorControls, null,
          el(PanelBody, { title: 'Blokk színei', initialOpen: true },
            el('p', null, 'Sötét alapszín'),
            el(ColorPalette, {
              value: attributes.inkColor,
              clearable: false,
              onChange: function (value) { setAttributes({ inkColor: value || '#171717' }); }
            }),
            el('p', null, 'Termékkártyák háttérszíne'),
            el(ColorPalette, {
              value: attributes.paperColor,
              clearable: false,
              onChange: function (value) { setAttributes({ paperColor: value || '#f5f1e8' }); }
            }),
            el('p', null, 'Kiemelő szín'),
            el(ColorPalette, {
              value: attributes.accentColor,
              clearable: false,
              onChange: function (value) { setAttributes({ accentColor: value || '#f4d35e' }); }
            })
          ),
          el(PanelBody, { title: 'Kabalafigura PNG', initialOpen: false },
            attributes.mascotUrl
              ? el('img', { src: attributes.mascotUrl, alt: attributes.mascotAlt || '', style: { maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' } })
              : el('p', null, 'Tölts fel egy átlátszó hátterű PNG kabalafigurát.'),
            el(MediaUploadCheck, null,
              el(MediaUpload, {
                allowedTypes: ['image'],
                value: attributes.mascotId,
                onSelect: function (media) {
                  setAttributes({ mascotId: Number(media.id) || 0, mascotUrl: media.url || '', mascotAlt: media.alt || 'Céges kabalafigura' });
                },
                render: function (mediaProps) {
                  return el(Button, { variant: 'secondary', onClick: mediaProps.open }, attributes.mascotUrl ? 'PNG cseréje' : 'PNG kiválasztása');
                }
              })
            ),
            attributes.mascotUrl && el(Button, {
              variant: 'tertiary',
              isDestructive: true,
              onClick: function () { setAttributes({ mascotId: 0, mascotUrl: '' }); }
            }, 'Kabala eltávolítása'),
            el(TextControl, {
              label: 'Helyettesítő szöveg',
              value: attributes.mascotAlt || '',
              onChange: function (value) { setAttributes({ mascotAlt: value }); }
            }),
            el(SelectControl, {
              label: 'Kabala pozíciója',
              value: attributes.mascotPosition || 'right',
              options: [{ label: 'Jobb oldal', value: 'right' }, { label: 'Bal oldal', value: 'left' }],
              onChange: function (value) { setAttributes({ mascotPosition: value }); }
            })
          ),
          el(PanelBody, { title: 'Megjelenített terméktípusok', initialOpen: true },
            types.length
              ? types.map(function (type) {
                  return el(ToggleControl, {
                    key: type.key,
                    label: type.label,
                    checked: hidden.indexOf(type.key) === -1,
                    onChange: function (checked) { setTypeVisible(type.key, checked); }
                  });
                })
              : el('p', null, 'Előbb vegyél fel terméktípusokat a Terméktervező beállításaiban.')
          ),
          el(PanelBody, { title: 'Csapatok és munkaruha', initialOpen: false },
            el(ToggleControl, {
              label: 'Csapatruházati rész megjelenítése',
              checked: attributes.showTeamSection,
              onChange: function (value) { setAttributes({ showTeamSection: value }); }
            }),
            el(TextControl, {
              label: 'Gomb egyedi hivatkozása',
              help: 'Ha üres, a külön csapatpóló oldalra mutat.',
              value: attributes.teamButtonUrl || '',
              onChange: function (value) { setAttributes({ teamButtonUrl: value }); }
            })
          )
        ),
        el('section', {
          className: 'nb-home-showcase',
          style: { '--nb-ink': attributes.inkColor, '--nb-paper': attributes.paperColor, '--nb-accent': attributes.accentColor }
        },
          attributes.showTeamSection && el('div', {
            className: 'nb-home-team' + (attributes.mascotUrl ? ' has-mascot mascot-' + (attributes.mascotPosition || 'right') : '')
          },
            attributes.mascotUrl && el('img', {
              className: 'nb-home-team__mascot is-' + (attributes.mascotPosition || 'right'),
              src: attributes.mascotUrl,
              alt: attributes.mascotAlt || ''
            }),
            el('div', { className: 'nb-home-team__copy' },
              el(RichText, {
                tagName: 'p', className: 'nb-home-eyebrow', value: attributes.teamEyebrow,
                allowedFormats: [], onChange: function (value) { setAttributes({ teamEyebrow: value }); }
              }),
              el(RichText, {
                tagName: 'h2', value: attributes.teamHeading,
                allowedFormats: [], onChange: function (value) { setAttributes({ teamHeading: value }); }
              }),
              el(RichText, {
                tagName: 'p', className: 'nb-home-team__text', value: attributes.teamText,
                allowedFormats: [], onChange: function (value) { setAttributes({ teamText: value }); }
              }),
              el(RichText, {
                tagName: 'span', className: 'nb-home-button nb-home-button--light', value: attributes.teamButtonText,
                allowedFormats: [], onChange: function (value) { setAttributes({ teamButtonText: value }); }
              })
            ),
            el('div', { className: 'nb-home-team__benefits' },
              el('div', null, el('strong', null, '1 terv'), el('span', null, 'több méretre')),
              el('div', null, el('strong', null, 'Automatikus'), el('span', null, 'mennyiségi kedvezmény')),
              el('div', null, el('strong', null, 'Tartós'), el('span', null, 'csapat- és munkaruházat'))
            )
          ),
          el('header', { className: 'nb-home-showcase__header' },
            el(RichText, {
              tagName: 'p', className: 'nb-home-eyebrow', value: attributes.eyebrow,
              allowedFormats: [], onChange: function (value) { setAttributes({ eyebrow: value }); }
            }),
            el(RichText, {
              tagName: 'h2', value: attributes.heading,
              allowedFormats: [], onChange: function (value) { setAttributes({ heading: value }); }
            }),
            el(RichText, {
              tagName: 'p', value: attributes.intro,
              allowedFormats: [], onChange: function (value) { setAttributes({ intro: value }); }
            })
          ),
          el(TypeCards, { hiddenTypeKeys: hidden })
        )
      );
    },

    save: function () { return null; }
  });
})(window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.i18n);
