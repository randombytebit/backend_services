const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { pdfExtracted_pdfjslib, writetxtFile} = require('./helperModel');
dotenv.config();

const XAI_API_KEY = process.env.XAI_API_KEY;
const MODEL = ["grok-4-1-fast-reasoning", "grok-code-fast-1", "grok-4-fast-reasoning", "grok-4-0709", "grok-3"];
const TC_MODEL = null;

function phase1_zeroshotPrompt() {
    return `
    You are an expert requirements engineer specialized in extracting functional and non-functional requirements from academic research papers, documents, or PDFs in AI, machine learning, and related fields.
    
    You will receive only the text of a research paper or document.
    
    Read the entire document carefully.
    
    Extract ALL functional requirements (specific behaviors, features, capabilities, actions, or processing steps that a system, module, or component must perform) and ALL non-functional requirements (quality attributes such as accuracy, speed, latency, scalability, robustness, security, privacy, explainability, fairness, energy efficiency, etc.) that are explicitly stated or strongly implied anywhere in the text.
    
    Even if the paper is a survey, challenges paper, or discusses requirements in general, still extract every requirement you can find.
        
    Output the result with:
    
    Then present each requirement clearly using exactly these fields for every requirement:
    - Role
    - Requirement ID (use FR-01, FR-02, ... for functional and NF-01, NF-02, ... for non-functional)
    - Requirement Title
    - Requirement Description
    - Citation
    - Requirement Related Title
    
    List all functional requirements first, followed by all non-functional requirements.
    Use sequential IDs with no gaps.
    Do not add any extra text, explanations, summaries, or content outside this structure.
    `;
}

// function phase2_promptEvaluation(title, index) {
//     const zeroShot_1 = `
//     You are an expert in software requirements specification and structured extraction.
//
//     Analyze the attached text document completely.
//
//     First, check if the document is related to the topic "${title}".
//     If NOT related → output only this exact line and nothing else:
//     null
//
//     If related → extract ALL functional requirements (if any) and ALL non-functional requirements (if any) relevant to the topic.
//
//     Output them in this strict order and format ONLY:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source or reference in the text document]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source or reference in the text document]
//
//     Rules:
//     - Generate sequential IDs (e.g. FR-01, NF-01) if no IDs are present in the text
//     - Each requirement must be on its own single line
//     - No extra text, headings, blank lines, markdown, or explanations
//     - Functional requirements first, sorted by Requirement ID ascending
//     - Non-functional requirements second, sorted by Requirement ID ascending
//     - If no relevant requirements found → output only: No relevant requirements found
//     - If no citation is available for a requirement, skip that requirement`;
//
//     const zeroShot_2 = `
//     Analyze the attached document.
//
//     If it is not related to "${title}", output exactly: null
//
//     If it is related, extract all functional and non-functional requirements.
//
//     Output strictly in this format and nothing else:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Use sequential IDs if missing. Sort by ID. One requirement per line. No additional content.`;
//
//     const zeroShot_3 = `
//     Task: Check relevance and extract requirements.
//
//     Step 1: Is the attached document related to "${title}"?
//     → No → output only: null
//     → Yes → proceed
//
//     Step 2: Extract every functional requirement, then every non-functional requirement.
//
//     Output only:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [role]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [description]
//     Citation: [source]
//
//     Non-Functional Requirement
//     Role: [role]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [description]
//     Citation: [source]
//
//     Assign sequential IDs when necessary. No other text allowed.`;
//
//     const zeroShot_4 = `
//     Read the attached text document.
//
//     Unrelated to "${title}"? → Output exactly: null
//
//     Related? → Extract ALL functional and non-functional requirements using this exact format only:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Generate sequential IDs if absent. Functional first, then non-functional. Nothing else.`;
//
//     const zeroShot_5 = `
//     Determine if attached document discusses "${title}".
//
//     Not related → output only: null
//
//     Related → output ONLY the following structure for all extracted requirements:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source or reference]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source or reference]
//
//     Sequential IDs required if missing. Sorted ascending. No explanations or extra lines.`;
//
//     const zeroShot_6 = `
//     Strict extraction task:
//
//     If the document is unrelated to "${title}" → null
//
//     If related → list all functional requirements followed by all non-functional requirements in this exact format:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Use FR-01, NF-01 style sequential numbering if needed. One per line. No other output.`;
//
//     const fewshot_1 = `
//     You are an expert in extracting software requirements.
//     Example:
//
//     Input document about medical apps → Output:
//     Title request: Medical App
//     Non-Functional Requirement
//     Role: User
//     Requirement ID: NF-01
//     Requirement Title: Accessibility
//     Requirement Description: Accessibility is commonly understood as the degree to which the application is available to users, usually taking into account disability measures. Accessibility, or software’s ability to be “use[d] by people with a wide range of characteristics”, is found explicitly in standards but often understood as an implicit aspect of usability.
//     Citation: Page 8, Section 3.2; Page 9, Section 3.4
//     [and more NF requirements...]
//
//     Now analyze the attached document for "${title}".
//
//     If unrelated → output only: null
//
//     If related → extract ALL functional and non-functional requirements in the same exact format:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [citation]
//
//     Sequential IDs if missing. Functional first, then non-functional.`;
//
//     const fewshot_2 = `
//     Few-shot example:
//
//     Document related to medical apps → Output:
//     Title request: Medical App
//     Non-Functional Requirement
//     Role: User
//     Requirement ID: NF-01
//     Requirement Title: Accessibility
//     Requirement Description: Accessibility is commonly understood as the degree to which the application is available to users, usually taking into account disability measures. Accessibility, or software’s ability to be “use[d] by people with a wide range of characteristics”, is found explicitly in standards but often understood as an implicit aspect of usability.
//     Citation: Page 8, Section 3.2; Page 9, Section 3.4
//     [...]
//
//     Task: Analyze attached document.
//
//     If not related to "${title}" → null
//
//     Else → extract requirements exactly like the example, functional first, then non-functional. Use sequential IDs.`;
//
//     const fewshot_3 = `
//     Example output for a medical app document:
//     Title request: Medical App
//     Non-Functional Requirement
//     Role: User
//     Requirement ID: NF-01
//     Requirement Title: Accessibility
//     Requirement Description: Accessibility is commonly understood as the degree to which the application is available to users, usually taking into account disability measures. Accessibility, or software’s ability to be “use[d] by people with a wide range of characteristics”, is found explicitly in standards but often understood as an implicit aspect of usability.
//     Citation: Page 8, Section 3.2; Page 9, Section 3.4
//     [...]
//
//     Apply the same format to the attached document for topic "${title}".
//
//     Unrelated → null
//
//     Related → extract all functional and non-functional requirements, sorted by ID`;
//
//     const fewshot_4 = `
//     Few-shot:
//
//     Medical App document →
//     Title request: Medical App
//     Non-Functional Requirement
//     Role: User
//     Requirement ID: NF-01
//     Requirement Title: Accessibility
//     Requirement Description: Accessibility is commonly understood as the degree to which the application is available to users, usually taking into account disability measures. Accessibility, or software’s ability to be “use[d] by people with a wide range of characteristics”, is found explicitly in standards but often understood as an implicit aspect of usability.
//     Citation: Page 8, Section 3.2; Page 9, Section 3.4
//     [...]
//
//     Now do the same for "${title}" on the attached document.
//
//     If unrelated → null
//
//     Else → output in exact format, functional first.`;
//
//     const fewshot_5 = `
//     Example (medical app):
//     Title request: Medical App
//     Non-Functional Requirement
//     Role: User
//     Requirement ID: NF-01
//     Requirement Title: Accessibility
//     Requirement Description: Accessibility is commonly understood as the degree to which the application is available to users, usually taking into account disability measures. Accessibility, or software’s ability to be “use[d] by people with a wide range of characteristics”, is found explicitly in standards but often understood as an implicit aspect of usability.
//     Citation: Page 8, Section 3.2; Page 9, Section 3.4
//     [...]
//
//     Use this format for "${title}".
//
//     Check relevance first: unrelated → null
//
//     Related → extract all functional then non-functional requirements.`;
//
//     const fewshot_6 = `
//     Few-shot prompt:
//
//     Input: medical app document
//     Output:
//     Title request: Medical App
//     Non-Functional Requirement
//     Role: User
//     Requirement ID: NF-01
//     Requirement Title: Accessibility
//     Requirement Description: Accessibility is commonly understood as the degree to which the application is available to users, usually taking into account disability measures. Accessibility, or software’s ability to be “use[d] by people with a wide range of characteristics”, is found explicitly in standards but often understood as an implicit aspect of usability.
//     Citation: Page 8, Section 3.2; Page 9, Section 3.4
//     [...]
//
//     Now extract for "${title}" from attached document in the same strict format. Unrelated → null`;
//
//     const chainofthoughts_1 = `
//     You are an expert in software requirements specification and structured extraction.
//
//     Analyze the attached text document completely.
//
//     First, check if the document is related to the ${title} topic.
//
//     If NOT related → output only this exact line and nothing else:
//     null
//
//     If related → extract ALL functional (if any) and non-functional (if any) requirements relevant to the topic.
//
//     Output them in this strict order and format ONLY:
//
//     1. ALL Functional Requirements first, sorted by Requirement ID ascending
//     2. ALL Non-Functional Requirements second, sorted by Requirement ID ascending
//
//     Use exact this format for each requirement (no extra spaces, no line breaks within a requirement):
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source or reference in the text document]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source or reference in the text document]
//
//     Strict rules:
//     - Generate sequential IDs if missing
//     - NO Acceptance Criteria field
//     - Accuracy field must contain detailed, testable expectations
//     - No extra text, headings, blank lines or markdown
//     - Each requirement on its own single line
//     - If none → output only: No relevant requirements found
//     - If no citation available, ignore that requirement
//
//     Start immediately.`;
//
//     const chainofthoughts_2 = `
//     You are an expert in software requirements specification.
//
//     Step 1: Read the entire attached text document.
//
//     Step 2: Determine if it is related to "${title}". If not, output only: null
//
//     Step 3: If related, identify ALL functional requirements and ALL non-functional requirements.
//
//     Step 4: Assign sequential Requirement IDs if missing (e.g., FR-01, NF-01).
//
//     Step 5: Format output exactly:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source]
//
//     Functional first, sorted by ID, then non-functional. No extra text.`;
//
//     const chainofthoughts_3 = `
//     Think step by step:
//
//     1. Analyze the attached document.
//
//     2. Is it related to "${title}"? If no → output only "null"
//
//     3. If yes, list every functional requirement, then every non-functional requirement.
//
//     4. For each: determine Role, Title, Description, Citation. Generate IDs if needed.
//
//     5. Output strictly in the format:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [role]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [description]
//     Citation: [citation]
//
//     Non-Functional Requirement
//     Role: [role]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [description]
//     Citation: [citation]
//
//     Sort by ID ascending.`;
//
//     const chainofthoughts_4 = `
//     Chain of thought:
//
//     - First, check relevance to "${title}". Not related? Output: null
//
//     - If related, go through the document and collect all functional requirements.
//
//     - Then collect all non-functional requirements.
//
//     - Assign sequential IDs.
//
//     - For each requirement, note Role, Title, Description, Citation.
//
//     - Output exactly as:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source]
//
//     Non-Functional Requirement
//     Role: [User/System/Other]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [full description]
//     Citation: [source]`;
//
//     const chainofthoughts_5 = `
//     Reason step-by-step:
//
//     Step 1: Read and understand the attached document.
//
//     Step 2: Confirm if it discusses "${title}". If not → null
//
//     Step 3: Extract functional requirements → note Role, ID (sequential if missing), Title, Description, Citation.
//
//     Step 4: Extract non-functional requirements similarly.
//
//     Step 5: Output in strict order and format:
//
//     Title request: ${title}
//
//     [Functional lines]
//
//     [Non-Functional lines]`;
//
//     const chainofthoughts_6 = `
//     Structured reasoning:
//
//     1. Relevance check: Related to "${title}"? No → null
//
//     2. If yes: Identify functional requirements one by one.
//
//     3. Identify non-functional requirements one by one.
//
//     4. Assign IDs sequentially.
//
//     5. Use exact format for output:
//
//     Title request: ${title}
//
//     Functional Requirement
//     Role: [role]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [description]
//     Citation: [citation]
//
//     Non-Functional Requirement
//     Role: [role]
//     Requirement ID: [ID]
//     Requirement Title: [title]
//     Requirement Description: [description]
//     Citation: [citation]
//
//     No other text.`;
//
//     const prompts = [zeroShot_1, zeroShot_2, zeroShot_3, zeroShot_4, zeroShot_5, zeroShot_6,
//                      fewshot_1, fewshot_2, fewshot_3, fewshot_4, fewshot_5, fewshot_6,
//                      chainofthoughts_1, chainofthoughts_2, chainofthoughts_3, chainofthoughts_4, chainofthoughts_5, chainofthoughts_6];
//
//     return prompts[index];
// }
//

async function evaluationModel(documentData, model, prompt) {
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
        throw err;
    }
}

async function modelEvaluation() {
    // const testingDocument = await pdfExtracted_pdfjslib('./training_sources/medical_app_testing_paper.pdf');
    //
    // // Phase 1: Zero-shot evaluation
    // for (let i = 0; i < MODEL.length; i++){
    //     console.log(`Testing model: ${MODEL[i]}`);
    //     let filename = MODEL[i].replace(/-/g, "_");
    //     filename = filename.replace(/\./g, "_") + ".txt";
    //     const result = await evaluationModel(testingDocument, MODEL[i], phase1_zeroshotPrompt("medical app"));
    //     await writetxtFile(`./evaluations/${filename}`, result);
    // }
    try {
        const testingDocument_1 = await fs.readFile('raw/Non_Functional_Requirements_for_Machine_Learning_Challenges_and_New_Directions.txt', 'utf8');

        for (const model of MODEL) {
            console.log(`\n=== Testing model: ${model} ===`);
            const result = await evaluationModel(testingDocument_1, model, phase1_zeroshotPrompt());
            console.log(result);

            const filename = `${model.replace(/[-.]/g, "_")}.txt`;
            await fs.writeFile(`./evaluations/${filename}`, result);
        }
    } catch (err) {
        console.error('modelEvaluation failed:', err.message);
    }
}
modelEvaluation();