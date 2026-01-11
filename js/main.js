// Daven's World - Main Controller
class DavensWorld {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'home';
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('🎮 Initializing Daven\'s World...');
        
        // Initialize systems
        await this.initializeSystems();
        
        // Setup UI
        this.setupEventListeners();
        this.setupNavigation();
        
        // Initialize physics
        this.initPhysics();
        
        // Load initial data
        await this.loadInitialData();
        
        this.isInitialized = true;
        console.log('✅ Daven\'s World initialized successfully');
    }

    async initializeSystems() {
        // Wait for database
        while (!database.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Initialize user system
        await userSystem.init();
        
        // Set current user
        this.currentUser = userSystem.getCurrentUser();
        
        console.log('✅ All systems initialized');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.navigateToSection(section);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('game-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchSystem.performSearch(e.target.value);
            });
        }

        // Game creation
        const creatorCanvas = document.getElementById('creator-canvas');
        if (creatorCanvas) {
            this.setupGameCreator(creatorCanvas);
        }

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupNavigation() {
        // Smooth scrolling between sections
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    initPhysics() {
        const physicsCanvas = document.getElementById('physics-canvas');
        if (physicsCanvas) {
            physics.init('physics-canvas');
            
            // Create physics objects for hero section
            this.createHeroPhysics();
        }
    }

    createHeroPhysics() {
        if (!physics.engine) return;
        
        // Create floating particles
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * physics.canvas.width;
            const y = Math.random() * physics.canvas.height;
            const size = Math.random() * 20 + 10;
            
            physics.createCircle(x, y, size, {
                isStatic: false,
                render: {
                    fillStyle: physics.getRandomColor(),
                    strokeStyle: '#ffffff',
                    lineWidth: 2
                }
            });
        }
        
        // Create boundaries
        const boundaries = [
            physics.createRectangle(physics.canvas.width / 2, physics.canvas.height + 50, physics.canvas.width, 100, { isStatic: true, render: { visible: false } }),
            physics.createRectangle(-50, physics.canvas.height / 2, 100, physics.canvas.height, { isStatic: true, render: { visible: false } }),
            physics.createRectangle(physics.canvas.width + 50, physics.canvas.height / 2, 100, physics.canvas.height, { isStatic: true, render: { visible: false } })
        ];
        
        // Add mouse interaction
        physics.canvas.addEventListener('click', (e) => {
            const rect = physics.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            physics.createParticleSystem(x, y, 20, {
                size: { min: 3, max: 8 },
                speed: { min: 2, max: 8 },
                lifetime: { min: 1000, max: 3000 }
            });
        });
    }

    async loadInitialData() {
        // Load games
        await this.loadGames();
        
        // Load user data if logged in
        if (this.currentUser) {
            await this.loadUserData();
        }
        
        // Load friends
        await this.loadFriends();
        
        // Load activity feed
        await this.loadActivityFeed();
    }

    async loadGames() {
        const games = await database.getGames();
        searchSystem.renderGames(games);
        
        console.log(`📋 Loaded ${games.length} fan-made games`);
    }

    async loadUserData() {
        if (!this.currentUser) return;
        
        const userData = await database.getPlayerData(this.currentUser.id);
        if (userData) {
            this.updateUserDisplay(userData);
        }
    }

    updateUserDisplay(userData) {
        // Update creds display
        const credsElement = document.getElementById('user-creds');
        if (credsElement) {
            credsElement.textContent = userData.creds || 0;
        }
        
        // Update profile stats
        const stats = {
            gamesPlayed: userData.gamesPlayed?.length || 0,
            credsEarned: userData.creds || 0,
            friendsCount: userData.friends?.length || 0,
            gamesCreated: userData.gamesCreated?.length || 0
        };
        
        Object.keys(stats).forEach(stat => {
            const element = document.getElementById(`${stat.replace('Count', '')}`);
            if (element) {
                element.textContent = stats[stat];
            }
        });
    }

    async loadFriends() {
        if (!this.currentUser) return;
        
        const friends = await database.getUserFriends(this.currentUser.id);
        const friendsList = document.getElementById('friends-list');
        
        if (friendsList) {
            friendsList.innerHTML = friends.map(friend => this.createFriendItem(friend)).join('');
        }
    }

    createFriendItem(friend) {
        return `
            <div class="friend-item" data-friend-id="${friend.id}">
                <img src="assets/avatar/default.png" alt="${friend.username}" class="friend-avatar">
                <div class="friend-info">
                    <h4>${friend.username}</h4>
                    <span class="friend-status ${friend.online ? 'online' : ''}">
                        ${friend.online ? '🟢 Online' : '🔴 Offline'}
                    </span>
                </div>
                <div class="friend-actions">
                    <button class="friend-action" onclick="inviteFriend('${friend.id}')">
                        📤 Invite
                    </button>
                </div>
            </div>
        `;
    }

    async loadActivityFeed() {
        if (!this.currentUser) return;
        
        const activities = await database.getTransactionHistory(this.currentUser.id, 10);
        const activityFeed = document.getElementById('activity-feed');
        
        if (activityFeed) {
            activityFeed.innerHTML = activities.map(activity => this.createActivityItem(activity)).join('');
        }
    }

    createActivityItem(activity) {
        const timeAgo = this.getTimeAgo(new Date(activity.timestamp));
        const action = activity.type === 'earned' ? 'earned' : 'spent';
        const icon = activity.type === 'earned' ? '💰' : '💸';
        
        return `
            <div class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <p>You ${action} ${activity.amount} Creds</p>
                    <small>${timeAgo}</small>
                </div>
            </div>
        `;
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }

    navigateToSection(section) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`a[href="#${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        this.currentSection = section;
        
        // Load section-specific data
        this.loadSectionData(section);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'games':
                await this.loadGames();
                break;
            case 'social':
                await this.loadFriends();
                await this.loadActivityFeed();
                break;
            case 'profile':
                await this.loadUserData();
                break;
        }
    }

    setupGameCreator(canvas) {
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        
        // Setup drag and drop for game objects
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const objectType = e.dataTransfer.getData('object-type');
            if (objectType) {
                this.addGameObject(objectType, e.offsetX, e.offsetY);
            }
        });
        
        // Setup canvas drawing
        this.gameCreatorCanvas = canvas;
        this.gameCreatorContext = ctx;
        this.gameObjects = [];
        
        this.renderGameCreator();
    }

    addGameObject(type, x, y) {
        const object = {
            type: type,
            x: x,
            y: y,
            id: Date.now() + Math.random()
        };
        
        this.gameObjects.push(object);
        this.renderGameCreator();
    }

    renderGameCreator() {
        if (!this.gameCreatorContext) return;
        
        const ctx = this.gameCreatorContext;
        const canvas = this.gameCreatorCanvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Draw game objects
        this.gameObjects.forEach(obj => {
            ctx.fillStyle = this.getObjectColor(obj.type);
            ctx.fillRect(obj.x - 25, obj.y - 25, 50, 50);
            
            // Draw object label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obj.type, obj.x, obj.y + 35);
        });
    }

    getObjectColor(type) {
        const colors = {
            player: '#00ff88',
            enemy: '#ff0044',
            platform: '#888888',
            coin: '#ffaa00',
            powerup: '#8800ff',
            spike: '#ff6600'
        };
        
        return colors[type] || '#ffffff';
    }

    handleResize() {
        // Resize physics canvas
        if (physics.canvas) {
            physics.resizeCanvas();
        }
        
        // Resize game creator canvas
        if (this.gameCreatorCanvas) {
            this.gameCreatorCanvas.width = this.gameCreatorCanvas.parentElement.clientWidth;
            this.gameCreatorCanvas.height = this.gameCreatorCanvas.parentElement.clientHeight;
            this.renderGameCreator();
        }
    }

    // Global functions
    enterWorld() {
        this.navigateToSection('games');
    }

    showGameCreator() {
        this.navigateToSection('create');
    }

    async testGame() {
        console.log('🎮 Testing game with objects:', this.gameObjects);
        alert(`Testing game with ${this.gameObjects.length} objects!`);
    }

    async saveGame() {
        const title = document.getElementById('game-title')?.value || 'Untitled Game';
        const description = document.getElementById('game-description')?.value || '';
        const category = document.getElementById('game-category')?.value || 'action';
        const credsReward = parseInt(document.getElementById('game-creds')?.value) || 10;
        
        const gameData = {
            title: title,
            description: description,
            creator: this.currentUser?.username || 'Anonymous',
            category: category,
            content: {
                objects: this.gameObjects,
                settings: {
                    width: this.gameCreatorCanvas?.width || 800,
                    height: this.gameCreatorCanvas?.height || 600
                }
            },
            credsReward: credsReward,
            tags: [category],
            published: false
        };
        
        try {
            const gameId = await database.createGame(gameData);
            console.log(`💾 Game saved with ID: ${gameId}`);
            alert('Game saved successfully!');
        } catch (error) {
            console.error('Failed to save game:', error);
            alert('Failed to save game. Please try again.');
        }
    }

    async publishGame() {
        await this.saveGame();
        alert('Game published! Other players can now play your creation.');
    }
}

// Initialize Daven's World
const davensWorld = new DavensWorld();

// Global functions for HTML onclick handlers
function enterWorld() {
    davensWorld.enterWorld();
}

function showGameCreator() {
    davensWorld.showGameCreator();
}

function testGame() {
    davensWorld.testGame();
}

function saveGame() {
    davensWorld.saveGame();
}

function publishGame() {
    davensWorld.publishGame();
}

function loadMoreGames() {
    searchSystem.showAllGames();
}

function inviteFriend(friendId) {
    console.log(`Inviting friend: ${friendId}`);
    alert(`Friend invite sent to ${friendId}`);
}

function changeAvatar() {
    console.log('Changing avatar');
    alert('Avatar change feature coming soon!');
}

// Drag and drop handlers for game creator
document.addEventListener('DOMContentLoaded', () => {
    const toolItems = document.querySelectorAll('.tool-item');
    
    toolItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('object-type', item.dataset.type);
        });
    });
});
