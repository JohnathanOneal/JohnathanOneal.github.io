function formatOdds(price) {
    return price > 0 ? `+${price}` : price;
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

function renderGame(game) {
    return `
        
            
                ${game.game_info.away} @ ${game.game_info.home}
                Start Time: ${formatTime(game.game_info.commence_time)}
            
            
            
                
                    Moneyline
                    ${game.game_info.away}: ${formatOdds(game.best_odds.h2h[game.game_info.away].price)} (${game.best_odds.h2h[game.game_info.away].bookmaker})
                    ${game.game_info.home}: ${formatOdds(game.best_odds.h2h[game.game_info.home].price)} (${game.best_odds.h2h[game.game_info.home].bookmaker})
                
                
                
                    Spread
                    ${game.game_info.away}: ${game.best_odds.spread[game.game_info.away].point} (${formatOdds(game.best_odds.spread[game.game_info.away].price)}) - ${game.best_odds.spread[game.game_info.away].bookmaker}
                    ${game.game_info.home}: ${game.best_odds.spread[game.game_info.home].point} (${formatOdds(game.best_odds.spread[game.game_info.home].price)}) - ${game.best_odds.spread[game.game_info.home].bookmaker}
                
                
                
                    Total
                    Over ${game.best_odds.total.Over.point}: ${formatOdds(game.best_odds.total.Over.price)} (${game.best_odds.total.Over.bookmaker})
                    Under ${game.best_odds.total.Under.point}: ${formatOdds(game.best_odds.total.Under.price)} (${game.best_odds.total.Under.bookmaker})
                
                
                
                    Predictions
                    Home Win: ${(game.home_team_win_prediction * 100).toFixed(1)}%
                    Away Win: ${(game.away_team_win_prediction * 100).toFixed(1)}%
                    Predicted Total: ${game.total_prediction[0].toFixed(1)}
                
            
        
    `;
}

document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    const year = pathParts[pathParts.length - 4];
    const month = pathParts[pathParts.length - 3];
    const day = pathParts[pathParts.length - 2];
    
    try {
        const response = await fetch(`/data/basketball/${year}/${month}/${day}/odds.json`);
        const oddsData = await response.json();
        
        const oddsContent = document.getElementById('odds-content');
        oddsContent.innerHTML = oddsData.map(renderGame).join('');
    } catch (error) {
        console.error('Error loading odds data:', error);
        document.getElementById('odds-content').innerHTML = 'Error loading odds data';
    }
});
