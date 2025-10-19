<div id="nb-designer">
  <div class="nb-designer-shell">
    <aside class="nb-column nb-column--actions">
      <div class="nb-action-card nb-action-card--product">
        <div class="nb-sheet-section" data-nb-sheet-source="product" data-nb-sheet-title="Terméktípus">
          <button type="button" class="nb-hero-button" id="nb-product-modal-trigger">
            <span class="nb-hero-icon">👕</span>
            <span>Válassz terméket</span>
          </button>
        </div>
        <div class="nb-sheet-section" data-nb-sheet-source="color" data-nb-sheet-title="Színválasztás">
          <button type="button" class="nb-hero-button nb-hero-button--secondary" id="nb-color-modal-trigger">
            <span class="nb-hero-icon">🎨</span>
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
          <span class="nb-hero-icon">⬆</span>
          <span>Tölts fel saját képet</span>
          <input type="file" id="nb-upload" accept="image/png,image/jpeg,image/svg+xml" />
        </label>
        <button type="button" id="nb-clear-design" class="nb-subtle-link">Terv ürítése</button>
      </div>

      <div class="nb-action-card nb-action-card--saved" data-nb-sheet-source="elements" data-nb-sheet-title="Mentett minták">
        <div class="nb-card-body">
          <h3 class="nb-card-title">Mentett minták</h3>
          <p class="nb-empty">Itt fognak megjelenni a kedvencek és a legutóbbi elemek.</p>
        </div>
      </div>

    </aside>

    <main class="nb-column nb-column--stage">
      <div class="nb-stage-controls" data-nb-sheet-source="sides" data-nb-sheet-title="Előlap / Hátlap">
        <div class="nb-side-toggle" role="tablist" aria-label="Oldal választó">
          <button type="button" class="nb-side-button is-active" data-nb-side="front" aria-pressed="true">Előlap</button>
          <button type="button" class="nb-side-button" data-nb-side="back" aria-pressed="false">Hátlap</button>
        </div>
      </div>
      <div class="nb-product-stage">
        <div class="nb-product-frame">
          <div class="nb-canvas-empty-hint" id="nb-canvas-empty-hint" hidden>Ide húzd a mintát</div>
          <canvas id="nb-canvas" width="480" height="640"></canvas>
        </div>
        <button type="button" class="nb-side-fab" id="nb-side-toggle-mobile" aria-label="Oldal váltása" hidden>
          ⟲
        </button>
      </div>
    </main>

    <aside class="nb-column nb-column--summary">
      <div class="nb-action-card" data-nb-sheet-source="text" data-nb-sheet-title="Szöveg">
        <button type="button" id="nb-add-text" class="nb-hero-button nb-hero-button--accent">
          <span class="nb-hero-icon">✎</span>
          <span>Írj saját feliratot</span>
        </button>
        <div class="nb-card-body nb-card-body--text">
          <label class="nb-field nb-field--select">
            <span>Betűtípus</span>
            <select id="nb-font-family"></select>
          </label>
          <label class="nb-field">
            <span>Betűméret</span>
            <div class="nb-range">
              <input type="range" id="nb-font-size" min="12" max="120" value="48">
              <span id="nb-font-size-value">48 px</span>
            </div>
          </label>
          <label class="nb-field nb-field--color">
            <span>Betűszín</span>
            <input type="color" id="nb-font-color" value="#000000">
          </label>
          <div class="nb-text-style">
            <button type="button" class="nb-toggle" id="nb-font-bold" aria-pressed="false">B</button>
            <button type="button" class="nb-toggle" id="nb-font-italic" aria-pressed="false"><em>I</em></button>
            <div class="nb-align-group">
              <button type="button" class="nb-toggle" data-nb-align="left" aria-pressed="false">⟸</button>
              <button type="button" class="nb-toggle" data-nb-align="center" aria-pressed="false">≡</button>
              <button type="button" class="nb-toggle" data-nb-align="right" aria-pressed="false">⟹</button>
            </div>
          </div>
        </div>
      </div>
      <div class="nb-action-card nb-action-card--layers" data-nb-sheet-source="layers" data-nb-sheet-title="Rétegek">
        <div class="nb-card-header">
          <h3>Rétegek</h3>
        </div>
        <div class="nb-layer-list" id="nb-layer-list"></div>
      </div>
      <div class="nb-summary-card">
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
        <div class="nb-summary-actions">
          <div class="nb-print-summary" id="nb-print-summary">Nyomtatási oldalak: 0 / 1</div>
          <button id="nb-add-to-cart" class="nb-cart-button" disabled>Kosárba</button>
          <button type="button" id="nb-bulk-modal-trigger" class="nb-secondary-action">Többet vennék</button>
        </div>
      </div>
    </aside>
  </div>

  <select id="nb-type" class="nb-hidden"></select>
  <select id="nb-product" class="nb-hidden"></select>
  <select id="nb-color" class="nb-hidden"></select>
  <select id="nb-size" class="nb-hidden"></select>

  <div class="nb-mobile-toolbar" id="nb-mobile-toolbar" hidden>
    <div class="nb-mobile-toolbar-row">
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="sides" aria-label="Előlap / hátlap">
        <span class="nb-mobile-icon-symbol">⇄½</span>
        <span class="nb-mobile-icon-label">Oldalak</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="upload" aria-label="Feltöltés">
        <span class="nb-mobile-icon-symbol">⬆</span>
        <span class="nb-mobile-icon-label">Feltöltés</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="text" aria-label="Szöveg">
        <span class="nb-mobile-icon-symbol">✎</span>
        <span class="nb-mobile-icon-label">Szöveg</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="product" aria-label="Terméktípus">
        <span class="nb-mobile-icon-symbol">👕</span>
        <span class="nb-mobile-icon-label">Termék</span>
      </button>
      <button type="button" class="nb-mobile-icon" data-nb-sheet-target="layers" aria-label="Rétegek">
        <span class="nb-mobile-icon-symbol">🧱</span>
        <span class="nb-mobile-icon-label">Rétegek</span>
        <span class="nb-mobile-icon-badge" hidden></span>
      </button>
    </div>
  </div>

  <div class="nb-mobile-status" id="nb-mobile-status" hidden>
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
      <div class="nb-mobile-final-price" id="nb-mobile-final-price" aria-live="polite"><span>—</span></div>
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
</div>
