<?php if ( ! defined('ABSPATH') ) exit; ?>
<div class="nbt" id="nbt-app" data-view="mode">
  <section class="nbt-mode" id="nbt-mode" aria-labelledby="nbt-mode-title">
    <p class="nbt-kicker">Csapat- és munkaruha tervező</p>
    <h1 id="nbt-mode-title">Mit tervezel?</h1>
    <p class="nbt-lead">Tervezd meg egyszer, add meg a színeket és a méreteket, a mennyiségi kedvezményt pedig automatikusan számoljuk.</p>
    <div class="nbt-mode__grid">
      <button type="button" class="nbt-mode-card" data-mode="work">
        <span class="nbt-mode-card__icon" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M22 10l-14 8 5 13 7-3v26h24V28l7 3 5-13-14-8c-2 5-6 8-10 8s-8-3-10-8z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="36" y="30" width="8" height="8" rx="1.5" fill="currentColor"/></svg></span>
        <strong>Munkaruha, céges ruha</strong>
        <span>Logó a mellen, cégnév a háton. Egységes megjelenés a kollégáknak.</span>
      </button>
      <button type="button" class="nbt-mode-card" data-mode="sport">
        <span class="nbt-mode-card__icon" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M22 10l-14 8 5 13 7-3v26h24V28l7 3 5-13-14-8c-2 5-6 8-10 8s-8-3-10-8z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><text x="32" y="47" text-anchor="middle" font-size="17" font-weight="700" font-family="Arial" fill="currentColor">10</text></svg></span>
        <strong>Csapatmez, sportpóló</strong>
        <span>Címer elöl, csapatnév és szám a háton.</span>
      </button>
    </div>
    <div class="nbt-draft" id="nbt-draft" hidden>
      <span>Van egy befejezetlen terved ebben a böngészőben.</span>
      <button type="button" class="nbt-btn nbt-btn--primary" id="nbt-draft-restore">Folytatom</button>
      <button type="button" class="nbt-btn" id="nbt-draft-discard">Újat kezdek</button>
    </div>
  </section>

  <section class="nbt-work" id="nbt-work" hidden>
    <div class="nbt-stage">
      <div class="nbt-stage__bar">
        <button type="button" class="nbt-link" id="nbt-change-mode">← <span id="nbt-mode-label">Munkaruha</span></button>
        <div class="nbt-sides" role="tablist" aria-label="Oldal">
          <button type="button" role="tab" data-side="front" aria-selected="true">Elöl</button>
          <button type="button" role="tab" data-side="back" aria-selected="false">Hátul</button>
        </div>
      </div>
      <div class="nbt-canvas-frame" id="nbt-canvas-frame">
        <div class="nbt-canvas" data-side="front"><canvas id="nbt-canvas-front"></canvas></div>
        <div class="nbt-canvas" data-side="back" hidden><canvas id="nbt-canvas-back"></canvas></div>
        <p class="nbt-canvas-empty" id="nbt-canvas-empty">Válassz elhelyezést, vagy tölts fel logót.</p>
      </div>
      <div class="nbt-selection" id="nbt-selection" hidden>
        <div class="nbt-selection__row nbt-selection__text">
          <label class="nbt-field nbt-field--grow"><span>Felirat</span><input type="text" id="nbt-text-input" maxlength="60" autocomplete="off"></label>
        </div>
        <div class="nbt-selection__row nbt-selection__text">
          <label class="nbt-field nbt-field--grow"><span>Betűtípus</span><select id="nbt-font"></select></label>
          <label class="nbt-field nbt-field--color"><span>Szín</span><input type="color" id="nbt-text-color" value="#111111"></label>
        </div>
        <div class="nbt-selection__row">
          <span class="nbt-size-readout" id="nbt-size-readout"></span>
          <button type="button" class="nbt-btn nbt-btn--small" id="nbt-center">Középre</button>
          <button type="button" class="nbt-btn nbt-btn--small" id="nbt-duplicate">Másolat</button>
          <button type="button" class="nbt-btn nbt-btn--small nbt-btn--danger" id="nbt-delete">Törlés</button>
        </div>
      </div>
      <ul class="nbt-warnings" id="nbt-warnings" aria-live="polite"></ul>
    </div>

    <div class="nbt-panel">
      <section class="nbt-step" aria-labelledby="nbt-step1">
        <h2 id="nbt-step1"><span class="nbt-step__num">1</span>Termék és szín</h2>
        <div class="nbt-types" id="nbt-types"></div>
        <p class="nbt-label">Alapszín <small id="nbt-color-name"></small></p>
        <div class="nbt-swatches" id="nbt-colors"></div>
      </section>

      <section class="nbt-step" aria-labelledby="nbt-step2">
        <h2 id="nbt-step2"><span class="nbt-step__num">2</span>Logó és feliratok</h2>
        <div class="nbt-logo">
          <button type="button" class="nbt-btn nbt-btn--primary" id="nbt-upload">Logó feltöltése</button>
          <input type="file" id="nbt-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
          <span class="nbt-logo__name" id="nbt-logo-name">PNG, JPG, SVG – átlátszó hátterű PNG a legjobb.</span>
        </div>
        <p class="nbt-help">Kattints egy elhelyezésre: a jó helyre és jó méretben tesszük, utána szabadon mozgathatod és méretezheted.</p>
        <div class="nbt-presets" id="nbt-presets"></div>
        <button type="button" class="nbt-btn" id="nbt-add-text">+ Saját felirat</button>
      </section>

      <section class="nbt-step" aria-labelledby="nbt-step3">
        <h2 id="nbt-step3"><span class="nbt-step__num">3</span>Színek, méretek, darabszám</h2>
        <div class="nbt-rows" id="nbt-rows"></div>
        <label class="nbt-add-color" id="nbt-add-color-wrap"><span>+ Másik szín hozzáadása</span><select id="nbt-add-color"></select></label>
      </section>

      <section class="nbt-summary" id="nbt-summary" aria-live="polite">
        <h2>Összesítő</h2>
        <dl class="nbt-summary__list">
          <div><dt>Darabszám</dt><dd id="nbt-sum-qty">0 db</dd></div>
          <div><dt>Nyomat / db</dt><dd id="nbt-sum-print">–</dd></div>
          <div id="nbt-sum-discount-row" hidden><dt>Mennyiségi kedvezmény</dt><dd id="nbt-sum-discount"></dd></div>
          <div><dt>Darabár</dt><dd id="nbt-sum-unit">–</dd></div>
          <div class="nbt-summary__total"><dt>Összesen</dt><dd id="nbt-sum-total">–</dd></div>
        </dl>
        <ul class="nbt-placements" id="nbt-placements"></ul>
        <p class="nbt-next-tier" id="nbt-next-tier" hidden></p>
        <p class="nbt-error" id="nbt-error" role="alert" hidden></p>
        <button type="button" class="nbt-btn nbt-btn--primary nbt-btn--block" id="nbt-cart">Kosárba</button>
        <p class="nbt-note">A végleges árat a kosár mutatja. A kedvezmény a teljes darabárra (termék + nyomat) jár, az összes szín és méret darabszáma összeadódik.</p>
      </section>
    </div>

    <div class="nbt-bar" id="nbt-bar">
      <div class="nbt-bar__info"><span id="nbt-bar-qty">0 db</span><strong id="nbt-bar-total">–</strong></div>
      <button type="button" class="nbt-btn nbt-btn--primary" id="nbt-bar-cart">Kosárba</button>
    </div>
  </section>

  <div class="nbt-busy" id="nbt-busy" hidden><div class="nbt-busy__box"><span class="nbt-spinner" aria-hidden="true"></span><p id="nbt-busy-text">Terv mentése…</p></div></div>
  <div class="nbt-toast" id="nbt-toast" role="status" hidden></div>
</div>
