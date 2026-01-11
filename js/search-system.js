// Daven's World - Advanced Search System
class SearchSystem {
    constructor() {
        this.searchIndex = new Map();
        this.gameCache = new Map();
        this.searchHistory = [];
        this.popularSearches = new Map();
        this.filters = {
            category: '',
            sort: 'newest',
            minCreds: 0,
            maxCreds: 1000
        };
        
        this.init();
    }

    async init() {
        // Build search index when games are loaded
        await this.buildSearchIndex();
        this.setupSearchUI();
        this.loadPopularSearches();
    }

    async buildSearchIndex() {
        const games = await database.getGames();
        
        games.forEach(game => {
            // Index by title
            this.addToIndex(game.title.toLowerCase(), game);
            
            // Index by creator
            this.addToIndex(game.creator.toLowerCase(), game);
            
            // Index by description
            if (game.description) {
                const words = game.description.toLowerCase().split(' ');
                words.forEach(word => this.addToIndex(word, game));
            }
            
            // Index by tags
            if (game.tags) {
                game.tags.forEach(tag => this.addToIndex(tag.toLowerCase(), game));
            }
            
            // Index by category
            this.addToIndex(game.category.toLowerCase(), game);
            
            // Cache game
            this.gameCache.set(game.id, game);
        });
    }

    addToIndex(key, game) {
        if (!this.searchIndex.has(key)) {
            this.searchIndex.set(key, new Set());
        }
        this.searchIndex.get(key).add(game);
    }

    setupSearchUI() {
        const searchInput = document.getElementById('game-search');
        const categoryFilter = document.getElementById('category-filter');
        const sortFilter = document.getElementById('sort-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.performSearch(searchInput?.value || '');
            });
        }
        
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.performSearch(searchInput?.value || '');
            });
        }
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.showAllGames();
            return;
        }
        
        // Add to search history
        this.addToSearchHistory(query);
        
        const searchTerms = query.toLowerCase().split(' ');
        const results = new Set();
        
        // Find games matching any search term
        searchTerms.forEach(term => {
            if (this.searchIndex.has(term)) {
                this.searchIndex.get(term).forEach(game => results.add(game));
            }
        });
        
        // Apply filters
        let filteredResults = Array.from(results);
        
        if (this.filters.category) {
            filteredResults = filteredResults.filter(game => 
                game.category === this.filters.category
            );
        }
        
        // Apply sorting
        filteredResults = this.sortResults(filteredResults);
        
        // Display results
        this.displaySearchResults(filteredResults, query);
        
        // Update popular searches
        this.updatePopularSearches(query);
    }

    sortResults(results) {
        switch (this.filters.sort) {
            case 'popular':
                return results.sort((a, b) => b.plays - a.plays);
            case 'rating':
                return results.sort((a, b) => b.rating - a.rating);
            case 'creds':
                return results.sort((a, b) => b.credsReward - a.credsReward);
            case 'newest':
            default:
                return results.sort((a, b) => 
                    new Date(b.created) - new Date(a.created)
                );
        }
    }

    displaySearchResults(results, query) {
        const resultsContainer = document.getElementById('search-results');
        const gamesGrid = document.getElementById('games-grid');
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <p>Found ${results.length} games matching "${query}"</p>
            `;
        }
        
        if (gamesGrid) {
            this.renderGames(results);
        }
    }

    renderGames(games) {
        const gamesGrid = document.getElementById('games-grid');
        if (!gamesGrid) return;
        
        gamesGrid.innerHTML = games.map(game => this.createGameCard(game)).join('');
        
        // Add click handlers
        gamesGrid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = card.dataset.gameId;
                this.playGame(gameId);
            });
        });
    }

    createGameCard(game) {
        return `
            <div class="game-card" data-game-id="${game.id}">
                <div class="game-thumbnail">
                    <div class="thumbnail-placeholder">
                        <span>🎮</span>
                    </div>
                </div>
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <p class="game-creator">by ${game.creator}</p>
                    <p class="game-description">${game.description || 'No description available'}</p>
                    <div class="game-meta">
                        <div class="game-creds">
                            <span>💎</span>
                            <span>${game.credsReward || 10} Creds</span>
                        </div>
                        <div class="game-stats">
                            <span>▶️ ${game.plays || 0}</span>
                            <span>⭐ ${game.rating || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async showAllGames() {
        const games = await database.getGames();
        const sortedGames = this.sortResults(games);
        this.renderGames(sortedGames);
        
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p>Showing all fan-made games</p>';
        }
    }

    addToSearchHistory(query) {
        this.searchHistory.unshift({
            query: query,
            timestamp: Date.now()
        });
        
        // Keep only last 50 searches
        if (this.searchHistory.length > 50) {
            this.searchHistory = this.searchHistory.slice(0, 50);
        }
        
        // Store in localStorage
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }

    loadPopularSearches() {
        const stored = localStorage.getItem('popularSearches');
        if (stored) {
            this.popularSearches = new Map(JSON.parse(stored));
        }
    }

    updatePopularSearches(query) {
        const count = this.popularSearches.get(query) || 0;
        this.popularSearches.set(query, count + 1);
        
        localStorage.setItem('popularSearches', JSON.stringify(
            Array.from(this.popularSearches.entries())
        ));
    }

    getPopularSearches(limit = 10) {
        return Array.from(this.popularSearches.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([query, count]) => query);
    }

    getSearchHistory(limit = 10) {
        return this.searchHistory
            .slice(0, limit)
            .map(item => item.query);
    }

    async playGame(gameId) {
        const game = this.gameCache.get(gameId);
        if (!game) {
            console.error('Game not found');
            return;
        }
        
        // Increment play count
        await database.incrementGamePlays(gameId);
        
        // Award creds to player
        const currentUser = userSystem.getCurrentUser();
        if (currentUser) {
            await database.updateUserCreds(currentUser.id, game.credsReward || 10, 'game_play');
        }
        
        // Open game modal
        this.openGameModal(game);
    }

    openGameModal(game) {
        const modal = document.getElementById('game-modal');
        const gamePlayer = document.getElementById('game-player');
        
        if (modal && gamePlayer) {
            gamePlayer.innerHTML = `
                <div class="game-player-container">
                    <h2>${game.title}</h2>
                    <p>by ${game.creator}</p>
                    <div class="game-content">
                        <p>This is where the game "${game.title}" would load and play.</p>
                        <p>Game content would be rendered here based on the creator's design.</p>
                        <div class="game-actions">
                            <button class="like-button" onclick="likeGame('${game.id}')">
                                👍 Like
                            </button>
                            <button class="comment-button" onclick="commentGame('${game.id}')">
                                💬 Comment
                            </button>
                            <button class="share-button" onclick="shareGame('${game.id}')">
                                📤 Share
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
        }
    }

    // Advanced search features
    async searchByCreator(creatorUsername) {
        const games = await database.getGames();
        return games.filter(game => game.creator === creatorUsername);
    }

    async searchByTags(tags) {
        const games = await database.getGames();
        return games.filter(game => {
            if (!game.tags) return false;
            return tags.some(tag => game.tags.includes(tag));
        });
    }

    async getRecommendations(userId) {
        const user = await database.getUser(userId);
        if (!user) return [];
        
        // Get games user has played
        const playedGames = user.gamesPlayed || [];
        
        // Get similar games based on categories and tags
        const allGames = await database.getGames();
        const recommendations = [];
        
        playedGames.forEach(gameId => {
            const game = this.gameCache.get(gameId);
            if (game) {
                // Find games with similar categories/tags
                const similarGames = allGames.filter(g => {
                    if (g.id === gameId) return false;
                    return g.category === game.category || 
                           (g.tags && game.tags && g.tags.some(tag => game.tags.includes(tag)));
                });
                
                recommendations.push(...similarGames);
            }
        });
        
        // Remove duplicates and games already played
        const uniqueRecommendations = recommendations.filter((game, index, self) =>
            index === self.findIndex(g => g.id === game.id) &&
            !playedGames.includes(game.id)
        );
        
        return uniqueRecommendations.slice(0, 10);
    }

    // Voice search (future feature)
    async enableVoiceSearch() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onresult = (event) => {
                const query = event.results[0][0].transcript;
                document.getElementById('game-search').value = query;
                this.performSearch(query);
            };
            
            recognition.onerror = (event) => {
                console.error('Voice search error:', event.error);
            };
            
            return recognition;
        }
        return null;
    }

    // Auto-complete functionality
    getAutoCompleteSuggestions(query) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();
        
        // Search in indexed terms
        this.searchIndex.forEach((games, term) => {
            if (term.startsWith(lowerQuery)) {
                suggestions.push(term);
            }
        });
        
        // Search in popular searches
        this.popularSearches.forEach((count, term) => {
            if (term.startsWith(lowerQuery) && !suggestions.includes(term)) {
                suggestions.push(term);
            }
        });
        
        return suggestions.slice(0, 5);
    }
}

// Initialize search system
const searchSystem = new SearchSystem();

// Export for use in other modules
window.SearchSystem = SearchSystem;
window.searchSystem = searchSystem;

// Global search functions
function searchGames() {
    const searchInput = document.getElementById('game-search');
    if (searchInput) {
        searchSystem.performSearch(searchInput.value);
    }
}

function closeGameModal() {
    const modal = document.getElementById('game-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Like, comment, and share functions
async function likeGame(gameId) {
    console.log(`Liking game: ${gameId}`);
    // Implementation for liking games
}

async function commentGame(gameId) {
    console.log(`Commenting on game: ${gameId}`);
    // Implementation for commenting on games
}

async function shareGame(gameId) {
    console.log(`Sharing game: ${gameId}`);
    // Implementation for sharing games
}
