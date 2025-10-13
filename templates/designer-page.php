<div id="nb-designer">
  <div class="nb-designer-shell">
    <aside class="nb-column nb-column--actions">
      <div class="nb-action-card nb-action-card--product">
        <button type="button" class="nb-hero-button" id="nb-product-modal-trigger">
          <span class="nb-hero-icon">🛍️</span>
          <span>Válassz terméket</span>
        </button>
        <div class="nb-card-body">
          <div class="nb-size-group">
            <span class="nb-field-label">Méret</span>
            <div id="nb-size-buttons" class="nb-pill-group nb-pill-group--compact"></div>
          </div>
        </div>
      </div>

      <div class="nb-action-card">
        <label class="nb-hero-button nb-hero-button--upload">
          <span class="nb-hero-icon">⬆</span>
          <span>Tölts fel saját képet</span>
          <input type="file" id="nb-upload" accept="image/png,image/jpeg,image/svg+xml" />
        </label>
        <button type="button" id="nb-clear-design" class="nb-subtle-link">Terv ürítése</button>
      </div>

    </aside>

    <main class="nb-column nb-column--stage">
      <div class="nb-product-stage">
        <div class="nb-product-frame">
          <canvas id="nb-canvas" width="480" height="640"></canvas>
        </div>
      </div>
      <div class="nb-stage-controls">
        <div class="nb-stage-row">
          <span class="nb-stage-label">Termék színe</span>
          <div id="nb-color-swatches" class="nb-color-swatches"></div>
        </div>
      </div>
    </main>

    <aside class="nb-column nb-column--summary">
      <div class="nb-action-card">
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
      <div class="nb-summary-card">
        <div class="nb-product-heading">
          <h2 id="nb-product-title">Termék</h2>
          <div class="nb-price-display" id="nb-price-display"></div>
        </div>
        <div id="nb-product-meta" class="nb-product-meta"></div>
        <div class="nb-selection-summary" id="nb-selection-summary"></div>
        <div class="nb-summary-actions">
          <button id="nb-add-to-cart" class="nb-cart-button" disabled>Kosárba</button>
          <button id="nb-save" class="nb-save-button">Mentés</button>
        </div>
      </div>
    </aside>
  </div>

  <select id="nb-type" class="nb-hidden"></select>
  <select id="nb-product" class="nb-hidden"></select>
  <select id="nb-color" class="nb-hidden"></select>
  <select id="nb-size" class="nb-hidden"></select>

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
          <h3>Termék</h3>
          <div class="nb-modal-product-list" id="nb-modal-product-list"></div>
        </div>
      </div>
    </div>
  </div>
</div>
