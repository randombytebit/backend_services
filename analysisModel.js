const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const XAI_API_KEY = process.env.XAI_API_KEY;
const MODEL = "grok-4-1-fast-reasoning";

function createPrompt(title) {
    return `You are an expert in software requirements specification and structured extraction.

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

async function requirementanalysisModel(textData, title) {
    const prompt = createPrompt(title);
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

module.exports = {
    requirementanalysisModel
};