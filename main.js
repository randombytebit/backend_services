const { documentPreprocessing, documentToPdf_libreofficeconvert,pdfExtracted_pdfjslib, videoaudioExtracted_ffmpeg,mp3Convert_ffmpeg, writetxtFile, extracttxtFile, groupMultipleFile } = require('./helperModel');  
const {  requirementanalysisModel } = require('./analysisModel');

async function smallHelperFunctionTesting() {
    // Docx Testing: DOCX file -> PDF file
    await documentToPdf_libreofficeconvert('./testing_sources/game_system_testing_paper.docx', './output_texts/docx_game_system_testing_paper.pdf');

    // RTF Testing: RTF file -> PDF file
    await documentToPdf_libreofficeconvert('./testing_sources/game_system_testing_paper.rtf', './output_texts/rtf_game_system_testing_paper.pdf');

    // ODT Testing: ODT file -> PDF file
    await documentToPdf_libreofficeconvert('./testing_sources/game_system_testing_paper.odt', './output_texts/odt_game_system_testing_paper.pdf');

    // PPTX Testing: PPTX file -> PDF file
    await documentToPdf_libreofficeconvert('./testing_sources/testingpptx.pptx', './output_texts/pptx_testing_pptx.pdf');

    // PDF Testing: ORIGINAL_PDF file -> Extracted Text
    const pdfTesting = await pdfExtracted_pdfjslib('./testing_sources/medical_app_testing_paper.pdf');
    await writetxtFile(pdfTesting, './output_texts/pdf_medical_app_testing_paper.txt');

    // PDF Testing 2: DOCX file converted PDF -> Extracted Text
    const pdfTesting2 = await pdfExtracted_pdfjslib('./output_texts/docx_game_system_testing_paper.pdf');
    await writetxtFile(pdfTesting2, './output_texts/pdf_docx_game_system_testing_paper.txt', );

    // PDF Testing 3: RTF file converted PDF -> Extracted Text
    const pdfTesting3 = await pdfExtracted_pdfjslib('./output_texts/rtf_game_system_testing_paper.pdf');
    await writetxtFile(pdfTesting3, './output_texts/pdf_rtf_game_system_testing_paper.txt');

    // PDF Testing 4: ODT file converted PDF -> Extracted Text
    const pdfTesting4 = await pdfExtracted_pdfjslib('./output_texts/odt_game_system_testing_paper.pdf');
    await writetxtFile(pdfTesting4, './output_texts/pdf_odt_game_system_testing_paper.txt');

    // PDF Testing 5: PPTX file converted PDF -> Extracted Text
    const pdfTesting5 = await pdfExtracted_pdfjslib('./output_texts/pptx_testing_pptx.pdf');
    await writetxtFile(pdfTesting5, './output_texts/pdf_pptx_testing_pptx.txt');

    // Audio Testing: Audio file -> Extracted Text
    const audioTesting = await videoaudioExtracted_ffmpeg('./testing_sources/1mins_testing_audio.mp3');
    await writetxtFile(audioTesting, './output_texts/1mins_testing_audio.txt');

    // Video Testing: Video file -> Extracted Text
    const videoTesting = await videoaudioExtracted_ffmpeg('./testing_sources/1mins_testing_video.mp4');
    await writetxtFile(videoTesting, './output_texts/1mins_testing_video.txt');

}

async function requirementAnalysisTesting() {
    const pdfTesting = await pdfExtracted_pdfjslib('./testing_sources/medical_app_testing_paper.pdf');
    const docxTesting = await pdfExtracted_pdfjslib('./output_texts/docx_game_system_testing_paper.pdf');

    // Requirement Analysis Testing: Extracted Text -> Requirements
    // Game System Testing -> Should be run properly
    const requirementAnalysisTesting = await requirementanalysisModel(docxTesting, 'Game System');
    await writetxtFile(requirementAnalysisTesting, './requirements_analysis/analysis_1.txt');

    // Medical App Testing -> Should be run properly
    const requirementAnalysisTesting2 = await requirementanalysisModel(pdfTesting, 'Medical App');
    await writetxtFile(requirementAnalysisTesting2, './requirements_analysis/analysis_2.txt');

    // Warning: This should be not find any requirements
    const requirementAnalysisTesting3 = await requirementanalysisModel(pdfTesting, 'Game');
    await writetxtFile(requirementAnalysisTesting3, './requirements_analysis/analysis_3.txt');
}

async function mainHelperFunctionTesting() {
    // PDF Testing
    const pdf_extractedText = await documentPreprocessing("./testing_sources/medical_app_testing_paper.pdf")
    await writetxtFile(pdf_extractedText, './output_texts/pdf_extracted.txt');

    // DOCX Testing
    const docx_extractedText = await documentPreprocessing("./testing_sources/game_system_testing_paper.docx")
    await writetxtFile(docx_extractedText, './output_texts/docx_extracted.txt');
    documentToPdf_libreofficeconvert('./output_texts/docx_extracted.txt', './output_texts/docx_extracted.pdf')

    // RTF Testing
    const rtf_extractedText = await documentPreprocessing("./testing_sources/game_system_testing_paper.rtf")
    await writetxtFile(rtf_extractedText, './output_texts/rtf_extracted.txt');
    documentToPdf_libreofficeconvert('./output_texts/rtf_extracted.txt', './output_texts/rtf_extracted.pdf')

    // ODT Testing
    const odt_extractedText = await documentPreprocessing("./testing_sources/game_system_testing_paper.odt")
    await writetxtFile(odt_extractedText, './output_texts/odt_extracted.txt');
    documentToPdf_libreofficeconvert('./output_texts/odt_extracted.txt', './output_texts/odt_extracted.pdf')

    // PPTX Testing
    const pptx_extractedText = await documentPreprocessing("./testing_sources/testingpptx.pptx")
    await writetxtFile(pptx_extractedText, './output_texts/pptx_extracted.txt');
    documentToPdf_libreofficeconvert('./output_texts/pptx_extracted.txt', './output_texts/pptx_extracted.pdf')

    // Audio Testing
    const mp3_extractedText = await documentPreprocessing("./testing_sources/1mins_testing_audio.mp3")
    await writetxtFile(mp3_extractedText, './output_texts/mp3_extracted.txt');
    documentToPdf_libreofficeconvert('./output_texts/mp3_extracted.txt', './output_texts/mp3_extracted.pdf')

    // Video Testing
    const mp4_extractedText = await documentPreprocessing("./testing_sources/1mins_testing_video.mp4")
    await writetxtFile(mp4_extractedText, './output_texts/mp4_extracted.txt');
    await documentToPdf_libreofficeconvert('./output_texts/mp4_extracted.txt', './output_texts/mp4_extracted.pdf')
}

mainHelperFunctionTesting();