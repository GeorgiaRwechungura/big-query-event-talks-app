document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allReleaseItems = [];
    let filteredReleaseItems = [];
    let selectedItem = null;
    let selectedHashtags = new Set();
    
    // DOM Elements
    const refreshBtn = document.getElementById('refreshBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sunIcon = document.querySelector('.icon-theme-sun');
    const moonIcon = document.querySelector('.icon-theme-moon');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const categoryChips = document.querySelectorAll('.filter-chip');
    const releaseTimeline = document.getElementById('releaseTimeline');
    const feedLoading = document.getElementById('feedLoading');
    const feedEmpty = document.getElementById('feedEmpty');
    const notificationContainer = document.getElementById('notificationContainer');
    
    // Composer Elements
    const composerEmpty = document.getElementById('composerEmpty');
    const composerBody = document.getElementById('composerBody');
    const tweetContent = document.getElementById('tweetContent');
    const charCount = document.getElementById('charCount');
    const charProgressCircle = document.getElementById('charProgressCircle');
    const hashtagContainer = document.getElementById('hashtagContainer');
    const previewTweetContent = document.getElementById('previewTweetContent');
    const tweetBtn = document.getElementById('tweetBtn');
    
    // Constants
    const TWEET_LIMIT = 280;
    
    // Initialize Circular Progress Ring
    const radius = charProgressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    charProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    charProgressCircle.style.strokeDashoffset = `${circumference}`;
    
    // Fetch and Load Release Notes
    async function loadReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        updateStatus('pulse amber', forceRefresh ? 'Refreshing feed...' : 'Fetching release notes...');
        
        try {
            const url = `/api/release-notes?refresh=${forceRefresh}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                allReleaseItems = parseReleaseEntries(result.data);
                filteredReleaseItems = [...allReleaseItems];
                
                renderTimeline();
                
                // Show notification success
                const isCached = result.message.toLowerCase().includes('cache');
                showToast(result.message, isCached ? 'info' : 'success');
                updateStatus('green', isCached ? 'Loaded from cache' : 'Feed up-to-date');
            } else {
                throw new Error(result.message || 'Failed to retrieve notes');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast(error.message || 'Error communicating with server', 'error');
            updateStatus('pulse red', 'Update failed');
            
            if (allReleaseItems.length === 0) {
                feedEmpty.style.display = 'flex';
            }
        } finally {
            setLoadingState(false);
            lucide.createIcons(); // Re-render Lucide icons for new DOM elements
        }
    }
    
    // Parse the Atom feed structure on client side
    function parseReleaseEntries(entries) {
        const parsedItems = [];
        const domParser = new DOMParser();
        
        entries.forEach(entry => {
            const dateStr = entry.date;
            const updated = entry.updated;
            const entryLink = entry.link;
            
            // Standardize entry content HTML string
            const htmlContent = entry.content || '';
            const doc = domParser.parseFromString(htmlContent, 'text/html');
            
            let currentCategory = 'General';
            let currentNodes = [];
            
            const pushItem = () => {
                if (currentNodes.length > 0) {
                    const container = document.createElement('div');
                    currentNodes.forEach(node => container.appendChild(node.cloneNode(true)));
                    
                    const itemHtml = container.innerHTML.trim();
                    const itemText = getCleanPlainText(container);
                    
                    if (itemHtml) {
                        parsedItems.push({
                            id: `item-${Math.random().toString(36).substr(2, 9)}`,
                            date: dateStr,
                            updated: updated,
                            category: currentCategory,
                            contentHtml: itemHtml,
                            contentText: itemText,
                            link: entryLink
                        });
                    }
                }
            };
            
            // Loop through element nodes in content body
            Array.from(doc.body.childNodes).forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H3') {
                    // We found a header, push accumulated notes for the previous category
                    pushItem();
                    currentCategory = node.textContent.trim();
                    currentNodes = [];
                } else {
                    currentNodes.push(node);
                }
            });
            
            // Push remaining nodes for final category in this entry
            pushItem();
        });
        
        // If parsedItems is empty but feed had entries, push entries as-is
        if (parsedItems.length === 0 && entries.length > 0) {
            entries.forEach(entry => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = entry.content || '';
                parsedItems.push({
                    id: `item-${Math.random().toString(36).substr(2, 9)}`,
                    date: entry.date,
                    updated: entry.updated,
                    category: 'General',
                    contentHtml: entry.content,
                    contentText: getCleanPlainText(tempDiv),
                    link: entry.link
                });
            });
        }
        
        return parsedItems;
    }
    
    // Custom HTML parser for clean plaintext tweets
    function getCleanPlainText(container) {
        const clone = container.cloneNode(true);
        
        // Resolve anchor tags to text and links
        const links = clone.querySelectorAll('a');
        links.forEach(a => {
            let href = a.getAttribute('href') || '';
            if (href && href.startsWith('/')) {
                href = 'https://cloud.google.com' + href;
            }
            if (href) {
                if (a.textContent.trim() === href.trim()) {
                    a.replaceWith(href);
                } else {
                    a.replaceWith(`${a.textContent} (${href})`);
                }
            }
        });
        
        // Structure list items
        const lists = clone.querySelectorAll('ul, ol');
        lists.forEach(list => {
            const items = list.querySelectorAll('li');
            const bulletText = Array.from(items)
                .map(li => `• ${li.textContent.trim()}`)
                .join('\n');
            list.replaceWith(document.createTextNode('\n' + bulletText + '\n'));
        });
        
        // Structure code snippets
        const codeTags = clone.querySelectorAll('code');
        codeTags.forEach(code => {
            code.replaceWith(`\`${code.textContent.trim()}\``);
        });
        
        let text = clone.textContent || clone.innerText || '';
        // Clean up multi-newline spacings
        text = text.replace(/\n\s*\n/g, '\n\n').trim();
        return text;
    }

    // Render timeline grouped by Date
    function renderTimeline() {
        releaseTimeline.innerHTML = '';
        
        if (filteredReleaseItems.length === 0) {
            feedEmpty.style.display = 'flex';
            return;
        }
        
        feedEmpty.style.display = 'none';
        
        // Group items by date
        const groups = {};
        filteredReleaseItems.forEach(item => {
            if (!groups[item.date]) {
                groups[item.date] = [];
            }
            groups[item.date].push(item);
        });
        
        // Render groups sequentially
        Object.keys(groups).forEach(date => {
            const groupEl = document.createElement('div');
            groupEl.className = 'timeline-group';
            
            groupEl.innerHTML = `
                <div class="timeline-date-marker">
                    <div class="marker-dot"></div>
                </div>
                <h3 class="timeline-date-title">${date}</h3>
                <div class="timeline-items"></div>
            `;
            
            const itemsContainer = groupEl.querySelector('.timeline-items');
            
            groups[date].forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = `timeline-item-card card ${selectedItem && selectedItem.id === item.id ? 'selected' : ''}`;
                itemEl.dataset.id = item.id;
                
                const catLower = item.category.toLowerCase();
                let badgeClass = 'general';
                if (['feature', 'announcement', 'breaking', 'change', 'issue'].includes(catLower)) {
                    badgeClass = catLower;
                }
                
                itemEl.innerHTML = `
                    <div class="item-header">
                        <div class="badge-and-meta">
                            <span class="category-badge ${badgeClass}">${item.category}</span>
                        </div>
                        <div class="item-actions" style="display: flex; gap: 0.35rem;">
                            <button class="btn-card-action btn-copy-note" title="Copy update text" data-id="${item.id}">
                                <i data-lucide="copy" style="width:0.95rem; height:0.95rem;"></i>
                            </button>
                            <button class="btn-card-action btn-select-note" title="Select to Tweet">
                                <i data-lucide="twitter" style="width:0.95rem; height:0.95rem;"></i>
                            </button>
                        </div>
                    </div>
                    <div class="item-description">${item.contentHtml}</div>
                `;
                
                // Copy Update Clipboard Action
                const copyBtn = itemEl.querySelector('.btn-copy-note');
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card selection selection trigger
                    navigator.clipboard.writeText(item.contentText)
                        .then(() => {
                            showToast('Copied update to clipboard!', 'success');
                            const icon = copyBtn.querySelector('i');
                            icon.setAttribute('data-lucide', 'check');
                            lucide.createIcons();
                            setTimeout(() => {
                                icon.setAttribute('data-lucide', 'copy');
                                lucide.createIcons();
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Copy failed:', err);
                            showToast('Failed to copy to clipboard', 'error');
                        });
                });
                
                // Clicking anywhere on card selects it
                itemEl.addEventListener('click', (e) => {
                    selectReleaseItem(item);
                });
                
                itemsContainer.appendChild(itemEl);
            });
            
            releaseTimeline.appendChild(groupEl);
        });
        
        lucide.createIcons();
    }
    
    // Select Release Note item
    function selectReleaseItem(item) {
        selectedItem = item;
        
        // Toggle selected styling in timeline lists
        document.querySelectorAll('.timeline-item-card').forEach(card => {
            if (card.dataset.id === item.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Show composer layout
        composerEmpty.style.display = 'none';
        composerBody.style.display = 'flex';
        
        // Default hashtags logic: initialize standard tags
        selectedHashtags = new Set(['#BigQuery', '#GoogleCloud']);
        updateHashtagChips();
        
        // Draft Tweet text content intelligently
        draftTweetText();
        
        // Smooth scroll to composer if viewport is mobile/single-column
        if (window.innerWidth <= 1024) {
            composerBody.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // Generate intelligent tweet content with smart truncation
    function draftTweetText() {
        if (!selectedItem) return;
        
        const categoryPrefix = `[BigQuery ${selectedItem.category}] `;
        const linkStr = `\n\nNotes: ${selectedItem.link}`;
        const hashtagsStr = selectedHashtags.size > 0 ? '\n' + Array.from(selectedHashtags).join(' ') : '';
        
        // Calculate remaining limit for text content
        const fixedLength = categoryPrefix.length + linkStr.length + hashtagsStr.length;
        const availableDescLength = TWEET_LIMIT - fixedLength;
        
        let descText = selectedItem.contentText;
        
        // If content is larger than available space, truncate with ellipses
        if (descText.length > availableDescLength) {
            descText = descText.substring(0, availableDescLength - 3) + '...';
        }
        
        // Assemble Tweet Content
        const tweetText = `${categoryPrefix}${descText}${linkStr}${hashtagsStr}`;
        tweetContent.value = tweetText;
        
        updateCharacterTracker(tweetText.length);
        updateTweetPreview(tweetText);
    }
    
    // Handle manual textarea modifications
    tweetContent.addEventListener('input', () => {
        const content = tweetContent.value;
        updateCharacterTracker(content.length);
        updateTweetPreview(content);
    });
    
    // Update visual character tracker
    function updateCharacterTracker(len) {
        const remaining = TWEET_LIMIT - len;
        charCount.textContent = remaining;
        
        if (remaining < 0) {
            charCount.style.color = '#ef4444'; // Red for overflow
        } else if (remaining <= 40) {
            charCount.style.color = '#eab308'; // Amber for warning
        } else {
            charCount.style.color = 'var(--text-secondary)';
        }
        
        // Update SVG Progress Circle
        const percent = Math.min(100, (len / TWEET_LIMIT) * 100);
        const offset = circumference - (percent / 100) * circumference;
        charProgressCircle.style.strokeDashoffset = offset;
        
        // Update Circle colors based on state
        if (len > TWEET_LIMIT) {
            charProgressCircle.style.stroke = '#ef4444';
        } else if (remaining <= 40) {
            charProgressCircle.style.stroke = '#eab308';
        } else {
            charProgressCircle.style.stroke = '#3b82f6';
        }
    }
    
    // Update live simulated Tweet element
    function updateTweetPreview(text) {
        // Format links in preview dynamically to look authentic
        let previewHtml = text
            .replace(/(https?:\/\/[^\s]+)/g, '<span style="color: var(--accent-twitter); hover: underline;">$1</span>')
            .replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: var(--accent-twitter);">$1</span>');
            
        previewTweetContent.innerHTML = previewHtml || '<i>Draft content will show here...</i>';
    }
    
    // Manage Quick Hashtag toggles
    hashtagContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.hashtag-tag');
        if (!button) return;
        
        const tag = button.dataset.tag;
        
        if (selectedHashtags.has(tag)) {
            selectedHashtags.delete(tag);
            button.classList.remove('active');
        } else {
            selectedHashtags.add(tag);
            button.classList.add('active');
        }
        
        // Re-draft Tweet text layout with toggled tags
        draftTweetText();
    });
    
    function updateHashtagChips() {
        hashtagContainer.querySelectorAll('.hashtag-tag').forEach(chip => {
            const tag = chip.dataset.tag;
            if (selectedHashtags.has(tag)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }
    
    // Handle Search Bar logic
    searchInput.addEventListener('input', () => {
        filterTimeline();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterTimeline();
    });
    
    // Handle Category Chips filters
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            categoryChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            filterTimeline();
        });
    });
    
    // Filter release notes array based on selected state
    function filterTimeline() {
        const query = searchInput.value.toLowerCase().trim();
        const activeChip = document.querySelector('.filter-chip.active');
        const categoryFilter = activeChip ? activeChip.dataset.category : 'all';
        
        // Manage Clear Search button state visibility
        clearSearchBtn.style.display = query ? 'block' : 'none';
        
        filteredReleaseItems = allReleaseItems.filter(item => {
            // Category check
            const matchesCategory = (categoryFilter === 'all' || item.category === categoryFilter);
            
            // Search text check
            const matchesSearch = !query || 
                item.category.toLowerCase().includes(query) || 
                item.date.toLowerCase().includes(query) || 
                item.contentText.toLowerCase().includes(query);
                
            return matchesCategory && matchesSearch;
        });
        
        renderTimeline();
    }
    
    // Trigger Twitter Web Intent Share action
    tweetBtn.addEventListener('click', () => {
        const text = tweetContent.value;
        if (!text) return;
        
        // Show validation warning for exceeding character count
        if (text.length > TWEET_LIMIT) {
            showToast(`Tweet exceeds limit by ${text.length - TWEET_LIMIT} characters!`, 'error');
            return;
        }
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        showToast('Opened Tweet intent in a new window!', 'success');
    });
    
    // Export currently filtered release items to CSV
    function exportToCsv() {
        if (filteredReleaseItems.length === 0) {
            showToast('No items to export', 'error');
            return;
        }
        
        // CSV Columns
        const headers = ['Date', 'Category', 'Update Link', 'Description (Plaintext)'];
        
        // Escape helper for CSV cells
        const escapeCsvValue = (val) => {
            if (val === null || val === undefined) return '';
            const stringVal = String(val);
            if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('\r')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        };
        
        // Format rows
        const rows = filteredReleaseItems.map(item => [
            item.date,
            item.category,
            item.link,
            item.contentText
        ]);
        
        // Construct CSV content (inject Unicode BOM for Excel compatibility)
        const csvContent = [
            headers.map(escapeCsvValue).join(','),
            ...rows.map(row => row.map(escapeCsvValue).join(','))
        ].join('\n');
        
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename based on filters and date
        const dateStr = new Date().toISOString().split('T')[0];
        const activeChip = document.querySelector('.filter-chip.active');
        const categoryFilter = activeChip ? activeChip.dataset.category : 'all';
        const filename = `bigquery_release_notes_${categoryFilter}_${dateStr}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${filteredReleaseItems.length} items to CSV!`, 'success');
    }

    // Export CSV Button click trigger
    exportCsvBtn.addEventListener('click', () => {
        exportToCsv();
    });

    // Refresh Button click trigger
    refreshBtn.addEventListener('click', () => {
        if (refreshBtn.classList.contains('loading')) return;
        loadReleaseNotes(true);
    });
    
    // Setup and trigger Toast helper
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';
        
        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <div class="toast-message">${message}</div>
            <button class="toast-close"><i data-lucide="x"></i></button>
        `;
        
        notificationContainer.appendChild(toast);
        lucide.createIcons(); // Instantly create Lucide icons inside Toast
        
        // Handle manual close click
        toast.querySelector('.toast-close').addEventListener('click', () => {
            dismissToast(toast);
        });
        
        // Autohide toast after 5 seconds
        setTimeout(() => {
            dismissToast(toast);
        }, 5000);
    }
    
    function dismissToast(toast) {
        if (toast.classList.contains('fade-out')) return;
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }
    
    // Loading State visual modifiers
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            feedLoading.style.display = 'block';
            releaseTimeline.style.display = 'none';
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
            feedLoading.style.display = 'none';
            releaseTimeline.style.display = 'block';
        }
    }
    
    // Update Header Status elements
    function updateStatus(dotClasses, text) {
        statusDot.className = `status-dot ${dotClasses}`;
        statusText.textContent = text;
    }
    
    // Theme Toggle Handler
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        
        if (isLight) {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            localStorage.setItem('theme', 'light');
            showToast('Switched to Light theme', 'info');
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            localStorage.setItem('theme', 'dark');
            showToast('Switched to Dark theme', 'info');
        }
    });

    // Initialize Saved Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        document.body.classList.remove('light-mode');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
    
    // Load notes on initialization
    loadReleaseNotes();
});
