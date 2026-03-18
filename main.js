const { documentPreprocessing, documentToPdf_libreofficeconvert,pdfExtracted_pdfjslib, videoaudioExtracted_ffmpeg,mp3Convert_ffmpeg, writetxtFile, extracttxtFile, groupMultipleFile } = require('./helperModel');

// async function smallHelperFunctionTesting() {
//     const extract_text_1 = await pdfExtracted_pdfjslib('./training_sources/Bioconductor_open_software_development_for_computational_biology_and_bioinformatics.pdf');
//     await writetxtFile(extract_text_1, './raw/Bioconductor_open_software_development_for_computational_biology_and_bioinformatics.txt');
//
//     const extract_text_2 = await pdfExtracted_pdfjslib('./training_sources/Emotion_oriented_requirements_engineering_a_case_study_in_developing_a_smart_home_system_for_the_elderly.pdf');
//     await writetxtFile(extract_text_2, './raw/Emotion_oriented_requirements_engineering_a_case_study_in_developing_a_smart_home_system_for_the_elderly.txt');
//
//     const extract_text_3 = await pdfExtracted_pdfjslib('./training_sources/Functional_and_Nonfunctional_Requirements_of_Virtual_Clinic_Mobile_Applications_A_Systematic_Review.pdf');
//     await writetxtFile(extract_text_3, './raw/Functional_and_Nonfunctional_Requirements_of_Virtual_Clinic_Mobile_Applications_A_Systematic_Review.txt');
//
//     const extract_text_4 = await pdfExtracted_pdfjslib('./training_sources/Non_Functional_Requirements_for_Machine_Learning_Challenges_and_New_Directions.pdf');
//     await writetxtFile(extract_text_4, './raw/Non_Functional_Requirements_for_Machine_Learning_Challenges_and_New_Directions.txt');
//
//     const extract_text_5 = await pdfExtracted_pdfjslib('./training_sources/Non_Functional_Requirements_for_Real_World_Big_Data_SystemsAn_Investigation_of_Big_Data_Architectures_at_Facebook_Twitter_and_Netflix.pdf');
//     await writetxtFile(extract_text_5, './raw/Non_Functional_Requirements_for_Real_World_Big_Data_SystemsAn_Investigation_of_Big_Data_Architectures_at_Facebook_Twitter_and_Netflix.txt');
//
//     const extract_text_6 = await pdfExtracted_pdfjslib('./training_sources/Privacy_requirements_patterns_for_mobile_operating_systems.pdf');
//     await writetxtFile(extract_text_6, './raw/Privacy_requirements_patterns_for_mobile_operating_systems.txt');
//
//     const extract_text_7 = await pdfExtracted_pdfjslib('./training_sources/Requirements_engineering_framework_for_human_centered_artificial_intelligence_software_systems.pdf');
//     await writetxtFile(extract_text_7, './raw/Requirements_engineering_framework_for_human_centered_artificial_intelligence_software_systems.txt');
// }