# BigQuery Radar 📡

BigQuery Radar is a modern release logs aggregator and social sharing dashboard built using a **Python Flask** backend and an interactive single-page **Vanilla HTML, CSS, and JS** frontend.

It fetches release updates from the official Google Cloud BigQuery feed, organizes them by dates and categories, allows instant keyword searches/filtering, and provides a smart social sharing console to tweet about specific updates.

---

## ✨ Features

*   **Atom Feed Extraction**: Fetches and parses the official BigQuery release notes XML feed in real-time.
*   **Smart Feed Cache**: Implements local caching to speed up loads and serve notes instantly. If the Google Cloud feed is down, the server falls back to cached logs and alerts the user.
*   **Client-Side HTML Parsing**: Employs browser-native `DOMParser` to split large, multi-topic entries into individual, categorized timeline cards.
*   **Category Badging**: Automatically classifies release updates (`Feature`, `Announcement`, `Breaking`, `Change`, `Issue`) using custom-themed color schemes.
*   **Search & Filter Engine**: Instantly filter updates by clicking category chips or typing search queries (e.g., `Gemini`, `UDF`, `partition`).
*   **Interactive Tweet Composer & X Simulator**:
    *   Clicking any card loads the note directly into the tweet builder.
    *   **Auto Truncation**: Intelligently trims text to fit within Twitter's 280-character limit while appending the source URL.
    *   **SVG Tracker Dial**: Displays a color-coded circular countdown representing remaining space.
    *   **Quick Hashtags**: Toggle tags like `#BigQuery`, `#GoogleCloud`, and `#DataEngineering` on/off.
    *   **Real-time Mockup**: Renders a simulated preview of how the tweet will look on X.
*   **Premium Design**: Features a sleek slate dark-mode theme, glassmorphic cards, loading shimmer skeletons, and smooth hover micro-animations.

---

## 📁 Project Structure

```
bq-release-notes/
│
├── app.py                  # Flask application (routing, feed fetching, XML parsing, and caching)
├── .gitignore              # Local development ignore configurations
├── templates/
│   └── index.html          # Main HTML structure of the app
├── Documents/
│   └── requirements.txt    # Python dependencies
└── static/
    ├── css/
    │   └── style.css       # Custom stylesheet (Glassmorphism design system & layouts)
    └── js/
        └── app.js          # App logic (DOM parser, searching, category filters, and tweet helper)
```

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.8 or higher
*   Git (optional, for version control)

### 1. Setup Environment
First, clone the repository or navigate to the project directory:
```bash
cd bq-release-notes
```

Initialize a python virtual environment:
```bash
# Windows
python -m venv venv

# macOS/Linux
python3 -m venv venv
```

### 2. Install Dependencies
Install Flask from the requirements file:
```bash
# Windows
venv\Scripts\pip install -r Documents/requirements.txt

# macOS/Linux
source venv/bin/activate
pip install -r Documents/requirements.txt
```

### 3. Run the App
Launch the Flask server:
```bash
# Windows
venv\Scripts\python app.py

# macOS/Linux
python app.py
```

Open your browser and navigate to **`http://127.0.0.1:5000`**.

---

## 🛠️ Technology Stack
*   **Backend**: Python, Flask, `xml.etree.ElementTree` (Built-in XML parsing)
*   **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Backdrop-Filter, keyframe animations), Vanilla JavaScript (Web APIs, DOMParser, SVG manipulation)
*   **Icons**: Lucide Icons CDN
*   **Fonts**: Google Fonts (Outfit, JetBrains Mono)
