const dotenv = require('dotenv');
const axios = require('axios');
const { writetxtFile, pdfExtracted_pdfjslib, officefilesExtracted_officeparser, videoaudioExtracted_ffmpeg } = require('./helperModel');  

dotenv.config();

const XAI_API_KEY = process.env.XAI_API_KEY;
const MODEL = ["grok-4-1-fast-reasoning", "grok-code-fast-1", "grok-4-fast-reasoning", "grok-4-0709", "grok-3", "grok-2-vision-1212"];

function createPrompt(title) {
    return `Extract requirements related to the ${title} from this text document.`;
}

async function evaluationModel(textData, title, model) {
    const prompt = createPrompt(title);
    try {
        const res = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: model,
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: textData
                }
            ],
            temperature: 0.0
        }, {
            headers: {
                'Authorization': `Bearer ${XAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data.choices[0].message.content;
    } catch (err) {
        console.error('analysisModel failed:', err.message);
    }
}

async function main(){
    const pdfTesting = await pdfExtracted_pdfjslib('./testing_sources/medical_app_testing_paper.pdf');

    for (let i = 0; i < MODEL.length; i++){
        console.log(`Testing model: ${MODEL[i]}`);
        let filename = MODEL[i].replace(/-/g, "_");
        filename = filename.replace(/\./g, "_") + ".txt";
        const result = await evaluationModel(pdfTesting, "medical app", MODEL[i]);
        await writetxtFile(`./evaluations/${filename}`, result);
    }
}

main();