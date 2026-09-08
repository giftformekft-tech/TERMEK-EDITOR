<div id="nb-designer">
  <header class="nb-studio-header">
    <div class="nb-studio-brand">
      <span class="nb-studio-mark" aria-hidden="true"></span>
      <div class="nb-studio-heading"><h1>Tervezd meg</h1><p>A te ötleted. A te stílusod.</p></div>
    </div>
    <div class="nb-studio-header-tools">
      <span id="nb-studio-design-status" role="status">Mentés kosárba helyezéskor</span>
      <button type="button" id="nb-studio-help-toggle" aria-expanded="false" aria-controls="nb-studio-help">Segítség</button>
    </div>
  </header>
  <div class="nb-studio-help" id="nb-studio-help" hidden>
    <p><strong>Így készül a saját terméked:</strong> válassz terméket, színt és méretet, majd tölts fel képet, adj hozzá szöveget vagy válassz sablont. A kijelölt elemet a Tulajdonságok és a Rétegek eszközzel szerkesztheted. A hátoldalhoz kapcsold be a kétoldalas nyomtatást.</p>
    <p>A tervet kosárba helyezéskor mentjük. Több mérethez válaszd a „Többet vennék” lehetőséget. Mobilon az eszközsort oldalra húzva minden eszközt elérsz.</p>
  </div>
  <div class="nb-designer-shell">
    <aside class="nb-column nb-column--actions">
      <nav class="nb-rail" id="nb-rail" aria-label="Eszközök">
        <button type="button" class="nb-rail-btn" data-nb-rail-target="product" aria-label="Termék">
          <span class="nb-rail-icon" aria-hidden="true"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m8 3-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3c-1 3-7 3-8 0Z"/></svg></span>
          <span class="nb-rail-label">Termék</span>
        </button>
        <button type="button" class="nb-rail-btn" data-nb-rail-target="upload" aria-label="Feltöltés">
          <span class="nb-rail-icon" aria-hidden="true"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/></svg></span>
          <span class="nb-rail-label">Feltöltés</span>
        </button>
        <button type="button" class="nb-rail-btn" data-nb-rail-target="addtext" aria-label="Szöveg">
          <span class="nb-rail-icon" aria-hidden="true"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 5V3h16v2M12 3v18m-4 0h8"/></svg></span>
          <span class="nb-rail-label">Szöveg</span>
        </button>
        <button type="button" class="nb-rail-btn" data-nb-rail-target="shapes" aria-label="Elemek">
          <span class="nb-rail-icon" aria-hidden="true"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg></span>
          <span class="nb-rail-label">Elemek</span>
        </button>
        <button type="button" class="nb-rail-btn" data-nb-rail-target="templates" aria-label="Sablonok">
          <span class="nb-rail-icon" aria-hidden="true"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
          <span class="nb-rail-label">Sablonok</span>
        </button>
        <button type="button" class="nb-rail-btn" data-nb-rail-target="layers" aria-label="Rétegek">
          <span class="nb-rail-icon" aria-hidden="true"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></svg></span>
          <span class="nb-rail-label">Rétegek</span>
          <span class="nb-mobile-icon-badge" hidden></span>
        </button>
        <button type="button" class="nb-rail-btn" data-nb-rail-target="properties" aria-label="Tulajdonságok">
          <span class="nb-rail-icon" aria-hidden="true"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--nb-surface,white)"/><circle cx="15" cy="17" r="3" fill="var(--nb-surface,white)"/></svg></span>
          <span class="nb-rail-label">Formázás</span>
        </button>
      </nav>

      <div class="nb-flyout" id="nb-flyout" hidden>
        <div class="nb-flyout-header">
          <h2 class="nb-flyout-title" id="nb-flyout-title"></h2>
          <button type="button" class="nb-flyout-close" id="nb-flyout-close" aria-label="Bezárás">×</button>
        </div>
        <div class="nb-flyout-content" id="nb-flyout-content"></div>
      </div>

      <div class="nb-studio-idle">
        <span class="nb-studio-eyebrow">Alkotóműhely</span>
        <h2>Kezdődjön az alkotás.</h2>
        <p>Válassz egy eszközt, és alakítsd a terméket a saját stílusodra.</p>
        <button type="button" class="nb-hero-button" data-nb-open-tool="product">Termék beállításai</button>
        <button type="button" class="nb-hero-button nb-hero-button--secondary" data-nb-open-tool="upload">Saját kép feltöltése</button>
        <button type="button" class="nb-subtle-link" data-nb-open-tool="templates">Sablonból indulok</button>
      </div>

      <div class="nb-rail-rest-state">
        <div class="nb-action-card nb-action-card--product">
          <div class="nb-sheet-section" data-nb-sheet-source="product" data-nb-sheet-title="Terméktípus">
            <button type="button" class="nb-hero-button" id="nb-product-modal-trigger">
              <span class="nb-hero-icon"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m8 3-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3c-1 3-7 3-8 0Z"/></svg></span>
              <span>Válassz terméket</span>
            </button>
          </div>
          <div class="nb-sheet-section" data-nb-sheet-source="color" data-nb-sheet-title="Színválasztás">
            <button type="button" class="nb-hero-button nb-hero-button--secondary" id="nb-color-modal-trigger">
              <span class="nb-hero-icon"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg></span>
              <span id="nb-color-modal-label">Válassz színt</span>
            </button>
          </div>
          <div class="nb-sheet-section" data-nb-sheet-source="size" data-nb-sheet-title="Méret és készlet">
            <div class="nb-card-body">
              <div class="nb-size-group">
                <span class="nb-field-label">Méret</span>
                <div id="nb-size-buttons" class="nb-pill-group nb-pill-group--compact"></div>
              </div>
            </div>
          </div>
          <div class="nb-sheet-section" data-nb-sheet-source="double" data-nb-sheet-title="Kétoldalas nyomtatás">
            <div class="nb-double-sided" id="nb-double-sided">
              <label class="nb-double-sided-toggle">
                <input type="checkbox" id="nb-double-sided-toggle">
                <span>
                  <strong>Kétoldalas nyomtatás</strong>
                  <small>Kapcsold be, ha a hátlapot is terveznéd.</small>
                </span>
              </label>
              <div class="nb-side-status" id="nb-side-status">
                <span data-nb-side="front">Előlap: üres</span>
                <span data-nb-side="back">Hátlap: kikapcsolva</span>
              </div>
            </div>
          </div>
        </div>

        <div class="nb-action-card" data-nb-sheet-source="upload" data-nb-sheet-title="Saját képek">
          <label class="nb-hero-button nb-hero-button--upload">
            <span class="nb-hero-icon"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/></svg></span>
            <span>Tölts fel saját képet</span>
            <input type="file" id="nb-upload" accept="image/png,image/jpeg,image/svg+xml" />
          </label>
          <button type="button" id="nb-clear-design" class="nb-subtle-link">Terv ürítése</button>
        </div>

        <div class="nb-action-card nb-action-card--shapes" data-nb-sheet-source="shapes" data-nb-sheet-title="Elemek">
          <div class="nb-card-header">
            <h3>Elemek</h3>
          </div>
          <div class="nb-card-body">
            <div class="nb-shape-grid">
              <button type="button" class="nb-shape-btn" data-nb-shape="rect" title="Téglalap" aria-label="Téglalap"><span aria-hidden="true">▭</span></button>
              <button type="button" class="nb-shape-btn" data-nb-shape="circle" title="Kör" aria-label="Kör"><span aria-hidden="true">●</span></button>
              <button type="button" class="nb-shape-btn" data-nb-shape="triangle" title="Háromszög" aria-label="Háromszög"><span aria-hidden="true">▲</span></button>
              <button type="button" class="nb-shape-btn" data-nb-shape="line" title="Vonal" aria-label="Vonal"><span aria-hidden="true">━</span></button>
              <button type="button" class="nb-shape-btn" data-nb-shape="star" title="Csillag" aria-label="Csillag"><span aria-hidden="true">★</span></button>
              <button type="button" class="nb-shape-btn" data-nb-shape="heart" title="Szív" aria-label="Szív"><span aria-hidden="true">♥</span></button>
            </div>
            <div class="nb-qr-tool">
              <label class="nb-field nb-field--text">
                <span>QR kód szövege vagy linkje</span>
                <input type="text" id="nb-qr-input" placeholder="https://example.hu">
              </label>
              <button type="button" class="nb-layer-tool nb-qr-add" id="nb-qr-add" disabled>QR kód hozzáadása</button>
              <p class="nb-qr-hint" id="nb-qr-hint" hidden></p>
            </div>
          </div>
        </div>

        <div class="nb-action-card nb-action-card--saved" data-nb-sheet-source="elements" data-nb-sheet-title="Mentett minták">
          <div class="nb-card-body">
            <h3 class="nb-card-title">Mentett minták</h3>
            <p class="nb-empty">Itt fognak megjelenni a kedvencek és a legutóbbi elemek.</p>
          </div>
        </div>

        <div class="nb-action-card" data-nb-sheet-source="templates" data-nb-sheet-title="Sablonok">
          <button type="button" id="nb-templates-trigger" class="nb-hero-button nb-hero-button--secondary">
            <span class="nb-hero-icon"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
            <span>Sablon választása</span>
          </button>
        </div>
      </div>
    </aside>

    <main class="nb-column nb-column--stage">
      <div class="nb-stage-controls" data-nb-sheet-source="sides" data-nb-sheet-title="Előlap / Hátlap">
        <div class="nb-side-toggle" role="group" aria-label="Oldal választó">
          <button type="button" class="nb-side-button is-active" data-nb-side="front" aria-pressed="true">Előlap</button>
          <button type="button" class="nb-side-button" data-nb-side="back" aria-pressed="false">Hátlap</button>
        </div>
      </div>
      <div class="nb-product-stage">
        <div class="nb-product-frame">
          <div class="nb-canvas-empty-hint" id="nb-canvas-empty-hint" hidden>Ide húzd a mintát</div>
          <canvas id="nb-canvas" width="480" height="640"></canvas>
        </div>
        <div class="nb-history-controls" id="nb-history-controls">
          <button type="button" class="nb-history-btn" id="nb-undo-btn" aria-label="Visszavonás" title="Visszavonás (Ctrl+Z)" disabled><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 10h10a7 7 0 0 1 0 14" transform="translate(0 -4)"/><path d="m7 2-4 4 4 4"/></svg></button>
          <button type="button" class="nb-history-btn" id="nb-redo-btn" aria-label="Ismétlés" title="Ismétlés (Ctrl+Shift+Z)" disabled><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 6H11a7 7 0 0 0 0 14"/><path d="m17 2 4 4-4 4"/></svg></button>
        </div>
        <div class="nb-zoom-controls" id="nb-zoom-controls">
          <button type="button" class="nb-zoom-btn" id="nb-zoom-out" aria-label="Kicsinyítés" title="Kicsinyítés (Ctrl+-)"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/></svg></button>
          <span class="nb-zoom-level" id="nb-zoom-level">100%</span>
          <button type="button" class="nb-zoom-btn" id="nb-zoom-in" aria-label="Nagyítás" title="Nagyítás (Ctrl++)"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M12 5v14"/></svg></button>
          <button type="button" class="nb-zoom-btn nb-zoom-btn--reset" id="nb-zoom-reset" aria-label="Nagyítás visszaállítása" title="Visszaállítás (Ctrl+0)"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></button>
        </div>
        <button type="button" class="nb-side-fab" id="nb-side-toggle-mobile" aria-label="Oldal váltása" hidden>
          ⟲
        </button>
      </div>
    </main>

    <aside class="nb-column nb-column--summary">
      <div class="nb-rail-rest-state" id="nb-properties-panel">
      <div class="nb-action-card" data-nb-sheet-source="addtext" data-nb-sheet-title="Szöveg">
        <button type="button" id="nb-add-text" class="nb-hero-button nb-hero-button--accent">
          <span class="nb-hero-icon"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 5V3h16v2M12 3v18m-4 0h8"/></svg></span>
          <span>Írj saját feliratot</span>
        </button>
      </div>
      <div class="nb-action-card" data-nb-sheet-source="text">
        <div class="nb-card-body nb-card-body--text">
          <label class="nb-field nb-field--select">
            <span>Betűtípus</span>
            <select id="nb-font-family"></select>
          </label>
          <label class="nb-field">
            <span>Betűméret</span>
            <div class="nb-range">
              <input type="range" id="nb-font-size" min="12" max="120" value="24">
              <span id="nb-font-size-value">24 px</span>
            </div>
          </label>
          <div class="nb-field-row">
            <label class="nb-field nb-field--color">
              <span>Betűszín</span>
              <input type="color" id="nb-font-color" value="#ff0000">
            </label>
            <label class="nb-field nb-field--color">
              <span>Körvonal színe</span>
              <input type="color" id="nb-font-stroke-color" value="#000000">
            </label>
          </div>
          <div class="nb-text-style">
            <button type="button" class="nb-toggle" id="nb-font-bold" aria-pressed="false">B</button>
            <button type="button" class="nb-toggle" id="nb-font-italic" aria-pressed="false"><em>I</em></button>
            <div class="nb-align-group">
              <button type="button" class="nb-toggle" data-nb-align="left" aria-pressed="false">⟸</button>
              <button type="button" class="nb-toggle" data-nb-align="center" aria-pressed="false">≡</button>
              <button type="button" class="nb-toggle" data-nb-align="right" aria-pressed="false">⟹</button>
            </div>
          </div>
          <label class="nb-field">
            <span>Betűköz</span>
            <div class="nb-range">
              <input type="range" id="nb-letter-spacing" min="-200" max="800" step="10" value="0">
              <span id="nb-letter-spacing-value">0</span>
            </div>
          </label>
          <label class="nb-field">
            <span>Sorköz</span>
            <div class="nb-range">
              <input type="range" id="nb-line-height" min="0.8" max="2.5" step="0.05" value="1.16">
              <span id="nb-line-height-value">1.16</span>
            </div>
          </label>
          <details class="nb-text-advanced">
            <summary class="nb-text-advanced-summary">Effektek</summary>
            <div class="nb-text-advanced-body">
              <label class="nb-field">
                <span>Körvonal vastagsága</span>
                <div class="nb-range">
                  <input type="range" id="nb-font-stroke-width" min="0" max="10" step="0.5" value="0">
                  <span id="nb-font-stroke-width-value">0 px</span>
                </div>
              </label>
              <div class="nb-field nb-field--shadow">
                <span>Szövegárnyék</span>
                <div class="nb-shadow-controls">
                  <input type="color" id="nb-text-shadow-color" value="#000000">
                  <div class="nb-range">
                    <input type="range" id="nb-text-shadow-blur" min="0" max="30" step="1" value="0">
                    <span id="nb-text-shadow-blur-value">Nincs</span>
                  </div>
                </div>
              </div>
              <div class="nb-field nb-field--curve">
                <span>Ívesség</span>
                <div class="nb-curve-controls">
                  <button type="button" class="nb-toggle nb-curve-toggle" id="nb-text-curve-toggle" aria-pressed="false">Íves felirat</button>
                  <div class="nb-range nb-curve-range">
                    <input type="range" id="nb-text-curve" min="-100" max="100" value="0" disabled>
                    <span id="nb-text-curve-value">Egyenes</span>
                  </div>
                </div>
                <p class="nb-curve-hint" id="nb-text-curve-hint" hidden>Túl hosszú szöveghez nem elérhető az ívesítés – rövidítsd le a feliratot.</p>
              </div>
            </div>
          </details>
        </div>
      </div>
      <div class="nb-action-card nb-action-card--image" data-nb-sheet-source="image">
        <div class="nb-card-header">
          <h3>Kép szerkesztése</h3>
        </div>
        <div class="nb-card-body">
          <p class="nb-image-warning" id="nb-image-lowres-warning" hidden>⚠ Alacsony felbontás – nyomtatásban pixeles lehet.</p>
          <div class="nb-layer-toolbar">
            <button type="button" class="nb-layer-tool" id="nb-replace-image" disabled>Kép cseréje</button>
            <button type="button" class="nb-layer-tool" id="nb-crop-image" disabled>Vágás</button>
          </div>
          <input type="file" id="nb-replace-image-input" accept="image/png,image/jpeg,image/svg+xml" hidden>
          <div class="nb-crop-toolbar" id="nb-crop-toolbar" hidden>
            <p class="nb-crop-toolbar-label">Húzd a kijelölt területet a vágáshoz, majd alkalmazd.</p>
            <div class="nb-crop-toolbar-actions">
              <button type="button" class="nb-layer-tool nb-crop-apply" id="nb-crop-apply">Alkalmaz</button>
              <button type="button" class="nb-layer-tool" id="nb-crop-cancel">Mégse</button>
            </div>
          </div>
          <div class="nb-filter-toggles">
            <button type="button" class="nb-toggle" id="nb-filter-grayscale" aria-pressed="false" disabled>Fekete-fehér</button>
            <button type="button" class="nb-toggle" id="nb-filter-sepia" aria-pressed="false" disabled>Szépia</button>
          </div>
          <label class="nb-field">
            <span>Fényerő</span>
            <div class="nb-range">
              <input type="range" id="nb-filter-brightness" min="-100" max="100" step="5" value="0" disabled>
              <span id="nb-filter-brightness-value">0</span>
            </div>
          </label>
          <label class="nb-field">
            <span>Kontraszt</span>
            <div class="nb-range">
              <input type="range" id="nb-filter-contrast" min="-100" max="100" step="5" value="0" disabled>
              <span id="nb-filter-contrast-value">0</span>
            </div>
          </label>
        </div>
      </div>
      <div class="nb-action-card nb-action-card--align" data-nb-sheet-source="align">
        <div class="nb-card-header">
          <h3>Igazítás és elosztás</h3>
        </div>
        <div class="nb-align-toolbar">
          <button type="button" class="nb-align-tool" data-nb-obj-align="left" aria-label="Balra igazítás" title="Balra igazítás" disabled>⟸</button>
          <button type="button" class="nb-align-tool" data-nb-obj-align="center-h" aria-label="Vízszintes középre igazítás" title="Vízszintes középre" disabled>≡</button>
          <button type="button" class="nb-align-tool" data-nb-obj-align="right" aria-label="Jobbra igazítás" title="Jobbra igazítás" disabled>⟹</button>
          <button type="button" class="nb-align-tool" data-nb-obj-align="top" aria-label="Felülre igazítás" title="Felülre igazítás" disabled>↑</button>
          <button type="button" class="nb-align-tool" data-nb-obj-align="center-v" aria-label="Függőleges középre igazítás" title="Függőleges középre" disabled>≡</button>
          <button type="button" class="nb-align-tool" data-nb-obj-align="bottom" aria-label="Alulra igazítás" title="Alulra igazítás" disabled>↓</button>
        </div>
        <div class="nb-align-toolbar nb-align-toolbar--distribute">
          <button type="button" class="nb-align-tool nb-align-tool--wide" id="nb-distribute-h" title="Egyenletes vízszintes elosztás" disabled>↔ Vízsz. elosztás</button>
          <button type="button" class="nb-align-tool nb-align-tool--wide" id="nb-distribute-v" title="Egyenletes függőleges elosztás" disabled>↕ Függ. elosztás</button>
        </div>
      </div>
      <div class="nb-action-card nb-action-card--appearance" data-nb-sheet-source="appearance">
        <div class="nb-card-header">
          <h3>Megjelenés</h3>
        </div>
        <div class="nb-appearance-fill-group" id="nb-appearance-fill-group" hidden>
          <label class="nb-field nb-field--color">
            <span>Kitöltés szín</span>
            <input type="color" id="nb-shape-fill" value="#111827" disabled>
          </label>
          <div class="nb-field nb-field--pattern">
            <span>Minta kitöltés</span>
            <div class="nb-layer-toolbar">
              <button type="button" class="nb-layer-tool" id="nb-pattern-upload" disabled>Minta feltöltése</button>
              <button type="button" class="nb-layer-tool" id="nb-pattern-clear" disabled hidden>Szín visszaállítása</button>
            </div>
            <input type="file" id="nb-pattern-upload-input" accept="image/png,image/jpeg,image/svg+xml" hidden>
          </div>
          <label class="nb-field" id="nb-pattern-scale-wrap" hidden>
            <span>Minta mérete</span>
            <div class="nb-range">
              <input type="range" id="nb-pattern-scale" min="20" max="300" step="5" value="100">
              <span id="nb-pattern-scale-value">100%</span>
            </div>
          </label>
        </div>
        <label class="nb-field">
          <span>Áttűnés</span>
          <div class="nb-range">
            <input type="range" id="nb-opacity" min="0" max="100" step="1" value="100" disabled>
            <span id="nb-opacity-value">100%</span>
          </div>
        </label>
        <div class="nb-align-toolbar nb-align-toolbar--distribute">
          <button type="button" class="nb-align-tool nb-align-tool--wide" id="nb-flip-h" aria-pressed="false" title="Vízszintes tükrözés" disabled>⇋ Tükrözés</button>
          <button type="button" class="nb-align-tool nb-align-tool--wide" id="nb-flip-v" aria-pressed="false" title="Függőleges tükrözés" disabled>⇵ Tükrözés</button>
        </div>
      </div>
      <p class="nb-empty" id="nb-properties-empty" data-nb-sheet-source="properties-empty" hidden>Válassz egy elemet a vászonon a tulajdonságok megtekintéséhez.</p>
      </div>
      <div class="nb-rail-rest-state">
        <div class="nb-action-card nb-action-card--layers" data-nb-sheet-source="layers" data-nb-sheet-title="Rétegek">
          <div class="nb-card-header">
            <h3>Rétegek</h3>
          </div>
          <div class="nb-layer-toolbar">
            <button type="button" id="nb-group-btn" class="nb-layer-tool" disabled>Csoportosítás</button>
            <button type="button" id="nb-ungroup-btn" class="nb-layer-tool" disabled>Szétválasztás</button>
          </div>
          <div class="nb-layer-list" id="nb-layer-list"></div>
        </div>
      </div>
      <div class="nb-summary-card">
        <p class="nb-studio-eyebrow">A te összeállításod</p>
        <div class="nb-product-heading">
          <h2 id="nb-product-title">Termék</h2>
          <div class="nb-price-display nb-price-display--pending" id="nb-price-display">
            <div class="nb-price-line">
              <span>Alapár</span>
              <span id="nb-price-base">—</span>
            </div>
            <div class="nb-price-line nb-price-line--surcharge" id="nb-price-surcharge-row" hidden>
              <span>Kétoldalas felár</span>
              <span id="nb-price-surcharge">+0 Ft</span>
            </div>
            <div class="nb-price-total">
              <span>Végösszeg</span>
              <span id="nb-price-total">—</span>
            </div>
          </div>
        </div>
        <div class="nb-selection-summary" id="nb-selection-summary"></div>
        <div class="nb-summary-actions">
          <div class="nb-print-summary" id="nb-print-summary">Nyomtatási oldalak: 0 / 1</div>
          <button id="nb-add-to-cart" class="nb-cart-button" disabled>Kosárba</button>
          <button type="button" id="nb-bulk-modal-trigger" class="nb-secondary-action">Többet vennék</button>
          <p class="nb-studio-summary-note" id="nb-studio-selection-hint" role="status">Válassz terméket, színt és méretet a rendeléshez.</p>
        </div>
      </div>
    </aside>
  </div>

  <select id="nb-type" class="nb-hidden"></select>
  <select id="nb-product" class="nb-hidden"></select>
  <select id="nb-color" class="nb-hidden"></select>
  <select id="nb-size" class="nb-hidden"></select>

  <div class="nb-mobile-toolbar" id="nb-mobile-toolbar" hidden aria-label="Tervező eszközei, oldalra görgethető">
    <p class="nb-mobile-scroll-hint" id="nb-mobile-scroll-hint" hidden>← Húzd oldalra a további eszközökért →</p>
    <div class="nb-mobile-toolbar-row" tabindex="0" aria-label="Tervezőeszközök" aria-describedby="nb-mobile-scroll-hint">
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="product" aria-label="Terméktípus">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m8 3-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3c-1 3-7 3-8 0Z"/></svg></span>
        <span class="nb-mobile-icon-label">Termék</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="upload" aria-label="Feltöltés">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/></svg></span>
        <span class="nb-mobile-icon-label">Feltöltés</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="addtext" aria-label="Szöveg">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 5V3h16v2M12 3v18m-4 0h8"/></svg></span>
        <span class="nb-mobile-icon-label">Szöveg</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="templates" aria-label="Sablonok">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
        <span class="nb-mobile-icon-label">Sablonok</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="layers" aria-label="Rétegek">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></svg></span>
        <span class="nb-mobile-icon-label">Rétegek</span>
        <span class="nb-mobile-icon-badge" hidden></span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="shapes" aria-label="Elemek">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg></span>
        <span class="nb-mobile-icon-label">Elemek</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="properties" aria-label="Tulajdonságok">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--nb-surface,white)"/><circle cx="15" cy="17" r="3" fill="var(--nb-surface,white)"/></svg></span>
        <span class="nb-mobile-icon-label">Formázás</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="sides" aria-label="Előlap / hátlap">
        <span class="nb-mobile-icon-symbol"><svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16l-4-4M20 17H4l4 4"/></svg></span>
        <span class="nb-mobile-icon-label">Oldalak</span>
      </button>
    </div>
  </div>

  <div class="nb-studio-checkout" id="nb-studio-checkout">
    <div><span>Termék ára</span><strong id="nb-studio-total" aria-live="polite">Ár betöltése…</strong><button type="button" class="nb-studio-bulk-link" data-nb-open-tool="cart">Többet vennék</button></div>
    <button type="button" id="nb-studio-order">Kosárba <svg class="nb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 3h2l3 12h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg></button>
  </div>

  <div class="nb-mobile-status" id="nb-mobile-status" data-nb-sheet-source="cart" data-nb-sheet-title="Rendelés" data-nb-sheet-unhide hidden>
    <div class="nb-mobile-status-info">
      <span class="nb-mobile-selection" id="nb-mobile-selection-label">Nincs kiválasztott elem</span>
      <div class="nb-mobile-quick-actions">
        <button type="button" class="nb-mobile-quick" data-nb-mobile-action="duplicate" disabled>Dupláz</button>
        <button type="button" class="nb-mobile-quick" data-nb-mobile-action="delete" disabled>Töröl</button>
        <button type="button" class="nb-mobile-quick" data-nb-mobile-action="visibility" disabled>Elrejt</button>
        <button type="button" class="nb-mobile-quick" data-nb-mobile-action="forward" disabled>Előre</button>
        <button type="button" class="nb-mobile-quick" data-nb-mobile-action="backward" disabled>Hátra</button>
      </div>
    </div>
    <div class="nb-mobile-status-actions">
      <button type="button" class="nb-mobile-complete" id="nb-mobile-complete">Kosárba</button>
      <div class="nb-mobile-total" id="nb-mobile-total">
        <div class="nb-mobile-total-line">
          <span class="nb-mobile-total-label">Végösszeg:</span>
          <span class="nb-mobile-total-value" id="nb-price-total-mobile">—</span>
        </div>
      </div>
      <button type="button" class="nb-mobile-secondary" id="nb-mobile-bulk">Többet vennék</button>
    </div>
  </div>

  <div class="nb-mobile-overlay" id="nb-mobile-sheet-overlay" hidden></div>
  <div class="nb-mobile-sheet" id="nb-mobile-sheet" hidden aria-hidden="true" role="dialog" aria-modal="false">
    <div class="nb-mobile-sheet-handle" id="nb-mobile-sheet-handle" aria-hidden="true"></div>
    <div class="nb-mobile-sheet-header">
      <h2 id="nb-mobile-sheet-title"></h2>
      <button type="button" class="nb-mobile-sheet-close" id="nb-mobile-sheet-close" aria-label="Bezárás">×</button>
    </div>
    <div class="nb-mobile-sheet-content" id="nb-mobile-sheet-content"></div>
  </div>



  <div class="nb-modal" id="nb-product-modal" hidden>
    <div class="nb-modal-backdrop" data-nb-close="product-modal"></div>
    <div class="nb-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-product-modal-title">
      <div class="nb-modal-header">
        <h2 id="nb-product-modal-title">Válassz terméket</h2>
        <button type="button" class="nb-modal-close" data-nb-close="product-modal" aria-label="Bezárás">×</button>
      </div>
      <div class="nb-modal-body">
        <div class="nb-modal-section">
          <h3>Terméktípus</h3>
          <div class="nb-modal-type-list" id="nb-modal-type-list"></div>
        </div>
        <div class="nb-modal-section">
          <h3>Elérhető termékek</h3>
          <p class="nb-modal-help">Az adminban engedélyezett termékek közül választhatsz.</p>
          <div class="nb-modal-product-list" id="nb-modal-product-list"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="nb-modal" id="nb-color-modal" hidden>
    <div class="nb-modal-backdrop" data-nb-close="color-modal"></div>
    <div class="nb-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-color-modal-title">
      <div class="nb-modal-header">
        <h2 id="nb-color-modal-title">Válassz színt</h2>
        <button type="button" class="nb-modal-close" data-nb-close="color-modal" aria-label="Bezárás">×</button>
      </div>
      <div class="nb-modal-body">
        <div class="nb-modal-section">
          <h3>Elérhető színek</h3>
          <div class="nb-modal-color-grid" id="nb-modal-color-list"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="nb-modal" id="nb-bulk-modal" hidden>
    <div class="nb-modal-backdrop" data-nb-close="bulk-modal"></div>
    <div class="nb-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-bulk-modal-title">
      <div class="nb-modal-header">
        <h2 id="nb-bulk-modal-title">Több méretben</h2>
        <button type="button" class="nb-modal-close" data-nb-close="bulk-modal" aria-label="Bezárás">×</button>
      </div>
      <div class="nb-modal-body">
        <div class="nb-modal-section">
          <h3>Méretenkénti mennyiség</h3>
          <p class="nb-modal-help">Állítsd be, hány darabot szeretnél az egyes méretekből.</p>
          <div class="nb-bulk-size-list" id="nb-bulk-size-list"></div>
        </div>
        <div class="nb-modal-section nb-modal-section--discounts" id="nb-bulk-discount-section" hidden>
          <h3>Mennyiségi kedvezmények</h3>
          <p class="nb-modal-help">A megadott darabszám alapján automatikusan jóváírjuk a kedvezményt.</p>
          <div class="nb-bulk-discount-table" id="nb-bulk-discount-table"></div>
          <div class="nb-bulk-discount-hint" id="nb-bulk-discount-hint"></div>
        </div>
      </div>
      <div class="nb-modal-footer">
        <button type="button" class="nb-secondary-button" data-nb-close="bulk-modal">Mégse</button>
        <button type="button" class="nb-primary-button" id="nb-bulk-confirm">Kosárba</button>
      </div>
    </div>
  </div>

  <div class="nb-modal nb-modal--large" id="nb-templates-modal" hidden>
    <div class="nb-modal-backdrop" data-nb-close="templates-modal"></div>
    <div class="nb-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="nb-templates-modal-title">
      <div class="nb-modal-header">
        <h2 id="nb-templates-modal-title">Válassz sablont</h2>
        <button type="button" class="nb-modal-close" data-nb-close="templates-modal" aria-label="Bezárás">×</button>
      </div>
      <div class="nb-modal-body nb-template-browser">
        <aside class="nb-template-sidebar">
          <div class="nb-template-search">
            <input type="text" id="nb-template-search-input" placeholder="Keresés...">
          </div>
          <ul class="nb-template-categories" id="nb-template-categories">
            <!-- Categories injected via JS -->
          </ul>
        </aside>
        <main class="nb-template-grid-container">
          <div class="nb-template-grid" id="nb-templates-list">
            <!-- Templates injected via JS -->
          </div>
        </main>
      </div>
    </div>
  </div>
</div>
