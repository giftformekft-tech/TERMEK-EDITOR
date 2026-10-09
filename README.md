# TERMEK-EDITOR

## Tervező felület (2.2)

A `/tervezd-meg/` oldal tervezője egyetlen, mobilra és asztali gépre egyaránt tervezett felületet kapott:

- **Asztali gépen** balra az eszközök (Termék, Feltöltés, Szöveg, Elemek, Sablonok) és a nyitott eszközpanel, középen a vászon, jobbra a kijelölt elem beállításai (Formázás / Rétegek) és a rendelési összesítő látható. A „Tervezd meg” cím és a Segítség a vászon alatt marad.
- **Tableten** az eszközpanel lebegve nyílik a vászon fölött, és hozzáadás után magától bezárul.
- **Mobilon** felül a termék (szín, méret) és a Kosárba gomb az árral, középen a vászon, alul öt fül. A panelek alsó lapként nyílnak, a fülsor közben is elérhető marad, a vászon pedig a lap fölötti részre igazodik.
- A kijelölt elemhez a vászon alján gyorsmenü jelenik meg (Formázás, Másolat, Előre, Hátra, Középre, Törlés).
- A szín- és méretválasztás közvetlenül a Termék panelen történik. Több méret esetén a vásárlónak kifejezetten választania kell; a Kosárba gomb ilyenkor megmutatja, mi hiányzik.
- A feliratot szövegmezőben lehet beírni és később szerkeszteni, ami telefonon is megbízhatóan működik.
- A Hátlap gombbal azonnal bekapcsolható a kétoldalas nyomtatás; a felár a gomb mellett látszik, és csak akkor kerül az árba, ha a hátlapon is van minta.
- Képet a vászonra húzva vagy Ctrl+V-vel is fel lehet tenni, a sablonok a panelben böngészhetők, az előnézet mód segédvonalak nélkül mutatja a terméket.
- A böngésző automatikusan megjegyzi a befejezetlen tervet, és visszatéréskor felajánlja a folytatást. Sikeres kosárba tétel után a piszkozat törlődik.
- A vászon belső mérete fix, csak a megjelenítés méreteződik, így ablakméret-változáskor vagy a mobilbillentyűzet megjelenésekor a tervben lévő elemek nem mozdulnak el.

## Csapatruha tervező (2.3)

Külön modul a `/csapatruha-tervezo/` oldalon (`[nb_team_designer]` shortcode). Az oldal automatikusan létrejön; a webhely menüjébe a Megjelenés → Menük oldalon vehető fel. Az eredeti `/tervezd-meg/` tervezőt nem érinti, a beállításait csak olvassa (termékek, színek, méretek, mockupok, kedvezménysávok).

- **Típusválasztó:** munkaruha / céges ruha vagy csapatmez / sportpóló. A felső címke, a cím, a bevezető szöveg, valamint a két kártya címe, leírása és képe az adminból szerkeszthető; kép nélkül a kártyán ikon látszik. A `?mode=work` vagy `?mode=sport` paraméterrel közvetlenül indítható, a `nb_product` és `nb_type` paraméter előválasztja a terméket.
- **Termék és alapszín:** az előnézet a választott szín mockupján látszik, elöl és hátul.
- **Elhelyezési segédsablonok:** egy kattintással a jó helyre és mm-ben megadott méretre kerül a logó, felirat vagy szám (pl. bal mell logó 9×9 cm, hát szám 25 cm). Utána minden elem szabadon mozgatható és méretezhető; a nyomtatási felületből nem lóghat ki.
- **Színek × méretek:** színenként egy sor, méretenként darabszám. Bármennyi szín hozzáadható (az adminban beállított korlátig), a darabszámok összeadódnak.
- **Névsor:** a 3. lépés „Névsor” fülén mezenként egy sor (név, szám, méret, szín), a „+ Játékos” gombbal vagy a szám mezőben Enterrel bővíthető. A darabszám a névsorból adódik; név vagy szám nélküli mez is felvehető. Ha előbb darabszámokat adott meg a vevő, a Névsorra váltáskor ennyi üres sor jelenik meg a méretekkel és színekkel. Egy játékosra kattintva a mezen az ő neve és száma látszik. Figyelmeztet, ha egy színen belül egy szám többször szerepel.
- **Névsorból jövő feliratok:** a kijelölt feliratnál választható a tartalom: „Mindenkinél ugyanaz”, „Játékos neve” vagy „Játékos száma”. A csapatmez „Hát név”, „Hát szám” és „Jobb mell szám”, valamint a munkaruha „Jobb mell felirat” sablonja alapból a névsorból kap szöveget (az adminban sablononként állítható). A közös nyomdai fájl ezek nélkül készül, a nevek és számok játékosonként külön, ugyanakkora átlátszó PNG-be kerülnek; ezek a rendelés tételénél, a játékoslistában tölthetők le.
- **Ár:** darabonként a termék (variációs) ára + a nyomatok fix ára. Egy nyomat a terv egy oldalán egymáshoz közeli elemek csoportja; az árát a befoglaló méretéhez illő sáv adja (Kis / Közepes / Nagy). A mennyiségi kedvezmény a teljes darabárra jár. Az árat a szerver újraszámolja, a kosárban a darabár tartalmazza a nyomatot.
- **Figyelmeztetések:** ha egy felirat beleolvad valamelyik rendelt színbe, vagy a logó felbontása kevés a választott mérethez.
- **Kosárba:** egy kattintással; a nyomdai PNG oldalanként egyszer készül (300 dpi, legfeljebb 3600 px széles), az előnézet színenként. Minden szín–méret páros külön kosársor, egy kedvezménycsoportban.
- **Piszkozat:** a böngésző megjegyzi a befejezetlen tervet, és visszatéréskor felajánlja a folytatást.

Beállítások: **Terméktervező → Csapatruha tervező** (típusválasztó szövegei és képei, termékek, nyomatsávok ára és mérete, csoportosítási távolság, minimum darabszám, színek és játékosok száma, név/szám felár, segédsablonok és hogy melyik a névsorból kap szöveget). A `/csapatpolo/` oldal gombjai erre a modulra mutatnak.

A mennyiségi kedvezmény az eredeti tervezőben is a termék és a hozzá tartozó egyedi nyomat együttes árára jár.

## Tervező megjelenése

A Terméktervező → Megjelenés oldalon a teljes tervezői felület színvilága és lekerekítése állítható. A módosítások élő miniatűr előnézetben láthatók, az alapértékek visszaállítása pedig csak a mezőket és az előnézetet módosítja; a tartós alkalmazáshoz külön mentés szükséges. A beállítások a meglévő termék-, mockup- és árazási konfigurációtól függetlenül, az `appearance` kulcs alatt tárolódnak.

## Főoldali Gutenberg-blokk

A bővítmény az **„Egyedi terméktervező – főoldali blokk”** nevű dinamikus blokkot adja a Gutenberg szerkesztőhöz.

- A kártyák a Terméktervező beállításaiban saját kezűleg felvitt terméktípusokból épülnek fel.
- A blokk oldalsávjában minden terméktípus külön megjeleníthető vagy elrejthető.
- A sötét alapszín, a kártyák háttérszíne és a kiemelő szín a blokk oldalsávjában állítható.
- A csapatruházati részhez átlátszó hátterű kabala-PNG tölthető fel, bal vagy jobb oldali elhelyezéssel.
- A csapatruházati kabala mérete csúszkával állítható.
- Külön kabala-PNG helyezhető a termékválasztó címe mellé, saját pozíció- és méretbeállítással.
- Külön beállítható az összes megjelenő csempe száma, valamint az egy sorba kerülő csempék száma PC-n és mobilon.
- A terméktípusok kompakt mockupképpel jelennek meg.
- A termékválasztó címkéjének, főcímének, leírásának, a csempék címeinek és kisebb szövegeinek színe és betűmérete külön állítható.
- A csapatruházati címke, főcím és leírás színe és betűmérete szintén külön szerkeszthető.
- A csapatoknak, cégeknek és munkaruházathoz szóló ajánlati rész külön kapcsolható.
- A címsorok és marketingszövegek közvetlenül a blokkszerkesztőben módosíthatók.
- A kártyák a kiválasztott terméktípust és a hozzá rendelt WooCommerce-terméket előtöltve nyitják meg a `/tervezd-meg/` oldalt.

## Csapatpóló landing oldal

A bővítmény automatikusan létrehozza az **„Egyedi csapatpóló és logózott munkaruha”** oldalt a `/csapatpolo/` címen. Az oldal a `[nb_teamwear]` shortcode-dal működik, és dinamikusan megjeleníti:

- az adminban beállított mennyiségi kedvezményszinteket;
- a felvitt, tervezhető terméktípusokat;
- az egyes típusokhoz tartozó mockupokat és közvetlen tervezőlinkeket.

A főoldali Gutenberg-blokk csapatruházati gombja alapértelmezetten erre az oldalra mutat.

A csapatpóló oldal Gutenbergben **„Csapatpóló landing oldal”** blokként szerkeszthető. Az oldalsávban négy szín, valamint három külön kabala-PNG állítható be:

1. nyitó szekció;
2. kedvezmények melletti pozíció;
3. záró felhívás.
