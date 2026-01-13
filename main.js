const { writetxtFile, pdfExtracted_pdfjslib, officefilesExtracted_officeparser, videoaudioExtracted_ffmpeg } = require('./helperModel');  
const {  requirementanalysisModel } = require('./analysisModel');


async function main() {
    // Docx Testing: Office file -> Extracted Text
    const docxTesting = await officefilesExtracted_officeparser('./testing_sources/game_system_testing_paper.docx');
    await writetxtFile('./output_texts/docx_game_system_testing_paper.txt', docxTesting);

    // PDF Testing: PDF file -> Extracted Text
    const pdfTesting = await pdfExtracted_pdfjslib('./testing_sources/medical_app_testing_paper.pdf');
    await writetxtFile('./output_texts/pdf_medical_app_testing_paper.txt', pdfTesting);
    // RTF Testing: RTF file -> Extracted Text
    const rtfTesting = await officefilesExtracted_officeparser('./testing_sources/game_system_testing_paper.rtf');
    await writetxtFile('./output_texts/rtf_game_system_testing_paper.txt', rtfTesting);

    // ODT Testing: ODT file -> Extracted Text
    const odtTesting = await officefilesExtracted_officeparser('./testing_sources/game_system_testing_paper.odt');
    await writetxtFile('./output_texts/odt_game_system_testing_paper.txt', odtTesting);

    // Audio Testing: Audio file -> Extracted Text
    const audioTesting = await videoaudioExtracted_ffmpeg('./testing_sources/1mins_testing_audio.mp3');
    await writetxtFile('./output_texts/1mins_testing_audio.txt', audioTesting);

    // Video Testing: Video file -> Extracted Text
    const videoTesting = await videoaudioExtracted_ffmpeg('./testing_sources/1mins_testing_video.mp4');
    await writetxtFile('./output_texts/1mins_testing_video.txt', videoTesting);

    // Requirement Analysis Testing: Extracted Text -> Requirements
    // Game System Testing -> Should be run properly
    const requirementAnalysisTesting = await requirementanalysisModel(docxTesting, 'Game System');
    await writetxtFile('./requirements_analysis/analysis_1.txt', requirementAnalysisTesting);

    // Medical App Testing -> Should be run properly
    const requirementAnalysisTesting2 = await requirementanalysisModel(pdfTesting, 'Medical App');
    await writetxtFile('./requirements_analysis/analysis_2.txt', requirementAnalysisTesting2);

    // Warning: This should be not find any requirements
    const requirementAnalysisTesting3 = await requirementanalysisModel(pdfTesting, 'Game');
    await writetxtFile('./requirements_analysis/analysis_3.txt', requirementAnalysisTesting3);
}

main();