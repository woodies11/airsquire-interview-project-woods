from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import json
# import cv2, numpy as np  # uncomment if you actually use them

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}