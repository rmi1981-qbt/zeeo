import logging
import os
import io
import requests
import google.generativeai as genai
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Configure Gemini API
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    logger.warning("GEMINI_API_KEY environment variable not set. Gemini Service will not work.")

# Ensure we use an appropriate model
MODEL_NAME = "gemini-2.5-flash"  # Flash is fast and multimodal

class GeminiOCRResult(BaseModel):
    app: Optional[str] = Field(None, description="The name of the delivery app, e.g., iFood, Rappi, Uber Eats, Mercado Livre, etc.")
    driver_name: Optional[str] = Field(None, description="The name of the driver or delivery person.")
    plate: Optional[str] = Field(None, description="The license plate of the vehicle, if visible.")
    vehicle_type: Optional[str] = Field(None, description="The type of vehicle: 'carro', 'moto', 'bicicleta', etc.")
    is_delivery_screen: bool = Field(False, description="True if the image looks like a delivery tracking or matching screen.")

def process_delivery_screenshot(image_url: str) -> Optional[Dict[str, Any]]:
    """
    Downloads the image from the URL and sends it to Gemini for OCR and information extraction.
    Returns a dictionary matching GeminiOCRResult or None if failed.
    """
    if not API_KEY:
        logger.warning("GEMINI_API_KEY is missing. Returning a MOCKED Gemini result for testing!")
        return {
            "app": "iFood",
            "driver_name": "João Silva Mockado",
            "plate": "ABC-1234",
            "vehicle_type": "moto",
            "is_delivery_screen": True
        }

    try:
        # 1. Download the image
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        
        image_bytes = response.content
        
        # We can pass a dict to Gemini indicating the mime_type and data
        mime_type = response.headers.get('content-type', 'image/jpeg')
        if not mime_type.startswith('image/'):
            mime_type = 'image/jpeg' # fallback

        # 2. Call Gemini
        # We use strict JSON schema for robust extraction
        model = genai.GenerativeModel(MODEL_NAME)
        
        prompt = (
            "You are an assistant for a condominium concierge. The user has sent a screenshot of their "
            "delivery app (like iFood, Rappi, etc.). Please analyze the image to identify if it is a delivery "
            "screen, the app name, the driver's name, the vehicle's license plate (if any), and the vehicle type."
        )

        # Using generation_config for structured JSON output
        result = model.generate_content(
            [
                prompt,
                {
                    "mime_type": mime_type,
                    "data": image_bytes
                }
            ],
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=GeminiOCRResult,
                temperature=0.0,
            )
        )
        
        if result.text:
            import json
            return json.loads(result.text)

        return None

    except Exception as e:
        logger.error(f"Error processing delivery screenshot via Gemini: {e}")
        return None
