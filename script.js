// ==========================================
// YOUTUBE PLAYER
// ==========================================

const urlInput = document.querySelector('#videoUrl');
const playButton = document.querySelector('#play');
const frame = document.querySelector('#frame');
const empty = document.querySelector('#empty');
const status = document.querySelector('#status');
const openYT = document.querySelector('#openYT');

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

    frame.src = "https://www.youtube.com/embed/" + id;

    frame.hidden = false;
    empty.hidden = true;

    openYT.href = "https://www.youtube.com/watch?v=" + id;
    openYT.hidden = false;

    status.textContent = "Carregando vídeo...";
}

window.loadVideo = loadVideo;


frame.addEventListener('load', function() {
    if (!frame.hidden) {
        status.textContent = "Vídeo carregado. Se a reprodução não iniciar, use os controles do player.";
    }
});


// Reproduzir ao pressionar Enter
urlInput.addEventListener(
    'keydown',
    function(event) {

        if (event.key === 'Enter') {
            loadVideo();
        }

    }
);


// Limpar player
document.querySelector('#clear').addEventListener(
    'click',
    function() {

        frame.src = '';

        frame.hidden = true;

        empty.hidden = false;

        openYT.hidden = true;

        urlInput.value = '';

        status.textContent = '';

        urlInput.focus();

    }
);


// ==========================================
// CONVERSOR DE ARQUIVOS LOCAIS PARA MP3
// ==========================================

const fileInput =
    document.querySelector('#localFile');

const filename =
    document.querySelector('#filename');

const convertButton =
    document.querySelector('#convert');

const progress =
    document.querySelector('#progress');

const bar =
    document.querySelector('#bar');

const convertStatus =
    document.querySelector('#convertStatus');

const download =
    document.querySelector('#download');

let file = null;
let downloadUrl = null;

function resetDownload() {
    download.hidden = true;
    download.removeAttribute('href');
    download.removeAttribute('download');
    bar.style.width = '0%';
}


// Selecionar arquivo
fileInput.addEventListener(
    'change',
    function() {

        file = fileInput.files[0] || null;

        filename.textContent = file
            ? file.name
            : 'Nenhum arquivo selecionado.';

        convertButton.disabled = !file;

        resetDownload();

        convertStatus.textContent = '';

        if (downloadUrl) {

            URL.revokeObjectURL(downloadUrl);

            downloadUrl = null;

        }

    }
);


// Reamostragem de áudio
function resample(data, fromRate, toRate) {

    if (fromRate === toRate) {
        return data;
    }

    const ratio = fromRate / toRate;

    const length = Math.round(
        data.length / ratio
    );

    const output = new Float32Array(length);

    for (let i = 0; i < length; i++) {

        const position = i * ratio;

        const left = Math.floor(position);

        const right = Math.min(
            left + 1,
            data.length - 1
        );

        const fraction = position - left;

        output[i] =
            data[left] * (1 - fraction) +
            data[right] * fraction;

    }

    return output;

}


// Converter amostras para PCM
function pcm(data) {

    const output = new Int16Array(data.length);

    for (let i = 0; i < data.length; i++) {

        let value = Math.max(
            -1,
            Math.min(1, data[i])
        );

        output[i] = value < 0
            ? value * 32768
            : value * 32767;

    }

    return output;

}


// Conversão para MP3
convertButton.addEventListener(
    'click',
    async function() {

        if (!file) {
            return;
        }

        if (!window.lamejs) {

            convertStatus.textContent =
                'Conversor não carregado. Verifique a conexão.';

            return;

        }

        convertButton.disabled = true;

        resetDownload();

        progress.hidden = false;

        bar.style.width = '0%';

        convertStatus.textContent =
            'Lendo arquivo...';

        let audioContext;

        try {

            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) {
                throw new Error('AudioContext não suportado neste navegador.');
            }

            const raw =
                await file.arrayBuffer();

            audioContext = new AudioContextClass();

            const audio =
                await audioContext.decodeAudioData(
                    raw.slice(0)
                );

            const sampleRate = 44100;

            const left = pcm(
                resample(
                    audio.getChannelData(0),
                    audio.sampleRate,
                    sampleRate
                )
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

            const encoder =
                new lamejs.Mp3Encoder(
                    2,
                    sampleRate,
                    192
                );

            const chunks = [];

            const blockSize = 1152;

            // Processar o áudio
            for (
                let i = 0;
                i < left.length;
                i += blockSize
            ) {

                const leftChunk =
                    left.subarray(
                        i,
                        i + blockSize
                    );

                const rightChunk =
                    right.subarray(
                        i,
                        i + blockSize
                    );

                const encoded =
                    encoder.encodeBuffer(
                        leftChunk,
                        rightChunk
                    );

                if (encoded.length) {

                    chunks.push(
                        new Uint8Array(encoded)
                    );

                }

                const percent =
                    Math.floor(
                        (i / left.length) * 100
                    );

                bar.style.width =
                    percent + '%';

                convertStatus.textContent =
                    'Convertendo... ' +
                    percent +
                    '%';

                // Liberar o navegador periodicamente
                if (
                    i % (blockSize * 100) === 0
                ) {

                    await new Promise(
                        resolve =>
                            setTimeout(resolve, 0)
                    );

                }

            }

            // Finalizar codificação
            const finalChunk =
                encoder.flush();

            if (finalChunk.length) {

                chunks.push(
                    new Uint8Array(finalChunk)
                );

            }

            // Criar MP3
            const mp3Blob =
                new Blob(
                    chunks,
                    {
                        type: 'audio/mpeg'
                    }
                );

            downloadUrl =
                URL.createObjectURL(mp3Blob);

            download.href =
                downloadUrl;

            download.download =
                file.name.replace(
                    /\.[^.]+$/,
                    ''
                ) + '.mp3';

            download.hidden = false;

            bar.style.width = '100%';

            convertStatus.textContent =
                'Conversão concluída!';

        } catch (error) {

            console.error(error);

            convertStatus.textContent =
                'Não foi possível converter este arquivo. ' +
                'O navegador pode não suportar o formato.';

        } finally {

            if (audioContext) {

                await audioContext
                    .close()
                    .catch(() => {});

            }

            convertButton.disabled =
                !file;

        }

    }
);
