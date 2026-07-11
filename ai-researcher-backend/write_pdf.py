#Step 1:Install tectonic & import deps
from langchain_core.tools import tool
from datetime import datetime
from pathlib import Path
import subprocess
import shutil


def compile_latex(latex_code: str, filename_stem: str | None = None) -> Path:
    """Raw compiler used by both the API route and the agent tool below."""
    if shutil.which("tectonic") is None:
        raise EnvironmentError("Tectonic is not installed. Please install it to use this function.")

    output_dir = Path("output").absolute()
    output_dir.mkdir(exist_ok=True)

    stem = filename_stem or f"paper_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    tex_path = output_dir / f"{stem}.tex"
    pdf_path = output_dir / f"{stem}.pdf"

    # FIX: the original never wrote latex_code to the .tex file before invoking
    # tectonic on it, so tectonic had nothing to compile.
    tex_path.write_text(latex_code, encoding="utf-8")

    result = subprocess.run(
        ["tectonic", str(tex_path), "--outdir", str(output_dir)],
        cwd=output_dir,  # FIX: was the invalid kwarg `cmd=`, which raises TypeError
        capture_output=True,
        text=True,
    )

    if result.returncode != 0 or not pdf_path.exists():
        print(f"Tectonic stderr:\n{result.stderr}")
        raise FileNotFoundError(f"PDF file was not generated. Tectonic said: {result.stderr}")

    print(f"PDF generated successfully: {pdf_path}")
    return pdf_path


@tool
def render_latex_to_pdf(latex_code: str) -> str:
    """
    Renders LaTeX code to a PDF file using Tectonic.

    Args:
        latex_code (str): The LaTeX document content as a string.

    Returns:
        str: A JSON string with the generated PDF's filename and a browser-fetchable
        URL path (served under /files/), e.g. {"pdf_filename": "...", "pdf_url": "/files/..."}.
    """
    import json

    try:
        pdf_path = compile_latex(latex_code)
        return json.dumps({
            "pdf_filename": pdf_path.name,
            "pdf_url": f"/files/{pdf_path.name}",
        })
    except Exception as e:
        print(f"An error occurred while rendering LaTeX : {str(e)}")
        raise
