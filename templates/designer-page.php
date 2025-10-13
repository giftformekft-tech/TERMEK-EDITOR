<div id="nb-designer">
  <div class="nb-layout">
    <aside class="nb-sidebar">
      <div class="nb-sidebar-group">
        <label class="nb-sidebar-field">
          <span class="nb-sidebar-title">Válassz terméket</span>
          <select id="nb-product" class="nb-select"></select>
        </label>
      </div>
      <div class="nb-sidebar-group">
        <span class="nb-sidebar-title">Termék nézet</span>
        <div id="nb-view-options" class="nb-view-options"></div>
        <select id="nb-view" class="nb-hidden"></select>
      </div>
      <div class="nb-sidebar-group">
        <button id="nb-add-text" type="button" class="nb-side-button">Írj saját feliratot</button>
      </div>
      <div id="nb-text-settings" class="nb-sidebar-group nb-text-settings nb-hidden">
        <div class="nb-text-row">
          <label class="nb-text-label" for="nb-text-font">Betűtípus</label>
          <select id="nb-text-font" class="nb-text-control"></select>
        </div>
        <div class="nb-text-row">
          <label class="nb-text-label" for="nb-text-size">Méret</label>
          <input type="number" id="nb-text-size" class="nb-text-control" min="8" max="200" step="1" value="48">
        </div>
        <div class="nb-text-row nb-text-row-inline">
          <label class="nb-text-label">Igazítás</label>
          <div class="nb-text-align">
            <button type="button" class="nb-text-align-btn" data-align="left">Balra</button>
            <button type="button" class="nb-text-align-btn" data-align="center">Közép</button>
            <button type="button" class="nb-text-align-btn" data-align="right">Jobbra</button>
          </div>
        </div>
        <div class="nb-text-row nb-text-row-inline">
          <label class="nb-text-label" for="nb-text-color">Szín</label>
          <input type="color" id="nb-text-color" class="nb-text-color" value="#000000">
          <div class="nb-text-style">
            <button type="button" id="nb-text-bold" class="nb-text-style-btn" data-style="bold">B</button>
            <button type="button" id="nb-text-italic" class="nb-text-style-btn" data-style="italic">I</button>
          </div>
        </div>
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
            <span id="nb-summary-size">–</span>
          </div>
        </div>
        <div class="nb-summary-price" id="nb-summary-price">&nbsp;</div>
        <div class="nb-summary-qty">
          <span class="nb-section-title">Darabszám</span>
          <div class="nb-qty-control">
            <button type="button" id="nb-qty-minus" class="nb-qty-btn">−</button>
            <input type="number" id="nb-quantity" class="nb-qty-input" min="1" value="1">
            <button type="button" id="nb-qty-plus" class="nb-qty-btn">+</button>
          </div>
        </div>
        <p class="nb-summary-note">+ szállítási idő 3-5 munkanap</p>
        <button id="nb-add-to-cart" type="button" class="nb-summary-button" disabled>Kosárba</button>
      </div>
    </aside>
  </div>
</div>
