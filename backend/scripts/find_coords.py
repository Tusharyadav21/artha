import sys
import pdfplumber

def find_text_coordinates(pdf_path: str, search_text: str, page_number: int = 1):
    """
    Searches a PDF page for a specific string and prints its bounding box coordinates.
    """
    print(f"Opening {pdf_path} and searching for '{search_text}' on page {page_number}...\n")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if page_number < 1 or page_number > len(pdf.pages):
                print(f"Error: Page {page_number} does not exist.")
                return
                
            page = pdf.pages[page_number - 1]
            words = page.extract_words()
            
            found = False
            for word in words:
                if search_text.lower() in word["text"].lower():
                    found = True
                    print(f"Found match: '{word['text']}'")
                    print(f"  --> BBox to use in template: [{word['x0']:.1f}, {word['top']:.1f}, {word['x1']:.1f}, {word['bottom']:.1f}]\n")
            
            if not found:
                print(f"Could not find any text matching '{search_text}' on page {page_number}.")
                
    except Exception as e:
        print(f"Error opening or parsing PDF: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: uv run python find_coords.py <path_to_pdf> <search_text> [page_number]")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    search_text = sys.argv[2]
    page_number = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    
    find_text_coordinates(pdf_path, search_text, page_number)
