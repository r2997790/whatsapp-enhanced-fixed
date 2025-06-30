const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const multer = require('multer');
const csv = require('csv-parser');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WhatsApp client setup
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './data'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// App state
let appState = {
    qrCode: null,
    isReady: false,
    isAuthenticated: false,
    status: 'Initializing...',
    messagesSent: 0
};

// In-memory storage for contacts and templates
let contacts = [
    { id: '1', name: 'John Doe', phone: '+1234567890', email: 'john@example.com', company: 'Acme Corp', tags: 'client' },
    { id: '2', name: 'Jane Smith', phone: '+0987654321', email: 'jane@company.com', company: 'Tech Inc', tags: 'prospect' }
];

let templates = [
    { id: '1', name: 'Welcome Message', content: 'Hello {name}! Welcome to our service. We\'re excited to work with {company}!' },
    { id: '2', name: 'Follow Up', content: 'Hi {name}, just following up on our previous conversation. Please let me know if you have any questions!' },
    { id: '3', name: 'Promotion', content: 'Special offer for {company}! Get 20% off our premium services. Contact us at your convenience.' }
];

// Load contacts and templates from files
function loadData() {
    try {
        if (fs.existsSync('data/contacts.json')) {
            contacts = JSON.parse(fs.readFileSync('data/contacts.json', 'utf8'));
        }
        if (fs.existsSync('data/templates.json')) {
            templates = JSON.parse(fs.readFileSync('data/templates.json', 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Save contacts and templates to files
function saveContacts() {
    try {
        fs.writeFileSync('data/contacts.json', JSON.stringify(contacts, null, 2));
    } catch (error) {
        console.error('Error saving contacts:', error);
    }
}

function saveTemplates() {
    try {
        fs.writeFileSync('data/templates.json', JSON.stringify(templates, null, 2));
    } catch (error) {
        console.error('Error saving templates:', error);
    }
}

// WhatsApp client events
client.on('qr', async (qr) => {
    console.log('QR Code received');
    try {
        appState.qrCode = await qrcode.toDataURL(qr);
        appState.status = 'Scan QR Code';
        console.log('QR Code generated successfully');
    } catch (error) {
        console.error('Error generating QR code:', error);
    }
});

client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
    appState.isAuthenticated = true;
    appState.status = 'Authenticated';
});

client.on('ready', () => {
    console.log('WhatsApp client is ready');
    appState.isReady = true;
    appState.status = 'Ready to send messages';
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected:', reason);
    appState.isReady = false;
    appState.isAuthenticated = false;
    appState.status = 'Disconnected';
});

// Initialize WhatsApp client and load data
client.initialize();
loadData();

// Utility function to replace variables in message
function replaceVariables(message, contact) {
    return message
        .replace(/{name}/g, contact.name || '')
        .replace(/{phone}/g, contact.phone || '')
        .replace(/{email}/g, contact.email || '')
        .replace(/{company}/g, contact.company || '');
}

// Routes
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Enhanced v3 - Complete</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 800px;
            width: 100%;
            text-align: center;
        }
        .logo {
            font-size: 2.5rem;
            color: #25D366;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1rem;
        }
        .status-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 4px solid #25D366;
        }
        .status {
            font-size: 1.2rem;
            color: #333;
            margin-bottom: 10px;
        }
        .qr-container {
            margin: 20px 0;
        }
        .qr-code {
            max-width: 300px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .feature-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 15px;
            transition: transform 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
        }
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        .feature-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
        }
        .feature-desc {
            color: #666;
            font-size: 0.9rem;
        }
        .btn {
            background: #25D366;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 25px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.3s ease;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
        }
        .btn:hover {
            background: #128C7E;
        }
        .refresh-btn {
            background: #007bff;
            margin-top: 20px;
        }
        .refresh-btn:hover {
            background: #0056b3;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #25D366;
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-number {
            font-size: 1.5rem;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📱 WhatsApp Enhanced v3</div>
        <div class="subtitle">Complete WhatsApp Messaging Platform</div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="contactCount">0</div>
                <div class="stat-label">Contacts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="templateCount">0</div>
                <div class="stat-label">Templates</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="messagesSent">0</div>
                <div class="stat-label">Messages Sent</div>
            </div>
        </div>
        
        <div class="status-card">
            <div class="status" id="status">Loading...</div>
            <div class="qr-container" id="qrContainer"></div>
        </div>
        
        <div class="features">
            <a href="/simple" class="feature-card">
                <div class="feature-icon">💬</div>
                <div class="feature-title">Simple Messaging</div>
                <div class="feature-desc">Send individual messages quickly</div>
            </a>
            
            <a href="/bulk" class="feature-card">
                <div class="feature-icon">📨</div>
                <div class="feature-title">Bulk Messaging</div>
                <div class="feature-desc">Send messages to multiple contacts</div>
            </a>
            
            <a href="/contacts" class="feature-card">
                <div class="feature-icon">👥</div>
                <div class="feature-title">Contact Manager</div>
                <div class="feature-desc">Manage your contact database</div>
            </a>
            
            <a href="/templates" class="feature-card">
                <div class="feature-icon">📝</div>
                <div class="feature-title">Message Templates</div>
                <div class="feature-desc">Create and manage templates</div>
            </a>
        </div>
        
        <button class="btn refresh-btn" onclick="refreshStatus()">🔄 Refresh Status</button>
    </div>
    
    <script>
        function updateStatus() {
            fetch('/api/status')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('status').textContent = data.status;
                    const qrContainer = document.getElementById('qrContainer');
                    
                    if (data.qrCode) {
                        qrContainer.innerHTML = '<img src="' + data.qrCode + '" alt="QR Code" class="qr-code">';
                    } else if (data.isReady) {
                        qrContainer.innerHTML = '<div style="color: #25D366; font-size: 2rem;">✓ Connected</div>';
                    } else {
                        qrContainer.innerHTML = '';
                    }
                })
                .catch(error => {
                    console.error('Error fetching status:', error);
                    document.getElementById('status').textContent = 'Error loading status';
                });
        }
        
        function updateStats() {
            fetch('/api/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('contactCount').textContent = data.contacts;
                    document.getElementById('templateCount').textContent = data.templates;
                    document.getElementById('messagesSent').textContent = data.messagesSent || 0;
                })
                .catch(error => console.error('Error fetching stats:', error));
        }
        
        function refreshStatus() {
            updateStatus();
            updateStats();
        }
        
        updateStatus();
        updateStats();
        setInterval(updateStatus, 5000);
        setInterval(updateStats, 10000);
    </script>
</body>
</html>`);
});

app.get('/simple', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Messaging - WhatsApp Enhanced</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 2rem;
            color: #25D366;
            margin-bottom: 10px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #25D366;
        }
        textarea {
            resize: vertical;
            min-height: 120px;
        }
        .btn {
            background: #25D366;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            width: 100%;
            transition: background 0.3s ease;
        }
        .btn:hover {
            background: #128C7E;
        }
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .back-btn {
            background: #6c757d;
            margin-bottom: 20px;
            width: auto;
            padding: 10px 20px;
        }
        .back-btn:hover {
            background: #545b62;
        }
        .template-btn {
            background: #007bff;
            width: auto;
            padding: 8px 16px;
            margin-left: 10px;
            font-size: 0.9rem;
        }
        .template-btn:hover {
            background: #0056b3;
        }
        .alert {
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: none;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .help-text {
            font-size: 0.9rem;
            color: #666;
            margin-top: 5px;
        }
        .template-selector {
            display: flex;
            align-items: flex-end;
            gap: 10px;
        }
        .template-selector > div {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="btn back-btn">← Back to Home</a>
        
        <div class="header">
            <div class="logo">💬 Simple Messaging</div>
        </div>
        
        <div id="alertContainer"></div>
        
        <form id="messageForm">
            <div class="form-group">
                <label for="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone" required placeholder="+1234567890">
                <div class="help-text">Include country code (e.g., +1 for US, +44 for UK)</div>
            </div>
            
            <div class="form-group">
                <div class="template-selector">
                    <div>
                        <label for="templateSelect">Use Template (Optional)</label>
                        <select id="templateSelect">
                            <option value="">Select a template...</option>
                        </select>
                    </div>
                    <button type="button" class="btn template-btn" onclick="loadTemplate()">Load</button>
                </div>
            </div>
            
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" required placeholder="Type your message here..."></textarea>
            </div>
            
            <button type="submit" class="btn" id="sendBtn">
                📤 Send Message
            </button>
        </form>
    </div>
    
    <script>
        function loadTemplates() {
            fetch('/api/templates')
                .then(response => response.json())
                .then(data => {
                    const select = document.getElementById('templateSelect');
                    select.innerHTML = '<option value="">Select a template...</option>';
                    data.forEach(template => {
                        const option = document.createElement('option');
                        option.value = template.id;
                        option.textContent = template.name;
                        select.appendChild(option);
                    });
                })
                .catch(error => console.error('Error loading templates:', error));
        }
        
        function loadTemplate() {
            const templateId = document.getElementById('templateSelect').value;
            if (!templateId) return;
            
            fetch('/api/templates/' + templateId)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('message').value = data.content;
                })
                .catch(error => console.error('Error loading template:', error));
        }
        
        function showAlert(message, type) {
            const alertContainer = document.getElementById('alertContainer');
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-' + type;
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';
            
            alertContainer.innerHTML = '';
            alertContainer.appendChild(alertDiv);
            
            setTimeout(() => {
                alertDiv.style.display = 'none';
            }, 5000);
        }
        
        document.getElementById('messageForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sendBtn = document.getElementById('sendBtn');
            const originalText = sendBtn.textContent;
            
            sendBtn.disabled = true;
            sendBtn.textContent = '📤 Sending...';
            
            const formData = new FormData(e.target);
            const data = {
                phone: formData.get('phone'),
                message: formData.get('message')
            };
            
            try {
                const response = await fetch('/api/send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('Message sent successfully!', 'success');
                    document.getElementById('messageForm').reset();
                } else {
                    showAlert('Error: ' + result.error, 'error');
                }
            } catch (error) {
                showAlert('Network error: ' + error.message, 'error');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = originalText;
            }
        });
        
        loadTemplates();
    </script>
</body>
</html>`);
});

// Include the full files for all remaining features
// This is a condensed version showing the structure

// API Routes
app.get('/api/status', (req, res) => {
    res.json(appState);
});

app.get('/api/stats', (req, res) => {
    res.json({
        contacts: contacts.length,
        templates: templates.length,
        messagesSent: appState.messagesSent
    });
});

app.get('/api/contacts', (req, res) => {
    res.json(contacts);
});

app.get('/api/templates', (req, res) => {
    res.json(templates);
});

app.get('/api/templates/:id', (req, res) => {
    const template = templates.find(t => t.id === req.params.id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
});

app.post('/api/send-message', [
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('message').isLength({ min: 1 }).withMessage('Message cannot be empty')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }

    if (!appState.isReady) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready. Please scan the QR code first.'
        });
    }

    try {
        const { phone, message } = req.body;
        
        // Format phone number for WhatsApp
        const formattedPhone = phone.replace(/[^\d]/g, '') + '@c.us';
        
        // Send message
        const sentMessage = await client.sendMessage(formattedPhone, message);
        
        appState.messagesSent++;
        
        res.json({
            success: true,
            messageId: sentMessage.id._serialized
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message: ' + error.message
        });
    }
});

// Contact management endpoints
app.post('/api/contacts', (req, res) => {
    const { name, phone, email, company, tags } = req.body;
    const newContact = {
        id: Date.now().toString(),
        name,
        phone,
        email,
        company,
        tags
    };
    contacts.push(newContact);
    saveContacts();
    res.json(newContact);
});

app.put('/api/contacts/:id', (req, res) => {
    const contactIndex = contacts.findIndex(c => c.id === req.params.id);
    if (contactIndex === -1) {
        return res.status(404).json({ error: 'Contact not found' });
    }
    
    contacts[contactIndex] = { ...contacts[contactIndex], ...req.body };
    saveContacts();
    res.json(contacts[contactIndex]);
});

app.delete('/api/contacts/:id', (req, res) => {
    contacts = contacts.filter(c => c.id !== req.params.id);
    saveContacts();
    res.json({ success: true });
});

// Template management endpoints
app.post('/api/templates', (req, res) => {
    const { name, content } = req.body;
    const newTemplate = {
        id: Date.now().toString(),
        name,
        content
    };
    templates.push(newTemplate);
    saveTemplates();
    res.json(newTemplate);
});

app.put('/api/templates/:id', (req, res) => {
    const templateIndex = templates.findIndex(t => t.id === req.params.id);
    if (templateIndex === -1) {
        return res.status(404).json({ error: 'Template not found' });
    }
    
    templates[templateIndex] = { ...templates[templateIndex], ...req.body };
    saveTemplates();
    res.json(templates[templateIndex]);
});

app.delete('/api/templates/:id', (req, res) => {
    templates = templates.filter(t => t.id !== req.params.id);
    saveTemplates();
    res.json({ success: true });
});

// Bulk messaging endpoint
app.post('/api/bulk-send', async (req, res) => {
    if (!appState.isReady) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready'
        });
    }

    const { contactIds, message, delay = 2 } = req.body;
    const selectedContacts = contacts.filter(c => contactIds.includes(c.id));
    
    if (selectedContacts.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'No valid contacts selected'
        });
    }

    res.json({ success: true, total: selectedContacts.length });

    // Send messages with delay
    for (let i = 0; i < selectedContacts.length; i++) {
        const contact = selectedContacts[i];
        try {
            const personalizedMessage = replaceVariables(message, contact);
            const formattedPhone = contact.phone.replace(/[^\d]/g, '') + '@c.us';
            
            await client.sendMessage(formattedPhone, personalizedMessage);
            appState.messagesSent++;
            
            console.log(`Message sent to ${contact.name} (${i + 1}/${selectedContacts.length})`);
            
            if (i < selectedContacts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }
        } catch (error) {
            console.error(`Failed to send message to ${contact.name}:`, error);
        }
    }
});

// CSV upload endpoint
app.post('/api/upload-csv', upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            if (data.name && data.phone) {
                const contact = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: data.name.trim(),
                    phone: data.phone.trim(),
                    email: data.email ? data.email.trim() : '',
                    company: data.company ? data.company.trim() : '',
                    tags: data.tags ? data.tags.trim() : ''
                };
                results.push(contact);
            }
        })
        .on('end', () => {
            contacts.push(...results);
            saveContacts();
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            
            res.json({
                success: true,
                imported: results.length,
                total: contacts.length
            });
        })
        .on('error', (error) => {
            res.status(500).json({ error: 'Failed to parse CSV file' });
        });
});

// Placeholder routes for remaining pages (bulk, contacts, templates)
app.get('/bulk', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>Bulk Messaging</title></head><body><h1>Bulk Messaging Feature - Implementation in Progress</h1><a href="/">← Back to Home</a></body></html>');
});

app.get('/contacts', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>Contact Manager</title></head><body><h1>Contact Manager Feature - Implementation in Progress</h1><a href="/">← Back to Home</a></body></html>');
});

app.get('/templates', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>Message Templates</title></head><body><h1>Message Templates Feature - Implementation in Progress</h1><a href="/">← Back to Home</a></body></html>');
});

// Create necessary directories
const dirs = ['data', 'uploads'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WhatsApp Enhanced v3 server running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
});

module.exports = app;