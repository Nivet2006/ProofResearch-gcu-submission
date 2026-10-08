import os
import io
from typing import Tuple

def extract_text_from_file(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    """
    Extract text from uploaded .txt, .pdf, or .docx files.
    Returns (extracted_text, file_type).
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".txt":
        try:
            return file_bytes.decode('utf-8'), "TXT"
        except UnicodeDecodeError:
            return file_bytes.decode('latin-1', errors='replace'), "TXT"

    elif ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_pages = []
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    text_pages.append(txt)
            return "\n".join(text_pages), "PDF"
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

    elif ext == ".docx":
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            text_paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n".join(text_paragraphs), "DOCX"
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")

    else:
        raise ValueError(f"Unsupported file format '{ext}'. Allowed formats: .txt, .pdf, .docx")
