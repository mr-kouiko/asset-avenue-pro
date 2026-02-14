-- Remove 2 duplicate content_files from "Scientist Controlling Robotic Prosthetic Hand" submission
-- Keep original 19ff63b2, remove duplicates 97e549db and 1923867b
DELETE FROM content_files WHERE id IN ('97e549db-4dd4-4f05-81ff-f95976c89823', '1923867b-35b1-405b-8bd0-aacae7ef648b');