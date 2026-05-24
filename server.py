import os
import subprocess
import cv2
import numpy as np
import json
import requests
import threading
import time

from datetime import datetime, timedelta

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_file,
    send_from_directory
)

from fpdf import FPDF
from PIL import Image, ImageEnhance
from pdf2image import convert_from_path

app = Flask(__name__)

# =========================================
# PATHS
# =========================================

FFMPEG_PATH = "ffmpeg"

USERS_FILE = "users.json"
SUBS_FILE = "subscriptions.json"

FREE_LIMIT = 2

GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7m2A27yaTih-e1HigrRW2pKh7UMVwXyswCThLQRXOGMkCAaPj4le6gEazJDknXKDC/exec"

# =========================================
# CREATE FOLDERS
# =========================================

os.makedirs("uploads", exist_ok=True)
os.makedirs("frames", exist_ok=True)
os.makedirs("output", exist_ok=True)

# =========================================
# JSON HELPERS
# =========================================

def load_data(file):

    if not os.path.exists(file):
        return {}

    try:

        with open(file, "r") as f:
            return json.load(f)

    except:
        return {}


def save_data(file, data):

    with open(file, "w") as f:
        json.dump(data, f, indent=4)

# =========================================
# USER SECURITY
# =========================================

def get_user_key(request):

    user_id = request.headers.get(
        "user-id",
        "free_user"
    )

    user_ip = request.remote_addr

    return user_id + "_" + user_ip

# =========================================
# GOOGLE SHEET UPDATE
# =========================================

def update_google_sheet_status(user_id, status):

    try:

        requests.post(
            GOOGLE_SCRIPT_URL,
            json={
                "action": "update_status",
                "user_id": user_id,
                "status": status
            },
            timeout=10
        )

    except:
        pass

# =========================================
# PREMIUM CHECK
# =========================================

def is_paid(user_id):

    try:

        res = requests.get(

            GOOGLE_SCRIPT_URL,

            params={
                "user_id": user_id
            },

            timeout=10

        )

        data = res.json()

        return data.get(
            "approved",
            False
        )

    except Exception as e:

        print("Premium check error:", e)

        return False

# =========================================
# FREE LIMIT SYSTEM
# =========================================

def check_limit(user_id):

    users = load_data(USERS_FILE)

    if user_id not in users:

        users[user_id] = {
            "count": 0,
            "date": str(datetime.now())
        }

    user = users[user_id]

    last = datetime.strptime(
        user["date"],
        "%Y-%m-%d %H:%M:%S.%f"
    )

    # RESET AFTER 7 DAYS
    if datetime.now() - last > timedelta(days=7):

        user["count"] = 0

        user["date"] = str(datetime.now())

    # LIMIT REACHED
    if user["count"] >= FREE_LIMIT:

        return False

    # INCREASE COUNT
    user["count"] += 1

    save_data(USERS_FILE, users)

    return True

# =========================================
# CLEAN FRAMES
# =========================================

def clean_frames():

    if not os.path.exists("frames"):
        return

    for f in os.listdir("frames"):

        path = os.path.join("frames", f)

        try:

            if os.path.isfile(path):

                os.remove(path)

        except:
            pass

# =========================================
# AUTO CLEANUP
# =========================================

def cleanup_files():

    try:

        # WAIT FOR DOWNLOAD COMPLETE
        time.sleep(20)

        # ==============================
        # DELETE VIDEOS
        # ==============================

        uploads_folder = "uploads"

        if os.path.exists(uploads_folder):

            for f in os.listdir(uploads_folder):

                path = os.path.join(
                    uploads_folder,
                    f
                )

                try:

                    if os.path.isfile(path):

                        os.remove(path)

                        print("Deleted video:", path)

                except Exception as e:

                    print("Video delete error:", e)

        # ==============================
        # DELETE FRAMES
        # ==============================

        frames_folder = "frames"

        if os.path.exists(frames_folder):

            for f in os.listdir(frames_folder):

                path = os.path.join(
                    frames_folder,
                    f
                )

                try:

                    if os.path.isfile(path):

                        os.remove(path)

                        print("Deleted frame:", path)

                except Exception as e:

                    print("Frame delete error:", e)

        # ==============================
        # DELETE PDF
        # ==============================

        pdf_path = os.path.join(
            "output",
            "slides.pdf"
        )

        try:

            if os.path.exists(pdf_path):

                os.remove(pdf_path)

                print("Deleted PDF")

        except Exception as e:

            print("PDF delete error:", e)

    except Exception as e:

        print("Cleanup error:", e)

# =========================================
# EXTRACT FRAMES
# =========================================

def extract_frames(video_path):

    clean_frames()

    output_pattern = os.path.join(
        "frames",
        "slide_%03d.jpg"
    )

    command = [
        FFMPEG_PATH,
        "-y",
        "-i", video_path,

        # EXTRACT 1 FRAME PER SECOND
        "-vf", "fps=1,scale=1280:-1",

        "-q:v", "2",

        output_pattern
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True
    )

    print(result.stderr)

    if result.returncode != 0:

        raise Exception(result.stderr)

    frames = sorted(os.listdir("frames"))

    if len(frames) == 0:

        raise Exception("No frames extracted")

    return frames

# =========================================
# BLANK IMAGE DETECTION
# =========================================

def is_blank(image):

    gray = image.convert("L")

    np_img = np.array(gray)

    non_white = np.sum(np_img < 240)

    return non_white < 8000

# =========================================
# SCAN EFFECT
# =========================================

def scan_effect(image):

    img = np.array(image)

    gray = cv2.cvtColor(
        img,
        cv2.COLOR_BGR2GRAY
    )

    blur = cv2.GaussianBlur(
        gray,
        (7,7),
        0
    )

    edges = cv2.Canny(
        blur,
        50,
        150
    )

    contours, _ = cv2.findContours(
        edges,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return image

    c = max(contours, key=cv2.contourArea)

    peri = cv2.arcLength(c, True)

    approx = cv2.approxPolyDP(
        c,
        0.02 * peri,
        True
    )

    if len(approx) != 4:
        return image

    pts = approx.reshape(4,2)

    rect = np.zeros((4,2), dtype="float32")

    s = pts.sum(axis=1)

    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)

    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    (tl, tr, br, bl) = rect

    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)

    maxWidth = int(max(widthA, widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)

    maxHeight = int(max(heightA, heightB))

    dst = np.array([
        [0,0],
        [maxWidth-1,0],
        [maxWidth-1,maxHeight-1],
        [0,maxHeight-1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(
        rect,
        dst
    )

    warped = cv2.warpPerspective(
        img,
        M,
        (maxWidth, maxHeight)
    )

    return Image.fromarray(warped)

# =========================================
# LOAD LETTERHEAD
# =========================================

def load_letterhead():

    pages = convert_from_path(
        "App letterhead.pdf",
        dpi=300
    )

    return pages[0].convert("RGB")

# =========================================
# CREATE PDF
# =========================================

def create_pdf(frames):

    pdf = FPDF(
        orientation="P",
        unit="mm",
        format="A4"
    )

    temp_files = []

    letterhead = load_letterhead()

    letterhead = letterhead.resize((2480, 3508))

    for i, name in enumerate(frames):

        path = os.path.join("frames", name)

        if not os.path.exists(path):
            continue

        image = Image.open(path).convert("RGB")

        if is_blank(image):
            continue

        # ENHANCE IMAGE
        image = ImageEnhance.Contrast(image).enhance(2.2)

        image = ImageEnhance.Sharpness(image).enhance(3.0)

        # KEEP ORIGINAL RATIO
        max_w = 2000
        max_h = 2500

        scale = min(
            max_w / image.width,
            max_h / image.height
        )

        new_w = int(image.width * scale)
        new_h = int(image.height * scale)

        image = image.resize(
            (new_w, new_h),
            Image.LANCZOS
        )

        canvas = letterhead.copy()

        x = (2480 - new_w) // 2

        y = 600

        canvas.paste(image, (x, y))

        temp = f"temp_{i}.jpg"

        canvas.save(
            temp,
            quality=100
        )

        temp_files.append(temp)

        pdf.add_page()

        pdf.image(
            temp,
            x=0,
            y=0,
            w=210,
            h=297
        )

    output = "output/slides.pdf"

    if os.path.exists(output):
        os.remove(output)

    pdf.output(output)

    # DELETE TEMP FILES
    for f in temp_files:

        try:
            os.remove(f)
        except:
            pass

# =========================================
# ROUTES
# =========================================

@app.route("/")
def home():

    return render_template("index.html")

@app.route("/premium")
def premium():

    return render_template("premium.html")

@app.route("/frames/<filename>")
def serve_frame(filename):

    return send_from_directory(
        "frames",
        filename
    )

# =========================================
# VIDEO UPLOAD
# =========================================

@app.route("/upload", methods=["POST"])
def upload():

    try:

        if "video" not in request.files:

            return jsonify({
                "error": "No file selected"
            }), 400

        file = request.files["video"]

        # FILE SIZE LIMIT
        file.seek(0, os.SEEK_END)

        size = file.tell()

        file.seek(0)

        if size > 50 * 1024 * 1024:

            return jsonify({
                "error": "Max file size is 50MB"
            }), 400

        video_path = os.path.join(
            "uploads",
            "video.mp4"
        )

        file.save(video_path)

        frames = extract_frames(video_path)

        return jsonify({
            "slides": frames
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

# =========================================
# GENERATE PDF
# =========================================

@app.route("/generate_pdf", methods=["POST"])
def generate_pdf():

    try:

        user_key = get_user_key(request)

        # FREE LIMIT
        if not is_paid(user_key):

            if not check_limit(user_key):

                return jsonify({
                    "error": "Free limit (2 videos/week) reached. Upgrade to Premium."
                }), 403

        data = request.get_json()

        slides = data.get("slides", [])

        if not slides:

            return jsonify({
                "error": "No slides selected"
            }), 400

        create_pdf(slides)

        return jsonify({
            "pdf": "/download"
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================
# SUBSCRIBE
# =========================================

@app.route("/subscribe", methods=["POST"])
def subscribe():

    try:

        data = request.get_json()

        name = data.get("name")

        email = data.get("email")

        transaction_id = data.get("transaction_id")

        if not name or not email or not transaction_id:

            return jsonify({
                "error": "All fields required"
            }), 400

        user_key = get_user_key(request)

        subs = load_data(SUBS_FILE)

        subs[user_key] = {

            "name": name,

            "email": email,

            "transaction_id": transaction_id,

            "approved": False,

            "date": str(datetime.now())

        }

        save_data(SUBS_FILE, subs)

        # SEND TO GOOGLE SHEET
        requests.post(

            GOOGLE_SCRIPT_URL,

            json={

                "name": name,

                "email": email,

                "transaction_id": transaction_id,

                "user_id": user_key

            },

            timeout=10

        )

        return jsonify({

            "msg":
            "Payment submitted successfully. Wait for approval."

        })

    except Exception as e:

        return jsonify({

            "error": str(e)

        }), 500

# =========================================
# DOWNLOAD PDF
# =========================================

@app.route("/download")
def download():

    pdf_path = os.path.join(
        "output",
        "slides.pdf"
    )

    if not os.path.exists(pdf_path):

        return jsonify({
            "error": "PDF not found"
        }), 404

    # START CLEANUP THREAD
    cleanup_thread = threading.Thread(
        target=cleanup_files
    )

    cleanup_thread.daemon = True

    cleanup_thread.start()

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name="slides.pdf"
    )

# =========================================
# START SERVER
# =========================================

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port
    )