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

def iou(boxA, boxB):
    (xA, yA, wA, hA) = boxA
    (xB, yB, wB, hB) = boxB
    xa1, ya1, xa2, ya2 = xA, yA, xA + wA, yA + hA
    xb1, yb1, xb2, yb2 = xB, yB, xB + wB, yB + hB
    interX1, interY1 = max(xa1, xb1), max(ya1, yb1)
    interX2, interY2 = min(xa2, xb2), min(ya2, yb2)
    if interX2 <= interX1 or interY2 <= interY1:
        return 0.0
    interArea = (interX2 - interX1) * (interY2 - interY1)
    boxB_area = wB * hB
    return interArea / float(boxB_area)
  

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

        # Build distinct colors via HSV hues (OpenCV hue range 0..179) -> avoiding red-ish colour, hence 80..160
        hues = np.linspace(80, 160, max(N, 1), endpoint=False, dtype=np.uint8)
        palette_bgr = [tuple(cv2.cvtColor(np.uint8([[[int(h), 255, 255]]]), cv2.COLOR_HSV2BGR)[0, 0]) for h in hues]

        overlay = orig.copy()
        alpha = 0.45

        bboxes = []
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
            
            # contour
            m = cv2.resize(masks[i], (W, H), interpolation=cv2.INTER_NEAREST) > 0.5
            m8 = m.astype(np.uint8)
            cnts, _ = cv2.findContours(m8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if len(cnts) > 0:
              # Pick the largest contour (most pixels)
              c = max(cnts, key=cv2.contourArea)
              x, y, w, h = cv2.boundingRect(c)
              bboxes.append((x, y, w, h))

        boxes_sorted = sorted(bboxes, key=lambda b: b[2] * b[3], reverse=True)
        kept = []
        for i, b in enumerate(boxes_sorted):
            discard = False
            for bigger in kept:  # only compare with already-kept larger boxes
                if iou(bigger, b) >= 0.8:
                    discard = True
                    break
            if not discard:
                kept.append(b)
              
        for bbox in kept:
            x, y, w, h = bbox
            cv2.rectangle(overlay, (x, y), (x + w, y + h), (255, 255, 255), 2)

        cv2.imwrite(f"./tmp/seg_{file.filename}", overlay)
        print(f"Saved overlay to ./tmp/seg_{file.filename}")
        
        ok, encoded = cv2.imencode('.jpg', overlay)
        if not ok:
            return {"status": "error", "message": "Failed to encode image"}
          
        byteio = io.BytesIO(encoded.tobytes())
        headers = {"Content-Disposition": f'inline; filename="seg_{file.filename}"'}

        return StreamingResponse(byteio, media_type="image/jpeg", headers=headers)
      
    return {"status": "error", "message": "No masks found"}
  

@app.post("/align")
def align_images(ref_img: UploadFile = File(...), input_img: UploadFile = File(...), target_h: int = Query(512, description="Target height for downsampling")):
    ref_contents = ref_img.file.read()
    input_contents = input_img.file.read()

    ref_array = np.frombuffer(ref_contents, np.uint8)
    input_array = np.frombuffer(input_contents, np.uint8)

    ref_cvimg = cv2.imdecode(ref_array, cv2.IMREAD_COLOR)
    input_cvimg = cv2.imdecode(input_array, cv2.IMREAD_COLOR)

    if ref_cvimg is None or input_cvimg is None:
        return {"status": "error", "message": "Invalid image"}

    if ref_cvimg.shape != input_cvimg.shape:
        return {"status": "error", "message": "Images must be the same size"}

    from .alignment import best_yaw_shift_hillclimb
    aligned_img, best_x, best_s, meta = best_yaw_shift_hillclimb(ref_cvimg, input_cvimg, target_h=target_h)
    print(f'Best shift {best_x:.2f}px with SSIM {best_s:.5f}')

    cv2.imwrite(f"./tmp/aligned_{input_img.filename}", aligned_img)
    print(f"Saved aligned image to ./tmp/aligned_{input_img.filename}")

    ok, encoded = cv2.imencode('.jpg', aligned_img)
    if not ok:
        return {"status": "error", "message": "Failed to encode image"}

    byteio = io.BytesIO(encoded.tobytes())
    headers = {"Content-Disposition": f'inline; filename="aligned_{input_img.filename}"'}

    return StreamingResponse(byteio, media_type="image/jpeg", headers=headers)