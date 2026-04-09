import base64
import sys
from PIL import Image
import io
import json
import urllib.request

sys.stdout.write('Creating 64x64 red image...\n')
sys.stdout.flush()

# Create 64x64 red image
img = Image.new('RGB', (64, 64), color='red')

# Convert to PNG bytes
img_bytes = io.BytesIO()
img.save(img_bytes, format='PNG')
img_bytes.seek(0)

# Encode to base64
img_b64 = base64.b64encode(img_bytes.getvalue()).decode('utf-8')
sys.stdout.write(f'Base64 encoded length: {len(img_b64)}\n\n')
sys.stdout.flush()

# Create JSON payload
payload = json.dumps({'image': img_b64})

# Send POST request
sys.stdout.write('Sending POST to http://127.0.0.1:8000/analyze\n')
sys.stdout.write('---\n')
sys.stdout.flush()

try:
    req = urllib.request.Request(
        'http://127.0.0.1:8000/analyze',
        data=payload.encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        sys.stdout.write(f'HTTP Status: {response.status}\n')
        sys.stdout.write(f'Response Body:\n')
        sys.stdout.write(response.read().decode('utf-8'))
        sys.stdout.write('\n')
except Exception as e:
    sys.stdout.write(f'Error: {e}\n')
    import traceback
    traceback.print_exc()
finally:
    sys.stdout.flush()
