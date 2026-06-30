from io import BytesIO

from markitdown import MarkItDown

md = MarkItDown()
content = b"<html><body><h1>Hello</h1><p>World</p></body></html>"
stream = BytesIO(content)
result = md.convert_stream(stream, file_extension=".html")
print(result.text_content)
