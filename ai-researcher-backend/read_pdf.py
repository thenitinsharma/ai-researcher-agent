import PyPDF2
from langchain_core.tools import tool
import io
import requests


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
        return text.strip()
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
