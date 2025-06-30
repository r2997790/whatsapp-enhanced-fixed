const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

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
    status: 'Initializing...'
};

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

// Initialize WhatsApp client
client.initialize();

// Routes
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Enhanced v3 - Fixed</title>
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
        .fixed-notice {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="fixed-notice">
            ✅ <strong>FIXED!</strong> This version now serves proper HTML pages instead of CSV data.
        </div>
        
        <div class="logo">📱 WhatsApp Enhanced v3</div>
        <div class="subtitle">Professional WhatsApp Messaging Platform</div>
        
        <div class="status-card">
            <div class="status" id="status">Loading...</div>
            <div class="qr-container" id="qrContainer"></div>
        </div>
        
        <div class="features">
            <a href="/simple" class="feature-card">
                <div class="feature-icon">💬</div>
                <div class="feature-title">Simple Interface</div>
                <div class="feature-desc">Clean and easy messaging interface</div>
            </a>
            
            <div class="feature-card" style="opacity: 0.6;">
                <div class="feature-icon">📨</div>
                <div class="feature-title">Bulk Messaging</div>
                <div class="feature-desc">Coming soon...</div>
            </div>
            
            <div class="feature-card" style="opacity: 0.6;">
                <div class="feature-icon">👥</div>
                <div class="feature-title">Contact Manager</div>
                <div class="feature-desc">Coming soon...</div>
            </div>
            
            <div class="feature-card" style="opacity: 0.6;">
                <div class="feature-icon">📝</div>
                <div class="feature-title">Message Templates</div>
                <div class="feature-desc">Coming soon...</div>
            </div>
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
        
        function refreshStatus() {
            updateStatus();
        }
        
        updateStatus();
        setInterval(updateStatus, 5000);
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
        input, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        input:focus, textarea:focus {
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
                <label for="message">Message</label>
                <textarea id="message" name="message" required placeholder="Type your message here..."></textarea>
            </div>
            
            <button type="submit" class="btn" id="sendBtn">
                📤 Send Message
            </button>
        </form>
    </div>
    
    <script>
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
    </script>
</body>
</html>`);
});

// API Routes
app.get('/api/status', (req, res) => {
    res.json(appState);
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

// Create necessary directories
const dirs = ['data'];
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