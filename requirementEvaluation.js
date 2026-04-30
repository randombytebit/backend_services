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

function phase2_promptEvaluation(index) {
    const zeroShot_1 = `
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

    const zeroShot_2 = `
    You are an ML Engineering Specialist. Your task is to analyze the provided research paper and generate a formal Requirement Report.

    Extract ALL functional requirements (model architectures, training procedures, data preprocessing steps) and ALL non-functional requirements (inference latency, model accuracy, memory constraints, and computational efficiency).
    
    Output the result as a:
    REQUIREMENT REPORT
    
    Present each requirement using exactly these fields:
    - Role
    - Requirement ID (use FR-01, FR-02, ... for functional and NF-01, NF-02, ... for non-functional)
    - Requirement Title
    - Requirement Description
    - Citation
    - Requirement Related Title
    
    List all functional requirements first, followed by all non-functional requirements. Use sequential IDs with no gaps. Do not add any extra text or summaries.
    `;

    const zeroShot_3 = `
    You are an AI Security Auditor. Your task is to extract security-centric specifications from the document into a Requirement Report.

    Extract ALL functional requirements (security modules, authentication steps, encryption routines, or logging mechanisms) and ALL non-functional requirements (adversarial robustness, system resilience, data privacy levels, and integrity benchmarks).
    
    Output the result as a:
    REQUIREMENT REPORT
    
    Present each requirement using exactly these fields:
    - Role
    - Requirement ID (use FR-01, FR-02, ... for functional and NF-01, NF-02, ... for non-functional)
    - Requirement Title
    - Requirement Description
    - Citation
    - Requirement Related Title
    
    List all functional requirements first, followed by all non-functional requirements. Use sequential IDs with no gaps. Do not add any extra text or summaries.`;

    const zeroShot_4 = `
    You are an AI Governance Lead. You are tasked with identifying compliance and ethical specifications for this system in a Requirement Report.

    Extract ALL functional requirements (bias detection modules, explainability dashboards, and audit trail generation) and ALL non-functional requirements (fairness metrics, transparency levels, interpretability, and ethical alignment).
    
    Output the result as a:
    REQUIREMENT REPORT
    
    Present each requirement using exactly these fields:
    - Role
    - Requirement ID (use FR-01, FR-02, ... for functional and NF-01, NF-02, ... for non-functional)
    - Requirement Title
    - Requirement Description
    - Citation
    - Requirement Related Title
    
    List all functional requirements first, followed by all non-functional requirements. Use sequential IDs with no gaps. Do not add any extra text or summaries.`;

    const zeroShot_5 = `
    You are a Lead MLOps Architect. Your goal is to produce a Requirement Report defining the operational needs of the research-based system.

    Extract ALL functional requirements (orchestration steps, automated retraining triggers, and API endpoints) and ALL non-functional requirements (scalability, availability, energy efficiency, and cross-platform compatibility).
    
    Output the result as a:
    REQUIREMENT REPORT
    
    Present each requirement using exactly these fields:
    - Role
    - Requirement ID (use FR-01, FR-02, ... for functional and NF-01, NF-02, ... for non-functional)
    - Requirement Title
    - Requirement Description
    - Citation
    - Requirement Related Title
    
    List all functional requirements first, followed by all non-functional requirements. Use sequential IDs with no gaps. Do not add any extra text or summaries.`;

    const zeroShot_6 = `
    You are an HCI Researcher for AI Systems. You must extract the user-centric specifications of the paper into a Requirement Report.

    Extract ALL functional requirements (user input interfaces, visualization tools, and human-in-the-loop feedback mechanisms) and ALL non-functional requirements (usability, cognitive load limits, response time, and accessibility).
    
    Output the result as a:
    REQUIREMENT REPORT
    
    Present each requirement using exactly these fields:
    - Role
    - Requirement ID (use FR-01, FR-02, ... for functional and NF-01, NF-02, ... for non-functional)
    - Requirement Title
    - Requirement Description
    - Citation
    - Requirement Related Title
    
    List all functional requirements first, followed by all non-functional requirements. Use sequential IDs with no gaps. Do not add any extra text or summaries.`;

    const fewshot_1 = `
    Task: You are an expert Systems Requirements Engineer. Your task is to extract formal Functional (FR) and Non-Functional (NFR) requirements from paper and document.

    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement
    Related Title: Generate contextual examples or domains where this requirement is applicable.
    
    [Few-Shot Example: Gold Standard Human-Verified Evaluation Set]
    
    Example 1: Non-Functional Requirements for Machine Learning: Challenges and New Directions 
    Source Text: "System should recognize and match images or faces against a reference set to identify persons of interest"   
    Requirement ID: FR-01   
    Requirement Title: Image / Face Recognition   
    Role: System   
    Requirement Description: System should recognize and match images or faces against a reference set to identify persons of interest   
    Requirement Related Title: Airport Passenger Screening System, Image recognition system, Face Detection System   
    
    Example 2: Non-Functional Requirements for Machine Learning: Challenges and New Directions 
    Source Text: "System should not enforce unintended biases towards vulnerable groups, and should define and measure fairness formally (e.g., via statistical parity or individual fairness) in a way that is context-specific"   
    Requirement ID: NFR-01   
    Requirement Title: Fairness   
    Role: System   
    Requirement Description: System should not enforce unintended biases towards vulnerable groups, and should define and measure fairness formally (e.g., via statistical parity or individual fairness) in a way that is context-specific   
    Requirement Related Title: Insurance Risk Estimation System, Automated Decision-Making Systems   
    
    Example 3: Requirements Specification for Apps in Medical Application Platforms 
    Source Text: "System should implement system safety invariants that actively lock out potentially unsafe individual device behaviors or dangerous interactions... the system contract must specify how a connected device should automatically transition to a fail-safe mode in the event of an accidental disconnection"   
    Requirement ID: NFR-02   
    Requirement Title: Safety Interlocks & Fail-Safes   
    Role: System   
    Requirement Description: System should implement system safety invariants that actively lock out potentially unsafe individual device behaviors or dangerous interactions between multiple connected devices. Furthermore, the system contract must specify how a connected device should automatically transition to a fail-safe mode in the event of an accidental disconnection from the network controller.  
    Requirement Related Title: Patient-Controlled Analgesia (PCA) Safety Systems, Laser/Radiation Therapy Control Software, Life-Support System Software   
    
    Example 4: Requirements Specification for Apps in Medical Application Platforms 
    Source Text: "These device interface requirements must specify the data type (e.g., Integer), physical interpretation, units (e.g., Percentage), acceptable value range, and the required real-time polling period (e.g., 1 second) to ensure accurate sensor data acquisition."   
    Requirement ID: FR-04   
    Requirement Title: Device Interface & Sensor Data Functions   
    Role: System   
    Requirement Description: System should explicitly declare its device and IT system interface dependencies, including the exact physiological parameters required. These device interface requirements must specify the data type (e.g., Integer), physical interpretation, units (e.g., Percentage), acceptable value range, and the required real-time polling period (e.g., 1 second) to ensure accurate sensor data acquisition.  
    Requirement Related Title: Medical IoT (Internet of Things) Gateways, Hardware-in-the-loop Diagnostic Apps, Bluetooth Low Energy (BLE) Medical Sync Tools   
    
    Example 5: Requirements Specification for Apps in Medical Application Platforms 
    Source Text: "System should be rigorously designed to satisfy FDA regulatory clearance processes (such as 510K) and embedded system standards (like IEC 62304)... architecture must also conform to the ASTM F2761-09 Integrated Clinical Environment (ICE) standard."   
    Requirement ID: NFR-04   
    Requirement Title: Heavy Regulatory Compliance (FDA 510k/IEC 62304)   
    Role: System   
    Requirement Description: System should be rigorously designed to satisfy FDA regulatory clearance processes (such as 510K) and embedded system standards (like IEC 62304). The architecture must also conform to the ASTM F2761-09 Integrated Clinical Environment (ICE) standard.  
    Requirement Related Title: Software as a Medical Device (SaMD), AI/Deep Learning Diagnostic Apps   
    
    Example 6: Requirements Specification for Apps in Medical Application Platforms 
    Source Text: "Derived / smart alarms: An app may implement “derived alarms” to supplement the native alarm capabilities of a device. This might include implementing alarms for consumer oriented devices that do not provide native alarms—e.g., an app might implement upper and lower limit SpO2 alarms for Continua compliant pulse oximeters such as the Nonin Onyx II. Alternatively, the app may implement a so-called “smart alarm” that provides more sophisticated analysis and decision logic based on physiological parameters from multiple devices, monitoring trends / history, or comparison and correlation with data patterns from a broader population indicating problematic physiological conditions."   
    Requirement ID: FR-01   
    Requirement Title: Alarm & Alerting Functions   
    Role: System   
    Requirement Description: System should be capable of forwarding native device alarms (such as fast/slow heart rate or low SpO2) and implementing "derived" or "smart alarms". This includes providing sophisticated analysis based on physiological parameters from multiple devices, tracking data trends (like rapid declines in SpO2), and evaluating contextual thresholds (such as adjusting limits when a patient is on supplementary oxygen) to reduce nuisance alarms.  
    Requirement Related Title: Intensive Care Unit (ICU) Patient Monitoring Apps, Early Warning Score (EWS) Alert Systems, Neonatal Incubator Monitoring Software, Anaesthesia Monitoring Apps, Clinical Decision Support Systems (CDSS)   
    `;

    const fewshot_2 = `
    [System Instructions]
    You are an expert Requirements Engineer AI. Your objective is to extract Functional Requirements (FR) and Non-Functional Requirements (NFR) from the provided academic or technical text.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [Few-Shot Example: Gold Standard Human-Verified Evaluation Set]    
    
    Source Text: 
    "Medical display and storage: An app may transfer and possibly consolidate data from one or more devices to a patient's electronic medical record or a MAP-supported display.[cite: 3] This could take the form of a composite display in a patient's hospital room, a remote clinical display at a nurses station, or a physician's smart phone.[cite: 3] 
    
    Derived / smart alarms: An app may implement "derived alarms" to supplement the native alarm capabilities of a device.[cite: 3] This might include implementing alarms for consumer oriented devices that do not provide native alarms—e.g., an app might implement upper and lower limit SpO2 alarms for Continua compliant pulse oximeters such as the Nonin Onyx II.[cite: 3] Alternatively, the app may implement a so-called "smart alarm" that provides more sophisticated analysis and decision logic based on physiological parameters from multiple devices, monitoring trends / history, or comparison and correlation with data patterns from a broader population indicating problematic physiological conditions.[cite: 3]
    
    Safety interlocks: An app may control one or more devices so as to implement system safety invariants that lock out potentially unsafe individual device behaviors or interactions between devices.[cite: 3] In more sophisticated apps that perform control of devices, other contract information would specify how the device should change its state to move to a fail-safe mode upon accidental disconnect from the Network Controller.[cite: 3]
    
    In the MDCF, the Supervisor can be thought of as a virtual machine that hosts Supervisor Apps.[cite: 3] We are currently working on ensuring that it provides separation/isolation-kernel-like [5] data partitioning (information cannot inadvertently leak between apps, and apps cannot inadvertently interfere with one another) and time partitioning (real-time scheduling guarantees that the computations in one app cannot cause the performance of another to degrade or fail).[cite: 3]"
    
    Expected Output:
    Requirement ID: FR-01  
    Requirement Title: Alarm & Alerting Functions  
    Requirement Description: System should be capable of forwarding native device alarms (such as fast/slow heart rate or low SpO2) and implementing "derived" or "smart alarms". This includes providing sophisticated analysis based on physiological parameters from multiple devices, tracking data trends (like rapid declines in SpO2), and evaluating contextual thresholds (such as adjusting limits when a patient is on supplementary oxygen) to reduce nuisance alarms.  
    Requirement Related Title: Intensive Care Unit (ICU) Patient Monitoring Apps, Early Warning Score (EWS) Alert Systems, Neonatal Incubator Monitoring Software, Anaesthesia Monitoring Apps, Clinical Decision Support Systems (CDSS)  
    
    Requirement ID: FR-02  
    Requirement Title: Display & Visualization Functions  
    Requirement Description: System should transfer and consolidate data from one or more devices to a patient's electronic medical record or a supported Supervisor User Interface (SUI) display. The interface must provide visual cues reflecting current alarm states, display recent trend measurements (e.g., heart rate and blood oxygenation), and clearly show the parameters used to determine active alarms.     
    Requirement Related Title: Nursing Station Central Dashboard Displays, Telemedicine Remote Observation Portals, Electronic Health Record (EHR) Data Viewers, Consumer Wearable Health Trackers    
    
    Requirement ID: NFR-01  
    Requirement Title: Real-Time Processing & Execution  
    Requirement Description: System should provide time partitioning with real-time scheduling guarantees, ensuring that the computational workload of one app cannot cause the performance of another app to degrade or fail. The system must also perform dynamic schedulability analysis to verify it can satisfy the real-time execution and communication needs of the app before allowing it to launch.   
    Requirement Related Title: Hemodynamic (Blood Flow) Monitoring Systems, Continuous ECG/EKG Arrhythmia Detectors, Robotic Surgery Assistance Software  
    
    Requirement ID: NFR-02  
    Requirement Title: Safety Interlocks & Fail-Safes  
    Requirement Description: System should implement system safety invariants that actively lock out potentially unsafe individual device behaviors or dangerous interactions between multiple connected devices. Furthermore, the system contract must specify how a connected device should automatically transition to a fail-safe mode in the event of an accidental disconnection from the network controller.  
    Requirement Related Title: Patient-Controlled Analgesia (PCA) Safety Systems, Laser/Radiation Therapy Control Software, Life-Support System Software    
    
    Requirement ID: NFR-03     
    Requirement Title: Strict Data Isolation (Space Partitioning)      
    Requirement Description: System should act as a virtual machine providing separation/isolation-kernel-like data partitioning. This ensures that sensitive medical information cannot inadvertently leak between different apps, and that executing apps cannot inadvertently interfere with one another's memory or operations.      
    Requirement Related Title: Multi-Tenant Hospital Cloud Platforms, Shared Medical Application Platforms (MAPs) running multiple apps simultaneously, Health Information Exchange (HIE) Hubs     
    [End of Few-Shot Example]
    `;

    const fewshot_3 = `
    [System Instructions]
    You are an expert Requirements Engineer AI specializing in Machine Learning systems. Your task is to extract requirements while strictly adhering to the human-verified gold standard to prevent hallucinations. You must ensure every requirement is grounded in the source text and that each entry contains a unique "Related Title" to maintain domain-specific context.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement.
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [Few-Shot Example: Gold Standard Human-Verified Evaluation Set]

    Source Text: 
    "NFR-01 Fairness: System should not enforce unintended biases towards vulnerable groups, and should define and measure fairness formally (e.g., via statistical parity or individual fairness) in a way that is context-specific.
    NFR-02 Transparency: System should provide understandable explanations for how its results are derived so that users can trust and verify the ML outputs.
    FR-02 Disease Diagnosis: System should analyze medical data using ML algorithms and produce a diagnostic output for clinical decision-making."
    
    Expected Output:
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-01
    Title: Fairness
    Description: System should not enforce unintended biases towards vulnerable groups, and should define and measure fairness formally (e.g., via statistical parity or individual fairness) in a way that is context-specific.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 6, 7]
    Related Title: Insurance Risk Estimation System, Automated Decision-Making Systems[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-02
    Title: Transparency
    Description: System should provide understandable explanations for how its results are derived so that users can trust and verify the ML outputs.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 6, 7]
    Related Title: Airport Passenger Screening System, Cancer Diagnosis System, High-Stakes Decision Systems[cite: 7]
    
    Functional Requirement
    Role: System
    Requirement ID: FR-02
    Title: Disease Diagnosis
    Description: System should analyze medical data using ML algorithms and produce a diagnostic output for clinical decision-making.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 6, 7]
    Related Title: Cancer Diagnosis ML System, Medical Domain ML Applications[cite: 7]
    [End of Few-Shot Example]
    `;

    const fewshot_4 = `
    [System Instructions]
    You are a Specialized Technical Analyst for AI Systems. Your goal is to identify and extract high-level quality attributes and security constraints from technical documentation. You must distinguish between the system's operational goals and its protective constraints. For every requirement, you are required to define the specific 'Role' responsible for the requirement and provide 'Related Titles' that illustrate its implementation in high-stakes environments. Ensure all extractions are grounded in the verified gold standard to maximize F1 score and precision metrics.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [Few-Shot Example: Gold Standard Human-Verified Evaluation Set]    
    
    Source Text: 
    "NFR-03 Accuracy & Performance: System should produce outputs that are correct relative to reality, measurable via precision and recall, and report these metrics as the primary quality indicator.
    NFR-05 Security: System should defend against ML-specific threats such as adversarial attacks and data poisoning, based on a defined threat model for ML.
    FR-05 Sensor & Environment Processing: System should continuously process real-world sensor inputs and produce autonomous decisions by integrating ML components within larger traditional software pipelines.[cite: 7]"
    
    Expected Output:
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-03
    Title: Accuracy & Performance
    Description: System should produce outputs that are correct relative to reality, measurable via precision and recall, and report these metrics as the primary quality indicator.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Airport Passenger Screening System, Spam Email Classification System, Cancer Diagnosis System[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-05
    Title: Security
    Description: System should defend against ML-specific threats such as adversarial attacks and data poisoning, based on a defined threat model for ML.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Big Data ML Applications, Security-Sensitive ML Systems[cite: 7]
    
    Functional Requirement
    Role: System
    Requirement ID: FR-05
    Title: Sensor & Environment Processing
    Description: System should continuously process real-world sensor inputs and produce autonomous decisions by integrating ML components within larger traditional software pipelines.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Self-Driving Car ML System[cite: 7]
    [End of Few-Shot Example]
    `;

    const fewshot_5 = `
    [System Instructions]
    You are a Lead AI Architect specializing in Requirement Engineering. Your objective is to parse technical literature to identify the specific functional logic of Machine Learning components and their associated reliability constraints. You must strictly ground every extraction in the provided text to maintain the established gold standard for evaluation. Pay particular attention to how the system manages individual predictions and large-scale data analysis pipelines. Each requirement must be accompanied by its unique 'Related Title' and assigned the correct operational 'Role'.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [Few-Shot Example: Gold Standard Human-Verified Evaluation Set]    
    
    Source Text: 
    "FR-04 Text/Spam Filtering: System should classify input text into predefined categories (e.g., spam vs. not spam) with measurable accuracy.
    FR-06 Business Data Analysis: System should design and execute data analytic pipelines that incorporate ML algorithms to answer domain-specific business intelligence questions.[cite: 6, 7]
    NFR-07 Reliability: System should estimate the confidence and trustworthiness of individual ML predictions at runtime, not only at the overall system level."
    
    Expected Output:
    Functional Requirement
    Role: System
    Requirement ID: FR-04
    Title: Text/Spam Filtering
    Description: System should classify input text into predefined categories (e.g., spam vs. not spam) with measurable accuracy.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Spam Email Classification System, Machine Learning System[cite: 7]
    
    Functional Requirement
    Role: System
    Requirement ID: FR-06
    Title: Business Data Analysis
    Description: System should design and execute data analytic pipelines that incorporate ML algorithms to answer domain-specific business intelligence questions.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Business Data Analytics Design Systems[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-07
    Title: Reliability
    Description: System should estimate the confidence and trustworthiness of individual ML predictions at runtime, not only at the overall system level.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Individual ML Prediction Systems, Medical Domain ML Applications[cite: 7]
    [End of Few-Shot Example]
    `;

    const fewshot_6 = `
    [System Instructions]
    You are a Quality Assurance Lead for AI Systems. Your primary task is to extract requirements related to the systematic validation and risk assessment of Machine Learning models. You must focus on identifying requirements that specify how a system's accuracy is measured, how risks are calculated, and how the outputs are tested for correctness. Every extraction must be word-for-word consistent with the verified gold standard. Ensure each requirement is assigned a unique 'Related Title' and the 'Role' is clearly defined as per the source text.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [Few-Shot Example: Gold Standard Human-Verified Evaluation Set]    
    
    Source Text: 
    "FR-03 Risk/Value Estimation: System should process input features (e.g., personal data) and produce a predicted numerical risk score or estimated value.
    NFR-06 Testability: System should support systematic validation of its ML outputs through techniques such as metamorphic testing, independently of using ML to improve the testing process itself.[cite: 6, 7]
    NFR-04 Privacy: System should protect personal data used in ML training and operation, while minimising the trade-off overhead imposed on algorithm runtime and communication speed."
    
    Expected Output:
    Functional Requirement
    Role: System
    Requirement ID: FR-03
    Title: Risk/Value Estimation
    Description: System should process input features (e.g., personal data) and produce a predicted numerical risk score or estimated value.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Insurance Risk Estimation System[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-06
    Title: Testability
    Description: System should support systematic validation of its ML outputs through techniques such as metamorphic testing, independently of using ML to improve the testing process itself.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: ML Classifier Systems, Deep Learning Systems[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-04
    Title: Privacy
    Description: System should protect personal data used in ML training and operation, while minimising the trade-off overhead imposed on algorithm runtime and communication speed.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Privacy-Preserving ML Systems (SecureML), Federated/Aggregated ML Systems[cite: 7]
    [End of Few-Shot Example]
    `;

    const chainofthoughts_1 = `
    [System Instructions]
    You are a Lead Requirements Analyst. Your task is to process technical documents to extract Functional (FR) and Non-Functional Requirements (NFR). To ensure accuracy and avoid hallucination, you must follow a Step-by-Step Reasoning process for every extraction before providing the final formatted requirement.
    
    [Reasoning Steps]
    1. Identify a sentence or paragraph that describes a system behavior (FR) or a quality constraint (NFR).
    2. Determine the primary 'Role' or component responsible for this action.
    3. Formulate a concise Title and a detailed Description grounded strictly in the source text.
    4. Verify the Citation to ensure the extraction is supported by the document.
    5. Generate a unique 'Related Title' by identifying 2-3 specific real-world domains where this exact requirement would be critical.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement.
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [CoT Gold Standard Example]
    
    Source Text: 
    "NFR-03 Accuracy & Performance: System should produce outputs that are correct relative to reality, measurable via precision and recall, and report these metrics as the primary quality indicator."
    
    Step-by-Step Reasoning:
    - Sentence Analysis: The text defines how the system measures its correctness using specific metrics (precision/recall).
    - Classification: This is a quality constraint on output quality, making it a Non-Functional Requirement (NFR).
    - Role Identification: The 'System' is responsible for producing and reporting these metrics.
    - Title & Description: The title is 'Accuracy & Performance'. The description must include the mention of precision and recall as primary indicators.
    - Related Title Generation: This is essential for safety-critical screening and medical diagnostics where correctness is life-critical.
    
    Expected Output:
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-03
    Title: Accuracy & Performance
    Description: System should produce outputs that are correct relative to reality, measurable via precision and recall, and report these metrics as the primary quality indicator.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.
    Related Title: Airport Passenger Screening System, Spam Email Classification System, Cancer Diagnosis System[cite: 7]
    `;

    const chainofthoughts_2 = `
    [System Instructions]
    You are a Senior Systems Architect. Your task is to perform a structural analysis of technical documentation to map functional capabilities to their necessary quality constraints. You must act as a logic-gate: before outputting any requirement, you must document your "Architectural Reasoning" to prove the requirement exists in the source text and to ensure the 'Role' and 'Related Title' are logically consistent with the system's design. Maintain strict adherence to the human-verified gold standard to protect evaluation metrics.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement.
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [CoT Gold Standard Example]
    
    Source Text: 
    "FR-01 Image / Face Recognition: System should recognize and match images or faces against a reference set to identify persons of interest. 
    NFR-03 Accuracy & Performance: System should produce outputs that are correct relative to reality, measurable via precision and recall, and report these metrics as the primary quality indicator."
    
    Architectural Reasoning:
    - Component Identification: The text identifies an 'Image Recognition' feature which is a core functional capability for identification.
    - Constraint Identification: It also identifies a performance constraint requiring that these outputs be measured via precision and recall.
    - Functional Logic (FR-01): The primary role is the 'System' performing a matching task against a reference set.
    - Quality Logic (NFR-03): The 'System' must not only perform the task but also report on its own correctness (Accuracy/Performance).
    - Domain Mapping: For the functional recognition task, airports and security checkpoints are primary use cases. For the performance reporting, spam filters and medical diagnosis provide strong parallel domains.
    
    Expected Output:
    Functional Requirement
    Role: System
    Requirement ID: FR-01
    Title: Image / Face Recognition
    Description: System should recognize and match images or faces against a reference set to identify persons of interest.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Airport Passenger Screening System, Image recognition system, Face Detection System[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-03
    Title: Accuracy & Performance
    Description: System should produce outputs that are correct relative to reality, measurable via precision and recall, and report these metrics as the primary quality indicator.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Airport Passenger Screening System, Spam Email Classification System, Cancer Diagnosis System[cite: 7]
    `;

    const chainofthoughts_3 = `
    [System Instructions]
    You are a Lead Security Engineer. Your task is to identify and extract critical security constraints and privacy protections from technical documentation. For every requirement identified, you must perform a "Threat-Model Reasoning" process. **Let's think step by step** to ensure that the extraction accurately reflects the source document and that the 'Related Titles' provided are contextually relevant to secure system deployment.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement.
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [CoT Gold Standard Example]
    
    Source Text: 
    "NFR-05 Security: System should defend against ML-specific threats such as adversarial attacks and data poisoning, based on a defined threat model for ML.
    NFR-04 Privacy: System should protect personal data used in ML training and operation, while minimising the trade-off overhead imposed on algorithm runtime and communication speed."
    
    Threat-Model Reasoning:
    **Let's think step by step.**
    1. **Analyze Security Context:** The text specifies a need to defend against ML-specific threats like adversarial attacks. This is clearly a Non-Functional Requirement (NFR).
    2. **Analyze Privacy Context:** The text identifies a requirement to protect personal data during both training and operation, with a specific constraint on performance overhead. This is also an NFR.
    3. **Identify Roles:** Both requirements designate the 'System' as the entity responsible for enforcement.
    4. **Draft Descriptions:** The descriptions must be word-for-word from the gold standard to ensure metric accuracy. For NFR-05, we focus on the "defined threat model." For NFR-04, we must include the "trade-off overhead" clause.
    5. **Map Related Titles:** For security, we look at "Big Data ML Applications." For privacy, we look at "Federated/Aggregated ML Systems" where data minimization is key.
    
    Expected Output:
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-05
    Title: Security
    Description: System should defend against ML-specific threats such as adversarial attacks and data poisoning, based on a defined threat model for ML.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Big Data ML Applications, Security-Sensitive ML Systems[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-04
    Title: Privacy
    Description: System should protect personal data used in ML training and operation, while minimising the trade-off overhead imposed on algorithm runtime and communication speed.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Privacy-Preserving ML Systems (SecureML), Federated/Aggregated ML Systems[cite: 7]
    `;

    const chainofthoughts_4 = `
    [System Instructions]
    You are a Lead Quality Assurance (QA) Engineer. Your task is to extract requirements that define the systematic validation and runtime reliability of AI components. You must ensure that the extraction identifies specific testing methodologies and confidence-estimation constraints. **Let's think step by step** to verify that each requirement is grounded in the human-verified gold standard and that the 'Related Titles' reflect the deployment of high-reliability ML systems.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement.
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [CoT Gold Standard Example]
    
    Source Text: 
    "NFR-06 Testability: System should support systematic validation of its ML outputs through techniques such as metamorphic testing, independently of using ML to improve the testing process itself.
    NFR-07 Reliability: System should estimate the confidence and trustworthiness of individual ML predictions at runtime, not only at the overall system level."
    
    Validation Reasoning:
    **Let's think step by step.**
    1. **Analyze Testability Context:** The text describes a requirement for systematic validation using specific techniques like "metamorphic testing." This is a quality constraint, thus a Non-Functional Requirement (NFR).
    2. **Analyze Reliability Context:** The text identifies the need for the system to estimate confidence for individual predictions at runtime. This is also an NFR.
    3. **Identify Roles:** Both requirements specify the 'System' as the responsible component for performing validation and estimation.
    4. **Draft Descriptions:** The descriptions must precisely match the gold standard. For NFR-06, we must explicitly mention "metamorphic testing." For NFR-07, we must highlight "individual ML predictions at runtime."
    5. **Map Related Titles:** For testability, relevant domains include "Deep Learning Systems." For reliability, "Medical Domain ML Applications" are a primary example where individual prediction confidence is vital.
    
    Expected Output:
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-06
    Title: Testability
    Description: System should support systematic validation of its ML outputs through techniques such as metamorphic testing, independently of using ML to improve the testing process itself.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: ML Classifier Systems, Deep Learning Systems[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-07
    Title: Reliability
    Description: System should estimate the confidence and trustworthiness of individual ML predictions at runtime, not only at the overall system level.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Individual ML Prediction Systems, Medical Domain ML Applications[cite: 7]
    `;

    const chainofthoughts_5 = `
    [System Instructions]
    You are a Senior Requirement Analyst specializing in Ethical AI. Your objective is to deconstruct technical documentation into distinct functional tasks and their associated ethical or performance constraints. You must maintain a clear boundary between what the system does and how it must behave to remain unbiased and reliable. **Let's think step by step** to ensure each extraction is word-for-word consistent with the human-verified gold standard. Every output must include a unique 'Related Title' to prevent document title mismatch.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement.
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [CoT Gold Standard Example]
    
    Source Text: 
    "FR-03 Risk/Value Estimation: System should process input features (e.g., personal data) and produce a predicted numerical risk score or estimated value.
    NFR-01 Fairness: System should not enforce unintended biases towards vulnerable groups, and should define and measure fairness formally (e.g., via statistical parity or individual fairness) in a way that is context-specific."
    
    Analytical Reasoning:
    **Let's think step by step.**
    1. **Identify Functional Intent:** The first entry describes a system processing data to produce a specific numerical output (a risk score). This is a functional task, categorized as FR-03.
    2. **Identify Behavioral Constraint:** The second entry describes a constraint on the system's behavior—preventing unintended bias and measuring fairness. This is a quality attribute, categorized as NFR-01.
    3. **Establish Roles:** Both requirements designate the 'System' as the primary actor responsible for these outputs and measurements.
    4. **Verify Against Gold Standard:** The descriptions must match the source exactly. For FR-03, we include the "numerical risk score" detail. For NFR-01, we must include the formal measurement methods like "statistical parity."
    5. **Assign Unique Related Titles:** For risk estimation, "Insurance Risk Estimation System" is a direct match. For fairness, "Automated Decision-Making Systems" provides the necessary context for unbiased deployment.
    
    Expected Output:
    Functional Requirement
    Role: System
    Requirement ID: FR-03
    Title: Risk/Value Estimation
    Description: System should process input features (e.g., personal data) and produce a predicted numerical risk score or estimated value.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Insurance Risk Estimation System[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-01
    Title: Fairness
    Description: System should not enforce unintended biases towards vulnerable groups, and should define and measure fairness formally (e.g., via statistical parity or individual fairness) in a way that is context-specific.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Insurance Risk Estimation System, Automated Decision-Making Systems[cite: 7]
    `;

    const chainofthoughts_6 = `
    [System Instructions]
    You are a Requirements Engineering Consultant for the Singularity AI Platform. Your task is to extract requirements that enable the automated conversion of technical text into structured, human-verified requirements. You must ensure that each functional task is paired with a clear transparency or explainability constraint to support high precision and recall in XAI testing. **Let's think step by step** to confirm that the 'Role' and 'Related Title' assignments follow the updated logic of maintaining individual identifiers for every requirement.
    
    Formatting Rules:
    Functional Requirement / Non-Functional Requirement
    Role: User or system component 
    Requirement ID: Assign a unique ID (e.g., FR-01, NFR-01).
    Title: A concise name for the requirement.
    Description: A detailed explanation of what the system must do or a constraint it must satisfy.
    Citation: Where the section of the paper describe this requirement.
    Related Title: Generate contextual examples or domains where this requirement is applicable. Ensure each requirement has its own related title and there are no extra requirements.
    
    [CoT Gold Standard Example]
    
    Source Text: 
    "FR-06 Business Data Analysis: System should design and execute data analytic pipelines that incorporate ML algorithms to answer domain-specific business intelligence questions.
    NFR-02 Transparency: System should provide understandable explanations for how its results are derived so that users can trust and verify the ML outputs."
    
    Refinement Reasoning:
    **Let's think step by step.**
    1. **Identify Data Pipeline Logic:** The first entry describes the execution of analytic pipelines to answer business questions. This is a primary functional action for an AI platform, categorized as FR-06.
    2. **Identify Trust Logic:** The second entry focuses on providing "understandable explanations" to ensure user trust. This is a quality constraint (XAI focus), categorized as NFR-02.
    3. **Assign Roles:** In both instances, the 'System' is the entity responsible for executing the pipelines and generating the explanations.
    4. **Draft Descriptions:** The text must match the gold standard verbatim. For FR-06, we focus on the "design and execution" of pipelines. For NFR-02, we highlight the "understandable explanations" for verification.
    5. **Generate Unique Related Titles:** For business analysis, "Business Data Analytics Design Systems" is the verified title. For transparency, high-stakes domains like "Airport Passenger Screening" or "Cancer Diagnosis" are appropriate to show where explainability is critical.
    
    Expected Output:
    Functional Requirement
    Role: System
    Requirement ID: FR-06
    Title: Business Data Analysis
    Description: System should design and execute data analytic pipelines that incorporate ML algorithms to answer domain-specific business intelligence questions.
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Business Data Analytics Design Systems[cite: 7]
    
    Non-Functional Requirement
    Role: System
    Requirement ID: NFR-02
    Title: Transparency
    Description: System should provide understandable explanations for how its results are derived so that users can trust and verify the ML outputs.[cite: 7]
    Citation: Horkoff, J. (2019). Non-Functional Requirements for Machine Learning: Challenges and New Directions.[cite: 7]
    Related Title: Airport Passenger Screening System, Cancer Diagnosis System, High-Stakes Decision Systems[cite: 7]
    `;

    const prompts = [zeroShot_1, zeroShot_2, zeroShot_3, zeroShot_4, zeroShot_5, zeroShot_6,
                     fewshot_1, fewshot_2, fewshot_3, fewshot_4, fewshot_5, fewshot_6,
                     chainofthoughts_1, chainofthoughts_2, chainofthoughts_3, chainofthoughts_4, chainofthoughts_5, chainofthoughts_6];

    return prompts[index];
}


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
    try {
        const documents = [
            {
                name: 'Emotion_oriented_requirements_engineering_A_case_study_in_developing_a_smart_home_system_for_the_elderly',
                path: './training_sources/Emotion_oriented_requirements_engineering_A_case_study_in_developing_a_smart_home_system_for_the_elderly.pdf'
            },
            {
                name: 'Non_Functional_Requirements_for_Real_World_Big_Data_Systems_An_Investigation_of_Big_Data_Architectures_at_Facebook_Twitter_and_Netflix',
                path: './training_sources/Non_Functional_Requirements_for_Real_World_Big_Data_Systems_An_Investigation_of_Big_Data_Architectures_at_Facebook_Twitter_and_Netflix.pdf'
            },
            {
                name: 'Functional_and_Nonfunctional_Requirements_of_Virtual_Clinic_Mobile_Applications_A_Systematic_Review',
                path: './training_sources/Functional_and_Nonfunctional_Requirements_of_Virtual_Clinic_Mobile_Applications_A_Systematic_Review.pdf'
            },
            {
                name: 'Sustainability_requirements_for_connected_health_applications',
                path: './training_sources/Sustainability_requirements_for_connected_health_applications.pdf'
            }
        ];

        const documentDataList = await Promise.all(
            documents.map(async (doc) => {
                const extracted = await pdfExtracted_pdfjslib(doc.path);
                await fs.writeFile(`./raw/${doc.name}.txt`, extracted, 'utf8');
                const data = await fs.readFile(`./raw/${doc.name}.txt`, 'utf8');
                return { name: doc.name, data };
            })
        );

        // All 18 prompts: indices 0–17
        const PROMPT_INDICES = Array.from({ length: 18 }, (_, i) => i);

        function getPromptLabel(index) {
            if (index < 6)  return `zeroShot_${index + 1}`;
            if (index < 12) return `fewShot_${index - 5}`;
            return `chainOfThoughts_${index - 11}`;
        }

        for (const { name: docName, data: docData } of documentDataList) {
            console.log(`\n=== Document: ${docName} ===`);

            for (const promptIndex of PROMPT_INDICES) {
                const promptLabel = getPromptLabel(promptIndex);
                console.log(`  Prompt: ${promptLabel}`);

                for (const model of MODEL) {
                    console.log(`    Model: ${model}`);

                    const result = await evaluationModel(docData, model, phase2_promptEvaluation(promptIndex));

                    const safeModelName = model.replace(/[-.]/g, '_');
                    const filename = `${safeModelName}__${docName}__${promptLabel}.txt`;
                    await fs.writeFile(`./Phase_2Results/${filename}`, result, 'utf8');

                    console.log(`    Saved: ${filename}`);
                }
            }
        }

        console.log('\n=== All evaluations complete ===');
    } catch (err) {
        console.error('modelEvaluation failed:', err.message);
    }
}

modelEvaluation();