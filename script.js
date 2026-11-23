// ==========================================
// YOUTUBE PLAYER
// ==========================================

const urlInput = document.querySelector("#videoUrl");
const playButton = document.querySelector("#play");
const frame = document.querySelector("#frame");
const empty = document.querySelector("#empty");
const status = document.querySelector("#status");
const openYT = document.querySelector("#openYT");

// Extrair ID do vídeo do YouTube
function getYouTubeId(raw) {
  if (!raw) return null;

  try {
    const value = raw.trim();
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );
    const host = url.hostname.toLowerCase();

    let id = null;

    // Links curtos: youtu.be/ID
    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      id = url.pathname.split("/").filter(Boolean)[0];
    }

    // Links youtube.com
    else if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube-nocookie.com")
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else {
        const match = url.pathname.match(
          /\/(embed|shorts|live)\/([a-zA-Z0-9_-]+)/
        );

        if (match) {
          id = match[2];
        }
      }
    }

    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return id;
    }

    return null;
  } catch (error) {
    console.error("Erro ao identificar vídeo:", error);
    return null;
  }
}

// Carregar vídeo
function loadVideo() {
  status.textContent = "Verificando link...";

  const id = getYouTubeId(urlInput.value);

  if (!id) {
    status.textContent = "Link inválido. Verifique o endereço do YouTube.";
    return;
  }

  console.log("ID do vídeo:", id);

  const siteOrigin = window.location.origin;
  const siteUrl = window.location.href.split("#")[0];
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    autoplay: "1",
    playsinline: "1",
    origin: siteOrigin,
    widget_referrer: siteUrl,
  });

  frame.src = `https://www.youtube.com/embed/${id}?${params}`;

  frame.hidden = false;
  empty.hidden = true;

  openYT.href = "https://www.youtube.com/watch?v=" + id;
  openYT.hidden = false;

  status.textContent = "Abrindo o player do YouTube...";
}

window.loadVideo = loadVideo;

frame.addEventListener("load", function () {
  if (!frame.hidden) {
    status.textContent =
      "Player aberto. Se a reprodução automática for bloqueada, clique no play dentro do vídeo.";
  }
});

// Reproduzir ao pressionar Enter
urlInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    loadVideo();
  }
});

// Limpar player
document.querySelector("#clear").addEventListener("click", function () {
  frame.src = "";

  frame.hidden = true;

  empty.hidden = false;

  openYT.hidden = true;

  urlInput.value = "";

  status.textContent = "";

  urlInput.focus();
});

// ==========================================
// CONVERSOR DE ARQUIVOS LOCAIS PARA MP3
// ==========================================

const fileInput = document.querySelector("#localFile");

const filename = document.querySelector("#filename");

const convertButton = document.querySelector("#convert");

const progress = document.querySelector("#progress");

const bar = document.querySelector("#bar");

const convertStatus = document.querySelector("#convertStatus");

const download = document.querySelector("#download");

let file = null;
let downloadUrl = null;

function resetDownload() {
  download.hidden = true;
  download.removeAttribute("href");
  download.removeAttribute("download");
  bar.style.width = "0%";
}

// Selecionar arquivo
fileInput.addEventListener("change", function () {
  file = fileInput.files[0] || null;

  filename.textContent = file ? file.name : "Nenhum arquivo selecionado.";

  convertButton.disabled = !file;

  resetDownload();

  convertStatus.textContent = "";

  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);

    downloadUrl = null;
  }
});

// Reamostragem de áudio
function resample(data, fromRate, toRate) {
  if (fromRate === toRate) {
    return data;
  }

  const ratio = fromRate / toRate;

  const length = Math.round(data.length / ratio);

  const output = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const position = i * ratio;

    const left = Math.floor(position);

    const right = Math.min(left + 1, data.length - 1);

    const fraction = position - left;

    output[i] = data[left] * (1 - fraction) + data[right] * fraction;
  }

  return output;
}

// Converter amostras para PCM
function pcm(data) {
  const output = new Int16Array(data.length);

  for (let i = 0; i < data.length; i++) {
    let value = Math.max(-1, Math.min(1, data[i]));

    output[i] = value < 0 ? value * 32768 : value * 32767;
  }

  return output;
}

// Conversão para MP3
convertButton.addEventListener("click", async function () {
  if (!file) {
    return;
  }

  if (!window.lamejs) {
    convertStatus.textContent = "Conversor não carregado. Verifique a conexão.";

    return;
  }

  convertButton.disabled = true;

  resetDownload();

  progress.hidden = false;

  bar.style.width = "0%";

  convertStatus.textContent = "Lendo arquivo...";

  let audioContext;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("AudioContext não suportado neste navegador.");
    }

    const raw = await file.arrayBuffer();

    audioContext = new AudioContextClass();

    const audio = await audioContext.decodeAudioData(raw.slice(0));

    const sampleRate = 44100;

    const left = pcm(
      resample(audio.getChannelData(0), audio.sampleRate, sampleRate)
    );

    const right = pcm(
      resample(
        audio.numberOfChannels > 1
          ? audio.getChannelData(1)
          : audio.getChannelData(0),
        audio.sampleRate,
        sampleRate
      )
    );

    const encoder = new lamejs.Mp3Encoder(2, sampleRate, 192);

    const chunks = [];

    const blockSize = 1152;

    // Processar o áudio
    for (let i = 0; i < left.length; i += blockSize) {
      const leftChunk = left.subarray(i, i + blockSize);

      const rightChunk = right.subarray(i, i + blockSize);

      const encoded = encoder.encodeBuffer(leftChunk, rightChunk);

      if (encoded.length) {
        chunks.push(new Uint8Array(encoded));
      }

      const percent = Math.floor((i / left.length) * 100);

      bar.style.width = percent + "%";

      convertStatus.textContent = "Convertendo... " + percent + "%";

      // Liberar o navegador periodicamente
      if (i % (blockSize * 100) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // Finalizar codificação
    const finalChunk = encoder.flush();

    if (finalChunk.length) {
      chunks.push(new Uint8Array(finalChunk));
    }

    // Criar MP3
    const mp3Blob = new Blob(chunks, {
      type: "audio/mpeg",
    });

    downloadUrl = URL.createObjectURL(mp3Blob);

    download.href = downloadUrl;

    download.download = file.name.replace(/\.[^.]+$/, "") + ".mp3";

    download.hidden = false;

    bar.style.width = "100%";

    convertStatus.textContent = "Conversão concluída!";
  } catch (error) {
    console.error(error);

    convertStatus.textContent =
      "Não foi possível converter este arquivo. " +
      "O navegador pode não suportar o formato.";
  } finally {
    if (audioContext) {
      await audioContext.close().catch(() => {});
    }

    convertButton.disabled = !file;
  }
});

// ==========================================
// CONVERSOR MKV PARA MP4
// ==========================================

const mkvFileInput = document.querySelector("#mkvFile");
const mkvFilename = document.querySelector("#mkvFilename");
const convertMkvButton = document.querySelector("#convertMkv");
const mkvProgress = document.querySelector("#mkvProgress");
const mkvBar = document.querySelector("#mkvBar");
const mkvStatus = document.querySelector("#mkvStatus");
const mkvDownload = document.querySelector("#mkvDownload");

let mkvFile = null;
let mkvDownloadUrl = null;
let ffmpegInstance = null;

function resetMkvDownload() {
  mkvDownload.hidden = true;
  mkvDownload.removeAttribute("href");
  mkvDownload.removeAttribute("download");
  mkvBar.style.width = "0%";
}

function formatBytes(bytes) {
  if (bytes < 1024 ** 2) return `${Math.ceil(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function handleMkvFile(input) {
  mkvFile = input.files[0] || null;
  mkvFilename.textContent = mkvFile
    ? mkvFile.name
    : "Nenhum arquivo selecionado.";
  convertMkvButton.disabled = !mkvFile;
  mkvStatus.textContent = "";
  resetMkvDownload();

  if (mkvDownloadUrl) {
    URL.revokeObjectURL(mkvDownloadUrl);
    mkvDownloadUrl = null;
  }
}

window.handleMkvFile = handleMkvFile;
mkvFileInput.addEventListener("input", function () {
  handleMkvFile(mkvFileInput);
});

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  if (!window.FFmpegWASM || !window.FFmpegUtil) {
    throw new Error("Biblioteca FFmpeg não carregada. Verifique a conexão.");
  }

  const { FFmpeg } = window.FFmpegWASM;
  const { toBlobURL } = window.FFmpegUtil;
  const ffmpeg = new FFmpeg();
  const coreBase = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  ffmpeg.on("progress", ({ progress }) => {
    const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
    mkvBar.style.width = `${percent}%`;
    mkvStatus.textContent = `Convertendo MKV para MP4... ${percent}%`;
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${coreBase}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

convertMkvButton.addEventListener("click", async function () {
  if (!mkvFile) return;

  convertMkvButton.disabled = true;
  resetMkvDownload();
  mkvProgress.hidden = false;
  mkvStatus.textContent = "Carregando conversor de vídeo...";

  const maxBrowserSize = 1024 ** 3;

  if (mkvFile.size > maxBrowserSize) {
    mkvStatus.textContent =
      `Este arquivo tem ${formatBytes(mkvFile.size)}. ` +
      "Para arquivos maiores que 1 GB, use FFmpeg no computador.";
    convertMkvButton.disabled = false;
    return;
  }

  const inputName = "entrada.mkv";
  const outputName = "saida.mp4";

  try {
    const ffmpeg = await getFFmpeg();
    const { fetchFile } = window.FFmpegUtil;

    mkvStatus.textContent = "Lendo arquivo MKV...";
    const header = new Uint8Array(await mkvFile.slice(0, 4).arrayBuffer());

    if (
      header.length < 4 ||
      header[0] !== 0x1a ||
      header[1] !== 0x45 ||
      header[2] !== 0xdf ||
      header[3] !== 0xa3
    ) {
      const invalidFile = new Error("Arquivo não possui assinatura MKV.");
      invalidFile.code = "INVALID_MKV";
      throw invalidFile;
    }

    await ffmpeg.writeFile(inputName, await fetchFile(mkvFile));

    await ffmpeg.exec([
      "-i",
      inputName,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });
    mkvDownloadUrl = URL.createObjectURL(mp4Blob);

    const baseName = mkvFile.name.replace(/\.[^.]+$/, "") || "video";
    mkvDownload.href = mkvDownloadUrl;
    mkvDownload.download = `${baseName}.mp4`;
    mkvDownload.hidden = false;
    mkvBar.style.width = "100%";
    mkvStatus.textContent = "Conversão concluída!";

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  } catch (error) {
    console.error("Erro na conversão MKV:", error);
    mkvStatus.textContent =
      error.code === "INVALID_MKV"
        ? "Este arquivo não é um MKV válido. Baixe o vídeo original, não a página de confirmação do Google Drive."
        : "Não foi possível converter este MKV. Verifique o formato e a conexão.";
  } finally {
    convertMkvButton.disabled = !mkvFile;
  }
});
