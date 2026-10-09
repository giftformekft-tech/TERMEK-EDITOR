<?php
if ( ! defined('ABSPATH') ) exit;
$nbt_intro = function_exists('nb_team_intro_view') ? nb_team_intro_view() : [];
$nbt_icons = [
  'work'  => '<svg viewBox="0 0 64 64"><path d="M22 10l-14 8 5 13 7-3v26h24V28l7 3 5-13-14-8c-2 5-6 8-10 8s-8-3-10-8z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="36" y="30" width="8" height="8" rx="1.5" fill="currentColor"/></svg>',
  'sport' => '<svg viewBox="0 0 64 64"><path d="M22 10l-14 8 5 13 7-3v26h24V28l7 3 5-13-14-8c-2 5-6 8-10 8s-8-3-10-8z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><text x="32" y="47" text-anchor="middle" font-size="17" font-weight="700" font-family="Arial" fill="currentColor">10</text></svg>',
];
?>
<div class="nbt" id="nbt-app" data-view="mode">
  <section class="nbt-mode" id="nbt-mode" aria-labelledby="nbt-mode-title">
    <?php if (!empty($nbt_intro['kicker'])): ?><p class="nbt-kicker"><?php echo esc_html($nbt_intro['kicker']); ?></p><?php endif; ?>
    <h1 id="nbt-mode-title"><?php echo esc_html($nbt_intro['title'] ?? 'Mit tervezel?'); ?></h1>
    <?php if (!empty($nbt_intro['lead'])): ?><p class="nbt-lead"><?php echo nl2br(esc_html($nbt_intro['lead'])); ?></p><?php endif; ?>
    <div class="nbt-mode__grid">
      <?php foreach (['work', 'sport'] as $nbt_key): $nbt_card = $nbt_intro['cards'][$nbt_key] ?? []; ?>
        <button type="button" class="nbt-mode-card" data-mode="<?php echo esc_attr($nbt_key); ?>">
          <span class="nbt-mode-card__icon" aria-hidden="true"><?php echo $nbt_icons[$nbt_key]; // statikus SVG ?></span>
          <strong><?php echo esc_html($nbt_card['title'] ?? ''); ?></strong>
          <?php if (!empty($nbt_card['text'])): ?><span class="nbt-mode-card__text"><?php echo nl2br(esc_html($nbt_card['text'])); ?></span><?php endif; ?>
        </button>
      <?php endforeach; ?>
    </div>
    <div class="nbt-draft" id="nbt-draft" hidden>
      <span>Van egy befejezetlen terved ebben a böngészőben.</span>
      <button type="button" class="nbt-btn nbt-btn--primary" id="nbt-draft-restore">Folytatom</button>
      <button type="button" class="nbt-btn" id="nbt-draft-discard">Újat kezdek</button>
    </div>
    <?php $nbt_banner = $nbt_intro['banner'] ?? []; if (!empty($nbt_banner['image_url']) || !empty($nbt_banner['title']) || !empty($nbt_banner['text'])): ?>
      <figure class="nbt-mode-banner">
        <?php if (!empty($nbt_banner['image_url'])): ?><img src="<?php echo esc_url($nbt_banner['image_url']); ?>" alt="<?php echo esc_attr($nbt_banner['image_alt'] ?? ''); ?>" loading="lazy"><?php endif; ?>
        <?php if (!empty($nbt_banner['title']) || !empty($nbt_banner['text'])): ?>
          <figcaption>
            <?php if (!empty($nbt_banner['title'])): ?><h2><?php echo esc_html($nbt_banner['title']); ?></h2><?php endif; ?>
            <?php if (!empty($nbt_banner['text'])): ?><p><?php echo nl2br(esc_html($nbt_banner['text'])); ?></p><?php endif; ?>
          </figcaption>
        <?php endif; ?>
      </figure>
    <?php endif; ?>
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
        <div class="nbt-view-note" id="nbt-view-note" hidden><span id="nbt-view-text"></span><button type="button" class="nbt-btn nbt-btn--small" id="nbt-view-back">Vissza a szerkesztéshez</button></div>
      </div>
      <div class="nbt-selection" id="nbt-selection" hidden>
        <div class="nbt-selection__row nbt-selection__text">
          <label class="nbt-field nbt-field--grow"><span>Tartalom</span><select id="nbt-bind"><option value="">Mindenkinél ugyanaz</option><option value="name">Név a névsorból</option><option value="number" id="nbt-bind-number">Szám a névsorból</option></select></label>
          <label class="nbt-field nbt-field--grow" id="nbt-text-field"><span id="nbt-text-label">Felirat</span><textarea id="nbt-text-input" rows="1" maxlength="120" autocomplete="off"></textarea></label>
          <p class="nbt-bind-hint" id="nbt-bind-hint" hidden>A szöveg darabonként a névsorból jön. Most ez látszik: <strong id="nbt-bind-current"></strong></p>
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
      <section class="nbt-step nbt-prices" aria-label="Darabárak">
        <div class="nbt-bands" id="nbt-bands"></div>
      </section>

      <section class="nbt-step" aria-labelledby="nbt-step1">
        <h2 id="nbt-step1"><span class="nbt-step__num">1</span>Termék és szín</h2>
        <div class="nbt-types" id="nbt-types"></div>
        <p class="nbt-label">Alapszín <small id="nbt-color-name"></small></p>
        <div class="nbt-swatches" id="nbt-colors"></div>
        <p class="nbt-help nbt-colors-note">Ez az előnézet színe. Később, a darabszámnál további színeket is hozzáadhatsz a rendeléshez.</p>
      </section>

      <section class="nbt-step" aria-labelledby="nbt-step2">
        <h2 id="nbt-step2"><span class="nbt-step__num">2</span>Logó és feliratok</h2>
        <div class="nbt-logo">
          <button type="button" class="nbt-btn nbt-btn--primary" id="nbt-upload">Logó feltöltése</button>
          <button type="button" class="nbt-btn" id="nbt-upload-image">Saját kép feltöltése</button>
          <input type="file" id="nbt-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
          <input type="file" id="nbt-image-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
          <span class="nbt-logo__name" id="nbt-logo-name">Logó: a sablonok ezt teszik a helyére. Saját kép: bármilyen kép vagy fotó, szabadon elhelyezve. PNG, JPG, SVG.</span>
        </div>
        <p class="nbt-help">Kattints egy elhelyezésre: a jó helyre és jó méretben tesszük, utána szabadon mozgathatod és méretezheted.</p>
        <div class="nbt-presets" id="nbt-presets"></div>
        <button type="button" class="nbt-btn" id="nbt-add-text">+ Saját felirat</button>
      </section>

      <section class="nbt-step" id="nbt-step-roster" aria-labelledby="nbt-step-roster-title" hidden>
        <h2 id="nbt-step-roster-title"><span class="nbt-step__num">3</span>Névsor</h2>
        <p class="nbt-help" id="nbt-roster-help"></p>
        <div class="nbt-roster" id="nbt-roster"></div>
        <button type="button" class="nbt-btn" id="nbt-add-player">+ Játékos</button>
      </section>

      <section class="nbt-step" aria-labelledby="nbt-step-qty-title">
        <h2 id="nbt-step-qty-title"><span class="nbt-step__num" id="nbt-step-qty-num">3</span>Színek, méretek, darabszám</h2>
        <div id="nbt-qty-grid">
          <div class="nbt-rows" id="nbt-rows"></div>
          <div class="nbt-add-color" id="nbt-add-color-wrap"><span id="nbt-add-color-label">+ Másik szín hozzáadása</span><div class="nbt-add-color__list" id="nbt-add-color"></div></div>
        </div>
        <div id="nbt-qty-roster" hidden>
          <p class="nbt-help">A darabszám a névsorból adódik: minden sor egy darab. Név nélküli darabot a névsorban üres sorral adhatsz hozzá.</p>
          <div class="nbt-qty-summary" id="nbt-qty-summary"></div>
          <p class="nbt-roster-sum" id="nbt-roster-sum"></p>
        </div>
      </section>

      <section class="nbt-summary" id="nbt-summary" aria-live="polite">
        <h2>Összesítő</h2>
        <dl class="nbt-summary__list">
          <div><dt>Darabszám</dt><dd id="nbt-sum-qty">0 db</dd></div>
          <div><dt>Nyomtatás</dt><dd id="nbt-sum-sides">–</dd></div>
          <div><dt>Darabár</dt><dd id="nbt-sum-unit">–</dd></div>
          <div id="nbt-sum-size-row" hidden><dt>Méretfelár</dt><dd id="nbt-sum-size"></dd></div>
          <div id="nbt-sum-personal-row" hidden><dt>Név felár</dt><dd id="nbt-sum-personal"></dd></div>
          <div class="nbt-summary__total"><dt>Összesen</dt><dd id="nbt-sum-total">–</dd></div>
        </dl>
        <p class="nbt-next-tier" id="nbt-next-tier" hidden></p>
        <p class="nbt-error" id="nbt-error" role="alert" hidden></p>
        <button type="button" class="nbt-btn nbt-btn--primary nbt-btn--block" id="nbt-cart">Kosárba</button>
        <p class="nbt-note">A darabár a nyomtatással együtt értendő. Kétoldalas, ha elöl és hátul is van minta. Az ársávot a teljes darabszám adja: az összes szín és méret összeadódik.</p>
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
