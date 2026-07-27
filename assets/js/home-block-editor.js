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
  var RangeControl = components.RangeControl;
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
    var limit = Number(props.maxVisibleTypes) || 0;
    if (limit > 0) visible = visible.slice(0, limit);

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

  function TextStyleControls(props) {
    return el('div', { style: { marginBottom: '24px' } },
      el('h4', null, props.label),
      el('p', null, 'Szín'),
      el(ColorPalette, {
        value: props.attributes[props.colorKey],
        clearable: false,
        onChange: function (value) {
          var next = {};
          next[props.colorKey] = value || props.defaultColor;
          props.setAttributes(next);
        }
      }),
      el(RangeControl, {
        label: 'Betűméret (px)',
        value: Number(props.attributes[props.sizeKey]) || props.defaultSize,
        min: props.min,
        max: props.max,
        step: 1,
        onChange: function (value) {
          var next = {};
          next[props.sizeKey] = value;
          props.setAttributes(next);
        }
      })
    );
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
      maxVisibleTypes: { type: 'number', default: 0 },
      desktopColumns: { type: 'number', default: 2 },
      mobileColumns: { type: 'number', default: 1 },
      showTeamSection: { type: 'boolean', default: true },
      teamEyebrow: { type: 'string', default: 'CSAPATOKNAK ÉS CÉGEKNEK' },
      teamHeading: { type: 'string', default: 'Egységes megjelenés, kedvezőbb darabár' },
      teamText: { type: 'string', default: 'Csapatpóló, logózott munkaruha vagy rendezvényruha? Tervezd meg egyszer, válaszd ki a méreteket, és rendelj mennyiségi kedvezménnyel. Minél többet rendelsz, annál többet spórolsz.' },
      teamButtonText: { type: 'string', default: 'Csapatruhát tervezek' },
      teamButtonUrl: { type: 'string', default: '' },
      inkColor: { type: 'string', default: '#171717' },
      paperColor: { type: 'string', default: '#f5f1e8' },
      accentColor: { type: 'string', default: '#f4d35e' },
      selectorEyebrowColor: { type: 'string', default: '#171717' },
      selectorEyebrowSize: { type: 'number', default: 12 },
      selectorHeadingColor: { type: 'string', default: '#171717' },
      selectorHeadingSize: { type: 'number', default: 72 },
      selectorIntroColor: { type: 'string', default: '#686868' },
      selectorIntroSize: { type: 'number', default: 19 },
      cardTitleColor: { type: 'string', default: '#171717' },
      cardTitleSize: { type: 'number', default: 19 },
      cardMetaColor: { type: 'string', default: '#666666' },
      cardMetaSize: { type: 'number', default: 13 },
      teamEyebrowColor: { type: 'string', default: '#ffffff' },
      teamEyebrowSize: { type: 'number', default: 12 },
      teamHeadingColor: { type: 'string', default: '#ffffff' },
      teamHeadingSize: { type: 'number', default: 72 },
      teamTextColor: { type: 'string', default: '#bfbfbf' },
      teamTextSize: { type: 'number', default: 20 },
      mascotId: { type: 'number', default: 0 },
      mascotUrl: { type: 'string', default: '' },
      mascotAlt: { type: 'string', default: 'Céges kabalafigura' },
      mascotPosition: { type: 'string', default: 'right' },
      mascotSize: { type: 'number', default: 360 },
      headerMascotId: { type: 'number', default: 0 },
      headerMascotUrl: { type: 'string', default: '' },
      headerMascotAlt: { type: 'string', default: 'Céges kabalafigura a terméktípusok mellett' },
      headerMascotPosition: { type: 'string', default: 'right' },
      headerMascotSize: { type: 'number', default: 230 }
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
          el(PanelBody, { title: 'Termékválasztó szövegei', initialOpen: false },
            el(TextStyleControls, {
              label: 'Felső címke', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'selectorEyebrowColor', sizeKey: 'selectorEyebrowSize', defaultColor: '#171717', defaultSize: 12, min: 9, max: 24
            }),
            el(TextStyleControls, {
              label: 'Főcím', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'selectorHeadingColor', sizeKey: 'selectorHeadingSize', defaultColor: '#171717', defaultSize: 72, min: 28, max: 110
            }),
            el(TextStyleControls, {
              label: 'Bevezető szöveg', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'selectorIntroColor', sizeKey: 'selectorIntroSize', defaultColor: '#686868', defaultSize: 19, min: 12, max: 32
            }),
            el(TextStyleControls, {
              label: 'Termékcsempe címe', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'cardTitleColor', sizeKey: 'cardTitleSize', defaultColor: '#171717', defaultSize: 19, min: 12, max: 34
            }),
            el(TextStyleControls, {
              label: 'Ár és tervezőlink', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'cardMetaColor', sizeKey: 'cardMetaSize', defaultColor: '#666666', defaultSize: 13, min: 10, max: 24
            })
          ),
          el(PanelBody, { title: 'Csapatruházati szövegek', initialOpen: false },
            el(TextStyleControls, {
              label: 'Felső címke', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'teamEyebrowColor', sizeKey: 'teamEyebrowSize', defaultColor: '#ffffff', defaultSize: 12, min: 9, max: 24
            }),
            el(TextStyleControls, {
              label: 'Főcím', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'teamHeadingColor', sizeKey: 'teamHeadingSize', defaultColor: '#ffffff', defaultSize: 72, min: 28, max: 110
            }),
            el(TextStyleControls, {
              label: 'Leíró szöveg', attributes: attributes, setAttributes: setAttributes,
              colorKey: 'teamTextColor', sizeKey: 'teamTextSize', defaultColor: '#bfbfbf', defaultSize: 20, min: 12, max: 32
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
            }),
            el(RangeControl, {
              label: 'Kabala mérete',
              value: attributes.mascotSize || 360,
              min: 140,
              max: 560,
              step: 10,
              onChange: function (value) { setAttributes({ mascotSize: value }); }
            })
          ),
          el(PanelBody, { title: 'Kabala a termékek felett', initialOpen: false },
            attributes.headerMascotUrl
              ? el('img', { src: attributes.headerMascotUrl, alt: attributes.headerMascotAlt || '', style: { maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' } })
              : el('p', null, 'Ez a figura a „Válassz terméktípust” cím mellett jelenik meg.'),
            el(MediaUploadCheck, null,
              el(MediaUpload, {
                allowedTypes: ['image'],
                value: attributes.headerMascotId,
                onSelect: function (media) {
                  setAttributes({
                    headerMascotId: Number(media.id) || 0,
                    headerMascotUrl: media.url || '',
                    headerMascotAlt: media.alt || 'Céges kabalafigura a terméktípusok mellett'
                  });
                },
                render: function (mediaProps) {
                  return el(Button, { variant: 'secondary', onClick: mediaProps.open }, attributes.headerMascotUrl ? 'PNG cseréje' : 'PNG kiválasztása');
                }
              })
            ),
            attributes.headerMascotUrl && el(Button, {
              variant: 'tertiary',
              isDestructive: true,
              onClick: function () { setAttributes({ headerMascotId: 0, headerMascotUrl: '' }); }
            }, 'Kabala eltávolítása'),
            el(TextControl, {
              label: 'Helyettesítő szöveg',
              value: attributes.headerMascotAlt || '',
              onChange: function (value) { setAttributes({ headerMascotAlt: value }); }
            }),
            el(SelectControl, {
              label: 'Kabala pozíciója',
              value: attributes.headerMascotPosition || 'right',
              options: [{ label: 'Jobb oldal', value: 'right' }, { label: 'Bal oldal', value: 'left' }],
              onChange: function (value) { setAttributes({ headerMascotPosition: value }); }
            }),
            el(RangeControl, {
              label: 'Kabala mérete',
              value: attributes.headerMascotSize || 230,
              min: 100,
              max: 420,
              step: 10,
              onChange: function (value) { setAttributes({ headerMascotSize: value }); }
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
          el(PanelBody, { title: 'Csempeelrendezés', initialOpen: true },
            el(RangeControl, {
              label: 'Megjelenő csempék száma',
              help: 'A 0 érték az összes bekapcsolt terméktípust megjeleníti.',
              value: Number(attributes.maxVisibleTypes) || 0,
              min: 0,
              max: Math.max(types.length, 1),
              step: 1,
              onChange: function (value) { setAttributes({ maxVisibleTypes: value }); }
            }),
            el(RangeControl, {
              label: 'Csempék egy sorban – PC',
              value: Number(attributes.desktopColumns) || 2,
              min: 1,
              max: 4,
              step: 1,
              onChange: function (value) { setAttributes({ desktopColumns: value }); }
            }),
            el(RangeControl, {
              label: 'Csempék egy sorban – mobil',
              value: Number(attributes.mobileColumns) || 1,
              min: 1,
              max: 2,
              step: 1,
              onChange: function (value) { setAttributes({ mobileColumns: value }); }
            })
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
          style: {
            '--nb-ink': attributes.inkColor,
            '--nb-paper': attributes.paperColor,
            '--nb-accent': attributes.accentColor,
            '--nb-selector-eyebrow-color': attributes.selectorEyebrowColor,
            '--nb-selector-eyebrow-size': (attributes.selectorEyebrowSize || 12) + 'px',
            '--nb-selector-heading-color': attributes.selectorHeadingColor,
            '--nb-selector-heading-size': (attributes.selectorHeadingSize || 72) + 'px',
            '--nb-selector-intro-color': attributes.selectorIntroColor,
            '--nb-selector-intro-size': (attributes.selectorIntroSize || 19) + 'px',
            '--nb-card-title-color': attributes.cardTitleColor,
            '--nb-card-title-size': (attributes.cardTitleSize || 19) + 'px',
            '--nb-card-meta-color': attributes.cardMetaColor,
            '--nb-card-meta-size': (attributes.cardMetaSize || 13) + 'px',
            '--nb-team-eyebrow-color': attributes.teamEyebrowColor,
            '--nb-team-eyebrow-size': (attributes.teamEyebrowSize || 12) + 'px',
            '--nb-team-heading-color': attributes.teamHeadingColor,
            '--nb-team-heading-size': (attributes.teamHeadingSize || 72) + 'px',
            '--nb-team-text-color': attributes.teamTextColor,
            '--nb-team-text-size': (attributes.teamTextSize || 20) + 'px',
            '--nb-team-mascot-size': (attributes.mascotSize || 360) + 'px',
            '--nb-header-mascot-size': (attributes.headerMascotSize || 230) + 'px',
            '--nb-columns-desktop': Number(attributes.desktopColumns) || 2,
            '--nb-columns-mobile': Number(attributes.mobileColumns) || 1
          }
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
          el('header', {
            className: 'nb-home-showcase__header' + (attributes.headerMascotUrl ? ' has-mascot mascot-' + (attributes.headerMascotPosition || 'right') : '')
          },
            el('div', { className: 'nb-home-showcase__header-copy' },
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
            attributes.headerMascotUrl && el('img', {
              className: 'nb-home-showcase__header-mascot',
              src: attributes.headerMascotUrl,
              alt: attributes.headerMascotAlt || ''
            })
          ),
          el(TypeCards, { hiddenTypeKeys: hidden, maxVisibleTypes: attributes.maxVisibleTypes })
        )
      );
    },

    save: function () { return null; }
  });
})(window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.i18n);
