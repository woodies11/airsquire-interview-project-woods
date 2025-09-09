from fastapi import FastAPI, UploadFile, File, Query
from pydantic import BaseModel
import json
import os
import cv2
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import openai
import dotenv
import base64
from ultralytics import FastSAM
import numpy as np
import io


dotenv.load_dotenv('./apps/pycv/.env')
app = FastAPI()

# configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


model = FastSAM('FastSAM-x.pt')

# make sure the temp directory exists
os.makedirs("./tmp", exist_ok=True)
@app.post("/images")
async def process_image(file: UploadFile = File(...)):
    contents = await file.read()
    # save image to ./tmp/
    with open(f"./tmp/{file.filename}", "wb") as f:
        f.write(contents)
        f.flush()
    
    img = cv2.imread(f"./tmp/{file.filename}")
    if img is None:
        return {"status": "error", "message": "Invalid image"}

    results = model.predict(img, conf=0.5, verbose=False)
    print(f"Found {len(results[0].masks.data)} masks")
    reimg = results[0]
    if reimg:
       # --- composite colored overlay (no boxes, no labels) ---
      if reimg.masks is not None and reimg.masks.data is not None:
          
        orig = reimg.orig_img.copy()                 # (H, W, 3) BGR
        H, W = orig.shape[:2]

        masks_t = reimg.masks.data                  # torch.Tensor (N, Mh, Mw) at model mask size
        masks = masks_t.detach().cpu().numpy()      # -> (N, Mh, Mw) float in [0,1]
        N, Mh, Mw = masks.shape

        # Build distinct colors via HSV hues (OpenCV hue range 0..179) -> avoiding red-ish colour, hence 40..120
        hues = np.linspace(40, 120, max(N, 1), endpoint=False, dtype=np.uint8)
        palette_bgr = [tuple(cv2.cvtColor(np.uint8([[[int(h), 255, 255]]]), cv2.COLOR_HSV2BGR)[0, 0]) for h in hues]

        overlay = orig.copy()
        alpha = 0.45

        for i in range(N):
            # Resize mask to original image size
            m = masks[i]
            m_resized = cv2.resize(m, (W, H), interpolation=cv2.INTER_NEAREST) > 0.5  # boolean (H, W)
            if not np.any(m_resized):
                continue

            # Blend color only where mask is True
            color = np.array(palette_bgr[i], dtype=np.float32)
            roi = overlay[m_resized].astype(np.float32)
            overlay[m_resized] = (roi * (1 - alpha) + color * alpha).astype(np.uint8)

        cv2.imwrite(f"./tmp/seg_{file.filename}", overlay)
        print(f"Saved overlay to ./tmp/seg_{file.filename}")
        
        ok, encoded = cv2.imencode('.jpg', overlay)
        if not ok:
            return {"status": "error", "message": "Failed to encode image"}
          
        byteio = io.BytesIO(encoded.tobytes())
        headers = {"Content-Disposition": f'inline; filename="seg_{file.filename}"'}

        return StreamingResponse(byteio, media_type="image/jpeg", headers=headers)
      
    return {"status": "error", "message": "No masks found"}