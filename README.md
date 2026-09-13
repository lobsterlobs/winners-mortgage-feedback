# Уиннърс Ипотека — обратна връзка и препоръки

Черно-златна благодарствена страница с кратка анкета, ваучер и два QR кода.

## Консултант по подразбиране

В демото се показва **Даниела Караконов** с код `DK`.

Името не е заключено в дизайна. За друг служител добави нов запис в `CONFIG.consultants` в `config.js` и отвори страницата с неговия код, например:

```text
?advisor=GS
```

## Логика с два QR кода

### QR 1: консултантът към обслужения клиент

Отвори служебния екран:

```text
http://localhost:8080/?staff=true&advisor=DK
```

Даниела въвежда по желание име и клиентски номер. Страницата генерира QR и линк към благодарността и трите въпроса.

### QR 2: обслуженият клиент към свой близък

След анкетата клиентът вижда:

- ваучера си
- номер на ваучера
- един QR към дигиталната визитка на Даниела
- линк за споделяне

Ваучерът се получава, когато човекът, отворил линка, стане клиент на Уиннърс Ипотека за ипотечен кредит.

## Стартиране локално

```bash
python3 -m http.server 8080
```

Служебен екран:

```text
http://localhost:8080/?staff=true&advisor=DK
```

Клиентско демо:

```text
http://localhost:8080/?advisor=DK&name=Иван&client=1042&demo=true
```

## GitHub Pages

Качи всички файлове от папката в GitHub repository и активирай GitHub Pages. QR адресите се изграждат от текущия домейн и път.

## Настройки

Основните данни са в `config.js`:

- консултанти и техните кодове
- телефон, WhatsApp, Viber, имейл и адрес
- стойност и вид на ваучера
- застрахователни продукти

## Тестова версия

Анкетата и номерът се пазят само в `localStorage` на устройството. Страницата остава отворена за многократно попълване чрез бутона „Попълни отново“.

## Лого

Проектът вече използва приложеното официално лого на Winners Group от `assets/logo/winners-logo-official.jpg`.

## GitHub Pages

1. Създайте ново публично или частно хранилище.
2. Качете всички файлове от корена на тази папка, без допълнителна външна директория.
3. Отворете Settings → Pages.
4. Изберете Deploy from a branch, branch `main`, folder `/root`.
5. Вторият QR води към `https://atelierv.design/smart-card/` и добавя параметрите `ref` и `advisor`, за да се запази връзката с препоръката и консултанта.

Името и данните на консултанта се сменят в `config.js`.

## Качване в GitHub Pages

Използвай точно име на repository: `winners-mortgage-feedback`.

1. GitHub → New repository.
2. Repository name: `winners-mortgage-feedback`.
3. Public → Create repository.
4. Upload files и качи всички файлове от ZIP архива директно в основната папка.
5. Commit changes.
6. Settings → Pages.
7. Source: Deploy from a branch.
8. Branch: `main`, folder: `/ (root)` → Save.

Адресът ще бъде:

`https://lobsterlobs.github.io/winners-mortgage-feedback/`

Тест за Даниела:

`https://lobsterlobs.github.io/winners-mortgage-feedback/?advisor=DK&client=1001&demo=true`

Служебен екран за генериране на първия QR:

`https://lobsterlobs.github.io/winners-mortgage-feedback/?staff=true&advisor=DK`
