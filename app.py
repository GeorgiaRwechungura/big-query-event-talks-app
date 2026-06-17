from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import json
import os

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "release_notes_cache.json"

def fetch_and_parse_feed():
    try:
        # Create request with a User-Agent to avoid potential blocking
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        # Parse XML
        root = ET.fromstring(xml_data)
        
        # Atom Namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_el in root.findall('atom:entry', ns):
            title = entry_el.find('atom:title', ns)
            updated = entry_el.find('atom:updated', ns)
            link_el = entry_el.find('atom:link', ns)
            content_el = entry_el.find('atom:content', ns)
            id_el = entry_el.find('atom:id', ns)
            
            # Extract attributes and text
            entry_id = id_el.text if id_el is not None else ""
            date_str = title.text if title is not None else ""
            updated_str = updated.text if updated is not None else ""
            link = link_el.attrib.get('href', '') if link_el is not None else ""
            content = content_el.text if content_el is not None else ""
            
            entries.append({
                'id': entry_id,
                'date': date_str,
                'updated': updated_str,
                'link': link,
                'content': content
            })
            
        # Update Cache File
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
            
        return entries, None
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Try loading from cache if error occurs
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
                return entries, f"Could not fetch live feed. Loaded cached notes from last successful update. (Error: {str(e)})"
            except Exception as cache_err:
                return [], f"Failed to fetch feed and cache read failed: {str(cache_err)}"
        return [], f"Failed to fetch feed: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    # If the user passes 'refresh=true', we fetch live, else try reading cache first
    refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if not refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                entries = json.load(f)
            return jsonify({
                'success': True,
                'data': entries,
                'message': 'Loaded from cache'
            })
        except Exception as e:
            # Fall back to live fetch if cache reading fails
            pass
            
    # Fetch live
    entries, error_message = fetch_and_parse_feed()
    if error_message and not entries:
        return jsonify({
            'success': False,
            'message': error_message,
            'data': []
        }), 500
        
    return jsonify({
        'success': True,
        'data': entries,
        'message': error_message or 'Successfully fetched latest notes'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
