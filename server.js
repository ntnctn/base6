const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;


app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
        checkPeriod: 86400000 
    }),
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 
    }
}));


function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/');
    }
    next();
}


const users = [];


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


let dataCache = {
    timestamp: 0,
    data: null
};


function generateData() {
    return {
        message: "Данные сгенерированы в " + new Date().toLocaleTimeString(),
        values: Array.from({ length: 5 }, () => Math.floor(Math.random() * 100))
    };
}


app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/profile');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    
    if (users.some(u => u.username === username)) {
        return res.status(400).send('Пользователь уже существует');
    }
    
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    
    users.push({
        username,
        password: hashedPassword
    });
    
    res.redirect('/');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send('Неверные учетные данные');
    }
    
    
    req.session.user = {
        username: user.username
    };
    
    res.redirect('/profile');
});

app.get('/profile', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Ошибка выхода');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

app.get('/data', (req, res) => {
    const now = Date.now();
    
    
    if (now - dataCache.timestamp < 60000 && dataCache.data) {
        return res.json({
            ...dataCache.data,
            cached: true
        });
    }
    
    
    const newData = generateData();
    dataCache = {
        timestamp: now,
        data: newData
    };
    
    res.json({
        ...newData,
        cached: false
    });
});



app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});