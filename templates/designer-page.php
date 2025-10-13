<div id="nb-designer">
  <div class="nb-layout">
    <aside class="nb-sidebar">
      <div class="nb-sidebar-group">
        <label class="nb-sidebar-field">
          <span class="nb-sidebar-title">Válassz témát</span>
          <select id="nb-type" class="nb-select"></select>
        </label>
      </div>
      <div class="nb-sidebar-group">
        <label class="nb-sidebar-field">
          <span class="nb-sidebar-title">Válassz terméket</span>
          <select id="nb-product" class="nb-select"></select>
        </label>
      </div>
      <div class="nb-sidebar-group">
        <button id="nb-add-text" type="button" class="nb-side-button">Írj saját feliratot</button>
      </div>
      <div class="nb-sidebar-group">
        <label for="nb-upload" class="nb-side-upload">Tölts fel saját mintát
          <input type="file" id="nb-upload" accept="image/png,image/jpeg,image/svg+xml" />
        </label>
      </div>
      <div class="nb-sidebar-group nb-sidebar-actions">
        <button id="nb-save" type="button" class="nb-side-primary">Terv mentése</button>
      </div>
    </aside>

    <main class="nb-main">
      <div class="nb-main-top">
        <div class="nb-color-picker">
          <span class="nb-section-title">Minta színe</span>
          <div id="nb-color-swatches" class="nb-color-swatches"></div>
          <select id="nb-color" class="nb-hidden"></select>
        </div>
      </div>
      <div class="nb-canvas-frame">
        <canvas id="nb-canvas" width="480" height="640"></canvas>
      </div>
      <div class="nb-size-picker">
        <span class="nb-section-title">Válassz méretet</span>
        <div id="nb-size-options" class="nb-size-options"></div>
        <select id="nb-size" class="nb-hidden"></select>
      </div>
    </main>

    <aside class="nb-summary">
      <div class="nb-summary-card">
        <div class="nb-summary-header">
          <h3 id="nb-product-title">Válaszd ki a terméket</h3>
          <div class="nb-summary-meta">
            <span id="nb-summary-type">–</span>
            <span id="nb-summary-color">–</span>
          </div>
          <div class="nb-summary-size" id="nb-summary-size">–</div>
        </div>
        <div class="nb-summary-price" id="nb-summary-price">&nbsp;</div>
        <p class="nb-summary-note">+ szállítási idő 3-5 munkanap</p>
        <button id="nb-add-to-cart" type="button" class="nb-summary-button" disabled>Kosárba</button>
      </div>
    </aside>
  </div>
</div>
