#Step 1: Access to arXiv using URL
import requests


def get_arxiv_data(topic: str, max_results: int = 5) -> dict:
    query = "+".join(topic.lower().split())
    for char in list("!@#$%^&*()[]{};:,./<>?\\|`~-=_"):
        if char in query:
            print(f"Invalid character '{char}' in topic: {query}. Please remove it and try again.")
            raise ValueError(f"Cannot have character '{char}' in topic: {query}.")

    url = (
        "https://export.arxiv.org/api/query"
        f"?search_query=all:{query}"
        f"&max_results={max_results}"
        "&sortBy=submittedDate&sortOrder=descending"  # FIX: was "sortBY" (case-sensitive param, arXiv silently ignored it)
    )
    print(f"Fetching data from arXiv API for topic: {topic} with max results: {max_results}")
    resp = requests.get(url, timeout=20)
    if not resp.ok:
        print(f"Error fetching data from arXiv API. Status code: {resp.status_code}--Response: {resp.text}")
        raise ValueError(f"Bad response from arXiv API.{resp}\n{resp.text}")

    data = parse_arxiv_xml(resp.text)
    return data


#Step 2: Parse the XML data from the arXiv API
def parse_arxiv_xml(xml_data: str) -> dict:
    """
    Parses the XML data returned by the arXiv API and extracts relevant information.
    """
    import xml.etree.ElementTree as ET
    root = ET.fromstring(xml_data)
    entries = []
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "arxiv": "http://arxiv.org/schemas/atom",
    }
    for entry in root.findall("atom:entry", ns):
        title = entry.find("atom:title", ns).text.strip()
        summary = entry.find("atom:summary", ns).text.strip()
        authors = [author.find("atom:name", ns).text.strip() for author in entry.findall("atom:author", ns)]
        published = entry.find("atom:published", ns).text.strip()
        pdf_link = None
        for link in entry.findall("atom:link", ns):
            if link.attrib.get("type") == "application/pdf":
                pdf_link = link.attrib.get("href")
                break
        categories = [category.attrib["term"] for category in entry.findall("atom:category", ns)]
        entries.append({
            "title": title,
            "summary": summary,
            "authors": authors,
            "published": published,
            "pdf_link": pdf_link,
            "categories": categories,
        })
    return {"entries": entries}


#Step 3: Convert the functionality into a LangChain tool for the agent
from langchain_core.tools import tool


@tool
def arxiv_search(topic: str) -> str:
    """
    Searches for papers on arXiv based on the given topic and returns their details
    (title, summary, authors, published date, PDF link, categories) as a JSON string.

    Args:
        topic (str): The search topic for which to find papers on arXiv.

    Returns:
        str: A JSON string of the form {"entries": [...]}.
    """
    import json

    print("ARXIV Agent called")
    print(f"Searching for papers on arXiv with topic: {topic}")
    papers = get_arxiv_data(topic)
    if len(papers["entries"]) == 0:
        print(f"No papers found for topic: {topic}")
        raise ValueError(f"No papers found for topic: {topic}")
    print(f"found {len(papers['entries'])} papers for topic: {topic}")
    return json.dumps(papers)
