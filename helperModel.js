const fs = require('fs').promises;
const officeParser = require('officeparser');
const pdfjsLib = require('pdfjs-dist');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { pipeline } = require('@huggingface/transformers');
const { WaveFile } = require('wavefile');


ffmpeg.setFfmpegPath(ffmpegInstaller.path)
const tempwavpath = './temp_audio.wav';

// Write extracted text to a .txt file
async function writetxtFile(outputPath, data) {
    try {
        await fs.writeFile(outputPath, data, 'utf8');
        console.log(`\nSaved extracted text to:\n   ${outputPath}`);
    } catch (err) {
        console.error('Main failed:', err.message);
    }
}

// Extract text from Office files (.docx, .pptx, .xlsx, .odt, .odp, .ods, .rtf)
// Warning: Don't parse pdf files with this function -> bad results!
async function officefilesExtracted_officeparser(filePath) {
    try {
        const ast = await officeParser.parseOffice(filePath);
        return ast.toText();
    } catch (err) {
        console.error('officeparser failed:', err.message);
    }
}

// Extract text from PDF using pdfjs-dist
// Note: Works well for acedmic papers also 
// Warning: Can't parse picture
async function pdfExtracted_pdfjslib(filePath){
    const loadingTask = pdfjsLib.getDocument({
        url: filePath,
        standardFontDataUrl: '/standard_fonts/'
    });
    const pdfDocument = await loadingTask.promise;
    const extractedText = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(' ');
        extractedText.push("Page " + pageNum + ":\n" + text);
    }

    return extractedText.join('\n\n');
}

// Convert video/audio to mp3 using ffmpeg
async function mp3Convert_ffmpeg(filePath, outputPath) {
     await new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .audioFrequency(16000)
            .audioChannels(1)
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .format('mp3')
            .on('end', () => {
                console.log('Audio extraction completed.');
                resolve();
            })
            .on('error', (err) => {
                console.error('Error during audio extraction:', err.message);
                reject(err);
            })
            .save(outputPath);
    });
}

let transcriber = null;

async function getTranscriber() {
    if (!transcriber) {
        console.log('Loading Whisper model...');
        transcriber = await pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-base.en',         
        );
        console.log('Whisper model loaded');
    }
    return transcriber;
}

// Extract text from video/audio using ffmpeg and Whisper model
async function videoaudioExtracted_ffmpeg(filePath) {
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(filePath)
                .audioFrequency(16000)
                .audioChannels(1)
                .audioCodec('pcm_s16le')
                .format('wav')
                .on('end', () => {
                    console.log('WAV extraction completed');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('ffmpeg WAV error:', err);
                    reject(err);
                })
                .save(tempwavpath);
        });

        const wavBuffer = await fs.readFile(tempwavpath);
        const wav = new WaveFile(wavBuffer);
        wav.toBitDepth('32f');
        wav.toSampleRate(16000);

        let audioData = wav.getSamples();
        if (Array.isArray(audioData)) {
            if (audioData.length > 1) {
                const SCALING_FACTOR = Math.sqrt(2);
                for (let i = 0; i < audioData[0].length; i++) {
                    audioData[0][i] = SCALING_FACTOR * (audioData[0][i] + audioData[1][i]) / 2;
                }
            }
            audioData = audioData[0];
        }

        let maxAbs = 0;
        for (const v of audioData) {
            maxAbs = Math.max(maxAbs, Math.abs(v));
        }
        if (maxAbs > 0 && maxAbs < 0.9) {
            const gain = 0.9 / maxAbs;
            for (let i = 0; i < audioData.length; i++) {
                audioData[i] *= gain;
            }
        }

        const model = await getTranscriber();
        const output = await model(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
        });

        return output.text?.trim();
    } catch (err) {
        console.error('Transcription pipeline failed:', err);
        throw err;
    } finally {
        await fs.unlink(tempwavpath).catch(() => {});
    }
}

module.exports = {
    writetxtFile, officefilesExtracted_officeparser, pdfExtracted_pdfjslib, videoaudioExtracted_ffmpeg, mp3Convert_ffmpeg
};