# Taste of Color Experiment — RD / 6 tastes

元の `exp1.zip` と `exp2.zip` を実際に展開・照合して作成した、GitHub Pages用の静的サイトです。PHP・MySQL・旧Google保存先は使用しません。

**実験画面は元のHTML/CSS/英語を維持しています。** ユーザー承認済みの変更として、開始画面の味覚名の列挙だけを `salty, sweet, sour, bitter, umami, and spicy` に変更しました。タイルのHSL値・サイズ・間隔・枠線・描画順序規則・フォント指定・ボタン位置は元コードのままです。日本語化やレスポンシブ再設計はしていません。

初期設定は `demoMode: false`、Web App URL未設定です。**設定前は開始できません。** 本番のGoogleデプロイ・Spreadsheet作成・GitHub公開は、このZIPを配置しただけでは実施されません。

## 1. 構成と実験の流れ

```text
GitHub Pages（HTML / CSS / JavaScript）
  ├─ 端末のlocalStorage：順序・回答・未送信データ
  └─ Google Apps Script Web App：検証・重複防止
       └─ 新しい非公開Google Spreadsheet
```

1. `index.html`：元の画面回転案内。
2. `start.html`：Subject ID / age。開始画面のレイアウトと英文を継承。
3. `Page2.html`：元の10色のPractice Trial。練習回答は本解析データに含めません。
4. `welcome.html`：元の味覚案内画面。
5. `color-1-2.html`：元のRD画面。点数0〜5を選択し、150色をクリック／タッチ操作で評価。
6. 右下の `⇨` で150回答を確定・保存。サーバー保存確認後、次の味覚案内へ。
7. Sweet / Sour / Salty / Bitter / Umami / Spicyを各1回、合計900回答。6味覚すべての保存確認後に元の `thankyou.html` を表示。

STの実験画面・実行分岐・データ保存経路はありません。味覚順は被験者の新規セッションごとにFisher–Yates法でランダム化し、150色の配置も味覚ごとに独立にランダム化します。途中復帰では再抽選しません。練習画面の英文（bitterness等）も元のままです。

**RDの「提示順」は逐次1色提示ではありません。元実験と同じ150色一覧の配列／配置順です。** 上から下へ12行、次の列へ進むCSSの規則をそのまま使います。150色目までを配置した結果、13列目は6色になります。被験者が実際にクリックした時系列は記録していません。

### ファイル

```text
index.html / start.html / Page2.html / welcome.html
color-1-2.html / thankyou.html    元の実験UIを静的化
styles.css                     元ファイルをバイト単位で保持
rotate-smartphone.png           元画像
Spin@1x-1.0s-200px-200px.gif      元ローディング画像
js/config.js                   公開Web App URL・デモ設定
js/core.js                     パレット・順序・データ検証
js/original-render.js          元のタイル描画処理
js/experiment.js               PHPに代わる実験制御・保存・再送
js/storage.js / transport.js   途中保存・保存確認
admin.html / js/admin.js        別画面の管理・バックアップ・再送
 google-apps-script/Code.gs     Googleに貼り付けるサーバー側コード
 google-apps-script/appsscript.json  任意のマニフェスト
 docs/                        比較報告・色対応表・検証記録
 tools/export_csv.py           長形式／2種の横形式CSV変換
 tests/                       自動テスト（外部パッケージ不要）
```

ビルドやnpm installは不要です。HTMLを含むこのフォルダの**中身**をリポジトリのルートに配置してください。

## 2. 新しいSpreadsheetとApps Script

1. Google Driveで空のGoogle Spreadsheetを新規作成します。旧実験のSpreadsheetは使いません。
2. SpreadsheetのURL `https://docs.google.com/spreadsheets/d/ここがID/edit` からIDを控えます。
3. Spreadsheetの「拡張機能 → Apps Script」を開きます。
4. エディタの `Code.gs` を同梱 `google-apps-script/Code.gs` の内容に置き換えて保存します。コードは1ファイルで完結します。
5. Apps Scriptの「プロジェクトの設定 → スクリプト プロパティ」に以下を登録します。

| プロパティ名 | 値 | 用途 |
|---|---|---|
| `SPREADSHEET_ID` | 手順2の新規Spreadsheet ID | 必須。ブラウザ側に置かない |
| `ACCEPTING_RESPONSES` | `true` | 受付開始。`false`または未設定なら保存拒否 |
| `ALLOWED_SUBJECT_IDS` | 例：`S001,S002,S003` | 任意の許可ID一覧。空／未設定は形式検証のみ |

6. エディタで関数 `setup` を選択して実行し、Googleアカウントの権限を確認・許可します。`Responses` と `Palette` の2シートが作られます。既存回答を消す処理ではありません。
7. `Responses` のヘッダーが315列、`Palette` に150色あることを確認します。既存ヘッダーが異なる場合はエラーになり、混在を防ぎます。

マニフェストを使用する場合は設定から `appsscript.json` の表示を有効にし、同梱内容を転記してください。タイムゾーンはUTC、V8、Spreadsheetの権限を指定しています。Spreadsheet自体を「リンクを知っている全員」に共有する必要はありません。

**コードやGitHub側にSpreadsheet ID、Googleトークン、パスワード、APIキーを書き込まないでください。** スクリプトプロパティはGoogle側だけに設定します。旧ZIP内のDB接続情報や送信先URLは新プロジェクトにコピーしていません。

## 3. Web Appデプロイ

1. Apps Scriptの「デプロイ → 新しいデプロイ」。種類で「ウェブアプリ」を選択。
2. 実行ユーザーは **自分（スクリプト所有者）**。
3. アクセスできるユーザーは **全員（Googleログイン不要で利用できる設定）**。
4. デプロイし、末尾が **`/exec`** のURLを控えます。開発用 `/dev` は使いません。
5. プライベートウィンドウでそのURLを開き、`{"ok":true,"service":"taste-color-rd","schemaVersion":1}` が表示されることを確認します。これは生存確認だけで、保存できた証明ではありません。
6. 保存テストを行い、`Responses` に実際の1行が作られることを確認します。

組織のGoogle Workspaceポリシーで匿名アクセスが禁止されている場合、この公開クライアント構成ではそのまま利用できません。管理者側で利用可能なアカウント／認証構成を判断してください。

`Code.gs` を変更したら「デプロイを管理 → 編集 → 新バージョン」で更新します。URLが変わった場合はブラウザ側も更新してください。通常は既存デプロイの新バージョンで同じURLを維持できます。

公式：[Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)、[Content Service](https://developers.google.com/apps-script/guides/content)。Content Serviceの応答にはGoogle側のリダイレクトがあるため、クライアントは追従してJSON応答を確認します。

## 4. Web App URLの設定

`js/config.js` を編集します。

```js
export const CONFIG = Object.freeze({
  webAppUrl: 'https://script.google.com/macros/s/あなたのデプロイID/exec',
  demoMode: false,
  timeoutMs: 30000
});
```

このURLはブラウザから送信するため公開情報です。秘匿APIキーではありません。フロントエンドに秘密のトークンを埋め込む方式は採用していません。IDの許可リストは本人認証ではなく、入力の取り違えを減らす管理機能です。公開エンドポイントには第三者も送信できるため、受付期間外は `ACCEPTING_RESPONSES=false` にし、管理者がテスト・不審データを確認してください。Origin/CORSによる認証を行う構成ではありません。

## 5. GitHub Pagesで公開

1. 新しいGitHubリポジトリを作成し、このフォルダ内のファイルをルートにアップロード・コミットします。元のexp1/exp2 ZIPやDB設定、実データはアップロードしません。
2. `index.html` がリポジトリのルートにあることを確認します。
3. 「Settings → Pages → Build and deployment」で `Deploy from a branch` を選択。
4. ブランチは `main`、フォルダは `/ (root)` を選択し保存。
5. 公開が完了したら表示された `https://ユーザー名.github.io/リポジトリ名/` を開きます。
6. `js/config.js` のURLと `demoMode:false` を再確認し、テストIDで通し試験を実施します。

`.nojekyll` を同梱しています。相対パスを使っているため `github.io/リポジトリ名/` 配下で動作します。Google Apps ScriptはPagesでは実行されず、Google側にデプロイしたものを使います。Pages上に同梱Code.gsが公開されても、設定値を埋めていなければSpreadsheet ID等は含まれません。

公式：[GitHub Pagesの作成](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)、[公開元の設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。利用プランや組織の設定で選択可能な公開条件は異なります。

## 6. 保存と再送

- **各回答の変更前に次の状態を作り、localStorageへの保存成功後に画面に反映**します。練習回答も保持します。
- 150色すべてが整数0〜5で埋まるまで `⇨` では進めません。0点は未回答扱いにしません。
- `⇨` で、その味覚の送信内容を確定します。確定後の変更はできません。未送信でも同じ内容を再送します。
- 送信は `text/plain;charset=utf-8` のPOSTでJSON本文を送り、CORSプリフライトを避けます。`no-cors` の不透明応答を成功扱いにはしません。
- 正しい `SubmissionKey` と送信内容のSHA-256が返ってきた場合だけ、保存確認済みにします。
- タイムアウト・回線断・Google側のエラー・ログインHTML・不正な応答は未確認のままです。
- 失敗後は約5秒、10秒、20秒…最大5分間隔で再送。回線復帰時と右下 `⇨` でも再試行できます。ページを閉じている間は送信しません。
- **保存確認まで次の味覚へ進みません。** 元のスピナーが送信中だけ表示されます。失敗時には元画面へ戻り、回答は端末に残ります。見た目・英文を増やさないため、詳細な失敗理由は別画面 `admin.html` に表示します。
- `SessionID:Taste` を一意キーにし、Google側のScriptLock下で既存行を調べます。同じキー・同じ内容の再送は既存の保存確認を返し、追加行を作りません。同じキーで内容が異なる場合は拒否します。
- 1味覚分は `Responses` の**1行を一括書き込み**します。150行を別々に追記する構成ではありません。
- Googleが保存した後に応答だけが途切れても、同じ内容を再送すれば重複を抑止できます。保存確認の直後にブラウザが閉じられた場合も同じ処理で復帰します。

通信状況を隠して成功したように見せることはありません。`thankyou.html` は全6味覚が確認済みの場合だけ表示します（デモ設定時は例外で送信しません）。

## 7. 途中復帰と管理

同じ端末・同じブラウザプロファイル・同じサイトのoriginで開き直し、同じSubject IDとageを入力すると続きへ移動します。途中のRDページを直接再読み込みしても同じ味覚・同じ150色配置・同じ回答を復元します。保存済みの味覚は再実施しません。

- 新規セッション時に6味覚と各150色の配置順をまとめて決めて保存します。
- 同じSubject IDでも全6味覚終了後に開始すると新しいSessionIDになります。同じ被験者を複数回収集する場合はSessionIDを解析で区別してください。
- 未完了データがある状態では、違うSubject IDで上書きできません。
- 同じoriginの複数タブの同時編集はWeb Locksで抑止します。2枚目は操作が停止するため、先の実験／管理タブを閉じて再読み込みします。
- シークレットモード終了、ブラウザのデータ削除、端末変更ではlocalStorageを引き継げません。**Subject IDを入力するだけでGoogleから回答を取り戻す機能はありません。** Google側は回答を公開読出ししません。
- localStorageが使用不能・容量不足・壊れたJSONの場合、無言で初期化せず実験を停止します。管理ページでバックアップしてから対応してください。
- 同じoriginでこの実験を複数設置するとローカル保存キーとロックを共有します。並行運用する場合は別originを使用してください。リポジトリ名の変更だけではoriginは分離されません。
- 通信断中も既に開いている画面で回答・保持は可能です。ただし**完全オフラインで新規ページを読み込むPWAではありません**。ページ遷移／再読み込みにはネット接続やブラウザキャッシュが必要です。

### 管理用ページ

実験URLの末尾を `admin.html` にして開きます。実験の参加者画面にはリンクを追加していません。

- 端末上のSubject ID、SessionID、味覚別回答数、未送信／確認済み状態、最後のエラーを表示。
- `Download backup JSON` で現在の端末データを保存。破損時も可能なら未加工の保存内容を取得します。
- `Retry pending saves` で確定済み・未確認の味覚を再送。実験タブを閉じてから実行します。
- `Clear this device` は確認後にローカルデータを消去。未送信データがあると追加確認します。先に必ずバックアップ・回収してください。Googleの行は削除しません。

管理ページは「この端末のデータを操作するページ」であり、サーバーの管理認証画面ではありません。他人のブラウザからあなたの回答を読めるページではありません。共用端末では回収後に端末データを消去してください。バックアップには年齢と回答が含まれるため、実データをGitHubへ置かないでください。

## 8. データ列仕様

### Responses：1被験者セッションにつき6行

| 列名 | 内容 |
|---|---|
| SchemaVersion | `1` |
| PaletteVersion | `hsl150-original-v1` |
| SubmissionKey | `SessionID:Taste`、再送の重複判定キー |
| PayloadSHA256 | 確定した送信JSONのSHA-256 |
| ReceivedAtUTC | Googleが最初に保存したUTC日時 |
| SessionID | 新規実験開始時のUUID |
| SubjectID | 入力したID。先頭英数字、以降英数字・`_`・`-`、最大64文字 |
| Age | 整数1〜120 |
| Taste | Sweet / Sour / Salty / Bitter / Umami / Spicy |
| Method | 常に `RD` |
| TasteOrder | その味覚の実施順、1〜6 |
| TasteSequenceJSON | セッション全体の味覚順序配列 |
| StartedAtUTC | そのRD画面の開始日時、端末時計 |
| CompletedAtUTC | 150回答を確定した日時、端末時計 |
| ColorsJSON | 配置順に並べた150個の色オブジェクト |
| Score001〜Score150 | ColorID順の0〜5回答。ランダム配置順ではない |
| Order001〜Order150 | 同じColorIDの配置位置、1〜150 |

315列です。先頭15列＋Score150列＋Order150列。`ColorsJSON` は以下のように色自体と配置と回答を同じオブジェクトに保存します。

```json
{"colorId":9,"h":0,"s":100,"l":25,"presentationOrder":37,"score":0}
```

`ColorID=9` は常に H=0 / S=100 / L=25。`presentationOrder=37` はその味覚のランダム配置で37番目という意味です。両者を混同しないでください。ColorIDと配置順は1始まりです。旧PHPの `box_number` は0始まりでした。

`Palette` シートと `docs/palette.csv` にはColorIDごとのH/S/L、旧RGB対応表上の色番号を保存しています。S/Lは百分率（0〜100）、Hは度（0〜330）。無彩色のHは旧コード同様0です。

## 9. HSL Analyzerとの互換性とCSV変換

**HSL Analyzer本体／その入力仕様は添付ZIPにありませんでした。厳密なインポート互換性は未検証です。** 旧コード内でも配列順とRGB→color番号表が一部異なるため、推測でScore列を置き換えることはしていません。詳細は `docs/ANALYSIS.md` を参照。

- 新しい正規ColorIDは元の `generateColors()` の配列順を保持。
- 旧 `xstack()` の `color1`〜`color150` 対応表とは、各HueのL=25の4色だけ順番が逆。
- そのため `Score009` と旧 `color9` は同じ色ではありません。
- HSLを明示した長形式を正規の解析入口にすることを推奨します。

Google Sheetsで **Responsesシートだけ** を選択し「ファイル → ダウンロード → CSV」で取得します。Python 3で次を実行します（外部ライブラリ不要）。

```sh
python3 tools/export_csv.py Responses.csv analysis-output
```

または管理ページのバックアップJSONから、確定済み味覚だけを変換できます。

```sh
python3 tools/export_csv.py taste-color-SESSION.json analysis-output
```

出力は次の3種類です。

- `long.csv`：1色1行。SubjectID/Age/Taste/Method/ColorID/PresentationOrder/H/S/L/Score等。全6味覚で900行。
- `wide-canonical.csv`：元generateColors順のScore001〜150。
- `wide-legacy-map.csv`：旧xstack対応表のcolor1〜150順。Analyzerがこの対応表を採用している場合に照合する候補です。

メタデータ列（SessionID等）を含むため、Analyzerによっては必要列の選択・列名対応が必要です。両横形式を同一とみなさず、少なくとも旧color9／新Score009のHSLを照合してください。`ServerConfirmed=false` はバックアップから回収したGoogle未確認データ。CSV変換はGoogleへ送信しません。未確定の途中回答はバックアップ内には残りますが、完成データのCSVには含めません。

## 10. ローカルテスト

### UI確認専用

1. 本番用とは別コピーを作り、`js/config.js` の `demoMode` を `true` にします。
2. フォルダ内で以下を実行します。

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

3. `http://127.0.0.1:8000/` を開きます。HTMLを直接ダブルクリックする `file://` では使わないでください。
4. `TEST_001` など実データと区別したIDで練習→6味覚を実行します。
5. デモ時は送信せずに元の画面遷移を確認できます。**実験UIにデモ表示は追加していません**。デモ・本番は必ず管理者が `admin.html` で区別してください。ローカル保存キーも分離されています。
6. 納品初期設定／本番設定は `demoMode:false` です。デモ回答を本番へ自動送信しません。

### 自動テスト

Node.js 22以降など、Web Cryptoに対応する現行Node.jsで：

```sh
node --test tests/*.test.mjs
```

または `npm test`。インストール処理は不要です。色定義、900回答、途中復元、0点、不正データ拒否、サーバーの重複防止、保存応答の照合、通信失敗、元CSSの一致を検証します。Google API部分はテスト用の代替実装なので、実アカウントでの認可・CORS・シート保存を証明するものではありません。

## 11. 本番前の確認

本番と別のテスト用Spreadsheet／Web Appで一度実施してください。

1. **元と同じ端末・ブラウザ・画面サイズ・表示倍率・明るさ**で比較。150タイル、色、間隔、枠線、Score/味覚/ボタン位置とKanitフォントを確認。
2. 10色練習、全味覚900回答、0点と5点を含める。味覚は重複なく6つ、各色IDは1〜150を1回ずつ。
3. 途中で再読み込み。点数、味覚順、配置順、練習完了状態が同じこと。
4. 1味覚を確定したらResponsesに1行、6味覚後は6行。同一SessionID・各Taste1行。ColorsJSONが150件。
5. 通信を切って確定。Thank youに進まず未確認状態で残ること。回線復帰・右下矢印・管理画面の再送で確認済みになり、二重登録しないこと。
6. 「Googleに書き込まれたがブラウザに応答が戻らなかった」状況も、同じ確定データの再送で行数が増えないことを確認。
7. `ACCEPTING_RESPONSES=false`、誤ったURL、匿名アクセス不可の場合に完了扱いにならないこと。Googleの「実行数」でエラーを確認。
8. Chrome / Edge / Safari / Firefoxの実際に使う端末でPOST後のJSON応答を受け取れること。CORSエラーを `no-cors` で隠す修正はしないでください。
9. CSV出力でColorID→HSL→Scoreを確認。暗い色の対応、無彩色6色、0点を重点確認。
10. 本番用Spreadsheet／URLへ設定し、デモ設定解除、許可ID、受付状態を確認。テストデータは本番解析から分離。

元CSSがvw/vh単位のため、**画面サイズ・表示倍率を変えれば元システムと同様にタイル寸法と隙間も変わります**。PHPを外すことでHSLやCSSは変わりませんが、端末の色管理・パネル・フォントの読込状況まで同一になる保証ではありません。外部Google FontsのKanit指定も元のまま残しています。Google側障害や利用上限がないことを保証するものではありません。

## 12. ズーム・スクロールの抑止

全参加者ページに固定viewport、overflow:hidden、touch-action:noneを適用し、ホイール、ピンチ、ダブルタップに相当するイベント、ページ内のCtrl/⌘＋ズームキーとスクロールキーを抑止します。単指での色評価は元の処理を維持しています。画面の寸法に合わせてタイルを縮小する変更は行っていません。元レイアウトが収まる横向き画面で実験してください。

ブラウザのメニューからの拡大、ブラウザが優先処理するショートカット、OSの拡大鏡、アクセシビリティ設定による強制ズームはWebサイトから完全には禁止できません。管理端末は表示倍率100%に統一し、厳密な固定が必要なら端末管理側のキオスク設定を使ってください。管理者用admin.htmlはデータの確認を妨げないようスクロール可能です。

## 13. 障害時

- 押しても進まない：まず `admin.html` で最後のエラー、URL設定、未送信状況を確認。実験タブを閉じてから管理再送。
- Googleのログイン画面が応答する：Web Appの公開範囲／実行者／`/exec`／組織ポリシーを再確認。
- Scriptの変更が反映されない：Web Appを新バージョンへ更新。
- Google保存済みでも端末は未確認：再送で保存確認を回収。Responsesの行をむやみに追加・編集しない。
- 「Conflict」：同じSessionID:Tasteの異なる内容。バックアップし、Google側の行と照合。既存データを勝手に上書きしません。
- 不正JSON／端末保存不能：上書きやブラウザデータ削除をせずバックアップ。元端末に残る途中回答と確定済み回答を管理者が確認。

詳細な検証結果は `docs/TEST_RESULTS.md`、元コードの比較は `docs/ANALYSIS.md` にあります。
