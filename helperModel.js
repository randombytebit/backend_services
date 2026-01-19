const fs = require('fs').promises;
const officeParser = require('officeparser');
const pdfjsLib = require('pdfjs-dist');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { pipeline } = require('@huggingface/transformers');
const { WaveFile } = require('wavefile');
const { file } = require('zod');
const libre = require('libreoffice-convert');
libre.convertAsync = require('util').promisify(libre.convert);


// Environment Setting
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
let transcriber = null;
const tempwavpath = './temp_audio.wav';
const temppdfpath = './temp_document.pdf';

// MAIN PRE-PROCESSING HELPER FUNCTION - GROUPED
// CAN USE DIRECTLY 
// InputPath: ALL DOCUMENT, VIDEO, AUDIO TYPE
// IMPORTANT: Return Raw Text
async function documentPreprocessing(inputPath) {
    const supportedVideoAudioFormats = ['mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'flac', 'aac'];
    const supportedDocumentFormats = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'odp', 'ods', 'txt', 'rtf'];
    
    try {
        // 1. Check file type
        const fileType = inputPath.split('.').pop().toLowerCase();
        if (supportedVideoAudioFormats.includes(fileType)) {
            // 2.1 Convert video/audio to wav file
            // 2.11 Extract text from video/audio using ffmpeg and Whisper model
            await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
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
        } else if (supportedDocumentFormats.includes(fileType)) {
            // 3.1 Convert document to PDF file
            // 3.11 Convert other document formats to PDF
            if (fileType !== 'pdf') {
                const ext = '.pdf';
                const docBuffer = await fs.readFile(inputPath);
                let pdfBuf = await libre.convertAsync(docBuffer, ext, undefined);
                await fs.writeFile(temppdfpath, pdfBuf);

                // 3.2 Extract text from converted PDF file
                const loadingTask = pdfjsLib.getDocument({
                    url: temppdfpath,
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

            // 3.12 Extract text from original PDF file
            const loadingTask = pdfjsLib.getDocument({
                url: inputPath,
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
        } else {
            throw new Error('Unsupported file format');
        }
    } catch (err) {
        console.error('Document preprocessing failed:', err.message);
    }
}

// SMALL HELPER FUNCTION FOR REFERENCES

// Convert document to pdf file with libreoffice-convert
// InputPath: Where the document path staying at
// OutputPath: Where you want the pdf file placing at
// IMPORTANT: No return, instead write the file
async function documentToPdf_libreofficeconvert(inputPath, outputPath) {
    ext = '.pdf';

    try{
        const docBuffer = await fs.readFile(inputPath);
        let pdfBuf = await libre.convertAsync(docBuffer, ext, undefined);
        await fs.writeFile(outputPath, pdfBuf);
    } catch (err) {
        console.error('Document to PDF conversion failed:', err.message);
    }
}

// Extract text from PDF using pdfjs-dist
// Note: Works well for acedmic papers, Can't parse picture
// InputPath: Where the document path staying at
// IMPORTANT: Return Raw Text
async function pdfExtracted_pdfjslib(inputPath){
    const loadingTask = pdfjsLib.getDocument({
        url: inputPath,
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

// Load whisper model 
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
// InputPath: Where the video / audio path staying at
// IMPORTANT: Return Raw Text
async function videoaudioExtracted_ffmpeg(inputPath) {
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
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

// OTHER SMALL HELPER FUNCTION

// Convert video/audio to mp3 using ffmpeg
async function mp3Convert_ffmpeg(inputPath, outputPath) {
     await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
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

// Convert extracted text to a .txt file
async function writetxtFile(extractedText, outputPath) {
    try {
        await fs.writeFile(outputPath, extractedText, 'utf8');
        console.log(`\nSaved extracted text to:\n   ${outputPath}`);
    } catch (err) {
        console.error('Main failed:', err.message);
    }
}

// Extract text from txt file
async function extracttxtFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return data;
    } catch (err) {
        console.error('Text file extraction failed:', err.message);
    }
}

// Group multiple report files into a single text data
async function groupMultipleFile(requirementReports) {
    let groupedData = "";
    try {
        for (const report of requirementReports) {
            groupedData += `\n\n==============================
Report File ${report}
==============================\n\n`;
            groupedData +=  await extracttxtFile(report);
        }
        return groupedData;
    } catch (err) {
        console.error('Grouping report failed:', err.message);
    }
}

module.exports = {
    documentPreprocessing, documentToPdf_libreofficeconvert,pdfExtracted_pdfjslib, videoaudioExtracted_ffmpeg,mp3Convert_ffmpeg, writetxtFile, extracttxtFile, groupMultipleFile
};