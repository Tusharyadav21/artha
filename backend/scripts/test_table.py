import sys
import pdfplumber

def debug_multi_page_table(pdf_path: str, start_trigger: str, end_trigger: str, vertical_lines: list[float]):
    print(f"Opening {pdf_path}...")
    
    in_table = False
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            
            start_trigger_word = start_trigger.split()[0].lower()
            end_trigger_word = end_trigger.split()[0].lower()
            
            crop_top = 50.0
            crop_bottom = 800.0
            
            # Only search for start_word if we aren't already in the table
            start_word = next((w for w in words if start_trigger_word in w["text"].lower()), None) if not in_table else None
            
            if start_word:
                in_table = True
                crop_top = start_word["bottom"]
                print(f"--- Found Start Trigger on Page {page.page_number} at Y={crop_top} ---")
                
            if in_table:
                # Only match end_trigger if it is physically below our current crop_top
                end_word = next((w for w in words if end_trigger_word in w["text"].lower() and w["top"] > crop_top), None)
                
                if end_word:
                    crop_bottom = end_word["top"]
                    print(f"--- Found End Trigger on Page {page.page_number} at Y={crop_bottom} ---")
                    
                x0, top, x1, bottom = 0, crop_top, page.width, crop_bottom
                x0, top = max(0, x0), max(0, top)
                x1, bottom = min(page.width, x1), min(page.height, bottom)
                
                if bottom > top:
                    print(f"\nCropping Page {page.page_number} to (0, {top:.1f}, {page.width:.1f}, {bottom:.1f})...")
                    cropped = page.within_bbox((x0, top, x1, bottom))
                    
                    # Bulletproof deterministic extraction bypassing pdfplumber's table logic
                    words = cropped.extract_words()
                    
                    if not words:
                        print("No table found on this crop.")
                        continue
                        
                    # Sort words by Y coordinate, then X coordinate
                    words.sort(key=lambda w: (w["top"], w["x0"]))
                    
                    rows = []
                    current_row = []
                    current_top = words[0]["top"]
                    
                    for w in words:
                        if abs(w["top"] - current_top) > 3.0: # 3 pixel tolerance for same row
                            rows.append(current_row)
                            current_row = []
                            current_top = w["top"]
                        current_row.append(w)
                    if current_row:
                        rows.append(current_row)
                        
                    # Now map each row into the vertical line buckets
                    num_cols = len(vertical_lines) - 1
                    for i, row_words in enumerate(rows):
                        row_data = [[] for _ in range(num_cols)]
                        for w in row_words:
                            # Find which column bucket this word falls into based on its center X
                            word_center = (w["x0"] + w["x1"]) / 2
                            col_idx = 0
                            for j in range(num_cols):
                                if vertical_lines[j] <= word_center < vertical_lines[j+1]:
                                    col_idx = j
                                    break
                                # If it's past the last explicitly defined inner line, it goes in the last col
                                if word_center >= vertical_lines[-1]:
                                    col_idx = num_cols - 1
                                    
                            row_data[col_idx].append(w["text"])
                            
                        # Join words in each bucket
                        final_row = [" ".join(col).strip() for col in row_data]
                        if any(final_row):
                            print(f"Row {i}: {final_row}")
                        
                if end_word:
                    in_table = False
                    print("--- Finished Table Extraction ---")
                    break

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: uv run python scripts/test_table.py <path> <start_trigger> <end_trigger> [v1 v2 v3 ...]")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    start_trigger = sys.argv[2]
    end_trigger = sys.argv[3]
    vertical_lines = [float(v) for v in sys.argv[4:]]
    
    print(f"Using vertical lines: {vertical_lines}")
    debug_multi_page_table(pdf_path, start_trigger, end_trigger, vertical_lines)
