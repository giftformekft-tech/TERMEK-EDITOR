<div id="nb-designer">
  <div class="nb-designer-layout">
    <aside class="nb-sidebar nb-sidebar--left">
      <div class="nb-box">
        <h3>Termék beállítás</h3>
        <div class="nb-pill-group" id="nb-type-pills"></div>
        <label class="nb-field nb-field--select">
          <span>Termék</span>
          <select id="nb-product"></select>
        </label>
        <div class="nb-size-group">
          <h4>Méret</h4>
          <div id="nb-size-buttons" class="nb-pill-group nb-pill-group--compact"></div>
        </div>
      </div>

      <div class="nb-box nb-box--actions">
        <h3>Tervezési elemek</h3>
        <button type="button" id="nb-add-text" class="nb-action">
          <span class="nb-action-icon">✎</span>
          <span>Írj saját feliratot</span>
        </button>
        <label class="nb-action nb-action--upload">
          <span class="nb-action-icon">⬆</span>
          <span>Tölts fel képet</span>
          <input type="file" id="nb-upload" accept="image/png,image/jpeg,image/svg+xml" />
        </label>
        <button type="button" id="nb-clear-design" class="nb-action nb-action--ghost">
          <span class="nb-action-icon">🗑</span>
          <span>Terv ürítése</span>
        </button>
      </div>

      <div class="nb-box nb-box--cta">
        <button id="nb-save" class="button button-primary nb-primary">Mentés</button>
        <button id="nb-add-to-cart" class="button nb-secondary" disabled>Kosárba</button>
      </div>
    </aside>

    <main class="nb-stage">
      <div class="nb-stage-inner">
        <canvas id="nb-canvas" width="480" height="640"></canvas>
      </div>
      <div class="nb-stage-footer">
        <div class="nb-selection-summary" id="nb-selection-summary"></div>
      </div>
    </main>

    <aside class="nb-sidebar nb-sidebar--right">
      <div class="nb-box nb-box--colors">
        <h3>Termék színek</h3>
        <div id="nb-color-swatches" class="nb-color-swatches"></div>
      </div>

      <div class="nb-box nb-box--text">
        <h3>Szöveg beállításai</h3>
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

      <div class="nb-box nb-box--product">
        <h3 id="nb-product-title">Termék</h3>
        <div id="nb-product-meta" class="nb-product-meta"></div>
        <div id="nb-price-display" class="nb-price-display"></div>
      </div>
    </aside>
  </div>

  <select id="nb-type" class="nb-hidden"></select>
  <select id="nb-color" class="nb-hidden"></select>
  <select id="nb-size" class="nb-hidden"></select>
</div>
