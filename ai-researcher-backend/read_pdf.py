import PyPDF2
from langchain_core.tools import tool
import io
import requests

# Cap how much extracted text we hand back to the model. Full papers can run
# 10k+ tokens; since that text gets persisted in conversation history by the
# checkpointer, an uncapped read here was blowing past the model's context /
# rate limits on the very next turn. This keeps enough for the agent to find
# methodology, results, and future-work sections while staying well within
# limits.
MAX_PDF_CHARS = 12000


def extract_pdf_text(pdf_url: str) -> str:
    """Raw extractor used by both the API route and the agent tool below."""
    try:
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()

        pdf_file = io.BytesIO(response.content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for i, page in enumerate(pdf_reader.pages, 1):
            print(f"Extracting text from page {i} of the PDF...")
            text += (page.extract_text() or "") + "\n"
        print(f"Finished extracting text from PDF. Total length: {len(text)} characters.")

        # FIX: original returned text.split() (a list of individual words), which
        # throws away all structure and breaks any downstream reading of the text.
        text = text.strip()
        if len(text) > MAX_PDF_CHARS:
            text = (
                text[:MAX_PDF_CHARS]
                + f"\n\n[...truncated — original was {len(text)} characters...]"
            )
        return text
    except Exception as e:
        print(f"An error occurred while reading the PDF from URL: {e}")
        raise ValueError(f"Failed to read PDF from URL: {pdf_url}. Error: {e}")


@tool
def read_pdf_from_url(pdf_url: str) -> str:
    """
    Reads a PDF from the given URL and extracts its text content.

    Args:
        pdf_url (str): The URL of the PDF file to read.

    Returns:
        str: The extracted text content from the PDF.
    """
    return extract_pdf_text(pdf_url)
