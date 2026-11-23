const $ = id => document.getElementById(id);
const translations = {
 'pt-BR': {
  caption:'Idioma', eyebrow:'SEU VÍDEO, EM UM SÓ LUGAR', title:'Assista aos seus vídeos',
  subtitle:'Cole um link compartilhável do Google Drive para começar a reprodução.',
  linkLabel:'Link do vídeo no Google Drive', placeholder:'https://drive.google.com/file/d/...',
  play:'▶ Reproduzir', hint:'O arquivo precisa estar compartilhado como <b>Qualquer pessoa com o link — Leitor</b>.',
  player:'PLAYER DE VÍDEO', fullscreen:'Tela cheia', emptyTitle:'Seu vídeo aparecerá aqui',
  emptyText:'Insira o link do Google Drive acima e clique em Reproduzir.',
  provider:'Reprodução fornecida pelo Google Drive', open:'Abrir no Google Drive ↗',
  helpTitle:'Não conseguiu reproduzir?', help1:'Abra o vídeo no Google Drive e selecione <b>Compartilhar</b>.',
  help2:'Em “Acesso geral”, escolha <b>Qualquer pessoa com o link</b>.',
  help3:'Confirme a permissão <b>Leitor</b> e tente novamente.',
  helpNote:'A reprodução depende das permissões e dos formatos aceitos pelo Google Drive.',
  languageNote:'A seleção de idioma altera a interface deste site. O idioma dos controles internos do vídeo é controlado pelo Google Drive e não pode ser forçado por esta página.',
  footer:'DrivePlayer · Interface em Português (Brasil)',
  empty:'Cole o link do vídeo antes de continuar.', invalid:'Insira um endereço válido do Google Drive.',
  badId:'Não consegui identificar o arquivo. Copie o link de compartilhamento do vídeo.',
  loaded:'Link reconhecido. Se o vídeo não carregar, verifique o compartilhamento no Google Drive.',
  fullscreenError:'Não foi possível ativar a tela cheia neste navegador.'
 },
 en: {
  caption:'Language', eyebrow:'YOUR VIDEO, ALL IN ONE PLACE', title:'Watch your videos',
  subtitle:'Paste a shareable Google Drive link to start playback.',
  linkLabel:'Google Drive video link', placeholder:'https://drive.google.com/file/d/...',
  play:'▶ Play', hint:'The file must be shared as <b>Anyone with the link — Viewer</b>.',
  player:'VIDEO PLAYER', fullscreen:'Fullscreen', emptyTitle:'Your video will appear here',
  emptyText:'Paste your Google Drive link above and click Play.',
  provider:'Playback provided by Google Drive', open:'Open in Google Drive ↗',
  helpTitle:'Video not playing?', help1:'Open the video in Google Drive and select <b>Share</b>.',
  help2:'Under “General access”, choose <b>Anyone with the link</b>.',
  help3:'Make sure the permission is <b>Viewer</b>, then try again.',
  helpNote:'Playback depends on Google Drive permissions and supported video formats.',
  languageNote:'This language selector changes this website interface. The embedded video controls are managed by Google Drive; this page cannot force their language.',
  footer:'DrivePlayer · English interface',
  empty:'Paste the video link before continuing.', invalid:'Enter a valid Google Drive URL.',
  badId:'Could not identify the file. Copy the video sharing link.',
  loaded:'Link recognized. If the video does not load, check its Google Drive sharing settings.',
  fullscreenError:'Fullscreen could not be enabled in this browser.'
 },
 es: {
  caption:'Idioma', eyebrow:'TU VÍDEO, TODO EN UN SOLO LUGAR', title:'Mira tus vídeos',
  subtitle:'Pega un enlace compartido de Google Drive para comenzar la reproducción.',
  linkLabel:'Enlace del vídeo de Google Drive', placeholder:'https://drive.google.com/file/d/...',
  play:'▶ Reproducir', hint:'El archivo debe compartirse como <b>Cualquier persona con el enlace — Lector</b>.',
  player:'REPRODUCTOR DE VÍDEO', fullscreen:'Pantalla completa', emptyTitle:'Tu vídeo aparecerá aquí',
  emptyText:'Introduce el enlace de Google Drive y pulsa Reproducir.',
  provider:'Reproducción proporcionada por Google Drive', open:'Abrir en Google Drive ↗',
  helpTitle:'¿No se reproduce?', help1:'Abre el vídeo en Google Drive y selecciona <b>Compartir</b>.',
  help2:'En “Acceso general”, elige <b>Cualquier persona con el enlace</b>.',
  help3:'Confirma el permiso <b>Lector</b> e inténtalo de nuevo.',
  helpNote:'La reproducción depende de los permisos y formatos compatibles con Google Drive.',
  languageNote:'El selector cambia el idioma de este sitio. Los controles internos del vídeo los administra Google Drive y esta página no puede forzar su idioma.',
  footer:'DrivePlayer · Interfaz en Español',
  empty:'Pega el enlace del vídeo para continuar.', invalid:'Introduce una URL válida de Google Drive.',
  badId:'No se pudo identificar el archivo. Copia el enlace para compartir el vídeo.',
  loaded:'Enlace reconocido. Si el vídeo no carga, revisa los permisos de Google Drive.',
  fullscreenError:'No se pudo activar la pantalla completa en este navegador.'
 }
};
let currentLang = 'pt-BR';
function setLanguage(lang) {
 currentLang = translations[lang] ? lang : 'pt-BR';
 const t = translations[currentLang];
 document.documentElement.lang = currentLang;
 const map = {
  languageCaption:'caption', eyebrow:'eyebrow', title:'title', subtitle:'subtitle',
  linkLabel:'linkLabel', playButton:'play', hint:'hint', playerLabel:'player',
  fullscreenText:'fullscreen', emptyTitle:'emptyTitle', emptyText:'emptyText',
  providerText:'provider', openDrive:'open', helpTitle:'helpTitle', help1:'help1',
  help2:'help2', help3:'help3', helpNote:'helpNote', languageNote:'languageNote', footer:'footer'
 };
 for (const [id,key] of Object.entries(map)) $(id).innerHTML = t[key];
 $('driveLink').placeholder = t.placeholder;
 $('languageSelect').value = currentLang;
}
function extractDriveId(raw) {
 let url;
 try { url = new URL(raw); } catch { throw new Error(translations[currentLang].invalid); }
 if (!['drive.google.com','www.drive.google.com','docs.google.com'].includes(url.hostname))
  throw new Error(translations[currentLang].invalid);
 const match = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
 const id = match ? match[1] : (url.searchParams.get('id') || '');
 if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(translations[currentLang].badId);
 return id;
}
function loadVideo() {
 const t = translations[currentLang], raw = $('driveLink').value.trim();
 $('status').textContent = '';
 if (!raw) { $('status').textContent = t.empty; $('driveLink').focus(); return; }
 try {
  const id = extractDriveId(raw);
  $('videoFrame').src = `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  $('videoFrame').hidden = false;
  $('emptyState').hidden = true;
  $('fullscreenButton').disabled = false;
  $('openDrive').hidden = false;
  $('openDrive').onclick = () => window.open(`https://drive.google.com/file/d/${encodeURIComponent(id)}/view`, '_blank', 'noopener');
  $('status').textContent = t.loaded;
 } catch (e) { $('status').textContent = e.message; }
}
$('languageSelect').addEventListener('change', e => setLanguage(e.target.value));
$('playButton').addEventListener('click', loadVideo);
$('driveLink').addEventListener('keydown', e => { if (e.key === 'Enter') loadVideo(); });
$('fullscreenButton').addEventListener('click', async () => {
 try {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await $('playerFrame').requestFullscreen();
 } catch { $('status').textContent = translations[currentLang].fullscreenError; }
});
setLanguage('pt-BR');
