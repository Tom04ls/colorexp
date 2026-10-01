// 公開してよい Web App URL だけを設定。ID・パスワード・APIキーは記載しない。
export const CONFIG = Object.freeze({
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzCA6zKrk6Tr6nfaeTZ2vz0FDtrBPiwZPAeN0VN_fli6fmWNRth6Fkn2nGisRIUNfOu/exec', // https://script.google.com/macros/s/DEPLOYMENT_ID/exec
  demoMode: false, // true は動作確認専用。Google Sheetsへ保存されない。
  timeoutMs: 30000
});
