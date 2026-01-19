const dotenv = require('dotenv');
const axios = require('axios');
const { groupMultipleFile } = require('./helperModel'); 

dotenv.config();

const XAI_API_KEY = process.env.XAI_API_KEY;
const MODEL = "grok-4-fast-reasoning";

function requirementAnalysisPrompt(title) {
    return `
    You are an expert in software requirements specification and structured extraction.

    Analyze the attached text document completely.

    First, check if the document is related to the ${title} topic.

    If NOT related → output only this exact line and nothing else:
    null

    If related → extract ALL functional (if any) and non-functional (if any) requirements relevant to the topic.

    Output them in this strict order and format ONLY:

    1. ALL Functional Requirements first, sorted by Requirement ID ascending
    2. ALL Non-Functional Requirements second, sorted by Requirement ID ascending

    Use exact this format for each requirement (no extra spaces, no line breaks within a requirement):

    Title request: ${title}

    Functional Requirement 
    Role: [User/System/Other] 
    Requirement ID: [ID] 
    Requirement Title: [title]
    Requirement Description: [full description] 
    Citation: [source or reference in the text document] 

    Non-Functional Requirement 
    Role: [User/System/Other] 
    Requirement ID: [ID] 
    Requirement Title: [title]
    Requirement Description: [full description]
    Citation: [source or reference in the text document] 

    Strict rules:
    - Generate sequential IDs if missing
    - NO Acceptance Criteria field
    - Accuracy field must contain detailed, testable expectations
    - No extra text, headings, blank lines or markdown
    - Each requirement on its own single line
    - If none → output only: No relevant requirements found
    - If no citation available, ignore that requirement

    Start immediately.`;
}

function userStoryAnalysisPrompt(title) {
    return null;
}

// Document Data should be raw text 
async function requirementAnalysisModel(documentData, title) {
    const prompt = requirementAnalysisPrompt(title);
    try {
        const res = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: documentData
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

// multiple document data should be array of document path
async function userStoryAnalysisModel(multipleDocumentData, title) {
    const documentData = await groupMultipleFile(multipleDocumentData);
    const prompt = userStoryAnalysisPrompt(title);
    try {
        const res = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: documentData
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

module.exports = {
    requirementAnalysisModel,
    userStoryAnalysisModel
};